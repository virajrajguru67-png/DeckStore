import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { fileService } from '@/services/fileService';
import { File } from '@/types/file';
import { File as FileIcon, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { PreviewModal } from '@/components/preview/PreviewModal';
import { useState } from 'react';

export default function Recent() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data: allFiles = [], isLoading } = useQuery({
    queryKey: ['all-files'],
    queryFn: async () => {
      // Get all files and sort by updated_at
      const files = await fileService.getFiles(null);
      return files.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ).slice(0, 20); // Last 20 files
    },
  });

  return (
    <DashboardLayout title="Recent" subtitle="Recently accessed files">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Recent</h1>
          <p className="text-muted-foreground">Recently accessed files</p>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : allFiles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No recent files</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {allFiles.map((file: File) => (
              <Card
                key={file.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  setSelectedFile(file);
                  setPreviewOpen(true);
                }}
              >
                <CardContent className="p-6">
                  <FileIcon className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(file.updated_at), { addSuffix: true })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <PreviewModal
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          file={selectedFile}
        />
      </div>
    </DashboardLayout>
  );
}

