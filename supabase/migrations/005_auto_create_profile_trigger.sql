-- Auto-create profile and role on user signup
-- This trigger automatically creates a profile and assigns a default role when a new user signs up

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile for new user
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.created_at,
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Create default role for new user (Auto-assign Admin/Owner based on name)
  INSERT INTO public.user_roles (user_id, role, created_at)
  VALUES (
    NEW.id, 
    CASE 
      WHEN (NEW.raw_user_meta_data->>'full_name') ILIKE '%Viraj%' THEN 'owner'::app_role
      WHEN (NEW.raw_user_meta_data->>'full_name') ILIKE '%Admin%' THEN 'admin'::app_role
      ELSE 'viewer'::app_role
    END, 
    now()
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to run function after user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update RLS policy for user_roles to allow system to insert roles
-- The trigger runs as SECURITY DEFINER, so it can bypass RLS
-- But we should also allow users to view their own role
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;
CREATE POLICY "Users can view all roles" ON public.user_roles
  FOR SELECT USING (true);

-- Allow users to view their own role
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

-- Keep admin policy for managing roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

