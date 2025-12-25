import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { permissionService, Permission, PermissionType } from '@/services/permissionService';
import { Plus, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface PermissionManagerProps {
  resourceType: 'file' | 'folder';
  resourceId: string;
}

export function PermissionManager({ resourceType, resourceId }: PermissionManagerProps) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userId, setUserId] = useState('');
  const [permissionType, setPermissionType] = useState<PermissionType>('read');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPermissions();
  }, [resourceType, resourceId]);

  const loadPermissions = async () => {
    const perms =
      resourceType === 'file'
        ? await permissionService.getFilePermissions(resourceId)
        : await permissionService.getFolderPermissions(resourceId);
    setPermissions(perms);
  };

  const handleAddPermission = async () => {
    if (!userId.trim()) return;

    setLoading(true);
    try {
      if (resourceType === 'file') {
        await permissionService.addFilePermission(resourceId, userId, permissionType);
      } else {
        await permissionService.addFolderPermission(resourceId, userId, permissionType);
      }
      setUserId('');
      await loadPermissions();
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePermission = async (permissionId: string) => {
    setLoading(true);
    try {
      await permissionService.removePermission(permissionId, resourceType);
      await loadPermissions();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissions</CardTitle>
        <CardDescription>Manage access permissions for this {resourceType}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="User ID or Email"
            className="flex-1"
          />
          <Select value={permissionType} onValueChange={(v) => setPermissionType(v as PermissionType)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="read">Read</SelectItem>
              <SelectItem value="write">Write</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
              <SelectItem value="share">Share</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleAddPermission} disabled={loading}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Permission</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions.map((perm) => (
              <TableRow key={perm.id}>
                <TableCell>{perm.user_id}</TableCell>
                <TableCell>{perm.permission_type}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePermission(perm.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}


