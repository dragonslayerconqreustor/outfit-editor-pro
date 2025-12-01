import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Tag, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AISuggestionsProps {
  imageUrl?: string;
  currentTags?: string[];
  recentPrompts?: string[];
  onTagSuggestion?: (tags: string[]) => void;
  onPromptSuggestion?: (prompt: string) => void;
}

export const AISuggestions = ({
  imageUrl,
  currentTags = [],
  recentPrompts = [],
  onTagSuggestion,
  onPromptSuggestion,
}: AISuggestionsProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [promptSuggestions, setPromptSuggestions] = useState<string[]>([]);
  const { toast } = useToast();

  const generateSuggestions = async () => {
    setIsGenerating(true);
    try {
      // Generate tag suggestions based on image
      if (imageUrl) {
        const { data, error } = await supabase.functions.invoke("analyze-clothing", {
          body: { imageData: imageUrl },
        });

        if (error) throw error;

        // Extract suggested tags from analysis
        const items = data?.items || [];
        const suggestedTags = items.flatMap((item: any) =>
          [
            item.garmentType,
            item.color,
            item.style,
            ...(item.details || []),
          ].filter(Boolean)
        ) as string[];
        setTagSuggestions([...new Set(suggestedTags)].slice(0, 8));
      }

      // Generate prompt suggestions based on history
      const prompts = [
        "Make it more casual",
        "Add a formal touch",
        "Change to summer style",
        "Add vintage aesthetic",
        "Make it sporty",
      ];

      // Filter out recently used prompts
      const unusedPrompts = prompts.filter(
        (p) => !recentPrompts.some((recent) => recent.includes(p))
      );
      setPromptSuggestions(unusedPrompts.slice(0, 3));

      toast({ title: "Suggestions generated!" });
    } catch (error) {
      toast({
        title: "Failed to generate suggestions",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Suggestions
        </h3>
        <Button
          size="sm"
          onClick={generateSuggestions}
          disabled={isGenerating}
        >
          {isGenerating ? "Generating..." : "Get Suggestions"}
        </Button>
      </div>

      {/* Tag Suggestions */}
      {tagSuggestions.length > 0 && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <h4 className="font-medium">Suggested Tags</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {tagSuggestions.map((tag) => (
              <Badge
                key={tag}
                variant={currentTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                onClick={() => {
                  if (!currentTags.includes(tag) && onTagSuggestion) {
                    onTagSuggestion([...currentTags, tag]);
                  }
                }}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Prompt Suggestions */}
      {promptSuggestions.length > 0 && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            <h4 className="font-medium">Edit Ideas</h4>
          </div>
          <div className="space-y-2">
            {promptSuggestions.map((prompt, index) => (
              <Button
                key={index}
                variant="outline"
                className="w-full justify-start"
                onClick={() => onPromptSuggestion?.(prompt)}
              >
                {prompt}
              </Button>
            ))}
          </div>
        </Card>
      )}

      {tagSuggestions.length === 0 && promptSuggestions.length === 0 && (
        <Card className="p-6 text-center text-muted-foreground">
          <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Click "Get Suggestions" to receive AI-powered recommendations</p>
        </Card>
      )}
    </div>
  );
};
