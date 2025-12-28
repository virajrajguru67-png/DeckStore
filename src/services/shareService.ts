import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { notificationService } from './notificationService';

export type ShareType = 'internal' | 'external_link';
export type AccessLevel = 'view' | 'download' | 'edit';

export interface Share {
  id: string;
  resource_type: 'file' | 'folder';
  resource_id: string;
  share_type: ShareType;
  shared_by: string;
  shared_with: string | null; // Recipient user ID (for internal shares)
  access_level: AccessLevel;
  password_hash: string | null;
  expires_at: string | null;
  link_token: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export const shareService = {
  async createInternalShare(
    resourceType: 'file' | 'folder',
    resourceId: string,
    userId: string,
    accessLevel: AccessLevel
  ): Promise<Share | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Resolve userId - could be email or UUID
    let targetUserId: string | null = null;

    // Check if it's a UUID (36 characters with dashes)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(userId)) {
      targetUserId = userId;
    } else {
      // Assume it's an email, look up user by email
      const { data: profile } = await (supabase
        .from('profiles') as any)
        .select('id')
        .eq('email', userId.trim().toLowerCase())
        .single();

      if (profile) {
        targetUserId = (profile as any).id;
      } else {
        // Try to find in auth.users via admin API (if available)
        // For now, show error
        toast.error(`User not found: ${userId}`);
        return null;
      }
    }

    if (!targetUserId) {
      toast.error(`User not found: ${userId}`);
      return null;
    }

    console.log('📤 Creating internal share:', {
      resourceType,
      resourceId,
      sharedBy: user.id,
      sharedWith: targetUserId,
      accessLevel,
      userEmail: user.email,
      targetUserInput: userId,
    });

    // Map access_level to permission_type
    // view -> read, download -> read, edit -> write
    let permissionType: 'read' | 'write' | 'delete' | 'share' | 'admin' = 'read';
    if (accessLevel === 'edit') {
      permissionType = 'write';
    } else if (accessLevel === 'view' || accessLevel === 'download') {
      permissionType = 'read';
    }

    // Create the share record with shared_with (recipient) field
    const { data: shareData, error: shareError } = await (supabase
      .from('shares') as any)
      .insert({
        resource_type: resourceType,
        resource_id: resourceId,
        share_type: 'internal',
        shared_by: user.id,
        shared_with: targetUserId, // Store recipient ID directly
        access_level: accessLevel,
      })
      .select()
      .single();

    if (shareError) {
      console.error('Error creating share:', shareError);
      toast.error('Failed to create share');
      return null;
    }

    // Create or update the permission record
    // Handle duplicate permissions gracefully (if user already has access)
    if (resourceType === 'file') {
      // Check if permission already exists
      const { data: existingPerm } = await supabase
        .from('file_permissions')
        .select('id, permission_type')
        .eq('file_id', resourceId)
        .eq('user_id', targetUserId)
        .eq('permission_type', permissionType)
        .maybeSingle();

      if (!existingPerm) {
        // Only insert if permission doesn't exist
        const { error: permError } = await supabase
          .from('file_permissions')
          .insert({
            file_id: resourceId,
            user_id: targetUserId,
            permission_type: permissionType,
          } as any);

        if (permError) {
          // If it's a duplicate key error, that's okay - permission already exists
          if (permError.code === '23505') {
            console.log('File permission already exists, continuing with share');
          } else {
            console.error('Error creating file permission:', permError);
            console.error('Permission error details:', {
              code: permError.code,
              message: permError.message,
              details: permError.details,
              hint: permError.hint,
            });
            // Delete the share if permission creation failed
            if (shareData) {
              await (supabase.from('shares') as any).delete().eq('id', (shareData as any).id);
            }
            toast.error(`Failed to share file: ${permError.message || 'Permission creation failed'}`);
            return null;
          }
        }
      } else {
        console.log('File permission already exists, continuing with share');
      }
    } else {
      // Check if permission already exists
      const { data: existingPerm } = await supabase
        .from('folder_permissions')
        .select('id, permission_type')
        .eq('folder_id', resourceId)
        .eq('user_id', targetUserId)
        .eq('permission_type', permissionType)
        .maybeSingle();

      if (!existingPerm) {
        // Only insert if permission doesn't exist
        const { error: permError } = await supabase
          .from('folder_permissions')
          .insert({
            folder_id: resourceId,
            user_id: targetUserId,
            permission_type: permissionType,
          } as any);

        if (permError) {
          // If it's a duplicate key error, that's okay - permission already exists
          if (permError.code === '23505') {
            console.log('Folder permission already exists, continuing with share');
          } else {
            console.error('Error creating folder permission:', permError);
            console.error('Permission error details:', {
              code: permError.code,
              message: permError.message,
              details: permError.details,
              hint: permError.hint,
            });
            // Delete the share if permission creation failed
            if (shareData) {
              await (supabase.from('shares') as any).delete().eq('id', (shareData as any).id);
            }
            toast.error(`Failed to share folder: ${permError.message || 'Permission creation failed'}`);
            return null;
          }
        }
      } else {
        console.log('Folder permission already exists, continuing with share');
      }
    }

