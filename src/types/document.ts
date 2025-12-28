export interface Document {
  id: string;
  name: string;
  description: string | null;
  content: Record<string, any>;
  owner_id: string;
  folder_id: string | null;
  tags: string[];
  is_favorite: boolean;
  is_hidden: boolean;
  deleted_at: string | null;
  ai_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDocumentInput {
  name: string;
  description?: string;
  content?: Record<string, any>;
  folder_id?: string | null;
  tags?: string[];
  ai_summary?: string;
}

export interface UpdateDocumentInput {
  name?: string;
  description?: string;
  content?: Record<string, any>;
  folder_id?: string | null;
  tags?: string[];
  is_favorite?: boolean;
  is_hidden?: boolean;
  ai_summary?: string;
}

