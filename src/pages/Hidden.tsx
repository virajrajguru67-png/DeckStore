import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fileService } from '@/services/fileService';
import { File, Folder } from '@/types/file';
import { Lock, Eye, EyeOff, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { hiddenService, PasswordType } from '@/services/hiddenService';
import { FileListView } from '@/components/file-explorer/FileListView';
import { PreviewModal } from '@/components/preview/PreviewModal';
import { BreadcrumbNav } from '@/components/file-explorer/BreadcrumbNav';

export default function Hidden() {
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordDigits, setPasswordDigits] = useState<string[]>(['', '', '', '']);
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [passwordType, setPasswordType] = useState<PasswordType>('4-digit');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordDigits, setNewPasswordDigits] = useState<string[]>(['', '', '', '']);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmPasswordDigits, setConfirmPasswordDigits] = useState<string[]>(['', '', '', '']);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showPasswordSettings, setShowPasswordSettings] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string | null; name: string }>>([]);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showLoginPin, setShowLoginPin] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  useEffect(() => {
    if (passwordType === '4-digit') {
      setPasswordDigits(['', '', '', '']);
      setNewPasswordDigits(['', '', '', '']);
      setConfirmPasswordDigits(['', '', '', '']);
    } else if (passwordType === '6-digit') {
      setPasswordDigits(['', '', '', '', '', '']);
      setNewPasswordDigits(['', '', '', '', '', '']);
      setConfirmPasswordDigits(['', '', '', '', '', '']);
    } else {
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [passwordType]);

  const handleDigitChange = (index: number, value: string, digits: string[], setDigits: (digits: string[]) => void) => {
    if (value.length > 1) return;
    if (value && !/^\d$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);
    if (value && index < digits.length - 1) {
      document.getElementById(`pin-${index + 1}`)?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent, digits: string[], setDigits: (digits: string[]) => void) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      document.getElementById(`pin-${index - 1}`)?.focus();
      const newDigits = [...digits];
      newDigits[index - 1] = '';
      setDigits(newDigits);
    }
  };

  useEffect(() => {
    const currentType = hiddenService.getPasswordType();
    if (currentType) {
      setPasswordDigits(currentType === '4-digit' ? ['', '', '', ''] : ['', '', '', '', '', '']);
    }
    if (hiddenService.isPasswordSet()) {
      setIsAuthenticated(false);
      setIsSettingPassword(false);
    } else {
      setIsSettingPassword(true);
    }
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const currentType = hiddenService.getPasswordType() || '4-digit';
    const enteredPassword = (currentType === '4-digit' || currentType === '6-digit') ? passwordDigits.join('') : password;

    if (hiddenService.verifyPassword(enteredPassword)) {
      setIsAuthenticated(true);
      toast.success('Access granted');
    } else {
      toast.error('Incorrect password');
      setPassword('');
      setPasswordDigits(currentType === '4-digit' ? ['', '', '', ''] : ['', '', '', '', '', '']);
    }
  };

  const handleSetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPassword = (passwordType === '4-digit' || passwordType === '6-digit') ? newPasswordDigits.join('') : newPassword;
    const finalConfirmPassword = (passwordType === '4-digit' || passwordType === '6-digit') ? confirmPasswordDigits.join('') : confirmPassword;

    if (!hiddenService.validatePassword(finalPassword, passwordType)) {
      toast.error('Invalid password format');
      return;
    }
    if (finalPassword !== finalConfirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    hiddenService.setPassword(finalPassword, passwordType);
    setIsSettingPassword(false);
    setIsAuthenticated(true);
    toast.success('Password set successfully');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    toast.info('Logged out from hidden page');
  };

  const handleFileAction = async (action: string, item: File | Folder, type: 'file' | 'folder') => {
    if (action === 'move-to-main') {
      const success = type === 'file' ? await fileService.toggleHiddenFile(item.id, false) : await fileService.toggleHiddenFolder(item.id, false);
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['hidden-files'] });
        queryClient.invalidateQueries({ queryKey: ['hidden-folders'] });
        toast.success(`Moved ${item.name} to main view`);
      }
    }
  };

  useEffect(() => {
    const loadBreadcrumbs = async () => {
      if (!currentFolderId) {
        setBreadcrumbs([]);
        return;
      }
      const path: Array<{ id: string | null; name: string }> = [];
      let folderId: string | null = currentFolderId;
      while (folderId) {
        const { data: folder } = await fileService.getFolderById(folderId);
        if (folder) {
          path.unshift({ id: folder.id, name: folder.name });
          folderId = (folder as any).parent_folder_id;
        } else break;
      }
      setBreadcrumbs(path);
    };
    loadBreadcrumbs();
  }, [currentFolderId]);

  const { data: hiddenFiles = [], isLoading: filesLoading } = useQuery({
    queryKey: ['hidden-files', currentFolderId],
    queryFn: async () => {
      const files = await fileService.getFiles(currentFolderId);
      return currentFolderId ? files : files.filter(f => f.metadata?.is_hidden === true);
    },
    enabled: isAuthenticated,
  });

  const { data: hiddenFolders = [], isLoading: foldersLoading } = useQuery({
    queryKey: ['hidden-folders', currentFolderId],
    queryFn: async () => {
      const folders = await fileService.getFolders(currentFolderId);
      return currentFolderId ? folders : folders.filter(f => (f as any).metadata?.is_hidden === true);
    },
    enabled: isAuthenticated,
  });

  if (!isAuthenticated && !isSettingPassword) {
    const currentType = hiddenService.getPasswordType() || '4-digit';
    const isPinMode = currentType === '4-digit' || currentType === '6-digit';
    return (
      <DashboardLayout title="Hidden" subtitle="Access your hidden files">
        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2"><Lock className="h-5 w-5 text-primary" /><CardTitle>Enter Password</CardTitle></div>
              <CardDescription>This page is password protected. Enter your password to continue.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Password</Label>
                  {isPinMode ? (
                    <div className="flex gap-2 justify-center">
                      {passwordDigits.map((digit, i) => (
                        <Input key={i} id={`pin-${i}`} type={showLoginPin ? "text" : "password"} inputMode="numeric" maxLength={1} value={digit}
                          onChange={(e) => handleDigitChange(i, e.target.value, passwordDigits, setPasswordDigits)}
                          onKeyDown={(e) => handleDigitKeyDown(i, e, passwordDigits, setPasswordDigits)}
                          className="w-12 h-12 text-center text-lg font-semibold" autoFocus={i === 0} />
                      ))}
                    </div>
                  ) : (
                    <Input type={showLoginPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" autoFocus />
                  )}
                </div>
                <Button type="submit" className="w-full">Access Hidden Files</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Hidden" subtitle="Your hidden files and folders">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-3xl font-bold">Hidden Files</h1><p className="text-muted-foreground">Files and folders you've hidden</p></div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleLogout}><EyeOff className="mr-2 h-4 w-4" />Lock</Button>
          </div>
        </div>
        <BreadcrumbNav items={breadcrumbs} onNavigate={setCurrentFolderId} />
        <div className="h-[calc(100vh-300px)]">
          <FileListView folders={hiddenFolders} files={hiddenFiles} onFolderClick={(f) => setCurrentFolderId(f.id)} onFileClick={setSelectedFile} onFileAction={handleFileAction} isHiddenPage={true} onSelectionChange={() => {}} />
        </div>
        <PreviewModal open={!!selectedFile} onOpenChange={() => setSelectedFile(null)} file={selectedFile} />
      </div>
    </DashboardLayout>
  );
}
