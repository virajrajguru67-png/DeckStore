import { supabase } from '@/integrations/supabase/client';
import { File, Folder } from '@/types/file';

export interface SearchFilters {
  type?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minSize?: number;
  maxSize?: number;
  ownerId?: string;
  tags?: string[];
}

export const searchService = {
  async searchFiles(query: string, filters?: SearchFilters): Promise<File[]> {
    let searchQuery = supabase
      .from('files')
      .select('*')
      .is('deleted_at', null);

    // Text search on name
    if (query) {
      searchQuery = searchQuery.ilike('name', `%${query}%`);
    }

    // Apply filters
    if (filters?.type) {
      searchQuery = searchQuery.ilike('mime_type', `%${filters.type}%`);
    }

    if (filters?.dateFrom) {
      searchQuery = searchQuery.gte('created_at', filters.dateFrom.toISOString());
    }

    if (filters?.dateTo) {
      searchQuery = searchQuery.lte('created_at', filters.dateTo.toISOString());
    }

    if (filters?.minSize) {
      searchQuery = searchQuery.gte('size', filters.minSize);
    }

    if (filters?.maxSize) {
      searchQuery = searchQuery.lte('size', filters.maxSize);
    }

    if (filters?.ownerId) {
      searchQuery = searchQuery.eq('owner_id', filters.ownerId);
    }

    const { data, error } = await searchQuery.limit(100);

    if (error) {
      console.error('Error searching files:', error);
      return [];
    }

    return (data as File[]) || [];
  },

  async searchFolders(query: string): Promise<Folder[]> {
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .is('deleted_at', null)
      .ilike('name', `%${query}%`)
      .limit(100);

    if (error) {
      console.error('Error searching folders:', error);
      return [];
    }

    return (data as Folder[]) || [];
  },
};


