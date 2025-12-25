import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/database';
import { AppRole } from '@/types/database';
import { Pencil } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EditUserDialog } from '@/components/admin/EditUserDialog';
import { cn } from '@/lib/utils';

export default function Users() {
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<(Profile & { role: AppRole }) | null>(null);
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

  return (
    <DashboardLayout title="Users" subtitle="Manage users and permissions">
      <div className="space-y-6">

        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>List of all users in the system</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user: Profile & { role: AppRole }) => (
                    <TableRow key={user.id}>
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
      </div>
    </DashboardLayout>
  );
}


