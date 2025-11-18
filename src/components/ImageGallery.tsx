import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Maximize2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SavedImage {
  id: string;
  original_url: string;
  edited_url: string | null;
  filename: string;
  uploaded_at: string;
  storage_path: string;
}

interface ImageGalleryProps {
  onSelectImage: (imageUrl: string) => void;
  onViewFullscreen: (imageUrl: string) => void;
}

export const ImageGallery = ({ onSelectImage, onViewFullscreen }: ImageGalleryProps) => {
  const [images, setImages] = useState<SavedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadImages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_images")
      .select("*")
      .order("uploaded_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error loading images",
        description: error.message,
      });
    } else {
      setImages(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadImages();
  }, []);

  const handleDelete = async (id: string, storagePath: string) => {
    const { error: storageError } = await supabase.storage
      .from("fashion-images")
      .remove([storagePath]);

    if (storageError) {
      toast({
        variant: "destructive",
        title: "Error deleting from storage",
        description: storageError.message,
      });
      return;
    }

    const { error: dbError } = await supabase
      .from("user_images")
      .delete()
      .eq("id", id);

    if (dbError) {
      toast({
        variant: "destructive",
        title: "Error deleting image",
        description: dbError.message,
      });
    } else {
      toast({
        title: "Image deleted",
        description: "Image has been removed from your gallery.",
      });
      loadImages();
    }
    setDeleteId(null);
  };

  const downloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error downloading",
        description: "Failed to download the image.",
      });
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Loading your gallery...</p>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No saved images yet. Upload and edit images to build your gallery!</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.map((image) => (
          <Card key={image.id} className="overflow-hidden group">
            <CardContent className="p-0 relative">
              <img
                src={image.edited_url || image.original_url}
                alt={image.filename}
                className="w-full h-64 object-cover cursor-pointer"
                onClick={() => onSelectImage(image.original_url)}
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => onViewFullscreen(image.edited_url || image.original_url)}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => downloadImage(image.edited_url || image.original_url, image.filename)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => setDeleteId(image.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <p className="text-white text-sm truncate">{image.filename}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the image from your gallery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const image = images.find((img) => img.id === deleteId);
                if (image) handleDelete(image.id, image.storage_path);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
