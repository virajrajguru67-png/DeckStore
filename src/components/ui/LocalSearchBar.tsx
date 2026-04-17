import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

interface LocalSearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export function LocalSearchBar({ onSearch, placeholder = "Filter results...", className }: LocalSearchBarProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onSearch(query);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [query, onSearch]);

  return (
    <div className={`relative flex items-center max-w-sm ${className}`}>
      <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-10 h-9 bg-background/50 border-muted-foreground/20 focus-visible:ring-primary/20 transition-all"
      />
      {query && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 h-9 w-9 hover:bg-transparent"
          onClick={() => setQuery('')}
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}
