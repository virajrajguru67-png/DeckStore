-- Add metadata column to folders table for favorites support
-- This allows folders to store favorite status and other metadata

ALTER TABLE public.folders 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add index for faster queries on metadata
CREATE INDEX IF NOT EXISTS idx_folders_metadata_favorite 
ON public.folders USING gin (metadata jsonb_path_ops)
WHERE metadata->>'is_favorite' = 'true';

-- Update RLS policies if needed (folders already have RLS, but ensure metadata is accessible)
-- The existing RLS policies should already cover metadata access

COMMENT ON COLUMN public.folders.metadata IS 'JSONB column for storing folder metadata such as favorite status';

