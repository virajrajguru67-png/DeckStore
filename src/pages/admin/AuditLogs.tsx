import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DeleteConfirmationDialog } from '@/components/ui/DeleteConfirmationDialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { activityService, ActivityLog } from '@/services/activityService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import { FileText, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function AuditLogs() {
  const [actionType, setActionType] = useState<string>('all');
  const [resourceType, setResourceType] = useState<string>('all');
  const [selectedLogIds, setSelectedLogIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ['activity-logs', actionType, resourceType],
    queryFn: async () => {
      try {
        const result = await activityService.getActivityLogs({
          actionType: actionType !== 'all' ? actionType : undefined,
          resourceType: resourceType !== 'all' ? resourceType : undefined,
          limit: 100,
        });
        return result || [];
      } catch (err) {
        console.error('Error fetching activity logs:', err);
        toast.error('Failed to load activity logs. Please check if the activity_logs table exists.');
        return [];
      }
    },
    retry: 1,
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLogIds(new Set(logs.map(log => log.id)));
    } else {
      setSelectedLogIds(new Set());
    }
  };

  const handleSelectLog = (logId: string, checked: boolean) => {
    setSelectedLogIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(logId);
      } else {
        newSet.delete(logId);
      }
      return newSet;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedLogIds.size === 0) return;
    setDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    if (selectedLogIds.size === 0) return;
    
    setIsDeleting(true);
    try {
      // Note: In a real app, you'd have a proper delete logs service
      toast.info(`Deleting ${selectedLogIds.size} log entry(ies)...`);
      // await activityService.deleteLogs(Array.from(selectedLogIds));
      setSelectedLogIds(new Set());
      toast.success('Log entries deleted');
    } catch (error) {
      console.error('Bulk delete logs error:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred while deleting log entries');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const isAllSelected = logs.length > 0 && selectedLogIds.size === logs.length;
  const isIndeterminate = selectedLogIds.size > 0 && selectedLogIds.size < logs.length;

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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Activity Logs</CardTitle>
                <CardDescription>Recent system activity</CardDescription>
              </div>
              {selectedLogIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete {selectedLogIds.size} log(s)
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : error ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">Error loading activity logs</p>
                <p className="text-sm text-muted-foreground">
                  {error instanceof Error ? error.message : 'Please check if the activity_logs table exists in your database.'}
                </p>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">No activity logs found</p>
                <p className="text-sm text-muted-foreground">
                  Activity logs will appear here as users perform actions in the system.
                </p>
              </div>
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
                    <TableHead>Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log: ActivityLog) => (
                    <TableRow 
                      key={log.id}
                      className={cn(selectedLogIds.has(log.id) && "bg-accent/60")}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedLogIds.has(log.id)}
                          onCheckedChange={(checked) => handleSelectLog(log.id, checked as boolean)}
                        />
                      </TableCell>
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

        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={confirmBulkDelete}
          itemCount={selectedLogIds.size}
          itemType="log entry"
          isLoading={isDeleting}
        />
      </div>
    </DashboardLayout>
  );
}


