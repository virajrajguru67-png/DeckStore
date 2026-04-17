import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { DeleteConfirmationDialog } from '@/components/ui/DeleteConfirmationDialog';
import { File as FileIcon, Folder as FolderIcon, Star, Trash2 } from 'lucide-react';
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


export default function Favorites() {
  const [selectedFile, setSelectedFile] = useState<FileType | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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

  const isLoading = filesLoading || foldersLoading || documentsLoading;

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

  const handleFileAction = (action: string, item: any, type: string) => {
    if (action === 'delete') {
      const confirm = window.confirm(`Are you sure you want to delete ${item.name}?`);
      if (confirm) {
        if (type === 'file') {
          fileService.deleteFile(item.id).then(async () => {
            await queryClient.invalidateQueries({ queryKey: ['favorite-files'] });
            await queryClient.refetchQueries({ queryKey: ['favorite-files'] });
          });
        } else if (type === 'folder') {
          fileService.deleteFolder(item.id).then(async () => {
            await queryClient.invalidateQueries({ queryKey: ['favorite-folders'] });
            await queryClient.refetchQueries({ queryKey: ['favorite-folders'] });
          });
        } else if (type === 'document') {
          documentService.deleteDocument(item.id).then(async () => {
            await queryClient.invalidateQueries({ queryKey: ['favorite-documents'] });
            await queryClient.refetchQueries({ queryKey: ['favorite-documents'] });
          });
        }
      }
    }
  };

  return (
    <DashboardLayout 
      title="Favorites" 
      subtitle="Your favorite files and folders"
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
        <div className="px-6 py-2 border-b bg-muted/5">
          <LocalSearchBar onSearch={setSearchQuery} className="max-w-md" />
        </div>



        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : allFavorites.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Star className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No favorites yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="h-[calc(100vh-300px)]">
            <FileListView
              folders={favoriteFolders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))}
              files={[...favoriteFiles, ...mappedDocuments].filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())) as any}
              onFolderClick={() => { }}

              onFileClick={(file) => {
                if ((file as any).type === 'document') {
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
      </div>
    </DashboardLayout>
  );
}

