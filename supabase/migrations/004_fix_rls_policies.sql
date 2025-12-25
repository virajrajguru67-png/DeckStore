-- Fix RLS policies for file uploads and storage quotas

-- Ensure files INSERT policy allows authenticated users to create files they own
DROP POLICY IF EXISTS "Users can create files" ON public.files;
CREATE POLICY "Users can create files" ON public.files
  FOR INSERT 
  WITH CHECK (
    auth.uid() IS NOT NULL AND 
    owner_id = auth.uid()
  );

-- Add INSERT policy for storage_quotas (was missing)
CREATE POLICY "Users can create own quota" ON public.storage_quotas
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- Ensure storage_quotas UPDATE policy allows users to update their own quota
DROP POLICY IF EXISTS "System can update quotas" ON public.storage_quotas;
CREATE POLICY "Users can update own quota" ON public.storage_quotas
  FOR UPDATE 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Also allow system/service role to update quotas (for automated processes)
CREATE POLICY "System can update quotas" ON public.storage_quotas
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);

