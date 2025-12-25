import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { FileUploadDropzone } from '@/components/file-operations/FileUploadDropzone';
import { MoveFileDialog } from '@/components/file-operations/MoveFileDialog';
import { RenameDialog } from '@/components/file-operations/RenameDialog';
import { NewFolderDialog } from '@/components/file-operations/NewFolderDialog';
import { ShareDialog } from '@/components/sharing/ShareDialog';
import { PreviewModal } from '@/components/preview/PreviewModal';
import { FileGridView } from '@/components/file-explorer/FileGridView';
import { FileListView } from '@/components/file-explorer/FileListView';
import { BreadcrumbNav } from '@/components/file-explorer/BreadcrumbNav';
import { useFiles } from '@/hooks/useFiles';
import { fileService } from '@/services/fileService';
import { Button } from '@/components/ui/button';
import { Folder, Plus, Upload, Grid3x3, List, ChevronLeft } from 'lucide-react';
import { File as FileType, Folder as FolderType } from '@/types/file';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

type ViewMode = 'grid' | 'list';

export default function Files() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const folderParam = searchParams.get('folder');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(folderParam || null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string | null; name: string }>>([]);
  const { files, folders, isLoading, refresh } = useFiles(currentFolderId, {
    refetchInterval: false, // Disable auto-refetch - use real-time subscriptions instead
  });
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id: string; name: string; type: 'file' | 'folder' } | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileType | null>(null);
  const skipUrlUpdate = useRef(false);

  // Initialize from URL on mount, then sync URL → state only when URL changes externally
  useEffect(() => {
    const folderParam = searchParams.get('folder');
    // Only update state from URL if they're different and we're not skipping
    if (!skipUrlUpdate.current && folderParam !== currentFolderId) {
      setCurrentFolderId(folderParam || null);
    }
    skipUrlUpdate.current = false;
  }, [searchParams]); // Only depend on searchParams

  // Update URL when folder changes (but skip the URL → state sync to prevent loop)
  useEffect(() => {
    const folderParam = searchParams.get('folder');
    if (currentFolderId !== folderParam) {
      skipUrlUpdate.current = true; // Skip URL → state sync on next render
      if (currentFolderId) {
        setSearchParams({ folder: currentFolderId }, { replace: true });
      } else {
        setSearchParams({}, { replace: true });
      }
    }
  }, [currentFolderId]); // Only depend on currentFolderId

  // Load breadcrumbs when folder changes (memoized to prevent unnecessary re-renders)
  useEffect(() => {
    let cancelled = false;

    const loadBreadcrumbs = async () => {
      if (!currentFolderId) {
        if (!cancelled) setBreadcrumbs([]);
        return;
      }

      const path: Array<{ id: string | null; name: string }> = [];
      let folderId = currentFolderId;

      while (folderId && !cancelled) {
        const { data: folder } = await supabase
          .from('folders')
          .select('id, name, parent_folder_id')
          .eq('id', folderId)
          .maybeSingle(); // Use maybeSingle to handle missing folders gracefully

        if (folder) {
          path.unshift({ id: folder.id, name: folder.name });
          folderId = folder.parent_folder_id;
        } else {
          break;
        }
      }

      if (!cancelled) {
        setBreadcrumbs(path);
      }
    };

    loadBreadcrumbs();

    return () => {
      cancelled = true;
    };
  }, [currentFolderId]);

  const handleFolderClick = (folder: FolderType) => {
    setCurrentFolderId(folder.id);
  };

  const handleNavigate = (folderId: string | null) => {
    setCurrentFolderId(folderId);
  };

  const handleBack = () => {
    if (breadcrumbs.length > 0) {
      const parentId = breadcrumbs[breadcrumbs.length - 2]?.id || null;
      setCurrentFolderId(parentId);
    } else {
      setCurrentFolderId(null);
    }
  };

  const handleCreateFolder = async (name: string) => {
    const folder = await fileService.createFolder(name, currentFolderId);
    if (folder) {
      toast.success('Folder created');
      refresh();
    } else {
      toast.error('Failed to create folder');
    }
  };

  const handleDelete = async (id: string, type: 'file' | 'folder') => {
    const success = type === 'file' 
      ? await fileService.deleteFile(id)
      : await fileService.deleteFolder(id);
    if (success) {
      toast.success(`${type === 'file' ? 'File' : 'Folder'} deleted`);
      refresh();
      // Also refresh Recycle Bin queries so deleted items appear there
      queryClient.invalidateQueries({ queryKey: ['deleted-files'] });
      queryClient.invalidateQueries({ queryKey: ['deleted-folders'] });
    }
  };

  const handleCopy = async (fileId: string) => {
    const copied = await fileService.copyFile(fileId, currentFolderId);
    if (copied) {
      toast.success('File copied');
      refresh();
    }
  };

  const handleFileAction = (action: string, item: FileType | FolderType, type: 'file' | 'folder') => {
    setSelectedItem({ id: item.id, name: item.name, type });
    
    switch (action) {
      case 'share':
        setShareDialogOpen(true);
        break;
      case 'rename':
        setRenameDialogOpen(true);
        break;
      case 'move':
        setMoveDialogOpen(true);
        break;
      case 'copy':
        if (type === 'file') {
          handleCopy(item.id);
        }
        break;
      case 'delete':
        handleDelete(item.id, type);
        break;
    }
  };

  const handleUploadClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length > 0) {
        // Use the upload service directly
        const { uploadService } = await import('@/services/uploadService');
        for (const file of files) {
          await uploadService.uploadFile(file, { folderId: currentFolderId });
        }
        refresh();
      }
    };
    input.click();
  };

  return (
    <DashboardLayout title="Files" subtitle="Manage your files and folders" fullHeight>
      <div className="flex flex-col h-full bg-background">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
          <div className="flex items-center gap-2">
            {currentFolderId && (
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setNewFolderDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Folder
              </Button>
              <Button variant="outline" size="sm" onClick={handleUploadClick}>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        <BreadcrumbNav
          items={breadcrumbs}
          onNavigate={handleNavigate}
        />

        {/* File Upload Dropzone (hidden, only for drag & drop) */}
        <div className="flex-1 overflow-auto relative">
          <FileUploadDropzone
            folderId={currentFolderId}
            onUploadComplete={refresh}
          />

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            </div>
          ) : folders.length === 0 && files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Folder className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No files or folders</p>
              <p className="text-sm text-muted-foreground mt-2">
                Upload files or create a folder to get started
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <FileGridView
              folders={folders}
              files={files}
              onFolderClick={handleFolderClick}
              onFileClick={(file) => {
                setSelectedFile(file);
                setPreviewOpen(true);
              }}
              onFileAction={handleFileAction}
            />
          ) : (
            <FileListView
              folders={folders}
              files={files}
              onFolderClick={handleFolderClick}
              onFileClick={(file) => {
                setSelectedFile(file);
                setPreviewOpen(true);
              }}
              onFileAction={handleFileAction}
            />
          )}
        </div>

        <NewFolderDialog
          open={newFolderDialogOpen}
          onOpenChange={setNewFolderDialogOpen}
          onCreate={handleCreateFolder}
        />

        <MoveFileDialog
          open={moveDialogOpen}
          onOpenChange={setMoveDialogOpen}
          fileId={selectedItem?.type === 'file' ? selectedItem.id : undefined}
          folderId={selectedItem?.type === 'folder' ? selectedItem.id : undefined}
          onMove={refresh}
        />

        <RenameDialog
          open={renameDialogOpen}
          onOpenChange={setRenameDialogOpen}
          fileId={selectedItem?.type === 'file' ? selectedItem.id : undefined}
          folderId={selectedItem?.type === 'folder' ? selectedItem.id : undefined}
          currentName={selectedItem?.name || ''}
          onRename={refresh}
        />

        <ShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          resourceType={selectedItem?.type || 'file'}
          resourceId={selectedItem?.id || ''}
        />

        <PreviewModal
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          file={selectedFile}
        />
      </div>
    </DashboardLayout>
  );
}
