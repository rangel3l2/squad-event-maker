-- Fix profiles table RLS policies to prevent public data exposure
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Allow users to view profiles of their team members
CREATE POLICY "Users can view team member profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm1
    JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
    WHERE tm1.user_id = auth.uid() AND tm2.user_id = profiles.id
  )
);

-- Fix user_roles table RLS policies to prevent role enumeration
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;

-- Allow users to view only their own role
CREATE POLICY "Users can view own role"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);