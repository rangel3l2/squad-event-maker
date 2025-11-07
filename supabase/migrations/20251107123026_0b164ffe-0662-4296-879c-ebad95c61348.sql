-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view current Copa CSS config" ON public.copa_css_config;
DROP POLICY IF EXISTS "Admins can manage Copa CSS config" ON public.copa_css_config;
DROP POLICY IF EXISTS "Admins can view all invites" ON public.admin_invites;
DROP POLICY IF EXISTS "Admins can create invites" ON public.admin_invites;
DROP POLICY IF EXISTS "Admins can delete invites" ON public.admin_invites;

-- Recreate policies
CREATE POLICY "Anyone can view current Copa CSS config"
  ON public.copa_css_config FOR SELECT
  USING (is_current = true);

CREATE POLICY "Admins can manage Copa CSS config"
  ON public.copa_css_config FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all invites"
  ON public.admin_invites FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create invites"
  ON public.admin_invites FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete invites"
  ON public.admin_invites FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create carousel_images table
CREATE TABLE IF NOT EXISTS public.carousel_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for carousel_images
ALTER TABLE public.carousel_images ENABLE ROW LEVEL SECURITY;

-- Create policies for carousel_images
DROP POLICY IF EXISTS "Anyone can view active carousel images" ON public.carousel_images;
DROP POLICY IF EXISTS "Admins can manage carousel images" ON public.carousel_images;

CREATE POLICY "Anyone can view active carousel images"
  ON public.carousel_images FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage carousel images"
  ON public.carousel_images FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_carousel_images_updated_at ON public.carousel_images;
CREATE TRIGGER update_carousel_images_updated_at
  BEFORE UPDATE ON public.carousel_images
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create storage bucket for carousel images
INSERT INTO storage.buckets (id, name, public)
VALUES ('carousel-images', 'carousel-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop and recreate storage policies for carousel images
DROP POLICY IF EXISTS "Anyone can view carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete carousel images" ON storage.objects;

CREATE POLICY "Anyone can view carousel images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'carousel-images');

CREATE POLICY "Admins can upload carousel images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'carousel-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update carousel images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'carousel-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete carousel images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'carousel-images' AND has_role(auth.uid(), 'admin'::app_role));