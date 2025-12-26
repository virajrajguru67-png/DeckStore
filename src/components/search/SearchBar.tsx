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
import { Search } from 'lucide-react';

export function SearchBar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
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
        setLoading(true);
        const [fileResults, folderResults] = await Promise.all([
          searchService.searchFiles(query),
          searchService.searchFolders(query),
        ]);
        setFiles(fileResults.slice(0, 5));
        setFolders(folderResults.slice(0, 5));
        setLoading(false);
      } else {
        setFiles([]);
        setFolders([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, open]);

  const handleSelect = (type: 'file' | 'folder', id: string) => {
    if (type === 'folder') {
      navigate(`/files?folder=${id}`);
    } else {
      navigate(`/files`);
    }
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        className="relative h-8 w-full justify-start text-xs text-muted-foreground sm:pr-12 md:w-40 lg:w-64 bg-background"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-3.5 w-3.5" />
        <span>Search...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-[10px]">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search files and folders..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading && (
            <CommandEmpty>Searching...</CommandEmpty>
          )}
          {!loading && query && files.length === 0 && folders.length === 0 && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}
          {folders.length > 0 && (
            <CommandGroup heading="Folders">
              {folders.map((folder) => (
                <CommandItem
                  key={folder.id}
                  onSelect={() => handleSelect('folder', folder.id)}
                >
                  <span>{folder.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {files.length > 0 && (
            <CommandGroup heading="Files">
              {files.map((file) => (
                <CommandItem
                  key={file.id}
                  onSelect={() => handleSelect('file', file.id)}
                >
                  <span>{file.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}

