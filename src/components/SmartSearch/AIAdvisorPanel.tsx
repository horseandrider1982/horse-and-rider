import React from "react";
import { Sparkles, Loader2, ArrowRight } from "lucide-react";
import type { AIAdvisorResult } from "@/hooks/useSearchOverlay";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

interface AIAdvisorPanelProps {
  result: AIAdvisorResult | null;
  isLoading: boolean;
  query: string;
  onProductClick: (handle: string) => void;
  onCategoryClick?: (category: string) => void;
}

export const AIAdvisorPanel: React.FC<AIAdvisorPanelProps> = ({ result, isLoading, query, onCategoryClick }) => {
  const { t } = useI18n();
  if (!isLoading && !result) return null;

  return (
    <div className={cn("rounded-xl border-2 border-primary/20 bg-primary/5 p-4 sm:p-6", "relative overflow-hidden")}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full pointer-events-none" />
      <div className="flex items-start gap-3 relative">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-primary mb-1 flex items-center gap-2">
            {t("search.ai_advice")}
            {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
          </h3>
          {isLoading && !result && (
            <div className="space-y-2">
              <div className="h-4 w-3/4 bg-primary/10 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-primary/10 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-primary/10 rounded animate-pulse" />
            </div>
          )}
          {result?.answer && (
            <div className="prose prose-sm max-w-none text-foreground">
              {result.answer.split("\n").map((line, i) => <p key={i} className="mb-2 last:mb-0 text-sm leading-relaxed">{line}</p>)}
            </div>
          )}
          {result?.categories && result.categories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {result.categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => onCategoryClick?.(cat)}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                >
                  <ArrowRight className="w-3 h-3" />{cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
