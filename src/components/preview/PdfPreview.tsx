import { useEffect, useRef } from 'react';

interface PdfPreviewProps {
  url: string;
  fileName: string;
}

export function PdfPreview({ url, fileName }: PdfPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // PDF.js can be used here for better control
    // For now, using simple iframe
  }, [url]);

  return (
    <div className="h-full w-full">
      <iframe
        ref={iframeRef}
        src={url}
        className="w-full h-full border-0"
        title={fileName}
      />
    </div>
  );
}


