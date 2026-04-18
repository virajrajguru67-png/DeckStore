import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { DashboardIcon } from '@/components/ui/sidebar-icons/DashboardIcon';
import { FolderIcon } from '@/components/ui/sidebar-icons/FolderIcon';
import { DocumentsIcon } from '@/components/ui/sidebar-icons/DocumentsIcon';
import { AnalyticsIcon } from '@/components/ui/sidebar-icons/AnalyticsIcon';
import { SharedIcon } from '@/components/ui/sidebar-icons/SharedIcon';
import { FavoritesIcon } from '@/components/ui/sidebar-icons/FavoritesIcon';
import { HiddenIcon } from '@/components/ui/sidebar-icons/HiddenIcon';
import { RecycleBinIcon } from '@/components/ui/sidebar-icons/RecycleBinIcon';
import { UsersIcon } from '@/components/ui/sidebar-icons/UsersIcon';
import { StorageIcon } from '@/components/ui/sidebar-icons/StorageIcon';
import { SettingsIcon } from '@/components/ui/sidebar-icons/SettingsIcon';
import { AuditLogsIcon } from '@/components/ui/sidebar-icons/AuditLogsIcon';


import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  color?: string;
  roles?: ('viewer' | 'editor' | 'admin' | 'owner')[];
}

const primaryItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: <DashboardIcon size={16} />, color: "text-sky-500" },
  { label: 'Files', href: '/files', icon: <FolderIcon size={16} />, color: "text-amber-500" },
  { label: 'Documents', href: '/documents', icon: <DocumentsIcon size={16} />, color: "text-emerald-500" },
  { label: 'Analytics', href: '/analytics', icon: <AnalyticsIcon size={16} />, color: "text-rose-500" },
  { label: 'Shared', href: '/shared', icon: <SharedIcon size={16} />, color: "text-violet-500" },
  { label: 'Favorites', href: '/favorites', icon: <FavoritesIcon size={16} />, color: "text-orange-400" },
  { label: 'Hidden', href: '/hidden', icon: <HiddenIcon size={16} />, color: "text-slate-400" },
  { label: 'Recycle Bin', href: '/trash', icon: <RecycleBinIcon size={16} />, color: "text-red-500" },
  { label: 'Settings', href: '/settings', icon: <SettingsIcon size={16} />, color: "text-slate-400" },
];



const adminItems: NavItem[] = [
  { label: 'Users', href: '/admin/users', icon: <UsersIcon size={16} />, roles: ['admin', 'owner'], color: "text-blue-500" },
  { label: 'Storage', href: '/admin/storage', icon: <StorageIcon size={16} />, roles: ['admin', 'owner'], color: "text-cyan-500" },
  { label: 'Audit Logs', href: '/admin/audit', icon: <AuditLogsIcon size={16} />, roles: ['admin', 'owner'], color: "text-indigo-500" },
];



export function Sidebar() {
  const location = useLocation();
  const { role, isAtLeast } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth <= 1280);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Auto-collapse logic for document editor
    const isDocumentEditor = location.pathname.startsWith('/documents/') && location.pathname !== '/documents';
    
    const handleResize = () => {
      if (isDocumentEditor && window.innerWidth <= 1600) {
        setIsCollapsed(true);
      } else if (window.innerWidth <= 1280) {
        setIsCollapsed(true);
      } else if (window.innerWidth > 1600) {
        setIsCollapsed(false);
      }
    };

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [location.pathname]);

  const filteredPrimary = primaryItems;
  const filteredAdminItems = adminItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.some(r => role && isAtLeast(r));
  });

  const NavItemContent = ({ item, isActive }: { item: NavItem; isActive: boolean }) => (
    <>
      <div className={cn(
        'flex items-center justify-center shrink-0 transition-colors duration-300',
        isActive ? item.color : (item.color ? `${item.color} opacity-70 group-hover:opacity-100` : 'text-sidebar-foreground/70 group-hover:text-sidebar-foreground')
      )}>
        {item.icon}
      </div>
      {!isCollapsed && (
        <span className={cn(
          'truncate transition-all duration-300 ml-3 text-xs whitespace-nowrap',
          isActive && 'font-semibold'
        )}>
          {item.label}
        </span>
      )}
    </>
  );

  return (
    <div
      className={cn(
        "relative flex flex-col h-full border-r border-sidebar-border bg-sidebar-background/95 backdrop-blur-xl transition-all duration-300 ease-in-out shrink-0 z-50",
        isCollapsed ? "w-[60px]" : "w-56"
      )}
    >
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3.5 top-3.5 h-7 w-7 rounded-full border border-sidebar-border/40 bg-background shadow-sm z-50 hover:bg-accent hidden md:flex items-center justify-center p-0 opacity-70 hover:opacity-100 transition-opacity"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>

      {/* Logo Section */}
      <div className={cn(
        "flex items-center h-11 border-b border-sidebar-border/50 px-3",
        isCollapsed ? "justify-center" : "justify-start gap-2.5"
      )}>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-sm border border-slate-200 shrink-0 overflow-hidden">
          <img src="/favicon.svg" alt="DeckStore" className="h-4 w-4 object-contain" />
        </div>
        {!isCollapsed && (
          <span className="font-bold text-sm tracking-tight text-foreground">
            DeckStore
          </span>
        )}
      </div>

      <ScrollArea className="flex-1 py-3">
        <div className="px-2 space-y-4">
          <TooltipProvider delayDuration={0}>
            <nav className="space-y-1">
              {filteredPrimary.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Tooltip key={item.href} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Link
                        to={item.href}
                        className={cn(
                          'group flex items-center rounded-lg px-2.5 py-1.5 transition-all duration-200',
                          isActive
                            ? 'bg-primary/10 text-primary shadow-sm'
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        )}
                      >
                        <NavItemContent item={item} isActive={isActive} />
                      </Link>
                    </TooltipTrigger>
                    {isCollapsed && (
                      <TooltipContent side="right" className="font-medium">
                        {item.label}
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </nav>


            {filteredAdminItems.length > 0 && (
              <>
                {!isCollapsed && (
                  <div className="px-3">
                    <Separator className="my-2 bg-sidebar-border/50" />
                    <h3 className="mb-2 mt-4 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/40">
                      Administration
                    </h3>
                  </div>
                )}
                {isCollapsed && <Separator className="my-3 bg-sidebar-border/50" />}
                <nav className="space-y-1">
                  {filteredAdminItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <Tooltip key={item.href} delayDuration={0}>
                        <TooltipTrigger asChild>
                          <Link
                            to={item.href}
                            className={cn(
                              'group flex items-center rounded-lg px-2.5 py-1.5 transition-all duration-200',
                              isActive
                                ? 'bg-primary/10 text-primary shadow-sm'
                                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                            )}
                          >
                            <NavItemContent item={item} isActive={isActive} />
                          </Link>
                        </TooltipTrigger>
                        {isCollapsed && (
                          <TooltipContent side="right" className="font-medium">
                            {item.label}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    );
                  })}
                </nav>
              </>
            )}
          </TooltipProvider>
        </div>
      </ScrollArea>


    </div>
  );
}




