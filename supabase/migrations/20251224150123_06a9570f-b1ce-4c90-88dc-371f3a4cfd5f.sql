-- Fix the security definer view issue
-- Drop the view and recreate without security definer (views inherit the invoker's permissions by default)
DROP VIEW IF EXISTS public.public_profiles;

-- Recreate the view - by default views use SECURITY INVOKER which respects RLS
-- We need to add RLS bypass only for this specific view on public fields
CREATE VIEW public.public_profiles WITH (security_invoker = true) AS
SELECT id, full_name, avatar_url, classroom 
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;