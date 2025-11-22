import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Maximize2, Trash2, RefreshCw, Star, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ImageSearch } from "./ImageSearch";
import { TagManager } from "./TagManager";
import { ImageMetadata } from "./ImageMetadata";
import { GallerySkeleton } from "./LoadingSkeleton";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface SavedImage {
  id: string;
  original_url: string;
  edited_url: string | null;
  filename: string;
  uploaded_at: string;
  storage_path: string;
  tags?: string[];
  is_favorite?: boolean;
  description?: string;
}

interface ImageGalleryProps {
  onSelectImage: (imageUrl: string) => void;
  onViewFullscreen: (imageUrl: string) => void;
}

export const ImageGallery = ({ onSelectImage, onViewFullscreen }: ImageGalleryProps) => {
  const [images, setImages] = useState<SavedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingImage, setEditingImage] = useState<SavedImage | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "favorites">("newest");
  const { toast } = useToast();

  const loadImages = async (showToast = false) => {
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
      if (showToast) {
        toast({
          title: "Gallery refreshed",
          description: `${data?.length || 0} images loaded`,
        });
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadImages();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadImages(true);
    setRefreshing(false);
  };

  const toggleFavorite = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from("user_images")
      .update({ is_favorite: !currentState })
      .eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error updating favorite",
        description: error.message,
      });
    } else {
      loadImages();
      toast({
        title: currentState ? "Removed from favorites" : "Added to favorites",
      });
    }
  };

  const handleUpdateMetadata = async () => {
    if (!editingImage) return;

    const { error } = await supabase
      .from("user_images")
      .update({
        tags: editingImage.tags,
        description: editingImage.description,
      })
      .eq("id", editingImage.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error updating image",
        description: error.message,
      });
    } else {
      toast({
        title: "Image updated",
        description: "Tags and description saved successfully.",
      });
      loadImages();
      setEditingImage(null);
    }
  };

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

  // Get all unique tags from all images
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    images.forEach((img) => {
      img.tags?.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet);
  }, [images]);

  // Filter and sort images
  const filteredImages = useMemo(() => {
    let filtered = images;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (img) =>
          img.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
          img.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Favorites filter
    if (showFavoritesOnly) {
      filtered = filtered.filter((img) => img.is_favorite);
    }

    // Tags filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter((img) =>
        selectedTags.every((tag) => img.tags?.includes(tag))
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
      } else if (sortBy === "oldest") {
        return new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime();
      } else {
        // favorites first
        if (a.is_favorite && !b.is_favorite) return -1;
        if (!a.is_favorite && b.is_favorite) return 1;
        return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
      }
    });

    return filtered;
  }, [images, searchQuery, showFavoritesOnly, selectedTags, sortBy]);

  if (loading) {
    return <GallerySkeleton />;
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <Card className="p-8 max-w-md mx-auto">
          <div className="space-y-4">
            <div className="text-6xl">📸</div>
            <h3 className="text-xl font-semibold">No images yet</h3>
            <p className="text-muted-foreground">
              Upload and edit images to build your gallery!
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-2xl font-semibold">
            {filteredImages.length} {filteredImages.length === 1 ? "Image" : "Images"}
          </h2>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <ImageSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showFavoritesOnly={showFavoritesOnly}
          onToggleFavorites={() => setShowFavoritesOnly(!showFavoritesOnly)}
          selectedTags={selectedTags}
          onToggleTag={(tag) => {
            setSelectedTags((prev) =>
              prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
            );
          }}
          availableTags={allTags}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />

        {filteredImages.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No images match your filters</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredImages.map((image) => (
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
                      onClick={() => toggleFavorite(image.id, image.is_favorite || false)}
                    >
                      <Star
                        className={`h-4 w-4 ${image.is_favorite ? "fill-current" : ""}`}
                      />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => setEditingImage(image)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
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
                      onClick={() =>
                        downloadImage(image.edited_url || image.original_url, image.filename)
                      }
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
                  <div className="absolute top-2 right-2">
                    {image.is_favorite && (
                      <Star className="h-5 w-5 text-primary fill-current drop-shadow-lg" />
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <p className="text-white text-sm truncate">{image.filename}</p>
                    {image.tags && image.tags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {image.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs bg-primary/80 text-primary-foreground px-2 py-0.5 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Metadata Dialog */}
      <Dialog open={!!editingImage} onOpenChange={() => setEditingImage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Image Details</DialogTitle>
          </DialogHeader>
          {editingImage && (
            <div className="space-y-4">
              <div>
                <img
                  src={editingImage.edited_url || editingImage.original_url}
                  alt={editingImage.filename}
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Add a description..."
                  value={editingImage.description || ""}
                  onChange={(e) =>
                    setEditingImage({ ...editingImage, description: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Tags</Label>
                <TagManager
                  tags={editingImage.tags || []}
                  onTagsChange={(tags) => setEditingImage({ ...editingImage, tags })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingImage(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMetadata}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the image from your
              gallery.
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