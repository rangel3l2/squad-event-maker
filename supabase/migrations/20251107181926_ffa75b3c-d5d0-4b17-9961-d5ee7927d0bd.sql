-- Adicionar colunas classroom e classroom_group na tabela profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS classroom TEXT,
ADD COLUMN IF NOT EXISTS classroom_group classroom_group;