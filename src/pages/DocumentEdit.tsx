import { useState, useEffect, useRef, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Save,
    Loader2,
    Sparkles,
    Send,
    ArrowLeft,
    FileText,
    Trash2,
    Bold,
    Italic,
    List,
    Heading1,
    Heading2,
    Link as LinkIcon,
    Image as ImageIcon,
    Type,
    Plus,
    Underline,
    Strikethrough,
    AlignLeft,
    AlignCenter,
    AlignRight,
    ListOrdered,
    Quote,
    Undo,
    Redo,
    Eraser,
    Search,
    ChevronDown,
    ChevronRight,
    Code,
    Highlighter,
    Palette,
    Paintbrush,
    Baseline,
    Type as TypeIcon,
    ArrowUp,
    ArrowDown,
    Scissors,
    Copy,
    ClipboardPaste,
    Table,
    Shapes,
    Box,
    BarChart,
    Layers,
    Camera,
    GalleryVertical,
    Hash,
    MessageSquare,
    Video,
    Bookmark
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { documentService } from '@/services/documentService';
import { Document } from '@/types/document';
import { ChatPanel } from '@/components/ai/ChatPanel';
import { aiService } from '@/services/aiService';
import { cn } from '@/lib/utils';

/**
 * Optimized PageSheet component to prevent cursor jumping in contentEditable.
 * It only updates its internal innerHTML if the content prop changes EXTERNALLY.
 */
const PageSheet = memo(({
    content,
    onContentChange,
    onActive,
    onStylesUpdate,
    idx,
    editorRef
}: any) => {
    const localRef = useRef<HTMLDivElement>(null);
    const lastContent = useRef(content);
    const isFocused = useRef(false);

    // Initial mount hydration
    useEffect(() => {
        if (localRef.current) {
            localRef.current.innerHTML = content;
        }
    }, []);

    useEffect(() => {
        // Only update innerHTML if content changed EXTERNALLY 
        // and user is NOT currently focusing this page.
        if (localRef.current && content !== lastContent.current && !isFocused.current) {
            localRef.current.innerHTML = content;
            lastContent.current = content;
        }
    }, [content]);

    return (
        <div
            ref={(el) => {
                localRef.current = el;
                if (editorRef) editorRef(el);
            }}
            contentEditable
            spellCheck="false"
            onInput={(e) => {
                const html = e.currentTarget.innerHTML;
                lastContent.current = html;
                onContentChange(html);
            }}
            onFocus={() => {
                isFocused.current = true;
                onActive(idx);
            }}
            onBlur={() => {
                isFocused.current = false;
            }}
            onMouseUp={onStylesUpdate}
            onKeyUp={onStylesUpdate}
            className="w-full h-full outline-none text-sm md:text-base leading-relaxed text-foreground/90 selection:bg-primary/20 prose max-w-none min-h-[700px]"
        />
    );
}, (prev, next) => {
    // Only re-render if the page index changes; internal content sync is handled by Refs
    return prev.idx === next.idx;
});

const GlobalHeaderEditor = memo(({ content, onChange }: any) => {
    const ref = useRef<HTMLDivElement>(null);
    const last = useRef(content);
    const isEmpty = !content || content === '<br>' || content === '';

    useEffect(() => {
        if (ref.current && content !== last.current) {
            ref.current.innerHTML = content;
            last.current = content;
        }
    }, [content]);

    return (
        <div
            ref={ref}
            contentEditable
            data-placeholder="Type something in the header..."
            className={cn(
                "w-full text-center text-[10px] font-bold tracking-widest text-muted-foreground/60 p-2 mb-4 border-b border-dashed border-muted-foreground/30 hover:border-primary/40 hover:bg-muted/5 transition-all outline-none uppercase italic rounded-t-sm min-h-[30px]",
                isEmpty ? "opacity-0 group-hover:opacity-100 focus:opacity-100" : "opacity-100"
            )}
            onInput={(e) => {
                const html = e.currentTarget.innerHTML;
                last.current = html;
                onChange(html);
            }}
        />
    );
});

const GlobalFooterEditor = memo(({ content, onChange, pageNum, totalPages }: any) => {
    const ref = useRef<HTMLDivElement>(null);
    const last = useRef(content);
    const isEmpty = !content || content === '<br>' || content === '';

    // Resolve placeholders for display
    const resolvedContent = content ? content.replace('{P}', pageNum.toString()).replace('{N}', totalPages.toString()) : '';

    useEffect(() => {
        if (ref.current && resolvedContent !== ref.current.innerHTML) {
            ref.current.innerHTML = resolvedContent;
        }
    }, [resolvedContent]);

    return (
        <div
            ref={ref}
            contentEditable
            data-placeholder="Type something in the footer..."
            className={cn(
                "w-full text-center text-[10px] font-medium text-muted-foreground/50 p-2 mt-4 border-t border-dashed border-muted-foreground/30 hover:border-primary/40 hover:bg-muted/5 transition-all outline-none italic rounded-b-sm min-h-[30px]",
                isEmpty ? "opacity-0 group-hover:opacity-100 focus:opacity-100" : "opacity-100"
            )}
            onInput={(e) => {
                onChange(e.currentTarget.innerHTML);
            }}
        />
    );
});

export default function DocumentEdit() {
    const [isHighlightMode, setIsHighlightMode] = useState<boolean>(false);
    const [activeHighlightColor, setActiveHighlightColor] = useState<string>('#ffff00');
    const [activeFontColor, setActiveFontColor] = useState<string>('#000000');
    const [globalHeader, setGlobalHeader] = useState<string>('');
    const [globalFooter, setGlobalFooter] = useState<string>('');
    const [showHeader, setShowHeader] = useState<boolean>(false);
    const [showFooter, setShowFooter] = useState<boolean>(false);
    const [docData, setDocData] = useState<Document | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [title, setTitle] = useState<string>('');
    const [pages, setPages] = useState<string[]>(['']);
    const [activePageIndex, setActivePageIndex] = useState<number>(0);
    const [summary, setSummary] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
    
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const editorRefs = useRef<(HTMLDivElement | null)[]>([]);

    const THEME_COLORS = [
        { name: 'White', hex: '#ffffff' }, { name: 'Black', hex: '#000000' }, { name: 'Light Gray', hex: '#e7e6e6' }, { name: 'Dark Blue', hex: '#44546a' }, { name: 'Blue', hex: '#4472c4' },
        { name: 'Orange', hex: '#ed7d31' }, { name: 'Gray', hex: '#a5a5a5' }, { name: 'Gold', hex: '#ffc000' }, { name: 'Accent Blue', hex: '#5b9bd5' }, { name: 'Accent Green', hex: '#70ad47' }
    ];

    const STANDARD_COLORS = [
        '#c00000', '#ff0000', '#ffc000', '#ffff00', '#92d050', '#00b050', '#00b0f0', '#0070c0', '#002060', '#7030a0'
    ];

    useEffect(() => {
        async function loadDocument() {
            if (!id) return;
            try {
                const doc = await documentService.getDocumentById(id);
                if (doc) {
                    setDocData(doc);
                    setTitle(doc.name);
                    setSummary(doc.ai_summary || null);

                    let initialPages: string[] = [''];
                    if (typeof doc.content === 'object' && doc.content !== null) {
                        const anyContent = doc.content as any;
                        if (anyContent.pages && Array.isArray(anyContent.pages)) {
                            initialPages = anyContent.pages;
                        } else {
                            const raw = anyContent.html || anyContent.text || '';
                            initialPages = raw.split('<!-- page-break -->');
                        }
                        
                        if (anyContent.globalHeader) setGlobalHeader(anyContent.globalHeader);
                        if (anyContent.globalFooter) setGlobalFooter(anyContent.globalFooter);
                        if (anyContent.showHeader) setShowHeader(anyContent.showHeader);
                        if (anyContent.showFooter) setShowFooter(anyContent.showFooter);
                    } else if (typeof doc.content === 'string') {
                        try {
                            const parsed = JSON.parse(doc.content);
                            if (parsed.pages) {
                                initialPages = parsed.pages;
                            } else {
                                initialPages = (parsed.html || parsed.text || '').split('<!-- page-break -->');
                            }
                            if (parsed.globalHeader) setGlobalHeader(parsed.globalHeader);
                            if (parsed.globalFooter) setGlobalFooter(parsed.globalFooter);
                            if (parsed.showHeader) setShowHeader(parsed.showHeader);
                            if (parsed.showFooter) setShowFooter(parsed.showFooter);
                        } catch {
                            initialPages = doc.content.split('<!-- page-break -->');
                        }
                    }

                    setPages(initialPages.length > 0 ? initialPages : ['']);
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
        if (!docData) return;
        setIsSaving(true);

        // Update pages array from actual editor refs
        const currentPages = editorRefs.current.map(ref => ref?.innerHTML || '');
        const plainText = editorRefs.current.map(ref => ref?.innerText || '').join('\n\n');

        try {
            await documentService.updateDocument(docData.id, {
                name: title,
                content: {
                    pages: currentPages,
                    html: currentPages.join('<!-- page-break -->'),
                    text: plainText,
                    globalHeader,
                    globalFooter,
                    showHeader,
                    showFooter
                },
            });
            setPages(currentPages);
            toast.success('Document saved');
        } catch (error) {
            console.error('Error saving:', error);
            toast.error('Failed to save document');
        } finally {
            setIsSaving(false);
        }
    };

    const addPage = () => {
        setPages(prev => [...prev, '']);
        setTimeout(() => {
            setActivePageIndex(pages.length);
            editorRefs.current[pages.length]?.focus();
        }, 100);
        toast.info("New page added");
    };

    const removePage = (index: number) => {
        if (pages.length <= 1) {
            toast.error("A document must have at least one page");
            return;
        }

        const newPages = pages.filter((_, i) => i !== index);
        setPages(newPages);

        // Adjust active index
        if (activePageIndex >= index) {
            setActivePageIndex(Math.max(0, activePageIndex - 1));
        }

        toast.success(`Page ${index + 1} removed`);
    };

    const [activeStyles, setActiveStyles] = useState<{ [key: string]: boolean }>({});
    const [currentStyleLabel, setCurrentStyleLabel] = useState('Normal Text');

    const updateActiveStyles = () => {
        const styles = {
            bold: document.queryCommandState('bold'),
            italic: document.queryCommandState('italic'),
            underline: document.queryCommandState('underline'),
            strikeThrough: document.queryCommandState('strikeThrough'),
            justifyLeft: document.queryCommandState('justifyLeft'),
            justifyCenter: document.queryCommandState('justifyCenter'),
            justifyRight: document.queryCommandState('justifyRight'),
            insertUnorderedList: document.queryCommandState('insertUnorderedList'),
            insertOrderedList: document.queryCommandState('insertOrderedList'),
        };
        setActiveStyles(styles);

        // Detect current block type
        try {
            const blockType = document.queryCommandValue('formatBlock');
            const styleMap: { [key: string]: string } = {
                'p': 'Normal Text',
                'div': 'Normal Text',
                'h1': 'Heading 1',
                'h2': 'Heading 2',
                'h3': 'Heading 3',
                'h4': 'Heading 4',
                'h5': 'Heading 5',
                'h6': 'Heading 6',
                'blockquote': 'Quote',
                'pre': 'Code Block',
                'address': 'Contact/Address'
            };
            setCurrentStyleLabel(styleMap[blockType?.toLowerCase()] || 'Normal Text');
        } catch (e) {
            setCurrentStyleLabel('Normal Text');
        }
    };

    const [formatClipboard, setFormatClipboard] = useState<{
        bold: boolean;
        italic: boolean;
        underline: boolean;
        color: string;
        bg: string;
        fontSize: string;
    } | null>(null);

    const handleFormatPainter = () => {
        if (!formatClipboard) {
            // Copy mode
            setFormatClipboard({
                bold: document.queryCommandState('bold'),
                italic: document.queryCommandState('italic'),
                underline: document.queryCommandState('underline'),
                color: document.queryCommandValue('foreColor'),
                bg: document.queryCommandValue('hiliteColor'),
                fontSize: document.queryCommandValue('fontSize'),
            });
            toast.info("Format copied (Click Painter again to apply)");
        } else {
            // Apply mode
            if (formatClipboard.bold) document.execCommand('bold');
            if (formatClipboard.italic) document.execCommand('italic');
            if (formatClipboard.underline) document.execCommand('underline');
            if (formatClipboard.color) document.execCommand('foreColor', false, formatClipboard.color);
            if (formatClipboard.bg) document.execCommand('hiliteColor', false, formatClipboard.bg);
            if (formatClipboard.fontSize) document.execCommand('fontSize', false, formatClipboard.fontSize);

            setFormatClipboard(null);
            toast.success("Format applied");
        }
    };

    const execCommand = (command: string, value: string = '') => {
        if (activePageIndex === -1) return;

        const editor = editorRefs.current[activePageIndex];
        if (!editor) return;

        // Force focus if lost
        editor.focus();

        // Use a tick to ensure focus is established before command
        setTimeout(() => {
            // Some browsers prefer bracketed tags for formatBlock
            const finalValue = (command === 'formatBlock' && !value.startsWith('<'))
                ? `<${value}>`
                : value;

            document.execCommand(command, false, finalValue);
            updateActiveStyles();
        }, 0);
    };

    const insertTable = () => {
        const rows = prompt("Enter number of rows:", "3");
        const cols = prompt("Enter number of columns:", "3");
        if (!rows || !cols) return;

        let table = `<table style="width:100%; border-collapse: collapse; margin: 10px 0; border: 1px solid #ddd;">`;
        for (let i = 0; i < parseInt(rows); i++) {
            table += `<tr>`;
            for (let j = 0; j < parseInt(cols); j++) {
                table += `<td style="border: 1px solid #ddd; padding: 8px; min-height: 20px;">&nbsp;</td>`;
            }
            table += `</tr>`;
        }
        table += `</table><p>&nbsp;</p>`;
        execCommand('insertHTML', table);
    };

    const insertImage = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: any) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (re) => {
                    const url = re.target?.result as string;
                    const img = `<img src="${url}" style="max-width: 100%; border-radius: 8px; border: 1px solid #ddd; margin: 15px 0; display: block;" />`;
                    execCommand('insertHTML', img);
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    };

    const insertTextBox = () => {
        const textBoxHtml = `<div style="border: 1px solid #ccc; padding: 12px; margin: 10px 0; min-width: 120px; display: inline-block; background: #fff; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); font-style: normal;" contenteditable="true">Text Box Content</div>`;
        execCommand('insertHTML', textBoxHtml);
    };

    const insertLink = () => {
        const selection = window.getSelection();
        const selectedText = selection ? selection.toString() : "";

        const url = prompt("Enter the URL:", "https://");
        if (!url) return;

        let displayText = selectedText;
        if (!displayText) {
            displayText = prompt("Enter the display text:", url) || url;
        }

        const linkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline; cursor: pointer;">${displayText}</a>`;

        if (selectedText && selectedText.length > 0) {
            execCommand('createLink', url);
            // After createLink, the browser might not add target="_blank". 
            // We can try to fix it but insertHTML is cleaner for custom links.
        } else {
            execCommand('insertHTML', linkHtml);
        }
    };

    const handleSheetFocus = (idx: number) => {
        setActivePageIndex(idx);
        updateActiveStyles();

        // Ensure cursor is at the end for better experience
        const editor = editorRefs.current[idx];
        if (editor && document.activeElement !== editor) {
            editor.focus();
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(editor);
            range.collapse(false);
            sel?.removeAllRanges();
            sel?.addRange(range);
        }
    };

    const handleGenerateSummary = async () => {
        const plainText = editorRefs.current.map(ref => ref?.innerText || '').join(' ');
        if (!plainText || !docData) return;

        setIsSummarizing(true);
        try {
            let generatedSummary = "";
            const API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

            if (aiService.isConfigured() && API_KEY) {
                generatedSummary = await aiService.generateSummary(API_KEY, title, plainText);
            } else {
                await new Promise(resolve => setTimeout(resolve, 2000));
                generatedSummary = `Consolidated Analysis: This ${pages.length}-page document covers ${title}. Total estimated word count: ${plainText.split(/\s+/).length}. Focus areas include modular structure and formatted data.`;
            }

            await documentService.updateDocument(docData.id, { ai_summary: generatedSummary });
            setSummary(generatedSummary);
            toast.success('AI Summary updated');
        } catch (error) {
            toast.error('Failed to generate summary');
        } finally {
            setIsSummarizing(false);
        }
    };

    const handleApplyAIContent = (aiContent: string) => {
        // 1. Parse content into Q&A Blocks
        // We look for patterns like Q1), Q8), Question: etc.
        const blocks = aiContent.split(/(?=Q\d+\)|Question:)/g).filter(b => b.trim().length > 0);

        const formattedPages: string[] = [];
        const itemsPerPage = 5; // Grouping 5 Q&A pairs per sheet for readability

        for (let i = 0; i < blocks.length; i += itemsPerPage) {
            const chunk = blocks.slice(i, i + itemsPerPage);
            let pageHTML = chunk.map(block => {
                return block
                    .trim()
                    .replace(/^(Q\d+\)|Question:)\s*(.*)$/gm, '<strong>$1 $2</strong>')
                    .replace(/^(Ans:|Answer:)\s*(.*)$/gm, '<div style="margin-bottom: 24px; opacity: 0.9;"><em>$1</em> $2</div>')
                    .replace(/•\s*(.*)$/gm, '<li style="margin-left: 20px;">$1</li>')
                    .split(/\n\n+/).map(p => {
                        if (p.startsWith('<strong') || p.startsWith('<div')) return p;
                        return `<p style="margin-bottom: 12px;">${p.replace(/\n/g, '<br/>')}</p>`;
                    }).join('');
            }).join('');

            if (pageHTML.includes('<li')) {
                pageHTML = pageHTML.replace(/(<li.*<\/li>)/gms, '<ul>$1</ul>');
            }
            formattedPages.push(pageHTML);
        }

        // If no blocks were found (just generic text), handle as one block
        if (formattedPages.length === 0) {
            formattedPages.push(`<p>${aiContent.replace(/\n/g, '<br/>')}</p>`);
        }

        // 2. Perform Replacement & Clean-sweep
        // We replace the current page and remove ALL subsequent pages 
        // to ensure old questions/overflow don't remain.
        const pagesBefore = pages.slice(0, activePageIndex);
        const newPages = [...pagesBefore, ...formattedPages];

        setPages(newPages);
        toast.success(`Complete replacement: ${formattedPages.length} clean sheet(s) generated`);
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
            subtitle={`Editing ${pages.length} Page${pages.length > 1 ? 's' : ''}`}
            fullHeight
            leftAction={
                <Button variant="ghost" size="sm" onClick={() => navigate('/documents')} className="h-8">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Back</span>
                </Button>
            }
            titleElement={
                <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="text-sm font-semibold bg-transparent border-none focus-visible:ring-0 px-0 h-auto w-full max-w-[200px]"
                        placeholder="Document Title"
                    />
                </div>
            }
            rightAction={
                <div className="flex items-center gap-3">
                    <div className="hidden lg:block text-[10px] text-muted-foreground uppercase tracking-widest">
                        {isSaving ? 'Saving...' : 'All changes saved'}
                    </div>
                    <Button onClick={handleSave} disabled={isSaving} size="sm" className="h-8 shadow-sm">
                        {isSaving ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Save className="mr-2 h-3 w-3" />}
                        Save
                    </Button>
                </div>
            }
        >
            <div className="flex flex-col h-full bg-background overflow-hidden relative">
                <div className="flex-1 flex overflow-hidden">                    <div className="flex-1 flex flex-col min-w-0 bg-muted/5 relative">
                    {/* MS Word Style Ribbon Toolbar */}
                    <div className="sticky top-0 z-20 flex flex-col shrink-0 select-none overflow-hidden p-2 bg-muted/5 backdrop-blur-sm border-b border-border/20">
                        <div className="h-[105px] flex items-stretch px-4 py-1 gap-0 border border-border/50 rounded-xl bg-background shadow-sm overflow-x-auto no-scrollbar">

                            {/* Clipboard Group */}
                            <div className="flex flex-col border-r border-border/40 pr-3 mr-3 pb-2">
                                <div className="flex items-start gap-1 mt-1">
                                    {/* Large Paste Button */}
                                    <Button
                                        variant="ghost"
                                        className="flex flex-col items-center justify-center gap-1 h-[82px] px-4 hover:bg-primary/5 transition-colors group"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            navigator.clipboard.readText().then(text => {
                                                execCommand('insertHTML', text);
                                            }).catch(() => {
                                                toast.warning("Clipboard access restricted. Please use Ctrl+V to paste.");
                                            });
                                        }}
                                        title="Paste (Ctrl+V)"
                                    >
                                        <ClipboardPaste className="h-11 w-11 text-amber-500 group-hover:scale-105 transition-transform" />
                                        <span className="text-[11px] font-medium">Paste</span>
                                    </Button>

                                    {/* Action Stack */}
                                    <div className="flex flex-col gap-0">
                                        <Button variant="ghost" size="sm" className="h-7 px-2 justify-start gap-2 hover:bg-primary/5 text-[10px] font-normal" onMouseDown={(e) => { e.preventDefault(); document.execCommand('cut'); }}><Scissors className="h-3.5 w-3.5 text-blue-500" /> Cut</Button>
                                        <Button variant="ghost" size="sm" className="h-7 px-2 justify-start gap-2 hover:bg-primary/5 text-[10px] font-normal" onMouseDown={(e) => { e.preventDefault(); document.execCommand('copy'); }}><Copy className="h-3.5 w-3.5 text-muted-foreground" /> Copy</Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={cn("h-7 px-2 justify-start gap-2 hover:bg-primary/5 text-[10px] font-normal", formatClipboard && "text-primary bg-primary/5")}
                                            onMouseDown={(e) => { e.preventDefault(); handleFormatPainter(); }}
                                        >
                                            <Paintbrush className={cn("h-3.5 w-3.5 text-amber-500", formatClipboard && "animate-pulse")} /> Format Painter
                                        </Button>
                                    </div>
                                </div>

                            </div>

                            {/* Font Group */}
                            <div className="flex flex-col border-r border-border/40 pr-3 mr-3 pb-2 min-w-[200px]">
                                <div className="flex flex-col gap-1.5 mt-1">
                                    {/* Font Top Row */}
                                    <div className="flex items-center gap-1">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="sm" className="h-7 w-32 px-2 justify-between text-[11px] font-medium bg-background/50 border-border/60">
                                                    <span className="truncate">Inter</span>
                                                    <ChevronDown className="h-3 w-3 opacity-50" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="w-48">
                                                <DropdownMenuItem onMouseDown={(e) => { e.preventDefault(); execCommand('fontName', 'Inter'); }}>Inter</DropdownMenuItem>
                                                <DropdownMenuItem onMouseDown={(e) => { e.preventDefault(); execCommand('fontName', 'serif'); }}>Serif</DropdownMenuItem>
                                                <DropdownMenuItem onMouseDown={(e) => { e.preventDefault(); execCommand('fontName', 'monospace'); }}>Monospace</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="sm" className="h-7 w-12 px-2 bg-background/50 border-border/60 text-[11px]">11</Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="w-16">
                                                {[8, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72].map(sz => (
                                                    <DropdownMenuItem key={sz} onMouseDown={(e) => { e.preventDefault(); execCommand('fontSize', sz <= 10 ? '1' : sz <= 14 ? '2' : sz <= 18 ? '3' : sz <= 24 ? '4' : sz <= 36 ? '5' : sz <= 48 ? '6' : '7'); }}>{sz}</DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        <div className="flex items-center gap-0.5">
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onMouseDown={(e) => { e.preventDefault(); execCommand('fontSize', '4'); }}><span className="text-xs font-bold uppercase">A^</span></Button>
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onMouseDown={(e) => { e.preventDefault(); execCommand('fontSize', '2'); }}><span className="text-[10px] font-bold uppercase">A<ArrowDown className="h-2 w-2 inline" /></span></Button>
                                        </div>

                                        <div className="w-[1px] h-4 bg-border/40 mx-0.5" />
                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Clear Formatting" onMouseDown={(e) => { e.preventDefault(); execCommand('removeFormat'); }}><Eraser className="h-3.5 w-3.5" /></Button>
                                    </div>

                                    {/* Font Bottom Row */}
                                    <div className="flex items-center gap-0.5">
                                        <Button variant="ghost" size="sm" className={cn("h-6 w-6 p-0", activeStyles.bold && "bg-primary/20 text-primary")} onMouseDown={(e) => { e.preventDefault(); execCommand('bold'); }}><Bold className="h-3.5 w-3.5" /></Button>
                                        <Button variant="ghost" size="sm" className={cn("h-6 w-6 p-0", activeStyles.italic && "bg-primary/20 text-primary")} onMouseDown={(e) => { e.preventDefault(); execCommand('italic'); }}><Italic className="h-3.5 w-3.5" /></Button>
                                        <Button variant="ghost" size="sm" className={cn("h-6 w-6 p-0", activeStyles.underline && "bg-primary/20 text-primary")} onMouseDown={(e) => { e.preventDefault(); execCommand('underline'); }}><Underline className="h-3.5 w-3.5" /></Button>
                                        <Button variant="ghost" size="sm" className={cn("h-6 w-6 p-0", activeStyles.strikeThrough && "bg-primary/20 text-primary")} onMouseDown={(e) => { e.preventDefault(); execCommand('strikeThrough'); }}><Strikethrough className="h-3.5 w-3.5" /></Button>

                                        <div className="w-[1px] h-4 bg-border/40 mx-0.5" />

                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onMouseDown={(e) => { e.preventDefault(); execCommand('subscript'); }}><span className="text-[10px]">X₂</span></Button>
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onMouseDown={(e) => { e.preventDefault(); execCommand('superscript'); }}><span className="text-[10px]">X²</span></Button>

                                        <div className="w-[1px] h-4 bg-border/40 mx-0.5" />

                                        <div className="flex items-center gap-0">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-8 flex flex-col items-center justify-center transition-all px-0"
                                                title={`Font Color (${activeFontColor})`}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    const editor = editorRefs.current[activePageIndex];
                                                    if (editor) {
                                                        editor.focus();
                                                        document.execCommand('foreColor', false, activeFontColor);
                                                    }
                                                }}
                                            >
                                                <Baseline className="h-4 w-4" />
                                                <div className="h-[2px] w-4 rounded-full mt-[-1px]" style={{ backgroundColor: activeFontColor }} />
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-7 w-3.5 p-0 opacity-50 hover:opacity-100">
                                                        <ChevronDown className="h-2.5 w-2.5" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="p-3 w-64 bg-popover/95 backdrop-blur-md border-border/40 shadow-xl overflow-hidden">
                                                    {/* Automatic Section */}
                                                    <div
                                                        className="flex items-center gap-3 p-1.5 hover:bg-accent rounded-md cursor-pointer text-xs font-medium group transition-colors mb-2"
                                                        onMouseDown={(e) => { e.preventDefault(); setActiveFontColor('#000000'); execCommand('foreColor', '#000000'); }}
                                                    >
                                                        <div className="h-5 w-5 bg-black border border-white/20 rounded-sm shadow-sm" />
                                                        <span className="group-hover:text-foreground">Automatic</span>
                                                    </div>

                                                    {/* Theme Colors Label */}
                                                    <div className="text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wider px-1">Theme Colors</div>

                                                    {/* Top Theme Row */}
                                                    <div className="grid grid-cols-10 gap-0.5 px-0.5 mb-0.5">
                                                        {THEME_COLORS.map(c => (
                                                            <div
                                                                key={c.hex}
                                                                className="h-5 bg-transparent border-[0.5px] border-border/20 cursor-pointer hover:scale-110 transition-transform relative z-10"
                                                                style={{ backgroundColor: c.hex }}
                                                                title={c.name}
                                                                onMouseDown={(e) => { e.preventDefault(); setActiveFontColor(c.hex); execCommand('foreColor', c.hex); }}
                                                            />
                                                        ))}
                                                    </div>

                                                    {/* Tone Variation Grid (Simulated with opacity/darkness) */}
                                                    <div className="flex flex-col gap-0.5 px-0.5 mb-4">
                                                        {[0.8, 0.6, 0.4, 0.2, 0.1].map((shade, sIdx) => (
                                                            <div key={sIdx} className="grid grid-cols-10 gap-0.5">
                                                                {THEME_COLORS.map(c => (
                                                                    <div
                                                                        key={`${c.hex}-${shade}`}
                                                                        className="h-4 border-[0.5px] border-border/10 cursor-pointer hover:relative hover:z-20 hover:scale-125 transition-all"
                                                                        style={{
                                                                            backgroundColor: c.hex,
                                                                            filter: sIdx < 2 ? `brightness(${1 + (3 - sIdx) * 0.2})` : `brightness(${0.8 - (sIdx - 2) * 0.2})`
                                                                        } as any}
                                                                        onMouseDown={(e) => {
                                                                            e.preventDefault();
                                                                            const finalColor = c.hex; // Simplified
                                                                            setActiveFontColor(finalColor);
                                                                            execCommand('foreColor', finalColor);
                                                                        }}
                                                                    />
                                                                ))}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Standard Colors Section */}
                                                    <div className="text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wider px-1">Standard Colors</div>
                                                    <div className="grid grid-cols-10 gap-0.5 px-0.5 mb-4">
                                                        {STANDARD_COLORS.map(c => (
                                                            <div
                                                                key={c}
                                                                className="h-5 border-[0.5px] border-border/20 cursor-pointer hover:scale-110 transition-transform shadow-sm"
                                                                style={{ backgroundColor: c }}
                                                                onMouseDown={(e) => { e.preventDefault(); setActiveFontColor(c); execCommand('foreColor', c); }}
                                                            />
                                                        ))}
                                                    </div>

                                                    <div className="h-[1px] bg-border/40 my-2" />

                                                    {/* Utilities */}
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2 p-1.5 hover:bg-accent rounded-md cursor-pointer text-xs group transition-colors">
                                                            <div className="h-5 w-5 flex items-center justify-center border border-border/60 bg-background rounded-sm shadow-sm group-hover:border-primary/40">
                                                                <Palette className="h-3 w-3" />
                                                            </div>
                                                            <span>More Colors...</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 p-1.5 hover:bg-accent rounded-md cursor-pointer text-xs group transition-colors">
                                                            <div className="h-5 w-5 flex items-center justify-center border border-border/60 bg-background rounded-sm shadow-sm group-hover:border-primary/40">
                                                                <Layers className="h-3 w-3" />
                                                            </div>
                                                            <span>Gradient</span>
                                                            <ChevronRight className="h-3 w-3 ml-auto opacity-50" />
                                                        </div>
                                                    </div>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        <div className="flex items-center">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={cn("h-7 w-8 flex flex-col items-center justify-center transition-all px-0 gap-0", isHighlightMode && "bg-primary/5 ring-1 ring-primary/20")}
                                                title={`Highlighter (${activeHighlightColor})`}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    const newMode = !isHighlightMode;
                                                    setIsHighlightMode(newMode);

                                                    const activeEditor = editorRefs.current[activePageIndex];
                                                    if (activeEditor) {
                                                        activeEditor.focus();
                                                        if (newMode) {
                                                            document.execCommand('styleWithCSS', false, "true");
                                                            document.execCommand('hiliteColor', false, activeHighlightColor);
                                                            document.execCommand('insertHTML', false, `<span style="background-color: ${activeHighlightColor}">&#8203;</span>`);
                                                        } else {
                                                            document.execCommand('hiliteColor', false, 'rgba(0,0,0,0)');
                                                            document.execCommand('insertHTML', false, '<span style="background-color: transparent !important; color: inherit;">&#8203;</span>');
                                                        }
                                                    }
                                                }}
                                            >
                                                <Highlighter className="h-3.5 w-3.5" />
                                                <div className="h-[2px] w-4 rounded-full mt-[-1px]" style={{ backgroundColor: activeHighlightColor }} />
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-7 w-3.5 p-0 opacity-50 hover:opacity-100">
                                                        <ChevronDown className="h-2.5 w-2.5" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="p-3 w-56 bg-popover/95 backdrop-blur-md border-border/40 shadow-xl">
                                                    <div className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Highlight Colors</div>
                                                    <div className="grid grid-cols-5 gap-1.5 mb-3">
                                                        {[
                                                            { n: 'Yellow', c: '#ffff00' }, { n: 'Bright Green', c: '#00ff00' }, { n: 'Cyan', c: '#00ffff' }, { n: 'Pink', c: '#ff00ff' }, { n: 'Blue', c: '#0000ff' },
                                                            { n: 'Red', c: '#ff0000' }, { n: 'Dark Blue', c: '#00008b' }, { n: 'Teal', c: '#008080' }, { n: 'Green', c: '#008000' }, { n: 'Violet', c: '#800080' },
                                                            { n: 'Dark Red', c: '#8b0000' }, { n: 'Dark Yellow', c: '#808000' }, { n: 'Gray', c: '#808080' }, { n: 'Silver', c: '#c0c0c0' }, { n: 'Black', c: '#000000' }
                                                        ].map(c => (
                                                            <div
                                                                key={c.c}
                                                                className="h-7 w-7 rounded-sm border border-border/50 cursor-pointer hover:scale-110 transition-transform shadow-sm relative group"
                                                                style={{ backgroundColor: c.c }}
                                                                title={c.n}
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    setActiveHighlightColor(c.c);
                                                                    setIsHighlightMode(true);
                                                                    const editor = editorRefs.current[activePageIndex];
                                                                    if (editor) {
                                                                        editor.focus();
                                                                        document.execCommand('styleWithCSS', false, "true");
                                                                        document.execCommand('hiliteColor', false, c.c);
                                                                        document.execCommand('insertHTML', false, `<span style="background-color: ${c.c}">&#8203;</span>`);
                                                                    }
                                                                }}
                                                            >
                                                                <div className="absolute inset-0 border border-white/20 opacity-0 group-hover:opacity-100 pointer-events-none" />
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="h-[1px] bg-border/40 my-2" />

                                                    <div
                                                        className="flex items-center gap-2 p-1.5 hover:bg-accent rounded-md cursor-pointer text-xs transition-colors group"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            setIsHighlightMode(false);
                                                            const editor = editorRefs.current[activePageIndex];
                                                            if (editor) {
                                                                editor.focus();
                                                                document.execCommand('hiliteColor', false, 'rgba(0,0,0,0)');
                                                                document.execCommand('insertHTML', false, '<span style="background-color: transparent !important;">&#8203;</span>');
                                                            }
                                                            toast.info("No Color selected");
                                                        }}
                                                    >
                                                        <div className="h-5 w-5 border border-border/60 bg-background flex items-center justify-center relative overflow-hidden">
                                                            <div className="h-[1px] w-6 bg-red-500/60 rotate-45 absolute" />
                                                        </div>
                                                        <span className="group-hover:text-foreground/90 transition-colors">No Color</span>
                                                    </div>

                                                    <div
                                                        className="flex items-center gap-2 p-1.5 hover:bg-destructive/10 rounded-md cursor-pointer text-xs transition-colors group mt-1"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            setIsHighlightMode(false);
                                                            toast.info("Highlighter Stopped");
                                                        }}
                                                    >
                                                        <div className="h-5 w-5 bg-destructive/5 border border-destructive/20 flex items-center justify-center rounded-sm">
                                                            <Eraser className="h-3 w-3 text-destructive" />
                                                        </div>
                                                        <span className="text-destructive font-medium">Stop Highlighting</span>
                                                    </div>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Paragraph Group */}
                            <div className="flex flex-col border-r border-border/40 pr-3 mr-3 pb-2">
                                <div className="flex flex-col gap-1.5 mt-1">
                                    {/* Paragraph Top Row */}
                                    <div className="flex items-center gap-0.5">
                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onMouseDown={(e) => { e.preventDefault(); execCommand('insertUnorderedList'); }}><List className="h-3.5 w-3.5" /></Button>
                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onMouseDown={(e) => { e.preventDefault(); execCommand('insertOrderedList'); }}><ListOrdered className="h-3.5 w-3.5" /></Button>
                                        <div className="w-[1px] h-4 bg-border/40 mx-0.5" />
                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onMouseDown={(e) => { e.preventDefault(); execCommand('outdent'); }}><AlignLeft className="h-3.5 w-3.5 rotate-180" /></Button>
                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onMouseDown={(e) => { e.preventDefault(); execCommand('indent'); }}><AlignLeft className="h-3.5 w-3.5" /></Button>
                                    </div>
                                    {/* Paragraph Bottom Row */}
                                    <div className="flex items-center gap-0.5">
                                        <Button variant="ghost" size="sm" className={cn("h-6 w-6 p-0", activeStyles.justifyLeft && "bg-primary/20 text-primary")} onMouseDown={(e) => { e.preventDefault(); execCommand('justifyLeft'); }}><AlignLeft className="h-3.5 w-3.5" /></Button>
                                        <Button variant="ghost" size="sm" className={cn("h-6 w-6 p-0", activeStyles.justifyCenter && "bg-primary/20 text-primary")} onMouseDown={(e) => { e.preventDefault(); execCommand('justifyCenter'); }}><AlignCenter className="h-3.5 w-3.5" /></Button>
                                        <Button variant="ghost" size="sm" className={cn("h-6 w-6 p-0", activeStyles.justifyRight && "bg-primary/20 text-primary")} onMouseDown={(e) => { e.preventDefault(); execCommand('justifyRight'); }}><AlignRight className="h-3.5 w-3.5" /></Button>
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onMouseDown={(e) => { e.preventDefault(); execCommand('justifyFull'); }}><Search className="h-3.5 w-3.5" /></Button> {/* Approximate for justify */}
                                    </div>
                                </div>
                            </div>

                            {/* Tables Group */}
                            <div className="flex flex-col border-r border-border/40 pr-3 mr-3 pb-2 w-[70px]">
                                <div className="mt-1 flex justify-center h-full items-center">
                                    <Button variant="ghost" className="flex flex-col items-center justify-center gap-1 h-[82px] w-full hover:bg-primary/5 group px-0" onClick={(e) => { e.preventDefault(); insertTable(); }}>
                                        <Table className="h-12 w-12 text-blue-500 group-hover:scale-110 transition-transform" />
                                        <span className="text-[10px] font-medium">Table</span>
                                    </Button>
                                </div>
                            </div>

                            {/* Illustrations Group */}
                            <div className="flex flex-col border-r border-border/40 pr-3 mr-3 pb-2 w-[220px]">
                                <div className="grid grid-cols-3 gap-1 mt-1 px-1">
                                    <Button variant="ghost" size="sm" className="h-auto min-h-[40px] py-1 flex-col gap-0.5 hover:bg-primary/5 transition-all border border-border/40 rounded-sm bg-background/20 shadow-none hover:border-primary/30" onClick={(e) => { e.preventDefault(); insertImage(); }}>
                                        <ImageIcon className="h-4 w-4 text-foreground/80 drop-shadow-sm" />
                                        <span className="text-[7px] font-bold tracking-tighter uppercase text-muted-foreground/80 leading-none">Pictures</span>
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-auto min-h-[40px] py-1 flex-col gap-0.5 hover:bg-primary/5 transition-all border border-border/40 rounded-sm bg-background/20 shadow-none hover:border-primary/30" onClick={(e) => { e.preventDefault(); toast.info("Shapes tool coming soon"); }}>
                                        <Shapes className="h-4 w-4 text-foreground/80 drop-shadow-sm" />
                                        <span className="text-[7px] font-bold tracking-tighter uppercase text-muted-foreground/80 leading-none">Shapes</span>
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-auto min-h-[40px] py-1 flex-col gap-0.5 hover:bg-primary/5 transition-all border border-border/40 rounded-sm bg-background/20 shadow-none hover:border-primary/30" onClick={(e) => { e.preventDefault(); toast.info("Icons library coming soon"); }}>
                                        <Sparkles className="h-4 w-4 text-foreground/80 drop-shadow-sm" />
                                        <span className="text-[7px] font-bold tracking-tighter uppercase text-muted-foreground/80 leading-none">Icons</span>
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-auto min-h-[40px] py-1 flex-col gap-0.5 hover:bg-primary/5 transition-all border border-border/40 rounded-sm bg-background/20 shadow-none hover:border-primary/30" onClick={(e) => { e.preventDefault(); toast.info("3D Models coming soon"); }}>
                                        <Box className="h-4 w-4 text-foreground/80 drop-shadow-sm" />
                                        <span className="text-[7px] font-bold tracking-tighter uppercase text-muted-foreground/80 leading-none">3D Models</span>
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-auto min-h-[40px] py-1 flex-col gap-0.5 hover:bg-primary/5 transition-all border border-border/40 rounded-sm bg-background/20 shadow-none hover:border-primary/30 col-span-2" onClick={(e) => { e.preventDefault(); toast.info("Chart engine coming soon"); }}>
                                        <BarChart className="h-4 w-4 text-foreground/80 drop-shadow-sm" />
                                        <span className="text-[7px] font-bold tracking-tighter uppercase text-muted-foreground/80 leading-none">Smart Chart</span>
                                    </Button>
                                </div>
                            </div>

                            {/* Links Group */}
                            <div className="flex flex-col border-r border-border/40 pr-3 mr-3 pb-2 min-w-[100px]">
                                <div className="flex flex-col gap-0 mt-1">
                                    <Button variant="ghost" size="sm" className="h-7 px-2 justify-start gap-2 hover:bg-primary/5 text-[10px] font-normal" onClick={(e) => { e.preventDefault(); insertLink(); }}><LinkIcon className="h-3.5 w-3.5 text-blue-500" /> Link</Button>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 justify-start gap-2 hover:bg-primary/5 text-[10px] font-normal" onClick={(e) => { e.preventDefault(); insertTextBox(); }}><Type className="h-3.5 w-3.5 text-blue-500" /> Text Box</Button>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 justify-start gap-2 hover:bg-primary/5 text-[10px] font-normal" onClick={(e) => { e.preventDefault(); toast.info("Video embedding module restricted"); }}><Video className="h-3.5 w-3.5 text-blue-600" /> Online Video</Button>
                                </div>
                            </div>

                            {/* Header & Footer Group */}
                            <div className="flex flex-col border-r border-border/40 pr-3 mr-3 pb-2">
                                <div className="flex flex-col gap-0.5 mt-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn("h-7 px-2 justify-start gap-2 hover:bg-primary/5 text-[10px] font-normal", showHeader && "bg-primary/10 text-primary")}
                                        onClick={(e) => { e.preventDefault(); setShowHeader(!showHeader); }}
                                    >
                                        <GalleryVertical className="h-3.5 w-3.5" /> Header
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn("h-7 px-2 justify-start gap-2 hover:bg-primary/5 text-[10px] font-normal", showFooter && "bg-primary/10 text-primary")}
                                        onClick={(e) => { e.preventDefault(); setShowFooter(!showFooter); }}
                                    >
                                        <GalleryVertical className="h-3.5 w-3.5 rotate-180" /> Footer
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 justify-start gap-2 hover:bg-primary/5 text-[10px] font-normal" onClick={(e) => { e.preventDefault(); toast.info("Page numbers formatted automatically"); }}>
                                        <Hash className="h-3.5 w-3.5 text-blue-500" /> Page Number
                                    </Button>
                                </div>
                            </div>

                            <div className="flex-1" />

                            <div className="flex flex-col justify-center gap-2">
                                <Button size="sm" className="h-8 bg-primary text-primary-foreground font-bold text-[10px] uppercase tracking-wider" onClick={addPage}>
                                    <Plus className="h-3 w-3 mr-1" /> New Page
                                </Button>
                                <div className="flex gap-1 justify-center">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onMouseDown={(e) => { e.preventDefault(); execCommand('undo'); }}><Undo className="h-3.5 w-3.5" /></Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onMouseDown={(e) => { e.preventDefault(); execCommand('redo'); }}><Redo className="h-3.5 w-3.5" /></Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Document Scrollable Content */}
                    <div className="flex-1 overflow-auto p-4 md:p-6 custom-scrollbar bg-accent/5">
                        <div className="max-w-3xl mx-auto py-4 space-y-8">
                            {pages.map((pageContent, idx) => (
                                <div key={idx} className="relative transition-all duration-300">
                                    <div
                                        className={cn(
                                            "relative mx-auto bg-background shadow-[0_4px_20px_-5px_rgba(0,0,0,0.1)] border border-border/30 rounded-sm w-full max-w-[640px] min-h-[800px] p-[48px] flex flex-col transition-all duration-300 group",
                                            activePageIndex === idx ? "ring-2 ring-primary/20 shadow-xl border-primary/30" : ""
                                        )}
                                        style={isHighlightMode ? {
                                            cursor: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${activeHighlightColor.replace('#', '%23')}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>') 0 24, auto`
                                        } : {}}
                                        onFocus={() => {
                                            // Ensure the pen is "wet" when clicking back into the editor
                                            if (isHighlightMode) {
                                                document.execCommand('styleWithCSS', false, "true");
                                                document.execCommand('hiliteColor', false, activeHighlightColor);
                                            }
                                        }}
                                        onMouseUp={() => {
                                            const selection = window.getSelection();
                                            if (isHighlightMode && selection && selection.toString().length > 0) {
                                                document.execCommand('styleWithCSS', false, "true");
                                                document.execCommand('hiliteColor', false, activeHighlightColor);
                                            }
                                        }}
                                        onClick={(e) => {
                                            const target = e.target as HTMLElement;
                                            const link = target.closest('a');
                                            if (link && link.href) {
                                                if (activePageIndex === idx) {
                                                    window.open(link.href, '_blank');
                                                }
                                            }
                                            setActivePageIndex(idx);
                                        }}
                                    >
                                        {(showHeader || globalHeader !== '') && (
                                            <GlobalHeaderEditor
                                                content={globalHeader}
                                                onChange={setGlobalHeader}
                                            />
                                        )}

                                        <div className="flex-1">
                                            <PageSheet
                                                content={pageContent}
                                                idx={idx}
                                                onContentChange={(html: string) => {
                                                    const newPages = [...pages];
                                                    newPages[idx] = html;
                                                    setPages(newPages);
                                                }}
                                                onActive={handleSheetFocus}
                                                onStylesUpdate={updateActiveStyles}
                                                editorRef={(el: any) => editorRefs.current[idx] = el}
                                            />
                                        </div>

                                        {(showFooter || globalFooter !== '') && (
                                            <GlobalFooterEditor
                                                content={globalFooter}
                                                onChange={setGlobalFooter}
                                                pageNum={idx + 1}
                                                totalPages={pages.length}
                                            />
                                        )}

                                        {/* Page Info Overlay */}
                                        <div className="absolute right-[-35px] top-0 flex flex-col items-center gap-1 group/overlay">
                                            <div className={cn(
                                                "h-6 w-6 rounded-sm border flex items-center justify-center text-[8px] font-bold shadow-sm transition-colors",
                                                activePageIndex === idx ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border/40"
                                            )}>
                                                P{idx + 1}
                                            </div>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 rounded-sm opacity-0 group-hover/overlay:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-all"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removePage(idx);
                                                }}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                    {/* Sheet edge effect */}
                                    <div className="max-w-[640px] mx-auto h-1.5 bg-background shadow-sm border-x border-b border-border/20 rounded-b opacity-50" />
                                </div>
                            ))}

                            {/* Add Page Placeholder Button */}
                            <div
                                onClick={addPage}
                                className="max-w-[640px] mx-auto h-24 border-2 border-dashed border-border/40 rounded-xl flex items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all group"
                            >
                                <div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                                    <Plus className="h-5 w-5" />
                                    <span className="text-xs font-bold uppercase tracking-widest">Append New Sheet</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


                    {/* Right Sidebar (AI) */}
                    <div className="w-80 lg:w-96 border-l bg-background hidden md:flex flex-col shrink-0">
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
                                    <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-3 shadow-sm">
                                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">AI Summary</div>
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
                                            className="w-full h-8 text-xs font-bold"
                                            onClick={handleGenerateSummary}
                                            disabled={isSummarizing || pages.every(p => !p)}
                                        >
                                            {isSummarizing ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Sparkles className="h-3 w-3 mr-2" />}
                                            {summary ? 'Regenerate Summary' : 'Generate Summary'}
                                        </Button>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 m-0 p-0 overflow-hidden">
                                <ChatPanel
                                    documentTitle={title}
                                    documentContent={pages.join(' ')}
                                    onApplyToDocument={handleApplyAIContent}
                                />
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
