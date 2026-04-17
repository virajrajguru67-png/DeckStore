import { apiService } from './apiService';
import { CreateDocumentInput, UpdateDocumentInput } from '@/types/document';
import { toast } from 'sonner';

export const documentService = {
  async extractText(fileId: string): Promise<string> {
    try {
      const data = await apiService.post(`/documents/${fileId}/extract`, {});
      return data.text;
    } catch (error) {
      console.error('Error extracting text:', error);
      return '';
    }
  },

  async updateMetadata(fileId: string, metadata: Record<string, any>): Promise<void> {
    try {
      await apiService.post(`/documents/${fileId}/metadata`, { metadata });
    } catch (error) {
      console.error('Error updating document metadata:', error);
    }
  },

  async getDocuments(): Promise<any[]> {
    try {
      return await apiService.get('/documents');
    } catch (error) {
      console.error('getDocuments error:', error);
      return [];
    }
  },

  async getDocumentById(id: string): Promise<any | null> {
    try {
      return await apiService.get(`/documents/${id}`);
    } catch (error) {
      console.error('getDocumentById error:', error);
      return null;
    }
  },

  async getFavoriteDocuments(): Promise<any[]> {
    try {
      return await apiService.get('/documents/favorites');
    } catch (error) {
      console.error('getFavoriteDocuments error:', error);
      return [];
    }
  },

  async deleteDocument(id: string): Promise<{ success: boolean; error?: Error }> {
    try {
      await apiService.post(`/documents/${id}/delete`, {});
      toast.success('Document deleted');
      return { success: true };
    } catch (error) {
      console.error('deleteDocument error:', error);
      const err = error instanceof Error ? error : new Error('Failed to delete document');
      return { success: false, error: err };
    }
  },

  async createDocument(input: CreateDocumentInput): Promise<any> {
    try {
      const data = await apiService.post('/documents', input);
      toast.success('Document created successfully');
      return data;
    } catch (error) {
      console.error('createDocument error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create document';
      toast.error(errorMessage);
      throw error;
    }
  },

  async updateDocument(id: string, input: UpdateDocumentInput): Promise<any> {
    try {
      const data = await apiService.post(`/documents/${id}`, input);
      toast.success('Document updated successfully');
      return data;
    } catch (error) {
      console.error('updateDocument error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update document';
      toast.error(errorMessage);
      throw error;
    }
  },

  async toggleFavorite(id: string, isFavorite: boolean): Promise<boolean> {
    try {
      await this.updateDocument(id, { is_favorite: isFavorite });
      return true;
    } catch (error) {
      console.error('toggleFavorite error:', error);
      return false;
    }
  },

  async toggleHidden(id: string, isHidden: boolean): Promise<boolean> {
    try {
      await this.updateDocument(id, { is_hidden: isHidden });
      return true;
    } catch (error) {
      console.error('toggleHidden error:', error);
      return false;
    }
  },

  async getDeletedDocuments(): Promise<any[]> {
    try {
      return await apiService.get('/recycle-bin/documents');
    } catch (error) {
      console.error('getDeletedDocuments error:', error);
      return [];
    }
  },

  async restoreDocument(id: string): Promise<boolean> {
    try {
      await apiService.post(`/documents/${id}/restore`, {});
      return true;
    } catch (error) {
      console.error('restoreDocument error:', error);
      return false;
    }
  },

  async hardDeleteDocument(id: string): Promise<boolean> {
    try {
      await apiService.post(`/documents/${id}/hard-delete`, {});
      return true;
    } catch (error) {
      console.error('hardDeleteDocument error:', error);
      return false;
    }
  }
};

