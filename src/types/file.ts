export interface File {
  id: string;
  name: string;
  path: string;
  mime_type: string;
  size: number;
  file_hash: string | null;
  folder_id: string | null;
  owner_id: string;
  parent_path: string | null;
  storage_key: string;
  version_number: number;
  current_version_id: string | null;
  metadata: Record<string, any>;
  deleted_at: string | null;
  is_encrypted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  name: string;
  path: string;
  parent_folder_id: string | null;
  owner_id: string;
  color: string | null;
  icon: string | null;
  is_root: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FileVersion {
  id: string;
  file_id: string;
  version_number: number;
  storage_key: string;
  size: number;
  file_hash: string | null;
  created_by: string | null;
  change_description: string | null;
  created_at: string;
}

export interface FileUploadProgress {
  file: File | null;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}


