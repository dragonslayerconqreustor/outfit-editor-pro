-- Create saved prompts table
CREATE TABLE public.saved_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  category TEXT,
  used_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own prompts"
  ON public.saved_prompts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own prompts"
  ON public.saved_prompts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prompts"
  ON public.saved_prompts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prompts"
  ON public.saved_prompts FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_saved_prompts_user_id ON public.saved_prompts(user_id);

-- Create collections table
CREATE TABLE public.collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own collections"
  ON public.collections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own collections"
  ON public.collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections"
  ON public.collections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections"
  ON public.collections FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_collections_user_id ON public.collections(user_id);

-- Create collection_images junction table
CREATE TABLE public.collection_images (
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  image_id UUID NOT NULL REFERENCES public.user_images(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, image_id)
);

ALTER TABLE public.collection_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their collection images"
  ON public.collection_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE collections.id = collection_images.collection_id
      AND collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add to their collections"
  ON public.collection_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE collections.id = collection_images.collection_id
      AND collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove from their collections"
  ON public.collection_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE collections.id = collection_images.collection_id
      AND collections.user_id = auth.uid()
    )
  );

CREATE INDEX idx_collection_images_collection_id ON public.collection_images(collection_id);
CREATE INDEX idx_collection_images_image_id ON public.collection_images(image_id);

-- Create share links table
CREATE TABLE public.share_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_id UUID NOT NULL REFERENCES public.user_images(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own share links"
  ON public.share_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_images
      WHERE user_images.id = share_links.image_id
      AND user_images.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create share links for their images"
  ON public.share_links FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_images
      WHERE user_images.id = share_links.image_id
      AND user_images.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own share links"
  ON public.share_links FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_images
      WHERE user_images.id = share_links.image_id
      AND user_images.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view via valid token"
  ON public.share_links FOR SELECT
  USING (expires_at IS NULL OR expires_at > now());

CREATE INDEX idx_share_links_token ON public.share_links(token);
CREATE INDEX idx_share_links_image_id ON public.share_links(image_id);

-- Create edit history table for tracking usage
CREATE TABLE public.edit_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_id UUID REFERENCES public.user_images(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.edit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own edit history"
  ON public.edit_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own edit history"
  ON public.edit_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_edit_history_user_id ON public.edit_history(user_id);
CREATE INDEX idx_edit_history_created_at ON public.edit_history(created_at DESC);