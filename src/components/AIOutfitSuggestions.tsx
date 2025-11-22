import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface OutfitSuggestion {
  name: string;
  pieces: string[];
  description: string;
  tips: string;
  colors: string;
}

export const AIOutfitSuggestions = () => {
  const [season, setSeason] = useState<string>("any");
  const [occasion, setOccasion] = useState<string>("casual");
  const [stylePreference, setStylePreference] = useState<string>("versatile");
  const [suggestions, setSuggestions] = useState<OutfitSuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerateSuggestions = async () => {
    setIsGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to get suggestions",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('outfit-suggestions', {
        body: { 
          season,
          occasion,
          stylePreference,
          userId: user.id
        }
      });

      if (error) throw error;

      if (data?.error) {
        toast({
          title: "Unable to generate suggestions",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      if (!data?.suggestions || !Array.isArray(data.suggestions)) {
        throw new Error('Invalid suggestions format');
      }

      setSuggestions(data.suggestions);
      toast({
        title: "Suggestions ready!",
        description: `Generated ${data.suggestions.length} outfit ideas for you`,
      });
    } catch (error: any) {
      console.error('Error generating suggestions:', error);
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate outfit suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-semibold">AI Outfit Suggestions</h3>
        </div>
        
        <div className="text-sm text-muted-foreground mb-4">
          Get personalized outfit recommendations based on your wardrobe, season, and occasion
        </div>

        {/* Season Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Season</label>
          <Select value={season} onValueChange={setSeason}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any Season</SelectItem>
              <SelectItem value="spring">Spring</SelectItem>
              <SelectItem value="summer">Summer</SelectItem>
              <SelectItem value="fall">Fall</SelectItem>
              <SelectItem value="winter">Winter</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Occasion Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Occasion</label>
          <Select value={occasion} onValueChange={setOccasion}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="work">Work/Office</SelectItem>
              <SelectItem value="formal">Formal Event</SelectItem>
              <SelectItem value="date">Date Night</SelectItem>
              <SelectItem value="party">Party</SelectItem>
              <SelectItem value="workout">Workout</SelectItem>
              <SelectItem value="travel">Travel</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Style Preference */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Style Preference</label>
          <Select value={stylePreference} onValueChange={setStylePreference}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="versatile">Versatile</SelectItem>
              <SelectItem value="minimalist">Minimalist</SelectItem>
              <SelectItem value="bold">Bold & Colorful</SelectItem>
              <SelectItem value="classic">Classic</SelectItem>
              <SelectItem value="trendy">Trendy</SelectItem>
              <SelectItem value="boho">Bohemian</SelectItem>
              <SelectItem value="streetwear">Streetwear</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleGenerateSuggestions}
          disabled={isGenerating}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Suggestions...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Get AI Suggestions
            </>
          )}
        </Button>
      </Card>

      {/* Suggestions Display */}
      {suggestions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Your Personalized Outfits</h3>
          {suggestions.map((suggestion, index) => (
            <Card key={index} className="p-6 space-y-3">
              <div className="flex items-start justify-between">
                <h4 className="text-lg font-semibold text-primary">{suggestion.name}</h4>
                <Badge variant="secondary">Outfit {index + 1}</Badge>
              </div>
              
              {suggestion.pieces && suggestion.pieces.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">Pieces to combine:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestion.pieces.map((piece, idx) => (
                      <Badge key={idx} variant="outline">{piece}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {suggestion.description && (
                <div>
                  <p className="text-sm font-medium">Why this works:</p>
                  <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                </div>
              )}
              
              {suggestion.tips && (
                <div>
                  <p className="text-sm font-medium">Styling tips:</p>
                  <p className="text-sm text-muted-foreground">{suggestion.tips}</p>
                </div>
              )}
              
              {suggestion.colors && (
                <div>
                  <p className="text-sm font-medium">Color coordination:</p>
                  <p className="text-sm text-muted-foreground">{suggestion.colors}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
