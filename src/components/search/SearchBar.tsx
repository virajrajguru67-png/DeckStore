import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { searchService } from '@/services/searchService';
import { File, Folder } from '@/types/file';
import { Search, Folder as FolderIcon, FileText, File as FileIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';



export function SearchBar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (!open) return;

    const timeoutId = setTimeout(async () => {
      if (query.trim()) {
        console.log('Searching for:', query);
        setLoading(true);
        try {
          const results = await searchService.searchAll(query);
          console.log('SearchAll results:', results);
          
          setFiles(results.files.slice(0, 5));
          setFolders(results.folders.slice(0, 5));
          setDocuments(results.documents.slice(0, 5));
        } catch (err) {
          console.error('Search failed in component:', err);
        } finally {
          setLoading(false);
        }



      } else {
        setFiles([]);
        setFolders([]);
        setDocuments([]);
      }
    }, 300);



    return () => clearTimeout(timeoutId);
  }, [query, open]);

  const handleSelect = (type: 'file' | 'folder' | 'document', id: string) => {
    if (type === 'folder') {
      navigate(`/files?folder=${id}`);
    } else if (type === 'document') {
      navigate(`/documents/${id}`);
    } else {
      // Find the file to see its folder_id
      const file = files.find(f => f.id === id);
      if (file && file.folder_id) {
        navigate(`/files?folder=${file.folder_id}`);
      } else {
        navigate(`/files`);
      }
    }
    setOpen(false);
  };



  return (
    <>
      <Button
        variant="outline"
        className="relative h-7 w-full justify-start text-xs text-muted-foreground sm:pr-12 md:w-36 lg:w-56 bg-background"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-3 w-3" />
        <span>Search...</span>
        <kbd className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 hidden h-4.5 select-none items-center gap-0.5 rounded border border-border bg-muted px-1 font-mono text-[9px] font-medium opacity-100 sm:flex">
          <span className="text-[9px]">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>

        <CommandInput
          placeholder="Search files and folders..."
          value={query}
          onValueChange={setQuery}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query.trim()) {
              navigate(`/search?q=${encodeURIComponent(query)}`);
              setOpen(false);
            }
          }}
        />

        <CommandList>
          {loading && (
            <CommandEmpty>Searching...</CommandEmpty>
          )}
          {!loading && query && files.length === 0 && folders.length === 0 && documents.length === 0 && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}

          {folders.length > 0 && (
            <CommandGroup heading="Folders">
              {folders.map((folder) => (
                <CommandItem
                  key={folder.id}
                  value={folder.name}
                  onSelect={() => handleSelect('folder', folder.id)}

                  className="flex items-center gap-3 p-3 cursor-pointer"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                    <FolderIcon className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{folder.name}</span>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 font-normal border-primary/20 bg-primary/5 text-primary">Folder</Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">{folder.path || '/'}</div>
                  </div>

                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {files.length > 0 && (
            <CommandGroup heading="Files">
              {files.map((file) => (
                <CommandItem
                  key={file.id}
                  value={file.name}
                  onSelect={() => handleSelect('file', file.id)}

                  className="flex items-center gap-3 p-3 cursor-pointer"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground shrink-0">
                    <FileIcon className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{file.name}</span>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 font-normal border-accent-foreground/20 bg-accent text-accent-foreground">File</Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">{file.path || '/'}</div>
                  </div>

                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {documents.length > 0 && (
            <CommandGroup heading="Documents">
              {documents.map((doc) => (
                <CommandItem
                  key={doc.id}
                  value={doc.name}
                  onSelect={() => handleSelect('document', doc.id)}

                  className="flex items-center gap-3 p-3 cursor-pointer"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500 shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{doc.name}</span>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 font-normal border-orange-500/20 bg-orange-500/5 text-orange-500">Document</Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground">/documents</div>
                  </div>

                </CommandItem>
              ))}
            </CommandGroup>
          )}



        </CommandList>
      </CommandDialog>
    </>
  );
}

