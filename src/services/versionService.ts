import { apiService } from './apiService';

export interface FileVersion {
  id: string;
  file_id: string;
  version_number: number;
  storage_key: string;
  size: number;
  created_at: string;
  created_by: string;
  comment?: string;
}

export const versionService = {
  async getVersions(fileId: string): Promise<FileVersion[]> {
    try {
      return await apiService.get(`/files/${fileId}/versions`);
    } catch (error) {
      console.error('Error fetching versions:', error);
      return [];
    }
  },

  async createVersion(fileId: string, file: File, comment?: string): Promise<FileVersion | null> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (comment) formData.append('comment', comment);
      
      return await apiService.upload(`/files/${fileId}/versions`, formData);
    } catch (error) {
      console.error('Error creating version:', error);
      return null;
    }
  }
};
