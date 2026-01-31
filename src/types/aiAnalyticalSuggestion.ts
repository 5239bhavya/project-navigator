/**
 * AI Analytical Suggestion Types
 * 
 * Types for the AI-assisted analytical account suggestion system
 */

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'none';

/**
 * Input context for AI suggestion
 */
export interface AISuggestionInput {
  partnerTagId?: string;
  partnerId?: string;
  productCategoryId?: string;
  productId?: string;
}

/**
 * AI suggestion result
 */
export interface AISuggestionResult {
  /** AI-generated model name */
  modelName: string;
  analyticalAccountId: string;
  analyticalAccountName: string;
  analyticalAccountCode: string;
  confidence: ConfidenceLevel;
  reason: string;
  matchedPatterns: string[];
}

/**
 * API response from the edge function
 */
export interface AISuggestionResponse {
  suggestion: AISuggestionResult | null;
  error?: string;
}

/**
 * Hook return type
 */
export interface UseAISuggestionReturn {
  suggestion: AISuggestionResult | null;
  isLoading: boolean;
  error: string | null;
  getSuggestion: (input: AISuggestionInput) => Promise<void>;
  clearSuggestion: () => void;
  applySuggestion: () => void;
}

/**
 * Confidence badge variants
 */
export const confidenceVariants: Record<ConfidenceLevel, {
  label: string;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  color: string;
}> = {
  high: {
    label: 'High Confidence',
    variant: 'default',
    color: 'text-green-600 dark:text-green-400',
  },
  medium: {
    label: 'Medium Confidence',
    variant: 'secondary',
    color: 'text-yellow-600 dark:text-yellow-400',
  },
  low: {
    label: 'Low Confidence',
    variant: 'outline',
    color: 'text-orange-600 dark:text-orange-400',
  },
  none: {
    label: 'No Suggestion',
    variant: 'destructive',
    color: 'text-muted-foreground',
  },
};
