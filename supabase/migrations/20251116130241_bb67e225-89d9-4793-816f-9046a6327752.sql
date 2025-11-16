-- Create storage bucket for user images
INSERT INTO storage.buckets (id, name, public)
VALUES ('fashion-images', 'fashion-images', true);

-- Create table to track uploaded images
CREATE TABLE public.user_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  original_url TEXT NOT NULL,
  edited_url TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_images ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only see/manage their own images
CREATE POLICY "Users can view their own images"
  ON public.user_images FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own images"
  ON public.user_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own images"
  ON public.user_images FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own images"
  ON public.user_images FOR DELETE
  USING (auth.uid() = user_id);

-- Storage policies: anyone can view (bucket is public), but only authenticated users can upload
CREATE POLICY "Public can view images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'fashion-images');

CREATE POLICY "Authenticated users can upload images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'fashion-images' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own uploads"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'fashion-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own uploads"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'fashion-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create index for faster queries
CREATE INDEX idx_user_images_user_id ON public.user_images(user_id);
CREATE INDEX idx_user_images_uploaded_at ON public.user_images(uploaded_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_images_updated_at
  BEFORE UPDATE ON public.user_images
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();