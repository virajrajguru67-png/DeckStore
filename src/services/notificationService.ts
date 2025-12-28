import { supabase } from '@/integrations/supabase/client';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  resource_type: string | null;
  resource_id: string | null;
  read_at: string | null;
  created_at: string;
  metadata?: Record<string, any>;
}

export const notificationService = {
  async notify(
    userId: string,
    type: string,
    title: string,
    message: string,
    resourceType?: string,
    resourceId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const { error } = await (supabase.from('notifications') as any).insert({
        user_id: userId,
        type,
        title,
        message,
        resource_type: resourceType || null,
        resource_id: resourceId || null,
        metadata: metadata || {},
      });

      if (error) {
        console.error('Error creating notification:', error);
      }
    } catch (error) {
      console.error('Exception creating notification:', error);
    }
  },

  async getUnreadCount(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await (supabase.from('notifications') as any)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null);

      if (error) {
        console.error('Error fetching unread count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Exception fetching unread count:', error);
      return 0;
    }
  },

  async getNotifications(): Promise<Notification[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await (supabase.from('notifications') as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }

      return data as Notification[];
    } catch (error) {
      console.error('Exception fetching notifications:', error);
      return [];
    }
  },

  async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await (supabase.from('notifications') as any)
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
      }
    } catch (error) {
      console.error('Exception marking notification as read:', error);
    }
  },

  async markAllAsRead(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await (supabase.from('notifications') as any)
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null);

      if (error) {
        console.error('Error marking all notifications as read:', error);
      }
    } catch (error) {
      console.error('Exception marking all notifications as read:', error);
    }
  },

  /**
   * Notify all users who have access to a specific folder/resource
   * excluding the person who performed the action.
   */
  async notifyResourceCollaborators(
    resourceType: 'file' | 'folder',
    resourceId: string,
    creatorId: string,
    type: string,
    title: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // 1. Get the direct shares for this resource
      const { data: shares } = await (supabase
        .from('shares') as any)
        .select('shared_with')
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .eq('share_type', 'internal')
        .not('shared_with', 'is', null);

      const targetUserIds = new Set<string>();
      if (shares) {
        shares.forEach(s => {
          if (s.shared_with && s.shared_with !== creatorId) {
            targetUserIds.add(s.shared_with);
          }
        });
      }

      // 2. If it's a file, we also need to check its parent folder's collaborators
      if (resourceType === 'file') {
        const { data: file } = await (supabase.from('files') as any)
          .select('folder_id, owner_id')
          .eq('id', resourceId)
          .single();

        if (file && file.owner_id && file.owner_id !== creatorId) {
          targetUserIds.add(file.owner_id);
        }

        if (file && file.folder_id) {
          await this.addFolderCollaborators(file.folder_id, creatorId, targetUserIds);
        }
      } else if (resourceType === 'folder') {
        const { data: folder } = await (supabase.from('folders') as any)
          .select('parent_folder_id, owner_id')
          .eq('id', resourceId)
          .single();

        if (folder && folder.owner_id && folder.owner_id !== creatorId) {
          targetUserIds.add(folder.owner_id);
        }

        if (folder && folder.parent_folder_id) {
          await this.addFolderCollaborators(folder.parent_folder_id, creatorId, targetUserIds);
        }
      }

      // 3. Send notifications to all unique collaborators
      for (const userId of targetUserIds) {
        await this.notify(userId, type, title, message, resourceType, resourceId, metadata);
      }
    } catch (error) {
      console.error('Error notifying resource collaborators:', error);
    }
  },

  async addFolderCollaborators(folderId: string, excludeId: string, targetSets: Set<string>) {
    // Get direct shares for this folder
    const { data: shares } = await (supabase
      .from('shares') as any)
      .select('shared_with')
      .eq('resource_type', 'folder')
      .eq('resource_id', folderId)
      .eq('share_type', 'internal')
      .not('shared_with', 'is', null);

    if (shares) {
      shares.forEach(s => {
        if (s.shared_with && s.shared_with !== excludeId) {
          targetSets.add(s.shared_with);
        }
      });
    }

    // Recursively check parents for inheritance
    const { data: folder } = await (supabase.from('folders') as any)
      .select('parent_folder_id, owner_id')
      .eq('id', folderId)
      .single();

    if (folder && folder.owner_id && folder.owner_id !== excludeId) {
      targetSets.add(folder.owner_id);
    }

    if (folder && folder.parent_folder_id) {
      await this.addFolderCollaborators(folder.parent_folder_id, excludeId, targetSets);
    }
  }
};
