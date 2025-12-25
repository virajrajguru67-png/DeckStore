import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { File as FileIcon, Folder as FolderIcon, Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { File as FileType, Folder as FolderType } from '@/types/file';
import { PreviewModal } from '@/components/preview/PreviewModal';
import { fileService } from '@/services/fileService';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatFileSize } from '@/lib/fileUtils';

export default function Favorites() {
  const [selectedFile, setSelectedFile] = useState<FileType | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: favoriteFiles = [], isLoading: filesLoading } = useQuery({
    queryKey: ['favorite-files'],
    queryFn: () => fileService.getFavoriteFiles(),
  });

  const { data: favoriteFolders = [], isLoading: foldersLoading } = useQuery({
    queryKey: ['favorite-folders'],
    queryFn: () => fileService.getFavoriteFolders(),
  });

  const isLoading = filesLoading || foldersLoading;
  const allFavorites = [
    ...favoriteFolders.map(f => ({ ...f, type: 'folder' as const })),
    ...favoriteFiles.map(f => ({ ...f, type: 'file' as const }))
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
    }
  };

  return (
    <DashboardLayout title="Favorites" subtitle="Your favorite files and folders">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Favorites</h1>
          <p className="text-muted-foreground">Your favorite files and folders</p>
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {allFavorites.map((item) => (
              <Card
                key={item.id}
                className="cursor-pointer hover:shadow-md transition-shadow relative group"
                onClick={() => {
                  if (item.type === 'file') {
                    setSelectedFile(item as FileType);
                    setPreviewOpen(true);
                  }
                }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    {item.type === 'folder' ? (
                      <FolderIcon className="h-12 w-12 text-primary" />
                    ) : (
                      <FileIcon className="h-12 w-12 text-muted-foreground" />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(item, item.type);
                      }}
                    >
                      <Star
                        className={cn(
                          "h-4 w-4",
                          "fill-yellow-400 text-yellow-400"
                        )}
                      />
                    </Button>
                  </div>
                  <p className="font-medium truncate">{item.name}</p>
                  {item.type === 'file' && (
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize((item as FileType).size)}
                    </p>
                  )}
                  {item.type === 'folder' && (
                    <p className="text-sm text-muted-foreground">Folder</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <PreviewModal
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          file={selectedFile}
        />
      </div>
    </DashboardLayout>
  );
}

