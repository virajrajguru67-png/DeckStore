import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fileService } from '@/services/fileService';
import { File, Folder } from '@/types/file';

export function useFiles(folderId: string | null = null, options?: { refetchInterval?: number }) {
  const queryClient = useQueryClient();

  const filesQuery = useQuery({
    queryKey: ['files', folderId],
    queryFn: () => fileService.getFiles(folderId),
    refetchInterval: options?.refetchInterval,
    refetchOnWindowFocus: true,
  });

  const foldersQuery = useQuery({
    queryKey: ['folders', folderId],
    queryFn: () => fileService.getFolders(folderId),
    refetchInterval: options?.refetchInterval,
    refetchOnWindowFocus: true,
  });

  const refresh = () => {
    // Invalidate queries for the current folderId
    queryClient.invalidateQueries({ queryKey: ['files', folderId] });
    queryClient.invalidateQueries({ queryKey: ['folders', folderId] });
    // Also refetch immediately
    queryClient.refetchQueries({ queryKey: ['files', folderId] });
    queryClient.refetchQueries({ queryKey: ['folders', folderId] });
  };

  return {
    files: filesQuery.data || [],
    folders: foldersQuery.data || [],
    isLoading: filesQuery.isLoading || foldersQuery.isLoading,
    error: filesQuery.error || foldersQuery.error,
    refresh,
  };
}


