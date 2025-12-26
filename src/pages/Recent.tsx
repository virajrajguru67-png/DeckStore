import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { DeleteConfirmationDialog } from '@/components/ui/DeleteConfirmationDialog';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fileService } from '@/services/fileService';
import { File } from '@/types/file';
import { File as FileIcon, Clock, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { PreviewModal } from '@/components/preview/PreviewModal';
import { useState } from 'react';
import { FileListView } from '@/components/file-explorer/FileListView';
import { toast } from 'sonner';

export default function Recent() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const { data: allFiles = [], isLoading } = useQuery({
    queryKey: ['all-files'],
    queryFn: async () => {
      // Get all files and sort by updated_at
      const files = await fileService.getFiles(null);
      return files.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ).slice(0, 20); // Last 20 files
    },
  });

  const handleBulkDelete = async () => {
    if (selectedItemIds.size === 0) return;
    setDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    if (selectedItemIds.size === 0) return;
    
    setIsDeleting(true);
    try {
      const selectedFiles = allFiles.filter(f => selectedItemIds.has(f.id));
      
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const file of selectedFiles) {
        try {
          const success = await fileService.deleteFile(file.id);
          if (success) {
            successCount++;
          } else {
            errorCount++;
            errors.push(`Failed to delete ${file.name || file.id}`);
          }
        } catch (error) {
          errorCount++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Failed to delete ${file.name || file.id}: ${errorMessage}`);
          console.error(`Error deleting file ${file.id}:`, error);
        }
      }

      if (successCount > 0) {
        toast.success(`Deleted ${successCount} file(s)${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
        setSelectedItemIds(new Set());
        await queryClient.invalidateQueries({ queryKey: ['all-files'] });
        await queryClient.refetchQueries({ queryKey: ['all-files'] });
      } else if (errorCount > 0) {
        toast.error(`Failed to delete ${errorCount} file(s). ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`);
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred while deleting files');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleFileAction = (action: string, item: File, type: 'file' | 'folder') => {
    if (action === 'delete') {
      const confirm = window.confirm(`Are you sure you want to delete ${item.name}?`);
      if (confirm) {
        fileService.deleteFile(item.id).then(async () => {
          await queryClient.invalidateQueries({ queryKey: ['all-files'] });
          await queryClient.refetchQueries({ queryKey: ['all-files'] });
        });
      }
    }
  };

  return (
    <DashboardLayout title="Recent" subtitle="Recently accessed files">
      <div className="space-y-6">
        <div className="flex items-center justify-end">
          {selectedItemIds.size > 0 && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleBulkDelete}
              disabled={isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete {selectedItemIds.size}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : allFiles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No recent files</p>
            </CardContent>
          </Card>
        ) : (
          <div className="h-[calc(100vh-300px)]">
            <FileListView
              folders={[]}
              files={allFiles}
              onFolderClick={() => {}}
              onFileClick={(file) => {
                setSelectedFile(file);
                setPreviewOpen(true);
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
          itemType="file"
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

