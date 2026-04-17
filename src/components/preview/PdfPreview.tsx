import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

// PDF.js worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface PdfPreviewProps {
  url: string;
  fileName: string;
  shareId?: string;
}

export function PdfPreview({ url, fileName, shareId }: PdfPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { user } = useAuth();
  const [pdf, setPdf] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(true);
  const userEmail = user?.email || 'Guest';

  useEffect(() => {
    const loadPdf = async () => {
      try {
        setLoading(true);
        const loadingTask = pdfjsLib.getDocument(url);
        const pdfDoc = await loadingTask.promise;
        setPdf(pdfDoc);
      } catch (error) {
        console.error('Error loading PDF:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPdf();
  }, [url]);

  const renderPage = async (num: number, pdfDoc: any, currentScale: number) => {
    if (!pdfDoc || !canvasRef.current) return;

    const page = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale: currentScale });
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext).promise;

    // Apply Watermark
    if (context) {
      context.font = '24px Inter, sans-serif';
      context.fillStyle = 'rgba(150, 150, 150, 0.15)';
      context.textAlign = 'center';
      context.textBaseline = 'middle';

      // Draw diagonal watermark grid
      for (let i = 0; i < canvas.width; i += 300) {
        for (let j = 0; j < canvas.height; j += 300) {
          context.save();
          context.translate(i, j);
          context.rotate(-Math.PI / 4);
          context.fillText(`${userEmail} • PREVIEW ONLY`, 0, 0);
          context.restore();
        }
      }
    }
  };

  useEffect(() => {
    if (pdf) {
      renderPage(pageNum, pdf, scale);
    }
  }, [pdf, pageNum, scale, userEmail]);

  const handlePrevPage = () => {
    if (pageNum > 1) setPageNum(pageNum - 1);
  };

  const handleNextPage = () => {
    if (pdf && pageNum < pdf.numPages) setPageNum(pageNum + 1);
  };

  return (
    <div className="flex flex-col h-full bg-accent/5 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium truncate max-w-[200px]">{fileName}</div>
          <div className="h-4 w-px bg-border" />
          <div className="text-xs text-muted-foreground">
            Page {pageNum} of {pdf?.numPages || '?'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevPage} disabled={pageNum === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextPage} disabled={!pdf || pageNum === pdf.numPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>

          <div className="h-4 w-px bg-border mx-2" />

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setScale(s => Math.max(0.5, s - 0.2))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <div className="text-xs min-w-[3rem] text-center font-mono">
            {Math.round(scale * 100)}%
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setScale(s => Math.min(3, s + 0.2))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-2 py-1 rounded bg-destructive/10 text-[10px] font-bold text-destructive uppercase tracking-tighter">
            Secure Preview
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-auto p-4 flex justify-center items-start scroll-smooth">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
          </div>
        ) : (
          <div className="relative shadow-2xl border rounded-sm overflow-hidden bg-white">
            <canvas ref={canvasRef} className="max-w-full h-auto pointer-events-none select-none" />

            {/* Overlay to prevent right-click/selection */}
            <div className="absolute inset-0 z-10 select-none bg-transparent" onContextMenu={(e) => e.preventDefault()} />
          </div>
        )}
      </div>
    </div>
  );
}
