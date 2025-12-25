import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { shareService } from '@/services/shareService';
import { fileService } from '@/services/fileService';
import { PreviewModal } from '@/components/preview/PreviewModal';
import { File as FileType, Folder as FolderType } from '@/types/file';
import { Share } from '@/services/shareService';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Folder, File as FileIcon, Lock, Download, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatFileSize } from '@/lib/fileUtils';
import { format } from 'date-fns';

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
        const files = await fileService.getFiles(null);
        const foundFile = files.find(f => f.id === shareData.resource_id);
        if (foundFile) {
          setFile(foundFile);
        } else {
          // Try to fetch directly from database
          const { data } = await supabase
            .from('files')
            .select('*')
            .eq('id', shareData.resource_id)
            .single();
          if (data) {
            setFile(data as FileType);
          }
        }
      } else {
        // Load folder and its contents
        const folders = await fileService.getFolders(null);
        const foundFolder = folders.find(f => f.id === shareData.resource_id);
        if (foundFolder) {
          setFolder(foundFolder);
          // Load folder contents
          const folderFiles = await fileService.getFiles(foundFolder.id);
          const folderFolders = await fileService.getFolders(foundFolder.id);
          setFolderFiles(folderFiles);
          setFolderFolders(folderFolders);
        } else {
          // Try to fetch directly from database
          const { data } = await supabase
            .from('folders')
            .select('*')
            .eq('id', shareData.resource_id)
            .single();
          if (data) {
            setFolder(data as FolderType);
            const folderFiles = await fileService.getFiles(data.id);
            const folderFolders = await fileService.getFolders(data.id);
            setFolderFiles(folderFiles);
            setFolderFolders(folderFolders);
          }
        }
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
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.storage
        .from('files')
        .createSignedUrl(file.storage_key, 3600);

      if (error || !data) {
        toast.error('Failed to generate download link');
        return;
      }

      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Shared Content</h1>
              <p className="text-muted-foreground">
                {share.resource_type === 'file' ? 'File' : 'Folder'} shared with you
              </p>
            </div>
            {share.access_level !== 'view' && file && (
              <Button onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            )}
          </div>
        </div>

        {file && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <FileIcon className="h-12 w-12 text-primary" />
                <div className="flex-1">
                  <h2 className="text-xl font-semibold">{file.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(file.size)} • {format(new Date(file.updated_at), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="flex gap-2">
                  {share.access_level !== 'view' && (
                    <Button variant="outline" onClick={handleDownload}>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  )}
                  <Button onClick={() => setPreviewOpen(true)}>
                    View
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {folder && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Folder className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle>{folder.name}</CardTitle>
                  <CardDescription>
                    {folderFolders.length} folders, {folderFiles.length} files
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {folderFolders.length === 0 && folderFiles.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">This folder is empty</p>
              ) : (
                <div className="space-y-2">
                  {folderFolders.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 cursor-not-allowed"
                    >
                      <Folder className="h-5 w-5 text-primary" />
                      <span className="font-medium">{f.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">Folder</span>
                    </div>
                  ))}
                  {folderFiles.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer"
                      onClick={() => {
                        setFile(f);
                        setPreviewOpen(true);
                      }}
                    >
                      <FileIcon className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{f.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{formatFileSize(f.size)}</span>
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
      </div>
    </div>
  );
}

