-- Criar tabela para configuração do evento Copa do CSS
CREATE TABLE IF NOT EXISTS public.copa_css_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL UNIQUE,
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Garantir que apenas um ano pode ser marcado como atual
CREATE UNIQUE INDEX idx_copa_css_current ON public.copa_css_config (is_current) WHERE is_current = true;

-- Habilitar RLS
ALTER TABLE public.copa_css_config ENABLE ROW LEVEL SECURITY;

-- Políticas para copa_css_config
CREATE POLICY "Anyone can view current Copa CSS config"
ON public.copa_css_config
FOR SELECT
USING (is_current = true);

CREATE POLICY "Admins can manage Copa CSS config"
ON public.copa_css_config
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Atualizar tabela de eventos para referenciar a configuração da Copa
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS copa_year integer REFERENCES public.copa_css_config(year);

-- Atualizar a tabela user_roles para adicionar emails iniciais como admin
-- Primeiro, precisamos de uma função para adicionar admins por email
CREATE OR REPLACE FUNCTION public.add_admin_by_email(_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  -- Buscar o user_id pelo email
  SELECT id INTO _user_id
  FROM auth.users
  WHERE email = _email;
  
  IF _user_id IS NOT NULL THEN
    -- Inserir ou atualizar o role para admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;

-- Criar tabela para gerenciar solicitações de admin
CREATE TABLE IF NOT EXISTS public.admin_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  invited_by uuid REFERENCES auth.users(id) NOT NULL,
  invited_at timestamp with time zone NOT NULL DEFAULT now(),
  accepted_at timestamp with time zone
);

-- Habilitar RLS
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

-- Políticas para admin_invites
CREATE POLICY "Admins can view all invites"
ON public.admin_invites
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create invites"
ON public.admin_invites
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete invites"
ON public.admin_invites
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para adicionar automaticamente admin quando o usuário faz login
CREATE OR REPLACE FUNCTION public.check_admin_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se há convite pendente para este email
  IF EXISTS (
    SELECT 1 FROM public.admin_invites
    WHERE email = NEW.email AND accepted_at IS NULL
  ) THEN
    -- Adicionar como admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Marcar convite como aceito
    UPDATE public.admin_invites
    SET accepted_at = now()
    WHERE email = NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para verificar convites ao criar usuário
DROP TRIGGER IF EXISTS on_auth_user_created_check_invite ON auth.users;
CREATE TRIGGER on_auth_user_created_check_invite
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.check_admin_invite();

-- Inserir os emails iniciais como convites de admin
INSERT INTO public.admin_invites (email, invited_by)
SELECT 'rangel.silva@estudante.ifms.edu.br', (SELECT id FROM auth.users LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.admin_invites WHERE email = 'rangel.silva@estudante.ifms.edu.br');

INSERT INTO public.admin_invites (email, invited_by)
SELECT 'rangel.silva@ifms.edu.br', (SELECT id FROM auth.users LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.admin_invites WHERE email = 'rangel.silva@ifms.edu.br');

-- Inserir configuração inicial da Copa do CSS com ano atual
INSERT INTO public.copa_css_config (year, is_current)
VALUES (EXTRACT(YEAR FROM CURRENT_DATE)::integer, true)
ON CONFLICT (year) DO NOTHING;