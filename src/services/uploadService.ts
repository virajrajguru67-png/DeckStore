import { supabase } from '@/integrations/supabase/client';
import { File } from '@/types/file';
import { toast } from 'sonner';
import { activityService } from './activityService';
import { notificationService } from './notificationService';

interface UploadOptions {
  folderId?: string | null;
  onProgress?: (progress: number) => void;
}

export const uploadService = {
  async uploadFile(
    file: globalThis.File,
    options: UploadOptions = {}
  ): Promise<File | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('You must be logged in to upload files');
      return null;
    }

    try {
      // Generate storage path
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storageKey = `${user.id}/${timestamp}_${sanitizedName}`;

      // Upload to Supabase Storage with progress tracking
      // Set initial progress
      if (options.onProgress) {
        options.onProgress(5);
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('files')
        .upload(storageKey, file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            // Calculate progress percentage
            // Supabase progress: { loaded: number, total: number }
            const progressPercent = progress.total > 0
              ? (progress.loaded / progress.total) * 90 // Use 90% for upload, remaining for DB operations
              : 50;

            if (options.onProgress) {
              options.onProgress(progressPercent);
            }
          },
        } as any);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Failed to upload file', {
          description: uploadError.message || 'Please check your storage bucket configuration'
        });
        return null;
      }

      // Generate file hash (simplified - in production, compute actual hash)
      const fileHash = `${timestamp}_${file.size}`;

      // Calculate path
      // Try to get folder path, but don't fail if we can't (RLS might block it)
      let path = `/${file.name}`;
      if (options.folderId) {
        const { data: folder, error: folderError } = await (supabase
          .from('folders') as any)
          .select('path')
          .eq('id', options.folderId)
          .is('deleted_at', null)
          .maybeSingle();

        if (folderError) {
          console.warn('uploadFile: Could not fetch folder path (may be RLS blocked):', {
            folderId: options.folderId,
            error: folderError.message,
          });
          // Continue with default path - the INSERT policy will verify permissions
        } else if (folder) {
          path = `${folder.path}/${file.name}`;
          console.log('uploadFile: Using folder path:', path);
        } else {
          console.warn('uploadFile: Folder not found, using default path');
        }
      }

      // Create file record in database
      // The INSERT policy will check if user has write permission on the folder
      console.log('uploadFile: Creating file record:', {
        name: file.name,
        folderId: options.folderId,
        ownerId: user.id,
        storageKey,
        path,
      });

      const { data: fileRecord, error: dbError } = await (supabase
        .from('files') as any)
        .insert({
          name: file.name,
          path,
          mime_type: file.type,
          size: file.size,
          file_hash: fileHash,
          folder_id: options.folderId || null,
          owner_id: user.id,
          parent_path: options.folderId ? null : '/',
          storage_key: storageKey,
          version_number: 1,
        })
        .select()
        .single();

      if (dbError) {
        console.error('uploadFile: Database error:', {
          errorCode: dbError.code,
          errorMessage: dbError.message,
          errorDetails: dbError.details,
          errorHint: dbError.hint,
          folderId: options.folderId,
          ownerId: user.id,
        });

        // If it's an RLS error, provide more helpful message
        if (dbError.code === '42501') {
          if (options.folderId) {
            toast.error('Permission denied', {
              description: 'You do not have permission to upload files to this folder. You need write or admin access.'
            });
          } else {
            toast.error('Permission denied', {
              description: 'You do not have permission to upload files.'
            });
          }
        } else if (dbError.message?.includes('folder') || dbError.message?.includes('not found')) {
          toast.error('Folder not found', {
            description: 'The folder you are trying to upload to may not exist or you may not have access to it.'
          });
        } else {
          toast.error('Failed to save file record', {
            description: dbError.message || 'Please check your database configuration'
          });
        }

        // Cleanup uploaded file
        await supabase.storage.from('files').remove([storageKey]).catch(() => {
          // Ignore cleanup errors
        });
        return null;
      }

      console.log('uploadFile: File record created successfully:', {
        fileId: fileRecord?.id,
        fileName: fileRecord?.name,
      });

      // Update storage quota
      await this.updateStorageQuota(user.id, file.size);

      // Log activity
      if (fileRecord) {
        await activityService.logActivity('upload', 'file', fileRecord.id, {
          name: fileRecord.name,
          size: fileRecord.size,
          mime_type: fileRecord.mime_type
        });

        // Notify collaborators if uploaded to a shared folder
        if (options.folderId) {
          const { data: profile } = await (supabase.from('profiles') as any).select('full_name').eq('id', user.id).single();
          const userName = profile?.full_name || user.email || 'Someone';

          await notificationService.notifyResourceCollaborators(
            'folder',
            options.folderId,
            user.id,
            'file_added',
            'New File Added',
            `${userName} added "${fileRecord.name}" to a shared folder.`,
            { file_id: fileRecord.id, file_name: fileRecord.name }
          );
        }
      }

      toast.success('File uploaded successfully');
      return fileRecord as File;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('An error occurred during upload');
      return null;
    }
  },

  async updateStorageQuota(userId: string, fileSize: number): Promise<void> {
    try {
      const { data: quota, error: fetchError } = await (supabase
        .from('storage_quotas') as any)
        .select('used_bytes')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching quota:', fetchError);
        return;
      }

      if (quota) {
        const { error: updateError } = await (supabase
          .from('storage_quotas') as any)
          .update({ used_bytes: (quota as any).used_bytes + fileSize })
          .eq('user_id', userId);

        if (updateError) {
          console.error('Error updating quota:', updateError);
        }
      } else {
        const { error: insertError } = await (supabase
          .from('storage_quotas') as any)
          .insert({
            user_id: userId,
            used_bytes: fileSize,
            total_quota_bytes: 10737418240, // 10GB default
          });

        if (insertError) {
          console.error('Error creating quota:', insertError);
        }
      }
    } catch (error) {
      console.error('Error updating storage quota:', error);
      // Don't fail upload if quota update fails
    }
  },

  async getDownloadUrl(storageKey: string): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('getDownloadUrl: User not authenticated');
        return null;
      }

      console.log('getDownloadUrl: Creating signed URL', {
        storageKey,
        userId: user.id,
        storageKeyFormat: storageKey.includes('/') ? '✅ Has user_id prefix' : '❌ Missing user_id prefix',
      });

      // Verify storage_key format before attempting to create signed URL
      if (!storageKey.includes('/')) {
        console.error('getDownloadUrl: Invalid storage_key format. Expected format: {user_id}/{timestamp}_{filename}');
        console.error('getDownloadUrl: Actual storage_key:', storageKey);
        console.error('getDownloadUrl: This usually means the file was uploaded incorrectly or storage_key is corrupted');
        return null;
      }

      const { data, error } = await supabase.storage
        .from('files')
        .createSignedUrl(storageKey, 3600); // 1 hour expiry

      if (error) {
        console.error('getDownloadUrl: Error creating signed URL:', {
          errorCode: (error as any).statusCode || (error as any).error || 'unknown',
          errorMessage: error.message,
          errorName: error.name,
          storageKey,
          userId: user.id,
          storageKeyParts: storageKey.split('/'),
          fullError: error,
        });

        // Check if it's a permission error
        if (error.message?.includes('permission') || error.message?.includes('403') || error.message?.includes('denied') || (error as any).statusCode === 403) {
          console.error('getDownloadUrl: ❌ Permission denied (403)');
          console.error('getDownloadUrl: User ID:', user.id);
          console.error('getDownloadUrl: Storage key:', storageKey);
          console.error('getDownloadUrl: Possible causes:');
          console.error('  1. Storage RLS policy not set up correctly');
          console.error('  2. User does not have file_permissions or folder_permissions');
          console.error('  3. Storage key format mismatch');
          console.error('getDownloadUrl: Run DIAGNOSE_FILE_PREVIEW.sql to check permissions');
        }

        // Check if file doesn't exist
        const errorMsg = error.message?.toLowerCase() || '';
        if (errorMsg.includes('not found') || errorMsg.includes('404') || errorMsg.includes('object not found') || (error as any).statusCode === 404) {
          console.error('getDownloadUrl: ❌ File not found in storage (404)');
          console.error('getDownloadUrl: Storage key being used:', storageKey);
          console.error('getDownloadUrl: Possible causes:');
          console.error('  1. File was deleted from storage');
          console.error('  2. Storage key in database does not match actual file path');
          console.error('  3. File was never uploaded successfully');
        }

        return null;
      }

      if (!data?.signedUrl) {
        console.error('getDownloadUrl: No signed URL returned for storage key:', {
          storageKey,
          data,
          userId: user.id,
        });
        return null;
      }

      console.log('getDownloadUrl: Successfully created signed URL');
      return data.signedUrl;
    } catch (error: any) {
      console.error('getDownloadUrl: Exception creating download URL:', {
        error: error?.message || error,
        errorType: error?.name,
        storageKey,
      });
      return null;
    }
  },
};

