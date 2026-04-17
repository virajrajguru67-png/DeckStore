import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { shareService } from '@/services/shareService';
import { fileService } from '@/services/fileService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Share } from '@/services/shareService';
import { File as FileIcon, Folder as FolderIcon, Share2, Eye, ChevronLeft, Plus, Upload, Grid3x3, List, MoreVertical, Trash2 } from 'lucide-react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { apiService } from '@/services/apiService';

type ViewMode = 'grid' | 'list';

interface SharedItem extends Share {
  resourceName?: string;
  resource?: File | Folder;
  sharedByName?: string;
  sharedByEmail?: string;
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

  const { files, folders, isLoading: isLoadingFolder, refresh } = useFiles(
    currentFolderId,
    currentFolderId ? { refetchInterval: 5000 } : undefined
  );

  const { data: sharedWithMe = [], isLoading, refetch } = useQuery({
    queryKey: ['shared-with-me'],
    queryFn: () => shareService.getSharedWithMe(),
    refetchInterval: 10000,
  });

  useEffect(() => {
    const fetchResourceDetails = async () => {
      if (sharedWithMe.length === 0) {
        setSharedItems([]);
        return;
      }

      const items: SharedItem[] = [];
      for (const share of sharedWithMe) {
        try {
          const shareWithResource = share as Share & { resource_name?: string };
          let resourceName = shareWithResource.resource_name || 'Unknown';
          let resource: File | Folder | undefined;

          if (share.resource_type === 'file') {
            const { data: fileData } = await fileService.getFileById(share.resource_id);
            if (fileData) {
              resourceName = fileData.name;
              resource = fileData;
            }
          } else {
            const { data: folderData } = await fileService.getFolderById(share.resource_id);
            if (folderData) {
              resourceName = folderData.name;
              resource = folderData;
            }
          }

          let sharedByName: string | undefined;
          let sharedByEmail: string | undefined;
          if (share.shared_by) {
            try {
              const profile = await apiService.get(`/profiles/${share.shared_by}`);
              if (profile) {
                sharedByName = profile.full_name;
                sharedByEmail = profile.email;
              }
            } catch (pErr) {
              console.warn('Could not fetch sharer profile');
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
          console.error('Error fetching resource details:', error);
          items.push({ ...share, resourceName: 'Unknown' });
        }
      }
      setSharedItems(items);
    };

    fetchResourceDetails();
  }, [sharedWithMe]);

  useEffect(() => {
    const loadBreadcrumbs = async () => {
      if (!currentFolderId) {
        setBreadcrumbs([]);
        return;
      }

      const path: Array<{ id: string | null; name: string }> = [];
      let folderId: string | null = currentFolderId;

      while (folderId) {
        const { data: folderData } = await fileService.getFolderById(folderId);
        if (folderData) {
          path.unshift({ id: folderData.id, name: folderData.name });
          folderId = folderData.parent_folder_id;
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
      if (item.resource) {
        setSelectedFile(item.resource as File);
        setPreviewOpen(true);
      } else {
        const { data: fileData } = await fileService.getFileById(item.resource_id);
        if (fileData) {
          setSelectedFile(fileData);
          setPreviewOpen(true);
        } else {
          toast.error('Failed to load file');
        }
      }
    } else if (item.resource_type === 'folder') {
      setCurrentFolderId(item.resource_id);
      setCurrentFolderName(item.resourceName || 'Folder');
    }
  };

  const handleFolderClick = (folder: Folder) => {
    setCurrentFolderId(folder.id);
    setCurrentFolderName(folder.name);
  };

  const handleBack = () => {
    setCurrentFolderId(null);
    setCurrentFolderName(null);
  };

  const handleFileClick = (file: File) => {
    setSelectedFile(file);
    setPreviewOpen(true);
  };

  const handleCreateFolder = async (name: string) => {
    if (!currentFolderId) return;
    const folder = await fileService.createFolder(name, currentFolderId);
    if (folder) {
      toast.success('Folder created');
      refresh();
    }
  };

  const handleUploadClick = () => {
    if (!currentFolderId) return;
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
      }
    };
    input.click();
  };

  const handleFileAction = async (action: string, item: File | Folder, type: 'file' | 'folder') => {
    setSelectedItem({ id: item.id, name: item.name, type });
    switch (action) {
      case 'rename': setRenameDialogOpen(true); break;
      case 'move': setMoveDialogOpen(true); break;
      case 'delete': setDeleteDialogOpen(true); break;
    }
  };

  return (
    <DashboardLayout 
      title="Shared" 
      subtitle="Files and folders shared with you" 
      fullHeight
      leftAction={
        currentFolderId ? (
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={handleBack}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        ) : undefined
      }
      rightAction={
        <div className="flex items-center gap-2">
          {currentFolderId && (
            <div className="flex items-center gap-2 bg-accent/30 p-1 rounded-xl border border-border/30">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-medium hover:bg-background transition-all rounded-lg"
                onClick={() => setNewFolderDialogOpen(true)}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-8 text-xs font-medium rounded-lg"
                onClick={handleUploadClick}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Upload
              </Button>
            </div>
          )}
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
      }
    >
      <div className="flex flex-col h-full bg-background overflow-hidden">


        {currentFolderId && (
          <BreadcrumbNav
            items={breadcrumbs}
            onNavigate={(id) => setCurrentFolderId(id)}
          />
        )}

        <div className="flex-1 overflow-auto">
          {currentFolderId ? (
            isLoadingFolder ? (
              <div className="flex items-center justify-center h-64"><p>Loading...</p></div>
            ) : (
              viewMode === 'grid' ? (
                <FileGridView folders={folders} files={files} onFolderClick={handleFolderClick} onFileClick={handleFileClick} onFileAction={handleFileAction} onSelectionChange={setSelectedItemIds} />
              ) : (
                <FileListView folders={folders} files={files} onFolderClick={handleFolderClick} onFileClick={handleFileClick} onFileAction={handleFileAction} onSelectionChange={setSelectedItemIds} />
              )
            )
          ) : (
            isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mx-auto mb-3"></div>
                  <p className="text-xs text-muted-foreground">Loading shared items...</p>
                </div>
              </div>
            ) : sharedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <Share2 className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">No shared items</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Files and folders shared with you will appear here
                </p>
              </div>
            ) : (
              <div className="p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Shared By</TableHead>
                      <TableHead>Access</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sharedItems.map(item => (
                      <TableRow key={item.id} className="cursor-pointer" onClick={() => handleOpen(item)}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {item.resource_type === 'folder' ? <FolderIcon className="h-4 w-4 text-primary" /> : <FileIcon className="h-4 w-4 text-muted-foreground" />}
                            <span className="font-medium">{item.resourceName}</span>
                          </div>
                        </TableCell>
                        <TableCell>{item.sharedByName || 'Unknown'}</TableCell>
                        <TableCell className="capitalize">{item.access_level}</TableCell>
                        <TableCell>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleOpen(item)}><Eye className="mr-2 h-4 w-4" /> View</DropdownMenuItem>
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

        <PreviewModal open={previewOpen} onOpenChange={setPreviewOpen} file={selectedFile} />
        <NewFolderDialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen} onCreate={handleCreateFolder} />
        <RenameDialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen} currentName={selectedItem?.name || ''} onRename={refresh} />
      </div>
    </DashboardLayout>
  );
}
