import { useState, useCallback } from 'react';
import { uploadService } from '@/services/uploadService';
import { File } from '@/types/file';
import { toast } from 'sonner';

interface UseFileUploadOptions {
  folderId?: string | null;
  onUploadComplete?: (file: File) => void;
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = useCallback(
    async (file: globalThis.File) => {
      setUploading(true);
      setProgress(0);

      let progressInterval: NodeJS.Timeout | null = null;
      let hasRealProgress = false;

      try {
        // Start with a fallback progress simulation that increments slowly
        // This ensures users see progress even for very fast uploads
        progressInterval = setInterval(() => {
          setProgress((prev) => {
            // Only simulate progress if we haven't received real progress
            if (!hasRealProgress && prev < 90) {
              return Math.min(prev + 2, 90);
            }
            return prev;
          });
        }, 100);

        const uploadedFile = await uploadService.uploadFile(file, {
          folderId: options.folderId,
          onProgress: (progressValue) => {
            hasRealProgress = true;
            // Update progress with real values from Supabase
            setProgress(Math.min(progressValue, 95)); // Cap at 95% until database operations complete
          },
        });

        // Clear the interval once upload service completes
        if (progressInterval) {
          clearInterval(progressInterval);
        }

        // Show 100% completion briefly before finishing
        setProgress(100);
        
        // Small delay to show 100% completion
        await new Promise(resolve => setTimeout(resolve, 300));

        if (uploadedFile && options.onUploadComplete) {
          options.onUploadComplete(uploadedFile);
        }

        return uploadedFile;
      } catch (error) {
        console.error('Upload error:', error);
        toast.error('Failed to upload file');
        return null;
      } finally {
        if (progressInterval) {
          clearInterval(progressInterval);
        }
        // Keep progress visible for a moment, then reset
        setTimeout(() => {
          setUploading(false);
          setTimeout(() => setProgress(0), 500);
        }, 500);
      }
    },
    [options.folderId, options.onUploadComplete]
  );

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const results: (File | null)[] = [];

      for (const file of fileArray) {
        const result = await uploadFile(file);
        results.push(result);
      }

      return results;
    },
    [uploadFile]
  );

  return {
    uploadFile,
    uploadFiles,
    uploading,
    progress,
  };
}


