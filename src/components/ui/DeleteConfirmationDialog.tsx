import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  title?: string;
  description?: string;
  itemCount: number;
  itemType?: string;
  isPermanent?: boolean;
  isLoading?: boolean;
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  itemCount,
  itemType = 'item',
  isPermanent = false,
  isLoading = false,
}: DeleteConfirmationDialogProps) {
  const handleConfirm = async () => {
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the parent component
      console.error('Delete error:', error);
    }
  };

  const defaultTitle = isPermanent
    ? `Permanently Delete ${itemCount} ${itemType}${itemCount > 1 ? 's' : ''}?`
    : `Delete ${itemCount} ${itemType}${itemCount > 1 ? 's' : ''}?`;

  const defaultDescription = isPermanent
    ? `This action cannot be undone. This will permanently delete ${itemCount} ${itemCount > 1 ? 'items' : 'item'} from your account.`
    : `Are you sure you want to delete ${itemCount} ${itemCount > 1 ? 'items' : 'item'}? This will move ${itemCount > 1 ? 'them' : 'it'} to the Recycle Bin.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <DialogTitle className="text-left">{title || defaultTitle}</DialogTitle>
          </div>
          <DialogDescription className="pt-2 text-left">
            {description || defaultDescription}
          </DialogDescription>
        </DialogHeader>
        {isPermanent && (
          <Alert variant="destructive" className="mt-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This is a permanent action. Deleted items cannot be recovered.
            </AlertDescription>
          </Alert>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              isPermanent ? 'Delete Permanently' : 'Delete'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

