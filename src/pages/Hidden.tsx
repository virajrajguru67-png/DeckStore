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
import { LocalSearchBar } from '@/components/ui/LocalSearchBar';
import { ChevronLeft, Grid3x3, List, MoreVertical, Plus, Trash2, Search, File as FileIcon, Folder as FolderIcon, Lock, Eye, EyeOff, Settings } from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/ui/DeleteConfirmationDialog';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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
      // Clear password state after successful login
      setPassword('');
      setPasswordDigits(currentType === '4-digit' ? ['', '', '', ''] : ['', '', '', '', '', '']);
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
    // Reset password state when locking
    const currentType = hiddenService.getPasswordType() || '4-digit';
    setPassword('');
    setPasswordDigits(currentType === '4-digit' ? ['', '', '', ''] : ['', '', '', '', '', '']);
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

  const handleNavigate = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    
    if (!folderId) {
      setBreadcrumbs([]);
    } else {
      const index = breadcrumbs.findIndex(b => b.id === folderId);
      if (index !== -1) {
        setBreadcrumbs(breadcrumbs.slice(0, index + 1));
      }
    }
  };

  const handleBack = () => {
    if (breadcrumbs.length > 0) {
      const parentId = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2].id : null;
      handleNavigate(parentId);
    }
  };

  const handleBulkDelete = () => {
    if (selectedItemIds.size > 0) {
      setDeleteDialogOpen(true);
    }
  };

  const confirmBulkDelete = async () => {
    setIsDeleting(true);
    try {
      for (const id of selectedItemIds) {
        // Find if it's a file or folder in our current data
        const isFile = hiddenFiles.some(f => f.id === id);
        if (isFile) await fileService.permanentlyDeleteFile(id);
        else await fileService.permanentlyDeleteFolder(id);
      }
      queryClient.invalidateQueries({ queryKey: ['hidden-files'] });
      queryClient.invalidateQueries({ queryKey: ['hidden-folders'] });
      setSelectedItemIds(new Set());
      setDeleteDialogOpen(false);
      toast.success('Selected items deleted permanently');
    } catch (err) {
      toast.error('Failed to delete some items');
    } finally {
      setIsDeleting(false);
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
    <DashboardLayout 
      title={currentFolderId ? breadcrumbs[breadcrumbs.length - 1]?.name || "Folder" : "Hidden"} 
      subtitle={currentFolderId ? "Exploring hidden folder contents" : "Your hidden files and folders"}
      leftAction={
        currentFolderId ? (
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={handleBack}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        ) : undefined
      }
      rightAction={
        <div className="flex items-center gap-2">
          {selectedItemIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={handleBulkDelete}
              disabled={isDeleting}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete ({selectedItemIds.size})
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-8 text-xs font-medium" onClick={handleLogout}>
            <EyeOff className="mr-1.5 h-3.5 w-3.5" />
            Lock
          </Button>
        </div>
      }
    >
      <div className="flex flex-col h-full bg-background overflow-hidden">
        <div className="px-6 py-2 border-b bg-muted/5 flex items-center justify-between">
          <LocalSearchBar onSearch={setSearchQuery} placeholder="Search hidden items..." className="max-w-md" />
        </div>

        {currentFolderId && (
          <BreadcrumbNav
            items={breadcrumbs}
            onNavigate={handleNavigate}
          />
        )}

        <div className="flex-1 overflow-hidden">
          {filesLoading || foldersLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
          ) : hiddenFiles.length === 0 && hiddenFolders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <Lock className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No hidden files</p>
              <p className="text-xs text-muted-foreground">
                Items you hide from the main view will appear here
              </p>
            </div>
          ) : (
            <div className="h-[calc(100vh-250px)]">
              <FileListView 
                folders={hiddenFolders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))} 
                files={hiddenFiles.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))} 
                onFolderClick={(f) => {
                  setCurrentFolderId(f.id);
                  const newBreadcrumbs = [...breadcrumbs];
                  newBreadcrumbs.push({ id: f.id, name: f.name });
                  setBreadcrumbs(newBreadcrumbs);
                }} 
                onFileClick={setSelectedFile} 
                onFileAction={handleFileAction} 
                isHiddenPage={true} 
                onSelectionChange={setSelectedItemIds} 
              />
            </div>
          )}
        </div>

        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={confirmBulkDelete}
          itemCount={selectedItemIds.size}
          itemType="item"
          isLoading={isDeleting}
        />

        <PreviewModal open={!!selectedFile} onOpenChange={() => setSelectedFile(null)} file={selectedFile} />
      </div>
    </DashboardLayout>
  );
}
