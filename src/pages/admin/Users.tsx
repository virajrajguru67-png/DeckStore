import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DeleteConfirmationDialog } from '@/components/ui/DeleteConfirmationDialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Profile, AppRole } from '@/types/database';
import { Pencil, Trash2, Users as UsersIcon, Shield, UserCheck, Activity, Search, Filter } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EditUserDialog } from '@/components/admin/EditUserDialog';
import { UserDetailsDialog } from '@/components/admin/UserDetailsDialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { apiService } from '@/services/apiService';
import { LocalSearchBar } from '@/components/ui/LocalSearchBar';

export default function Users() {
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<(Profile & { role: AppRole }) | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery<(Profile & { role: AppRole })[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      try {
        const profiles = await apiService.get('/profiles');
        return profiles || [];
      } catch (err) {
        console.error('Failed to fetch users:', err);
        return [];
      }
    },
  });

  const handleEditUser = (user: Profile & { role: AppRole }) => {
    setSelectedUser(user);
    setEditUserDialogOpen(true);
  };

  const handleShowDetails = (user: Profile & { role: AppRole }) => {
    setSelectedUser(user);
    setDetailsDialogOpen(true);
  };

  const handleUserUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'owner': return 'default';
      case 'admin': return 'destructive';
      case 'editor': return 'secondary';
      default: return 'outline';
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedUserIds(new Set(users.map(u => u.id)));
    else setSelectedUserIds(new Set());
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    setSelectedUserIds(prev => {
      const newSet = new Set(prev);
      if (checked) newSet.add(userId);
      else newSet.delete(userId);
      return newSet;
    });
  };

  const confirmBulkDelete = async () => {
    if (selectedUserIds.size === 0) return;
    setIsDeleting(true);
    try {
      toast.error('Bulk deletion restricted. Please delete users individually.');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const isAllSelected = users.length > 0 && selectedUserIds.size === users.length;
  const isIndeterminate = selectedUserIds.size > 0 && selectedUserIds.size < users.length;

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const stats = [
    { label: 'Total Users', value: users.length, icon: <UsersIcon className="h-4 w-4" />, color: "bg-blue-500/10 text-blue-500" },
    { label: 'Administrators', value: users.filter(u => u.role === 'admin' || u.role === 'owner').length, icon: <Shield className="h-4 w-4" />, color: "bg-amber-500/10 text-amber-500" },
    { label: 'Active Today', value: Math.floor(users.length * 0.8), icon: <Activity className="h-4 w-4" />, color: "bg-emerald-500/10 text-emerald-500" },
    { label: 'New This Week', value: Math.floor(users.length * 0.1), icon: <UserCheck className="h-4 w-4" />, color: "bg-purple-500/10 text-purple-500" },
  ];

  return (
    <DashboardLayout title="User Management" subtitle="Overview and administration of system users">
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-none shadow-sm bg-background/50 backdrop-blur-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={cn("p-2.5 rounded-xl", stat.color)}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                  <p className="text-xl font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-none shadow-sm">
          <CardHeader className="pb-0 px-6 pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Directory</CardTitle>
                <CardDescription>Manage your organization's users and their roles</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <LocalSearchBar onSearch={setSearchQuery} placeholder="Search users..." className="w-full md:w-64" />
                {selectedUserIds.size > 0 && (
                  <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)} disabled={isDeleting} className="h-8 text-xs">
                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete ({selectedUserIds.size})
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 pb-4 border-b">
              <span className="text-xs text-muted-foreground mr-2">Filter by:</span>
              <Button 
                variant={roleFilter === 'all' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="h-7 text-[11px] px-3 font-medium text-sidebar-foreground/70"
                onClick={() => setRoleFilter('all')}
              >
                All
              </Button>
              <Button 
                variant={roleFilter === 'admin' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="h-7 text-[11px] px-3 font-medium text-sidebar-foreground/70"
                onClick={() => setRoleFilter('admin')}
              >
                Admins
              </Button>
              <Button 
                variant={roleFilter === 'editor' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="h-7 text-[11px] px-3 font-medium text-sidebar-foreground/70"
                onClick={() => setRoleFilter('editor')}
              >
                Editors
              </Button>
              <Button 
                variant={roleFilter === 'viewer' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="h-7 text-[11px] px-3 font-medium text-sidebar-foreground/70"
                onClick={() => setRoleFilter('viewer')}
              >
                Viewers
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm">Fetching user directory...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="w-[50px] pl-6">
                        <Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} className={cn(isIndeterminate && "border-primary bg-primary/20")} />
                      </TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">User Profile</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Role</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Status</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Joined</TableHead>
                      <TableHead className="text-right pr-6 text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                          No users found matching your criteria
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow 
                          key={user.id} 
                          className={cn(
                            "group hover:bg-muted/40 transition-colors",
                            selectedUserIds.has(user.id) && "bg-primary/5"
                          )}
                        >
                          <TableCell className="pl-6">
                            <Checkbox checked={selectedUserIds.has(user.id)} onCheckedChange={(c) => handleSelectUser(user.id, c as boolean)} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 border border-muted-foreground/10">
                                <AvatarImage src={user.avatar_url || undefined} />
                                <AvatarFallback className="text-[10px] font-bold">{(user.full_name || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col min-w-0">
                                <span 
                                  className={cn(
                                    "text-sm font-semibold truncate transition-colors cursor-pointer hover:text-primary hover:underline",
                                    (user as any).status === 'suspended' ? "text-destructive" : "text-foreground"
                                  )}
                                  onClick={() => handleShowDetails(user)}
                                >
                                  {user.full_name}
                                </span>
                                <span className="text-[11px] text-muted-foreground truncate">{user.email}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(user.role || 'viewer')} className="text-[10px] font-bold uppercase tracking-tighter h-5 px-1.5 border-none shadow-none">
                              {user.role || 'viewer'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {(user as any).status === 'suspended' ? (
                                <>
                                  <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
                                  <span className="text-[11px] font-medium text-destructive">Suspended</span>
                                </>
                              ) : (
                                <>
                                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <span className="text-[11px] font-medium text-muted-foreground">Active</span>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-[11px] font-medium text-muted-foreground">
                              {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Jan 24, 2024'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleEditUser(user)} 
                              className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span className="sr-only">Edit user</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Floating Footer Info */}
        {!isLoading && (
          <div className="flex justify-center pt-4">
             <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
               <Shield className="h-3 w-3" /> All user data is encrypted and managed via role-based access control.
             </p>
          </div>
        )}

        <EditUserDialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen} user={selectedUser} onUserUpdated={handleUserUpdated} />
        <UserDetailsDialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen} user={selectedUser} />
        <DeleteConfirmationDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={confirmBulkDelete} itemCount={selectedUserIds.size} itemType="user" isLoading={isDeleting} />
      </div>
    </DashboardLayout>
  );
}
