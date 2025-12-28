import { supabase } from '@/integrations/supabase/client';
import { File, Folder } from '@/types/file';
import { toast } from 'sonner';
import { activityService } from './activityService';
import { notificationService } from './notificationService';

export const fileService = {
  async getFiles(folderId: string | null = null): Promise<File[]> {
    console.log('getFiles: Fetching files for folderId:', folderId);
    const query = (supabase
      .from('files') as any)
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (folderId) {
      query.eq('folder_id', folderId);
      console.log('getFiles: Filtering by folder_id:', folderId);
    } else {
      query.is('folder_id', null);
      console.log('getFiles: Filtering for root files (folder_id IS NULL)');
    }

    const { data, error } = await query;

    if (error) {
      console.error('getFiles: Error fetching files:', {
        folderId,
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
      });
      toast.error('Failed to fetch files');
      return [];
    }

    console.log('getFiles: Successfully fetched files:', {
      folderId,
      fileCount: data?.length || 0,
      fileNames: (data as any[])?.map((f: any) => f.name) || [],
      fileDetails: (data as any[])?.map((f: any) => ({
        id: f.id,
        name: f.name,
        ownerId: f.owner_id,
        folderId: f.folder_id,
      })) || [],
    });

    // Filter out hidden files
    const visibleFiles = ((data as File[]) || []).filter(file => {
      return !file.metadata?.is_hidden;
    });

    return visibleFiles;
  },

  async getFolders(parentFolderId: string | null = null): Promise<Folder[]> {
    console.log('getFolders: Fetching folders for parentFolderId:', parentFolderId);
    const query = (supabase
      .from('folders') as any)
      .select('*')
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (parentFolderId) {
      query.eq('parent_folder_id', parentFolderId);
      console.log('getFolders: Filtering by parent_folder_id:', parentFolderId);
    } else {
      query.is('parent_folder_id', null);
      console.log('getFolders: Filtering for root folders (parent_folder_id IS NULL)');
    }

    const { data, error } = await query;

    if (error) {
      console.error('getFolders: Error fetching folders:', {
        parentFolderId,
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
      });
      toast.error('Failed to fetch folders');
      return [];
    }

    console.log('getFolders: Successfully fetched folders:', {
      parentFolderId,
      folderCount: data?.length || 0,
      folderNames: (data as any[])?.map((f: any) => f.name) || [],
    });

    // Filter out hidden folders
    const visibleFolders = ((data as Folder[]) || []).filter((folder: any) => {
      return !folder.metadata?.is_hidden;
    });

    return visibleFolders;
  },

  async createFolder(name: string, parentFolderId: string | null = null): Promise<Folder | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Generate path
    let path = `/${name}`;
    if (parentFolderId) {
      const { data: parentFolder } = await (supabase
        .from('folders') as any)
        .select('path')
        .eq('id', parentFolderId)
        .single();

      if (parentFolder && 'path' in parentFolder) {
        path = `${(parentFolder as { path: string }).path}/${name}`;
      }
    }

    const { data, error } = await (supabase
      .from('folders') as any)
      .insert({
        name,
        path,
        parent_folder_id: parentFolderId,
        owner_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
      return null;
    }

    // Log activity
    if (data) {
      await activityService.logActivity('create', 'folder', (data as any).id, {
        name: (data as any).name
      });
    }

    return data as Folder;
  },

  async deleteFile(fileId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('You must be logged in to delete files');
      return false;
    }

    // First check if user owns the file
    const { data: file, error: fetchError } = await (supabase
      .from('files') as any)
      .select('id, owner_id, name')
      .eq('id', fileId)
      .single();

    if (fetchError || !file) {
      console.error('Error fetching file:', fetchError);
      toast.error('File not found');
      return false;
    }

    if (!file || (file as any).owner_id !== user.id) {
      toast.error('You do not have permission to delete this file');
      return false;
    }

    // Verify ownership one more time before update
    const { data: verifyFile } = await (supabase
      .from('files') as any)
      .select('id, owner_id')
      .eq('id', fileId)
      .eq('owner_id', user.id)
      .single();

    if (!verifyFile) {
      console.error('Ownership verification failed before delete');
      toast.error('Cannot verify file ownership');
      return false;
    }

    // Try using the database function first (if it exists)
    // This bypasses RLS and is more reliable
    const { data: functionResult, error: functionError } = await (supabase.rpc as any)('soft_delete_file', {
      file_id_param: fileId
    });

    if (!functionError && functionResult) {
      return true;
    }

    // Fallback to direct update if function doesn't exist or fails
    // (This handles cases where the function hasn't been created yet)
    if (functionError && functionError.message?.includes('function') && functionError.message?.includes('does not exist')) {
      console.log('Function not found, using direct update');
    } else if (functionError) {
      console.error('Error calling soft_delete_file function:', functionError);
      toast.error(`Failed to delete file: ${functionError.message || 'Unknown error'}`);
      return false;
    }

    // Direct update as fallback
    const { error } = await (supabase
      .from('files') as any)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', fileId)
      .eq('owner_id', user.id); // Extra safety check

    if (error) {
      console.error('Error deleting file:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        userId: user.id,
        fileId: fileId,
      });
      toast.error(`Failed to delete file: ${error.message || 'Unknown error'}`);
      return false;
    }

    // Log activity
    await activityService.logActivity('delete', 'file', fileId, {
      name: (file as any)?.name || 'Unknown File'
    });

    // Notify collaborators
    await notificationService.notifyResourceCollaborators(
      'file',
      fileId,
      user.id,
      'file_deleted',
      'File Deleted',
      `${(file as any)?.name || 'A file'} was deleted by a collaborator.`,
      { name: (file as any)?.name }
    );

    return true;
  },

  async deleteFolder(folderId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('You must be logged in to delete folders');
      return false;
    }

    // First check if user owns the folder
    const { data: folder, error: fetchError } = await (supabase
      .from('folders') as any)
      .select('id, owner_id, name')
      .eq('id', folderId)
      .single();

    if (fetchError || !folder) {
      console.error('Error fetching folder:', fetchError);
      toast.error('Folder not found');
      return false;
    }

    if (!folder || (folder as any).owner_id !== user.id) {
      toast.error('You do not have permission to delete this folder');
      return false;
    }

    // Verify ownership one more time before update
    const { data: verifyFolder } = await (supabase
      .from('folders') as any)
      .select('id, owner_id')
      .eq('id', folderId)
      .eq('owner_id', user.id)
      .single();

    if (!verifyFolder) {
      console.error('Ownership verification failed before delete');
      toast.error('Cannot verify folder ownership');
      return false;
    }

    // Try using the database function first (if it exists)
    // This bypasses RLS and is more reliable
    const { data: functionResult, error: functionError } = await (supabase.rpc as any)('soft_delete_folder', {
      folder_id_param: folderId
    });

    if (!functionError && functionResult) {
      // Log activity
      await activityService.logActivity('delete', 'folder', folderId, {
        name: (folder as any)?.name || 'Unknown Folder'
      });
      return true;
    }

    // Fallback to direct update if function doesn't exist or fails
    // (This handles cases where the function hasn't been created yet)
    if (functionError && functionError.message?.includes('function') && functionError.message?.includes('does not exist')) {
      console.log('Function not found, using direct update');
    } else if (functionError) {
      console.error('Error calling soft_delete_folder function:', functionError);
      toast.error(`Failed to delete folder: ${functionError.message || 'Unknown error'}`);
      return false;
    }

    // Direct update as fallback
    const { error } = await (supabase
      .from('folders') as any)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', folderId)
      .eq('owner_id', user.id); // Extra safety check

    if (error) {
      console.error('Error deleting folder:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        userId: user.id,
        folderId: folderId,
      });
      toast.error(`Failed to delete folder: ${error.message || 'Unknown error'}`);
      return false;
    }

    // Log activity
    await activityService.logActivity('delete', 'folder', folderId, {
      name: (folder as any)?.name || 'Unknown Folder'
    });

    // Notify collaborators
    await notificationService.notifyResourceCollaborators(
      'folder',
      folderId,
      user.id,
      'folder_deleted',
      'Folder Deleted',
      `${(folder as any)?.name || 'A folder'} was deleted by a collaborator.`,
      { name: (folder as any)?.name }
    );

    return true;
  },

  async renameFile(fileId: string, newName: string): Promise<boolean> {
    const { error } = await (supabase
      .from('files') as any)
      .update({ name: newName })
      .eq('id', fileId);

    if (error) {
      console.error('Error renaming file:', error);
      toast.error('Failed to rename file');
      return false;
    }

    // Log activity
    await activityService.logActivity('rename', 'file', fileId, {
      new_name: newName
    });

    // Notify collaborators
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await notificationService.notifyResourceCollaborators(
        'file',
        fileId,
        user.id,
        'file_renamed',
        'File Renamed',
        `A file was renamed to "${newName}" by a collaborator.`,
        { new_name: newName }
      );
    }

    return true;
  },

  async renameFolder(folderId: string, newName: string): Promise<boolean> {
    // Update folder name and path
    const { data: folder } = await (supabase
      .from('folders') as any)
      .select('path, parent_folder_id')
      .eq('id', folderId)
      .single();

    if (!folder) return false;

    const oldPath = (folder as any).path as string;
    const pathParts = oldPath.split('/');
    pathParts[pathParts.length - 1] = newName;
    const newPath = pathParts.join('/');

    const { error } = await (supabase
      .from('folders') as any)
      .update({ name: newName, path: newPath })
      .eq('id', folderId);

    if (error) {
      console.error('Error renaming folder:', error);
      toast.error('Failed to rename folder');
      return false;
    }

    // Update paths for child folders and files (would need recursive update)

    // Log activity
    await activityService.logActivity('rename', 'folder', folderId, {
      new_name: newName,
      old_path: oldPath
    });

    // Notify collaborators
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await notificationService.notifyResourceCollaborators(
        'folder',
        folderId,
        user.id,
        'folder_renamed',
        'Folder Renamed',
        `A folder was renamed to "${newName}" by a collaborator.`,
        { new_name: newName }
      );
    }

    return true;
  },

  async moveFile(fileId: string, targetFolderId: string | null): Promise<boolean> {
    const { data: file } = await (supabase
      .from('files') as any)
      .select('name, folder_id')
      .eq('id', fileId)
      .single();

    if (!file) return false;

    const fileName = (file as any).name as string;
    let newPath = `/${fileName}`;
    if (targetFolderId) {
      const { data: targetFolder } = await (supabase
        .from('folders') as any)
        .select('path')
        .eq('id', targetFolderId)
        .single();

      if (targetFolder && 'path' in targetFolder) {
        newPath = `${(targetFolder as { path: string }).path}/${fileName}`;
      }
    }

    const { error } = await (supabase
      .from('files') as any)
      .update({
        folder_id: targetFolderId,
        parent_path: targetFolderId ? null : '/',
        path: newPath,
      })
      .eq('id', fileId);

    if (error) {
      console.error('Error moving file:', error);
      toast.error('Failed to move file');
      return false;
    }

    // Log activity
    await activityService.logActivity('move', 'file', fileId, {
      target_folder_id: targetFolderId,
      new_path: newPath
    });

    // Notify collaborators
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await notificationService.notifyResourceCollaborators(
        'file',
        fileId,
        user.id,
        'file_moved',
        'File Moved',
        'A collaborator moved a file you have access to.',
        { target_folder_id: targetFolderId }
      );
    }

    return true;
  },

  async moveFolder(folderId: string, targetFolderId: string | null): Promise<boolean> {
    const { data: folder } = await (supabase
      .from('folders') as any)
      .select('name, path')
      .eq('id', folderId)
      .single();

    if (!folder) return false;

    const folderName = (folder as any).name as string;
    let newPath = `/${folderName}`;
    if (targetFolderId) {
      const { data: targetFolder } = await (supabase
        .from('folders') as any)
        .select('path')
        .eq('id', targetFolderId)
        .single();

      if (targetFolder && 'path' in targetFolder) {
        newPath = `${(targetFolder as { path: string }).path}/${folderName}`;
      }
    }

    const { error } = await (supabase
      .from('folders') as any)
      .update({
        parent_folder_id: targetFolderId,
        path: newPath,
      })
      .eq('id', folderId);

    if (error) {
      console.error('Error moving folder:', error);
      toast.error('Failed to move folder');
      return false;
    }

    return true;
  },

  async copyFile(fileId: string, targetFolderId: string | null): Promise<File | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: sourceFile } = await (supabase
      .from('files') as any)
      .select('*')
      .eq('id', fileId)
      .single();

    if (!sourceFile) return null;

    const storageKey = (sourceFile as any).storage_key as string;
    // Download original file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('files')
      .download(storageKey);

    if (downloadError || !fileData) {
      console.error('Error downloading file for copy:', downloadError);
      toast.error('Failed to copy file');
      return null;
    }

    // Upload as new file
    const timestamp = Date.now();
    const sourceFileName = (sourceFile as any).name as string;
    const sanitizedName = sourceFileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const newStorageKey = `${user.id}/${timestamp}_copy_${sanitizedName}`;

    const blob = fileData instanceof Blob ? fileData : await (fileData as any).blob();
    const { error: uploadError } = await supabase.storage
      .from('files')
      .upload(newStorageKey, blob);

    if (uploadError) {
      console.error('Error uploading copied file:', uploadError);
      toast.error('Failed to copy file');
      return null;
    }

    // Create new file record
    let newPath = `/${sourceFileName}`;
    if (targetFolderId) {
      const { data: targetFolder } = await (supabase
        .from('folders') as any)
        .select('path')
        .eq('id', targetFolderId)
        .single();

      if (targetFolder && 'path' in targetFolder) {
        newPath = `${(targetFolder as { path: string }).path}/${sourceFileName}`;
      }
    }

    const sourceFileData = sourceFile as any;
    const { data: newFile, error: dbError } = await (supabase
      .from('files') as any)
      .insert({
        name: sourceFileName,
        path: newPath,
        mime_type: sourceFileData.mime_type,
        size: sourceFileData.size,
        file_hash: sourceFileData.file_hash,
        folder_id: targetFolderId,
        owner_id: user.id,
        parent_path: targetFolderId ? null : '/',
        storage_key: newStorageKey,
        version_number: 1,
        metadata: sourceFileData.metadata || {},
      } as any)
      .select()
      .single();

    if (dbError) {
      console.error('Error creating file copy:', dbError);
      await supabase.storage.from('files').remove([newStorageKey]);
      toast.error('Failed to copy file');
      return null;
    }

    return newFile as File;
  },

  async getDeletedFiles(): Promise<File[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

    const { data, error } = await (supabase
      .from('files') as any)
      .select('*')
      .eq('owner_id', user.id) // Only show files owned by current user
      .not('deleted_at', 'is', null) // Must have deleted_at set
      .gte('deleted_at', thirtyDaysAgoISO) // Only show files deleted in last 30 days
      .order('deleted_at', { ascending: false });

    if (error) {
      console.error('Error fetching deleted files:', error);
      return [];
    }

    return (data as File[]) || [];
  },

  async getDeletedFolders(): Promise<Folder[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

    const { data, error } = await (supabase
      .from('folders') as any)
      .select('*')
      .eq('owner_id', user.id) // Only show folders owned by current user
      .not('deleted_at', 'is', null) // Must have deleted_at set
      .gte('deleted_at', thirtyDaysAgoISO) // Only show folders deleted in last 30 days
      .order('deleted_at', { ascending: false });

    if (error) {
      console.error('Error fetching deleted folders:', error);
      return [];
    }

    return (data as Folder[]) || [];
  },

  async restoreFile(fileId: string): Promise<boolean> {
    const { error } = await (supabase
      .from('files') as any)
      .update({ deleted_at: null })
      .eq('id', fileId);

    if (error) {
      console.error('Error restoring file:', error);
      toast.error('Failed to restore file');
      return false;
    }

    // Log activity
    await activityService.logActivity('restore', 'file', fileId);

    return true;
  },

  async restoreFolder(folderId: string): Promise<boolean> {
    const { error } = await (supabase
      .from('folders') as any)
      .update({ deleted_at: null })
      .eq('id', folderId);

    if (error) {
      console.error('Error restoring folder:', error);
      toast.error('Failed to restore folder');
      return false;
    }

    // Log activity
    await activityService.logActivity('restore', 'folder', folderId);

    return true;
  },

  async permanentlyDeleteFile(fileId: string): Promise<boolean> {
    try {
      // First, try using a database function if it exists (bypasses RLS)
      const { data: functionResult, error: functionError } = await (supabase.rpc as any)('permanently_delete_file', {
        file_id_param: fileId
      });

      if (!functionError && functionResult) {
        // Function exists and succeeded
        return true;
      }

      // Fallback to direct delete if function doesn't exist
      // Get file to delete storage
      const { data: file } = await (supabase
        .from('files') as any)
        .select('storage_key, owner_id')
        .eq('id', fileId)
        .single();

      if (!file) {
        console.error('File not found:', fileId);
        toast.error('File not found');
        return false;
      }

      // Check ownership
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || (file as any).owner_id !== user.id) {
        console.error('Permission denied: You do not own this file');
        toast.error('Permission denied: You do not own this file');
        return false;
      }

      // Delete from storage first
      if ((file as any).storage_key) {
        const { error: storageError } = await supabase.storage
          .from('files')
          .remove([(file as any).storage_key as string]);

        if (storageError) {
          console.warn('Error deleting file from storage:', storageError);
          // Continue with database delete even if storage delete fails
        }
      }

      // Delete from database
      const { error } = await (supabase
        .from('files') as any)
        .delete()
        .eq('id', fileId)
        .eq('owner_id', user.id); // Extra safety check

      if (error) {
        console.error('Error permanently deleting file:', error);
        toast.error('Failed to permanently delete file: ' + (error.message || 'Unknown error'));
        return false;
      }

      // Log activity
      await activityService.logActivity('delete', 'file', fileId, {
        permanent: true
      });

      return true;
    } catch (error) {
      console.error('Error in permanentlyDeleteFile:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to permanently delete file');
      return false;
    }
  },

  async permanentlyDeleteFolder(folderId: string): Promise<boolean> {
    try {
      // First, try using a database function if it exists (bypasses RLS)
      const { data: functionResult, error: functionError } = await (supabase.rpc as any)('permanently_delete_folder', {
        folder_id_param: folderId
      });

      if (!functionError && functionResult) {
        // Function exists and succeeded
        return true;
      }

      // Fallback to direct delete if function doesn't exist
      // Get folder to check ownership
      const { data: folder } = await (supabase
        .from('folders') as any)
        .select('owner_id')
        .eq('id', folderId)
        .single();

      if (!folder) {
        console.error('Folder not found:', folderId);
        toast.error('Folder not found');
        return false;
      }

      // Check ownership
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || (folder as any).owner_id !== user.id) {
        console.error('Permission denied: You do not own this folder');
        toast.error('Permission denied: You do not own this folder');
        return false;
      }

      // Note: In a production system, you might want to also delete all files and subfolders
      // For now, we'll just delete the folder record
      // Files and subfolders will be orphaned (you may want to handle this differently)

      const { error } = await (supabase
        .from('folders') as any)
        .delete()
        .eq('id', folderId)
        .eq('owner_id', user.id); // Extra safety check

      if (error) {
        console.error('Error permanently deleting folder:', error);
        toast.error('Failed to permanently delete folder: ' + (error.message || 'Unknown error'));
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in permanentlyDeleteFolder:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to permanently delete folder');
      return false;
    }
  },

  async getFolderCounts(folderId: string): Promise<{ files: number; folders: number }> {
    try {
      const [filesResult, foldersResult] = await Promise.all([
        (supabase
          .from('files') as any)
          .select('id', { count: 'exact', head: true })
          .eq('folder_id', folderId)
          .is('deleted_at', null),
        (supabase
          .from('folders') as any)
          .select('id', { count: 'exact', head: true })
          .eq('parent_folder_id', folderId)
          .is('deleted_at', null),
      ]);

      return {
        files: filesResult.count || 0,
        folders: foldersResult.count || 0,
      };
    } catch (error) {
      console.error('Error fetching folder counts:', error);
      return { files: 0, folders: 0 };
    }
  },

  async getUserProfile(userId: string): Promise<{ full_name: string; email: string } | null> {
    try {
      const { data, error } = await (supabase
        .from('profiles') as any)
        .select('full_name, email')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      const profileData = data as any;
      return {
        full_name: profileData.full_name || profileData.email,
        email: profileData.email,
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  },

  async getFileById(fileId: string): Promise<{ data: File | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('id', fileId)
        .is('deleted_at', null)
        .single();

      if (error) {
        return { data: null, error: error as Error };
      }
      return { data: data as File, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async getFolderById(folderId: string): Promise<{ data: Folder | null; error: Error | null }> {
    try {
      console.log('getFolderById: Fetching folder', folderId);
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('id', folderId)
        .is('deleted_at', null)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 rows gracefully

      if (error) {
        console.error('getFolderById: Error fetching folder:', {
          folderId,
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint,
        });
        return { data: null, error: error as Error };
      }

      if (!data) {
        console.warn('getFolderById: No folder found for ID (may be RLS blocked or deleted):', folderId);
        return { data: null, error: new Error('Folder not found or access denied') };
      }

      console.log('getFolderById: Folder fetched successfully:', {
        folderId: (data as any).id,
        folderName: (data as any).name,
        ownerId: (data as any).owner_id,
      });

      return { data: data as Folder, error: null };
    } catch (error) {
      console.error('getFolderById: Exception caught:', error);
      return { data: null, error: error as Error };
    }
  },

  async toggleFavoriteFile(fileId: string, isFavorite: boolean): Promise<boolean> {
    try {
      const { data: file } = await (supabase
        .from('files') as any)
        .select('metadata')
        .eq('id', fileId)
        .single();

      if (!file) {
        toast.error('File not found');
        return false;
      }

      const metadata = (file as any).metadata || {};
      metadata.is_favorite = isFavorite;

      const { error } = await (supabase
        .from('files') as any)
        .update({ metadata })
        .eq('id', fileId);

      if (error) {
        console.error('Error toggling favorite:', error);
        toast.error('Failed to update favorite');
        return false;
      }

      toast.success(isFavorite ? 'Added to favorites' : 'Removed from favorites');
      return true;
    } catch (error) {
      console.error('Exception toggling favorite:', error);
      toast.error('Failed to update favorite');
      return false;
    }
  },

  async toggleFavoriteFolder(folderId: string, isFavorite: boolean): Promise<boolean> {
    try {
      // For folders, we'll use a metadata JSONB column if it exists, or create a favorites table
      // For now, let's check if folders table has metadata column
      const { data: folder } = await (supabase
        .from('folders') as any)
        .select('*')
        .eq('id', folderId)
        .single();

      if (!folder) {
        toast.error('Folder not found');
        return false;
      }

      // Since folders don't have metadata, we'll need to add it via migration
      // For now, let's use a workaround: store in a user_favorites table or add metadata column
      // Let's add metadata support by updating the folder with a metadata JSONB field
      // First, let's try to update with metadata (if column exists)
      const metadata = (folder as any).metadata || {};
      metadata.is_favorite = isFavorite;

      const { error } = await (supabase
        .from('folders') as any)
        .update({ metadata: metadata as any })
        .eq('id', folderId);

      if (error) {
        // If metadata column doesn't exist, we'll need to create a favorites table
        // For now, let's just show an error
        console.error('Error toggling favorite (folder may not support metadata):', error);
        toast.error('Folder favorites not yet supported. Please add metadata column to folders table.');
        return false;
      }

      toast.success(isFavorite ? 'Added to favorites' : 'Removed from favorites');
      return true;
    } catch (error) {
      console.error('Exception toggling favorite:', error);
      toast.error('Failed to update favorite');
      return false;
    }
  },

  async getFavoriteFiles(): Promise<File[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await (supabase
        .from('files') as any)
        .select('*')
        .is('deleted_at', null)
        .eq('owner_id', user.id)
        .contains('metadata', { is_favorite: true });

      if (error) {
        console.error('Error fetching favorite files:', error);
        return [];
      }

      return (data as File[]) || [];
    } catch (error) {
      console.error('Exception fetching favorite files:', error);
      return [];
    }
  },

  async getFavoriteFolders(): Promise<Folder[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Try to fetch folders with favorite metadata
      const { data, error } = await (supabase
        .from('folders') as any)
        .select('*')
        .is('deleted_at', null)
        .eq('owner_id', user.id)
        .contains('metadata', { is_favorite: true });

      if (error) {
        // If metadata column doesn't exist, return empty array
        if (error.code === '42703') {
          return [];
        }
        console.error('Error fetching favorite folders:', error);
        return [];
      }

      return (data as Folder[]) || [];
    } catch (error) {
      console.error('Exception fetching favorite folders:', error);
      return [];
    }
  },

  async toggleHiddenFile(fileId: string, isHidden: boolean): Promise<boolean> {
    try {
      const { data: file } = await (supabase
        .from('files') as any)
        .select('metadata')
        .eq('id', fileId)
        .single();

      if (!file) {
        toast.error('File not found');
        return false;
      }

      const metadata = (file as any).metadata || {};
      metadata.is_hidden = isHidden;

      const { error } = await (supabase
        .from('files') as any)
        .update({ metadata })
        .eq('id', fileId);

      if (error) {
        console.error('Error toggling hidden:', error);
        toast.error('Failed to update hidden status');
        return false;
      }

      toast.success(isHidden ? 'File moved to hidden' : 'File removed from hidden');
      return true;
    } catch (error) {
      console.error('Exception toggling hidden:', error);
      toast.error('Failed to update hidden status');
      return false;
    }
  },

  async toggleHiddenFolder(folderId: string, isHidden: boolean): Promise<boolean> {
    try {
      const { data: folder } = await (supabase
        .from('folders') as any)
        .select('*')
        .eq('id', folderId)
        .single();

      if (!folder) {
        toast.error('Folder not found');
        return false;
      }

      const metadata = (folder as any).metadata || {};
      metadata.is_hidden = isHidden;

      const { error } = await (supabase
        .from('folders') as any)
        .update({ metadata: metadata as any })
        .eq('id', folderId);

      if (error) {
        console.error('Error toggling hidden:', error);
        toast.error('Failed to update hidden status');
        return false;
      }

      toast.success(isHidden ? 'Folder moved to hidden' : 'Folder removed from hidden');
      return true;
    } catch (error) {
      console.error('Exception toggling hidden:', error);
      toast.error('Failed to update hidden status');
      return false;
    }
  },

  async getHiddenFiles(): Promise<File[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await (supabase
        .from('files') as any)
        .select('*')
        .is('deleted_at', null)
        .eq('owner_id', user.id)
        .contains('metadata', { is_hidden: true });

      if (error) {
        console.error('Error fetching hidden files:', error);
        return [];
      }

      return (data as File[]) || [];
    } catch (error) {
      console.error('Exception fetching hidden files:', error);
      return [];
    }
  },

  async getHiddenFolders(): Promise<Folder[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await (supabase
        .from('folders') as any)
        .select('*')
        .is('deleted_at', null)
        .eq('owner_id', user.id)
        .contains('metadata', { is_hidden: true });

      if (error) {
        if (error.code === '42703') {
          return [];
        }
        console.error('Error fetching hidden folders:', error);
        return [];
      }

      return (data as Folder[]) || [];
    } catch (error) {
      console.error('Exception fetching hidden folders:', error);
      return [];
    }
  },
};

