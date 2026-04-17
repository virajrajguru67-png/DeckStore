import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor, User, Shield, HardDrive, Lock, Bell, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { profileService } from '@/services/profileService';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

const RealisticSun = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <g filter="url(#sun-glow)">
      <circle cx="12" cy="12" r="5" fill="url(#sun-gradient)" />
      <path d="M12 2V4M12 20V22M4 12H2M22 12H20M19.07 4.93L17.66 6.34M6.34 17.66L4.93 19.07M19.07 19.07L17.66 17.66L6.34 6.34L4.93 4.93" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </g>
    <defs>
      <radialGradient id="sun-gradient" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(12 12) rotate(90) scale(5)">
        <stop stopColor="#FDB813" />
        <stop offset="1" stopColor="#F8941C" />
      </radialGradient>
      <filter id="sun-glow" x="0" y="0" width="24" height="24" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feGaussianBlur stdDeviation="1" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
  </svg>
);

const RealisticMoon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="url(#moon-gradient)" stroke="currentColor" strokeWidth="1" />
    <circle cx="15" cy="15" r="1.5" fill="rgba(255,255,255,0.1)" />
    <circle cx="11" cy="18" r="1" fill="rgba(255,255,255,0.1)" />
    <defs>
      <linearGradient id="moon-gradient" x1="21" y1="3" x2="11.21" y2="12.79" gradientUnits="userSpaceOnUse">
        <stop stopColor="#DDD" />
        <stop offset="1" stopColor="#888" />
      </linearGradient>
    </defs>
  </svg>
);

