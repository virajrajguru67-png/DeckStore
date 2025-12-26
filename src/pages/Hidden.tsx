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
import { Lock, Eye, EyeOff, Settings, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { hiddenService, PasswordType } from '@/services/hiddenService';
import { FileListView } from '@/components/file-explorer/FileListView';
import { PreviewModal } from '@/components/preview/PreviewModal';
import { supabase } from '@/integrations/supabase/client';
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

  // Update password digits array when password type changes
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
    // Only allow single digit
    if (value.length > 1) return;
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;
    
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    // Auto-focus next input
    if (value && index < digits.length - 1) {
      const nextInput = document.getElementById(`pin-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent, digits: string[], setDigits: (digits: string[]) => void) => {
    // Handle backspace
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      const prevInput = document.getElementById(`pin-${index - 1}`);
      prevInput?.focus();
      const newDigits = [...digits];
      newDigits[index - 1] = '';
      setDigits(newDigits);
    }
  };

  // Check if password is already set on mount and initialize password digits
  useEffect(() => {
    const currentType = hiddenService.getPasswordType();
    if (currentType) {
      if (currentType === '4-digit') {
        setPasswordDigits(['', '', '', '']);
      } else if (currentType === '6-digit') {
        setPasswordDigits(['', '', '', '', '', '']);
      }
    }
    
    if (hiddenService.isPasswordSet()) {
      // Password is set, user needs to enter it
      setIsAuthenticated(false);
      setIsSettingPassword(false);
    } else {
      // No password set, user needs to set one
      setIsSettingPassword(true);
    }
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const currentType = hiddenService.getPasswordType() || '4-digit';
    let enteredPassword = '';
    
    if (currentType === '4-digit' || currentType === '6-digit') {
      enteredPassword = passwordDigits.join('');
    } else {
      enteredPassword = password;
    }

    if (hiddenService.verifyPassword(enteredPassword)) {
      setIsAuthenticated(true);
      setPassword('');
      setPasswordDigits(currentType === '4-digit' ? ['', '', '', ''] : currentType === '6-digit' ? ['', '', '', '', '', ''] : ['', '', '', '']);
      toast.success('Access granted');
    } else {
      toast.error('Incorrect password');
      setPassword('');
      setPasswordDigits(currentType === '4-digit' ? ['', '', '', ''] : currentType === '6-digit' ? ['', '', '', '', '', ''] : ['', '', '', '']);
    }
  };

  const handleSetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalPassword = '';
    if (passwordType === '4-digit' || passwordType === '6-digit') {
      finalPassword = newPasswordDigits.join('');
    } else {
      finalPassword = newPassword;
    }
    
    if (!hiddenService.validatePassword(finalPassword, passwordType)) {
      const message = passwordType === '4-digit' 
        ? 'Please enter a 4-digit password'
        : passwordType === '6-digit'
        ? 'Please enter a 6-digit password'
        : 'Password cannot be empty';
      toast.error(message);
      return;
    }

    let finalConfirmPassword = '';
    if (passwordType === '4-digit' || passwordType === '6-digit') {
      finalConfirmPassword = confirmPasswordDigits.join('');
    } else {
      finalConfirmPassword = confirmPassword;
    }

    if (finalPassword !== finalConfirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    hiddenService.setPassword(finalPassword, passwordType);
    setIsSettingPassword(false);
    setIsAuthenticated(true);
    setNewPassword('');
    setNewPasswordDigits(passwordType === '4-digit' ? ['', '', '', ''] : passwordType === '6-digit' ? ['', '', '', '', '', ''] : ['', '', '', '']);
    setConfirmPassword('');
    setConfirmPasswordDigits(passwordType === '4-digit' ? ['', '', '', ''] : passwordType === '6-digit' ? ['', '', '', '', '', ''] : ['', '', '', '']);
    toast.success('Password set successfully');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalPassword = '';
    if (passwordType === '4-digit' || passwordType === '6-digit') {
      finalPassword = newPasswordDigits.join('');
    } else {
      finalPassword = newPassword;
    }
    
    if (!hiddenService.validatePassword(finalPassword, passwordType)) {
      const message = passwordType === '4-digit' 
        ? 'Please enter a 4-digit password'
        : passwordType === '6-digit'
        ? 'Please enter a 6-digit password'
        : 'Password cannot be empty';
      toast.error(message);
      return;
    }

    let finalConfirmPassword = '';
    if (passwordType === '4-digit' || passwordType === '6-digit') {
      finalConfirmPassword = confirmPasswordDigits.join('');
    } else {
      finalConfirmPassword = confirmPassword;
    }

    if (finalPassword !== finalConfirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    hiddenService.setPassword(finalPassword, passwordType);
    setShowPasswordSettings(false);
    setNewPassword('');
    setNewPasswordDigits(passwordType === '4-digit' ? ['', '', '', ''] : passwordType === '6-digit' ? ['', '', '', '', '', ''] : ['', '', '', '']);
    setConfirmPassword('');
    setConfirmPasswordDigits(passwordType === '4-digit' ? ['', '', '', ''] : passwordType === '6-digit' ? ['', '', '', '', '', ''] : ['', '', '', '']);
    toast.success('Password changed successfully');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
    toast.info('Logged out from hidden page');
  };

  const handleFileAction = async (action: string, item: File | Folder, type: 'file' | 'folder') => {
    switch (action) {
      case 'move-to-main':
        // Unhide the file/folder (move it back to main)
        const success = type === 'file'
          ? await fileService.toggleHiddenFile(item.id, false)
          : await fileService.toggleHiddenFolder(item.id, false);
        if (success) {
          queryClient.invalidateQueries({ queryKey: ['hidden-files'] });
          queryClient.invalidateQueries({ queryKey: ['hidden-folders'] });
          queryClient.invalidateQueries({ queryKey: ['files'] });
          queryClient.invalidateQueries({ queryKey: ['folders'] });
        }
        break;
      default:
        toast.info(`${action} ${type}: ${item.name}`);
    }
  };

  const handleFolderClick = (folder: Folder) => {
    setCurrentFolderId(folder.id);
  };

  const handleNavigate = (folderId: string | null) => {
    setCurrentFolderId(folderId);
  };

  const handleBack = () => {
    if (breadcrumbs.length > 0) {
      const parentId = breadcrumbs[breadcrumbs.length - 2]?.id || null;
      setCurrentFolderId(parentId);
    } else {
      setCurrentFolderId(null);
    }
  };

  // Load breadcrumbs when folder changes
  useEffect(() => {
    let cancelled = false;

    const loadBreadcrumbs = async () => {
      if (!currentFolderId) {
        if (!cancelled) setBreadcrumbs([]);
        return;
      }

      const path: Array<{ id: string | null; name: string }> = [];
      let folderId = currentFolderId;

      while (folderId && !cancelled) {
        const { data: folder } = await supabase
          .from('folders')
          .select('id, name, parent_folder_id')
          .eq('id', folderId)
          .maybeSingle();

        if (folder) {
          path.unshift({ id: folder.id, name: folder.name });
          folderId = folder.parent_folder_id;
        } else {
          break;
        }
      }

      if (!cancelled) {
        setBreadcrumbs(path);
      }
    };

    if (currentFolderId) {
      loadBreadcrumbs();
    } else {
      setBreadcrumbs([]);
    }

    return () => {
      cancelled = true;
    };
  }, [currentFolderId]);

  // Get hidden files and folders for current folder
  const { data: hiddenFiles = [], isLoading: filesLoading } = useQuery({
    queryKey: ['hidden-files', currentFolderId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('files')
        .select('*')
        .is('deleted_at', null)
        .eq('owner_id', user.id);

      if (currentFolderId) {
        // Get ALL files in a hidden folder (they're hidden because the folder is hidden)
        query = query.eq('folder_id', currentFolderId);
        const { data, error } = await query;
        if (error) {
          console.error('Error fetching files in folder:', error);
          return [];
        }
        return (data as File[]) || [];
      } else {
        // Get root hidden files (folder_id IS NULL AND is_hidden = true)
        query = query.is('folder_id', null);
        const { data, error } = await query;
        if (error) {
          console.error('Error fetching root hidden files:', error);
          return [];
        }
        // Filter to only include hidden files at root level
        const files = (data as File[]) || [];
        return files.filter(file => file.metadata?.is_hidden === true);
      }
    },
    enabled: isAuthenticated,
  });

  const { data: hiddenFolders = [], isLoading: foldersLoading } = useQuery({
    queryKey: ['hidden-folders', currentFolderId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('folders')
        .select('*')
        .is('deleted_at', null)
        .eq('owner_id', user.id);

      if (currentFolderId) {
        // Get ALL folders in a hidden folder (they're hidden because the parent folder is hidden)
        query = query.eq('parent_folder_id', currentFolderId);
        const { data, error } = await query;
        if (error) {
          if (error.code === '42703') {
            return [];
          }
          console.error('Error fetching folders in folder:', error);
          return [];
        }
        return (data as Folder[]) || [];
      } else {
        // Get root hidden folders (parent_folder_id IS NULL AND is_hidden = true)
        query = query.is('parent_folder_id', null);
        const { data, error } = await query;
        if (error) {
          if (error.code === '42703') {
            return [];
          }
          console.error('Error fetching root hidden folders:', error);
          return [];
        }
        // Filter to only include hidden folders at root level
        const folders = (data as Folder[]) || [];
        return folders.filter(folder => (folder as any).metadata?.is_hidden === true);
      }
    },
    enabled: isAuthenticated,
  });

  const isLoading = filesLoading || foldersLoading;

  // If not authenticated and not setting password, show login form
  if (!isAuthenticated && !isSettingPassword) {
    const currentType = hiddenService.getPasswordType() || '4-digit';
    const isPinMode = currentType === '4-digit' || currentType === '6-digit';

    return (
      <DashboardLayout title="Hidden" subtitle="Access your hidden files">
        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-5 w-5 text-primary" />
                <CardTitle>Enter Password</CardTitle>
              </div>
              <CardDescription>
                This page is password protected. Enter your password to continue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Password</Label>
                  {isPinMode ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2 justify-center items-center">
                        {passwordDigits.map((digit, index) => (
                          <Input
                            key={index}
                            id={`pin-${index}`}
                            type={showLoginPin ? "text" : "password"}
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleDigitChange(index, e.target.value, passwordDigits, setPasswordDigits)}
                            onKeyDown={(e) => handleDigitKeyDown(index, e, passwordDigits, setPasswordDigits)}
                            className="w-12 h-12 text-center text-lg font-semibold border-2 border-gray-400 dark:border-gray-500"
                            autoFocus={index === 0}
                          />
                        ))}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-12 w-12"
                          onClick={() => setShowLoginPin(!showLoginPin)}
                        >
                          {showLoginPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <Input
                        id="password"
                        type={showLoginPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        autoFocus
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                      >
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}
                  {currentType === '4-digit' && (
                    <p className="text-xs text-muted-foreground text-center">Enter 4-digit PIN</p>
                  )}
                  {currentType === '6-digit' && (
                    <p className="text-xs text-muted-foreground text-center">Enter 6-digit PIN</p>
                  )}
                </div>
                <Button type="submit" className="w-full">
                  <Eye className="mr-2 h-4 w-4" />
                  Access Hidden Files
                </Button>
              </form>
              <div className="mt-4 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsSettingPassword(true);
                    setPassword('');
                    const currentType = hiddenService.getPasswordType() || '4-digit';
                    setPasswordDigits(currentType === '4-digit' ? ['', '', '', ''] : currentType === '6-digit' ? ['', '', '', '', '', ''] : ['', '', '', '']);
                  }}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // If setting password for the first time or changing password
  if (isSettingPassword || showPasswordSettings) {
    return (
      <DashboardLayout title="Hidden" subtitle="Set up password protection">
        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-5 w-5 text-primary" />
                <CardTitle>{isSettingPassword ? 'Set Password' : 'Change Password'}</CardTitle>
              </div>
              <CardDescription>
                Configure password protection for your hidden files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={isSettingPassword ? handleSetPassword : handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="passwordType">Password Type</Label>
                  <Select value={passwordType} onValueChange={(value) => setPasswordType(value as PasswordType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4-digit">4-Digit PIN</SelectItem>
                      <SelectItem value="6-digit">6-Digit PIN</SelectItem>
                      <SelectItem value="unlimited">Password</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  {(passwordType === '4-digit' || passwordType === '6-digit') ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2 justify-center items-center">
                        {newPasswordDigits.map((digit, index) => (
                          <Input
                            key={index}
                            id={`new-pin-${index}`}
                            type={showNewPin ? "text" : "password"}
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleDigitChange(index, e.target.value, newPasswordDigits, setNewPasswordDigits)}
                            onKeyDown={(e) => handleDigitKeyDown(index, e, newPasswordDigits, setNewPasswordDigits)}
                            className="w-12 h-12 text-center text-lg font-semibold border-2 border-gray-400 dark:border-gray-500"
                            autoFocus={index === 0}
                          />
                        ))}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-12 w-12"
                          onClick={() => setShowNewPin(!showNewPin)}
                        >
                          {showNewPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter password"
                        autoFocus
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}
                  {passwordType === '4-digit' && (
                    <p className="text-xs text-muted-foreground text-center">Enter 4 digits</p>
                  )}
                  {passwordType === '6-digit' && (
                    <p className="text-xs text-muted-foreground text-center">Enter 6 digits</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  {(passwordType === '4-digit' || passwordType === '6-digit') ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2 justify-center items-center">
                        {confirmPasswordDigits.map((digit, index) => (
                          <Input
                            key={index}
                            id={`confirm-pin-${index}`}
                            type={showConfirmPin ? "text" : "password"}
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleDigitChange(index, e.target.value, confirmPasswordDigits, setConfirmPasswordDigits)}
                            onKeyDown={(e) => handleDigitKeyDown(index, e, confirmPasswordDigits, setConfirmPasswordDigits)}
                            className="w-12 h-12 text-center text-lg font-semibold border-2 border-gray-400 dark:border-gray-500"
                          />
                        ))}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-12 w-12"
                          onClick={() => setShowConfirmPin(!showConfirmPin)}
                        >
                          {showConfirmPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {isSettingPassword ? 'Set Password' : 'Change Password'}
                  </Button>
                  {!isSettingPassword && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowPasswordSettings(false);
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Show hidden files and folders
  return (
    <DashboardLayout title="Hidden" subtitle="Your hidden files and folders">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Hidden Files</h1>
            <p className="text-muted-foreground">Files and folders you've hidden</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPasswordSettings(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Change Password
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <EyeOff className="mr-2 h-4 w-4" />
              Lock
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading hidden files...</div>
        ) : (
          <div className="space-y-4">
            {/* Breadcrumb Navigation - Always show */}
            <BreadcrumbNav
              items={currentFolderId ? breadcrumbs : []}
              onNavigate={handleNavigate}
            />
            {hiddenFiles.length === 0 && hiddenFolders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Lock className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {currentFolderId ? 'This folder is empty' : 'No hidden files or folders'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="h-[calc(100vh-300px)]">
                <FileListView
                  folders={hiddenFolders}
                  files={hiddenFiles}
                  onFolderClick={handleFolderClick}
                  onFileClick={(file) => {
                    setSelectedFile(file);
                    setPreviewOpen(true);
                  }}
                  onFileAction={handleFileAction}
                  onSelectionChange={() => {}}
                  isHiddenPage={true}
                />
              </div>
            )}
          </div>
        )}

        <PreviewModal
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          file={selectedFile}
        />
      </div>
    </DashboardLayout>
  );
}

