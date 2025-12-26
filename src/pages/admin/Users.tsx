import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DeleteConfirmationDialog } from '@/components/ui/DeleteConfirmationDialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/database';
import { AppRole } from '@/types/database';
import { Pencil, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EditUserDialog } from '@/components/admin/EditUserDialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError || !profiles || profiles.length === 0) {
        return [];
      }

      // Type assertion to help TypeScript understand the array type
      const typedProfiles = profiles as Profile[];

      // Get roles for each user
      const usersWithRoles = await Promise.all(
        typedProfiles.map(async (profile) => {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id)
            .maybeSingle();

          // Type assertion for roleData
          const role = roleData as { role: AppRole } | null;

          return {
            ...profile,
            role: role?.role ?? 'viewer',
          };
        })
      );

      return usersWithRoles;
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
      case 'owner':
        return 'default';
      case 'admin':
        return 'destructive';
      case 'editor':
        return 'secondary';
      case 'viewer':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUserIds(new Set(users.map(user => user.id)));
    } else {
      setSelectedUserIds(new Set());
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    setSelectedUserIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return newSet;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedUserIds.size === 0) return;
    setDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    if (selectedUserIds.size === 0) return;
    
    setIsDeleting(true);
    try {
      // Note: In a real app, you'd have a proper delete user service
      // For now, we'll just show a toast
      toast.error('User deletion is not implemented. This would require proper user management service.');
      setSelectedUserIds(new Set());
    } catch (error) {
      console.error('Bulk delete users error:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred while deleting users');
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
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete {selectedUserIds.size} user(s)
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
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        className={cn(
                          isIndeterminate && "border-primary bg-primary/20"
                        )}
                      />
                    </TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user: Profile & { role: AppRole }) => (
                    <TableRow 
                      key={user.id}
                      className={cn(selectedUserIds.has(user.id) && "bg-accent/60")}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedUserIds.has(user.id)}
                          onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback>
                              {user.full_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{user.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditUser(user)}
                          className="gap-2"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <EditUserDialog
          open={editUserDialogOpen}
          onOpenChange={setEditUserDialogOpen}
          user={selectedUser}
          onUserUpdated={handleUserUpdated}
        />

        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={confirmBulkDelete}
          itemCount={selectedUserIds.size}
          itemType="user"
          isLoading={isDeleting}
        />
      </div>
    </DashboardLayout>
  );
}


