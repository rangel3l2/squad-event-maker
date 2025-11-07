-- Adicionar função para verificar limite de membros por time
CREATE OR REPLACE FUNCTION check_team_member_limit()
RETURNS TRIGGER AS $$
DECLARE
  member_count INTEGER;
BEGIN
  -- Contar membros atuais do time
  SELECT COUNT(*) INTO member_count
  FROM team_members
  WHERE team_id = NEW.team_id;
  
  -- Verificar se já atingiu o limite de 3 membros
  IF member_count >= 3 THEN
    RAISE EXCEPTION 'Este time já atingiu o limite máximo de 3 membros';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para validar limite antes de inserir
DROP TRIGGER IF EXISTS enforce_team_member_limit ON team_members;
CREATE TRIGGER enforce_team_member_limit
  BEFORE INSERT ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION check_team_member_limit();