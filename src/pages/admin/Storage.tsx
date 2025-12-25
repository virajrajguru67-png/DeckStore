import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';

export default function Storage() {
  const { data: storageData, isLoading } = useQuery({
    queryKey: ['admin-storage'],
    queryFn: async () => {
      const { data: quotas } = await supabase
        .from('storage_quotas')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            email
          )
        `);

      const totalUsed = quotas?.reduce((sum, q) => sum + q.used_bytes, 0) || 0;
      const totalQuota = quotas?.reduce((sum, q) => sum + q.total_quota_bytes, 0) || 0;

      return {
        quotas: quotas || [],
        totalUsed,
        totalQuota,
      };
    },
  });

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <DashboardLayout title="Storage" subtitle="Storage usage and quota management">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Storage Management</h1>
          <p className="text-muted-foreground">Monitor and manage storage usage</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Total Storage</CardTitle>
              <CardDescription>System-wide storage usage</CardDescription>
            </CardHeader>
            <CardContent>
              {storageData && (
                <>
                  <Progress
                    value={(storageData.totalUsed / storageData.totalQuota) * 100}
                    className="mb-2"
                  />
                  <p className="text-sm text-muted-foreground">
                    {formatBytes(storageData.totalUsed)} / {formatBytes(storageData.totalQuota)}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>Total active users</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{storageData?.quotas.length || 0}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Storage Breakdown</CardTitle>
            <CardDescription>Storage usage per user</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <div className="space-y-4">
                {storageData?.quotas.map((quota: any) => {
                  const percentage = (quota.used_bytes / quota.total_quota_bytes) * 100;
                  return (
                    <div key={quota.id} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">
                          {quota.profiles?.full_name || quota.user_id}
                        </span>
                        <span className="text-muted-foreground">
                          {formatBytes(quota.used_bytes)} / {formatBytes(quota.total_quota_bytes)}
                        </span>
                      </div>
                      <Progress value={percentage} />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


