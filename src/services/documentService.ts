import { supabase } from '@/integrations/supabase/client';
import { Document, CreateDocumentInput, UpdateDocumentInput } from '@/types/document';
import { activityService } from './activityService';

export const documentService = {
  async getDocuments(folderId?: string | null): Promise<Document[]> {
    try {
      let query = (supabase
        .from('documents') as any)
        .select('*')
        .is('deleted_at', null);

      // Handle folder_id filter - if folderId is provided, filter by it, otherwise get all documents (no folder filter)
      if (folderId !== undefined && folderId !== null) {
        query = query.eq('folder_id', folderId);
      }
      // If folderId is undefined or null, we don't filter by folder_id (get all documents)

      const { data, error } = await query.order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching documents:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        throw error;
      }

      return data || [];
    } catch (error: any) {
      // Check if table doesn't exist
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        console.error('Documents table does not exist. Please run the migration: 006_documents_table.sql');
        throw new Error('Documents table does not exist. Please run the database migration.');
      }
      throw error;
    }
  },

  async getDocumentById(id: string): Promise<Document | null> {
    const { data, error } = await (supabase
      .from('documents') as any)
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      console.error('Error fetching document:', error);
      throw error;
    }

    return data;
  },

  async createDocument(input: CreateDocumentInput): Promise<Document | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await (supabase
      .from('documents') as any)
      .insert({
        name: input.name,
        description: input.description || null,
        content: input.content || {},
        folder_id: input.folder_id || null,
        tags: input.tags || [],
        owner_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating document:', error);
      throw error;
    }

    // Log activity
    if (data) {
      await activityService.logActivity('create', 'document', data.id, {
        name: data.name
      });
    }

    return data;
  },

  async updateDocument(id: string, input: UpdateDocumentInput): Promise<Document | null> {
    const { data, error } = await (supabase
      .from('documents') as any)
      .update({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.content !== undefined && { content: input.content }),
        ...(input.folder_id !== undefined && { folder_id: input.folder_id }),
        ...(input.tags !== undefined && { tags: input.tags }),
        ...(input.is_favorite !== undefined && { is_favorite: input.is_favorite }),
        ...(input.is_hidden !== undefined && { is_hidden: input.is_hidden }),
        ...(input.ai_summary !== undefined && { ai_summary: input.ai_summary }),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating document:', error);
      throw error;
    }

    // Log activity
    if (data) {
      await activityService.logActivity('update', 'document', data.id, {
        name: data.name,
        updated_fields: Object.keys(input)
      });
    }

    return data;
  },

  async getFavoriteDocuments(): Promise<Document[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await (supabase
        .from('documents') as any)
        .select('*')
        .is('deleted_at', null)
        .eq('owner_id', user.id)
        .eq('is_favorite', true);

      if (error) {
        console.error('Error fetching favorite documents:', error);
        return [];
      }

      return (data as Document[]) || [];
    } catch (error) {
      console.error('Exception fetching favorite documents:', error);
      return [];
    }
  },

  async getDeletedDocuments(): Promise<Document[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await (supabase
        .from('documents') as any)
        .select('*')
        .not('deleted_at', 'is', null)
        .eq('owner_id', user.id)
        .order('deleted_at', { ascending: false });

      if (error) {
        console.error('Error fetching deleted documents:', error);
        return [];
      }

      return (data as Document[]) || [];
    } catch (error) {
      console.error('Exception fetching deleted documents:', error);
      return [];
    }
  },

  async restoreDocument(id: string): Promise<boolean> {
    try {
      const { error } = await (supabase
        .from('documents') as any)
        .update({ deleted_at: null })
        .eq('id', id);

      if (error) {
        console.error('Error restoring document:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Exception restoring document:', error);
      return false;
    }
  },

  async deleteDocument(id: string): Promise<{ success: boolean; error?: any }> {
    try {
      // We remove .select() because the row-level security policy for SELECT 
      // might restrict seeing rows where deleted_at IS NOT NULL, 
      // causing the update to fail when it tries to return the "hidden" row.
      // Get document name for audit logging before deleting
      const { data: doc } = await (supabase
        .from('documents') as any)
        .select('name')
        .eq('id', id)
        .single();

      const { error } = await (supabase
        .from('documents') as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Error deleting document:', error);
        return { success: false, error };
      }

      // Log activity
      await activityService.logActivity('delete', 'document', id, {
        name: doc?.name || 'Unknown Document'
      });

      return { success: true };
    } catch (error) {
      console.error('Exception deleting document:', error);
      return { success: false, error };
    }
  },

  async hardDeleteDocument(id: string): Promise<boolean> {
    try {
      const { error } = await (supabase
        .from('documents') as any)
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error hard deleting document:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Exception hard deleting document:', error);
      return false;
    }
  },

  async toggleFavorite(id: string, isFavorite: boolean): Promise<boolean> {
    const { error } = await (supabase
      .from('documents') as any)
      .update({ is_favorite: isFavorite })
      .eq('id', id);

    if (error) {
      console.error('Error toggling favorite:', error);
      return false;
    }

    return true;
  },

  async toggleHidden(id: string, isHidden: boolean): Promise<boolean> {
    const { error } = await (supabase
      .from('documents') as any)
      .update({ is_hidden: isHidden })
      .eq('id', id);

    if (error) {
      console.error('Error toggling hidden:', error);
      return false;
    }

    return true;
  },
};