    console.log('✅ Share and permission created successfully!', {
      shareId: shareData ? (shareData as any).id : 'unknown',
      sharedBy: user.id,
      sharedWith: targetUserId,
      resourceType,
      resourceId,
    });

    // SEND NOTIFICATION to the recipient
    const { data: sharerProfile } = await (supabase.from('profiles') as any).select('full_name').eq('id', user.id).single();
    const sharerName = sharerProfile?.full_name || user.email || 'Someone';

    // Get resource name for the notification
    let resourceName = 'a resource';
    if (resourceType === 'file') {
      const { data: res } = await (supabase.from('files') as any).select('name').eq('id', resourceId).single();
      if (res) resourceName = res.name;
    } else {
      const { data: res } = await (supabase.from('folders') as any).select('name').eq('id', resourceId).single();
      if (res) resourceName = res.name;
    }

    await notificationService.notify(
      targetUserId,
      'share_received',
      'New Item Shared',
      `${sharerName} shared ${resourceType} "${resourceName}" with you.`,
      resourceType,
      resourceId,
      { shared_by: user.id, sharer_name: sharerName }
    );

    return shareData as any as Share;
  },

  async createExternalShare(
    resourceType: 'file' | 'folder',
    resourceId: string,
    accessLevel: AccessLevel,
    options?: {
      password?: string;
      expiresAt?: Date;
    }
  ): Promise<Share | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Generate secure token
    const linkToken = `${resourceId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const shareData: any = {
      resource_type: resourceType,
      resource_id: resourceId,
      share_type: 'external_link',
      shared_by: user.id,
      access_level: accessLevel,
      link_token: linkToken,
    };

    if (options?.password) {
      // In production, hash the password
      shareData.password_hash = options.password;
    }

    if (options?.expiresAt) {
      shareData.expires_at = options.expiresAt.toISOString();
    }

    const { data, error } = await (supabase
      .from('shares') as any)
      .insert(shareData)
      .select()
      .single();

    if (error) {
      console.error('Error creating external share:', error);
      toast.error('Failed to create share link');
      return null;
    }

    return data as any as Share;
  },

  async getShares(resourceType: 'file' | 'folder', resourceId: string): Promise<Share[]> {
    const { data, error } = await (supabase
      .from('shares') as any)
      .select('*')
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId);

    if (error) {
      console.error('Error fetching shares:', error);
      return [];
    }

    return (data as Share[]) || [];
  },

  async getUserShares(): Promise<Share[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await (supabase
      .from('shares') as any)
      .select('*')
      .eq('shared_by', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user shares:', error);
      return [];
    }

    return (data as Share[]) || [];
  },

  async getSharedWithMe(): Promise<Share[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('getSharedWithMe: No user found');
      return [];
    }

    console.log('getSharedWithMe: Fetching shares for user', user.id);

    // PRIMARY METHOD: Query shares directly by shared_with (recipient)
    // Use a more complex query to fetch folder/file names directly via RPC or separate queries
    // First, get the shares
    const { data: directShares, error: directSharesError } = await (supabase
      .from('shares') as any)
      .select('*')
      .eq('shared_with', user.id) // Direct query by recipient
      .eq('share_type', 'internal'); // Only internal shares

    if (directSharesError) {
      console.error('Error fetching direct shares:', directSharesError);
    } else {
      console.log('Direct shares found (by shared_with):', directShares?.length || 0);
    }

    // Fetch folder and file names for the shares
    // We'll do this in batches to avoid RLS issues
    if (directShares && directShares.length > 0) {
      const folderIds = directShares
        .filter(s => (s as any).resource_type === 'folder')
        .map(s => (s as any).resource_id);
      const fileIds = directShares
        .filter(s => (s as any).resource_type === 'file')
        .map(s => (s as any).resource_id);

      // Fetch folder names using RPC function (bypasses RLS)
      if (folderIds.length > 0) {
        for (const folderId of folderIds) {
          try {
            const { data: folderName, error: rpcError } = await (supabase.rpc as any)(
              'get_shared_folder_name',
              {
                folder_id_param: folderId,
                user_id_param: user.id,
              }
            );

            if (!rpcError && folderName) {
              const share = directShares.find(s => (s as any).resource_type === 'folder' && (s as any).resource_id === folderId);
              if (share) {
                (share as any).resource_name = folderName;
              }
            } else if (rpcError) {
              console.error('Error fetching folder name via RPC:', rpcError);
              // Fallback to direct query
              const { data: folder, error: folderError } = await supabase
                .from('folders')
                .select('id, name')
                .eq('id', folderId)
                .is('deleted_at', null)
                .single();

              if (!folderError && folder) {
                const share = directShares.find(s => (s as any).resource_type === 'folder' && (s as any).resource_id === folderId);
                if (share) {
                  (share as any).resource_name = (folder as any).name;
                }
              }
            }
          } catch (error) {
            console.error('Exception fetching folder name:', error);
          }
        }
      }

      // Fetch file names using RPC function (bypasses RLS)
      if (fileIds.length > 0) {
        for (const fileId of fileIds) {
          try {
            const { data: fileName, error: rpcError } = await (supabase.rpc as any)(
              'get_shared_file_name',
              {
                file_id_param: fileId,
                user_id_param: user.id,
              }
            );

            if (!rpcError && fileName) {
              const share = directShares.find(s => (s as any).resource_type === 'file' && (s as any).resource_id === fileId);
              if (share) {
                (share as any).resource_name = fileName;
              }
            } else if (rpcError) {
              console.error('Error fetching file name via RPC:', rpcError);
              // Fallback to direct query
              const { data: file, error: fileError } = await supabase
                .from('files')
                .select('id, name')
                .eq('id', fileId)
                .is('deleted_at', null)
                .single();

              if (!fileError && file) {
                const share = directShares.find(s => (s as any).resource_type === 'file' && (s as any).resource_id === fileId);
                if (share) {
                  (share as any).resource_name = (file as any).name;
                }
              }
            }
          } catch (error) {
            console.error('Exception fetching file name:', error);
          }
        }
      }
    }

    // FALLBACK METHOD: Query by permissions (for backward compatibility with old shares)
    // This handles shares created before shared_with column was added
    const { data: filePerms, error: filePermsError } = await (supabase
      .from('file_permissions') as any)
      .select('file_id')
      .eq('user_id', user.id);

    if (filePermsError) {
      console.error('Error fetching file permissions:', filePermsError);
    }

    const { data: folderPerms, error: folderPermsError } = await (supabase
      .from('folder_permissions') as any)
      .select('folder_id')
      .eq('user_id', user.id);

    if (folderPermsError) {
      console.error('Error fetching folder permissions:', folderPermsError);
    }

    const fileIds = filePerms?.map(p => (p as any).file_id) || [];
    const folderIds = folderPerms?.map(p => (p as any).folder_id) || [];

    // Fetch shares for files and folders via permissions (fallback)
    const fallbackShares: Share[] = [];

    if (fileIds.length > 0) {
      const { data: fileShares } = await (supabase
        .from('shares') as any)
        .select('*')
        .eq('resource_type', 'file')
        .in('resource_id', fileIds)
        .is('shared_with', null); // Only get shares without shared_with (old shares)

      if (fileShares) {
        console.log('Fallback file shares found:', fileShares.length);
        // Filter out any shares that are already in directShares by resource_id
        const newFileShares = fileShares.filter(fs =>
          !directShares?.some(ds =>
            (ds as any).resource_type === 'file' &&
            (ds as any).resource_id === (fs as any).resource_id
          )
        );
        console.log('New fallback file shares (after filtering):', newFileShares.length);
        fallbackShares.push(...(newFileShares as Share[]));
      }
    }

    if (folderIds.length > 0) {
      const { data: folderShares } = await (supabase
        .from('shares') as any)
        .select('*')
        .eq('resource_type', 'folder')
        .in('resource_id', folderIds)
        .is('shared_with', null); // Only get shares without shared_with (old shares)

      if (folderShares) {
        console.log('Fallback folder shares found:', folderShares.length);
        // Filter out any shares that are already in directShares by resource_id
        const newFolderShares = folderShares.filter(fs =>
          !directShares?.some(ds =>
            (ds as any).resource_type === 'folder' &&
            (ds as any).resource_id === (fs as any).resource_id
          )
        );
        console.log('New fallback folder shares (after filtering):', newFolderShares.length);
        fallbackShares.push(...(newFolderShares as Share[]));
      }
    }

    // Combine direct shares and fallback shares, remove duplicates
    // Deduplicate by resource_id + resource_type (not just share id) to avoid showing same resource twice
    const allShares = [
      ...(directShares as Share[] || []),
      ...fallbackShares
    ];

    // First, deduplicate by share id
    const uniqueById = allShares.filter((share, index, self) =>
      index === self.findIndex(s => s.id === share.id)
    );

    // Then, deduplicate by resource_id + resource_type (in case multiple shares exist for same resource)
    // Keep the most recent share for each resource
    const uniqueByResource = uniqueById.filter((share, index, self) => {
      const resourceKey = `${share.resource_type}_${share.resource_id}`;
      const firstIndex = self.findIndex(s =>
        `${s.resource_type}_${s.resource_id}` === resourceKey
      );
      // Keep the first occurrence (or most recent if we sort by created_at)
      return index === firstIndex;
    });

    // Sort by created_at descending to show most recent first
    uniqueByResource.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    console.log('Total unique shares found:', uniqueByResource.length);
    console.log('  - Direct shares (by shared_with):', directShares?.length || 0);
    console.log('  - Fallback shares (by permissions):', fallbackShares.length);
    console.log('  - After deduplication by resource:', uniqueByResource.length);

    return uniqueByResource;
  },

  async revokeShare(shareId: string): Promise<boolean> {
    const { error } = await (supabase
      .from('shares') as any)
      .delete()
      .eq('id', shareId);

    if (error) {
      console.error('Error revoking share:', error);
      toast.error('Failed to revoke share');
      return false;
    }

    toast.success('Share revoked');
    return true;
  },

  async accessShare(linkToken: string, password?: string): Promise<Share | null> {
    const { data: share, error } = await supabase
      .from('shares')
      .select('*')
      .eq('link_token', linkToken)
      .single();

    if (error || !share) {
      toast.error('Invalid share link');
      return null;
    }

    // Check expiration
    if ((share as any).expires_at && new Date((share as any).expires_at) < new Date()) {
      toast.error('Share link has expired');
      return null;
    }

    // Check password
    if ((share as any).password_hash && password !== (share as any).password_hash) {
      toast.error('Incorrect password');
      return null;
    }

    // Update view count
    await (supabase
      .from('shares') as any)
      .update({ view_count: (share as any).view_count + 1 })
      .eq('id', (share as any).id);

    // Log access
    const { data: { user } } = await supabase.auth.getUser();
    await (supabase
      .from('share_access_logs') as any)
      .insert({
        share_id: (share as any).id,
        accessed_by: user?.id || null,
        access_type: 'view',
      });

    return share as any as Share;
  },

  async logEngagement(
    shareId: string,
    type: 'view' | 'download' | 'preview',
    metadata: any = {}
  ): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await (supabase
      .from('share_access_logs') as any)
      .insert({
        share_id: shareId,
        accessed_by: user?.id || null,
        access_type: type,
        engagement_metadata: metadata,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error logging engagement:', error);
      return null;
    }

    return (data as any).id;
  },

  async updateEngagement(
    logId: string,
    durationSeconds: number,
    pageViews: any[] = [],
    metadata: any = {}
  ): Promise<boolean> {
    const { error } = await (supabase
      .from('share_access_logs') as any)
      .update({
        duration_seconds: durationSeconds,
        page_views: pageViews,
        engagement_metadata: metadata,
      })
      .eq('id', logId);

    if (error) {
      console.error('Error updating engagement:', error);
      return false;
    }

    return true;
  },
};


