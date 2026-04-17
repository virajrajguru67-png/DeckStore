import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/apiService';
import { useAuth } from '@/contexts/AuthContext';

export interface StorageQuota {
  total_quota_bytes: number;
  used_bytes: number;
  percentage: number;
}

export function useStorageQuota() {
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['storage-quota', user?.id],
    queryFn: async () => {
      if (!user) return null;
      try {
        const quota = await apiService.get('/storage/quota');
        return {
          total_quota_bytes: quota.total_quota_bytes,
          used_bytes: quota.used_bytes,
          percentage: (quota.used_bytes / quota.total_quota_bytes) * 100,
        };
      } catch (error) {
        console.error('Error fetching quota:', error);
        return {
          total_quota_bytes: 10737418240, // 10GB default
          used_bytes: 0,
          percentage: 0,
        };
      }
    },
    enabled: !!user,
  });

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return {
    quota: data,
    isLoading,
    refetch,
    formatBytes,
  };
}
