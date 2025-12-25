import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useStorageQuota } from '@/hooks/useStorageQuota';
import { useFiles } from '@/hooks/useFiles';
import { shareService } from '@/services/shareService';
import { useQuery } from '@tanstack/react-query';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const { quota, formatBytes, isLoading: quotaLoading } = useStorageQuota();
  const { files, folders } = useFiles(null);

  const { data: sharedCount = 0 } = useQuery({
    queryKey: ['shared-count'],
    queryFn: async () => {
      const shares = await shareService.getUserShares();
      return shares.length;
    },
  });

  const quotaWarning = quota && quota.percentage > 80;
  const quotaCritical = quota && quota.percentage > 95;

  return (
    <DashboardLayout title="Dashboard" subtitle="Welcome to Deck Store">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your file storage</p>
        </div>

        {quotaWarning && (
          <Alert variant={quotaCritical ? "destructive" : "default"}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {quotaCritical
                ? 'Storage quota is critical! Please free up space.'
                : 'Storage quota is getting high. Consider cleaning up unused files.'}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Storage Used</CardTitle>
              <CardDescription>
                {quotaLoading ? 'Loading...' : `${formatBytes(quota?.used_bytes || 0)} / ${formatBytes(quota?.total_quota_bytes || 0)}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {quota && (
                <>
                  <Progress value={quota.percentage} className="mb-2" />
                  <p className="text-2xl font-bold">{quota.percentage.toFixed(1)}%</p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Files</CardTitle>
              <CardDescription>Total files</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{files.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Folders</CardTitle>
              <CardDescription>Total folders</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{folders.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Shared</CardTitle>
              <CardDescription>Active shares</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{sharedCount}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

