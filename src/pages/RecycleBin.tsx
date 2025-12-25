import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fileService } from '@/services/fileService';
import { File, Folder } from '@/types/file';
import { Folder as FolderIcon, File as FileIcon, Trash2, RotateCcw, Grid3x3, List } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
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
import { formatFileSize } from '@/lib/fileUtils';
import { toast } from 'sonner';

type ViewMode = 'grid' | 'list';

export default function RecycleBin() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string; type: 'file' | 'folder' } | null>(null);
  const [confirmText, setConfirmText] = useState('');

  const { data: deletedFiles = [], isLoading: filesLoading } = useQuery({
    queryKey: ['deleted-files'],
    queryFn: () => fileService.getDeletedFiles(),
  });

  const { data: deletedFolders = [], isLoading: foldersLoading } = useQuery({
    queryKey: ['deleted-folders'],
    queryFn: () => fileService.getDeletedFolders(),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['deleted-files'] });
    queryClient.invalidateQueries({ queryKey: ['deleted-folders'] });
  };

  const handleRestoreFile = async (fileId: string) => {
    const success = await fileService.restoreFile(fileId);
    if (success) {
      toast.success('File restored');
      refresh();
    }
  };

  const handleRestoreFolder = async (folderId: string) => {
    const success = await fileService.restoreFolder(folderId);
    if (success) {
      toast.success('Folder restored');
      refresh();
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
      : await fileService.permanentlyDeleteFolder(itemToDelete.id);
      
    if (success) {
      toast.success(`${itemToDelete.type === 'file' ? 'File' : 'Folder'} permanently deleted`);
      setItemToDelete(null);
      setConfirmText('');
      refresh();
    }
  };

  const handleDeleteClick = (item: File | Folder, type: 'file' | 'folder') => {
    setItemToDelete({ id: item.id, name: item.name, type });
    setConfirmText('');
  };

  const isLoading = filesLoading || foldersLoading;
  const hasItems = deletedFiles.length > 0 || deletedFolders.length > 0;

  const allItems = [
    ...deletedFolders.map(f => ({ ...f, type: 'folder' as const })),
    ...deletedFiles.map(f => ({ ...f, type: 'file' as const }))
  ].sort((a, b) => {
    const dateA = new Date(a.deleted_at || 0).getTime();
    const dateB = new Date(b.deleted_at || 0).getTime();
    return dateB - dateA; // Newest first
  });

  return (
    <DashboardLayout title="Recycle Bin" subtitle="Restore or permanently delete files">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Recycle Bin</h1>
            <p className="text-muted-foreground">
              Files and folders deleted in the last 30 days
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
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
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">Name</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead>Deleted At</TableHead>
                  <TableHead className="w-[200px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {item.type === 'folder' ? (
                          <FolderIcon className="h-5 w-5 text-primary" />
                        ) : (
                          <FileIcon className="h-5 w-5 text-muted-foreground" />
                        )}
                        <span className="truncate">{item.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {item.type === 'file' ? formatFileSize((item as File).size) : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.deleted_at && format(new Date(item.deleted_at), 'MMM d, yyyy h:mm a')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => 
                            item.type === 'folder' 
                              ? handleRestoreFolder(item.id)
                              : handleRestoreFile(item.id)
                          }
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Restore
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteClick(item as File | Folder, item.type)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {allItems.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    {item.type === 'folder' ? (
                      <FolderIcon className="h-12 w-12 text-primary mb-2" />
                    ) : (
                      <FileIcon className="h-12 w-12 text-muted-foreground mb-2" />
                    )}
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
                    <div className="flex flex-col gap-2 w-full">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => 
                          item.type === 'folder' 
                            ? handleRestoreFolder(item.id)
                            : handleRestoreFile(item.id)
                        }
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full"
                        onClick={() => handleDeleteClick(item as File | Folder, item.type)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
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
              <AlertDialogTitle>Permanently Delete {itemToDelete?.type === 'file' ? 'File' : 'Folder'}?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The {itemToDelete?.type === 'file' ? 'file will be permanently deleted from storage' : 'folder and all its contents will be permanently deleted'}.
                <br /><br />
                To confirm, please type the {itemToDelete?.type === 'file' ? 'file' : 'folder'} name: <strong>{itemToDelete?.name}</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="confirm-name" className="text-sm font-medium">
                {itemToDelete?.type === 'file' ? 'File' : 'Folder'} Name
              </Label>
              <Input
                id="confirm-name"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={`Type the ${itemToDelete?.type === 'file' ? 'file' : 'folder'} name to confirm`}
                className="mt-2"
                autoFocus
              />
              {confirmText && confirmText !== itemToDelete?.name && (
                <p className="text-sm text-destructive mt-2">
                  {itemToDelete?.type === 'file' ? 'File' : 'Folder'} name does not match
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
      </div>
    </DashboardLayout>
  );
}
