import { supabase } from '@/integrations/supabase/client';
import { FileVersion } from '@/types/file';
import { toast } from 'sonner';
import { uploadService } from './uploadService';

export const versionService = {
  async getVersions(fileId: string): Promise<FileVersion[]> {
    const { data, error } = await supabase
      .from('file_versions')
      .select('*')
      .eq('file_id', fileId)
      .order('version_number', { ascending: false });

    if (error) {
      console.error('Error fetching versions:', error);
      return [];
    }

    return (data as FileVersion[]) || [];
  },

  async createVersion(
    fileId: string,
    file: globalThis.File,
    changeDescription?: string
  ): Promise<FileVersion | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Get current file info
    const { data: currentFile } = await supabase
      .from('files')
      .select('version_number, storage_key, name')
      .eq('id', fileId)
      .single();

    if (!currentFile) return null;

    // Copy current version to versions bucket
    const { data: oldFileData } = await supabase.storage
      .from('files')
      .download(currentFile.storage_key);

    if (oldFileData) {
      const timestamp = Date.now();
      const versionStorageKey = `versions/${fileId}/${currentFile.version_number}_${timestamp}`;
      
      const blob = await oldFileData.blob();
      await supabase.storage
        .from('versions')
        .upload(versionStorageKey, blob);
    }

    // Upload new version
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const newStorageKey = `${user.id}/${timestamp}_${sanitizedName}`;

    const { error: uploadError } = await supabase.storage
      .from('files')
      .upload(newStorageKey, file, { upsert: true });

    if (uploadError) {
      console.error('Error uploading new version:', uploadError);
      toast.error('Failed to create version');
      return null;
    }

    // Create version record
    const newVersionNumber = currentFile.version_number + 1;
    const versionStorageKey = `versions/${fileId}/${newVersionNumber}_${timestamp}`;

    // Save old version to versions bucket
    if (oldFileData) {
      const blob = await oldFileData.blob();
      await supabase.storage
        .from('versions')
        .upload(versionStorageKey, blob);
    }

    const { data: version, error: versionError } = await supabase
      .from('file_versions')
      .insert({
        file_id: fileId,
        version_number: currentFile.version_number,
        storage_key: versionStorageKey,
        size: file.size,
        file_hash: `${timestamp}_${file.size}`,
        created_by: user.id,
        change_description: changeDescription || null,
      })
      .select()
      .single();

    if (versionError) {
      console.error('Error creating version record:', versionError);
      return null;
    }

    // Update file record
    await supabase
      .from('files')
      .update({
        storage_key: newStorageKey,
        version_number: newVersionNumber,
        current_version_id: version.id,
        size: file.size,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fileId);

    return version as FileVersion;
  },

  async restoreVersion(fileId: string, versionNumber: number): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Get version to restore
    const { data: version } = await supabase
      .from('file_versions')
      .select('*')
      .eq('file_id', fileId)
      .eq('version_number', versionNumber)
      .single();

    if (!version) return false;

    // Download version file
    const { data: versionFile } = await supabase.storage
      .from('versions')
      .download(version.storage_key);

    if (!versionFile) {
      toast.error('Version file not found');
      return false;
    }

    // Get current file info
    const { data: currentFile } = await supabase
      .from('files')
      .select('storage_key, version_number')
      .eq('id', fileId)
      .single();

    if (!currentFile) return false;

    // Create new version from current before restoring
    if (versionFile) {
      const blob = await versionFile.blob();
      const timestamp = Date.now();
      const currentVersionKey = `versions/${fileId}/${currentFile.version_number}_${timestamp}`;
      await supabase.storage
        .from('versions')
        .upload(currentVersionKey, blob);
    }

    // Upload restored version to main storage
    const blob = await versionFile.blob();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const timestamp = Date.now();
    const newStorageKey = `${currentUser?.id}/${timestamp}_restored`;

    const { error: uploadError } = await supabase.storage
      .from('files')
      .upload(newStorageKey, blob, { upsert: true });

    if (uploadError) {
      console.error('Error restoring version:', uploadError);
      toast.error('Failed to restore version');
      return false;
    }

    // Update file
    const { error: updateError } = await supabase
      .from('files')
      .update({
        storage_key: newStorageKey,
        size: version.size,
        version_number: currentFile.version_number + 1,
      })
      .eq('id', fileId);

    if (updateError) {
      console.error('Error updating file:', updateError);
      return false;
    }

    toast.success('Version restored');
    return true;
  },
};


