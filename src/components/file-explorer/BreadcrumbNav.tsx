import { ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  onNavigate: (folderId: string | null) => void;
}

export function BreadcrumbNav({ items, onNavigate }: BreadcrumbNavProps) {
  return (
    <nav className="flex items-center gap-1 px-4 py-1.5 border-b border-border bg-background">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => onNavigate(null)}
      >
        <Home className="h-3.5 w-3.5" />
      </Button>
      {items.map((item, index) => (
        <div key={item.id || 'root'} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2 text-xs",
              index === items.length - 1 && "font-semibold text-foreground"
            )}
            onClick={() => onNavigate(item.id)}
            disabled={index === items.length - 1}
          >
            {item.name}
          </Button>
        </div>
      ))}
    </nav>
  );
}


