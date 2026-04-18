import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { DeleteConfirmationDialog } from '@/components/ui/DeleteConfirmationDialog';
import { File as FileIcon, Folder as FolderIcon, Star, Trash2, ChevronLeft } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { File as FileType, Folder as FolderType } from '@/types/file';
import { PreviewModal } from '@/components/preview/PreviewModal';
import { fileService } from '@/services/fileService';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatFileSize } from '@/lib/fileUtils';
import { FileListView } from '@/components/file-explorer/FileListView';
import { toast } from 'sonner';
import { LocalSearchBar } from '@/components/ui/LocalSearchBar';
import { documentService } from '@/services/documentService';
import { BreadcrumbNav } from '@/components/file-explorer/BreadcrumbNav';
import { MoveFileDialog } from '@/components/file-operations/MoveFileDialog';
import { RenameDialog } from '@/components/file-operations/RenameDialog';
import { ShareDialog } from '@/components/sharing/ShareDialog';


export default function Favorites() {
  const [selectedFile, setSelectedFile] = useState<FileType | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id: string; name: string; type: 'file' | 'folder' | 'document' } | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string | null; name: string }>>([]);
  const queryClient = useQueryClient();


  const { data: favoriteFiles = [], isLoading: filesLoading } = useQuery({
    queryKey: ['favorite-files'],
    queryFn: () => fileService.getFavoriteFiles(),
  });

  const { data: favoriteFolders = [], isLoading: foldersLoading } = useQuery({
    queryKey: ['favorite-folders'],
    queryFn: () => fileService.getFavoriteFolders(),
  });

  const { data: favoriteDocuments = [], isLoading: documentsLoading } = useQuery({
    queryKey: ['favorite-documents'],
    queryFn: () => documentService.getFavoriteDocuments(),
  });

  const { data: folderContents, isLoading: contentsLoading } = useQuery({
    queryKey: ['folder-contents', currentFolderId],
    queryFn: () => currentFolderId ? fileService.getFolderContents(currentFolderId) : null,
    enabled: !!currentFolderId,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['favorite-files'] });
    await queryClient.invalidateQueries({ queryKey: ['favorite-folders'] });
    await queryClient.invalidateQueries({ queryKey: ['favorite-documents'] });
    if (currentFolderId) {
      await queryClient.invalidateQueries({ queryKey: ['folder-contents', currentFolderId] });
    }
  };

  const isLoading = filesLoading || foldersLoading || documentsLoading || (!!currentFolderId && contentsLoading);

  // Map documents to File-like objects for the view
  const mappedDocuments = favoriteDocuments.map(doc => ({
    ...doc,
    mime_type: 'application/vnd.deckstore.document',
    size: 0, // Documents are JSON in DB, size isn't easily measured in bytes here
    path: '',
    storage_key: '',
    type: 'document' as const
  }));

  const allFavorites = [
    ...favoriteFolders.map(f => ({ ...f, type: 'folder' as const })),
    ...favoriteFiles.map(f => ({ ...f, type: 'file' as const })),
    ...mappedDocuments
  ];

  const handleToggleFavorite = async (item: FileType | FolderType, type: 'file' | 'folder') => {
    const currentFavorite = type === 'file'
      ? (item as FileType).metadata?.is_favorite === true
      : (item as any).metadata?.is_favorite === true;

    let success = false;
    if (type === 'file') {
      success = await fileService.toggleFavoriteFile(item.id, !currentFavorite);
    } else {
      success = await fileService.toggleFavoriteFolder(item.id, !currentFavorite);
    }

    if (success) {
      queryClient.invalidateQueries({ queryKey: ['favorite-files'] });
      queryClient.invalidateQueries({ queryKey: ['favorite-folders'] });
      queryClient.invalidateQueries({ queryKey: ['favorite-documents'] });
      if (currentFolderId) {
        queryClient.invalidateQueries({ queryKey: ['folder-contents', currentFolderId] });
      }
    }
  };

  const handleFolderClick = async (folder: FolderType) => {
    setCurrentFolderId(folder.id);
    
    // Update breadcrumbs
    const newBreadcrumbs = [...breadcrumbs];
    newBreadcrumbs.push({ id: folder.id, name: folder.name });
    setBreadcrumbs(newBreadcrumbs);
  };

  const handleNavigate = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    
    if (!folderId) {
      setBreadcrumbs([]);
    } else {
      const index = breadcrumbs.findIndex(b => b.id === folderId);
      if (index !== -1) {
        setBreadcrumbs(breadcrumbs.slice(0, index + 1));
      }
    }
  };

  const handleBack = () => {
    if (breadcrumbs.length > 0) {
      const parentId = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2].id : null;
      handleNavigate(parentId);
    }
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
        ...favoriteFolders.filter(f => selectedItemIds.has(f.id)).map(f => ({ ...f, type: 'folder' as const })),
        ...favoriteFiles.filter(f => selectedItemIds.has(f.id)).map(f => ({ ...f, type: 'file' as const }))
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
        await queryClient.invalidateQueries({ queryKey: ['favorite-files'] });
        await queryClient.invalidateQueries({ queryKey: ['favorite-folders'] });
        await queryClient.invalidateQueries({ queryKey: ['favorite-documents'] });
        await queryClient.refetchQueries({ queryKey: ['favorite-files'] });
        await queryClient.refetchQueries({ queryKey: ['favorite-folders'] });
        await queryClient.refetchQueries({ queryKey: ['favorite-documents'] });
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

  const handleFileAction = async (action: string, item: any, type: 'file' | 'folder' | 'document') => {
    setSelectedItem({ id: item.id, name: item.name, type });

    switch (action) {
      case 'share':
        setShareDialogOpen(true);
        break;
      case 'rename':
        setRenameDialogOpen(true);
        break;
      case 'move':
        if (type !== 'document') setMoveDialogOpen(true);
        break;
      case 'copy':
        if (type === 'file') {
          await fileService.copyFile(item.id, currentFolderId);
          refresh();
        }
        break;
      case 'hide':
        let hideSuccess = false;
        if (type === 'file') hideSuccess = await fileService.toggleHiddenFile(item.id, true);
        else if (type === 'folder') hideSuccess = await fileService.toggleHiddenFolder(item.id, true);
        else if (type === 'document') hideSuccess = await documentService.toggleHidden(item.id, true);
        if (hideSuccess) refresh();
        break;
      case 'delete':
        const confirm = window.confirm(`Are you sure you want to delete ${item.name}?`);
        if (confirm) {
          if (type === 'file') {
            fileService.deleteFile(item.id).then(refresh);
          } else if (type === 'folder') {
            fileService.deleteFolder(item.id).then(refresh);
          } else if (type === 'document') {
            documentService.deleteDocument(item.id).then(refresh);
          }
        }
        break;
    }
  };

  return (
    <DashboardLayout 
      title={currentFolderId ? breadcrumbs[breadcrumbs.length - 1]?.name || "Folder" : "Favorites"} 
      subtitle={currentFolderId ? "Exploring folder contents" : "Your favorite files and folders"}
      leftAction={
        currentFolderId ? (
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={handleBack}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        ) : undefined
      }
      rightAction={
        selectedItemIds.size > 0 ? (
          <Button
            variant="destructive"
            size="sm"
            className="h-8 text-xs font-medium"
            onClick={handleBulkDelete}
            disabled={isDeleting}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete ({selectedItemIds.size})
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col h-full bg-background overflow-hidden">
        <div className="px-6 py-2 border-b bg-muted/5 flex items-center justify-between">
          <LocalSearchBar onSearch={setSearchQuery} className="max-w-md" />
        </div>

        {currentFolderId && (
          <BreadcrumbNav
            items={breadcrumbs}
            onNavigate={handleNavigate}
          />
        )}



        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : (!currentFolderId && allFavorites.length === 0) || (currentFolderId && folderContents?.files.length === 0 && folderContents?.folders.length === 0) ? (
          <Card>
            <CardContent className="py-12 text-center">
              {currentFolderId ? <FolderIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-20" /> : <Star className="h-16 w-16 mx-auto text-muted-foreground mb-4" />}
              <p className="text-muted-foreground">{currentFolderId ? "This folder is empty" : "No favorites yet"}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="h-[calc(100vh-250px)]">
            <FileListView
              folders={
                (currentFolderId ? folderContents?.folders : favoriteFolders)
                ?.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())) || []
              }
              files={
                (currentFolderId ? folderContents?.files : [...favoriteFiles, ...mappedDocuments])
                ?.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())) as any[] || []
              }
              onFolderClick={handleFolderClick}

              onFileClick={(file) => {
                if ((file as any).type === 'document' || (file as any).mime_type === 'application/vnd.deckstore.document') {
                  // Navigate to documents page or open editor if we had routing
                  toast.info('Opening document...', { description: file.name });
                } else {
                  setSelectedFile(file);
                  setPreviewOpen(true);
                }
              }}
              onFileAction={handleFileAction}
              onSelectionChange={setSelectedItemIds}
            />
          </div>
        )}

        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={confirmBulkDelete}
          itemCount={selectedItemIds.size}
          itemType="item"
          isLoading={isDeleting}
        />

        <PreviewModal
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          file={selectedFile}
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
          documentId={selectedItem?.type === 'document' ? selectedItem.id : undefined}
          currentName={selectedItem?.name || ''}
          onRename={refresh}
        />

        <ShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          resourceType={selectedItem?.type === 'document' ? 'document' : (selectedItem?.type || 'file')}
          resourceId={selectedItem?.id || ''}
        />
      </div>
    </DashboardLayout>
  );
}

