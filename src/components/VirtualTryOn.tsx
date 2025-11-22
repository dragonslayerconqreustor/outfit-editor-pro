import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const VirtualTryOn = () => {
  const [clothingImage, setClothingImage] = useState<string>("");
  const [clothingPreview, setClothingPreview] = useState<string>("");
  const [tryonResult, setTryonResult] = useState<string>("");
  const [bodyType, setBodyType] = useState<string>("average");
  const [pose, setPose] = useState<string>("standing");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleClothingUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setClothingImage(result);
        setClothingPreview(result);
      };
      reader.readAsDataURL(file);
      setTryonResult("");
    }
  };

  const handleVirtualTryOn = async () => {
    if (!clothingImage) {
      toast({
        title: "No clothing selected",
        description: "Please upload a clothing item first",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('virtual-tryon', {
        body: { 
          clothingImage,
          bodyType,
          pose
        }
      });

      if (error) throw error;

      if (data?.error) {
        toast({
          title: "Unable to generate try-on",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      if (!data?.tryonImage) {
        throw new Error('No try-on image returned');
      }

      setTryonResult(data.tryonImage);
      toast({
        title: "Success!",
        description: "Virtual try-on generated successfully",
      });
    } catch (error: any) {
      console.error('Error with virtual try-on:', error);
      toast({
        title: "Try-on failed",
        description: error.message || "Failed to generate virtual try-on. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-semibold">Virtual Try-On</h3>
        </div>
        
        <div className="text-sm text-muted-foreground mb-4">
          Upload a clothing item and see how it looks on different body types and poses
        </div>

        {/* Upload Section */}
        <div className="border-2 border-dashed rounded-lg p-6 text-center">
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-2">Upload clothing item</p>
          <input
            type="file"
            accept="image/*"
            onChange={handleClothingUpload}
            className="hidden"
            id="clothing-upload"
          />
          <Button asChild variant="outline" size="sm">
            <label htmlFor="clothing-upload" className="cursor-pointer">
              Select Clothing
            </label>
          </Button>
        </div>

        {clothingPreview && (
          <>
            <img
              src={clothingPreview}
              alt="Clothing item"
              className="w-full max-w-xs mx-auto rounded-lg"
            />

            {/* Body Type Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Body Type</label>
              <Select value={bodyType} onValueChange={setBodyType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="athletic">Athletic</SelectItem>
                  <SelectItem value="slim">Slim</SelectItem>
                  <SelectItem value="average">Average</SelectItem>
                  <SelectItem value="plus">Plus Size</SelectItem>
                  <SelectItem value="petite">Petite</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pose Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Pose</label>
              <Select value={pose} onValueChange={setPose}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standing">Standing</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="fashion">Fashion Model</SelectItem>
                  <SelectItem value="sitting">Sitting</SelectItem>
                  <SelectItem value="walking">Walking</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleVirtualTryOn}
              disabled={isProcessing}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Try-On...
                </>
              ) : (
                <>
                  <User className="mr-2 h-4 w-4" />
                  Generate Virtual Try-On
                </>
              )}
            </Button>
          </>
        )}
      </Card>

      {/* Result */}
      {tryonResult && (
        <Card className="p-6 space-y-4">
          <h3 className="text-xl font-semibold">Try-On Result</h3>
          <img
            src={tryonResult}
            alt="Virtual try-on result"
            className="w-full rounded-lg"
          />
        </Card>
      )}
    </div>
  );
};
