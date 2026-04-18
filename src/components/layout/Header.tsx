import { Bell, Moon, Sun, Monitor, FolderOpen, User, LogOut, Wifi, WifiOff } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOfflineSync } from '@/contexts/OfflineSyncContext';
import { useNotifications } from '@/hooks/useNotifications';
import { SearchBar } from '@/components/search/SearchBar';
import { useNavigate } from 'react-router-dom';


import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface HeaderProps {
  title: string;
  subtitle?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  titleElement?: React.ReactNode;
}

export function Header({ title, subtitle, leftAction, rightAction, titleElement }: HeaderProps) {

  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { profile, signOut } = useAuth();
  const { isOnline, isSyncing } = useOfflineSync();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getPageIcon = () => {
    const path = location.pathname;
    return <FolderOpen className="h-4 w-4" />;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-11 items-center justify-between px-4 gap-4">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {leftAction ? (
            leftAction
          ) : (
            <div className="flex items-center justify-center w-6 h-6 text-primary shrink-0">
              {getPageIcon()}
            </div>
          )}
          
          <div className="min-w-0 flex-1">
            {titleElement ? (
              titleElement
            ) : (
              <>
                <h1 className="text-xs font-semibold text-foreground truncate">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {subtitle}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {rightAction ? (
           <div className="hidden md:flex items-center gap-2">
             {rightAction}
           </div>
        ) : (
          <div className="flex-1 max-w-md hidden md:block">
            <SearchBar />
          </div>
        )}



        {/* Mobile Search - just an icon maybe, or keep generic if responsive logic handles it. Keeping generic for now but ensuring alignment */}

        <div className="flex items-center gap-2 shrink-0">
          {!isOnline && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-2 bg-muted/50 rounded-full py-0.5">
              <WifiOff className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Offline</span>
            </div>
          )}

          {/* Theme toggle removed (moved to sidebar) */}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-7 w-7 hover:bg-accent transition-colors duration-100"
              >
                <Bell className="h-3.5 w-3.5" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[10px] font-semibold"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="px-3 py-2 border-b border-border">
                <h3 className="font-semibold text-sm">Notifications</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  notifications.slice(0, 10).map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className="flex flex-col items-start p-3 cursor-pointer hover:bg-accent transition-colors duration-100"
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3 w-full">
                        {!notification.read_at && (
                          <div className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{notification.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notification.message}</p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-1.5 h-7 px-1.5">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {profile?.full_name?.charAt(0).toUpperCase() || <User className="h-3 w-3" />}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:block text-xs">{profile?.full_name || 'User'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
                <p className="text-xs text-muted-foreground">{profile?.email || ''}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

