-- Add CPF to profiles table for certificates
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cpf TEXT;

-- Add description and intro video to teams table
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS intro_video_url TEXT;

-- Make logo_url NOT NULL in teams table (with default for existing records)
UPDATE public.teams SET logo_url = 'https://via.placeholder.com/150' WHERE logo_url IS NULL;
ALTER TABLE public.teams 
ALTER COLUMN logo_url SET NOT NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_teams_event_id ON public.teams(event_id);