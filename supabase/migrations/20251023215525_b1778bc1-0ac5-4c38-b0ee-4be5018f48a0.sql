-- Add allowed_email_domain to events table
ALTER TABLE public.events 
ADD COLUMN allowed_email_domain text;

-- Update RLS policies for events to allow admins to manage only their own events
DROP POLICY IF EXISTS "Admins can update events" ON public.events;
DROP POLICY IF EXISTS "Admins can delete events" ON public.events;

CREATE POLICY "Admins can update their own events" 
ON public.events 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) AND created_by = auth.uid());

CREATE POLICY "Admins can delete their own events" 
ON public.events 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) AND created_by = auth.uid());

-- Add policy for admins to view all events
CREATE POLICY "Admins can view all events" 
ON public.events 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create admin_requests table for admin approval system
CREATE TABLE public.admin_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.admin_requests ENABLE ROW LEVEL SECURITY;

-- Allow users to create their own admin request
CREATE POLICY "Users can create admin request"
ON public.admin_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own admin request
CREATE POLICY "Users can view own admin request"
ON public.admin_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Function to validate email domain for event registration
CREATE OR REPLACE FUNCTION public.validate_event_email_domain(
  _event_id uuid,
  _user_email text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN allowed_email_domain IS NULL THEN true
      WHEN allowed_email_domain = '' THEN true
      ELSE _user_email LIKE '%@' || allowed_email_domain
    END
  FROM public.events
  WHERE id = _event_id;
$$;