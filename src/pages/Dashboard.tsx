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
import { LocalSearchBar } from '@/components/ui/LocalSearchBar';
import { PreviewModal } from '@/components/preview/PreviewModal';
import { Button } from '@/components/ui/button';



import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const { quota, formatBytes, isLoading: quotaLoading } = useStorageQuota();
  const { files: rootFiles, folders: rootFolders } = useFiles(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');


  const { data: sharedCount = 0 } = useQuery({
    queryKey: ['shared-count'],
    queryFn: async () => {
      const shares = await shareService.getUserShares();
      return shares.length;
    },
  });

  const { data: recentItems = { files: [], folders: [] }, isLoading: recentFilesLoading } = useQuery({
    queryKey: ['recent-items-dashboard'],
    queryFn: async () => {
      try {
        const files = await fileService.getFiles();
        const folders = await fileService.getFolders();
        
        // Combine and sort by updated_at (most recent first)
        const allItems = [
          ...files.map(f => ({ ...f, type: 'file' as const })),
          ...folders.map(f => ({ ...f, type: 'folder' as const }))
        ].sort((a, b) => {
          const dateA = new Date(a.updated_at || a.created_at).getTime();
          const dateB = new Date(b.updated_at || b.created_at).getTime();
          return dateB - dateA;
        }).slice(0, 10);

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
              <div className="text-xl font-semibold">{rootFiles.length}</div>
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <FileIcon className="h-3.5 w-3.5 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-300 group cursor-pointer" onClick={() => navigate('/files')}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Folders</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-xl font-semibold">{rootFolders.length}</div>
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <FolderIcon className="h-3.5 w-3.5 text-primary" />
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

        <Card className="border-border/40 shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="border-b border-border/40 bg-muted/20 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/0 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                  <div className="relative flex items-center justify-center h-12 w-12 rounded-xl bg-background border border-border/50 shadow-sm group-hover:border-primary/30 transition-colors duration-300">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
                    Recent Activity
                  </CardTitle>
                  <CardDescription className="text-sm font-medium text-muted-foreground/80 flex items-center gap-1.5">
                    <span className="h-1.1 w-1.1 rounded-full bg-primary/40 block" />
                    Recently accessed files and folders
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <LocalSearchBar onSearch={setSearchQuery} />
                <Button variant="ghost" size="sm" className="hidden lg:flex text-primary hover:text-primary hover:bg-primary/5 font-semibold text-xs py-0 h-9" onClick={() => navigate('/recent')}>
                  View All
                </Button>
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
              <div className="min-h-[300px]">
                <FileListView
                  folders={recentItems.folders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))}
                  files={recentItems.files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))}
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
