-- Add shared_with column to shares table
-- This directly tracks who the share is intended for (recipient)

-- Add the column
ALTER TABLE public.shares
ADD COLUMN IF NOT EXISTS shared_with UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_shares_shared_with ON public.shares(shared_with);

-- Update RLS policy to allow users to see shares where they are the recipient
DROP POLICY IF EXISTS "Users can view relevant shares" ON public.shares;

CREATE POLICY "Users can view relevant shares" ON public.shares
  FOR SELECT USING (
    -- User created the share
    shared_by = auth.uid() OR
    -- User is the recipient of the share
    shared_with = auth.uid() OR
    -- User has permission on the file (for backward compatibility)
    (resource_type = 'file' AND EXISTS (
      SELECT 1 FROM public.file_permissions
      WHERE file_id = shares.resource_id
      AND user_id = auth.uid()
    )) OR
    -- User has permission on the folder (for backward compatibility)
    (resource_type = 'folder' AND EXISTS (
      SELECT 1 FROM public.folder_permissions
      WHERE folder_id = shares.resource_id
      AND user_id = auth.uid()
    ))
  );

DO $$ BEGIN
  RAISE NOTICE '✅ Added shared_with column to shares table!';
  RAISE NOTICE '✅ Updated RLS policy to allow direct recipient queries!';
END $$;

