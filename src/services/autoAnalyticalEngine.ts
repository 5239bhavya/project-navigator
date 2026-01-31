/**
 * Auto Analytical Engine Service
 * 
 * Production-grade engine for automatic assignment of analytical accounts
 * to ERP transaction lines using rule-based matching with priority resolution.
 * 
 * Design Principles:
 * - Only CONFIRMED models are applied (archived models ignored)
 * - More specific rules (more matched fields) override generic rules
 * - All selected fields in the model MUST match the transaction line
 * - Empty fields in model are ignored (wildcard behavior)
 * - Deterministic: same input always produces same output
 * - Conflict-free: single best match returned, no stacking
 */

import { supabase } from '@/integrations/supabase/client';
import type { MatchContext, MatchResult, ModelState } from '@/types/autoAnalyticalModel';

// ============================================================================
// Types
// ============================================================================

interface AutoAnalyticalModel {
  id: string;
  name: string;
  partner_tag_id: string | null;
  partner_id: string | null;
  product_category_id: string | null;
  product_id: string | null;
  analytical_account_id: string;
  status: 'draft' | 'confirmed' | 'archived';
  is_archived: boolean;
  priority: number;
  created_at: string;
  budget_id: string | null;
}

interface TransactionLineContext {
  partnerId?: string;
  productId?: string;
  existingAnalyticalAccountId?: string | null;
}

interface AnalyticsAssignmentResult {
  analyticalAccountId: string | null;
  matchedModelId: string | null;
  matchedModelName: string | null;
  budgetId: string | null;
  matchScore: number;
  matchedFields: string[];
  isAutoAssigned: boolean;
}

interface BatchAssignmentInput {
  lineId: string;
  partnerId?: string;
  productId?: string;
}

interface BatchAssignmentResult {
  lineId: string;
  analyticalAccountId: string | null;
  matchedModelId: string | null;
  matchedModelName: string | null;
  budgetId: string | null;
}

// ============================================================================
// Model Cache (in-memory for performance)
// ============================================================================

let cachedModels: AutoAnalyticalModel[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 30000; // 30 seconds

/**
 * Invalidates the model cache - call after model changes
 */
export function invalidateModelCache(): void {
  cachedModels = null;
  cacheTimestamp = 0;
  console.log('[AutoAnalyticalEngine] Cache invalidated');
}

/**
 * Fetches all confirmed (non-archived) auto analytical models with caching
 */
export async function getActiveModels(forceRefresh = false): Promise<AutoAnalyticalModel[]> {
  const now = Date.now();

  if (!forceRefresh && cachedModels && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedModels;
  }

  const { data, error } = await supabase
    .from('auto_analytical_models')
    .select('*')
    .eq('status', 'confirmed')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true }); // Earlier models win ties

  if (error) {
    console.error('[AutoAnalyticalEngine] Error fetching models:', error);
    return cachedModels || []; // Return stale cache if available
  }

  // Cast status to the expected union type
  cachedModels = (data || []).map(item => ({
    ...item,
    status: item.status as 'draft' | 'confirmed' | 'archived'
  }));
  cacheTimestamp = now;

  return cachedModels;
}

// ============================================================================
// Context Building
// ============================================================================

/**
 * Gets partner tags for a contact (used for matching)
 */
export async function getPartnerTags(contactId: string): Promise<string[]> {
  if (!contactId) return [];

  const { data, error } = await supabase
    .from('contact_tags')
    .select('tag_id')
    .eq('contact_id', contactId);

  if (error || !data) {
    console.warn('[AutoAnalyticalEngine] Failed to fetch partner tags:', error);
    return [];
  }

  return data.map((ct) => ct.tag_id);
}

/**
 * Gets product category for a product (used for matching)
 */
export async function getProductCategory(productId: string): Promise<string | undefined> {
  if (!productId) return undefined;

  const { data, error } = await supabase
    .from('products')
    .select('category_id')
    .eq('id', productId)
    .single();

  if (error || !data) {
    return undefined;
  }

  return data.category_id || undefined;
}

/**
 * Builds a complete match context for a transaction line
 * Fetches all related data needed for rule matching
 */
