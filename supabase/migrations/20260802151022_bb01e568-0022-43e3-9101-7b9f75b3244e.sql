-- 1. team_members: require authentication for reads
DROP POLICY IF EXISTS "Anyone can view team members" ON public.team_members;
CREATE POLICY "Authenticated users can view team members"
ON public.team_members FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- 2. team-logos upload ownership
DROP POLICY IF EXISTS "Authenticated users can upload team logos" ON storage.objects;
CREATE POLICY "Users can upload team logos to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'team-logos'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

-- 3. remove broad listing policies on public buckets (files remain reachable via public URLs)
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view team logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view carousel images" ON storage.objects;

CREATE POLICY "Users can view own avatars"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Uploaders and admins can view team logos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'team-logos'
  AND ((auth.uid())::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'::public.app_role))
);

CREATE POLICY "Admins can view carousel images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'carousel-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4. revoke EXECUTE on internal SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_user_update() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.check_admin_invite() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.check_team_member_limit() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.add_admin_by_email(text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_teammate_public_profile(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.validate_event_email_domain(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_teammate_public_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_event_email_domain(uuid, text) TO authenticated;

-- 5. prize position bounds
ALTER TABLE public.event_prizes
  ADD CONSTRAINT event_prizes_position_range CHECK (position > 0 AND position <= 100);
