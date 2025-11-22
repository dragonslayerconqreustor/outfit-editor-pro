-- Add tags and favorites support
ALTER TABLE public.user_images 
ADD COLUMN tags TEXT[] DEFAULT '{}',
ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE,
ADD COLUMN description TEXT;

-- Create index for faster tag searches
CREATE INDEX idx_user_images_tags ON public.user_images USING GIN(tags);

-- Create index for favorites
CREATE INDEX idx_user_images_favorites ON public.user_images(user_id, is_favorite) WHERE is_favorite = TRUE;