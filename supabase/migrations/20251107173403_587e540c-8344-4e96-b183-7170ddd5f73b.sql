-- Adicionar novos campos na tabela events para configuração da copa
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS edition text;

-- Criar tabela para regras da copa
CREATE TABLE IF NOT EXISTS public.event_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_rules ENABLE ROW LEVEL SECURITY;

-- Criar tabela para premiações
CREATE TABLE IF NOT EXISTS public.event_prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  position integer NOT NULL,
  title text NOT NULL,
  description text,
  prize_details text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_prizes ENABLE ROW LEVEL SECURITY;

-- Adicionar campo para tipo de mídia no carousel (imagem ou vídeo)
ALTER TABLE public.carousel_images
ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image',
ADD COLUMN IF NOT EXISTS video_url text;

-- RLS policies para event_rules
CREATE POLICY "Anyone can view event rules"
ON public.event_rules FOR SELECT
USING (true);

CREATE POLICY "Admins can manage event rules"
ON public.event_rules FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies para event_prizes
CREATE POLICY "Anyone can view event prizes"
ON public.event_prizes FOR SELECT
USING (true);

CREATE POLICY "Admins can manage event prizes"
ON public.event_prizes FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_event_rules_updated_at
BEFORE UPDATE ON public.event_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_event_prizes_updated_at
BEFORE UPDATE ON public.event_prizes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();