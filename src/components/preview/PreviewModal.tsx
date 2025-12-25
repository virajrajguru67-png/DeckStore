import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { File } from '@/types/file';
import { uploadService } from '@/services/uploadService';
import { X, Download, Loader2 } from 'lucide-react';
import { ImagePreview } from './ImagePreview';
import { PdfPreview } from './PdfPreview';
import { TextPreview } from './TextPreview';
import { VideoPreview } from './VideoPreview';
import { AudioPreview } from './AudioPreview';

interface PreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
}

export function PreviewModal({ open, onOpenChange, file }: PreviewModalProps) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (file && open) {
      loadPreview();
    } else {
      // Reset state when modal closes or file changes
      setDownloadUrl(null);
      setLoading(false);
      setError(null);
    }
    return () => {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [file, open]);

  const loadPreview = async () => {
    if (!file) {
      setError('No file provided');
      setLoading(false);
      return;
    }

    if (!file.storage_key) {
      console.error('PreviewModal: File missing storage_key', {
        fileId: file.id,
        fileName: file.name,
        fileData: file,
      });
      setError('File storage key is missing. This file may not have been uploaded correctly.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('PreviewModal: Loading preview for file:', {
        fileId: file.id,
        name: file.name,
        storage_key: file.storage_key,
        mime_type: file.mime_type,
        owner_id: (file as any).owner_id,
      });
      
      const url = await uploadService.getDownloadUrl(file.storage_key);
      
      if (!url) {
        console.error('PreviewModal: Failed to get download URL for file:', {
          fileId: file.id,
          name: file.name,
          storage_key: file.storage_key,
          mime_type: file.mime_type,
        });
        setError('Failed to load file preview. Possible reasons:\n1. You may not have permission to view this file\n2. The file may have been deleted from storage\n3. Storage RLS policy may need to be updated\n\nPlease check the browser console for detailed error messages.');
        setLoading(false);
        return;
      }
      
      console.log('PreviewModal: Download URL obtained successfully');
      setDownloadUrl(url);
      setLoading(false);
    } catch (err: any) {
      console.error('PreviewModal: Error loading preview:', {
        error: err,
        message: err?.message,
        stack: err?.stack,
        fileId: file.id,
        storage_key: file.storage_key,
      });
      setError(`Failed to load file preview: ${err?.message || 'Unknown error'}. Please try downloading the file instead.`);
      setLoading(false);
    }
  };

  const getPreviewComponent = () => {
    if (!file || !downloadUrl) return null;

    const mimeType = file.mime_type;
    
    if (mimeType.startsWith('image/')) {
      return <ImagePreview url={downloadUrl} fileName={file.name} />;
    }
    
    if (mimeType === 'application/pdf') {
      return <PdfPreview url={downloadUrl} fileName={file.name} />;
    }
    
    if (mimeType.startsWith('video/')) {
      return <VideoPreview url={downloadUrl} fileName={file.name} />;
    }
    
    if (mimeType.startsWith('audio/')) {
      return <AudioPreview url={downloadUrl} fileName={file.name} />;
    }
    
    if (mimeType.startsWith('text/') || 
        ['application/json', 'application/xml'].includes(mimeType)) {
      return <TextPreview url={downloadUrl} fileName={file.name} mimeType={mimeType} />;
    }

    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <p className="text-muted-foreground mb-4">Preview not available for this file type</p>
        <Button onClick={() => window.open(downloadUrl!, '_blank')}>
          <Download className="mr-2 h-4 w-4" />
          Download to View
        </Button>
      </div>
    );
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] p-0 flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>{file?.name || 'File Preview'}</DialogTitle>
        </DialogHeader>
        <div className="relative flex-1 flex flex-col min-h-0">
          <div className="absolute top-4 right-4 z-50 flex gap-2">
            {downloadUrl && (
              <Button
                variant="secondary"
                size="icon"
                onClick={() => window.open(downloadUrl, '_blank')}
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="secondary"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Loading preview...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <p className="text-destructive mb-4">{error}</p>
              {file && (
                <Button onClick={() => {
                  if (file.storage_key) {
                    uploadService.getDownloadUrl(file.storage_key).then(url => {
                      if (url) window.open(url, '_blank');
                    });
                  }
                }}>
                  <Download className="mr-2 h-4 w-4" />
                  Download File
                </Button>
              )}
            </div>
          ) : !file ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <p className="text-muted-foreground mb-4">No file selected</p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              {getPreviewComponent()}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


