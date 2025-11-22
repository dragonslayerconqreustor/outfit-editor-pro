import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Bell, Palette, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    notifications: true,
    autoSave: false,
    highQuality: true,
    darkMode: false,
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    toast({
      title: "Setting updated",
      description: "Your preferences have been saved.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Settings
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your preferences and account
            </p>
          </div>
        </div>

        {/* Account Settings */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Account</h2>
          </div>
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive updates about your images
                </p>
              </div>
              <Switch
                checked={settings.notifications}
                onCheckedChange={() => handleToggle("notifications")}
              />
            </div>
          </div>
        </Card>

        {/* Editor Settings */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Palette className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Editor Preferences</h2>
          </div>
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-save Images</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically save edited images to gallery
                </p>
              </div>
              <Switch
                checked={settings.autoSave}
                onCheckedChange={() => handleToggle("autoSave")}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>High Quality Output</Label>
                <p className="text-sm text-muted-foreground">
                  Generate images in higher resolution (slower)
                </p>
              </div>
              <Switch
                checked={settings.highQuality}
                onCheckedChange={() => handleToggle("highQuality")}
              />
            </div>
          </div>
        </Card>

        {/* Privacy Settings */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Privacy & Security</h2>
          </div>
          <Separator />
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Data Management</Label>
              <p className="text-sm text-muted-foreground mb-2">
                All your images are stored securely and privately
              </p>
              <Button variant="outline" className="w-full md:w-auto">
                Export All Data
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;