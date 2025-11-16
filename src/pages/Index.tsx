import { useState } from "react";
import { Upload, Sparkles, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [editedImage, setEditedImage] = useState<string>("");
  const [clothingPrompt, setClothingPrompt] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [detectedClothing, setDetectedClothing] = useState<string[]>([]);
  const { toast } = useToast();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file",
          description: "Please upload an image file",
          variant: "destructive",
        });
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setEditedImage("");
      setDetectedClothing([]);
    }
  };

  const analyzeClothing = async () => {
    if (!imagePreview) return;

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-clothing', {
        body: { image: imagePreview }
      });

      if (error) throw error;

      setDetectedClothing(data.clothing);
      toast({
        title: "Analysis complete",
        description: "Clothing items detected successfully",
      });
    } catch (error) {
      console.error('Error analyzing clothing:', error);
      toast({
        title: "Analysis failed",
        description: "Failed to analyze clothing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const editClothing = async () => {
    if (!imagePreview || !clothingPrompt.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide a description of the new clothing",
        variant: "destructive",
      });
      return;
    }

    setIsEditing(true);
    try {
      const { data, error } = await supabase.functions.invoke('edit-clothing', {
        body: { 
          image: imagePreview,
          prompt: clothingPrompt 
        }
      });

      if (error) throw error;

      setEditedImage(data.editedImage);
      toast({
        title: "Editing complete",
        description: "Your clothing has been changed successfully",
      });
    } catch (error) {
      console.error('Error editing clothing:', error);
      toast({
        title: "Editing failed",
        description: "Failed to edit clothing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEditing(false);
    }
  };

  const downloadImage = () => {
    if (!editedImage) return;

    const link = document.createElement('a');
    link.href = editedImage;
    link.download = 'edited-clothing.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden relative">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10 animate-pulse" style={{ animationDuration: '8s' }} />
      
      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-primary bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-1000">
            AI Fashion Editor
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-150">
            Transform any outfit with the power of AI. Upload an image, describe your vision, and watch the magic happen.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Left Column - Upload & Controls */}
          <div className="space-y-6 animate-in fade-in slide-in-from-left duration-700">
            <Card className="p-8 bg-card/50 backdrop-blur-sm border-border shadow-card hover:shadow-glow transition-all duration-300">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <Upload className="w-6 h-6 text-primary" />
                Upload Image
              </h2>
              
              <div className="space-y-6">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-all duration-300 cursor-pointer bg-muted/30"
                     onClick={() => document.getElementById('image-upload')?.click()}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="max-h-64 mx-auto rounded-lg shadow-lg" />
                  ) : (
                    <div className="py-12">
                      <Upload className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Click to upload or drag and drop</p>
                      <p className="text-sm text-muted-foreground mt-2">PNG, JPG, WEBP up to 10MB</p>
                    </div>
                  )}
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>

                {imagePreview && (
                  <>
                    <Button 
                      onClick={analyzeClothing} 
                      disabled={isAnalyzing}
                      className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                      size="lg"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 mr-2" />
                          Analyze Clothing
                        </>
                      )}
                    </Button>

                    {detectedClothing.length > 0 && (
                      <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                        <h3 className="font-semibold text-sm text-foreground">Detected Items:</h3>
                        <div className="flex flex-wrap gap-2">
                          {detectedClothing.map((item, idx) => (
                            <span key={idx} className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm border border-primary/30">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <label className="text-sm font-medium text-foreground">
                        Describe the new clothing
                      </label>
                      <Textarea
                        placeholder="e.g., a professional business suit with a blue tie, an elegant red evening gown, casual jeans and a white t-shirt..."
                        value={clothingPrompt}
                        onChange={(e) => setClothingPrompt(e.target.value)}
                        className="min-h-32 bg-muted/30 border-border focus:border-primary transition-colors"
                      />
                    </div>

                    <Button 
                      onClick={editClothing} 
                      disabled={isEditing || !clothingPrompt.trim()}
                      className="w-full bg-gradient-secondary hover:opacity-90 transition-opacity"
                      size="lg"
                    >
                      {isEditing ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Editing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 mr-2" />
                          Transform Clothing
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* Right Column - Result */}
          <div className="space-y-6 animate-in fade-in slide-in-from-right duration-700">
            <Card className="p-8 bg-card/50 backdrop-blur-sm border-border shadow-card hover:shadow-glow transition-all duration-300 min-h-[500px] flex flex-col">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-secondary" />
                Result
              </h2>
              
              {editedImage ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                  <div className="relative group">
                    <img 
                      src={editedImage} 
                      alt="Edited result" 
                      className="max-h-96 rounded-lg shadow-2xl transition-transform duration-300 group-hover:scale-[1.02]" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />
                  </div>
                  <Button 
                    onClick={downloadImage}
                    className="bg-accent hover:bg-accent/90 transition-colors"
                    size="lg"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download Image
                  </Button>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <div className="w-32 h-32 mx-auto bg-gradient-accent rounded-full flex items-center justify-center opacity-20">
                      <Sparkles className="w-16 h-16" />
                    </div>
                    <p className="text-muted-foreground">
                      {isEditing ? "AI is working its magic..." : "Upload an image and describe your vision to see the result here"}
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Powered by advanced AI image editing technology
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
