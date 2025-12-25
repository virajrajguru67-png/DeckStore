export interface Share {
  id: string;
  resource_type: 'file' | 'folder';
  resource_id: string;
  share_type: 'internal' | 'external_link';
  shared_by: string;
  access_level: 'view' | 'download' | 'edit';
  password_hash: string | null;
  expires_at: string | null;
  link_token: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}


