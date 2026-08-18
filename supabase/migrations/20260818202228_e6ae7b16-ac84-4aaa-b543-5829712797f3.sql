-- 1. Restrict public event exposure: only safe columns for anonymous visitors
DROP POLICY IF EXISTS "Anyone can view active events" ON public.events;

CREATE POLICY "Authenticated users can view active events"
ON public.events
FOR SELECT
TO authenticated
USING (is_active = true);

CREATE OR REPLACE VIEW public.public_events
WITH (security_invoker = false) AS
SELECT id, name, description, event_date, is_active, copa_year, logo_url, edition
FROM public.events
WHERE is_active = true;

GRANT SELECT ON public.public_events TO anon, authenticated;

-- 2. Teams can only be created by the captain themself, for an existing active event
DROP POLICY IF EXISTS "Students can create teams" ON public.teams;

CREATE POLICY "Users can create teams they captain"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (
  captain_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = teams.event_id AND e.is_active = true
  )
);