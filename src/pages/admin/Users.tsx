import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DeleteConfirmationDialog } from '@/components/ui/DeleteConfirmationDialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Profile, AppRole } from '@/types/database';
import { Pencil, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EditUserDialog } from '@/components/admin/EditUserDialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { apiService } from '@/services/apiService';

export default function Users() {
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<(Profile & { role: AppRole }) | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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

  return (
    <DashboardLayout title="Users" subtitle="Manage users and permissions">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Users</CardTitle>
                <CardDescription>List of all users in the system</CardDescription>
              </div>
              {selectedUserIds.size > 0 && (
                <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)} disabled={isDeleting}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete {selectedUserIds.size} user(s)
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} className={cn(isIndeterminate && "border-primary bg-primary/20")} />
                    </TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className={cn(selectedUserIds.has(user.id) && "bg-accent/60")}>
                      <TableCell><Checkbox checked={selectedUserIds.has(user.id)} onCheckedChange={(c) => handleSelectUser(user.id, c as boolean)} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback>{(user.full_name || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{user.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell><Badge variant={getRoleBadgeVariant(user.role || 'viewer')} className="capitalize">{user.role || 'viewer'}</Badge></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)} className="gap-2"><Pencil className="h-4 w-4" />Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <EditUserDialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen} user={selectedUser} onUserUpdated={handleUserUpdated} />
        <DeleteConfirmationDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={confirmBulkDelete} itemCount={selectedUserIds.size} itemType="user" isLoading={isDeleting} />
      </div>
    </DashboardLayout>
  );
}
