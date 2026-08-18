DROP VIEW IF EXISTS public.public_events;

-- Column-level grants: anonymous visitors only see non-sensitive event columns
REVOKE SELECT ON public.events FROM anon;
GRANT SELECT (id, name, description, event_date, is_active, copa_year, logo_url, edition)
ON public.events TO anon;

CREATE POLICY "Anyone can view active events"
ON public.events
FOR SELECT
TO anon
USING (is_active = true);