import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { DeleteConfirmationDialog } from '@/components/ui/DeleteConfirmationDialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fileService } from '@/services/fileService';
import { documentService } from '@/services/documentService';
import { File, Folder } from '@/types/file';
import { Trash2, RotateCcw, Grid3x3, List, MoreVertical, FileText } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { FolderIcon } from '@/components/ui/sidebar-icons/FolderIcon';
import { getFileIconComponent, getFileIconComponentLarge, formatFileSize } from '@/lib/fileUtils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { LocalSearchBar } from '@/components/ui/LocalSearchBar';


type ViewMode = 'grid' | 'list';

export default function RecycleBin() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string; type: 'file' | 'folder' | 'document' } | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);


  const { data: deletedFiles = [], isLoading: filesLoading } = useQuery({
    queryKey: ['deleted-files'],
    queryFn: () => fileService.getDeletedFiles(),
  });

  const { data: deletedFolders = [], isLoading: foldersLoading } = useQuery({
    queryKey: ['deleted-folders'],
    queryFn: () => fileService.getDeletedFolders(),
  });

  const { data: deletedDocuments = [], isLoading: documentsLoading } = useQuery({
    queryKey: ['deleted-documents'],
    queryFn: () => documentService.getDeletedDocuments(),
  });

  const refresh = async () => {
    // Invalidate and immediately refetch to get updated data
    await queryClient.invalidateQueries({ queryKey: ['deleted-files'] });
    await queryClient.invalidateQueries({ queryKey: ['deleted-folders'] });
    await queryClient.invalidateQueries({ queryKey: ['deleted-documents'] });
    await queryClient.refetchQueries({ queryKey: ['deleted-files'] });
    await queryClient.refetchQueries({ queryKey: ['deleted-folders'] });
    await queryClient.refetchQueries({ queryKey: ['deleted-documents'] });
  };

  const handleRestoreFile = async (fileId: string) => {
    const success = await fileService.restoreFile(fileId);
    if (success) {
      toast.success('File restored');
      // Remove from selected items if it was selected
      setSelectedItemIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
      await refresh();
    }
  };

  const handleRestoreFolder = async (folderId: string) => {
    const success = await fileService.restoreFolder(folderId);
    if (success) {
      toast.success('Folder restored');
      // Remove from selected items if it was selected
      setSelectedItemIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(folderId);
        return newSet;
      });
      await refresh();
    }
  };

  const handleRestoreDocument = async (documentId: string) => {
    const success = await documentService.restoreDocument(documentId);
    if (success) {
      toast.success('Document restored');
      // Remove from selected items if it was selected
      setSelectedItemIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
      await refresh();
    }
  };

  const handlePermanentDelete = async () => {
    if (!itemToDelete) return;

    // Validate that user typed the name correctly
    if (confirmText !== itemToDelete.name) {
      toast.error(`${itemToDelete.type === 'file' ? 'File' : 'Folder'} name does not match. Please type the exact name to confirm.`);
      return;
    }

    const success = itemToDelete.type === 'file'
      ? await fileService.permanentlyDeleteFile(itemToDelete.id)
      : itemToDelete.type === 'folder'
        ? await fileService.permanentlyDeleteFolder(itemToDelete.id)
        : await documentService.hardDeleteDocument(itemToDelete.id);

    if (success) {
      toast.success(`${itemToDelete.type.charAt(0).toUpperCase() + itemToDelete.type.slice(1)} permanently deleted`);
      // Remove from selected items if it was selected
      setSelectedItemIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemToDelete.id);
        return newSet;
      });
      setItemToDelete(null);
      setConfirmText('');
      // Force immediate refresh
      await refresh();
    } else {
      toast.error(`Failed to permanently delete ${itemToDelete.type === 'file' ? 'file' : 'folder'}`);
    }
  };

  const handleDeleteClick = (item: any, type: 'file' | 'folder' | 'document') => {
    setItemToDelete({ id: item.id, name: item.name, type });
    setConfirmText('');
  };


  const isLoading = filesLoading || foldersLoading || documentsLoading;
  const hasItems = deletedFiles.length > 0 || deletedFolders.length > 0 || deletedDocuments.length > 0;

  const allItems = [
    ...deletedFolders.map(f => ({ ...f, type: 'folder' as const })),
    ...deletedFiles.map(f => ({ ...f, type: 'file' as const })),
    ...deletedDocuments.map(d => ({ ...d, type: 'document' as const }))
  ].sort((a, b) => {
    const dateA = new Date(a.deleted_at || 0).getTime();
    const dateB = new Date(b.deleted_at || 0).getTime();
    return dateB - dateA; // Newest first
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItemIds(new Set(allItems.map(item => item.id)));
    } else {
      setSelectedItemIds(new Set());
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    setSelectedItemIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedItemIds.size === 0) return;
    setDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    if (selectedItemIds.size === 0) return;

    setIsDeleting(true);
    try {
      const selectedItems = allItems.filter(item => selectedItemIds.has(item.id));

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const item of selectedItems) {
        try {
          const success = item.type === 'file'
            ? await fileService.permanentlyDeleteFile(item.id)
            : item.type === 'folder'
              ? await fileService.permanentlyDeleteFolder(item.id)
              : await documentService.hardDeleteDocument(item.id);

          if (success) {
            successCount++;
          } else {
            errorCount++;
            errors.push(`Failed to permanently delete ${item.name || item.id}`);
          }
        } catch (error) {
          errorCount++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Failed to permanently delete ${item.name || item.id}: ${errorMessage}`);
          console.error(`Error permanently deleting ${item.type} ${item.id}:`, error);
        }
      }

      if (successCount > 0) {
        toast.success(`Permanently deleted ${successCount} item(s)${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
        setSelectedItemIds(new Set());
        await refresh();
      } else if (errorCount > 0) {
        toast.error(`Failed to permanently delete ${errorCount} item(s). ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`);
      }
    } catch (error) {
      console.error('Bulk permanent delete error:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred while permanently deleting items');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleBulkRestore = async () => {
    if (selectedItemIds.size === 0) return;

    const selectedItems = allItems.filter(item => selectedItemIds.has(item.id));
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const item of selectedItems) {
      try {
        const success = item.type === 'file'
          ? await fileService.restoreFile(item.id)
          : item.type === 'folder'
            ? await fileService.restoreFolder(item.id)
            : await documentService.restoreDocument(item.id);

        if (success) {
          successCount++;
        } else {
          errorCount++;
          errors.push(`Failed to restore ${item.name || item.id}`);
        }
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to restore ${item.name || item.id}: ${errorMessage}`);
        console.error(`Error restoring ${item.type} ${item.id}:`, error);
      }
    }

    if (successCount > 0) {
      toast.success(`Restored ${successCount} item(s)${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
      setSelectedItemIds(new Set());
      await refresh();
    } else if (errorCount > 0) {
      toast.error(`Failed to restore ${errorCount} item(s). ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`);
    }
  };

  const isAllSelected = allItems.length > 0 && selectedItemIds.size === allItems.length;
  const isIndeterminate = selectedItemIds.size > 0 && selectedItemIds.size < allItems.length;

  return (
    <DashboardLayout 
      title="Recycle Bin" 
      subtitle="Restore or permanently delete files"
      rightAction={
        <div className="flex items-center gap-2">
           {selectedItemIds.size > 0 && (
             <>
               <Button
                 variant="outline"
                 size="sm"
                 className="h-8 text-xs font-medium"
                 onClick={handleBulkRestore}
               >
                 <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                 Restore ({selectedItemIds.size})
               </Button>
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
             </>
           )}
           <div className="flex items-center gap-1 bg-accent/30 p-1 rounded-xl border border-border/30 shrink-0">
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
        <div className="px-6 py-2 border-b bg-muted/5">
          <LocalSearchBar onSearch={setSearchQuery} className="max-w-md" />
        </div>



        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading...
          </div>
        ) : !hasItems ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Trash2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Recycle bin is empty</p>
            </CardContent>
          </Card>
        ) : viewMode === 'list' ? (
          <div className="overflow-auto pb-6">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead>Deleted At</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allItems.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase())).map((item) => (
                  <TableRow
                    key={item.id}
                    className={cn(
                      "cursor-pointer hover:bg-accent/40 border-b border-border/50 transition-colors duration-100 group",
                      selectedItemIds.has(item.id) && "bg-accent/60"
                    )}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedItemIds.has(item.id)}
                        onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {item.type === 'folder' ? (
                          <FolderIcon size={20} className="text-primary shrink-0" />
                        ) : item.type === 'document' ? (
                          <FileText size={20} className="text-primary shrink-0" />
                        ) : (
                          <div className="shrink-0">
                            {getFileIconComponent((item as any).mime_type, (item as any).name, 'sm')}
                          </div>
                        )}
                        <span className="truncate">{item.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {item.type === 'file' ? formatFileSize((item as any).size) : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {item.deleted_at && format(new Date(item.deleted_at), 'MMM d, yyyy h:mm a')}
                    </TableCell>
                    <TableCell className="px-2" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity duration-100"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() =>
                              item.type === 'folder'
                                ? handleRestoreFolder(item.id)
                                : item.type === 'document'
                                  ? handleRestoreDocument(item.id)
                                  : handleRestoreFile(item.id)
                            }
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Restore
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDeleteClick(item as any, item.type as any)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Permanently
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {allItems.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase())).map((item) => (

              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-2 flex items-center justify-center">
                      {item.type === 'folder' ? (
                        <FolderIcon size={48} className="text-primary" />
                      ) : item.type === 'document' ? (
                        <FileText size={48} className="text-primary" />
                      ) : (
                        getFileIconComponentLarge((item as File).mime_type, (item as File).name)
                      )}
                    </div>
                    <p className="font-medium truncate w-full mb-1" title={item.name}>
                      {item.name}
                    </p>
                    {item.type === 'file' && (
                      <p className="text-xs text-muted-foreground mb-1">
                        {formatFileSize((item as File).size)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mb-4">
                      {item.deleted_at && formatDistanceToNow(new Date(item.deleted_at), { addSuffix: true })}
                    </p>
                    <div className="relative w-full">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() =>
                              item.type === 'folder'
                                ? handleRestoreFolder(item.id)
                                : item.type === 'document'
                                  ? handleRestoreDocument(item.id)
                                  : handleRestoreFile(item.id)
                            }
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Restore
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDeleteClick(item as any, item.type as any)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Permanently
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <AlertDialog open={!!itemToDelete} onOpenChange={(open) => {
          if (!open) {
            setItemToDelete(null);
            setConfirmText('');
          }
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Permanently Delete {itemToDelete?.type === 'file' ? 'File' : itemToDelete?.type === 'folder' ? 'Folder' : 'Document'}?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The {itemToDelete?.type === 'file' ? 'file will be permanently deleted from storage' : itemToDelete?.type === 'folder' ? 'folder and all its contents will be permanently deleted' : 'document will be permanently deleted'}.
                <br /><br />
                To confirm, please type the {itemToDelete?.type === 'file' ? 'file' : itemToDelete?.type === 'folder' ? 'folder' : 'document'} name: <strong>{itemToDelete?.name}</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="confirm-name" className="text-sm font-medium">
                {itemToDelete?.type === 'file' ? 'File' : itemToDelete?.type === 'folder' ? 'Folder' : 'Document'} Name
              </Label>
              <Input
                id="confirm-name"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={`Type the ${itemToDelete?.type === 'file' ? 'file' : itemToDelete?.type === 'folder' ? 'folder' : 'document'} name to confirm`}
                className="mt-2"
                autoFocus
              />
              {confirmText && confirmText !== itemToDelete?.name && (
                <p className="text-sm text-destructive mt-2">
                  {itemToDelete?.type === 'file' ? 'File' : itemToDelete?.type === 'folder' ? 'Folder' : 'Document'} name does not match
                </p>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handlePermanentDelete}
                disabled={confirmText !== itemToDelete?.name}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={confirmBulkDelete}
          itemCount={selectedItemIds.size}
          itemType="item"
          isPermanent={true}
          isLoading={isDeleting}
        />
      </div>
    </DashboardLayout>
  );
}
