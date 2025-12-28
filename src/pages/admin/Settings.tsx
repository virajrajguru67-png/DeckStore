import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { profileService } from '@/services/profileService';
import { toast } from 'sonner';
import { Upload, Sparkles, Palette } from 'lucide-react';

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState({
    custom_branding_logo_url: '',
    custom_branding_color: '#0f172a',
    enable_watermarking: false,
  });

  useEffect(() => {
    profileService.getProfile().then(profile => {
      if (profile) {
        setBranding({
          custom_branding_logo_url: (profile as any).custom_branding_logo_url || '',
          custom_branding_color: (profile as any).custom_branding_color || '#0f172a',
          enable_watermarking: (profile as any).enable_watermarking || false,
        });
      }
    });
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const url = await profileService.uploadLogo(file);
    if (url) {
      setBranding(prev => ({ ...prev, custom_branding_logo_url: url }));
    }
    setLoading(false);
  };

  const handleSaveBranding = async () => {
    setLoading(true);
    const success = await profileService.updateBranding(branding);
    setLoading(false);
    if (success) {
      toast.success('Branding saved');
    }
  };

  return (
    <DashboardLayout title="Settings" subtitle="System configuration and policies">
      <div className="space-y-6 max-w-4xl mx-auto py-8">

        {/* Branding Section */}
        <Card className="overflow-hidden border-primary/20 bg-primary/5 shadow-xl">
          <CardHeader className="bg-primary/10 border-b border-primary/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <Palette className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>Professional Branding</CardTitle>
                <CardDescription>Customise how your shared links look to clients</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Logo Upload */}
              <div className="space-y-3">
                <Label>Company Logo</Label>
                <div className="flex flex-col items-center gap-4 p-6 border-2 border-dashed border-border/60 rounded-2xl bg-background/50">
                  {branding.custom_branding_logo_url ? (
                    <img src={branding.custom_branding_logo_url} alt="Logo" className="max-h-20 object-contain rounded" />
                  ) : (
                    <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input id="logoInput" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    <Button variant="outline" size="sm" onClick={() => document.getElementById('logoInput')?.click()} disabled={loading}>
                      {loading ? 'Uploading...' : 'Choose File'}
                    </Button>
                    {branding.custom_branding_logo_url && (
                      <Button variant="ghost" size="sm" onClick={() => setBranding(prev => ({ ...prev, custom_branding_logo_url: '' }))}>
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Color & Watermark */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Brand Accent Color</Label>
                  <div className="flex gap-3 items-center">
                    <div className="w-12 h-12 rounded-xl border border-border" style={{ backgroundColor: branding.custom_branding_color }} />
                    <Input
                      type="color"
                      value={branding.custom_branding_color}
                      onChange={(e) => setBranding(prev => ({ ...prev, custom_branding_color: e.target.value }))}
                      className="w-full h-10 p-1 cursor-pointer"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Hex: {branding.custom_branding_color}</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border/40">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Dynamic Watermarking
                    </Label>
                    <p className="text-xs text-muted-foreground">Overlay viewer email on PDF previews</p>
                  </div>
                  <Switch
                    checked={branding.enable_watermarking}
                    onCheckedChange={(checked) => setBranding(prev => ({ ...prev, enable_watermarking: checked }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border/40">
              <Button onClick={handleSaveBranding} disabled={loading} className="px-8">
                {loading ? 'Saving...' : 'Save Branding'}
              </Button>
            </div>
          </CardContent>
        </Card>

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

        {/* ... existing policies ... */}

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


