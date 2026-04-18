import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Profile, AppRole } from '@/types/database';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/apiService';
import { FileIcon, FolderIcon, History, FolderOpen, User, Mail, Shield, Calendar, ExternalLink, Copy, Check, Fingerprint, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatFileSize } from '@/lib/fileUtils';
import { cn } from '@/lib/utils';
import { activityService } from '@/services/activityService';
import { fileService } from '@/services/fileService';
import { PreviewModal } from '../preview/PreviewModal';
import { File as FileType } from '@/types/file';

interface UserDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: (Profile & { role: AppRole }) | null;
}

export function UserDetailsDialog({ open, onOpenChange, user }: UserDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<{ id: string | null; name: string }[]>([{ id: null, name: 'Root' }]);
  const [previewFile, setPreviewFile] = useState<FileType | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Reset navigation when user changes
  useEffect(() => {
    setCurrentFolderId(null);
    setBreadcrumb([{ id: null, name: 'Root' }]);
  }, [user?.id]);

  // Fetch user-specific files and folders
  const { data: userFiles = [], isLoading: filesLoading } = useQuery({
    queryKey: ['admin-user-files', user?.id],
    queryFn: () => user ? fileService.getAdminUserFiles(user.id) : Promise.resolve([]),
    enabled: !!user && activeTab === 'files',
  });

  const { data: userFolders = [], isLoading: foldersLoading } = useQuery({
    queryKey: ['admin-user-folders', user?.id],
    queryFn: () => user ? fileService.getAdminUserFolders(user.id) : Promise.resolve([]),
    enabled: !!user && activeTab === 'files',
  });

  // Fetch user-specific logs
  const { data: userLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['admin-user-logs', user?.id],
    queryFn: () => user ? activityService.getActivityLogs({ userId: user.id }) : Promise.resolve([]),
    enabled: !!user && activeTab === 'logs',
  });

  const userItems = [
    ...userFolders
      .filter(f => f.parent_folder_id === currentFolderId)
      .map(f => ({ ...f, type: 'folder' })),
    ...userFiles
      .filter(f => f.folder_id === currentFolderId)
      .map(f => ({ ...f, type: 'file' }))
  ];

  const handleFolderClick = (folder: any) => {
    setCurrentFolderId(folder.id);
    setBreadcrumb([...breadcrumb, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbClick = (index: number) => {
    const item = breadcrumb[index];
    setCurrentFolderId(item.id);
    setBreadcrumb(breadcrumb.slice(0, index + 1));
  };

  const handlePreviewFile = (file: FileType) => {
    setPreviewFile(file);
    setIsPreviewOpen(true);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[600px] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-primary/5 px-6 py-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-primary/20 bg-background">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback className="text-lg font-bold">{(user.full_name || 'U').charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight mb-1">{user.full_name}</DialogTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="h-5 text-[10px] font-bold uppercase tracking-wider bg-background">{user.role}</Badge>
                <div className="flex items-center gap-1.5 ml-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[11px] text-muted-foreground font-medium">Active Member</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 border border-muted-foreground/10 px-3 py-1.5 rounded-xl backdrop-blur-sm self-start mt-[-4px]">
             <div className="flex flex-col items-start pr-2 border-r border-muted-foreground/10">
                <span className="text-[9px] uppercase font-extrabold text-muted-foreground/50 tracking-wider h-3">User ID</span>
                <code className="text-[10px] font-mono text-muted-foreground/80 tracking-tight leading-none">{user.id.split('-')[0]}...{user.id.split('-').pop()}</code>
             </div>
             <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 rounded-lg hover:bg-background/80 hover:text-primary transition-all group"
                onClick={() => {
                   navigator.clipboard.writeText(user.id);
                   toast.success('ID copied to clipboard');
                }}
             >
                <Copy className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
             </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 bg-primary/5">
            <TabsList className="bg-transparent border-b h-11 w-full justify-start gap-4 rounded-none h-10 p-0">
              <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-11 px-0 font-bold text-[11px] uppercase tracking-wider">Overview</TabsTrigger>
              <TabsTrigger value="files" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-11 px-0 font-bold text-[11px] uppercase tracking-wider">Files & Folders</TabsTrigger>
              <TabsTrigger value="logs" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-11 px-0 font-bold text-[11px] uppercase tracking-wider">Activity History</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden p-6 bg-background">
            <ScrollArea className="h-full">
              <TabsContent value="overview" className="m-0 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-4">
                      <div className="flex items-start gap-3">
                         <div className="p-2 rounded-lg bg-muted"><Mail className="h-4 w-4 text-muted-foreground" /></div>
                         <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Email Address</p>
                            <p className="text-sm font-medium">{user.email}</p>
                         </div>
                      </div>
                      <div className="flex items-start gap-3">
                         <div className="p-2 rounded-lg bg-muted"><Calendar className="h-4 w-4 text-muted-foreground" /></div>
                         <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Member Since</p>
                            <p className="text-sm font-medium">{new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                         </div>
                      </div>
                   </div>
                   <div className="space-y-4 text-right">
                      {/* Placeholder for more metadata */}
                   </div>
                </div>

                <div className="rounded-xl border bg-muted/30 p-4">
                   <h4 className="text-[10px] uppercase font-bold text-muted-foreground mb-3 flex items-center gap-2">
                     <Shield className="h-3 w-3" /> Security & Access
                   </h4>
                   <div className="grid grid-cols-3 gap-4">
                      <div className="bg-background rounded-lg p-3 border border-border/50 text-center">
                         <p className="text-[9px] uppercase font-bold text-muted-foreground mb-1">Status</p>
                         <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-none h-5 text-[9px]">Active</Badge>
                      </div>
                      <div className="bg-background rounded-lg p-3 border border-border/50 text-center">
                         <p className="text-[9px] uppercase font-bold text-muted-foreground mb-1">Passcode</p>
                         <p className="text-[10px] font-bold">Encrypted</p>
                      </div>
                      <div className="bg-background rounded-lg p-3 border border-border/50 text-center">
                         <p className="text-[9px] uppercase font-bold text-muted-foreground mb-1">2FA</p>
                         <p className="text-[10px] font-bold text-muted-foreground">Disabled</p>
                      </div>
                   </div>
                </div>
              </TabsContent>

              <TabsContent value="files" className="m-0 space-y-4">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground/60 mb-2 overflow-x-auto no-scrollbar py-1">
                  {breadcrumb.map((item, index) => (
                    <div key={item.id || 'root'} className="flex items-center gap-1 shrink-0">
                      <button 
                        onClick={() => handleBreadcrumbClick(index)}
                        className={cn(
                          "hover:text-primary transition-colors",
                          index === breadcrumb.length - 1 && "text-foreground font-extrabold"
                        )}
                      >
                        {item.name}
                      </button>
                      {index < breadcrumb.length - 1 && <ChevronRight className="h-2.5 w-2.5 text-muted-foreground/80 mx-1" />}
                    </div>
                  ))}
                </div>

                {filesLoading || foldersLoading ? (
                  <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
                ) : userItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-50 bg-muted/10 rounded-xl border border-dashed">
                    <FolderOpen className="h-10 w-10 mb-2 opacity-20" />
                    <p className="text-[10px] font-bold uppercase tracking-wider">Empty Directory</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 px-0.5">
                    {userItems.map((item: any) => (
                      <div 
                        key={item.id} 
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-xl border bg-background hover:border-primary/30 hover:shadow-sm transition-all group",
                          item.type === 'folder' && "cursor-pointer active:scale-[0.98]"
                        )}
                        onClick={item.type === 'folder' ? () => handleFolderClick(item) : undefined}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            item.type === 'folder' ? "bg-amber-500/10" : "bg-blue-500/10"
                          )}>
                            {item.type === 'folder' ? <FolderIcon className="h-4 w-4 text-amber-500" /> : <FileIcon className="h-4 w-4 text-blue-500" />}
                          </div>
                          <div 
                            className="flex flex-col"
                            onClick={(e) => {
                              if (item.type === 'file') {
                                e.stopPropagation();
                                handlePreviewFile(item);
                              }
                            }}
                          >
                            <span className={cn(
                              "text-xs font-bold text-foreground/90",
                              item.type === 'file' && "hover:text-primary cursor-pointer transition-colors"
                            )}>{item.name}</span>
                            <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">
                              {item.type === 'folder' ? 'Folder' : formatFileSize(item.size || 0)}
                            </span>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.type === 'file') {
                              handlePreviewFile(item);
                            }
                          }}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="logs" className="m-0 space-y-4">
                {logsLoading ? (
                  <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
                ) : userLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-muted-foreground opacity-50">
                    <History className="h-10 w-10 mb-2" />
                    <p className="text-xs">No recent activity found</p>
                  </div>
                ) : (
                  <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-muted">
                    {userLogs.map((log) => (
                      <div key={log.id} className="relative pl-7 group">
                        <div className="absolute left-0 top-1 h-4 w-4 rounded-full border-2 border-muted bg-background z-10 group-hover:border-primary transition-colors flex items-center justify-center">
                           <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground group-hover:bg-primary" />
                        </div>
                        <div className="bg-muted/30 rounded-lg p-3 border group-hover:border-muted-foreground/30 transition-colors">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-tight text-foreground">{log.action_type || log.action}</span>
                            <span className="text-[9px] text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground line-clamp-2">{log.description || `${log.action_type} on ${log.resource_type}`}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </div>
        </Tabs>
        <PreviewModal 
          open={isPreviewOpen} 
          onOpenChange={setIsPreviewOpen} 
          file={previewFile} 
        />
      </DialogContent>
    </Dialog>
  );
}
