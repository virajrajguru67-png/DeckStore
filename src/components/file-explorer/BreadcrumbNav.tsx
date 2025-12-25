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
    <nav className="flex items-center gap-1 px-4 py-2 bg-muted/30 border-b">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2"
        onClick={() => onNavigate(null)}
      >
        <Home className="h-4 w-4" />
      </Button>
      {items.map((item, index) => (
        <div key={item.id || 'root'} className="flex items-center gap-1">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-2 text-sm",
              index === items.length - 1 && "font-semibold"
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


