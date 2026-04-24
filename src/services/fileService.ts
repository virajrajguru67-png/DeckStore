import { apiService } from './apiService';
import { File, Folder } from '@/types/file';
import { toast } from 'sonner';
import { activityService } from './activityService';

export const fileService = {
  // --- FETCHING ---
  async getFiles(folderId: string | null = null): Promise<File[]> {
    try {
      const endpoint = folderId ? `/files?folderId=${folderId}` : '/files';
      return await apiService.get(endpoint);
    } catch (error) {
      console.error('getFiles error:', error);
      toast.error('Failed to fetch files');
      return [];
    }
  },

  async getFolders(parentFolderId: string | null = null): Promise<Folder[]> {
    try {
      const endpoint = parentFolderId ? `/folders?parentId=${parentFolderId}` : '/folders';
      return await apiService.get(endpoint);
    } catch (error) {
      console.error('getFolders error:', error);
      toast.error('Failed to fetch folders');
      return [];
    }
  },

  async getFileById(fileId: string): Promise<{ data: File | null; error: Error | null }> {
    try {
      const data = await apiService.get(`/files/${fileId}`);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async getFolderById(folderId: string): Promise<{ data: Folder | null; error: Error | null }> {
    try {
      const data = await apiService.get(`/folders/${folderId}`);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  // --- ACTIONS ---
  async createFolder(name: string, parentFolderId: string | null = null): Promise<Folder | null> {
    try {
      const data = await apiService.post('/folders', { 
        name, 
        parent_folder_id: parentFolderId,
        path: `/${name}` 
      });
      toast.success('Folder created');
      await activityService.logActivity('CREATE', 'FOLDER', data.id, { name });
      return data;
    } catch (error) {
      console.error('createFolder error:', error);
      toast.error('Failed to create folder');
      return null;
    }
  },

  async deleteFile(fileId: string): Promise<boolean> {
    try {
      await apiService.post(`/files/${fileId}/delete`, {});
      toast.success('File moved to trash');
      await activityService.logActivity('DELETE', 'FILE', fileId);
      return true;
    } catch (error) {
      console.error('deleteFile error:', error);
      toast.error('Failed to delete file');
      return false;
    }
  },

  async deleteFolder(folderId: string): Promise<boolean> {
    try {
      await apiService.post(`/folders/${folderId}/delete`, {});
      toast.success('Folder moved to trash');
      await activityService.logActivity('DELETE', 'FOLDER', folderId);
      return true;
    } catch (error) {
      console.error('deleteFolder error:', error);
      toast.error('Failed to delete folder');
      return false;
    }
  },

  async renameFile(fileId: string, newName: string): Promise<boolean> {
    try {
      await apiService.post(`/files/${fileId}/rename`, { name: newName });
      toast.success('File renamed');
      await activityService.logActivity('RENAME', 'FILE', fileId, { newName });
      return true;
    } catch (error) {
      console.error('renameFile error:', error);
      toast.error('Failed to rename file');
      return false;
    }
  },

  async renameFolder(folderId: string, newName: string): Promise<boolean> {
    try {
      await apiService.post(`/folders/${folderId}/rename`, { name: newName });
      toast.success('Folder renamed');
      await activityService.logActivity('RENAME', 'FOLDER', folderId, { newName });
      return true;
    } catch (error) {
      console.error('renameFolder error:', error);
      toast.error('Failed to rename folder');
      return false;
    }
  },

  async toggleFavoriteFile(fileId: string, isFavorite: boolean): Promise<boolean> {
    try {
      await apiService.post(`/files/${fileId}/favorite`, { isFavorite });
      toast.success(isFavorite ? 'Added to favorites' : 'Removed from favorites');
      return true;
    } catch (error) {
      console.error('toggleFavoriteFile error:', error);
      toast.error('Failed to update favorite');
      return false;
    }
  },

  async toggleFavoriteFolder(folderId: string, isFavorite: boolean): Promise<boolean> {
    try {
      await apiService.post(`/folders/${folderId}/favorite`, { isFavorite });
      toast.success(isFavorite ? 'Added to favorites' : 'Removed from favorites');
      return true;
    } catch (error) {
      console.error('toggleFavoriteFolder error:', error);
      toast.error('Failed to update favorite');
      return false;
    }
  },


  // --- RECYCLE BIN ---
  async getDeletedFiles(): Promise<File[]> {
    try {
      return await apiService.get('/recycle-bin/files');
    } catch (error) {
      console.error('getDeletedFiles error:', error);
      return [];
    }
  },

  async getDeletedFolders(): Promise<Folder[]> {
    try {
      return await apiService.get('/recycle-bin/folders');
    } catch (error) {
      console.error('getDeletedFolders error:', error);
      return [];
    }
  },

  async restoreFile(fileId: string): Promise<boolean> {
    try {
      await apiService.post(`/files/${fileId}/restore`, {});
      toast.success('File restored');
      await activityService.logActivity('RESTORE', 'FILE', fileId);
      return true;
    } catch (error) {
      console.error('restoreFile error:', error);
      return false;
    }
  },

  async restoreFolder(folderId: string): Promise<boolean> {
    try {
      await apiService.post(`/folders/${folderId}/restore`, {});
      toast.success('Folder restored');
      await activityService.logActivity('RESTORE', 'FOLDER', folderId);
      return true;
    } catch (error) {
      console.error('restoreFolder error:', error);
      return false;
    }
  },

  async permanentlyDeleteFile(fileId: string): Promise<boolean> {
    try {
      await apiService.post(`/files/${fileId}/permanent-delete`, {});
      return true;
    } catch (error) {
      console.error('permanentlyDeleteFile error:', error);
      return false;
    }
  },

  async permanentlyDeleteFolder(folderId: string): Promise<boolean> {
    try {
      await apiService.post(`/folders/${folderId}/permanent-delete`, {});
      return true;
    } catch (error) {
      console.error('permanentlyDeleteFolder error:', error);
      return false;
    }
  },


  async toggleHiddenFile(fileId: string, isHidden: boolean): Promise<boolean> {
    try {
      await apiService.post(`/files/${fileId}/hide`, { isHidden });
      toast.success(isHidden ? 'File hidden' : 'File unhidden');
      return true;
    } catch (error) {
      console.error('toggleHiddenFile error:', error);
      return false;
    }
  },

  async toggleHiddenFolder(folderId: string, isHidden: boolean): Promise<boolean> {
    try {
      await apiService.post(`/folders/${folderId}/hide`, { isHidden });
      toast.success(isHidden ? 'Folder hidden' : 'Folder unhidden');
      return true;
    } catch (error) {
      console.error('toggleHiddenFolder error:', error);
      return false;
    }
  },

  async copyFile(fileId: string, targetFolderId: string | null): Promise<boolean> {
    try {
      await apiService.post(`/files/${fileId}/copy`, { targetFolderId });
      toast.success('File copied');
      return true;
    } catch (error) {
      console.error('copyFile error:', error);
      return false;
    }
  },

  async getFolderContents(folderId: string): Promise<{ files: File[]; folders: Folder[] }> {
    try {
      const files = await this.getFiles(folderId);
      const folders = await this.getFolders(folderId);
      return { files, folders };
    } catch (error) {
      console.error('getFolderContents error:', error);
      return { files: [], folders: [] };
    }
  },

  async getFavoriteFiles(): Promise<File[]> {
    try {
      return await apiService.get('/files/favorites');
    } catch (error) {
      console.error('getFavoriteFiles error:', error);
      return [];
    }
  },

  async getFavoriteFolders(): Promise<Folder[]> {
    try {
      return await apiService.get('/folders/favorites');
    } catch (error) {
      console.error('getFavoriteFolders error:', error);
      return [];
    }
  },

  async getFolderCounts(folderId: string): Promise<{ files: number; folders: number }> {
    try {
      const response = await apiService.get(`/folders/${folderId}/counts`);
      return response;
    } catch (error) {
      console.error('getFolderCounts error:', error);
      return { files: 0, folders: 0 };
    }
  },

  async getUserProfile(userId: string): Promise<{ full_name: string; email: string } | null> {
    try {
      const response = await apiService.get(`/profiles/${userId}`);
      return response ? { full_name: response.full_name, email: response.email } : null;
    } catch (error) {
      console.error('getUserProfile error:', error);
      return null;
    }
  },

  async getAdminUserFiles(userId: string): Promise<File[]> {
    try {
      return await apiService.get(`/admin/files?userId=${userId}`);
    } catch (error) {
      console.error('getAdminUserFiles error:', error);
      return [];
    }
  },

  async getAdminUserFolders(userId: string): Promise<Folder[]> {
    try {
      return await apiService.get(`/admin/folders?userId=${userId}`);
    } catch (error) {
      console.error('getAdminUserFolders error:', error);
      return [];
    }
  },

  async moveFile(fileId: string, targetFolderId: string | null): Promise<boolean> {
    try {
      await apiService.post(`/files/${fileId}/move`, { targetFolderId });
      toast.success('File moved');
      await activityService.logActivity('MOVE', 'FILE', fileId, { targetFolderId });
      return true;
    } catch (error) {
      console.error('moveFile error:', error);
      return false;
    }
  },

  async moveFolder(folderId: string, targetFolderId: string | null): Promise<boolean> {
    try {
      await apiService.post(`/folders/${folderId}/move`, { targetFolderId });
      toast.success('Folder moved');
      await activityService.logActivity('MOVE', 'FOLDER', folderId, { targetFolderId });
      return true;
    } catch (error) {
      console.error('moveFolder error:', error);
      return false;
    }
  }
};
