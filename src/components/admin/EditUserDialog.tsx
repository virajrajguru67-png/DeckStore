import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AppRole, Profile } from '@/types/database';
import { toast } from 'sonner';
import { User } from 'lucide-react';
import { apiService } from '@/services/apiService';
import { cn } from '@/lib/utils';

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: (Profile & { role: AppRole }) | null;
  onUserUpdated: () => void;
}

export function EditUserDialog({ open, onOpenChange, user, onUserUpdated }: EditUserDialogProps) {
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<AppRole>('viewer');
  const [status, setStatus] = useState<'active' | 'suspended'>('active');
  const [suspensionDuration, setSuspensionDuration] = useState<string>('permanent');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setRole(user.role || 'viewer');
      setStatus((user as any).status || 'active');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!fullName) {
      toast.error('Please enter a full name');
      return;
    }

    setLoading(true);
    try {
      await apiService.put(`/profiles/${user.id}`, {
        fullName,
        role,
        status,
        suspensionUntil: status === 'suspended' ? calculateSuspensionDate(suspensionDuration) : null
      });

      toast.success('User updated successfully');
      onOpenChange(false);
      onUserUpdated();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const calculateSuspensionDate = (duration: string) => {
    if (duration === 'permanent') return '9999-12-31';
    const now = new Date();
    if (duration === '1d') now.setDate(now.getDate() + 1);
    if (duration === '7d') now.setDate(now.getDate() + 7);
    if (duration === '1m') now.setMonth(now.getMonth() + 1);
    if (duration === '1y') now.setFullYear(now.getFullYear() + 1);
    return now.toISOString();
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Edit User
          </DialogTitle>
          <DialogDescription>
            Update user information, role and account status
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={user.email} disabled className="bg-muted text-xs h-8" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" required className="h-8 text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as AppRole)}>
                <SelectTrigger id="role" className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Account Status</Label>
              <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                <SelectTrigger id="status" className={cn("h-8 text-xs", status === 'suspended' && "text-destructive border-destructive/50")}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {status === 'suspended' && (
            <div className="space-y-2 p-3 bg-destructive/5 rounded-lg border border-destructive/10 animate-in fade-in slide-in-from-top-1">
              <Label htmlFor="duration" className="text-destructive font-bold text-[10px] uppercase tracking-wider">Suspension Duration</Label>
              <Select value={suspensionDuration} onValueChange={setSuspensionDuration}>
                <SelectTrigger id="duration" className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent">Permanent</SelectItem>
                  <SelectItem value="1d">1 Day</SelectItem>
                  <SelectItem value="7d">1 Week</SelectItem>
                  <SelectItem value="1m">1 Month</SelectItem>
                  <SelectItem value="1y">1 Year</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground italic">The user will be unable to log in until this period expires.</p>
            </div>
          )}

          <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
            <Button type="button" variant="ghost" size="sm" className="h-9 text-xs" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="h-9 text-xs px-6" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
