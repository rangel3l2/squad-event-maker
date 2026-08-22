CREATE TABLE public.join_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id bigint NOT NULL,
  team_name text NOT NULL,
  event_code integer NOT NULL,
  requester_user_id uuid NOT NULL,
  requester_api_id bigint,
  requester_name text NOT NULL,
  requester_email text NOT NULL,
  requester_avatar text,
  captain_api_id bigint,
  captain_email text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  response_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT join_requests_status_check CHECK (status IN ('pending','accepted','rejected','cancelled')),
  CONSTRAINT join_requests_message_len CHECK (char_length(message) BETWEEN 1 AND 1000)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.join_requests TO authenticated;
GRANT ALL ON public.join_requests TO service_role;

ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX join_requests_unique_pending
  ON public.join_requests (team_id, requester_user_id)
  WHERE status = 'pending';

CREATE INDEX join_requests_captain_idx ON public.join_requests (lower(captain_email), status);

CREATE POLICY "Requester can view own requests"
  ON public.join_requests FOR SELECT TO authenticated
  USING (requester_user_id = auth.uid());

CREATE POLICY "Captain can view requests for their team"
  ON public.join_requests FOR SELECT TO authenticated
  USING (lower(captain_email) = lower(coalesce(auth.jwt() ->> 'email', '')));

CREATE POLICY "Requester can create own requests"
  ON public.join_requests FOR INSERT TO authenticated
  WITH CHECK (requester_user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Requester can cancel own requests"
  ON public.join_requests FOR UPDATE TO authenticated
  USING (requester_user_id = auth.uid())
  WITH CHECK (requester_user_id = auth.uid());

CREATE POLICY "Captain can respond to requests"
  ON public.join_requests FOR UPDATE TO authenticated
  USING (lower(captain_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  WITH CHECK (lower(captain_email) = lower(coalesce(auth.jwt() ->> 'email', '')));

CREATE TRIGGER update_join_requests_updated_at
  BEFORE UPDATE ON public.join_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.join_requests;