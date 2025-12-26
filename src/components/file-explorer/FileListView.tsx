import { useState, useEffect, useRef } from 'react';
import { File as FileType, Folder as FolderType } from '@/types/file';
import { MoreVertical, Star, ExternalLink, Share2, Pencil, Copy, FolderOpen, Trash2, Lock, Unlock } from 'lucide-react';
import { getFileIconComponent } from '@/lib/fileUtils';
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
  onSelectionChange?: (selectedIds: Set<string>) => void;
  isHiddenPage?: boolean;
}

interface FolderCounts {
  [folderId: string]: { files: number; folders: number };
}

interface UserProfiles {
  [userId: string]: { full_name: string; email: string };
}

export function FileListView({ folders, files, onFolderClick, onFileClick, onFileAction, onSelectionChange, isHiddenPage = false }: FileListViewProps) {
  const [folderCounts, setFolderCounts] = useState<FolderCounts>({});
  const [userProfiles, setUserProfiles] = useState<UserProfiles>({});
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
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

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    const newSet = checked ? new Set(allItems.map(item => item.id)) : new Set<string>();
    setSelectedItems(newSet);
    if (onSelectionChange) {
      onSelectionChange(newSet);
    }
  };

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

  const isAllSelected = allItems.length > 0 && selectedItems.size === allItems.length;
  const isIndeterminate = selectedItems.size > 0 && selectedItems.size < allItems.length;

  return (
    <div className="relative h-full overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background border-b border-border">
          <TableRow className="hover:bg-transparent border-b-0">
            <TableHead className="h-10 px-4 w-[50px]">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                className={cn(
                  isIndeterminate && "border-primary bg-primary/20"
                )}
              />
            </TableHead>
            <TableHead className="h-10 px-4 font-semibold text-xs text-muted-foreground">Name</TableHead>
            {showItemsColumn && (
              <TableHead className="h-10 px-4 font-semibold text-xs text-muted-foreground text-center">Items</TableHead>
            )}
            <TableHead className="h-10 px-4 font-semibold text-xs text-muted-foreground text-right">Size</TableHead>
            <TableHead className="h-10 px-4 font-semibold text-xs text-muted-foreground">Owner</TableHead>
            <TableHead className="h-10 px-4 font-semibold text-xs text-muted-foreground">Modified</TableHead>
            <TableHead className="h-10 px-4 w-[40px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allItems.map((item) => (
            <TableRow
              key={item.id}
              className={cn(
                "cursor-pointer hover:bg-accent/40 border-b border-border/50 transition-colors duration-100 group",
                selectedItems.has(item.id) && "bg-accent/60"
              )}
              onClick={() => {
                // Allow folders to open even when selected, files only open when not selected
                if (item.type === 'folder') {
                  onFolderClick(item as FolderType);
                } else if (!selectedItems.has(item.id)) {
                  onFileClick(item as FileType);
                }
              }}
              onDoubleClick={() => item.type === 'folder' ? onFolderClick(item as FolderType) : onFileClick(item as FileType)}
            >
              <TableCell className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedItems.has(item.id)}
                  onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                />
              </TableCell>
              <TableCell className="px-4 py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  {item.type === 'folder' ? (
                    <FolderIcon className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <div className="shrink-0">
                      {getFileIconComponent((item as FileType).mime_type, (item as FileType).name, 'sm')}
                    </div>
                  )}
                  <span className="text-sm font-medium truncate">{item.name}</span>
                </div>
              </TableCell>
              {showItemsColumn && (
                <TableCell className="px-4 py-2.5 text-center text-muted-foreground">
                  {item.type === 'folder' && folderCounts[item.id] && 
                   (folderCounts[item.id].folders > 0 || folderCounts[item.id].files > 0) ? (
                    <span className="text-xs tabular-nums">
                      {folderCounts[item.id].folders} folders, {folderCounts[item.id].files} files
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/50">-</span>
                  )}
                </TableCell>
              )}
              <TableCell className="px-4 py-2.5 text-right text-muted-foreground">
                <span className="text-xs tabular-nums">
                {item.type === 'file' ? formatFileSize((item as FileType).size) : '-'}
                </span>
              </TableCell>
              <TableCell className="px-4 py-2.5 text-muted-foreground">
                <span className="text-xs truncate max-w-[120px] block">
                {getModifiedBy(item.owner_id)}
                </span>
              </TableCell>
              <TableCell className="px-4 py-2.5 text-muted-foreground">
                <span className="text-xs tabular-nums">
                {item.type === 'folder' 
                    ? format(new Date((item as FolderType).updated_at || (item as FolderType).created_at), 'MMM d, yyyy')
                    : format(new Date((item as FileType).updated_at || (item as FileType).created_at), 'MMM d, yyyy')
                }
                </span>
              </TableCell>
              <TableCell className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
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
                    {item.type === 'file' && (
                      <DropdownMenuItem onClick={() => onFileClick(item as FileType)}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={(e) => handleToggleFavorite(e, item)}>
                      <Star className={cn("mr-2 h-4 w-4", isFavorite(item) && "fill-yellow-400 text-yellow-400")} />
                      {isFavorite(item) ? 'Remove from Favorites' : 'Mark as Favorite'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onFileAction('share', item, item.type)}>
                        <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onFileAction('rename', item, item.type)}>
                        <Pencil className="mr-2 h-4 w-4" />
                      Rename
                    </DropdownMenuItem>
                    {item.type === 'file' && (
                      <DropdownMenuItem onClick={() => onFileAction('copy', item, item.type)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onFileAction('move', item, item.type)}>
                        <FolderOpen className="mr-2 h-4 w-4" />
                      Move
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onFileAction(isHiddenPage ? 'move-to-main' : 'hide', item, item.type)}>
                        {isHiddenPage ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
                      {isHiddenPage ? 'Move to Main' : 'Move to Hidden'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-destructive focus:text-destructive"
                      onClick={() => onFileAction('delete', item, item.type)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
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

