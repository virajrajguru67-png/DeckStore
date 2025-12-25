import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useFileUpload } from '@/hooks/useFileUpload';
import { Upload, File as FileIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface FileUploadDropzoneProps {
  folderId?: string | null;
  onUploadComplete?: () => void;
  className?: string;
}

export function FileUploadDropzone({
  folderId,
  onUploadComplete,
  className,
}: FileUploadDropzoneProps) {
  const { uploadFiles, uploading, progress } = useFileUpload({
    folderId,
    onUploadComplete: () => {
      if (onUploadComplete) {
        onUploadComplete();
      }
    },
  });

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      await uploadFiles(acceptedFiles);
    },
    [uploadFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: uploading,
    noClick: true, // Don't trigger on click, only drag
  });

  return (
    <>
      {/* Hidden dropzone that only captures drag events */}
      <div
        {...getRootProps()}
        className={cn(
          'absolute inset-0 z-30 pointer-events-none',
          isDragActive && 'pointer-events-auto',
          className
        )}
      >
        <input {...getInputProps()} />
      </div>
      
      {/* Drag overlay - only visible when dragging */}
      {isDragActive && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm border-4 border-dashed border-primary rounded-lg m-2 pointer-events-none">
          <FileIcon className="h-20 w-20 mb-4 text-primary animate-bounce" />
          <p className="text-2xl font-semibold text-primary mb-2">Drop files here to upload</p>
          <p className="text-sm text-muted-foreground">Release to upload files</p>
        </div>
      )}
      
      {/* Upload progress indicator */}
      {uploading && (
        <div className="absolute top-4 right-4 z-40 bg-background border rounded-lg p-4 shadow-lg min-w-[300px] pointer-events-auto">
          <div className="flex items-center gap-3 mb-3">
            <Upload className="h-5 w-5 text-primary animate-bounce" />
            <p className="text-sm font-semibold">Uploading files...</p>
          </div>
          <Progress value={progress} className="h-2.5 mb-2" />
          <p className="text-xs text-muted-foreground text-center font-medium">{Math.round(progress)}%</p>
        </div>
      )}
    </>
  );
}
