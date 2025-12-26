import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/types/database';
import {
  LayoutDashboard,
  FolderOpen,
  Share2,
  Star,
  Trash2,
  Search,
  Settings,
  Users,
  HardDrive,
  FileText,
  Boxes,
  Lock,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: ('viewer' | 'editor' | 'admin' | 'owner')[];
}

const primaryItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: <LayoutDashboard className="h-full w-full" /> },
  { label: 'Files', href: '/files', icon: <FolderOpen className="h-full w-full" /> },
  { label: 'Shared', href: '/shared', icon: <Share2 className="h-full w-full" /> },
  { label: 'Favorites', href: '/favorites', icon: <Star className="h-full w-full" /> },
  { label: 'Hidden', href: '/hidden', icon: <Lock className="h-full w-full" /> },
  { label: 'Recycle Bin', href: '/trash', icon: <Trash2 className="h-full w-full" /> },
];

const adminItems: NavItem[] = [
  { label: 'Users', href: '/admin/users', icon: <Users className="h-full w-full" />, roles: ['admin', 'owner'] },
  { label: 'Storage', href: '/admin/storage', icon: <HardDrive className="h-full w-full" />, roles: ['admin', 'owner'] },
  { label: 'Settings', href: '/admin/settings', icon: <Settings className="h-full w-full" />, roles: ['admin', 'owner'] },
  { label: 'Audit Logs', href: '/admin/audit', icon: <FileText className="h-full w-full" />, roles: ['admin', 'owner'] },
];

export function Sidebar() {
  const location = useLocation();
  const { role, isAtLeast } = useAuth();

  const filteredPrimary = primaryItems;

  const filteredAdminItems = adminItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.some(r => role && isAtLeast(r));
  });

  return (
    <div className="flex h-full w-64 flex-col border-r border-sidebar-border/60 bg-sidebar backdrop-blur-sm">
      {/* Logo/Brand Section */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border/60 px-6 bg-gradient-to-r from-sidebar-accent/30 to-transparent">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 shadow-lg shadow-primary/10">
          <Boxes className="h-5 w-5 text-primary" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sidebar-foreground text-base tracking-tight leading-tight">VaultNexus</span>
          <span className="text-[10px] text-sidebar-foreground/50 font-medium uppercase tracking-wider">File Management</span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-3 py-4">
          <nav className="space-y-1">
            {filteredPrimary.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-primary/10 text-primary shadow-sm shadow-primary/5 border border-primary/20'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground hover:translate-x-0.5'
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-primary" />
                  )}
                  <div className={cn(
                    'flex h-5 w-5 items-center justify-center shrink-0 transition-transform duration-150',
                    isActive ? 'text-primary' : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground group-hover:scale-110'
                  )}>
                    {item.icon}
                  </div>
                  <span className={cn(
                    'transition-all duration-150',
                    isActive && 'font-semibold'
                  )}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {filteredAdminItems.length > 0 && (
            <>
              <Separator className="my-4 mx-2 bg-sidebar-border/40" />
              <div className="px-1">
                <h3 className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/40 mb-3">
                  Administration
                </h3>
                <nav className="space-y-1">
                  {filteredAdminItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        className={cn(
                          'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                          isActive
                            ? 'bg-primary/10 text-primary shadow-sm shadow-primary/5 border border-primary/20'
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground hover:translate-x-0.5'
                        )}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-primary" />
                        )}
                        <div className={cn(
                          'flex h-5 w-5 items-center justify-center shrink-0 transition-transform duration-150',
                          isActive ? 'text-primary' : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground group-hover:scale-110'
                        )}>
                          {item.icon}
                        </div>
                        <span className={cn(
                          'transition-all duration-150',
                          isActive && 'font-semibold'
                        )}>
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

