-- Fix PUBLIC_DATA_EXPOSURE: CPF and Email Accessible to Teammates
-- The current policy "Users can view team member profiles" exposes sensitive data (CPF, email)
-- We need to restrict teammates to only see public profile fields

-- First, drop the existing overly permissive policy
DROP POLICY IF EXISTS "Users can view team member profiles" ON public.profiles;

-- Create a security definer function to get only public profile fields for teammates
-- This prevents direct access to sensitive columns like cpf and email
CREATE OR REPLACE FUNCTION public.get_teammate_public_profile(_profile_id uuid)
RETURNS TABLE(id uuid, full_name text, avatar_url text, classroom text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.id, p.full_name, p.avatar_url, p.classroom
  FROM public.profiles p
  WHERE p.id = _profile_id
  AND EXISTS (
    SELECT 1 
    FROM public.team_members tm1
    JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
    WHERE tm1.user_id = auth.uid() 
    AND tm2.user_id = _profile_id
  );
$$;

-- Create a view for public profile data only
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT id, full_name, avatar_url, classroom 
FROM public.profiles;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;

-- Update the RLS policy: users can only view their OWN full profile data
-- Teammates must use the public_profiles view or the get_teammate_public_profile function
-- The existing "Users can view own profile" policy already handles own profile access

-- Add admin access to all profiles (for admin management purposes)
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));