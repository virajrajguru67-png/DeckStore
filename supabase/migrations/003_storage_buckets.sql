-- Storage bucket configuration for Deck Store

-- Create the 'files' storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('files', 'files', false, 52428800, NULL) -- 50MB default limit
ON CONFLICT (id) DO NOTHING;

-- Create the 'versions' storage bucket if it doesn't exist (for file versioning)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('versions', 'versions', false, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- RLS Policies for 'files' bucket
-- ============================================

-- Policy: Authenticated users can upload files to their own folder
CREATE POLICY "Users can upload files to their folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view files they own or have permission to access
CREATE POLICY "Users can view accessible files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'files' AND (
    -- Users can view files in their own folder
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Users can view files they have permission to access (check via files table)
    EXISTS (
      SELECT 1 FROM public.files
      WHERE storage_key = (bucket_id || '/' || name)
      AND (
        owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.file_permissions
          WHERE file_id = files.id
          AND user_id = auth.uid()
          AND permission_type IN ('read', 'write', 'admin')
        )
        OR EXISTS (
          SELECT 1 FROM public.folders
          WHERE id = files.folder_id
          AND (
            owner_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.folder_permissions
              WHERE folder_id = folders.id
              AND user_id = auth.uid()
              AND permission_type IN ('read', 'write', 'admin')
            )
          )
        )
      )
    )
  )
);

-- Policy: Users can update files they own or have write permission
CREATE POLICY "Users can update accessible files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'files' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.files
      WHERE storage_key = (bucket_id || '/' || name)
      AND (
        owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.file_permissions
          WHERE file_id = files.id
          AND user_id = auth.uid()
          AND permission_type IN ('write', 'admin')
        )
      )
    )
  )
)
WITH CHECK (
  bucket_id = 'files' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.files
      WHERE storage_key = (bucket_id || '/' || name)
      AND (
        owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.file_permissions
          WHERE file_id = files.id
          AND user_id = auth.uid()
          AND permission_type IN ('write', 'admin')
        )
      )
    )
  )
);

-- Policy: Users can delete files they own or have delete permission
CREATE POLICY "Users can delete accessible files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'files' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.files
      WHERE storage_key = (bucket_id || '/' || name)
      AND (
        owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.file_permissions
          WHERE file_id = files.id
          AND user_id = auth.uid()
          AND permission_type IN ('delete', 'admin')
        )
      )
    )
  )
);

-- ============================================
-- RLS Policies for 'versions' bucket
-- ============================================

-- Policy: Users can upload versions for files they have write access to
CREATE POLICY "Users can upload file versions"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'versions' 
  AND EXISTS (
    SELECT 1 FROM public.files
    WHERE storage_key LIKE '%' || (storage.foldername(name))[2] || '%'
    AND (
      owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.file_permissions
        WHERE file_id = files.id
        AND user_id = auth.uid()
        AND permission_type IN ('write', 'admin')
      )
    )
  )
);

-- Policy: Users can view versions for files they have access to
CREATE POLICY "Users can view file versions"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'versions'
  AND EXISTS (
    SELECT 1 FROM public.file_versions
    JOIN public.files ON files.id = file_versions.file_id
    WHERE file_versions.storage_key = (bucket_id || '/' || name)
    AND (
      files.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.file_permissions
        WHERE file_id = files.id
        AND user_id = auth.uid()
        AND permission_type IN ('read', 'write', 'admin')
      )
    )
  )
);

-- Policy: Users can delete versions for files they own (for cleanup)
CREATE POLICY "Users can delete file versions"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'versions'
  AND EXISTS (
    SELECT 1 FROM public.file_versions
    JOIN public.files ON files.id = file_versions.file_id
    WHERE file_versions.storage_key = (bucket_id || '/' || name)
    AND files.owner_id = auth.uid()
  )
);


