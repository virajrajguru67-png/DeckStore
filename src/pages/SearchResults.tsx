import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { searchService } from '@/services/searchService';
import { File, Folder } from '@/types/file';
import { File as FileIcon, Folder as FolderIcon, Search } from 'lucide-react';
import { PreviewModal } from '@/components/preview/PreviewModal';

export default function SearchResults() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const query = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(query);
  const [files, setFiles] = useState<File[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);


  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const results = await searchService.searchAll(searchQuery);
      setFiles(results.files);
      setFolders(results.folders);
      setDocuments(results.documents);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (query) {
      setSearchQuery(query);
      handleSearch();
    }
  }, [query]);

  return (
    <DashboardLayout title="Search" subtitle="Find files and folders">
      <div className="space-y-6">
        <div className="flex gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search files and folders..."
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={loading}>
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Searching...
          </div>
        ) : (
          <>
            {files.length === 0 && folders.length === 0 && documents.length === 0 && searchQuery && (
              <div className="text-center py-12">
                <Search className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
              </div>
            )}


            {folders.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Folders</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {folders.map((folder) => (
                    <Card 
                      key={folder.id} 
                      className="cursor-pointer hover:shadow-md transition-all duration-200 border-primary/20 bg-primary/5 hover:bg-primary/10"
                      onClick={() => navigate(`/files?folder=${folder.id}`)}
                    >
                      <CardContent className="p-6">
                        <FolderIcon className="h-10 w-10 text-primary mb-3" />
                        <p className="font-medium truncate">{folder.name}</p>
                        <p className="text-sm text-muted-foreground">Folder</p>
                      </CardContent>
                    </Card>
                  ))}

                </div>
              </div>
            )}

            {files.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Files</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {files.map((file) => (
                    <Card
                      key={file.id}
                      className="cursor-pointer hover:shadow-md"
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
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {documents.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Documents</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {documents.map((doc) => (
                    <Card
                      key={doc.id}
                      className="cursor-pointer hover:shadow-md"
                      onClick={() => navigate(`/documents/${doc.id}`)}
                    >
                      <CardContent className="p-6">
                        <FileIcon className="h-12 w-12 text-blue-500 mb-2" />
                        <p className="font-medium truncate">{doc.name}</p>
                        <p className="text-sm text-muted-foreground">Document</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

          </>
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
