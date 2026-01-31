// ============================================================================
// Auto Analytical Model Types
// ============================================================================

/**
 * Model State
 * - draft: Not yet activated (reserved for future use)
 * - confirmed: Active and applied to transactions
 * - archived: Deactivated, will not match
 */
export type ModelState = 'draft' | 'confirmed' | 'archived';

/**
 * Extended interface for the Auto Analytical Model
 */
export interface AutoAnalyticalModelExtended {
  id: string;
  name: string;
  partnerTagId?: string;
  partnerId?: string;
  productCategoryId?: string;
  productId?: string;
  analyticalAccountId: string;
  status: ModelState;
  priority: number; // Computed based on number of matching fields
  isArchived: boolean;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Rule match context for transaction lines
 * Contains all data needed to evaluate rules against a line
 */
export interface MatchContext {
  /** Partner/Contact ID from transaction header */
  partnerId?: string;

  /** Tag IDs associated with the partner */
  partnerTagIds?: string[];

  /** Product ID from the transaction line */
  productId?: string;

  /** Category ID of the product (fetched from products table) */
  productCategoryId?: string;
}

/**
 * Match result with score for priority resolution
 */
export interface MatchResult {
  model: AutoAnalyticalModelExtended;
  matchScore: number;
  matchedFields: string[];
}

/**
 * Assignment result returned by the engine
 */
export interface AnalyticsAssignmentResult {
  /** The analytical account to apply, null if no match */
  analyticalAccountId: string | null;

  /** ID of the model that matched */
  matchedModelId: string | null;

  /** Name of the model that matched (for display) */
  matchedModelName: string | null;

  /** Linked budget ID if available */
  budgetId: string | null;

  /** Number of fields that matched (specificity) */
  matchScore: number;

  /** Names of fields that matched */
  matchedFields: string[];

  /** Whether this was auto-assigned vs manual */
  isAutoAssigned: boolean;
}

// ============================================================================
// Transaction Line Types (for engine integration)
// ============================================================================

export interface TransactionLineBase {
  id: string;
  productId: string;
  analyticalAccountId?: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface SalesOrderLine extends TransactionLineBase {
  salesOrderId: string;
}

export interface PurchaseOrderLine extends TransactionLineBase {
  purchaseOrderId: string;
}

export interface InvoiceLine extends TransactionLineBase {
  customerInvoiceId: string;
}

export interface VendorBillLine extends TransactionLineBase {
  vendorBillId: string;
}

// ============================================================================
// Form Data Types
// ============================================================================

export interface AutoAnalyticalModelFormData {
  name: string;
  partnerTagId: string;
  partnerId: string;
  productCategoryId: string;
  productId: string;
  analyticalAccountId: string;
  status: ModelState;
  isArchived: boolean;
}

export interface AutoAnalyticalModelValidation {
  isValid: boolean;
  errors: string[];
}
