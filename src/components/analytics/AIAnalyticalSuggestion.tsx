/**
 * AI Analytical Suggestion Component
 * 
 * Displays AI-powered analytical account recommendations with
 * confidence indicators and one-click apply functionality.
 */

import React from 'react';
import { Sparkles, Check, AlertCircle, Loader2, Info, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { AISuggestionResult, ConfidenceLevel } from '@/types/aiAnalyticalSuggestion';
import { confidenceVariants } from '@/types/aiAnalyticalSuggestion';

interface AIAnalyticalSuggestionProps {
  suggestion: AISuggestionResult | null;
  isLoading: boolean;
  error: string | null;
  onApply: () => void;
  onDismiss?: () => void;
  isApplied?: boolean;
  className?: string;
}

const ConfidenceIndicator: React.FC<{ confidence: ConfidenceLevel }> = ({ confidence }) => {
  const config = confidenceVariants[confidence];
  
  return (
    <Badge variant={config.variant} className="text-xs">
      {confidence === 'high' && <Check className="w-3 h-3 mr-1" />}
      {confidence === 'medium' && <Info className="w-3 h-3 mr-1" />}
      {confidence === 'low' && <AlertCircle className="w-3 h-3 mr-1" />}
      {config.label}
    </Badge>
  );
};

export const AIAnalyticalSuggestion: React.FC<AIAnalyticalSuggestionProps> = ({
  suggestion,
  isLoading,
  error,
  onApply,
  onDismiss,
  isApplied = false,
  className,
}) => {
  if (isLoading) {
    return (
      <Card className={cn("border-dashed border-primary/30 bg-primary/5", className)}>
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>AI is analyzing transaction context...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("border-dashed border-destructive/30 bg-destructive/5", className)}>
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!suggestion) {
    return null;
  }

  return (
    <Card className={cn(
      "border-dashed transition-all duration-200",
      isApplied 
        ? "border-chart-2/50 bg-chart-2/5" 
        : "border-primary/30 bg-primary/5 hover:border-primary/50",
      className
    )}>
      <CardContent className="py-3 px-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-xs font-medium text-primary uppercase tracking-wide">
                AI Suggestion
              </span>
              <ConfidenceIndicator confidence={suggestion.confidence} />
            </div>

            {/* Suggested Account */}
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="font-medium text-foreground">
                {suggestion.analyticalAccountCode}: {suggestion.analyticalAccountName}
              </span>
              {isApplied && (
                <Badge variant="outline" className="text-xs text-chart-2 border-chart-2">
                  <Check className="w-3 h-3 mr-1" />
                  Applied
                </Badge>
              )}
            </div>

            {/* Reason */}
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              {suggestion.reason}
            </p>

            {/* Matched Patterns */}
            {suggestion.matchedPatterns && suggestion.matchedPatterns.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {suggestion.matchedPatterns.map((pattern, index) => (
                  <TooltipProvider key={index}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-xs cursor-help">
                          {pattern}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Pattern that influenced this suggestion</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            {!isApplied && (
              <Button
                size="sm"
                onClick={onApply}
                className="whitespace-nowrap"
              >
                <Check className="w-3 h-3 mr-1" />
                Apply
              </Button>
            )}
            {onDismiss && !isApplied && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDismiss}
                className="text-muted-foreground"
              >
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIAnalyticalSuggestion;
