import { apiService } from './apiService';
import { File, Folder } from '@/types/file';

export const searchService = {
  async searchAll(query: string): Promise<{ files: File[]; folders: Folder[]; documents: any[] }> {
    try {
      if (!query.trim()) return { files: [], folders: [], documents: [] };
      const results = await apiService.get(`/search-all?q=${encodeURIComponent(query)}`);
      // Validate structure to be absolutely sure

      if (results && typeof results === 'object' && !Array.isArray(results)) {
        return {
          files: results.files || [],
          folders: results.folders || [],
          documents: results.documents || []
        };
      }
      return { files: [], folders: [], documents: [] };
    } catch (error) {
      console.error('Search all error:', error);
      return { files: [], folders: [], documents: [] };
    }
  }
};

