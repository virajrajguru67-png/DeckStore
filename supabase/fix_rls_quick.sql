-- Quick fix for RLS policies - Run this in Supabase SQL Editor
-- This fixes the file upload and storage quota issues

-- Fix files INSERT policy
DROP POLICY IF EXISTS "Users can create files" ON public.files;
CREATE POLICY "Users can create files" ON public.files
  FOR INSERT 
  WITH CHECK (
    auth.uid() IS NOT NULL AND 
    owner_id = auth.uid()
  );

-- Add missing INSERT policy for storage_quotas
DROP POLICY IF EXISTS "Users can create own quota" ON public.storage_quotas;
CREATE POLICY "Users can create own quota" ON public.storage_quotas
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- Fix storage_quotas UPDATE policy to allow users to update their own quota
DROP POLICY IF EXISTS "Users can update own quota" ON public.storage_quotas;
CREATE POLICY "Users can update own quota" ON public.storage_quotas
  FOR UPDATE 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Keep system update policy (allows service role)
DROP POLICY IF EXISTS "System can update quotas" ON public.storage_quotas;
CREATE POLICY "System can update quotas" ON public.storage_quotas
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);

