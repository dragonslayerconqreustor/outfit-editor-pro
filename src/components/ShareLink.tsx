import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Share2, Copy, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ShareLinkProps {
  imageId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareLink = ({ imageId, isOpen, onClose }: ShareLinkProps) => {
  const [shareLink, setShareLink] = useState<string>("");
  const [expiryDays, setExpiryDays] = useState<string>("never");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateShareLink = async () => {
    setIsGenerating(true);
    try {
      const token = crypto.randomUUID();
      
      let expiresAt = null;
      if (expiryDays !== "never") {
        const days = parseInt(expiryDays);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + days);
        expiresAt = expiryDate.toISOString();
      }

      const { error } = await supabase
        .from("share_links")
        .insert([
          {
            image_id: imageId,
            token,
            expires_at: expiresAt,
          },
        ]);

      if (error) throw error;

      const link = `${window.location.origin}/share/${token}`;
      setShareLink(link);
      toast({ title: "Share link generated!" });
    } catch (error) {
      toast({
        title: "Failed to generate link",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    toast({ title: "Link copied to clipboard!" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Image</DialogTitle>
          <DialogDescription>
            Generate a shareable link for this image
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Link Expiry</Label>
            <Select value={expiryDays} onValueChange={setExpiryDays}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never expires</SelectItem>
                <SelectItem value="1">1 day</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!shareLink ? (
            <Button
              onClick={generateShareLink}
              disabled={isGenerating}
              className="w-full"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Generate Share Link
            </Button>
          ) : (
            <div className="space-y-2">
              <Label>Share Link</Label>
              <div className="flex gap-2">
                <Input value={shareLink} readOnly />
                <Button onClick={copyToClipboard} size="icon">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {expiryDays !== "never" && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Expires in {expiryDays} day{expiryDays !== "1" ? "s" : ""}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
