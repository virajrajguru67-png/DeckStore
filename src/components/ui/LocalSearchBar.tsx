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
      <Search className="absolute left-3 h-3.5 w-3.5 text-muted-foreground z-10" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="pl-10 pr-10 h-8 text-xs bg-background/50 border-muted-foreground/20 focus-visible:ring-primary/20 transition-all"
      />
      {query && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 h-8 w-8 hover:bg-transparent"
          onClick={() => setQuery('')}
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}
