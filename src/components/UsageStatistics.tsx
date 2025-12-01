import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { TrendingUp, Tag, Image as ImageIcon, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StatsData {
  totalImages: number;
  totalEdits: number;
  topTags: Array<{ tag: string; count: number }>;
  topPrompts: Array<{ prompt: string; count: number }>;
  recentActivity: Array<{ date: string; count: number }>;
}

export const UsageStatistics = () => {
  const [stats, setStats] = useState<StatsData>({
    totalImages: 0,
    totalEdits: 0,
    topTags: [],
    topPrompts: [],
    recentActivity: [],
  });

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get total images
    const { count: imageCount } = await supabase
      .from("user_images")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    // Get total edits
    const { count: editCount } = await supabase
      .from("edit_history")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    // Get top tags
    const { data: images } = await supabase
      .from("user_images")
      .select("tags")
      .eq("user_id", user.id)
      .not("tags", "is", null);

    const tagCounts = new Map<string, number>();
    images?.forEach((img) => {
      img.tags?.forEach((tag: string) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    const topTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    // Get top prompts
    const { data: edits } = await supabase
      .from("edit_history")
      .select("prompt")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    const promptCounts = new Map<string, number>();
    edits?.forEach((edit) => {
      const shortPrompt = edit.prompt.slice(0, 50);
      promptCounts.set(shortPrompt, (promptCounts.get(shortPrompt) || 0) + 1);
    });

    const topPrompts = Array.from(promptCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([prompt, count]) => ({ prompt, count }));

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentEdits } = await supabase
      .from("edit_history")
      .select("created_at")
      .eq("user_id", user.id)
      .gte("created_at", sevenDaysAgo.toISOString());

    const activityByDay = new Map<string, number>();
    recentEdits?.forEach((edit) => {
      const date = new Date(edit.created_at).toLocaleDateString();
      activityByDay.set(date, (activityByDay.get(date) || 0) + 1);
    });

    const recentActivity = Array.from(activityByDay.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setStats({
      totalImages: imageCount || 0,
      totalEdits: editCount || 0,
      topTags,
      topPrompts,
      recentActivity,
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Usage Statistics</h2>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Images</p>
              <p className="text-3xl font-bold mt-1">{stats.totalImages}</p>
            </div>
            <ImageIcon className="h-8 w-8 text-primary" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Edits</p>
              <p className="text-3xl font-bold mt-1">{stats.totalEdits}</p>
            </div>
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Edits/Image</p>
              <p className="text-3xl font-bold mt-1">
                {stats.totalImages > 0
                  ? (stats.totalEdits / stats.totalImages).toFixed(1)
                  : "0"}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-primary" />
          </div>
        </Card>
      </div>

      {/* Top Tags */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Tag className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Most Used Tags</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {stats.topTags.map(({ tag, count }) => (
            <Badge key={tag} variant="secondary" className="text-sm">
              {tag} ({count})
            </Badge>
          ))}
          {stats.topTags.length === 0 && (
            <p className="text-sm text-muted-foreground">No tags used yet</p>
          )}
        </div>
      </Card>

      {/* Top Prompts */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Most Used Prompts</h3>
        </div>
        <div className="space-y-3">
          {stats.topPrompts.map(({ prompt, count }, index) => (
            <div key={index} className="flex items-center justify-between">
              <p className="text-sm flex-1 truncate">{prompt}...</p>
              <Badge variant="outline">{count}x</Badge>
            </div>
          ))}
          {stats.topPrompts.length === 0 && (
            <p className="text-sm text-muted-foreground">No edits made yet</p>
          )}
        </div>
      </Card>

      {/* Recent Activity */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Activity (Last 7 Days)</h3>
        </div>
        <div className="space-y-2">
          {stats.recentActivity.map(({ date, count }) => (
            <div key={date} className="flex items-center justify-between">
              <span className="text-sm">{date}</span>
              <div className="flex items-center gap-2">
                <div
                  className="h-2 bg-primary rounded-full"
                  style={{ width: `${Math.min(count * 20, 200)}px` }}
                />
                <span className="text-sm font-medium">{count}</span>
              </div>
            </div>
          ))}
          {stats.recentActivity.length === 0 && (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          )}
        </div>
      </Card>
    </div>
  );
};
