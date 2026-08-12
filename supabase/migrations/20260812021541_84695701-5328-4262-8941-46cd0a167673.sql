
-- 1. Move SECURITY DEFINER helpers out of the API-exposed public schema
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;
ALTER FUNCTION public.get_teammate_public_profile(uuid) SET SCHEMA private;
ALTER FUNCTION public.validate_event_email_domain(uuid, text) SET SCHEMA private;

-- Policies still need EXECUTE on has_role; the others are internal only
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.get_teammate_public_profile(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION private.validate_event_email_domain(uuid, text) FROM anon, authenticated;

-- 2. Restrict team member visibility
DROP POLICY IF EXISTS "Authenticated users can view team members" ON public.team_members;

CREATE POLICY "Team members, captains and admins can view team members"
ON public.team_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR private.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = team_members.team_id AND t.captain_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.team_members m
    WHERE m.team_id = team_members.team_id AND m.user_id = auth.uid()
  )
);

-- 3. Admins can review admin requests
CREATE POLICY "Admins can view admin requests"
ON public.admin_requests
FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));
