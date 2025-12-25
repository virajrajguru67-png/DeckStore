import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export default function Settings() {
  return (
    <DashboardLayout title="Settings" subtitle="System configuration and policies">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">System Settings</h1>
          <p className="text-muted-foreground">Configure system-wide settings and policies</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Storage Policies</CardTitle>
            <CardDescription>Configure default storage quotas and limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defaultQuota">Default User Quota (GB)</Label>
              <Input id="defaultQuota" type="number" defaultValue="10" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxFileSize">Maximum File Size (MB)</Label>
              <Input id="maxFileSize" type="number" defaultValue="100" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sharing Policies</CardTitle>
            <CardDescription>Configure sharing and access policies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow External Sharing</Label>
                <p className="text-sm text-muted-foreground">
                  Enable sharing via external links
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Password for External Shares</Label>
                <p className="text-sm text-muted-foreground">
                  Force password protection on external links
                </p>
              </div>
              <Switch />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shareExpiry">Default Share Expiry (days)</Label>
              <Input id="shareExpiry" type="number" defaultValue="7" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security Settings</CardTitle>
            <CardDescription>Security and compliance settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Activity Logging</Label>
                <p className="text-sm text-muted-foreground">
                  Log all user actions for audit purposes
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Encryption</Label>
                <p className="text-sm text-muted-foreground">
                  Encrypt files at rest
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button>Save Settings</Button>
        </div>
      </div>
    </DashboardLayout>
  );
}


