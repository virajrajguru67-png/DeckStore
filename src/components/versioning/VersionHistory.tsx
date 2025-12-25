import { useState, useEffect } from 'react';
import { versionService } from '@/services/versionService';
import { FileVersion } from '@/types/file';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { History, RotateCcw, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface VersionHistoryProps {
  fileId: string;
  onRestore?: () => void;
}

export function VersionHistory({ fileId, onRestore }: VersionHistoryProps) {
  const { profile } = useAuth();
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVersions();
  }, [fileId]);

  const loadVersions = async () => {
    setLoading(true);
    const fetchedVersions = await versionService.getVersions(fileId);
    setVersions(fetchedVersions);
    setLoading(false);
  };

  const handleRestore = async (versionNumber: number) => {
    const success = await versionService.restoreVersion(fileId, versionNumber);
    if (success && onRestore) {
      onRestore();
    }
  };

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading versions...</div>;
  }

  if (versions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No version history available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Version History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {versions.map((version) => (
            <div
              key={version.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">v{version.version_number}</Badge>
                  {version.version_number === versions[0].version_number && (
                    <Badge>Current</Badge>
                  )}
                </div>
                {version.change_description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {version.change_description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>{(version.size / 1024).toFixed(2)} KB</span>
                  <span>
                    {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
              {version.version_number !== versions[0].version_number && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRestore(version.version_number)}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restore
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


