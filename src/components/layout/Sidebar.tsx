import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  Share2,
  Star,
  Trash2,
  Settings,
  Users,
  HardDrive,
  FileText,
  Boxes,
  Lock,
  FileEdit,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
  Layers,
  BarChart3
} from 'lucide-react';
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
  { label: 'Dashboard', href: '/', icon: <LayoutDashboard className="h-4 w-4" />, color: "text-sky-500" },
  { label: 'Files', href: '/files', icon: <FolderOpen className="h-4 w-4" />, color: "text-amber-500" },
  { label: 'Documents', href: '/documents', icon: <FileEdit className="h-4 w-4" />, color: "text-emerald-500" },
  { label: 'Analytics', href: '/analytics', icon: <BarChart3 className="h-4 w-4" />, color: "text-rose-500" },
  { label: 'Shared', href: '/shared', icon: <Share2 className="h-4 w-4" />, color: "text-violet-500" },
  { label: 'Favorites', href: '/favorites', icon: <Star className="h-4 w-4" />, color: "text-orange-400" },
  { label: 'Hidden', href: '/hidden', icon: <Lock className="h-4 w-4" />, color: "text-slate-400" },
  { label: 'Recycle Bin', href: '/trash', icon: <Trash2 className="h-4 w-4" />, color: "text-red-500" },
];

const adminItems: NavItem[] = [
  { label: 'Users', href: '/admin/users', icon: <Users className="h-4 w-4" />, roles: ['admin', 'owner'], color: "text-blue-500" },
  { label: 'Storage', href: '/admin/storage', icon: <HardDrive className="h-4 w-4" />, roles: ['admin', 'owner'], color: "text-cyan-500" },
  { label: 'Settings', href: '/admin/settings', icon: <Settings className="h-4 w-4" />, roles: ['admin', 'owner'], color: "text-zinc-500" },
  { label: 'Audit Logs', href: '/admin/audit', icon: <FileText className="h-4 w-4" />, roles: ['admin', 'owner'], color: "text-indigo-500" },
];

export function Sidebar() {
  const location = useLocation();
  const { role, isAtLeast } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
          'truncate transition-all duration-300 ml-3 text-sm whitespace-nowrap',
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
        "flex items-center h-14 border-b border-sidebar-border/50 px-3",
        isCollapsed ? "justify-center" : "justify-start gap-3"
      )}>
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 shadow-md shadow-indigo-500/20 shrink-0">
          <Layers className="h-5 w-5 text-white" />
        </div>
        {!isCollapsed && (
          <span className="font-bold text-base tracking-tight text-foreground">
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
                          'group flex items-center rounded-lg px-2.5 py-2 transition-all duration-200',
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
                              'group flex items-center rounded-lg px-2.5 py-2 transition-all duration-200',
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

      {/* Footer / Theme Toggle */}
      <div className={cn(
        "border-t border-sidebar-border/50 p-3",
        isCollapsed ? "flex justify-center" : ""
      )}>
        {isCollapsed ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-sidebar-accent">
                {mounted ? (
                  theme === 'dark' ? <Moon className="h-4 w-4" /> : theme === 'light' ? <Sun className="h-4 w-4" /> : <Monitor className="h-4 w-4" />
                ) : <Monitor className="h-4 w-4" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right">
              <DropdownMenuItem onClick={() => setTheme('light')}>Light</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}>Dark</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')}>System</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center justify-between bg-sidebar-accent/50 rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme('light')}
              className={cn(
                "flex-1 h-6 rounded-md text-[10px] hover:bg-background transition-all",
                theme === 'light' && "bg-background shadow-sm text-foreground"
              )}
            >
              <Sun className="h-3 w-3 mr-1.5" />
              Light
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme('dark')}
              className={cn(
                "flex-1 h-6 rounded-md text-[10px] hover:bg-background transition-all",
                theme === 'dark' && "bg-background shadow-sm text-foreground"
              )}
            >
              <Moon className="h-3 w-3 mr-1.5" />
              Dark
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme('system')}
              className={cn(
                "h-6 w-6 rounded-md ml-1 hover:bg-background transition-all",
                theme === 'system' && "bg-background shadow-sm text-foreground"
              )}
              title="System"
            >
              <Monitor className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}




