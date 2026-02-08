import { useState, useEffect } from "react";
import { Upload, Sparkles, Download, Loader2, LogOut, Save, Image as ImageIcon, Settings as SettingsIcon, Share2, Layers, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Auth } from "@/components/Auth";
import { ImageGallery } from "@/components/ImageGallery";
import { FullscreenImageModal } from "@/components/FullscreenImageModal";
import { ExamplePrompts } from "@/components/ExamplePrompts";
import { UploadTips } from "@/components/UploadTips";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { SavedPrompts } from "@/components/SavedPrompts";
import { Collections } from "@/components/Collections";
import { UsageStatistics } from "@/components/UsageStatistics";
import { AISuggestions } from "@/components/AISuggestions";
import { ImageComparison } from "@/components/ImageComparison";
import { ShareLink } from "@/components/ShareLink";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [editedImage, setEditedImage] = useState<string>("");
  const [clothingPrompt, setClothingPrompt] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [detectedClothing, setDetectedClothing] = useState<string[]>([]);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState("editor");
  const [selectedForComparison, setSelectedForComparison] = useState<Array<{ id: string; url: string; filename: string }>>([]);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [shareImageId, setShareImageId] = useState<string | null>(null);
  const [savedImageId, setSavedImageId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Keyboard shortcut handlers
  const handleKeyboardSave = () => {
    if (imagePreview && user) {
      saveImage();
    }
  };

  const handleKeyboardUpload = () => {
    document.getElementById("image-upload")?.click();
  };

  const handleKeyboardEdit = () => {
    if (imagePreview && clothingPrompt.trim()) {
      editClothing();
    }
  };

  // Escape key for closing modals
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFullscreenImage(null);
        setIsComparisonOpen(false);
        setShareImageId(null);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file",
          description: "Please upload an image file (JPEG, PNG, etc.)",
          variant: "destructive",
        });
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 10MB",
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
      setClothingPrompt("");
    }
  };

  const handlePromptSelect = async (prompt: string) => {
    setClothingPrompt(prompt);
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

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (data?.error) {
        toast({
          title: "Unable to edit",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      if (!data?.editedImage) {
        throw new Error('No edited image returned from the server');
      }

      setEditedImage(data.editedImage);
      
      if (data.sanitized) {
        toast({
          title: "Prompt adjusted",
          description: `Made adjustments for safety. Generated successfully!`,
        });
      } else {
        toast({
          title: "Success!",
          description: "Your clothing has been changed successfully",
        });
      }
    } catch (error: any) {
      console.error('Error editing clothing:', error);
      
      let errorMessage = "Failed to edit clothing. Please try a different description.";
      
      if (error.message?.includes('content_filter') || error.message?.includes('safety')) {
        errorMessage = "The AI safety filters blocked this request. Try a more neutral clothing description.";
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = "Network error. Please check your connection and try again.";
      }
      
      toast({
        title: "Editing failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsEditing(false);
    }
  };

  const saveImage = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to save images",
        variant: "destructive",
      });
      return;
    }

    if (!imagePreview) {
      toast({
        title: "No image",
        description: "Please upload an image first",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      let fileToUpload: File;
      
      if (selectedImage) {
        fileToUpload = selectedImage;
      } else {
        const response = await fetch(imagePreview);
        const blob = await response.blob();
        fileToUpload = new File([blob], `image-${Date.now()}.png`, { type: 'image/png' });
      }

      const fileExt = fileToUpload.name.split('.').pop() || 'png';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("fashion-images")
        .upload(fileName, fileToUpload);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("fashion-images")
        .getPublicUrl(fileName);

      let editedPublicUrl = null;
      if (editedImage) {
        const editedResponse = await fetch(editedImage);
        const editedBlob = await editedResponse.blob();
        const editedFile = new File([editedBlob], `edited-${Date.now()}.png`, { type: 'image/png' });
        const editedFileName = `${user.id}/edited-${Date.now()}.png`;
        
        const { error: editedUploadError } = await supabase.storage
          .from("fashion-images")
          .upload(editedFileName, editedFile);

        if (!editedUploadError) {
          const { data: { publicUrl: editedUrl } } = supabase.storage
            .from("fashion-images")
            .getPublicUrl(editedFileName);
          editedPublicUrl = editedUrl;
        }
      }

      const { error: dbError } = await supabase.from("user_images").insert({
        user_id: user.id,
        original_url: publicUrl,
        edited_url: editedPublicUrl,
        filename: fileToUpload.name,
        storage_path: fileName,
      });

      if (dbError) throw dbError;

      toast({
        title: "Saved successfully!",
        description: "Image has been added to your gallery.",
      });
      
      setCurrentTab("gallery");
    } catch (error: any) {
      console.error("Error saving image:", error);
      toast({
        variant: "destructive",
        title: "Error saving",
        description: error.message || "Failed to save image. Please try again.",
      });
    } finally {
      setIsSaving(false);
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleSelectFromGallery = (imageUrl: string) => {
    setImagePreview(imageUrl);
    setEditedImage("");
    setDetectedClothing([]);
    setCurrentTab("editor");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
          <Loader2 className="h-12 w-12 animate-spin text-primary relative" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <>
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in">
            <div className="flex items-center gap-4">
              <div className="icon-glow">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold gradient-text">
                  AI Fashion Editor
                </h1>
                <p className="text-muted-foreground mt-1">
                  Transform your style with AI-powered editing
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <KeyboardShortcuts
                onNavigate={setCurrentTab}
                onSave={handleKeyboardSave}
                onEdit={handleKeyboardEdit}
                onUpload={handleKeyboardUpload}
              />
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => navigate("/settings")}
                className="border-border/50 hover:border-primary/50 hover:bg-primary/10 transition-all"
              >
                <SettingsIcon className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                onClick={handleSignOut}
                className="border-border/50 hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive transition-all"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </header>

          <Tabs value={currentTab} onValueChange={setCurrentTab} className="animate-slide-up">
            <TabsList className="glass-card border-0 p-1 h-auto flex-wrap">
              <TabsTrigger 
                value="editor" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/20 data-[state=active]:to-primary/10 data-[state=active]:text-primary transition-all gap-2"
              >
                <Wand2 className="h-4 w-4" />
                <span className="hidden sm:inline">Editor</span>
              </TabsTrigger>
              <TabsTrigger 
                value="gallery" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/20 data-[state=active]:to-primary/10 data-[state=active]:text-primary transition-all gap-2"
              >
                <ImageIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Gallery</span>
              </TabsTrigger>
              <TabsTrigger 
                value="prompts" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/20 data-[state=active]:to-primary/10 data-[state=active]:text-primary transition-all gap-2"
              >
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline">Prompts</span>
              </TabsTrigger>
              <TabsTrigger 
                value="collections" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/20 data-[state=active]:to-primary/10 data-[state=active]:text-primary transition-all gap-2"
              >
                <Layers className="h-4 w-4" />
                <span className="hidden sm:inline">Collections</span>
              </TabsTrigger>
              <TabsTrigger 
                value="stats" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/20 data-[state=active]:to-primary/10 data-[state=active]:text-primary transition-all gap-2"
              >
                <SettingsIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Stats</span>
              </TabsTrigger>
              <TabsTrigger 
                value="ai" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/20 data-[state=active]:to-primary/10 data-[state=active]:text-primary transition-all gap-2"
              >
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">AI</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="editor" className="space-y-8 mt-6">
              <UploadTips />
              
              {/* Upload Section */}
              <Card className="glass-card p-8 border-dashed border-2 border-border/50 hover:border-primary/30 transition-all card-hover">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="icon-glow float">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold">Upload an Image</h2>
                    <p className="text-muted-foreground mt-2">
                      Choose a photo with clothing to edit
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <Button asChild size="lg" className="btn-glow bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                    <label htmlFor="image-upload" className="cursor-pointer">
                      Select Image
                    </label>
                  </Button>
                </div>
              </Card>

              {/* Image Preview & Analysis */}
              {imagePreview && (
                <div className="grid md:grid-cols-2 gap-8">
                  <Card className="glass-card p-6 space-y-4 card-hover stagger-item">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-primary" />
                      Original Image
                    </h3>
                    <div className="relative group overflow-hidden rounded-lg">
                      <img
                        src={imagePreview}
                        alt="Original"
                        className="w-full rounded-lg cursor-pointer transition-transform duration-300 group-hover:scale-105"
                        onClick={() => setFullscreenImage(imagePreview)}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                        <span className="text-sm text-foreground/80">Click to enlarge</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={analyzeClothing}
                        disabled={isAnalyzing}
                        className="flex-1 btn-glow"
                        variant="secondary"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Analyze Clothing
                          </>
                        )}
                      </Button>
                      {selectedImage && (
                        <Button
                          onClick={saveImage}
                          disabled={isSaving || !user}
                          variant="outline"
                          className="border-primary/30 hover:bg-primary/10"
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>

                    {detectedClothing.length > 0 && (
                      <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
                        <p className="text-sm font-medium text-muted-foreground">Detected Items:</p>
                        <div className="flex flex-wrap gap-2">
                          {detectedClothing.map((item, index) => (
                            <span
                              key={index}
                              className="px-3 py-1.5 bg-gradient-to-r from-primary/20 to-secondary/20 text-primary border border-primary/20 rounded-full text-sm stagger-item"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>

                  {editedImage && (
                    <>
                      <Card className="glass-card p-6 space-y-4 card-hover stagger-item">
                        <h3 className="text-xl font-semibold flex items-center gap-2">
                          <Wand2 className="h-5 w-5 text-accent" />
                          Edited Image
                        </h3>
                        <div className="relative group overflow-hidden rounded-lg">
                          <img
                            src={editedImage}
                            alt="Edited"
                            className="w-full rounded-lg cursor-pointer transition-transform duration-300 group-hover:scale-105"
                            onClick={() => setFullscreenImage(editedImage)}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                            <span className="text-sm text-foreground/80">Click to enlarge</span>
                          </div>
                        </div>
                        <Button 
                          onClick={downloadImage} 
                          className="w-full btn-glow bg-gradient-to-r from-accent to-secondary"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </Card>
                      
                      <BeforeAfterSlider
                        beforeImage={imagePreview}
                        afterImage={editedImage}
                      />
                    </>
                  )}
                </div>
              )}

              {/* Edit Section */}
              {imagePreview && (
                <>
                  <Card className="glass-card p-6 space-y-4 card-hover">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                      <Wand2 className="h-5 w-5 text-primary" />
                      Edit Clothing
                    </h3>
                    <Textarea
                      placeholder="Describe the new clothing (e.g., 'red summer dress', 'blue denim jacket')..."
                      value={clothingPrompt}
                      onChange={(e) => setClothingPrompt(e.target.value)}
                      className="min-h-[100px] bg-muted/30 border-border/50 focus:border-primary/50 resize-none"
                    />
                    <Button
                      onClick={editClothing}
                      disabled={isEditing || !clothingPrompt.trim()}
                      className="w-full btn-glow bg-gradient-to-r from-primary to-secondary"
                      size="lg"
                    >
                      {isEditing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Editing Clothing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Edit Clothing
                        </>
                      )}
                    </Button>
                  </Card>

                  <ExamplePrompts onSelectPrompt={setClothingPrompt} />
                </>
              )}
            </TabsContent>

            <TabsContent value="gallery" className="space-y-4 mt-6">
              <div className="flex justify-end gap-2 mb-4">
                {selectedForComparison.length >= 2 && (
                  <Button
                    variant="outline"
                    onClick={() => setIsComparisonOpen(true)}
                    className="border-primary/30 hover:bg-primary/10"
                  >
                    <Layers className="h-4 w-4 mr-2" />
                    Compare {selectedForComparison.length} Images
                  </Button>
                )}
                {savedImageId && (
                  <Button
                    variant="outline"
                    onClick={() => setShareImageId(savedImageId)}
                    className="border-secondary/30 hover:bg-secondary/10"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                )}
              </div>
              <ImageGallery
                onSelectImage={handleSelectFromGallery}
                onViewFullscreen={setFullscreenImage}
              />
            </TabsContent>

            <TabsContent value="prompts" className="space-y-4 mt-6">
              <SavedPrompts onSelectPrompt={handlePromptSelect} />
            </TabsContent>

            <TabsContent value="collections" className="space-y-4 mt-6">
              <Collections selectedImages={savedImageId ? [savedImageId] : []} />
            </TabsContent>

            <TabsContent value="stats" className="space-y-4 mt-6">
              <UsageStatistics />
            </TabsContent>

            <TabsContent value="ai" className="space-y-4 mt-6">
              <AISuggestions
                imageUrl={imagePreview}
                onPromptSuggestion={setClothingPrompt}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <FullscreenImageModal
        imageUrl={fullscreenImage}
        onClose={() => setFullscreenImage(null)}
      />

      <ImageComparison
        images={selectedForComparison}
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
      />

      {shareImageId && (
        <ShareLink
          imageId={shareImageId}
          isOpen={!!shareImageId}
          onClose={() => setShareImageId(null)}
        />
      )}
    </>
  );
};

export default Index;
