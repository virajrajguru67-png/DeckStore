import { useState, useEffect, useRef } from 'react';
import { File as FileType, Folder as FolderType } from '@/types/file';
import { Folder as FolderIcon, File as FileIcon, MoreVertical, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatFileSize } from '@/lib/fileUtils';
import { format } from 'date-fns';
import { fileService } from '@/services/fileService';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface FileListViewProps {
  folders: FolderType[];
  files: FileType[];
  onFolderClick: (folder: FolderType) => void;
  onFileClick: (file: FileType) => void;
  onFileAction: (action: string, item: FileType | FolderType, type: 'file' | 'folder') => void;
}

interface FolderCounts {
  [folderId: string]: { files: number; folders: number };
}

interface UserProfiles {
  [userId: string]: { full_name: string; email: string };
}

export function FileListView({ folders, files, onFolderClick, onFileClick, onFileAction }: FileListViewProps) {
  const [folderCounts, setFolderCounts] = useState<FolderCounts>({});
  const [userProfiles, setUserProfiles] = useState<UserProfiles>({});
  const fetchedUserIds = useRef<Set<string>>(new Set());
  const queryClient = useQueryClient();
  // Fetch folder counts for all folders
  useEffect(() => {
    const fetchFolderCounts = async () => {
      const counts: FolderCounts = {};
      for (const folder of folders) {
        const count = await fileService.getFolderCounts(folder.id);
        counts[folder.id] = count;
      }
      setFolderCounts(counts);
    };

    if (folders.length > 0) {
      fetchFolderCounts();
    } else {
      setFolderCounts({});
    }
  }, [folders]);

  // Fetch user profiles for owners
  useEffect(() => {
    const fetchUserProfiles = async () => {
      const userIds = new Set<string>();
      
      // Collect all unique user IDs
      folders.forEach(f => userIds.add(f.owner_id));
      files.forEach(f => userIds.add(f.owner_id));

      // Fetch profiles for user IDs we haven't fetched yet
      const profilesToFetch: string[] = [];
      for (const userId of userIds) {
        if (!fetchedUserIds.current.has(userId)) {
          profilesToFetch.push(userId);
          fetchedUserIds.current.add(userId);
        }
      }

      // Fetch missing profiles
      const newProfiles: UserProfiles = {};
      for (const userId of profilesToFetch) {
        const profile = await fileService.getUserProfile(userId);
        if (profile) {
          newProfiles[userId] = profile;
        }
      }

      // Update state with new profiles
      if (Object.keys(newProfiles).length > 0) {
        setUserProfiles(prev => ({ ...prev, ...newProfiles }));
      }
    };

    if (folders.length > 0 || files.length > 0) {
      fetchUserProfiles();
    }
  }, [folders, files]);

  const allItems = [
    ...folders.map(f => ({ ...f, type: 'folder' as const })),
    ...files.map(f => ({ ...f, type: 'file' as const }))
  ].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  const getModifiedBy = (ownerId: string): string => {
    const profile = userProfiles[ownerId];
    return profile?.full_name || profile?.email || 'Unknown';
  };

  const isFavorite = (item: FileType | FolderType): boolean => {
    if (item.type === 'file') {
      return (item as FileType).metadata?.is_favorite === true;
    }
    // For folders, check if metadata exists and has is_favorite
    return (item as any).metadata?.is_favorite === true;
  };

  const handleToggleFavorite = async (e: React.MouseEvent, item: FileType | FolderType) => {
    e.stopPropagation();
    const currentFavorite = isFavorite(item);
    let success = false;
    
    if (item.type === 'file') {
      success = await fileService.toggleFavoriteFile(item.id, !currentFavorite);
    } else {
      success = await fileService.toggleFavoriteFolder(item.id, !currentFavorite);
    }

    if (success) {
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['favorite-files'] });
      queryClient.invalidateQueries({ queryKey: ['favorite-folders'] });
    }
  };

  // Only show Items column if there are folders (folders can have items)
  // If there are only files, don't show the Items column
  const showItemsColumn = folders.length > 0;

  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30%]">Name</TableHead>
            {showItemsColumn && (
              <TableHead className="text-center">Items</TableHead>
            )}
            <TableHead className="text-right">Size</TableHead>
            <TableHead>Modified By</TableHead>
            <TableHead>Modified At</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allItems.map((item) => (
            <TableRow
              key={item.id}
              className="cursor-pointer hover:bg-accent/50"
              onClick={() => item.type === 'folder' ? onFolderClick(item as FolderType) : onFileClick(item as FileType)}
              onDoubleClick={() => item.type === 'folder' ? onFolderClick(item as FolderType) : onFileClick(item as FileType)}
            >
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
              {showItemsColumn && (
                <TableCell className="text-center text-muted-foreground">
                  {item.type === 'folder' && folderCounts[item.id] && 
                   (folderCounts[item.id].folders > 0 || folderCounts[item.id].files > 0) ? (
                    <span className="text-xs">
                      {folderCounts[item.id].folders} folders, {folderCounts[item.id].files} files
                    </span>
                  ) : null}
                </TableCell>
              )}
              <TableCell className="text-right text-muted-foreground">
                {item.type === 'file' ? formatFileSize((item as FileType).size) : '-'}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {getModifiedBy(item.owner_id)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {item.type === 'folder' 
                  ? format(new Date((item as FolderType).updated_at || (item as FolderType).created_at), 'MMM d, yyyy h:mm a')
                  : format(new Date((item as FileType).updated_at || (item as FileType).created_at), 'MMM d, yyyy h:mm a')
                }
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {item.type === 'file' && (
                      <DropdownMenuItem onClick={() => onFileClick(item as FileType)}>
                        Open
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={(e) => handleToggleFavorite(e, item)}>
                      {isFavorite(item) ? 'Remove from Favorites' : 'Mark as Favorite'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onFileAction('share', item, item.type)}>
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onFileAction('rename', item, item.type)}>
                      Rename
                    </DropdownMenuItem>
                    {item.type === 'file' && (
                      <DropdownMenuItem onClick={() => onFileAction('copy', item, item.type)}>
                        Copy
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onFileAction('move', item, item.type)}>
                      Move
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => onFileAction('delete', item, item.type)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

