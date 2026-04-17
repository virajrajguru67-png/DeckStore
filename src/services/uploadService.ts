import { apiService } from './apiService';
import { File } from '@/types/file';
import { toast } from 'sonner';
import { activityService } from './activityService';

interface UploadOptions {
  folderId?: string | null;
  onProgress?: (progress: number) => void;
}

export const uploadService = {
  async uploadFile(
    file: globalThis.File,
    options: UploadOptions = {}
  ): Promise<File | null> {
    try {
      if (options.onProgress) options.onProgress(10);

      const formData = new FormData();
      formData.append('file', file);
      if (options.folderId) {
        formData.append('folder_id', options.folderId);
      }

      // Use a fixed path or let the backend handle it
      formData.append('path', '/');

      if (options.onProgress) options.onProgress(30);

      const fileRecord = await apiService.upload('/files/upload', formData);

      if (options.onProgress) options.onProgress(100);

      await activityService.logActivity('upload', 'file', fileRecord.id, {
        name: fileRecord.name,
        size: file.size,
        mime_type: file.type
      });

      toast.success('File uploaded successfully');
      return fileRecord as File;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('An error occurred during upload');
      return null;
    }
  },

  async getDownloadUrl(storageKey: string): Promise<string | null> {
    // Our local server serves files from /uploads/{storageKey}
    // We get the token and build the URL
    const token = localStorage.getItem('token');
    const API_BASE = import.meta.env.VITE_API_URL.replace('/api', '');
    return `${API_BASE}/uploads/${storageKey}?token=${token}`;
  },

  async updateStorageQuota(userId: string, fileSize: number): Promise<void> {
    try {
      await apiService.post('/storage/quota/update', { userId, fileSize });
    } catch (error) {
      console.error('Error updating storage quota:', error);
    }
  }
};
