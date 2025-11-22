import { Calendar, FileText, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface ImageMetadataProps {
  filename: string;
  uploadedAt: string;
  tags?: string[];
  description?: string;
  isFavorite?: boolean;
}

export const ImageMetadata = ({
  filename,
  uploadedAt,
  tags = [],
  description,
  isFavorite,
}: ImageMetadataProps) => {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium truncate">{filename}</p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {format(new Date(uploadedAt), "PPp")}
            </p>
          </div>
        </div>
        {isFavorite && (
          <Star className="h-5 w-5 text-primary fill-current" />
        )}
      </div>

      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
};