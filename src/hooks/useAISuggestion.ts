/**
 * React Hook for AI-Assisted Analytical Account Suggestions
 * 
 * Provides a reactive interface for getting AI-powered analytical account
 * recommendations based on transaction context.
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { 
  AISuggestionInput, 
  AISuggestionResult, 
  AISuggestionResponse,
  UseAISuggestionReturn,
} from '@/types/aiAnalyticalSuggestion';

interface UseAISuggestionOptions {
  /**
   * Callback when suggestion is received
   */
  onSuggestion?: (suggestion: AISuggestionResult) => void;
  
  /**
   * Callback when user applies the suggestion
   */
  onApply?: (analyticalAccountId: string) => void;
  
  /**
   * Debounce delay in ms (default: 500)
   */
  debounceMs?: number;
}

/**
 * Hook for AI-assisted analytical account suggestions
 */
export function useAISuggestion(options: UseAISuggestionOptions = {}): UseAISuggestionReturn {
  const { onSuggestion, onApply, debounceMs = 500 } = options;
  
  const [suggestion, setSuggestion] = useState<AISuggestionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastInputRef = useRef<string>('');

  const getSuggestion = useCallback(async (input: AISuggestionInput) => {
    // Check if at least one field is provided
    const hasInput = input.partnerTagId || input.partnerId || input.productCategoryId || input.productId;
    
    if (!hasInput) {
      setSuggestion(null);
      setError(null);
      return;
    }

    // Dedupe identical requests
    const inputKey = JSON.stringify(input);
    if (inputKey === lastInputRef.current) {
      return;
    }

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Debounce the request
    debounceTimer.current = setTimeout(async () => {
      lastInputRef.current = inputKey;
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: invokeError } = await supabase.functions.invoke<AISuggestionResponse>(
          'ai-analytical-suggestion',
          { body: input }
        );

        if (invokeError) {
          console.error('[useAISuggestion] Invoke error:', invokeError);
          setError(invokeError.message || 'Failed to get AI suggestion');
          setSuggestion(null);
          return;
        }

        if (data?.error) {
          setError(data.error);
          setSuggestion(null);
          return;
        }

        if (data?.suggestion) {
          setSuggestion(data.suggestion);
          onSuggestion?.(data.suggestion);
        } else {
          setSuggestion(null);
        }
      } catch (err) {
        console.error('[useAISuggestion] Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setSuggestion(null);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);
  }, [debounceMs, onSuggestion]);

  const clearSuggestion = useCallback(() => {
    setSuggestion(null);
    setError(null);
    lastInputRef.current = '';
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
  }, []);

  const applySuggestion = useCallback(() => {
    if (suggestion?.analyticalAccountId) {
      onApply?.(suggestion.analyticalAccountId);
    }
  }, [suggestion, onApply]);

  return {
    suggestion,
    isLoading,
    error,
    getSuggestion,
    clearSuggestion,
    applySuggestion,
  };
}

/**
 * Hook for reactive AI suggestions that trigger on input changes
 */
export function useReactiveAISuggestion(
  input: AISuggestionInput,
  options: UseAISuggestionOptions = {}
) {
  const hook = useAISuggestion(options);
  
  // Auto-trigger on input changes
  const inputKey = JSON.stringify(input);
  const prevInputRef = useRef<string>('');
  
  if (inputKey !== prevInputRef.current) {
    prevInputRef.current = inputKey;
    // Schedule the suggestion fetch
    setTimeout(() => {
      hook.getSuggestion(input);
    }, 0);
  }

  return hook;
}
