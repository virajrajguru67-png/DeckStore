import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { cn } from '@/lib/utils';
import { FileUploadDropzone } from '@/components/file-operations/FileUploadDropzone';
import { MoveFileDialog } from '@/components/file-operations/MoveFileDialog';
import { RenameDialog } from '@/components/file-operations/RenameDialog';
import { NewFolderDialog } from '@/components/file-operations/NewFolderDialog';
import { ShareDialog } from '@/components/sharing/ShareDialog';
import { PreviewModal } from '@/components/preview/PreviewModal';
import { FileGridView } from '@/components/file-explorer/FileGridView';
import { FileListView } from '@/components/file-explorer/FileListView';
import { BreadcrumbNav } from '@/components/file-explorer/BreadcrumbNav';
import { DeleteConfirmationDialog } from '@/components/ui/DeleteConfirmationDialog';
import { useFiles } from '@/hooks/useFiles';
import { fileService } from '@/services/fileService';
import { Button } from '@/components/ui/button';
import { Folder, Plus, Upload, Grid3x3, List, ChevronLeft, Trash2 } from 'lucide-react';
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
  const { files, folders, isLoading, refresh } = useFiles(currentFolderId);
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id: string; name: string; type: 'file' | 'folder' } | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileType | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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
        // Use type casting to handle the Supabase specific response correctly
        const { data: folder } = await supabase
          .from('folders')
          .select('id, name, parent_folder_id')
          .eq('id', folderId)
          .maybeSingle();

        if (folder) {
          // Explicitly cast folder to any to avoid strict type checking issues with maybeSingle
          const typedFolder = folder as any;
          path.unshift({ id: typedFolder.id, name: typedFolder.name });
          folderId = typedFolder.parent_folder_id;
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

  const handleFileAction = async (action: string, item: FileType | FolderType, type: 'file' | 'folder') => {
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
      case 'hide':
        const success = type === 'file'
          ? await fileService.toggleHiddenFile(item.id, true)
          : await fileService.toggleHiddenFolder(item.id, true);
        if (success) {
          refresh();
          queryClient.invalidateQueries({ queryKey: ['hidden-files'] });
          queryClient.invalidateQueries({ queryKey: ['hidden-folders'] });
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

  const handleBulkDelete = async () => {
    if (selectedItemIds.size === 0) return;
    setDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    if (selectedItemIds.size === 0) return;

    setIsDeleting(true);
    try {
      const selectedItems = [
        ...folders.filter(f => selectedItemIds.has(f.id)).map(f => ({ ...f, type: 'folder' as const })),
        ...files.filter(f => selectedItemIds.has(f.id)).map(f => ({ ...f, type: 'file' as const }))
      ];

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const item of selectedItems) {
        try {
          const success = item.type === 'file'
            ? await fileService.deleteFile(item.id)
            : await fileService.deleteFolder(item.id);

          if (success) {
            successCount++;
          } else {
            errorCount++;
            errors.push(`Failed to delete ${item.name || item.id}`);
          }
        } catch (error) {
          errorCount++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Failed to delete ${item.name || item.id}: ${errorMessage}`);
          console.error(`Error deleting ${item.type} ${item.id}:`, error);
        }
      }

      if (successCount > 0) {
        toast.success(`Deleted ${successCount} item(s)${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
        setSelectedItemIds(new Set());
        // Refresh current files and also update Recycle Bin
        refresh();
        queryClient.invalidateQueries({ queryKey: ['deleted-files'] });
        queryClient.invalidateQueries({ queryKey: ['deleted-folders'] });
        queryClient.refetchQueries({ queryKey: ['deleted-files'] });
        queryClient.refetchQueries({ queryKey: ['deleted-folders'] });
      } else if (errorCount > 0) {
        toast.error(`Failed to delete ${errorCount} item(s). ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`);
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred while deleting items');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <DashboardLayout title="Files" subtitle="Manage your files and folders" fullHeight>
      <div className="flex flex-col h-full bg-background">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 transition-all duration-200">
          <div className="flex items-center gap-3">
            {currentFolderId && (
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-accent/50" onClick={handleBack}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="flex flex-col">
              <h2 className="text-lg font-semibold tracking-tight">Files</h2>
              {/* We could potentially move breadcrumbs here or keep them below */}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {selectedItemIds.size > 0 && (
              <div className="flex items-center gap-2 mr-2 animate-fade-in bg-destructive/10 px-3 py-1.5 rounded-xl border border-destructive/20">
                <span className="text-xs font-medium text-destructive">{selectedItemIds.size} selected</span>
                <div className="h-4 w-px bg-destructive/20 mx-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            )}
            <div className="flex items-center gap-2 bg-accent/30 p-1 rounded-xl border border-border/30">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-medium hover:bg-background shadow-none transition-all rounded-lg"
                onClick={() => setNewFolderDialogOpen(true)}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New Folder
              </Button>
              <div className="h-4 w-px bg-border/40" />
              <Button
                variant="default"
                size="sm"
                className="h-8 text-xs font-medium shadow-sm rounded-lg"
                onClick={handleUploadClick}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Upload
              </Button>
            </div>

            <div className="flex items-center bg-accent/30 p-1 rounded-xl border border-border/30">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-lg transition-all",
                  viewMode === 'grid' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-lg transition-all",
                  viewMode === 'list' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        <BreadcrumbNav
          items={breadcrumbs}
          onNavigate={handleNavigate}
        />

        {/* File Upload Dropzone (hidden, only for drag & drop) */}
        <div className="flex-1 overflow-hidden relative">
          <FileUploadDropzone
            folderId={currentFolderId}
            onUploadComplete={refresh}
          />

          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mx-auto mb-3"></div>
                <p className="text-xs text-muted-foreground">Loading...</p>
              </div>
            </div>
          ) : folders.length === 0 && files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <Folder className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No files or folders</p>
              <p className="text-xs text-muted-foreground">
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
              onSelectionChange={setSelectedItemIds}
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
              onSelectionChange={setSelectedItemIds}
            />
          )}
        </div>

        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={confirmBulkDelete}
          itemCount={selectedItemIds.size}
          itemType="item"
          isLoading={isDeleting}
        />

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
