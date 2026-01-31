
-- Fix RLS policy for profiles to allow admin to view all profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile or admin can view all" 
ON public.profiles 
FOR SELECT 
USING (id = auth.uid() OR is_admin());

-- Also allow admin to update any profile (for linking contacts)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile or admin can update all" 
ON public.profiles 
FOR UPDATE 
USING (id = auth.uid() OR is_admin());