const RealisticSystem = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="2" y="3" width="20" height="14" rx="2" fill="url(#screen-gradient)" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8 21H16M12 17V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M2 3L22 17" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
    <defs>
      <linearGradient id="screen-gradient" x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#6366f1" />
        <stop offset="1" stopColor="#a855f7" />
      </linearGradient>
    </defs>
  </svg>
);

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { user, role, profile, refreshProfile } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [fullName, setFullName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'storage' | 'security' | 'notifications'>('profile');

  useEffect(() => {
    setMounted(true);
    if (profile?.full_name) {
      setFullName(profile.full_name);
    } else if (user?.full_name) {
      setFullName(user.full_name);
    }
  }, [profile, user]);

  if (!mounted) return null;

  const handleUpdateSetting = async (field: string, value: any) => {
    setIsSaving(true);
    const success = await profileService.updateProfile({ [field]: value });
    if (success) {
      await refreshProfile?.();
    }
    setIsSaving(false);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    const success = await profileService.updateProfile({ full_name: fullName });
    if (success) {
      await refreshProfile?.();
    }
    setIsSaving(false);
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('Please fill in both password fields');
      return;
    }
    setIsSaving(true);
    const success = await profileService.changePassword(currentPassword, newPassword);
    if (success) {
      setCurrentPassword('');
      setNewPassword('');
    }
    setIsSaving(false);
  };

  const themes = [
    { id: 'light', label: 'Light', icon: RealisticSun, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { id: 'dark', label: 'Dark', icon: RealisticMoon, color: 'text-blue-200', bg: 'bg-blue-900/10' },
    { id: 'system', label: 'System', icon: RealisticSystem, color: 'text-slate-500', bg: 'bg-slate-500/10' },
  ];


  const tabs = [
    { id: 'profile', label: 'Personal Info', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Shield },
    { id: 'storage', label: 'Storage', icon: HardDrive },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <DashboardLayout title="Settings" subtitle="Standard user preferences">
      <div className="flex flex-col lg:flex-row gap-0 min-h-[calc(100vh-120px)] bg-background">

        {/* Sidebar Nav */}
        <aside className="w-full lg:w-56 shrink-0 border-r border-border/50 bg-muted/5">
          <nav className="flex lg:flex-col gap-0 p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors lg:w-full text-left",
                    isActive
                      ? "bg-primary/5 text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {isActive && <div className="ml-auto w-1 h-4 bg-primary rounded-full hidden lg:block" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-8 lg:p-12">
          <div className="max-w-xl space-y-12 animate-in fade-in duration-300">

            {activeTab === 'profile' && (
              <div className="space-y-8">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold tracking-tight text-foreground">My Profile</h2>
                  <p className="text-sm text-muted-foreground">Keep your personal information up to date.</p>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground ml-0.5">Full Name</Label>
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="h-10 px-3 text-sm rounded-lg border-border/60 focus:ring-0 focus:border-primary transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground ml-0.5">Email Address</Label>
                      <div className="h-10 flex items-center px-3 rounded-lg bg-muted/40 text-[13px] font-medium text-muted-foreground/80 border border-border/40">
                        {user?.email}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground ml-0.5">User Role : </Label>
                      <div className="inline-flex h-7 items-center px-3 rounded-md bg-muted text-[10px] font-bold uppercase tracking-widest text-muted-foreground border border-border/40">
                        {role}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-start">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      variant="default"
                      className="px-6 h-9 text-xs font-bold rounded-lg"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-8">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold tracking-tight text-foreground">Appearance</h2>
                  <p className="text-sm text-muted-foreground">Manage how DeckStore looks on your device.</p>
                </div>

                <div className="space-y-4">
                  <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground/70">Theme Mode</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {themes.map((t) => {
                      const Icon = t.icon;
                      const isActive = theme === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setTheme(t.id)}
                          className={cn(
                            "flex items-center gap-3 p-3.5 rounded-xl border transition-all",
                            isActive
                              ? "border-primary bg-primary/[0.02] ring-1 ring-primary/20"
                              : "border-border/60 bg-background hover:border-border hover:bg-muted/30"
                          )}
                        >
                          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center bg-muted/50", isActive && "text-primary")}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className={cn("text-xs font-semibold", isActive ? "text-primary" : "text-foreground")}>
                            {t.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'storage' && (
              <div className="space-y-8">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold tracking-tight text-foreground">Storage Management</h2>
                  <p className="text-sm text-muted-foreground">Monitor and manage your file storage quota.</p>
                </div>

                <div className="space-y-6">
                  <div className="p-6 rounded-xl border border-border/60 bg-muted/5">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-bold">Storage Usage</Label>
                      <span className="text-xs font-medium text-muted-foreground">1.2 GB of 10 GB used</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-[12%] rounded-full" />
                    </div>
                    <p className="mt-4 text-xs text-muted-foreground">You are using 12% of your available storage.</p>
                  </div>

                  <Button variant="outline" className="h-9 px-4 text-xs font-bold rounded-lg hover:bg-primary/5 hover:text-primary transition-colors">
                    Request More Storage
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-8">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold tracking-tight text-foreground">Security Settings</h2>
                  <p className="text-sm text-muted-foreground">Control your account security and authentication.</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground">Current Password</Label>
                      <div className="relative">
                        <Input
                          type={showCurrentPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="h-10 text-sm rounded-lg pr-10 border-border/60 focus:ring-0 focus:border-primary transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground">New Password</Label>
                      <div className="relative">
                        <Input
                          type={showNewPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="h-10 text-sm rounded-lg pr-10 border-border/60 focus:ring-0 focus:border-primary transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-border/60 bg-muted/5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold">Two-Factor Authentication</p>
                      <p className="text-xs text-muted-foreground">Add an extra layer of security to your account.</p>
                    </div>
                    <div
                      onClick={() => handleUpdateSetting('two_factor_enabled', !profile?.two_factor_enabled)}
                      className={cn("h-6 w-11 rounded-full relative p-1 cursor-pointer transition-colors", profile?.two_factor_enabled ? "bg-primary" : "bg-muted")}
                    >
                      <div className={cn("h-4 w-4 bg-white rounded-full transition-transform shadow-sm", profile?.two_factor_enabled ? "translate-x-5" : "translate-x-0")} />
                    </div>
                  </div>

                  <Button
                    onClick={handlePasswordChange}
                    disabled={isSaving}
                    className="h-9 px-6 text-xs font-bold rounded-lg"
                  >
                    {isSaving ? 'Updating...' : 'Update Security'}
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-8">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold tracking-tight text-foreground">Notifications</h2>
                  <p className="text-sm text-muted-foreground">Choose when and how you want to be notified.</p>
                </div>

                <div className="space-y-4">
                  {[
                    { id: 'notification_email', title: 'Email Notifications', desc: 'Receive daily activity digests via email.' },
                    { id: 'notification_push', title: 'Push Notifications', desc: 'Real-time alerts for shared files and comments.' },
                    { id: 'notification_weekly', title: 'Weekly Reports', desc: 'Summary of file activity and storage usage.' }
                  ].map((item, i) => {
                    const isEnabled = profile?.[item.id as keyof typeof profile] ?? (item.id === 'notification_weekly' ? false : true);
                    return (
                      <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-border/40 hover:bg-muted/5 transition-colors">
                        <div className="space-y-0.5">
                          <p className="text-sm font-bold text-foreground">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                        <div
                          onClick={() => handleUpdateSetting(item.id, !isEnabled)}
                          className={cn("h-6 w-11 rounded-full relative p-1 cursor-pointer transition-colors", isEnabled ? "bg-primary" : "bg-muted")}
                        >
                          <div className={cn("h-4 w-4 bg-white rounded-full transition-transform shadow-sm", isEnabled ? "translate-x-5" : "translate-x-0")} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </DashboardLayout>

  );
}
