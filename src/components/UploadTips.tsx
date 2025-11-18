import { Card } from "@/components/ui/card";
import { Info } from "lucide-react";

export const UploadTips = () => {
  return (
    <Card className="p-4 bg-muted/50">
      <div className="flex gap-3">
        <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="space-y-2 text-sm">
          <p className="font-medium">Tips for best results:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Use clear, well-lit photos with visible clothing</li>
            <li>• Describe clothing simply (e.g., "blue dress" not "revealing outfit")</li>
            <li>• Try the example prompts for inspiration</li>
            <li>• Save your favorites to the gallery for later</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};
