import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DeleteConfirmationDialog } from '@/components/ui/DeleteConfirmationDialog';
// DocumentEditor removed
import { documentService } from '@/services/documentService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Plus, Trash2, Edit, Star, StarOff, Eye, EyeOff, Grid3x3, List } from 'lucide-react';
import { Document } from '@/types/document';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type ViewMode = 'grid' | 'list';

export default function Documents() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  // documentEditorOpen state removed
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<string>>(new Set());
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tags: '',
  });

  const { data: documents = [], isLoading, error, refetch } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentService.getDocuments(),
    retry: false,
  });

  // Show error toast if query fails
  useEffect(() => {
    if (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to load documents. Please ensure the database migration has been run.';
      toast.error(errorMessage);
    }
  }, [error]);

  const handleCreateDocument = async () => {
    if (!formData.name.trim()) {
      toast.error('Document name is required');
      return;
    }

    try {
      const tags = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      await documentService.createDocument({
        name: formData.name,
        description: formData.description || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });

      toast.success('Document created successfully');
      setCreateDialogOpen(false);
      setFormData({ name: '', description: '', tags: '' });
      refetch();
    } catch (error) {
      console.error('Error creating document:', error);
      toast.error('Failed to create document');
    }
  };

  const handleUpdateDocument = async () => {
    if (!selectedDocument || !formData.name.trim()) {
      toast.error('Document name is required');
      return;
    }

    try {
      const tags = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      await documentService.updateDocument(selectedDocument.id, {
        name: formData.name,
        description: formData.description || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });

      toast.success('Document updated successfully');
      setEditDialogOpen(false);
      setSelectedDocument(null);
      setFormData({ name: '', description: '', tags: '' });
      refetch();
    } catch (error) {
      console.error('Error updating document:', error);
      toast.error('Failed to update document');
    }
  };

  const handleDelete = (doc: Document) => {
    setDocumentToDelete(doc);
    setDeleteConfirmationText('');
  };

  const confirmSingleDelete = async () => {
    if (!documentToDelete) return;

    if (deleteConfirmationText !== documentToDelete.name) {
      toast.error('Document name does not match');
      return;
    }

    setIsDeleting(true);
    try {
      const { success, error } = await documentService.deleteDocument(documentToDelete.id);
      if (success) {
        toast.success('Document deleted');
        setDocumentToDelete(null);
        refetch();
      } else {
        toast.error('Failed to delete document', { description: error?.message });
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('An error occurred while deleting document');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDocumentIds.size === 0) return;
    setDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    if (selectedDocumentIds.size === 0) return;

    setIsDeleting(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const id of selectedDocumentIds) {
        try {
          const { success } = await documentService.deleteDocument(id);
          if (success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
          console.error(`Error deleting document ${id}:`, error);
        }
      }

      if (successCount > 0) {
        toast.success(`Deleted ${successCount} document(s)${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
        setSelectedDocumentIds(new Set());
        refetch();
      } else if (errorCount > 0) {
        toast.error(`Failed to delete ${errorCount} document(s)`);
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('An error occurred while deleting documents');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleToggleFavorite = async (document: Document) => {
    const success = await documentService.toggleFavorite(document.id, !document.is_favorite);
    if (success) {
      toast.success(document.is_favorite ? 'Removed from favorites' : 'Added to favorites');
      refetch();
    } else {
      toast.error('Failed to update favorite status');
    }
  };

  const handleToggleHidden = async (document: Document) => {
    const success = await documentService.toggleHidden(document.id, !document.is_hidden);
    if (success) {
      toast.success(document.is_hidden ? 'Document unhidden' : 'Document hidden');
      refetch();
    } else {
      toast.error('Failed to update hidden status');
    }
  };

  const handleEdit = (document: Document) => {
    setSelectedDocument(document);
    setFormData({
      name: document.name,
      description: document.description || '',
      tags: document.tags.join(', '),
    });
    setEditDialogOpen(true);
  };

  const handleDocumentClick = (document: Document) => {
    // Navigate to full page editor
    navigate(`/documents/${document.id}`);
  };

  return (
    <DashboardLayout title="Documents" subtitle="Manage your document projects" fullHeight>
      <div className="flex flex-col h-full bg-background">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 transition-all duration-200">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <h2 className="text-lg font-semibold tracking-tight">Documents</h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {selectedDocumentIds.size > 0 && (
              <div className="flex items-center gap-2 mr-2 animate-fade-in bg-destructive/10 px-3 py-1.5 rounded-xl border border-destructive/20">
                <span className="text-xs font-medium text-destructive">{selectedDocumentIds.size} selected</span>
                <div className="h-4 w-px bg-destructive/20 mx-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            )}

            <div className="flex items-center gap-2 bg-accent/30 p-1 rounded-xl border border-border/30">
              <Button
                variant="default"
                size="sm"
                className="h-8 text-xs font-medium shadow-sm rounded-lg"
                onClick={() => {
                  setFormData({ name: '', description: '', tags: '' });
                  setCreateDialogOpen(true);
                }}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New Document
              </Button>
            </div>

            <div className="flex items-center bg-accent/30 p-1 rounded-xl border border-border/30">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-lg transition-all",
                  viewMode === 'grid' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-lg transition-all",
                  viewMode === 'list' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Documents List/Grid */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mx-auto mb-3"></div>
                <p className="text-xs text-muted-foreground">Loading...</p>
              </div>
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No documents</p>
              <p className="text-xs text-muted-foreground mb-4">
                Create a new document project to get started
              </p>
              <Button
                variant="default"
                size="sm"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Document
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {documents.map((document) => (
                <Card
                  key={document.id}
                  className={cn(
                    'cursor-pointer hover:shadow-md transition-shadow',
                    selectedDocumentIds.has(document.id) && 'ring-2 ring-primary'
                  )}
                  onClick={() => {
                    if (selectedDocumentIds.size > 0) {
                      const newSelection = new Set(selectedDocumentIds);
                      if (newSelection.has(document.id)) {
                        newSelection.delete(document.id);
                      } else {
                        newSelection.add(document.id);
                      }
                      setSelectedDocumentIds(newSelection);
                    } else {
                      handleDocumentClick(document);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    const newSelection = new Set(selectedDocumentIds);
                    if (newSelection.has(document.id)) {
                      newSelection.delete(document.id);
                    } else {
                      newSelection.add(document.id);
                    }
                    setSelectedDocumentIds(newSelection);
                  }}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="h-5 w-5 text-primary shrink-0" />
                        <CardTitle className="text-sm truncate">{document.name}</CardTitle>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {document.is_hidden && (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    {document.description && (
                      <CardDescription className="text-xs line-clamp-2 mt-1">
                        {document.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {document.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {document.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{document.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {new Date(document.updated_at).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(document);
                          }}
                        >
                          {document.is_favorite ? (
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                          ) : (
                            <StarOff className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(document);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(document);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((document) => (
                <Card
                  key={document.id}
                  className={cn(
                    'cursor-pointer hover:bg-accent/50 transition-colors',
                    selectedDocumentIds.has(document.id) && 'ring-2 ring-primary'
                  )}
                  onClick={() => {
                    if (selectedDocumentIds.size > 0) {
                      const newSelection = new Set(selectedDocumentIds);
                      if (newSelection.has(document.id)) {
                        newSelection.delete(document.id);
                      } else {
                        newSelection.add(document.id);
                      }
                      setSelectedDocumentIds(newSelection);
                    } else {
                      handleDocumentClick(document);
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="h-5 w-5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-sm truncate">{document.name}</h3>
                            {document.is_favorite && (
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 shrink-0" />
                            )}
                            {document.is_hidden && (
                              <EyeOff className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                          </div>
                          {document.description && (
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {document.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {document.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {document.tags.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{document.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-muted-foreground mr-2">
                          {new Date(document.updated_at).toLocaleDateString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(document);
                          }}
                        >
                          {document.is_favorite ? (
                            <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                          ) : (
                            <StarOff className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(document);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(document);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Create Document Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Document</DialogTitle>
              <DialogDescription>
                Create a new document project to organize your work.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter document name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter document description"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="tag1, tag2, tag3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateDocument}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Document Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Document</DialogTitle>
              <DialogDescription>
                Update document information.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter document name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter document description"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
                <Input
                  id="edit-tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="tag1, tag2, tag3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateDocument}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Single Delete Confirmation Dialog */}
        <Dialog open={!!documentToDelete} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                Delete Document
              </DialogTitle>
              <DialogDescription>
                This will move <span className="font-semibold text-foreground">"{documentToDelete?.name}"</span> to the Recycle Bin.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  To confirm, please type the document name: <span className="font-medium text-foreground">{documentToDelete?.name}</span>
                </p>
                <Input
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  placeholder="Type document name here"
                  className="bg-background/50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && deleteConfirmationText === documentToDelete?.name) {
                      confirmSingleDelete();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDocumentToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmSingleDelete}
                disabled={isDeleting || deleteConfirmationText !== documentToDelete?.name}
              >
                {isDeleting ? 'Deleting...' : 'Delete Document'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={confirmBulkDelete}
          itemCount={selectedDocumentIds.size}
          itemType="document"
          isLoading={isDeleting}
        />

        {/* Document Editor */}
        {/* Document Editor Removed */}
      </div>
    </DashboardLayout>
  );
}

