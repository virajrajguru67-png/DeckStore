import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Save,
    Loader2,
    Sparkles,
    Send,
    ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { documentService } from '@/services/documentService';
import { Document } from '@/types/document';
import { ChatPanel } from '@/components/ai/ChatPanel';
import { aiService } from '@/services/aiService';

export default function DocumentEdit() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [document, setDocument] = useState<Document | null>(null);
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [summary, setSummary] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isSummarizing, setIsSummarizing] = useState(false);

    useEffect(() => {
        async function loadDocument() {
            if (!id) return;
            try {
                const doc = await documentService.getDocumentById(id);
                if (doc) {
                    setDocument(doc);
                    setTitle(doc.name);
                    setSummary(doc.ai_summary || null);

                    // Handle content plain text extraction logic
                    if (typeof doc.content === 'object' && doc.content !== null) {
                        const anyContent = doc.content as any;
                        setContent(anyContent.text || anyContent.content || '');
                    } else {
                        setContent(doc.content as unknown as string || '');
                    }
                } else {
                    toast.error('Document not found');
                    navigate('/documents');
                }
            } catch (error) {
                console.error('Error loading document:', error);
                toast.error('Failed to load document');
            } finally {
                setLoading(false);
            }
        }
        loadDocument();
    }, [id, navigate]);

    const handleSave = async () => {
        if (!document) return;
        setIsSaving(true);
        try {
            await documentService.updateDocument(document.id, {
                name: title,
                content: content as any,
            });
            toast.success('Document saved');
        } catch (error) {
            console.error('Error saving:', error);
            toast.error('Failed to save document');
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerateSummary = async () => {
        if (!content || !document) return;
        setIsSummarizing(true);
        try {
            let generatedSummary = "";
            const DEMO_KEY = "AIzaSyCRgaefXYQSv0TIAtRfZQI2-Mx_BPjOQQ4";

            if (aiService.isConfigured()) {
                // Use Gemini API
                generatedSummary = await aiService.generateSummary(DEMO_KEY, title, content);
            } else {
                // Mock logic as before (Fallback)
                await new Promise(resolve => setTimeout(resolve, 2000));

                const cleanContent = content.trim();
                const wordCount = cleanContent.split(/\s+/).filter(w => w.length > 0).length;
                const sentences = cleanContent.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 5);

                const topics = [
                    { key: 'security', label: 'Security' },
                    { key: 'ai', label: 'AI Intelligence' },
                    { key: 'analytics', label: 'Analytics' },
                    { key: 'branding', label: 'Branding' }
                ];

                const detected = topics.filter(t => cleanContent.toLowerCase().includes(t.key)).map(t => t.label);
                const topTopic = detected[0] || "General Document Intelligence";

                if (wordCount > 150) {
                    generatedSummary = `Summary Analysis: This ${wordCount}-word document deep-dives into ${topTopic}. `;
                    generatedSummary += `It opens by establishing that ${sentences[0]?.toLowerCase() || 'the content'}. `;

                    const midIdx = Math.floor(sentences.length / 2);
                    if (sentences.length > 8) {
                        generatedSummary += `Technical details highlight that ${sentences[midIdx]?.toLowerCase() || 'the architecture is structured'}. `;
                    }

                    generatedSummary += `The text concludes with the insight that ${sentences[sentences.length - 1]?.toLowerCase() || 'the objectives are met'}.`;
                } else {
                    generatedSummary = `Brief Insight: A concise overview of "${title}" focusing on ${topTopic}. Core message: ${sentences[0] || 'Content ready for review'}.`;
                }
            }

            await documentService.updateDocument(document.id, { ai_summary: generatedSummary });
            setSummary(generatedSummary);
            toast.success('AI Summary updated');
        } catch (error) {
            toast.error('Failed to generate summary');
        } finally {
            setIsSummarizing(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout title="Loading..." fullHeight>
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    if (!document) return null;

    return (
        <DashboardLayout
            title={title}
            subtitle="Edit Document"
            fullHeight
        >
            <div className="flex flex-col h-full bg-background overflow-hidden">
                {/* Header Toolbar */}
                <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={() => navigate('/documents')}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                        <div className="h-6 w-px bg-border" />
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="text-lg font-semibold bg-transparent border-none focus-visible:ring-0 px-0 h-auto w-[300px]"
                            placeholder="Document Title"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="text-xs text-muted-foreground mr-4">
                            {isSaving ? 'Saving...' : 'All changes saved'}
                        </div>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save
                        </Button>
                    </div>
                </div>

                {/* content area */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Main Editor */}
                    <div className="flex-1 flex flex-col min-w-0 bg-muted/5">
                        <div className="flex-1 overflow-auto p-8">
                            <div className="max-w-4xl mx-auto h-full bg-background rounded-xl border shadow-sm p-8 min-h-[800px]">
                                <Textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Start typing your document content here..."
                                    className="w-full h-full resize-none border-none focus-visible:ring-0 p-0 text-base leading-relaxed bg-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Sidebar (AI) */}
                    <div className="w-96 border-l bg-background flex flex-col shrink-0">
                        <Tabs defaultValue="assistant" className="flex-1 flex flex-col min-h-0">
                            <div className="px-4 py-3 border-b">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="assistant">
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        Insights
                                    </TabsTrigger>
                                    <TabsTrigger value="chat">
                                        <Send className="h-4 w-4 mr-2" />
                                        Chat
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="assistant" className="flex-1 overflow-auto p-4 m-0">
                                <div className="space-y-6">
                                    <div className="p-4 rounded-xl bg-muted/30 border space-y-3">
                                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">AI Summary</div>
                                        {summary ? (
                                            <p className="text-sm leading-relaxed text-foreground/80 italic">
                                                "{summary}"
                                            </p>
                                        ) : (
                                            <p className="text-xs text-muted-foreground">No summary generated yet.</p>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full"
                                            onClick={handleGenerateSummary}
                                            disabled={isSummarizing || !content}
                                        >
                                            {isSummarizing ? (
                                                <Loader2 className="h-3 w-3 animate-spin mr-2" />
                                            ) : (
                                                <Sparkles className="h-3 w-3 mr-2" />
                                            )}
                                            {summary ? 'Regenerate Summary' : 'Generate Summary'}
                                        </Button>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 m-0 p-0 overflow-hidden">
                                <ChatPanel documentTitle={title} documentContent={content} />
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
