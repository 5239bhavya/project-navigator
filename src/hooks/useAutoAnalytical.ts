/**
 * React Hook for Auto Analytical Engine Integration
 * 
 * Provides a reactive interface for auto-assigning analytical accounts
 * to transaction lines in real-time as users edit forms.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  autoAssignAnalyticalAccount, 
  getAnalyticsAssignment,
  batchAssignAnalyticalAccounts,
  invalidateModelCache,
} from '@/services/autoAnalyticalEngine';
import type { AnalyticsAssignmentResult } from '@/types/autoAnalyticalModel';

// Re-export for type usage
export type { AnalyticsAssignmentResult } from '@/types/autoAnalyticalModel';

interface UseAutoAnalyticalOptions {
  /**
   * Partner ID from the transaction header
   */
  partnerId?: string;
  
  /**
   * Product ID for the line being edited
   */
  productId?: string;
  
  /**
   * Debounce delay in ms (default: 300)
   */
  debounceMs?: number;
  
  /**
   * Whether to auto-apply on changes (default: true)
   */
  autoApply?: boolean;
  
  /**
   * Callback when analytics are assigned
   */
  onAssign?: (result: AnalyticsAssignmentResult) => void;
}

interface UseAutoAnalyticalReturn {
  /**
   * The assigned analytical account ID (null if no match)
   */
  analyticalAccountId: string | null;
  
  /**
   * Full assignment result with metadata
   */
  assignmentResult: AnalyticsAssignmentResult | null;
  
  /**
   * Whether the engine is currently processing
   */
  isLoading: boolean;
  
  /**
   * Manually trigger re-evaluation
   */
  refresh: () => Promise<void>;
  
  /**
   * Clear the current assignment
   */
  clear: () => void;
  
  /**
   * Whether the current value was auto-assigned
   */
  isAutoAssigned: boolean;
}

/**
 * Hook for single-line auto-analytical assignment
 * Automatically evaluates rules when partner or product changes
 */
export function useAutoAnalytical(options: UseAutoAnalyticalOptions = {}): UseAutoAnalyticalReturn {
  const { 
    partnerId, 
    productId, 
    debounceMs = 300, 
    autoApply = true,
    onAssign 
  } = options;

  const [analyticalAccountId, setAnalyticalAccountId] = useState<string | null>(null);
  const [assignmentResult, setAssignmentResult] = useState<AnalyticsAssignmentResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoAssigned, setIsAutoAssigned] = useState(false);
  
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastEvaluatedRef = useRef<string>('');

  const evaluate = useCallback(async () => {
    // Skip if no context
    if (!partnerId && !productId) {
      setAnalyticalAccountId(null);
      setAssignmentResult(null);
      setIsAutoAssigned(false);
      return;
    }

    // Dedupe identical requests
    const key = `${partnerId || ''}:${productId || ''}`;
    if (key === lastEvaluatedRef.current) {
      return;
    }
    lastEvaluatedRef.current = key;

    setIsLoading(true);
    
    try {
      const result = await getAnalyticsAssignment(partnerId, productId);
      
      setAssignmentResult(result);
      setAnalyticalAccountId(result.analyticalAccountId);
      setIsAutoAssigned(result.isAutoAssigned);
      
      onAssign?.(result);
    } catch (error) {
      console.error('[useAutoAnalytical] Evaluation error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [partnerId, productId, onAssign]);

  // Debounced evaluation on changes
  useEffect(() => {
    if (!autoApply) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      evaluate();
    }, debounceMs);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [partnerId, productId, autoApply, debounceMs, evaluate]);

  const refresh = useCallback(async () => {
    lastEvaluatedRef.current = ''; // Reset dedupe
    await evaluate();
  }, [evaluate]);

  const clear = useCallback(() => {
    setAnalyticalAccountId(null);
    setAssignmentResult(null);
    setIsAutoAssigned(false);
    lastEvaluatedRef.current = '';
  }, []);

  return {
    analyticalAccountId,
    assignmentResult,
    isLoading,
    refresh,
    clear,
    isAutoAssigned,
  };
}

// ============================================================================
// Batch Processing Hook
// ============================================================================

interface BatchLine {
  id: string;
  productId?: string;
  analyticalAccountId?: string | null;
}

interface UseBatchAutoAnalyticalOptions {
  partnerId?: string;
  lines: BatchLine[];
  autoApply?: boolean;
  onAssign?: (lineId: string, analyticalAccountId: string | null) => void;
}

interface UseBatchAutoAnalyticalReturn {
  assignments: Map<string, string | null>;
  isLoading: boolean;
  refresh: () => Promise<void>;
  getAssignment: (lineId: string) => string | null;
}

/**
 * Hook for batch auto-analytical assignment on multiple lines
 * Optimized for performance with batch database queries
 */
export function useBatchAutoAnalytical(options: UseBatchAutoAnalyticalOptions): UseBatchAutoAnalyticalReturn {
  const { partnerId, lines, autoApply = true, onAssign } = options;

  const [assignments, setAssignments] = useState<Map<string, string | null>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const evaluate = useCallback(async () => {
    if (!lines.length) {
      setAssignments(new Map());
      return;
    }

    setIsLoading(true);

    try {
      const inputs = lines.map(line => ({
        lineId: line.id,
        partnerId,
        productId: line.productId,
      }));

      const results = await batchAssignAnalyticalAccounts(inputs);
      
      const newAssignments = new Map<string, string | null>();
      for (const result of results) {
        newAssignments.set(result.lineId, result.analyticalAccountId);
        onAssign?.(result.lineId, result.analyticalAccountId);
      }
      
      setAssignments(newAssignments);
    } catch (error) {
      console.error('[useBatchAutoAnalytical] Batch evaluation error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [partnerId, lines, onAssign]);

  useEffect(() => {
    if (autoApply) {
      evaluate();
    }
  }, [autoApply, evaluate]);

  const getAssignment = useCallback((lineId: string) => {
    return assignments.get(lineId) || null;
  }, [assignments]);

  return {
    assignments,
    isLoading,
    refresh: evaluate,
    getAssignment,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to invalidate model cache when needed
 * Call this after creating/updating/deleting models
 */
export function useInvalidateModelCache() {
  return useCallback(() => {
    invalidateModelCache();
  }, []);
}

/**
 * Hook for single-shot evaluation (no reactivity)
 * Use this for imperative evaluation in form submit handlers
 */
export function useAutoAnalyticalEvaluator() {
  const [isLoading, setIsLoading] = useState(false);

  const evaluate = useCallback(async (
    partnerId?: string, 
    productId?: string
  ): Promise<string | undefined> => {
    setIsLoading(true);
    try {
      return await autoAssignAnalyticalAccount(partnerId, productId);
    } catch (error) {
      console.error('[useAutoAnalyticalEvaluator] Error:', error);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const evaluateFull = useCallback(async (
    partnerId?: string, 
    productId?: string
  ): Promise<AnalyticsAssignmentResult> => {
    setIsLoading(true);
    try {
      return await getAnalyticsAssignment(partnerId, productId);
    } catch (error) {
      console.error('[useAutoAnalyticalEvaluator] Error:', error);
      return {
        analyticalAccountId: null,
        matchedModelId: null,
        matchedModelName: null,
        matchScore: 0,
        matchedFields: [],
        isAutoAssigned: false,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { evaluate, evaluateFull, isLoading };
}
