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

interface KeyboardShortcutsProps {
  onNavigate?: (tab: string) => void;
  onSave?: () => void;
  onEdit?: () => void;
  onUpload?: () => void;
}

export const KeyboardShortcuts = ({ onNavigate, onSave, onEdit, onUpload }: KeyboardShortcutsProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      // Help dialog - Shift + ?
      if (e.key === "?" && e.shiftKey) {
        e.preventDefault();
        setOpen(true);
        return;
      }

      // Skip other shortcuts when in input
      if (isInput) return;

      // Save - Ctrl/Cmd + S
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        onSave?.();
        return;
      }

      // Upload - Ctrl/Cmd + U
      if ((e.ctrlKey || e.metaKey) && e.key === "u") {
        e.preventDefault();
        onUpload?.();
        return;
      }

      // Edit - Ctrl/Cmd + E
      if ((e.ctrlKey || e.metaKey) && e.key === "e") {
        e.preventDefault();
        onEdit?.();
        return;
      }

      // Tab navigation with number keys
      if (e.key === "1" && !e.ctrlKey && !e.metaKey) {
        onNavigate?.("editor");
        return;
      }
      if (e.key === "2" && !e.ctrlKey && !e.metaKey) {
        onNavigate?.("gallery");
        return;
      }
      if (e.key === "3" && !e.ctrlKey && !e.metaKey) {
        onNavigate?.("prompts");
        return;
      }
      if (e.key === "4" && !e.ctrlKey && !e.metaKey) {
        onNavigate?.("collections");
        return;
      }
      if (e.key === "5" && !e.ctrlKey && !e.metaKey) {
        onNavigate?.("stats");
        return;
      }
      if (e.key === "6" && !e.ctrlKey && !e.metaKey) {
        onNavigate?.("ai");
        return;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [onNavigate, onSave, onEdit, onUpload]);

  const shortcuts = [
    { key: "Shift + ?", description: "Show keyboard shortcuts" },
    { key: "Ctrl/Cmd + S", description: "Save current image" },
    { key: "Ctrl/Cmd + E", description: "Start editing" },
    { key: "Ctrl/Cmd + U", description: "Upload new image" },
    { key: "Escape", description: "Close dialogs and fullscreen" },
    { key: "1", description: "Go to Editor tab" },
    { key: "2", description: "Go to Gallery tab" },
    { key: "3", description: "Go to Prompts tab" },
    { key: "4", description: "Go to Collections tab" },
    { key: "5", description: "Go to Statistics tab" },
    { key: "6", description: "Go to AI Tools tab" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Keyboard shortcuts (Shift + ?)">
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
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg"
            >
              <span className="text-sm">{shortcut.description}</span>
              <Badge variant="outline" className="font-mono text-xs">
                {shortcut.key}
              </Badge>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};