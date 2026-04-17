import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { Progress } from '@/components/ui/progress';
import { apiService } from '@/services/apiService';

export default function Storage() {
  const { data: storageData, isLoading } = useQuery({
    queryKey: ['admin-storage'],
    queryFn: async () => {
      try {
        const quotas = await apiService.get('/storage/all-quotas');
        const totalUsed = quotas?.reduce((sum: number, q: any) => sum + q.used_bytes, 0) || 0;
        const totalQuota = quotas?.reduce((sum: number, q: any) => sum + q.total_quota_bytes, 0) || 0;

        return {
          quotas: quotas || [],
          totalUsed,
          totalQuota,
        };
      } catch (err) {
        console.error('Failed to fetch storage quotas:', err);
        return { quotas: [], totalUsed: 0, totalQuota: 0 };
      }
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
                    value={(storageData.totalUsed / storageData.totalQuota) * 100 || 0}
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
              <CardDescription>Total active users with quotas</CardDescription>
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
                  const percentage = (quota.used_bytes / quota.total_quota_bytes) * 100 || 0;
                  return (
                    <div key={quota.id} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">
                          {quota.full_name || quota.email || quota.user_id}
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
