import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { fileService } from '@/services/fileService';
import { Folder } from '@/types/file';
import { supabase } from '@/integrations/supabase/client';
import { Folder as FolderIcon, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MoveFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId?: string;
  folderId?: string;
  onMove: () => void;
}

export function MoveFileDialog({
  open,
  onOpenChange,
  fileId,
  folderId,
  onMove,
}: MoveFileDialogProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState<Folder[]>([]);

  useEffect(() => {
    if (open) {
      loadFolders(null);
      setSelectedFolderId(null);
      setCurrentPath([]);
    }
  }, [open]);

  const loadFolders = async (parentId: string | null) => {
    const fetchedFolders = await fileService.getFolders(parentId);
    setFolders(fetchedFolders);
  };

  const handleFolderClick = async (folder: Folder) => {
    setSelectedFolderId(folder.id);
    setCurrentPath([...currentPath, folder]);
    await loadFolders(folder.id);
  };

  const handleMove = async () => {
    if (!fileId && !folderId) return;

    setLoading(true);
    try {
      if (fileId) {
        await fileService.moveFile(fileId, selectedFolderId);
      } else if (folderId) {
        await fileService.moveFolder(folderId, selectedFolderId);
      }
      onMove();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateBack = async (index: number) => {
    const newPath = currentPath.slice(0, index + 1);
    setCurrentPath(newPath);
    const parentId = index >= 0 ? newPath[index].id : null;
    setSelectedFolderId(parentId);
    await loadFolders(parentId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move {fileId ? 'File' : 'Folder'}</DialogTitle>
          <DialogDescription>
            Select a destination folder or choose root level
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {/* Breadcrumb */}
          {currentPath.length > 0 && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
              <button
                onClick={() => handleNavigateBack(-1)}
                className="hover:text-foreground"
              >
                Root
              </button>
              {currentPath.map((folder, index) => (
                <div key={folder.id} className="flex items-center gap-1">
                  <ChevronRight className="h-4 w-4" />
                  <button
                    onClick={() => handleNavigateBack(index)}
                    className="hover:text-foreground"
                  >
                    {folder.name}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Folder list */}
          <div className="border rounded-lg p-2 max-h-64 overflow-y-auto">
            <button
              onClick={() => setSelectedFolderId(null)}
              className={cn(
                'w-full text-left p-2 rounded hover:bg-accent flex items-center gap-2',
                selectedFolderId === null && 'bg-accent'
              )}
            >
              <FolderIcon className="h-4 w-4" />
              Root Level
            </button>
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => handleFolderClick(folder)}
                className={cn(
                  'w-full text-left p-2 rounded hover:bg-accent flex items-center gap-2',
                  selectedFolderId === folder.id && 'bg-accent'
                )}
              >
                <FolderIcon className="h-4 w-4" />
                {folder.name}
              </button>
            ))}
            {folders.length === 0 && currentPath.length === 0 && (
              <p className="text-sm text-muted-foreground p-2">
                No folders available
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={loading}>
            {loading ? 'Moving...' : 'Move'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


