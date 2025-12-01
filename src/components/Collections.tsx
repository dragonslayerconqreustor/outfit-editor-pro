import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit2, Folder, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface Collection {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  image_count?: number;
}

interface UserImage {
  id: string;
  filename: string;
  original_url: string;
}

interface CollectionsProps {
  selectedImages?: string[];
}

export const Collections = ({ selectedImages = [] }: CollectionsProps) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [images, setImages] = useState<UserImage[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddToCollectionOpen, setIsAddToCollectionOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCollections();
    fetchImages();
  }, []);

  const fetchCollections = async () => {
    const { data, error } = await supabase
      .from("collections")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading collections", variant: "destructive" });
    } else {
      // Get image counts
      const collectionsWithCounts = await Promise.all(
        (data || []).map(async (collection) => {
          const { count } = await supabase
            .from("collection_images")
            .select("*", { count: "exact", head: true })
            .eq("collection_id", collection.id);
          return { ...collection, image_count: count || 0 };
        })
      );
      setCollections(collectionsWithCounts);
    }
  };

  const fetchImages = async () => {
    const { data } = await supabase
      .from("user_images")
      .select("id, filename, original_url")
      .order("uploaded_at", { ascending: false });
    setImages(data || []);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast({ title: "Collection name is required", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editingCollection) {
      const { error } = await supabase
        .from("collections")
        .update(formData)
        .eq("id", editingCollection.id);

      if (error) {
        toast({ title: "Error updating collection", variant: "destructive" });
      } else {
        toast({ title: "Collection updated" });
        fetchCollections();
      }
    } else {
      const { error } = await supabase
        .from("collections")
        .insert([{ ...formData, user_id: user.id }]);

      if (error) {
        toast({ title: "Error creating collection", variant: "destructive" });
      } else {
        toast({ title: "Collection created" });
        fetchCollections();
      }
    }

    setIsDialogOpen(false);
    setEditingCollection(null);
    setFormData({ name: "", description: "" });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("collections")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error deleting collection", variant: "destructive" });
    } else {
      toast({ title: "Collection deleted" });
      fetchCollections();
    }
  };

  const handleAddToCollection = async () => {
    if (!selectedCollection || selectedImages.length === 0) {
      toast({ title: "Select a collection and images", variant: "destructive" });
      return;
    }

    const inserts = selectedImages.map((imageId) => ({
      collection_id: selectedCollection,
      image_id: imageId,
    }));

    const { error } = await supabase
      .from("collection_images")
      .insert(inserts);

    if (error) {
      toast({ title: "Error adding to collection", variant: "destructive" });
    } else {
      toast({ title: `Added ${selectedImages.length} image(s) to collection` });
      setIsAddToCollectionOpen(false);
      fetchCollections();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Collections</h3>
        <div className="flex gap-2">
          {selectedImages.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAddToCollectionOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add to Collection
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => {
              setEditingCollection(null);
              setFormData({ name: "", description: "" });
              setIsDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Collection
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {collections.map((collection) => (
          <Card key={collection.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Folder className="h-5 w-5 text-primary" />
                <h4 className="font-medium">{collection.name}</h4>
              </div>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setEditingCollection(collection);
                    setFormData({
                      name: collection.name,
                      description: collection.description || "",
                    });
                    setIsDialogOpen(true);
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDelete(collection.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {collection.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {collection.description}
              </p>
            )}
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
              {collection.image_count || 0} images
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCollection ? "Edit Collection" : "New Collection"}
            </DialogTitle>
            <DialogDescription>
              Organize your images into collections
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Summer Collection"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddToCollectionOpen} onOpenChange={setIsAddToCollectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Collection</DialogTitle>
            <DialogDescription>
              Select a collection to add {selectedImages.length} image(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {collections.map((collection) => (
              <Card
                key={collection.id}
                className={`p-3 cursor-pointer transition-colors ${
                  selectedCollection === collection.id
                    ? "bg-primary/10 border-primary"
                    : "hover:bg-accent"
                }`}
                onClick={() => setSelectedCollection(collection.id)}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedCollection === collection.id}
                    onCheckedChange={() => setSelectedCollection(collection.id)}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{collection.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {collection.image_count || 0} images
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddToCollectionOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddToCollection}>Add to Collection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
