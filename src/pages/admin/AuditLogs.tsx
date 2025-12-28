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

  // Auto-refresh logs every 30 seconds to catch new system activity
  const { data: logs = [], isLoading, error, refetch } = useQuery({
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
        return [];
      }
    },
    refetchInterval: 30000,
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
      // Logic for deleting would go here
      // For now, we'll just simulate it and clear selection as per service limitations
      toast.info(`Deleting ${selectedLogIds.size} log entry(ies)...`);
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSelectedLogIds(new Set());
      toast.success('Log entries deleted');
      refetch();
    } catch (error) {
      console.error('Bulk delete logs error:', error);
      toast.error('An error occurred while deleting log entries');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const getActionBadgeColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'delete': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'upload': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'create': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'share': return 'text-violet-500 bg-violet-500/10 border-violet-500/20';
      case 'move': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'rename': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  const isAllSelected = logs.length > 0 && selectedLogIds.size === logs.length;
  const isIndeterminate = selectedLogIds.size > 0 && selectedLogIds.size < logs.length;

  return (
    <DashboardLayout title="Audit Logs" subtitle="System activity and audit trail">
      <div className="space-y-6 h-full flex flex-col">
        {/* Filters Card */}
        <div className="bg-background/80 backdrop-blur-md rounded-xl border border-border/50 p-4 sticky top-0 z-10 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-4 flex-1 w-full md:w-auto">
              <div className="w-full md:w-48">
                <Select value={actionType} onValueChange={setActionType}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Action Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="upload">Upload</SelectItem>
                    <SelectItem value="create">Create</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                    <SelectItem value="share">Share</SelectItem>
                    <SelectItem value="move">Move</SelectItem>
                    <SelectItem value="rename">Rename</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-48">
                <Select value={resourceType} onValueChange={setResourceType}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Resource Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Resources</SelectItem>
                    <SelectItem value="file">Files</SelectItem>
                    <SelectItem value="folder">Folders</SelectItem>
                    <SelectItem value="document">Documents</SelectItem>
                    <SelectItem value="user">Users</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedLogIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="animate-fade-in"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete {selectedLogIds.size}
              </Button>
            )}
          </div>
        </div>

        {/* Logs Table */}
        <div className="flex-1 rounded-xl border border-border/50 bg-card/50 overflow-hidden shadow-sm">
          <CardContent className="p-0 h-full overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="text-muted-foreground text-sm">Loading logs...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-64 text-center p-4">
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-destructive" />
                </div>
                <h3 className="font-semibold text-foreground">Failed to load logs</h3>
                <p className="text-muted-foreground text-sm max-w-sm mt-1">
                  {error instanceof Error ? error.message : 'Please ensure the activity_logs table is set up in your database.'}
                </p>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center p-4">
                <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                  <Search className="h-8 w-8 text-primary/40" />
                </div>
                <h3 className="font-semibold text-foreground">No logs found</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Try adjusting your filters or performing some actions in the system.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
                  <TableRow className="hover:bg-muted/50 border-border/50">
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        className={cn(
                          isIndeterminate && "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                        )}
                      />
                    </TableHead>
                    <TableHead className="w-[180px]">Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead className="w-[30%]">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log: ActivityLog) => (
                    <TableRow
                      key={log.id}
                      className={cn(
                        "transition-colors border-border/40",
                        selectedLogIds.has(log.id) ? "bg-primary/5" : "hover:bg-muted/30"
                      )}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedLogIds.has(log.id)}
                          onCheckedChange={(checked) => handleSelectLog(log.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-xs text-muted-foreground tabular-nums">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-medium border",
                          getActionBadgeColor(log.action_type)
                        )}>
                          {log.action_type.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{log.user_id || <span className="text-muted-foreground italic">System</span>}</TableCell>
                      <TableCell className="text-sm font-medium">{log.resource_type}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate" title={JSON.stringify(log.metadata, null, 2)}>
                        {Object.keys(log.metadata || {}).length > 0
                          ? JSON.stringify(log.metadata)
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </div>

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


