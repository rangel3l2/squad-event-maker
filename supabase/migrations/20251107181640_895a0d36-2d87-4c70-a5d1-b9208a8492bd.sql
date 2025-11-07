-- Corrigir função para ter search_path seguro
CREATE OR REPLACE FUNCTION check_team_member_limit()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_count INTEGER;
BEGIN
  -- Contar membros atuais do time
  SELECT COUNT(*) INTO member_count
  FROM public.team_members
  WHERE team_id = NEW.team_id;
  
  -- Verificar se já atingiu o limite de 3 membros
  IF member_count >= 3 THEN
    RAISE EXCEPTION 'Este time já atingiu o limite máximo de 3 membros';
  END IF;
  
  RETURN NEW;
END;
$$;