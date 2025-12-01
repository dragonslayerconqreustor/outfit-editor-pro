import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit2, TrendingUp } from "lucide-react";
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

interface SavedPrompt {
  id: string;
  name: string;
  prompt: string;
  category: string | null;
  used_count: number;
  created_at: string;
}

interface SavedPromptsProps {
  onSelectPrompt: (prompt: string, promptId: string) => void;
}

export const SavedPrompts = ({ onSelectPrompt }: SavedPromptsProps) => {
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<SavedPrompt | null>(null);
  const [formData, setFormData] = useState({ name: "", prompt: "", category: "" });
  const { toast } = useToast();

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    const { data, error } = await supabase
      .from("saved_prompts")
      .select("*")
      .order("used_count", { ascending: false });

    if (error) {
      toast({ title: "Error loading prompts", variant: "destructive" });
    } else {
      setPrompts(data || []);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.prompt) {
      toast({ title: "Name and prompt are required", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editingPrompt) {
      const { error } = await supabase
        .from("saved_prompts")
        .update(formData)
        .eq("id", editingPrompt.id);

      if (error) {
        toast({ title: "Error updating prompt", variant: "destructive" });
      } else {
        toast({ title: "Prompt updated successfully" });
        fetchPrompts();
      }
    } else {
      const { error } = await supabase
        .from("saved_prompts")
        .insert([{ ...formData, user_id: user.id }]);

      if (error) {
        toast({ title: "Error saving prompt", variant: "destructive" });
      } else {
        toast({ title: "Prompt saved successfully" });
        fetchPrompts();
      }
    }

    setIsDialogOpen(false);
    setEditingPrompt(null);
    setFormData({ name: "", prompt: "", category: "" });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("saved_prompts")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error deleting prompt", variant: "destructive" });
    } else {
      toast({ title: "Prompt deleted" });
      fetchPrompts();
    }
  };

  const handleUsePrompt = async (prompt: SavedPrompt) => {
    // Increment usage count
    await supabase
      .from("saved_prompts")
      .update({ used_count: prompt.used_count + 1 })
      .eq("id", prompt.id);

    onSelectPrompt(prompt.prompt, prompt.id);
    fetchPrompts();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Saved Prompts</h3>
        <Button
          size="sm"
          onClick={() => {
            setEditingPrompt(null);
            setFormData({ name: "", prompt: "", category: "" });
            setIsDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Prompt
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {prompts.map((prompt) => (
          <Card key={prompt.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium">{prompt.name}</h4>
                {prompt.category && (
                  <Badge variant="outline" className="mt-1">
                    {prompt.category}
                  </Badge>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setEditingPrompt(prompt);
                    setFormData({
                      name: prompt.name,
                      prompt: prompt.prompt,
                      category: prompt.category || "",
                    });
                    setIsDialogOpen(true);
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDelete(prompt.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {prompt.prompt}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                Used {prompt.used_count} times
              </div>
              <Button size="sm" onClick={() => handleUsePrompt(prompt)}>
                Use
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPrompt ? "Edit Prompt" : "New Prompt"}
            </DialogTitle>
            <DialogDescription>
              Create a reusable prompt for quick editing
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
                placeholder="e.g., Make it casual"
              />
            </div>
            <div>
              <Label>Prompt</Label>
              <Input
                value={formData.prompt}
                onChange={(e) =>
                  setFormData({ ...formData, prompt: e.target.value })
                }
                placeholder="The editing instruction"
              />
            </div>
            <div>
              <Label>Category (optional)</Label>
              <Input
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                placeholder="e.g., Style, Color, Season"
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
    </div>
  );
};
