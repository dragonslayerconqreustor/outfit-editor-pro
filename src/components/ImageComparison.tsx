import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { X, ZoomIn, ZoomOut } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ImageComparisonProps {
  images: Array<{ id: string; url: string; filename: string }>;
  isOpen: boolean;
  onClose: () => void;
}

export const ImageComparison = ({ images, isOpen, onClose }: ImageComparisonProps) => {
  const [zoom, setZoom] = useState(100);
  const [selectedImages, setSelectedImages] = useState<number[]>([0, 1]);

  if (images.length < 2) return null;

  const handleImageSelect = (index: number, position: number) => {
    const newSelected = [...selectedImages];
    newSelected[position] = index;
    setSelectedImages(newSelected);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-6">
        <DialogHeader>
          <DialogTitle>Compare Images</DialogTitle>
          <DialogDescription>
            Select and compare your images side by side
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Zoom Controls */}
          <div className="flex items-center gap-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setZoom(Math.max(50, zoom - 25))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Slider
              value={[zoom]}
              onValueChange={(value) => setZoom(value[0])}
              min={50}
              max={200}
              step={25}
              className="flex-1"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => setZoom(Math.min(200, zoom + 25))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium w-16">{zoom}%</span>
          </div>

          {/* Image Selection */}
          <div className="grid grid-cols-2 gap-4">
            {[0, 1].map((position) => (
              <div key={position} className="space-y-2">
                <select
                  className="w-full p-2 border rounded-md bg-background"
                  value={selectedImages[position]}
                  onChange={(e) =>
                    handleImageSelect(parseInt(e.target.value), position)
                  }
                >
                  {images.map((img, idx) => (
                    <option key={img.id} value={idx}>
                      {img.filename}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Comparison View */}
          <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-auto">
            {selectedImages.map((imageIndex, position) => (
              <Card key={position} className="p-2">
                <div className="relative aspect-square">
                  <img
                    src={images[imageIndex].url}
                    alt={images[imageIndex].filename}
                    className="w-full h-full object-contain"
                    style={{ transform: `scale(${zoom / 100})` }}
                  />
                </div>
                <p className="text-sm text-center mt-2 font-medium">
                  {images[imageIndex].filename}
                </p>
              </Card>
            ))}
          </div>

          {/* Synchronized Zoom Info */}
          <p className="text-xs text-muted-foreground text-center">
            Both images zoom together for accurate comparison
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
