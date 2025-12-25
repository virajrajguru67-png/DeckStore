-- Fix existing shares that don't have permission records
-- This script creates permission records for all internal shares that are missing them

-- First, let's see what shares exist
DO $$
DECLARE
    share_record RECORD;
    target_user_id UUID;
    perm_type TEXT;
BEGIN
    -- Loop through all internal shares
    FOR share_record IN 
        SELECT s.*, 
               CASE s.access_level
                   WHEN 'edit' THEN 'write'
                   WHEN 'view' THEN 'read'
                   WHEN 'download' THEN 'read'
                   ELSE 'read'
               END as permission_type
        FROM public.shares s
        WHERE s.share_type = 'internal'
        AND NOT EXISTS (
            -- Check if permission already exists
            SELECT 1 
            FROM public.file_permissions fp
            WHERE fp.file_id = s.resource_id 
            AND s.resource_type = 'file'
            UNION ALL
            SELECT 1 
            FROM public.folder_permissions fop
            WHERE fop.folder_id = s.resource_id 
            AND s.resource_type = 'folder'
        )
    LOOP
        -- For internal shares, we need to find the user who should have access
        -- Since we don't store the target user_id in shares table, we'll need to
        -- look it up from the share_access_logs or create a different approach
        
        -- Actually, the issue is that internal shares don't store WHO they're shared with
        -- We need to check if there's a way to identify this
        
        -- For now, let's create a note that this needs manual intervention
        RAISE NOTICE 'Share % (resource: %, type: %) needs permission record but target user is unknown', 
            share_record.id, share_record.resource_id, share_record.resource_type;
    END LOOP;
END $$;

-- Better approach: Create a function to manually fix a specific share
-- This will be called from the application or run manually

CREATE OR REPLACE FUNCTION fix_share_permissions(
    p_share_id UUID,
    p_target_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    share_record RECORD;
    perm_type TEXT;
BEGIN
    -- Get the share details
    SELECT * INTO share_record
    FROM public.shares
    WHERE id = p_share_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Share not found: %', p_share_id;
    END IF;
    
    -- Determine permission type from access level
    perm_type := CASE share_record.access_level
        WHEN 'edit' THEN 'write'
        WHEN 'view' THEN 'read'
        WHEN 'download' THEN 'read'
        ELSE 'read'
    END;
    
    -- Create permission record
    IF share_record.resource_type = 'file' THEN
        INSERT INTO public.file_permissions (file_id, user_id, permission_type)
        VALUES (share_record.resource_id, p_target_user_id, perm_type::permission_type)
        ON CONFLICT (file_id, user_id, permission_type) DO NOTHING;
    ELSE
        INSERT INTO public.folder_permissions (folder_id, user_id, permission_type)
        VALUES (share_record.resource_id, p_target_user_id, perm_type::permission_type)
        ON CONFLICT (folder_id, user_id, permission_type) DO NOTHING;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION fix_share_permissions(UUID, UUID) TO authenticated;

