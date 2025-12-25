import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface TextPreviewProps {
  url: string;
  fileName: string;
  mimeType: string;
}

export function TextPreview({ url, fileName, mimeType }: TextPreviewProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(url)
      .then((res) => res.text())
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [url]);

  const copyContent = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-2 flex justify-between items-center">
        <span className="text-sm font-medium">{fileName}</span>
        <Button variant="ghost" size="sm" onClick={copyContent}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <pre className="p-4 text-sm font-mono whitespace-pre-wrap">{content}</pre>
      </ScrollArea>
    </div>
  );
}


