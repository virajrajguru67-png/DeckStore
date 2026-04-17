import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { shareService } from '@/services/shareService';
import { fileService } from '@/services/fileService';
import { PreviewModal } from '@/components/preview/PreviewModal';
import { File as FileType, Folder as FolderType } from '@/types/file';
import { Share } from '@/services/shareService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Folder, File as FileIcon, Lock, Download, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatFileSize } from '@/lib/fileUtils';
import { format } from 'date-fns';
import { ChatPanel } from '@/components/ai/ChatPanel';
import { MessageSquare, X as CloseIcon, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { apiService } from '@/services/apiService';

export default function SharedLink() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  const [share, setShare] = useState<Share | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [file, setFile] = useState<FileType | null>(null);
  const [folder, setFolder] = useState<FolderType | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [folderFiles, setFolderFiles] = useState<FileType[]>([]);
  const [folderFolders, setFolderFolders] = useState<FolderType[]>([]);
  const [branding, setBranding] = useState<{ logo: string | null, color: string }>({
    logo: null,
    color: '#0f172a'
  });

  useEffect(() => {
    if (!shareToken) {
      toast.error('Invalid share link');
      navigate('/');
      return;
    }

    loadShare();
  }, [shareToken]);

  const loadShare = async () => {
    if (!shareToken) return;

    setLoading(true);
    try {
      const shareData = await shareService.accessShare(shareToken);

      if (!shareData) {
        toast.error('Share link not found or expired');
        navigate('/');
        return;
      }

      // Check if password is required
      if (shareData.password_hash && !password) {
        setPasswordRequired(true);
        setLoading(false);
        return;
      }

      // If password provided, verify it
      if (shareData.password_hash && password) {
        const verifiedShare = await shareService.accessShare(shareToken, password);
        if (!verifiedShare) {
          toast.error('Incorrect password');
          setPassword('');
          return;
        }
        shareData.password_hash = null; // Clear password requirement after verification
      }

      setShare(shareData);
      setPasswordRequired(false);

      // Load the actual file or folder
      if (shareData.resource_type === 'file') {
        const { data: fileData } = await fileService.getFileById(shareData.resource_id);
        if (fileData) {
          setFile(fileData);
        }
      } else {
        // Load folder and its contents
        const { data: folderData } = await fileService.getFolderById(shareData.resource_id);
        if (folderData) {
          setFolder(folderData);
          const contents = await fileService.getFolderContents(shareData.resource_id);
          setFolderFiles(contents.files);
          setFolderFolders(contents.folders);
        }
      }

      // Fetch sharer's profile for branding (via apiService)
      try {
        const profile = await apiService.get(`/profiles/${shareData.shared_by}`);
        if (profile) {
          setBranding({
            logo: profile.custom_branding_logo_url,
            color: profile.custom_branding_color || '#0f172a'
          });
        }
      } catch (err) {
        console.warn('Could not load profile branding');
      }
    } catch (error) {
      console.error('Error loading share:', error);
      toast.error('Failed to load shared content');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await loadShare();
  };

  const handleDownload = async () => {
    if (!file || !share) return;

    if (share.access_level === 'view') {
      toast.error('Download not allowed for this share');
      return;
    }

    try {
      // Local API download
      const downloadUrl = `${import.meta.env.VITE_API_URL}/files/${file.id}/download`;
      window.open(downloadUrl, '_blank');
      toast.success('Download started');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading shared content...</p>
        </div>
      </div>
    );
  }

  if (passwordRequired) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-5 w-5 text-primary" />
              <CardTitle>Password Required</CardTitle>
            </div>
            <CardDescription>
              This shared link is password protected. Please enter the password to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Access Shared Content
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!share) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Share Not Found</CardTitle>
            <CardDescription>The share link you're looking for doesn't exist or has expired.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden" style={{ '--brand-primary': branding.color } as any}>
      {/* Branding Header */}
      <div className="w-full h-1 bg-[var(--brand-primary)]" />
      <div className="bg-background/80 backdrop-blur-md border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {branding.logo ? (
              <img src={branding.logo} alt="Brand Logo" className="h-8 object-contain" />
            ) : (
              <div className="h-8 w-8 bg-[var(--brand-primary)] rounded-lg flex items-center justify-center">
                <FileIcon className="h-5 w-5 text-white" />
              </div>
            )}
            <span className="font-bold">Viewer Portal</span>
          </div>
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-widest hidden sm:block">
            Powered by DeckStore
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-4 text-xs">
            <ArrowLeft className="mr-2 h-3 w-3" />
            Exit Portal
          </Button>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Shared Content</h1>
              <p className="text-muted-foreground">
                Document sharing secured with DeckStore Intelligence
              </p>
            </div>
            {share.access_level !== 'view' && file && (
              <Button onClick={handleDownload} variant="outline" className="rounded-full">
                <Download className="mr-2 h-4 w-4" />
                Download Original
              </Button>
            )}
          </div>
        </div>

        {file && (
          <Card className="hover:shadow-lg transition-shadow border-primary/10">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                  <FileIcon className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold truncate">{file.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(file.size)} • {file.updated_at ? format(new Date(file.updated_at), 'MMM d, yyyy') : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="lg"
                    className="rounded-full px-6 shadow-lg hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: 'var(--brand-primary)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
                    onClick={() => setPreviewOpen(true)}
                  >
                    Preview Deck
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {folder && (
          <Card className="border-primary/10">
            <CardHeader className="bg-accent/5 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[var(--brand-primary)]/10 rounded-lg">
                  <Folder className="h-6 w-6 text-[var(--brand-primary)]" />
                </div>
                <div>
                  <CardTitle>{folder.name}</CardTitle>
                  <CardDescription>
                    {folderFolders.length} folders, {folderFiles.length} files
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {folderFolders.length === 0 && folderFiles.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">This folder is empty</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {folderFolders.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-3 p-4 rounded-xl border bg-background hover:border-[var(--brand-primary)]/50 transition-colors shadow-sm cursor-not-allowed group"
                    >
                      <Folder className="h-5 w-5 text-[var(--brand-primary)]" />
                      <span className="font-medium truncate">{f.name}</span>
                    </div>
                  ))}
                  {folderFiles.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-3 p-4 rounded-xl border bg-background hover:shadow-md hover:border-[var(--brand-primary)]/50 transition-all cursor-pointer group"
                      onClick={() => {
                        setFile(f);
                        setPreviewOpen(true);
                      }}
                    >
                      <div className="h-10 w-10 bg-muted group-hover:bg-[var(--brand-primary)]/10 rounded-lg flex items-center justify-center transition-colors">
                        <FileIcon className="h-5 w-5 text-muted-foreground group-hover:text-[var(--brand-primary)]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate text-sm">{f.name}</p>
                        <p className="text-[10px] text-muted-foreground">{formatFileSize(f.size)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <PreviewModal
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          file={file}
        />

        {file && (
          <>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="fixed bottom-6 right-6 z-50"
            >
              <Button
                onClick={() => setChatOpen(!chatOpen)}
                className="h-14 w-14 rounded-full shadow-2xl p-0 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                {chatOpen ? <CloseIcon className="h-6 w-6 text-white" /> : <MessageSquare className="h-6 w-6 text-white" />}
              </Button>
            </motion.div>

            <AnimatePresence>
              {chatOpen && (
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="fixed top-0 right-0 h-full w-[400px] bg-background border-l shadow-2xl z-[60] flex flex-col p-6"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Deck Intelligence
                    </h3>
                    <Button variant="ghost" size="icon" onClick={() => setChatOpen(false)}>
                      <CloseIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <ChatPanel documentTitle={file.name} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
