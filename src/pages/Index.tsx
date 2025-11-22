import { useState, useEffect } from "react";
import { Upload, Sparkles, Download, Loader2, LogOut, Save, Image as ImageIcon, Settings as SettingsIcon } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { VirtualTryOn } from "@/components/VirtualTryOn";
import { AIOutfitSuggestions } from "@/components/AIOutfitSuggestions";

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Save image
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (imagePreview && user) {
          saveImage();
        }
      }
      // Upload image
      if ((e.ctrlKey || e.metaKey) && e.key === "u") {
        e.preventDefault();
        document.getElementById("image-upload")?.click();
      }
      // Tab switch
      if (e.key === "Tab" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const activeElement = document.activeElement;
        if (activeElement?.tagName !== "INPUT" && activeElement?.tagName !== "TEXTAREA") {
          e.preventDefault();
          setCurrentTab((prev) => (prev === "editor" ? "gallery" : "editor"));
        }
      }
      // Close fullscreen
      if (e.key === "Escape") {
        setFullscreenImage(null);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [imagePreview, user]);

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
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
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
        // Handle explicit error responses from the edge function
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
      
      // Show appropriate message based on whether sanitization occurred
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
      // Convert base64 or blob URL to file
      let fileToUpload: File;
      
      if (selectedImage) {
        fileToUpload = selectedImage;
      } else {
        // If we're saving from gallery (imagePreview is a URL)
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

      // Save edited image if it exists
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

      // Save to database
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
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                AI Fashion Editor
              </h1>
              <p className="text-muted-foreground mt-2">
                Upload photos, edit clothing with AI
              </p>
            </div>
            <div className="flex gap-2">
              <KeyboardShortcuts />
              <Button variant="outline" size="icon" onClick={() => navigate("/settings")}>
                <SettingsIcon className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>

          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="editor">
                <Sparkles className="h-4 w-4 mr-2" />
                Editor
              </TabsTrigger>
              <TabsTrigger value="gallery">
                <ImageIcon className="h-4 w-4 mr-2" />
                Gallery
              </TabsTrigger>
              <TabsTrigger value="tryon">
                <Upload className="h-4 w-4 mr-2" />
                Try-On
              </TabsTrigger>
              <TabsTrigger value="suggestions">
                <Sparkles className="h-4 w-4 mr-2" />
                AI Suggestions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="editor" className="space-y-8">
              <UploadTips />
              
              {/* Upload Section */}
              <Card className="p-8 border-dashed">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <Upload className="h-12 w-12 text-muted-foreground" />
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
                  <Button asChild size="lg">
                    <label htmlFor="image-upload" className="cursor-pointer">
                      Select Image
                    </label>
                  </Button>
                </div>
              </Card>

              {/* Image Preview & Analysis */}
              {imagePreview && (
                <div className="grid md:grid-cols-2 gap-8">
                  <Card className="p-6 space-y-4">
                    <h3 className="text-xl font-semibold">Original Image</h3>
                    <img
                      src={imagePreview}
                      alt="Original"
                      className="w-full rounded-lg cursor-pointer"
                      onClick={() => setFullscreenImage(imagePreview)}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={analyzeClothing}
                        disabled={isAnalyzing}
                        className="flex-1"
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
                          variant="secondary"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Save
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    {detectedClothing.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Detected Items:</p>
                        <div className="flex flex-wrap gap-2">
                          {detectedClothing.map((item, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
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
                      <Card className="p-6 space-y-4">
                        <h3 className="text-xl font-semibold">Edited Image</h3>
                        <img
                          src={editedImage}
                          alt="Edited"
                          className="w-full rounded-lg cursor-pointer"
                          onClick={() => setFullscreenImage(editedImage)}
                        />
                        <Button onClick={downloadImage} className="w-full">
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
                  <Card className="p-6 space-y-4">
                    <h3 className="text-xl font-semibold">Edit Clothing</h3>
                    <Textarea
                      placeholder="Describe the new clothing (e.g., 'red summer dress', 'blue denim jacket')..."
                      value={clothingPrompt}
                      onChange={(e) => setClothingPrompt(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <Button
                      onClick={editClothing}
                      disabled={isEditing || !clothingPrompt.trim()}
                      className="w-full"
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

            <TabsContent value="gallery" className="space-y-4">
              <ImageGallery
                onSelectImage={handleSelectFromGallery}
                onViewFullscreen={setFullscreenImage}
              />
            </TabsContent>

            <TabsContent value="tryon" className="space-y-4">
              <VirtualTryOn />
            </TabsContent>

            <TabsContent value="suggestions" className="space-y-4">
              <AIOutfitSuggestions />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <FullscreenImageModal
        imageUrl={fullscreenImage}
        onClose={() => setFullscreenImage(null)}
      />
    </>
  );
};

export default Index;
