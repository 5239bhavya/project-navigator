// ================== CORE TYPES ==================

export type UserRole = 'admin' | 'portal';

export interface User {
  id: string;
  name: string;
  loginId: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  isArchived: boolean;
}

// ================== MASTER DATA TYPES ==================

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  imageUrl?: string;
  tags: Tag[];
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  isArchived: boolean;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  category?: ProductCategory;
  salesPrice: number;
  purchasePrice: number;
  imageUrl?: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnalyticalAccount {
  id: string;
  name: string;
  code: string;
  description?: string;
  isArchived: boolean;
  createdAt: Date;
}

export interface AutoAnalyticalModel {
  id: string;
  name: string;
  partnerTagId?: string;
  partnerTag?: Tag;
  partnerId?: string;
  partner?: Contact;
  productCategoryId?: string;
  productCategory?: ProductCategory;
  productId?: string;
  product?: Product;
  analyticalAccountId: string;
  analyticalAccount: AnalyticalAccount;
  budgetId?: string;
  budget?: Budget;
  priority: number;
  isArchived: boolean;
  createdAt: Date;
}

// ================== BUDGET TYPES ==================

export type BudgetState = 'draft' | 'confirmed' | 'revised' | 'archived';
export type BudgetType = 'income' | 'expense';

export interface Budget {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  analyticalAccountId: string;
  analyticalAccount?: AnalyticalAccount;
  type: BudgetType;
  budgetedAmount: number;
  achievedAmount: number;
  achievementPercentage: number;
  remainingBalance: number;
  state: BudgetState;
  parentBudgetId?: string;
  revisionHistory: BudgetRevision[];
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetRevision {
  id: string;
  budgetId: string;
  revisionDate: Date;
  previousAmount: number;
  newAmount: number;
  reason?: string;
}

// ================== TRANSACTION TYPES ==================

export type OrderStatus = 'draft' | 'confirmed' | 'cancelled';
export type InvoiceStatus = 'draft' | 'posted' | 'paid' | 'partially_paid' | 'cancelled';
export type PaymentStatus = 'pending' | 'completed' | 'failed';
export type PaymentMode = 'cash' | 'bank_transfer' | 'cheque' | 'online';

export interface OrderLine {
  id: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  analyticalAccountId?: string;
  analyticalAccount?: AnalyticalAccount;
  budgetId?: string;
}

// Purchase Flow
export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  vendorId: string;
  vendor?: Contact;
  orderDate: Date;
  expectedDeliveryDate?: Date;
  lines: OrderLine[];
  totalAmount: number;
  status: OrderStatus;
  analyticalAccountId?: string;
  analyticalAccount?: AnalyticalAccount;
  notes?: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorBill {
  id: string;
  billNumber: string;
  purchaseOrderId?: string;
  purchaseOrder?: PurchaseOrder;
  vendorId: string;
  vendor?: Contact;
  billDate: Date;
  dueDate: Date;
  lines: OrderLine[];
  totalAmount: number;
  paidAmount: number;
  status: InvoiceStatus;
  analyticalAccountId?: string;
  analyticalAccount?: AnalyticalAccount;
  notes?: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillPayment {
  id: string;
  paymentNumber: string;
  vendorBillId: string;
  vendorBill?: VendorBill;
  paymentDate: Date;
  amount: number;
  mode: PaymentMode;
  reference?: string;
  status: PaymentStatus;
  notes?: string;
  createdAt: Date;
}

// Sales Flow
export interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customer?: Contact;
  orderDate: Date;
  expectedDeliveryDate?: Date;
  lines: OrderLine[];
  totalAmount: number;
  status: OrderStatus;
  analyticalAccountId?: string;
  analyticalAccount?: AnalyticalAccount;
  notes?: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerInvoice {
  id: string;
  invoiceNumber: string;
  salesOrderId?: string;
  salesOrder?: SalesOrder;
  customerId: string;
  customer?: Contact;
  invoiceDate: Date;
  dueDate: Date;
  lines: OrderLine[];
  totalAmount: number;
  paidAmount: number;
  status: InvoiceStatus;
  analyticalAccountId?: string;
  analyticalAccount?: AnalyticalAccount;
  notes?: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoicePayment {
  id: string;
  paymentNumber: string;
  customerInvoiceId: string;
  customerInvoice?: CustomerInvoice;
  paymentDate: Date;
  amount: number;
  mode: PaymentMode;
  reference?: string;
  status: PaymentStatus;
  notes?: string;
  createdAt: Date;
}

// ================== UI TYPES ==================

export type ViewMode = 'list' | 'form';

export interface MenuItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
  children?: MenuItem[];
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}