export async function buildMatchContext(
  partnerId?: string,
  productId?: string
): Promise<MatchContext> {
  const context: MatchContext = {
    partnerId,
    productId,
  };

  // Parallel fetch for performance
  const [partnerTagIds, productCategoryId] = await Promise.all([
    partnerId ? getPartnerTags(partnerId) : Promise.resolve([]),
    productId ? getProductCategory(productId) : Promise.resolve(undefined),
  ]);

  context.partnerTagIds = partnerTagIds;
  context.productCategoryId = productCategoryId;

  return context;
}

// ============================================================================
// Matching Logic
// ============================================================================

/**
 * Calculates match score for a model against given context
 * Returns score (number of matched fields) and list of matched field names
 * 
 * CRITICAL: ALL selected fields in model MUST match for a successful match
 * If ANY selected field doesn't match, score = 0 (no match)
 */
function calculateMatchScore(
  model: AutoAnalyticalModel,
  context: MatchContext
): { score: number; matchedFields: string[]; isValid: boolean } {
  let score = 0;
  const matchedFields: string[] = [];
  let hasUnmatchedRequiredField = false;
  let hasAnyCondition = false;

  // Check Partner Tag - if set in model, it MUST match one of partner's tags
  if (model.partner_tag_id) {
    hasAnyCondition = true;
    if (context.partnerTagIds?.includes(model.partner_tag_id)) {
      score++;
      matchedFields.push('Partner Tag');
    } else {
      hasUnmatchedRequiredField = true;
    }
  }

  // Check Partner - if set in model, it MUST match exactly
  if (model.partner_id) {
    hasAnyCondition = true;
    if (model.partner_id === context.partnerId) {
      score++;
      matchedFields.push('Partner');
    } else {
      hasUnmatchedRequiredField = true;
    }
  }

  // Check Product Category - if set in model, it MUST match
  if (model.product_category_id) {
    hasAnyCondition = true;
    if (model.product_category_id === context.productCategoryId) {
      score++;
      matchedFields.push('Product Category');
    } else {
      hasUnmatchedRequiredField = true;
    }
  }

  // Check Product - if set in model, it MUST match exactly
  if (model.product_id) {
    hasAnyCondition = true;
    if (model.product_id === context.productId) {
      score++;
      matchedFields.push('Product');
    } else {
      hasUnmatchedRequiredField = true;
    }
  }

  // If ANY selected field didn't match, the model doesn't match at all
  if (hasUnmatchedRequiredField) {
    return { score: 0, matchedFields: [], isValid: false };
  }

  // Model must have at least one condition to be valid
  if (!hasAnyCondition) {
    return { score: 0, matchedFields: [], isValid: false };
  }

  return { score, matchedFields, isValid: true };
}

/**
 * Finds the best matching model for a given context
 * 
 * Priority Resolution:
 * 1. Higher match score (more specific rules win)
 * 2. Higher priority value (explicit priority)
 * 3. Earlier creation date (first come, first served for ties)
 */
