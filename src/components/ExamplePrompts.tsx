import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface ExamplePromptsProps {
  onSelectPrompt: (prompt: string) => void;
}

const examplePrompts = [
  { text: "black leather jacket", emoji: "🧥" },
  { text: "red summer dress", emoji: "👗" },
  { text: "blue denim jeans", emoji: "👖" },
  { text: "white cotton t-shirt", emoji: "👕" },
  { text: "yellow floral sundress", emoji: "🌻" },
  { text: "gray wool sweater", emoji: "🧶" },
  { text: "green cargo pants", emoji: "🥾" },
  { text: "pink blazer", emoji: "💼" },
];

export const ExamplePrompts = ({ onSelectPrompt }: ExamplePromptsProps) => {
  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Quick Examples</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Click any example to try it out
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {examplePrompts.map((prompt, index) => (
          <Button
            key={index}
            variant="outline"
            className="h-auto py-3 flex flex-col items-center gap-1 hover:bg-primary/10 hover:border-primary transition-all"
            onClick={() => onSelectPrompt(prompt.text)}
          >
            <span className="text-2xl">{prompt.emoji}</span>
            <span className="text-xs text-center">{prompt.text}</span>
          </Button>
        ))}
      </div>
    </Card>
  );
};
