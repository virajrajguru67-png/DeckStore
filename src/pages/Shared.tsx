import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { shareService } from '@/services/shareService';
import { fileService } from '@/services/fileService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Share } from '@/services/shareService';
import { File as FileIcon, Folder as FolderIcon, Share2, Eye, ChevronLeft, Home, Plus, Upload, Grid3x3, List, MoreVertical, Star, Pencil, FolderOpen, Trash2, Lock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { PreviewModal } from '@/components/preview/PreviewModal';
import { File, Folder } from '@/types/file';
import { toast } from 'sonner';
import { useFiles } from '@/hooks/useFiles';
import { FileUploadDropzone } from '@/components/file-operations/FileUploadDropzone';
import { FileListView } from '@/components/file-explorer/FileListView';
import { FileGridView } from '@/components/file-explorer/FileGridView';
import { BreadcrumbNav } from '@/components/file-explorer/BreadcrumbNav';
import { NewFolderDialog } from '@/components/file-operations/NewFolderDialog';
import { RenameDialog } from '@/components/file-operations/RenameDialog';
import { MoveFileDialog } from '@/components/file-operations/MoveFileDialog';
import { DeleteConfirmationDialog } from '@/components/ui/DeleteConfirmationDialog';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type ViewMode = 'grid' | 'list';

interface SharedItem extends Share {
  resourceName?: string;
  resource?: File | Folder;
  sharedByName?: string; // Name of the person who shared
  sharedByEmail?: string; // Email of the person who shared
}

export default function Shared() {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sharedItems, setSharedItems] = useState<SharedItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentFolderName, setCurrentFolderName] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string | null; name: string }>>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id: string; name: string; type: 'file' | 'folder' } | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch files and folders for the current shared folder
  // Use shorter refetch interval (3 seconds) for shared folders to see updates faster
  const { files, folders, isLoading: isLoadingFolder, refresh } = useFiles(
    currentFolderId,
    currentFolderId ? { refetchInterval: 3000 } : undefined
  );

  // Set up real-time subscriptions for files and folders when viewing a shared folder
  useEffect(() => {
    if (!currentFolderId) return;

    console.log('Setting up real-time subscriptions for shared folder:', currentFolderId);

    // Subscribe to file changes in this folder
    const filesChannel = supabase
      .channel(`shared-files-${currentFolderId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'files',
          filter: `folder_id=eq.${currentFolderId}`,
        },
        (payload) => {
          console.log('Real-time: File change detected in shared folder:', {
            event: payload.eventType,
            fileId: (payload.new as any)?.id || (payload.old as any)?.id,
            fileName: (payload.new as any)?.name || (payload.old as any)?.name,
            folderId: (payload.new as any)?.folder_id || (payload.old as any)?.folder_id,
            ownerId: (payload.new as any)?.owner_id || (payload.old as any)?.owner_id,
          });

          // Force immediate refetch with a small delay to ensure database is updated
          setTimeout(() => {
            console.log('Refetching files after real-time event...');
            queryClient.invalidateQueries({ queryKey: ['files', currentFolderId] });
            queryClient.invalidateQueries({ queryKey: ['folders', currentFolderId] });
            refresh();
          }, 500);
        }
      )
      .subscribe();

    // Subscribe to folder changes in this folder
    const foldersChannel = supabase
      .channel(`shared-folders-${currentFolderId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'folders',
          filter: `parent_folder_id=eq.${currentFolderId}`,
        },
        (payload) => {
          console.log('Real-time: Folder change detected in shared folder:', {
            event: payload.eventType,
            folderId: (payload.new as any)?.id || (payload.old as any)?.id,
            folderName: (payload.new as any)?.name || (payload.old as any)?.name,
            parentFolderId: (payload.new as any)?.parent_folder_id || (payload.old as any)?.parent_folder_id,
            ownerId: (payload.new as any)?.owner_id || (payload.old as any)?.owner_id,
          });

          // Force immediate refetch with a small delay to ensure database is updated
          setTimeout(() => {
            console.log('Refetching folders after real-time event...');
            queryClient.invalidateQueries({ queryKey: ['folders', currentFolderId] });
            queryClient.invalidateQueries({ queryKey: ['files', currentFolderId] });
            refresh();
          }, 500);
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscriptions for folder:', currentFolderId);
      supabase.removeChannel(filesChannel);
      supabase.removeChannel(foldersChannel);
    };
  }, [currentFolderId, queryClient, refresh]);

  const { data: sharedWithMe = [], isLoading, refetch } = useQuery({
    queryKey: ['shared-with-me'],
    queryFn: () => shareService.getSharedWithMe(),
    refetchInterval: 5000, // Refetch every 5 seconds to catch new shares
    refetchOnWindowFocus: true, // Refetch when user returns to the tab
  });

  // Fetch resource details and sharer information for each share
  useEffect(() => {
    const fetchResourceDetails = async () => {
      if (sharedWithMe.length === 0) {
        setSharedItems([]);
        return;
      }

      const items: SharedItem[] = [];
      for (const share of sharedWithMe) {
        try {
          // Fetch resource details
          // First, try to use resource_name from share (if fetched in getSharedWithMe)
          let resourceName = (share as any).resource_name || 'Unknown';
          let resource: File | Folder | undefined;

          // If resource_name is not available, fetch it separately
          if (resourceName === 'Unknown') {
            if (share.resource_type === 'file') {
              const { data: file, error } = await fileService.getFileById(share.resource_id);
              if (file && !error) {
                resourceName = file.name;
                resource = file;
              } else {
                console.error('Error fetching file:', {
                  resourceId: share.resource_id,
                  error: error?.message || 'Unknown error',
                  errorCode: (error as any)?.code,
                  errorDetails: (error as any)?.details,
                  errorHint: (error as any)?.hint,
                });
              }
            } else {
              console.log('Fetching folder:', {
                folderId: share.resource_id,
                shareId: share.id,
              });
              const { data: folder, error } = await fileService.getFolderById(share.resource_id);
              if (folder && !error) {
                console.log('Folder fetched successfully:', {
                  folderId: folder.id,
                  folderName: folder.name,
                });
                resourceName = folder.name;
                resource = folder;
              } else {
                // If folder fetch fails, try using the RPC function to get the name
                console.warn('Error fetching folder, trying RPC function:', {
                  resourceId: share.resource_id,
                  error: error?.message || 'Unknown error',
                });

                // Try to get folder name via RPC function (bypasses RLS)
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  try {
                    const { data: folderName, error: rpcError } = await (supabase as any).rpc(
                      'get_shared_folder_name',
                      {
                        folder_id_param: share.resource_id,
                        user_id_param: user.id,
                      }
                    );

                    if (!rpcError && folderName) {
                      console.log('Folder name fetched via RPC:', folderName);
                      resourceName = folderName;
                    } else {
                      console.error('RPC function also failed:', rpcError);
                      resourceName = 'Unknown Folder';
                    }
                  } catch (rpcErr) {
                    console.error('Exception calling RPC function:', rpcErr);
                    resourceName = 'Unknown Folder';
                  }
                } else {
                  resourceName = 'Unknown Folder';
                }
              }
            }
          } else {
            // Resource name was fetched in getSharedWithMe, but we still need the full resource object for preview
            // Only fetch if we need the full resource (for files that will be previewed)
            if (share.resource_type === 'file') {
              const { data: file, error } = await fileService.getFileById(share.resource_id);
              if (file && !error) {
                resource = file;
              }
            } else {
              // Try to fetch folder, but don't fail if it's blocked by RLS
              const { data: folder, error } = await fileService.getFolderById(share.resource_id);
              if (folder && !error) {
                resource = folder;
              } else {
                // Folder fetch failed (likely RLS), but we have the name from getSharedWithMe
                // Create a minimal folder object for navigation
                console.warn('Could not fetch full folder object, using minimal object:', {
                  folderId: share.resource_id,
                  folderName: resourceName,
                });
                // We'll create a minimal folder object if needed for navigation
                // The folder will still work for navigation even without full details
              }
            }
          }

          // Fetch sharer profile information
          let sharedByName: string | undefined;
          let sharedByEmail: string | undefined;
          if (share.shared_by) {
            const sharerProfile = await fileService.getUserProfile(share.shared_by);
            if (sharerProfile) {
              sharedByName = sharerProfile.full_name;
              sharedByEmail = sharerProfile.email;
            }
          }

          items.push({
            ...share,
            resourceName,
            resource,
            sharedByName,
            sharedByEmail,
          });
        } catch (error) {
          console.error('Error fetching resource or sharer info:', {
            shareId: share.id,
            resourceType: share.resource_type,
            resourceId: share.resource_id,
            error: error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
          });
          items.push({
            ...share,
            resourceName: 'Unknown',
          });
        }
      }
      setSharedItems(items);
    };

    fetchResourceDetails();
  }, [sharedWithMe]);

  // Load breadcrumbs when folder changes
  useEffect(() => {
    const loadBreadcrumbs = async () => {
      if (!currentFolderId) {
        setBreadcrumbs([]);
        return;
      }

      // For shared folders, we'll build breadcrumbs from the folder hierarchy
      const path: Array<{ id: string | null; name: string }> = [];
      let folderId: string | null = currentFolderId;

      while (folderId) {
        const { data: folder } = await fileService.getFolderById(folderId) as any;
        if (folder) {
          path.unshift({ id: folder.id, name: folder.name });
          // Try to get parent folder if it exists
          // Note: For shared folders, parent_folder_id might not be accessible
          // So we'll just show the current folder for now
          folderId = null; // Stop at current folder for shared items
        } else {
          break;
        }
      }

      setBreadcrumbs(path);
    };

    loadBreadcrumbs();
  }, [currentFolderId]);

  const handleOpen = async (item: SharedItem) => {
    if (item.resource_type === 'file') {
      // If we already have the resource, use it
      if (item.resource) {
        console.log('Opening shared file:', {
          id: item.resource.id,
          name: item.resource.name,
          storage_key: (item.resource as any).storage_key,
          mime_type: (item.resource as any).mime_type,
        });
        setSelectedFile(item.resource as File);
        setPreviewOpen(true);
      } else {
        // Otherwise, fetch it again
        console.log('Fetching file details for preview:', item.resource_id);
        const { data: file, error } = await fileService.getFileById(item.resource_id);
        if (file && !error) {
          console.log('File fetched successfully:', {
            id: file.id,
            name: file.name,
            storage_key: file.storage_key,
            mime_type: file.mime_type,
          });
          setSelectedFile(file);
          setPreviewOpen(true);
        } else {
          console.error('Failed to fetch file:', error);
          toast.error('Failed to load file. You may not have permission to view this file.');
        }
      }
    } else if (item.resource_type === 'folder') {
      // Open folder within Shared page
      setCurrentFolderId(item.resource_id);
      setCurrentFolderName(item.resourceName || 'Folder');
    }
  };

  const handleFolderClick = (folder: Folder) => {
    setCurrentFolderId(folder.id);
    setCurrentFolderName(folder.name);
  };

  const handleBack = () => {
    if (breadcrumbs.length > 0) {
      // For shared folders, we'll just go back to the root shared items
      setCurrentFolderId(null);
      setCurrentFolderName(null);
    } else {
      setCurrentFolderId(null);
      setCurrentFolderName(null);
    }
  };

  const handleFileClick = (file: File) => {
    setSelectedFile(file);
    setPreviewOpen(true);
  };

  const handleCreateFolder = async (name: string) => {
    if (!currentFolderId) {
      toast.error('Please open a shared folder first');
      return;
    }
    const folder = await fileService.createFolder(name, currentFolderId);
    if (folder) {
      toast.success('Folder created');
      refresh();
    } else {
      toast.error('Failed to create folder');
    }
  };

  const handleUploadClick = () => {
    if (!currentFolderId) {
      toast.error('Please open a shared folder first');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length > 0) {
        const { uploadService } = await import('@/services/uploadService');
        for (const file of files) {
          await uploadService.uploadFile(file, { folderId: currentFolderId });
        }
        refresh();
        queryClient.invalidateQueries({ queryKey: ['files', currentFolderId] });
      }
    };
    input.click();
  };

  const handleFileAction = async (action: string, item: File | Folder, type: 'file' | 'folder') => {
    setSelectedItem({ id: item.id, name: item.name, type });

    switch (action) {
      case 'rename':
        setRenameDialogOpen(true);
        break;
      case 'move':
        setMoveDialogOpen(true);
        break;
      case 'hide':
        const success = type === 'file'
          ? await fileService.toggleHiddenFile(item.id, true)
          : await fileService.toggleHiddenFolder(item.id, true);
        if (success) {
          queryClient.invalidateQueries({ queryKey: ['shared-with-me'] });
          queryClient.invalidateQueries({ queryKey: ['hidden-files'] });
          queryClient.invalidateQueries({ queryKey: ['hidden-folders'] });
          if (currentFolderId) {
            refresh();
          }
        }
        break;
      case 'delete':
        setDeleteDialogOpen(true);
        break;
      default:
        toast.info(`${action} ${type}: ${item.name}`);
    }
  };

  const handleToggleFavorite = async (item: SharedItem) => {
    if (!item.resource) {
      // Fetch the resource if not already loaded
      if (item.resource_type === 'file') {
        const { data: file } = await fileService.getFileById(item.resource_id);
        if (file) {
          item.resource = file;
        } else {
          toast.error('Could not load file details');
          return;
        }
      } else {
        const { data: folder } = await fileService.getFolderById(item.resource_id);
        if (folder) {
          item.resource = folder;
        } else {
          toast.error('Could not load folder details');
          return;
        }
      }
    }

    const isFavorite = item.resource_type === 'file'
      ? (item.resource as File).metadata?.is_favorite === true
      : (item.resource as any).metadata?.is_favorite === true;

    const success = item.resource_type === 'file'
      ? await fileService.toggleFavoriteFile(item.resource_id, !isFavorite)
      : await fileService.toggleFavoriteFolder(item.resource_id, !isFavorite);

    if (success) {
      queryClient.invalidateQueries({ queryKey: ['shared-with-me'] });
    }
  };

  const handleBulkDelete = () => {
    if (selectedItemIds.size === 0) return;
    setSelectedItem(null);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (selectedItem) {
      await performSingleDelete();
    } else if (selectedItemIds.size > 0) {
      await confirmBulkDelete();
    }
  };

  const performSingleDelete = async () => {
    if (!selectedItem) return;

    setIsDeleting(true);
    try {
      const success = selectedItem.type === 'file'
        ? await fileService.deleteFile(selectedItem.id)
        : await fileService.deleteFolder(selectedItem.id);

      if (success) {
        toast.success(`${selectedItem.type === 'file' ? 'File' : 'Folder'} deleted`);
        queryClient.invalidateQueries({ queryKey: ['shared-with-me'] });
        if (currentFolderId) {
          refresh();
        }
      } else {
        toast.error(`Failed to delete ${selectedItem.type}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('An error occurred while deleting');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setSelectedItem(null);
    }
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

      for (const item of selectedItems) {
        const success = item.type === 'file'
          ? await fileService.deleteFile(item.id)
          : await fileService.deleteFolder(item.id);

        if (success) successCount++;
        else errorCount++;
      }

      if (successCount > 0) {
        toast.success(`Deleted ${successCount} item(s)${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
        setSelectedItemIds(new Set());
        queryClient.invalidateQueries({ queryKey: ['shared-with-me'] });
        if (currentFolderId) refresh();
      } else if (errorCount > 0) {
        toast.error(`Failed to delete ${errorCount} item(s)`);
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('An error occurred during bulk deletion');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const isFavorite = (item: SharedItem): boolean => {
    if (!item.resource) return false;
    return item.resource_type === 'file'
      ? (item.resource as File).metadata?.is_favorite === true
      : (item.resource as any).metadata?.is_favorite === true;
  };

  return (
    <DashboardLayout title="Shared" subtitle="Files and folders shared with you" fullHeight>
      <div className="flex flex-col h-full bg-background">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {currentFolderId && (
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={handleBack}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <h2 className="text-lg font-semibold tracking-tight">Shared</h2>
          </div>

          <div className="flex items-center gap-3">
            {currentFolderId && (
              <>
                {selectedItemIds.size > 0 && (
                  <div className="flex items-center gap-2 mr-2 animate-in fade-in slide-in-from-left-2 bg-destructive/10 px-3 py-1.5 rounded-xl border border-destructive/20">
                    <span className="text-xs font-medium text-destructive">{selectedItemIds.size} selected</span>
                    <div className="h-4 w-px bg-destructive/20 mx-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
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
                    className="h-8 text-xs font-medium hover:bg-background rounded-lg shadow-none"
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
              </>
            )}

            <div className="flex items-center bg-accent/30 p-1 rounded-xl border border-border/30">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-lg transition-all",
                  viewMode === 'grid' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
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
                  viewMode === 'list' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                )}
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        {currentFolderId && (
          <BreadcrumbNav
            items={breadcrumbs.length > 0 ? breadcrumbs : [{ id: currentFolderId, name: currentFolderName || 'Folder' }]}
            onNavigate={(folderId) => {
              if (folderId === null) {
                setCurrentFolderId(null);
                setCurrentFolderName(null);
              } else {
                setCurrentFolderId(folderId);
                // Find folder name from breadcrumbs or fetch it
                const crumb = breadcrumbs.find(b => b.id === folderId);
                if (crumb) {
                  setCurrentFolderName(crumb.name);
                }
              }
            }}
          />
        )}

        {/* File Upload Dropzone (hidden, only for drag & drop) */}
        <div className="flex-1 overflow-auto relative">
          {currentFolderId && (
            <FileUploadDropzone
              folderId={currentFolderId}
              onUploadComplete={refresh}
            />
          )}

          {/* Show folder contents if a folder is open */}
          {currentFolderId ? (
            isLoadingFolder ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              </div>
            ) : folders.length === 0 && files.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <FolderIcon className="h-16 w-16 text-muted-foreground mb-4" />
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
                onFileClick={handleFileClick}
                onFileAction={handleFileAction}
                onSelectionChange={setSelectedItemIds}
              />
            ) : (
              <FileListView
                folders={folders}
                files={files}
                onFolderClick={handleFolderClick}
                onFileClick={handleFileClick}
                onFileAction={handleFileAction}
                onSelectionChange={setSelectedItemIds}
              />
            )
          ) : (
            /* Show shared items list */
            isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              </div>
            ) : sharedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Share2 className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No shared files or folders</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Files and folders shared with you will appear here
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 p-4">
                {sharedItems.map((item: SharedItem) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleOpen(item)}>
                    <CardContent className="p-6">
                      {item.resource_type === 'folder' ? (
                        <FolderIcon className="h-12 w-12 text-primary mb-2" />
                      ) : (
                        <FileIcon className="h-12 w-12 text-muted-foreground mb-2" />
                      )}
                      <p className="font-medium truncate mb-2" title={item.resourceName}>
                        {item.resourceName || (item.resource_type === 'folder' ? 'Folder' : 'File')}
                      </p>
                      {item.sharedByName && (
                        <p className="text-xs text-muted-foreground mb-1">
                          Shared by: <span className="font-medium">{item.sharedByName}</span>
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mb-2">
                        Access: <span className="capitalize">{item.access_level}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpen(item);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Open
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background border-b border-border">
                    <TableRow className="hover:bg-transparent border-b-0">
                      <TableHead className="h-10 px-4 font-semibold text-xs text-muted-foreground">Name</TableHead>
                      <TableHead className="h-10 px-4 font-semibold text-xs text-muted-foreground">Shared By</TableHead>
                      <TableHead className="h-10 px-4 font-semibold text-xs text-muted-foreground">Access Level</TableHead>
                      <TableHead className="h-10 px-4 font-semibold text-xs text-muted-foreground">Shared At</TableHead>
                      <TableHead className="h-10 px-4 w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sharedItems.map((item: SharedItem) => (
                      <TableRow
                        key={item.id}
                        className="cursor-pointer hover:bg-accent/40 border-b border-border/50 transition-colors duration-100 group"
                        onClick={() => handleOpen(item)}
                      >
                        <TableCell className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {item.resource_type === 'folder' ? (
                              <FolderIcon className="h-4 w-4 text-primary shrink-0" />
                            ) : (
                              <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            <span className="text-sm font-medium truncate" title={item.resourceName}>
                              {item.resourceName || (item.resource_type === 'folder' ? 'Folder' : 'File')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-2.5 text-muted-foreground">
                          <span className="text-xs">
                            {item.sharedByName || item.sharedByEmail || 'Unknown'}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-2.5 text-muted-foreground">
                          <span className="text-xs capitalize">{item.access_level}</span>
                        </TableCell>
                        <TableCell className="px-4 py-2.5 text-muted-foreground">
                          <span className="text-xs">
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                          </span>
                        </TableCell>
                        <TableCell className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleOpen(item)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Open
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleFavorite(item)}>
                                <Star className={cn("mr-2 h-4 w-4", isFavorite(item) && "fill-yellow-400 text-yellow-400")} />
                                {isFavorite(item) ? 'Remove from Favorites' : 'Mark as Favorite'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {item.resource && (
                                <>
                                  <DropdownMenuItem onClick={() => handleFileAction('rename', item.resource!, item.resource_type)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Rename
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleFileAction('move', item.resource!, item.resource_type)}>
                                    <FolderOpen className="mr-2 h-4 w-4" />
                                    Move
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleFileAction('hide', item.resource!, item.resource_type)}>
                                    <Lock className="mr-2 h-4 w-4" />
                                    Move to Hidden
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => handleFileAction('delete', item.resource!, item.resource_type)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          )}
        </div>

        <NewFolderDialog
          open={newFolderDialogOpen}
          onOpenChange={setNewFolderDialogOpen}
          onCreate={handleCreateFolder}
        />

        <RenameDialog
          open={renameDialogOpen}
          onOpenChange={setRenameDialogOpen}
          fileId={selectedItem?.type === 'file' ? selectedItem.id : undefined}
          folderId={selectedItem?.type === 'folder' ? selectedItem.id : undefined}
          currentName={selectedItem?.name || ''}
          onRename={() => {
            queryClient.invalidateQueries({ queryKey: ['shared-with-me'] });
            if (currentFolderId) {
              refresh();
            }
          }}
        />

        <MoveFileDialog
          open={moveDialogOpen}
          onOpenChange={setMoveDialogOpen}
          fileId={selectedItem?.type === 'file' ? selectedItem.id : undefined}
          folderId={selectedItem?.type === 'folder' ? selectedItem.id : undefined}
          onMove={() => {
            queryClient.invalidateQueries({ queryKey: ['shared-with-me'] });
            if (currentFolderId) {
              refresh();
            }
          }}
        />

        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleDelete}
          itemCount={selectedItemIds.size || 1}
          itemType={selectedItemIds.size > 1 ? 'items' : (selectedItem?.type || 'item')}
          isLoading={isDeleting}
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

