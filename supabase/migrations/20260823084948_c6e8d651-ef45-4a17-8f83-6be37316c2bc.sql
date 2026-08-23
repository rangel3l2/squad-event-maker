DROP INDEX IF EXISTS public.join_requests_unique_pending;

CREATE UNIQUE INDEX join_requests_unique_per_team
  ON public.join_requests (team_id, requester_user_id);

CREATE POLICY "Requesters can delete their own requests"
  ON public.join_requests FOR DELETE TO authenticated
  USING (requester_user_id = auth.uid());