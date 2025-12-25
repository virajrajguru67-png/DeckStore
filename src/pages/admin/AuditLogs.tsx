import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { activityService, ActivityLog } from '@/services/activityService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import { FileText, Search } from 'lucide-react';
import { useState } from 'react';

export default function AuditLogs() {
  const [actionType, setActionType] = useState<string>('all');
  const [resourceType, setResourceType] = useState<string>('all');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['activity-logs', actionType, resourceType],
    queryFn: () =>
      activityService.getActivityLogs({
        actionType: actionType !== 'all' ? actionType : undefined,
        resourceType: resourceType !== 'all' ? resourceType : undefined,
        limit: 100,
      }),
  });

  return (
    <DashboardLayout title="Audit Logs" subtitle="System activity and audit trail">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">View all system activities and user actions</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter activity logs by type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Select value={actionType} onValueChange={setActionType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Action Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="upload">Upload</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                    <SelectItem value="share">Share</SelectItem>
                    <SelectItem value="download">Download</SelectItem>
                    <SelectItem value="rename">Rename</SelectItem>
                    <SelectItem value="move">Move</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Select value={resourceType} onValueChange={setResourceType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Resource Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Resources</SelectItem>
                    <SelectItem value="file">Files</SelectItem>
                    <SelectItem value="folder">Folders</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity Logs</CardTitle>
            <CardDescription>Recent system activity</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No activity logs found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log: ActivityLog) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>{log.user_id || 'System'}</TableCell>
                      <TableCell>
                        <span className="font-medium">{log.action_type}</span>
                      </TableCell>
                      <TableCell>{log.resource_type}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {JSON.stringify(log.metadata)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


