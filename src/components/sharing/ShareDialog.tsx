import { useState } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { shareService, AccessLevel } from '@/services/shareService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Link, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceType: 'file' | 'folder';
  resourceId: string;
}

export function ShareDialog({
  open,
  onOpenChange,
  resourceType,
  resourceId,
}: ShareDialogProps) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'internal' | 'external'>('internal');
  const [userId, setUserId] = useState('');
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('view');
  const [password, setPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [expiresIn, setExpiresIn] = useState<string>('');
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleInternalShare = async () => {
    if (!userId.trim()) {
      toast.error('Please enter a user ID or email');
      return;
    }

    setLoading(true);
    try {
      // In production, resolve userId from email
      const share = await shareService.createInternalShare(
        resourceType,
        resourceId,
        userId,
        accessLevel
      );
      if (share) {
        toast.success('Shared successfully');
        // Invalidate queries to refresh shared items
        queryClient.invalidateQueries({ queryKey: ['shared-with-me'] });
        queryClient.invalidateQueries({ queryKey: ['shares'] });
        setUserId(''); // Reset form
        onOpenChange(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExternalShare = async () => {
    setLoading(true);
    try {
      const expiresAt = expiresIn
        ? new Date(Date.now() + parseInt(expiresIn) * 24 * 60 * 60 * 1000)
        : undefined;

      const share = await shareService.createExternalShare(
        resourceType,
        resourceId,
        accessLevel,
        {
          password: hasPassword ? password : undefined,
          expiresAt,
        }
      );

      if (share?.link_token) {
        const url = shareService.getShareUrl(share.link_token);
        setShareLink(url);
        toast.success('Share link created');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      toast.success('Link copied to clipboard');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share {resourceType === 'file' ? 'File' : 'Folder'}</DialogTitle>
          <DialogDescription>
            Share with team members or create a shareable link
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'internal' | 'external')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="internal">
              <Users className="h-4 w-4 mr-2" />
              Internal
            </TabsTrigger>
            <TabsTrigger value="external">
              <Link className="h-4 w-4 mr-2" />
              Link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="internal" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userId">User Email or ID</Label>
              <Input
                id="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="access">Access Level</Label>
              <Select value={accessLevel} onValueChange={(v) => setAccessLevel(v as AccessLevel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View Only</SelectItem>
                  <SelectItem value="download">Download</SelectItem>
                  <SelectItem value="edit">Edit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleInternalShare} disabled={loading} className="w-full">
              Share
            </Button>
          </TabsContent>

          <TabsContent value="external" className="space-y-4">
            {shareLink ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Share Link</Label>
                  <div className="flex gap-2">
                    <Input value={shareLink} readOnly />
                    <Button onClick={copyLink} size="icon">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button onClick={() => onOpenChange(false)} className="w-full">
                  Done
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="access">Access Level</Label>
                  <Select value={accessLevel} onValueChange={(v) => setAccessLevel(v as AccessLevel)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">View Only</SelectItem>
                      <SelectItem value="download">Download</SelectItem>
                      <SelectItem value="edit">Edit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="password"
                    checked={hasPassword}
                    onCheckedChange={(checked) => setHasPassword(checked as boolean)}
                  />
                  <Label htmlFor="password">Password Protected</Label>
                </div>
                {hasPassword && (
                  <div className="space-y-2">
                    <Label htmlFor="passwordValue">Password</Label>
                    <Input
                      id="passwordValue"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="expires">Expires In (days)</Label>
                  <Input
                    id="expires"
                    type="number"
                    value={expiresIn}
                    onChange={(e) => setExpiresIn(e.target.value)}
                    placeholder="Leave empty for no expiration"
                  />
                </div>
                <Button onClick={handleExternalShare} disabled={loading} className="w-full">
                  Create Link
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}


