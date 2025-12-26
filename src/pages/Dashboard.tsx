import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useStorageQuota } from '@/hooks/useStorageQuota';
import { useFiles } from '@/hooks/useFiles';
import { shareService } from '@/services/shareService';
import { fileService } from '@/services/fileService';
import { useQuery } from '@tanstack/react-query';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Clock, File as FileIcon } from 'lucide-react';
import { FileListView } from '@/components/file-explorer/FileListView';
import { File, Folder } from '@/types/file';
import { useState } from 'react';
import { PreviewModal } from '@/components/preview/PreviewModal';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const { quota, formatBytes, isLoading: quotaLoading } = useStorageQuota();
  const { files, folders } = useFiles(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data: sharedCount = 0 } = useQuery({
    queryKey: ['shared-count'],
    queryFn: async () => {
      const shares = await shareService.getUserShares();
      return shares.length;
    },
  });

  // Get recent files and folders (last 10 items sorted by updated_at)
  const { data: recentItems = { files: [], folders: [] }, isLoading: recentFilesLoading } = useQuery({
    queryKey: ['recent-items-dashboard'],
    queryFn: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { files: [], folders: [] };

        // Get all files (not just root files) sorted by updated_at
        const { data: allFiles, error: filesError } = await supabase
          .from('files')
          .select('*')
          .is('deleted_at', null)
          .eq('owner_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(50); // Get more to ensure we have enough after filtering

        if (filesError) {
          console.error('Error fetching recent files:', filesError);
        }

        // Get all folders (not just root folders) sorted by updated_at
        const { data: allFolders, error: foldersError } = await supabase
          .from('folders')
          .select('*')
          .is('deleted_at', null)
          .eq('owner_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(50); // Get more to ensure we have enough after filtering

        if (foldersError) {
          console.error('Error fetching recent folders:', foldersError);
        }

        // Filter out hidden files and folders
        const files = ((allFiles as File[]) || []).filter(file => !file.metadata?.is_hidden);
        const folders = ((allFolders as Folder[]) || []).filter(folder => !(folder as any).metadata?.is_hidden);

        // Combine and sort by updated_at (most recent first)
        const allItems = [
          ...files.map(f => ({ ...f, type: 'file' as const })),
          ...folders.map(f => ({ ...f, type: 'folder' as const }))
        ].sort((a, b) => {
          const dateA = new Date(a.updated_at || a.created_at).getTime();
          const dateB = new Date(b.updated_at || b.created_at).getTime();
          return dateB - dateA; // Most recent first
        }).slice(0, 10); // Get top 10 most recently updated items

        // Split back into files and folders
        const recentFiles: File[] = [];
        const recentFolders: Folder[] = [];

        for (const item of allItems) {
          if (item.type === 'file') {
            const { type, ...file } = item;
            recentFiles.push(file as File);
          } else {
            const { type, ...folder } = item;
            recentFolders.push(folder as Folder);
          }
        }

        return { files: recentFiles, folders: recentFolders };
      } catch (error) {
        console.error('Error fetching recent items:', error);
        return { files: [], folders: [] };
      }
    },
  });

  const quotaWarning = quota && quota.percentage > 80;
  const quotaCritical = quota && quota.percentage > 95;

  return (
    <DashboardLayout title="Dashboard" subtitle="Welcome to VaultNexus">
      <div className="space-y-4">
      

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

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
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

        {/* Recent Files & Folders Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Recent Files & Folders</CardTitle>
            </div>
            <CardDescription>Recently accessed or modified files and folders</CardDescription>
          </CardHeader>
          <CardContent>
            {recentFilesLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading recent items...</div>
            ) : recentItems.files.length === 0 && recentItems.folders.length === 0 ? (
              <div className="text-center py-12">
                <FileIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No recent files or folders</p>
              </div>
            ) : (
              <div className="h-[400px]">
                <FileListView
                  folders={recentItems.folders}
                  files={recentItems.files}
                  onFolderClick={(folder) => {
                    navigate(`/files?folder=${folder.id}`);
                  }}
                  onFileClick={(file) => {
                    setSelectedFile(file);
                    setPreviewOpen(true);
                  }}
                  onFileAction={() => {}}
                  onSelectionChange={() => {}}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <PreviewModal
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          file={selectedFile}
        />
      </div>
    </DashboardLayout>
  );
}

