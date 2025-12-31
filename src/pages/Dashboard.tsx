import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useStorageQuota } from '@/hooks/useStorageQuota';
import { useFiles } from '@/hooks/useFiles';
import { shareService } from '@/services/shareService';
import { fileService } from '@/services/fileService';
import { useQuery } from '@tanstack/react-query';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Clock, File as FileIcon, Folder as FolderIcon, Share2 } from 'lucide-react';
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
          .select('*, folders(deleted_at)')
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

        // Filter out hidden files and files in deleted folders
        const files = ((allFiles as any[]) || []).filter(file => {
          const isHidden = file.metadata?.is_hidden;
          // Check if parent folder is deleted (if it exists)
          const isParentDeleted = file.folders && file.folders.deleted_at;
          return !isHidden && !isParentDeleted;
        });

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
      <div className="space-y-6">


        {quotaWarning && (
          <Alert variant={quotaCritical ? "destructive" : "default"} className="animate-slide-down border shadow-sm">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {quotaCritical
                ? 'Storage quota is critical! Please free up space.'
                : 'Storage quota is getting high. Consider cleaning up unused files.'}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-md transition-shadow duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Storage Used</CardTitle>
            </CardHeader>
            <CardContent>
              {quota ? (
                <>
                  <div className="text-2xl font-bold">{formatBytes(quota?.used_bytes || 0)} <span className="text-xs text-muted-foreground font-normal">/ {formatBytes(quota?.total_quota_bytes || 0)}</span></div>
                  <Progress value={quota.percentage} className="mt-3 h-2" />
                </>
              ) : (
                <div className="text-2xl font-bold">Loading...</div>
              )}
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-300 group cursor-pointer" onClick={() => navigate('/files')}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Files</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-2xl font-bold">{files.length}</div>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <FileIcon className="h-4 w-4 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-300 group cursor-pointer" onClick={() => navigate('/files')}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Folders</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-2xl font-bold">{folders.length}</div>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <FolderIcon className="h-4 w-4 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-300 group cursor-pointer" onClick={() => navigate('/shared')}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Shared</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-2xl font-bold">{sharedCount}</div>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Share2 className="h-4 w-4 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Files & Folders Section */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                  <CardDescription>Recently accessed files and folders</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2">
            {recentFilesLoading ? (
              <div className="text-center py-12 text-muted-foreground animate-pulse">Loading recent items...</div>
            ) : recentItems.files.length === 0 && recentItems.folders.length === 0 ? (
              <div className="text-center py-16 flex flex-col items-center">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <FileIcon className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-medium text-foreground">No recent activity</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-1">Start uploading or creating files to see them here.</p>
              </div>
            ) : (
              // Using a slightly customized view - maybe grid or list depending on preference.
              // Reusing FileListView but it might need better styling if it looks too plain. 
              // Given the instruction for "stylish", let's ensure FileListView is good or wrap it well.
              // Assuming FileListView renders rows. We'll wrap it in a cleaner container.
              <div className="min-h-[300px]">
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
                  onFileAction={() => { }}
                  onSelectionChange={() => { }}
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

