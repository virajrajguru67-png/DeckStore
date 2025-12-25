import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type PermissionType = 'read' | 'write' | 'delete' | 'share' | 'admin';

export interface Permission {
  id: string;
  user_id: string;
  permission_type: PermissionType;
  created_at: string;
}

export const permissionService = {
  async getFolderPermissions(folderId: string): Promise<Permission[]> {
    const { data, error } = await supabase
      .from('folder_permissions')
      .select('id, user_id, permission_type, created_at')
      .eq('folder_id', folderId);

    if (error) {
      console.error('Error fetching permissions:', error);
      return [];
    }

    return (data as Permission[]) || [];
  },

  async getFilePermissions(fileId: string): Promise<Permission[]> {
    const { data, error } = await supabase
      .from('file_permissions')
      .select('id, user_id, permission_type, created_at')
      .eq('file_id', fileId);

    if (error) {
      console.error('Error fetching permissions:', error);
      return [];
    }

    return (data as Permission[]) || [];
  },

  async addFolderPermission(
    folderId: string,
    userId: string,
    permissionType: PermissionType
  ): Promise<boolean> {
    const { error } = await supabase
      .from('folder_permissions')
      .insert({
        folder_id: folderId,
        user_id: userId,
        permission_type: permissionType,
      });

    if (error) {
      console.error('Error adding permission:', error);
      toast.error('Failed to add permission');
      return false;
    }

    return true;
  },

  async addFilePermission(
    fileId: string,
    userId: string,
    permissionType: PermissionType
  ): Promise<boolean> {
    const { error } = await supabase
      .from('file_permissions')
      .insert({
        file_id: fileId,
        user_id: userId,
        permission_type: permissionType,
      });

    if (error) {
      console.error('Error adding permission:', error);
      toast.error('Failed to add permission');
      return false;
    }

    return true;
  },

  async removePermission(permissionId: string, type: 'folder' | 'file'): Promise<boolean> {
    const table = type === 'folder' ? 'folder_permissions' : 'file_permissions';
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', permissionId);

    if (error) {
      console.error('Error removing permission:', error);
      toast.error('Failed to remove permission');
      return false;
    }

    return true;
  },

  async updatePermission(
    permissionId: string,
    permissionType: PermissionType,
    type: 'folder' | 'file'
  ): Promise<boolean> {
    const table = type === 'folder' ? 'folder_permissions' : 'file_permissions';
    const { error } = await supabase
      .from(table)
      .update({ permission_type: permissionType })
      .eq('id', permissionId);

    if (error) {
      console.error('Error updating permission:', error);
      toast.error('Failed to update permission');
      return false;
    }

    return true;
  },
};


