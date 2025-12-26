import { useState } from 'react';
import { File as FileType, Folder as FolderType } from '@/types/file';
import { MoreVertical, Star, ExternalLink, Share2, Pencil, Copy, FolderOpen, Trash2, Lock } from 'lucide-react';
import { getFileIconComponentLarge } from '@/lib/fileUtils';
import { FolderIcon } from '@/components/ui/FolderIcon';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { formatFileSize } from '@/lib/fileUtils';
import { fileService } from '@/services/fileService';
import { useQueryClient } from '@tanstack/react-query';

interface FileGridViewProps {
  folders: FolderType[];
  files: FileType[];
  onFolderClick: (folder: FolderType) => void;
  onFileClick: (file: FileType) => void;
  onFileAction: (action: string, item: FileType | FolderType, type: 'file' | 'folder') => void;
  onSelectionChange?: (selectedIds: Set<string>) => void;
}

export function FileGridView({ folders, files, onFolderClick, onFileClick, onFileAction, onSelectionChange }: FileGridViewProps) {
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const allItems = [
    ...folders.map(f => ({ ...f, type: 'folder' as const })),
    ...files.map(f => ({ ...f, type: 'file' as const }))
  ];

  const handleSelectItem = (itemId: string, checked: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      if (onSelectionChange) {
        onSelectionChange(newSet);
      }
      return newSet;
    });
  };

  const isFavorite = (item: FileType | FolderType): boolean => {
    if ('metadata' in item && item.metadata) {
      return item.metadata.is_favorite === true;
    }
    return false;
  };

  const handleToggleFavorite = async (e: React.MouseEvent, item: FileType | FolderType) => {
    e.stopPropagation();
    const currentFavorite = isFavorite(item);
    let success = false;
    
    if ('mime_type' in item) {
      // It's a file
      success = await fileService.toggleFavoriteFile(item.id, !currentFavorite);
    } else {
      // It's a folder
      success = await fileService.toggleFavoriteFolder(item.id, !currentFavorite);
    }

    if (success) {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['favorite-files'] });
      queryClient.invalidateQueries({ queryKey: ['favorite-folders'] });
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-4">
      {folders.map((folder) => (
        <div
          key={folder.id}
          className={cn(
            "group relative flex flex-col items-center p-4 rounded-md border border-border hover:bg-accent/40 cursor-pointer transition-colors duration-100",
            selectedItems.has(folder.id) && "bg-accent/60"
          )}
          onClick={() => onFolderClick(folder)}
          onDoubleClick={() => onFolderClick(folder)}
        >
          <div className="relative w-full aspect-square flex items-center justify-center mb-2">
            <div className="absolute top-2 left-2 z-20" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={selectedItems.has(folder.id)}
                onCheckedChange={(checked) => handleSelectItem(folder.id, checked as boolean)}
              />
            </div>
            <FolderIcon size={64} />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 left-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
              onClick={(e) => handleToggleFavorite(e, folder)}
            >
              <Star
                className={cn(
                  "h-4 w-4",
                  isFavorite(folder) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                )}
              />
            </Button>
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => handleToggleFavorite(e, folder)}>
                    <Star className={cn("mr-2 h-4 w-4", isFavorite(folder) && "fill-yellow-400 text-yellow-400")} />
                    {isFavorite(folder) ? 'Remove from Favorites' : 'Mark as Favorite'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onFileAction('share', folder, 'folder')}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onFileAction('rename', folder, 'folder')}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onFileAction('move', folder, 'folder')}>
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Move
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onFileAction('hide', folder, 'folder')}>
                    <Lock className="mr-2 h-4 w-4" />
                    Move to Hidden
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={() => onFileAction('delete', folder, 'folder')}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <p className="text-sm font-medium text-center truncate w-full" title={folder.name}>
            {folder.name}
          </p>
          <p className="text-xs text-muted-foreground">Folder</p>
        </div>
      ))}

      {files.map((file) => (
        <div
          key={file.id}
          className={cn(
            "group relative flex flex-col items-center p-4 rounded-md border border-border hover:bg-accent/40 cursor-pointer transition-colors duration-100",
            selectedItems.has(file.id) && "bg-accent/60"
          )}
          onClick={() => onFileClick(file)}
          onDoubleClick={() => onFileClick(file)}
        >
          <div className="relative w-full aspect-square flex items-center justify-center mb-2">
            <div className="absolute top-2 left-2 z-20" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={selectedItems.has(file.id)}
                onCheckedChange={(checked) => handleSelectItem(file.id, checked as boolean)}
              />
            </div>
            {getFileIconComponentLarge(file.mime_type, file.name)}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 left-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
              onClick={(e) => handleToggleFavorite(e, file)}
            >
              <Star
                className={cn(
                  "h-4 w-4",
                  isFavorite(file) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                )}
              />
            </Button>
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onFileClick(file)}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => handleToggleFavorite(e, file)}>
                    <Star className={cn("mr-2 h-4 w-4", isFavorite(file) && "fill-yellow-400 text-yellow-400")} />
                    {isFavorite(file) ? 'Remove from Favorites' : 'Mark as Favorite'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onFileAction('share', file, 'file')}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onFileAction('rename', file, 'file')}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onFileAction('copy', file, 'file')}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onFileAction('move', file, 'file')}>
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Move
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onFileAction('hide', file, 'file')}>
                    <Lock className="mr-2 h-4 w-4" />
                    Move to Hidden
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={() => onFileAction('delete', file, 'file')}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <p className="text-sm font-medium text-center truncate w-full" title={file.name}>
            {file.name}
          </p>
          <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
        </div>
      ))}
    </div>
  );
}


