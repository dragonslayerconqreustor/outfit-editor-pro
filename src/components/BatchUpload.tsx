import { useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface BatchUploadProps {
  onUploadComplete: (images: File[]) => void;
}

export const BatchUpload = ({ onUploadComplete }: BatchUploadProps) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    
    if (imageFiles.length !== files.length) {
      toast({
        title: "Some files skipped",
        description: "Only image files are accepted",
        variant: "destructive",
      });
    }

    const validFiles = imageFiles.filter((file) => file.size <= 10 * 1024 * 1024);
    
    if (validFiles.length !== imageFiles.length) {
      toast({
        title: "Some files too large",
        description: "Images must be smaller than 10MB",
        variant: "destructive",
      });
    }

    setSelectedFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setProgress(0);

    try {
      // Simulate progress
      const increment = 100 / selectedFiles.length;
      for (let i = 0; i < selectedFiles.length; i++) {
        setProgress((prev) => Math.min(prev + increment, 100));
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      onUploadComplete(selectedFiles);
      setSelectedFiles([]);
      
      toast({
        title: "Upload complete",
        description: `${selectedFiles.length} images uploaded successfully`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload some images",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">Batch Upload</h3>
        <p className="text-sm text-muted-foreground">
          Upload multiple images at once (max 10MB each)
        </p>
      </div>

      <div className="flex flex-col items-center justify-center space-y-4 border-2 border-dashed rounded-lg p-8">
        <Upload className="h-12 w-12 text-muted-foreground" />
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="batch-upload"
          disabled={uploading}
        />
        <Button asChild variant="outline" disabled={uploading}>
          <label htmlFor="batch-upload" className="cursor-pointer">
            Select Multiple Images
          </label>
        </Button>
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {selectedFiles.length} {selectedFiles.length === 1 ? "file" : "files"} selected
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedFiles([])}
              disabled={uploading}
            >
              Clear All
            </Button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-muted rounded flex-shrink-0 overflow-hidden">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-sm truncate">{file.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={() => removeFile(index)}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                Uploading... {Math.round(progress)}%
              </p>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full"
            size="lg"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload {selectedFiles.length} {selectedFiles.length === 1 ? "Image" : "Images"}
              </>
            )}
          </Button>
        </div>
      )}
    </Card>
  );
};