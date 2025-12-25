import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/types/database';
import {
  LayoutDashboard,
  FolderOpen,
  Share2,
  Clock,
  Star,
  Trash2,
  Search,
  Settings,
  Users,
  HardDrive,
  FileText,
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
  { label: 'Recent', href: '/recent', icon: <Clock className="h-full w-full" /> },
  { label: 'Favorites', href: '/favorites', icon: <Star className="h-full w-full" /> },
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
    <div className="flex h-full w-64 flex-col border-r border-sidebar-border/60 bg-sidebar">
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border/60 px-6 bg-sidebar-accent/40">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 overflow-hidden p-1">
          <FolderOpen className="h-full w-full text-primary" />
        </div>
        <span className="font-bold text-sidebar-foreground tracking-tight text-base">Deck Store</span>
      </div>

      <ScrollArea className="flex-1 px-4 py-5">
        <nav className="space-y-1">
          {filteredPrimary.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <div className="flex h-5 w-5 items-center justify-center">{item.icon}</div>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {filteredAdminItems.length > 0 && (
          <>
            <Separator className="my-6" />
            <div className="px-3 py-2">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
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
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-foreground'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                      )}
                    >
                      <div className="flex h-5 w-5 items-center justify-center">{item.icon}</div>
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </>
        )}
      </ScrollArea>
    </div>
  );
}

