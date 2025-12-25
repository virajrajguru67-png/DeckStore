import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
      
      // Only try to fetch if Supabase is properly configured
      if (!SUPABASE_URL || SUPABASE_URL === 'https://placeholder.supabase.co') {
        return {
          total_quota_bytes: 10737418240, // 10GB default
          used_bytes: 0,
          percentage: 0,
        };
      }

      try {
        const { data: quota, error } = await supabase
          .from('storage_quotas')
          .select('total_quota_bytes, used_bytes')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching quota:', error);
          // Return default quota on error
          return {
            total_quota_bytes: 10737418240, // 10GB default
            used_bytes: 0,
            percentage: 0,
          };
        }

        if (!quota) {
          // Create default quota
          try {
            const { data: newQuota, error: insertError } = await supabase
              .from('storage_quotas')
              .insert({
                user_id: user.id,
                total_quota_bytes: 10737418240, // 10GB
                used_bytes: 0,
              })
              .select()
              .single();

            if (insertError) {
              console.error('Error creating quota:', insertError);
            }

            return {
              total_quota_bytes: newQuota?.total_quota_bytes || 10737418240,
              used_bytes: newQuota?.used_bytes || 0,
              percentage: 0,
            };
          } catch (err) {
            console.error('Error creating default quota:', err);
            return {
              total_quota_bytes: 10737418240,
              used_bytes: 0,
              percentage: 0,
            };
          }
        }

        return {
          total_quota_bytes: quota.total_quota_bytes,
          used_bytes: quota.used_bytes,
          percentage: (quota.used_bytes / quota.total_quota_bytes) * 100,
        };
      } catch (error) {
        console.error('Error in storage quota query:', error);
        return {
          total_quota_bytes: 10737418240,
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


