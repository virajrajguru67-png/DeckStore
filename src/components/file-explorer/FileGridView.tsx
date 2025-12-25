import { File as FileType, Folder as FolderType } from '@/types/file';
import { Folder, File as FileIcon, MoreVertical, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
}

export function FileGridView({ folders, files, onFolderClick, onFileClick, onFileAction }: FileGridViewProps) {
  const queryClient = useQueryClient();

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
          className="group relative flex flex-col items-center p-4 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors"
          onClick={() => onFolderClick(folder)}
          onDoubleClick={() => onFolderClick(folder)}
        >
          <div className="relative w-full aspect-square flex items-center justify-center mb-2">
            <Folder className="h-16 w-16 text-primary" />
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
                  <DropdownMenuItem onClick={() => onFileAction('share', folder, 'folder')}>
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onFileAction('rename', folder, 'folder')}>
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onFileAction('move', folder, 'folder')}>
                    Move
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={() => onFileAction('delete', folder, 'folder')}
                  >
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
          className="group relative flex flex-col items-center p-4 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors"
          onClick={() => onFileClick(file)}
          onDoubleClick={() => onFileClick(file)}
        >
          <div className="relative w-full aspect-square flex items-center justify-center mb-2">
            <FileIcon className="h-16 w-16 text-muted-foreground" />
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
                    Open
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onFileAction('share', file, 'file')}>
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onFileAction('rename', file, 'file')}>
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onFileAction('copy', file, 'file')}>
                    Copy
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onFileAction('move', file, 'file')}>
                    Move
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={() => onFileAction('delete', file, 'file')}
                  >
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


