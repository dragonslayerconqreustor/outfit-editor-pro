import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FullscreenImageModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const FullscreenImageModal = ({ imageUrl, onClose }: FullscreenImageModalProps) => {
  const { toast } = useToast();

  const downloadImage = async () => {
    if (!imageUrl) return;

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error downloading",
        description: "Failed to download the image.",
      });
    }
  };

  return (
    <Dialog open={!!imageUrl} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-0 bg-black/95">
        <DialogHeader className="sr-only">
          <DialogTitle>Fullscreen image viewer</DialogTitle>
          <DialogDescription>View the selected image in fullscreen and download it.</DialogDescription>
        </DialogHeader>
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="absolute top-4 right-4 z-50 flex gap-2">
            <Button
              size="icon"
              variant="secondary"
              onClick={downloadImage}
              className="bg-white/10 hover:bg-white/20 text-white"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              onClick={onClose}
              className="bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Fullscreen view"
              className="max-w-full max-h-[90vh] object-contain"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
