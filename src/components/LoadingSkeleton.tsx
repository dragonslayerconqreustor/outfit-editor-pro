import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export const ImageCardSkeleton = () => (
  <Card className="overflow-hidden">
    <Skeleton className="w-full aspect-square" />
    <div className="p-4 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
  </Card>
);

export const GallerySkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[...Array(6)].map((_, i) => (
      <ImageCardSkeleton key={i} />
    ))}
  </div>
);

export const ImagePreviewSkeleton = () => (
  <Card className="p-6 space-y-4">
    <Skeleton className="h-6 w-32" />
    <Skeleton className="w-full aspect-square rounded-lg" />
    <div className="flex gap-2">
      <Skeleton className="h-10 flex-1" />
      <Skeleton className="h-10 w-24" />
    </div>
  </Card>
);