export async function findBestMatch(
  context: MatchContext
): Promise<AnalyticsAssignmentResult> {
  const models = await getActiveModels();

  const noMatchResult: AnalyticsAssignmentResult = {
    analyticalAccountId: null,
    matchedModelId: null,
    matchedModelName: null,
    budgetId: null,
    matchScore: 0,
    matchedFields: [],
    isAutoAssigned: false,
  };

  if (models.length === 0) {
    return noMatchResult;
  }

  // Calculate match scores for all models
  const validMatches: {
    model: AutoAnalyticalModel;
    score: number;
    matchedFields: string[];
  }[] = [];

  for (const model of models) {
    const { score, matchedFields, isValid } = calculateMatchScore(model, context);
    if (isValid && score > 0) {
      validMatches.push({ model, score, matchedFields });
    }
  }

  if (validMatches.length === 0) {
    return noMatchResult;
  }

  // Sort by score (desc), priority (desc), created_at (asc)
  validMatches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.model.priority !== a.model.priority) return b.model.priority - a.model.priority;
    return new Date(a.model.created_at).getTime() - new Date(b.model.created_at).getTime();
  });

  const best = validMatches[0];

  console.log('[AutoAnalyticalEngine] Best match:', {
    modelName: best.model.name,
    score: best.score,
    matchedFields: best.matchedFields,
    analyticalAccountId: best.model.analytical_account_id,
  });

  return {
    analyticalAccountId: best.model.analytical_account_id,
    matchedModelId: best.model.id,
    matchedModelName: best.model.name,
    budgetId: best.model.budget_id,
    matchScore: best.score,
    matchedFields: best.matchedFields,
    isAutoAssigned: true,
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Auto-assigns analytical account to a transaction line
 * This is the main entry point for single-line assignment
 * 
 * @param partnerId - The partner/contact ID from the transaction
 * @param productId - The product ID from the transaction line
 * @returns The analytical account ID to apply, or undefined if no match
 */
export async function autoAssignAnalyticalAccount(
  partnerId?: string,
  productId?: string
): Promise<string | undefined> {
  const context = await buildMatchContext(partnerId, productId);
  const result = await findBestMatch(context);
  return result.analyticalAccountId || undefined;
}

/**
 * Gets full assignment result with metadata
 * Use this when you need to show which rule was applied
 */
export async function getAnalyticsAssignment(
  partnerId?: string,
  productId?: string
): Promise<AnalyticsAssignmentResult> {
  const context = await buildMatchContext(partnerId, productId);
  return findBestMatch(context);
}

/**
 * Batch assignment for multiple lines (performance optimized)
 * Fetches models once and processes all lines
 */
export async function batchAssignAnalyticalAccounts(
  lines: BatchAssignmentInput[]
): Promise<BatchAssignmentResult[]> {
  if (lines.length === 0) return [];

  // Force refresh models for batch operations
  await getActiveModels(true);

  // Collect unique partner and product IDs
  const partnerIds = [...new Set(lines.map(l => l.partnerId).filter(Boolean))] as string[];
  const productIds = [...new Set(lines.map(l => l.productId).filter(Boolean))] as string[];

  // Batch fetch partner tags
  const partnerTagsMap = new Map<string, string[]>();
  if (partnerIds.length > 0) {
    const { data } = await supabase
      .from('contact_tags')
      .select('contact_id, tag_id')
      .in('contact_id', partnerIds);

    if (data) {
      for (const { contact_id, tag_id } of data) {
        if (!partnerTagsMap.has(contact_id)) {
          partnerTagsMap.set(contact_id, []);
        }
        partnerTagsMap.get(contact_id)!.push(tag_id);
      }
    }
  }

  // Batch fetch product categories
  const productCategoryMap = new Map<string, string>();
  if (productIds.length > 0) {
    const { data } = await supabase
      .from('products')
      .select('id, category_id')
      .in('id', productIds);

    if (data) {
      for (const { id, category_id } of data) {
        if (category_id) {
          productCategoryMap.set(id, category_id);
        }
      }
    }
  }

  // Process each line
  const results: BatchAssignmentResult[] = [];

  for (const line of lines) {
    const context: MatchContext = {
      partnerId: line.partnerId,
      productId: line.productId,
      partnerTagIds: line.partnerId ? (partnerTagsMap.get(line.partnerId) || []) : [],
      productCategoryId: line.productId ? productCategoryMap.get(line.productId) : undefined,
    };

    const match = await findBestMatch(context);

    results.push({
      lineId: line.lineId,
      analyticalAccountId: match.analyticalAccountId,
      matchedModelId: match.matchedModelId,
      matchedModelName: match.matchedModelName,
      budgetId: match.budgetId,
    });
  }

  return results;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Recalculates priority based on number of configured fields
 * Used when creating/editing models
 */
export function calculateModelPriority(model: {
  partnerTagId?: string | null;
  partnerId?: string | null;
  productCategoryId?: string | null;
  productId?: string | null;
}): number {
  let priority = 0;
  if (model.partnerTagId) priority++;
  if (model.partnerId) priority++;
  if (model.productCategoryId) priority++;
  if (model.productId) priority++;
  return priority;
}

/**
 * Gets specificity label for display
 */
export function getSpecificityLabel(priority: number): { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' } {
  if (priority >= 3) return { label: 'Very Specific', variant: 'default' };
  if (priority === 2) return { label: 'Specific', variant: 'secondary' };
  if (priority === 1) return { label: 'Generic', variant: 'outline' };
  return { label: 'No Rules', variant: 'destructive' };
}

/**
 * Validates that a model has at least one condition
 */
export function validateModelConditions(model: {
  partnerTagId?: string | null;
  partnerId?: string | null;
  productCategoryId?: string | null;
  productId?: string | null;
}): boolean {
  return calculateModelPriority(model) > 0;
}

// ============================================================================
// Legacy Exports (for backward compatibility)
// ============================================================================

export { findBestMatch as findMatchingAnalyticalAccount };
