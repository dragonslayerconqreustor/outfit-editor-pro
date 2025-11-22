import { useEffect, useState } from "react";
import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export const KeyboardShortcuts = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Help dialog
      if (e.key === "?" && e.shiftKey) {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  const shortcuts = [
    { key: "?", description: "Show keyboard shortcuts" },
    { key: "Ctrl/Cmd + S", description: "Save current image" },
    { key: "Escape", description: "Close dialogs and fullscreen" },
    { key: "Tab", description: "Switch between Editor and Gallery" },
    { key: "Ctrl/Cmd + U", description: "Upload new image" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Keyboard className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate the app faster
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
            >
              <span className="text-sm">{shortcut.description}</span>
              <Badge variant="outline" className="font-mono">
                {shortcut.key}
              </Badge>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};