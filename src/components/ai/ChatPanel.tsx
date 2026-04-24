import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, User, Bot, Loader2, Sparkles, Zap, BrainCircuit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { aiService } from '@/services/aiService';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface ChatPanelProps {
    documentTitle: string;
    documentContent?: string;
    onApplyToDocument?: (content: string) => void;
}

export function ChatPanel({ documentTitle, documentContent, onApplyToDocument }: ChatPanelProps) {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: `Hi! I'm your DeckStore AI assistant. I've analyzed "${documentTitle}". Ask me anything about it!` }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";
    const isCloudAI = !!API_KEY;

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        try {
            let response = "";

            if (isCloudAI) {
                // Use Groq API
                response = await aiService.generateChatResponse(
                    API_KEY,
                    documentTitle,
                    documentContent || "",
                    messages.filter(m => m.role !== 'assistant' || !m.content.startsWith("Hi!")),
                    userMsg
                );
            } else {
                // Fallback to Local Heuristic Logic
                await new Promise(resolve => setTimeout(resolve, 1500)); // Sim delay

                const query = userMsg.toLowerCase();
                const content = (documentContent || "").toLowerCase();

                if (query.match(/^(is|does|has|did|was|are)\s/i)) {
                    // Binary Question Logic (Yes/No)
                    const keywords = query.replace(/^(is|does|has|did|was|are)\s/i, "").split(' ').filter(word => word.length > 2 && !['the', 'and', 'used', 'story', 'word'].includes(word));
                    const foundWord = keywords.find(k => content.includes(k));

                    if (foundWord) {
                        // Find the sentence where it appears
                        const sentences = (documentContent || "").match(/[^\.!\?]+[\.!\?]+/g)?.map(s => s.trim()) || [];
                        const fullSentence = sentences.find(s => s.toLowerCase().includes(foundWord));

                        // Try to frame it naturally
                        if (fullSentence) {
                            // Clean up the sentence to make it flow better
                            const cleanRef = fullSentence.replace(new RegExp(`\\b${foundWord}\\b`, 'gi'), `**${foundWord}**`);
                            response = `Yes, the story makes reference to a **${foundWord}**. \n\nSpecifically, the text mentions that ${cleanRef.charAt(0).toLowerCase() + cleanRef.slice(1)}`;
                        } else {
                            response = `Yes, the word "${foundWord}" appears in the text.`;
                        }
                    } else {
                        response = `No, I reviewed the story and typically, "${keywords.join(' ')}" is not mentioned explicitly in the text.`;
                    }
                } else if (query.match(/summary|story|tell me about|overview|briefing|explain/i)) {
                    // Heuristic Summary Logic
                    const cleanText = (documentContent || "").replace(/\s+/g, ' ').trim();
                    const allSentences = cleanText.match(/[^\.!\?]+[\.!\?]+/g)?.map(s => s.trim()) || [];

                    if (allSentences.length > 0) {
                        // Try to find "thematic" sentences (containing abstract concepts)
                        const themeKeywords = ['hope', 'loneliness', 'connection', 'love', 'kindness', 'truth', 'world', 'life', 'promise', 'reminds', 'shows that'];
                        const thematicSentences = allSentences.filter(s => themeKeywords.some(k => s.toLowerCase().includes(k)));

                        // Fallback to structure if no themes found
                        const intro = allSentences[0];
                        const conclusion = allSentences[allSentences.length - 1];
                        const bestPoints = thematicSentences.length >= 2 ? thematicSentences.slice(0, 2) : [intro, conclusion];

                        // Check if user asked for "lines" or "points"
                        if (query.match(/lines|points|bullets/i)) {
                            response = `Here are the key takeaways from the story:\n\n• ${bestPoints[0]}\n\n• ${bestPoints[1] || "The story concludes with a powerful message."}`;
                        } else {
                            response = `The story tells us that ${bestPoints[0].toLowerCase().replace(/^the story.*?that\s*/i, '')} \n\nIt reminds us that ${bestPoints[1] ? bestPoints[1].toLowerCase() : "small actions matter"}.`;
                        }
                    } else {
                        response = `The document "${documentTitle}" appears to be empty or contains no clear sentences to summarize.`;
                    }
                } else if (content && query.split(' ').some(word => word.length > 3 && content.includes(word))) {
                    // Keyword Search with Context
                    const keywords = query.split(' ').filter(word => word.length > 3 && !['what', 'where', 'when', 'does', 'this', 'that', 'tell', 'show'].includes(word));
                    const sentences = (documentContent || "").match(/[^\.!\?]+[\.!\?]+/g)?.map(s => s.trim()) || [];

                    // Find best matching sentence
                    const bestMatch = sentences.map(s => ({
                        text: s,
                        score: keywords.filter(k => s.toLowerCase().includes(k)).length
                    })).sort((a, b) => b.score - a.score)[0];

                    if (bestMatch && bestMatch.score > 0) {
                        response = `Relevant excerpt: "${bestMatch.text}"\n\nThis section addresses your query about "${keywords.join(', ')}".`;
                    } else {
                        response = `I analyzed the notes but couldn't find a specific sentence matching your keywords. The document talks about: ${sentences[0]?.substring(0, 80)}...`;
                    }
                } else if (query.match(/which ai|what model|who are you|gpt|claude|gemini|groq/i)) {
                    response = "I am DeckStore Intelligence, a custom-built local analysis engine designed specifically to understand your documents securely. I don't send your data to external public models.";
                } else if (query.includes('help')) {
                    response = "I can help you understand specific parts of these notes, summarize the text, or clarify technical terms you've written in the deck.";
                } else {
                    response = `I'm reading the "${documentTitle}" notes. Could you be more specific? I can see details about ${documentContent ? 'the content you just wrote' : 'the document structure'}, but I need a clearer question to give you a precise answer.`;
                }
            }

            setMessages(prev => [...prev, { role: 'assistant', content: response }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error processing your request. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background border-none overflow-hidden min-h-0">
            <div className="p-3 border-b bg-accent/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    {isCloudAI ? <BrainCircuit className="h-3.5 w-3.5 text-indigo-500" /> : <Sparkles className="h-3.5 w-3.5 text-primary" />}
                    <span className="text-xs font-semibold">
                        {isCloudAI ? "DeckStore AI " : "DeckStore Assistant"}
                    </span>
                </div>
                <div className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider",
                    isCloudAI ? "bg-indigo-500/10 text-indigo-500" : "bg-primary/10 text-primary"
                )}>
                    {isCloudAI ? "Agent" : "Agent"}
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden relative">
                <ScrollArea className="h-full px-4" ref={scrollRef}>
                    <div className="space-y-4 py-4">
                        {messages.map((msg, i) => (
                            <div key={i} className={cn(
                                "flex gap-2 max-w-[90%]",
                                msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                            )}>
                                <div className={cn(
                                    "h-6 w-6 rounded-full flex items-center justify-center shrink-0 border shadow-sm",
                                    msg.role === 'user' ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground"
                                )}>
                                    {msg.role === 'user' ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                                </div>
                                <div className={cn(
                                    "p-3 rounded-2xl text-[13px] leading-relaxed shadow-sm group relative whitespace-pre-line",
                                    msg.role === 'user' ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted/50 border rounded-tl-none text-foreground"
                                )}>
                                    {msg.role === 'assistant' ? (
                                        <div dangerouslySetInnerHTML={{
                                            __html: msg.content
                                                .replace(/^(Q\d+\)|Question:)/gm, '<strong>$1</strong>')
                                                .replace(/^(Ans:|Answer:)/gm, '<span class="text-primary font-bold">$1</span>')
                                        }} />
                                    ) : msg.content}

                                    {msg.role === 'assistant' && onApplyToDocument && !msg.content.startsWith("Hi!") && (
                                        <div className="mt-3 pt-3 border-t border-border/40 flex justify-end">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 px-2 text-[10px] font-bold uppercase tracking-wider bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary transition-all active:scale-95"
                                                onClick={() => onApplyToDocument(msg.content)}
                                            >
                                                <Sparkles className="h-3 w-3 mr-1.5" />
                                                Apply to Page
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-2">
                                <div className="h-6 w-6 rounded-full bg-muted border flex items-center justify-center animate-pulse">
                                    <Bot className="h-3 w-3" />
                                </div>
                                <div className="bg-muted/50 p-3 rounded-2xl rounded-tl-none border shadow-sm">
                                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            <div className="p-4 border-t bg-muted/20 shrink-0">
                <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="relative group"
                >
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isCloudAI ? "Ask anything about document..." : "Ask anything about document..."}
                        className="rounded-xl bg-background border-border/60 pr-10 text-xs h-10 shadow-sm focus-visible:ring-primary/20 transition-all"
                        disabled={isLoading}
                    />
                    <Button
                        type="submit"
                        size="icon"
                        className="absolute right-1 top-1 h-8 w-8 rounded-lg shrink-0"
                        disabled={isLoading || !input.trim()}
                    >
                        <Send className="h-3.5 w-3.5" />
                    </Button>
                </form>
                <div className="mt-2 text-[9px] text-center text-muted-foreground/60 font-medium font-inter flex items-center justify-center gap-1.5">
                    {isCloudAI ? (
                        <>
                            <Zap className="h-3 w-3 text-indigo-500" />
                            <span>Powered by DeckStore AI</span>
                        </>
                    ) : (
                        <>
                            <Sparkles className="h-3 w-3 text-primary" />
                            <span>Powered by DeckStore Local Engine</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
