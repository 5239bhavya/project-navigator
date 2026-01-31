import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Contact,
  Product,
  ProductCategory,
  AnalyticalAccount,
  AutoAnalyticalModel,
  Budget,
  Tag,
  PurchaseOrder,
  VendorBill,
  BillPayment,
  SalesOrder,
  CustomerInvoice,
  InvoicePayment,
  BudgetState,
} from '@/types';

// ==================== TAG STORE ====================
interface TagStore {
  tags: Tag[];
  addTag: (tag: Omit<Tag, 'id'>) => Tag;
  getTag: (id: string) => Tag | undefined;
}

export const useTagStore = create<TagStore>()(
  persist(
    (set, get) => ({
      tags: [
        { id: '1', name: 'Premium', color: 'hsl(var(--chart-1))' },
        { id: '2', name: 'Regular', color: 'hsl(var(--chart-2))' },
        { id: '3', name: 'VIP', color: 'hsl(var(--chart-3))' },
      ],
      addTag: (tagData) => {
        const newTag: Tag = { ...tagData, id: Date.now().toString() };
        set((state) => ({ tags: [...state.tags, newTag] }));
        return newTag;
      },
      getTag: (id) => get().tags.find((t) => t.id === id),
    }),
    { name: 'erp-tags' }
  )
);

// ==================== CONTACT STORE ====================
interface ContactStore {
  contacts: Contact[];
  fetchContacts: () => Promise<void>;
  addContact: (contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Contact>;
  updateContact: (id: string, data: Partial<Contact>) => Promise<void>;
  archiveContact: (id: string) => Promise<void>;
  getContact: (id: string) => Contact | undefined;
}

export const useContactStore = create<ContactStore>()(
  persist(
    (set, get) => ({
      contacts: [],
      fetchContacts: async () => {
        const { data, error } = await supabase
          .from('contacts')
          .select(`
            *,
            tags:contact_tags(
              tag:tags(*)
            )
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching contacts:', error);
          return;
        }

        const formattedContacts: Contact[] = data.map((c: any) => ({
          ...c,
          createdAt: new Date(c.created_at),
          updatedAt: new Date(c.updated_at),
          tags: c.tags.map((t: any) => t.tag)
        }));

        set({ contacts: formattedContacts });
      },
      addContact: async (contactData) => {
        const { tags, ...dbData } = contactData as any;
        const { data, error } = await supabase
          .from('contacts')
          .insert(dbData)
          .select()
          .single();

        if (error) throw error;

        // Handle tags if any
        if (contactData.tags && contactData.tags.length > 0) {
          const tagInserts = contactData.tags.map(t => ({
            contact_id: data.id,
            tag_id: t.id
          }));
          await supabase.from('contact_tags').insert(tagInserts);
        }

        const newContact: Contact = {
          ...data,
          isArchived: data.is_archived || false,
          tags: contactData.tags || [],
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
        } as unknown as Contact; // Force cast after ensuring fields

        set((state) => ({ contacts: [newContact, ...state.contacts] }));
        return newContact;
      },
      updateContact: async (id, data) => {
        const { error } = await supabase
          .from('contacts')
          .update(data)
          .eq('id', id);

        if (error) throw error;

        await get().fetchContacts(); // Refresh to get updated tags if needed
      },
      archiveContact: async (id) => {
        const { error } = await supabase
          .from('contacts')
          .update({ is_archived: true })
          .eq('id', id);

        if (error) throw error;

        set((state) => ({
          contacts: state.contacts.map((c) =>
            c.id === id ? { ...c, isArchived: true, updatedAt: new Date() } : c
          ),
        }));
      },
      getContact: (id) => get().contacts.find((c) => c.id === id),
    }),
    { name: 'erp-contacts' }
  )
);

// ==================== PRODUCT CATEGORY STORE ====================
interface CategoryStore {
  categories: ProductCategory[];
  addCategory: (cat: Omit<ProductCategory, 'id'>) => ProductCategory;
  getCategory: (id: string) => ProductCategory | undefined;
}

export const useCategoryStore = create<CategoryStore>()(
  persist(
    (set, get) => ({
      categories: [
        { id: '1', name: 'Living Room', description: 'Sofas, couches, tables', isArchived: false },
        { id: '2', name: 'Bedroom', description: 'Beds, wardrobes, dressers', isArchived: false },
        { id: '3', name: 'Office', description: 'Desks, chairs, cabinets', isArchived: false },
        { id: '4', name: 'Dining', description: 'Dining tables, chairs', isArchived: false },
      ],
      addCategory: (catData) => {
        const newCat: ProductCategory = { ...catData, id: Date.now().toString() };
        set((state) => ({ categories: [...state.categories, newCat] }));
        return newCat;
      },
      getCategory: (id) => get().categories.find((c) => c.id === id),
    }),
    { name: 'erp-categories' }
  )
);

// ==================== PRODUCT STORE ====================
interface ProductStore {
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Product;
  updateProduct: (id: string, data: Partial<Product>) => void;
  archiveProduct: (id: string) => void;
  getProduct: (id: string) => Product | undefined;
}

export const useProductStore = create<ProductStore>()(
  persist(
    (set, get) => ({
      products: [
        {
          id: '1',
          name: 'Royal Sofa Set',
          categoryId: '1',
          salesPrice: 45000,
          purchasePrice: 28000,
          isArchived: false,
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-01-10'),
        },
        {
          id: '2',
          name: 'King Size Bed',
          categoryId: '2',
          salesPrice: 35000,
          purchasePrice: 22000,
          isArchived: false,
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-15'),
        },
        {
          id: '3',
          name: 'Executive Desk',
          categoryId: '3',
          salesPrice: 18000,
          purchasePrice: 11000,
          isArchived: false,
          createdAt: new Date('2024-02-01'),
          updatedAt: new Date('2024-02-01'),
        },
        {
          id: '4',
          name: 'Dining Table 6 Seater',
          categoryId: '4',
          salesPrice: 28000,
          purchasePrice: 17000,
          isArchived: false,
          createdAt: new Date('2024-02-10'),
          updatedAt: new Date('2024-02-10'),
        },
      ],
      addProduct: (productData) => {
        const newProduct: Product = {
          ...productData,
          id: Date.now().toString(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({ products: [...state.products, newProduct] }));
        return newProduct;
      },
      updateProduct: (id, data) => {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, ...data, updatedAt: new Date() } : p
          ),
        }));
      },
      archiveProduct: (id) => {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, isArchived: true, updatedAt: new Date() } : p
          ),
        }));
      },
      getProduct: (id) => get().products.find((p) => p.id === id),
    }),
    { name: 'erp-products' }
  )
);

// ==================== ANALYTICAL ACCOUNT STORE ====================
interface AnalyticalAccountStore {
  accounts: AnalyticalAccount[];
  fetchAccounts: () => Promise<void>;
  addAccount: (account: Omit<AnalyticalAccount, 'id' | 'createdAt'>) => Promise<AnalyticalAccount>;
  updateAccount: (id: string, data: Partial<AnalyticalAccount>) => Promise<void>;
  archiveAccount: (id: string) => Promise<void>;
  getAccount: (id: string) => AnalyticalAccount | undefined;
}

export const useAnalyticalAccountStore = create<AnalyticalAccountStore>()(
  persist(
    (set, get) => ({
      accounts: [],
      fetchAccounts: async () => {
        const { data, error } = await supabase
          .from('analytical_accounts')
          .select('*')
          .order('name', { ascending: true });

        if (error) {
          console.error('Error fetching Analytical Accounts:', error);
          return;
        }

        const formattedAccounts: AnalyticalAccount[] = data.map((a: any) => ({
          ...a,
          isArchived: a.is_archived,
          createdAt: new Date(a.created_at)
        }));

        set({ accounts: formattedAccounts });
      },
      addAccount: async (accountData) => {
        const { data, error } = await supabase
          .from('analytical_accounts')
          .insert({
            name: accountData.name,
            code: accountData.code,
            description: accountData.description,
            is_archived: accountData.isArchived || false
          })
          .select()
          .single();

        if (error) throw error;

        await get().fetchAccounts();
        return get().getAccount(data.id) as AnalyticalAccount;
      },
      updateAccount: async (id, data) => {
        const updatePayload: any = {};
        if (data.name) updatePayload.name = data.name;
        if (data.code) updatePayload.code = data.code;
        if (data.description) updatePayload.description = data.description;
        if (typeof data.isArchived === 'boolean') updatePayload.is_archived = data.isArchived;

        const { error } = await supabase
          .from('analytical_accounts')
          .update(updatePayload)
          .eq('id', id);

        if (error) throw error;
        await get().fetchAccounts();
      },
      archiveAccount: async (id) => {
        const { error } = await supabase
          .from('analytical_accounts')
          .update({ is_archived: true })
          .eq('id', id);

        if (error) throw error;
        await get().fetchAccounts();
      },
      getAccount: (id) => get().accounts.find((a) => a.id === id),
    }),
    { name: 'erp-analytical-accounts' }
  )
);

// ==================== AUTO ANALYTICAL MODEL STORE ====================
interface AutoAnalyticalModelStore {
  models: AutoAnalyticalModel[];
  addModel: (model: Omit<AutoAnalyticalModel, 'id' | 'createdAt' | 'priority'>) => AutoAnalyticalModel;
  updateModel: (id: string, data: Partial<AutoAnalyticalModel>) => void;
  archiveModel: (id: string) => void;
  getModel: (id: string) => AutoAnalyticalModel | undefined;
  findMatchingAccount: (params: {
    tagIds?: string[];
    partnerId?: string;
    categoryId?: string;
    productId?: string;
  }) => { analyticalAccount: AnalyticalAccount | undefined; budgetId?: string };
}

export const useAutoAnalyticalModelStore = create<AutoAnalyticalModelStore>()(
  persist(
    (set, get) => ({
      models: [
        {
          id: '1',
          name: 'VIP Customer Deepavali',
          partnerTagId: '3',
          analyticalAccountId: '1',
          analyticalAccount: { id: '1', name: 'Deepavali Campaign', code: 'CC-001', isArchived: false, createdAt: new Date() },
          priority: 3,
          isArchived: false,
          createdAt: new Date('2024-01-05'),
        },
        {
          id: '2',
          name: 'Living Room Expo',
          productCategoryId: '1',
          analyticalAccountId: '3',
          analyticalAccount: { id: '3', name: 'Furniture Expo 2026', code: 'CC-003', isArchived: false, createdAt: new Date() },
          priority: 2,
          isArchived: false,
          createdAt: new Date('2024-02-10'),
        },
      ],
      addModel: (modelData) => {
        // Calculate priority based on number of matching fields
        let priority = 0;
        if (modelData.partnerTagId) priority++;
        if (modelData.partnerId) priority++;
        if (modelData.productCategoryId) priority++;
        if (modelData.productId) priority++;

        const newModel: AutoAnalyticalModel = {
          ...modelData,
          id: Date.now().toString(),
          priority,
          createdAt: new Date(),
        };
        set((state) => ({ models: [...state.models, newModel] }));
        return newModel;
      },
      updateModel: (id, data) => {
        set((state) => ({
          models: state.models.map((m) => (m.id === id ? { ...m, ...data } : m)),
        }));
      },
      archiveModel: (id) => {
        set((state) => ({
          models: state.models.map((m) =>
            m.id === id ? { ...m, isArchived: true } : m
          ),
        }));
      },
      getModel: (id) => get().models.find((m) => m.id === id),
      findMatchingAccount: (params) => {
        const activeModels = get().models.filter((m) => !m.isArchived);

        // Find matching models and calculate their match score
        const matches = activeModels
          .map((model) => {
            let matchScore = 0;

            if (model.partnerTagId && params.tagIds?.includes(model.partnerTagId)) matchScore++;
            if (model.partnerId && model.partnerId === params.partnerId) matchScore++;
            if (model.productCategoryId && model.productCategoryId === params.categoryId) matchScore++;
            if (model.productId && model.productId === params.productId) matchScore++;

            return { model, matchScore };
          })
          .filter((m) => m.matchScore > 0)
          .sort((a, b) => b.matchScore - a.matchScore);

        if (matches.length > 0) {
          const model = matches[0].model;
          return {
            analyticalAccount: useAnalyticalAccountStore.getState().getAccount(model.analyticalAccountId),
            budgetId: model.budgetId
          };
        }
        return { analyticalAccount: undefined };
      },
    }),
    { name: 'erp-auto-analytical-models' }
  )
);

// ==================== BUDGET STORE ====================
interface BudgetStore {
  budgets: Budget[];
  fetchBudgets: () => Promise<void>;
  addBudget: (budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt' | 'achievedAmount' | 'achievementPercentage' | 'remainingBalance' | 'revisionHistory'>) => Promise<Budget>;
  updateBudget: (id: string, data: Partial<Budget>) => Promise<void>;
  confirmBudget: (id: string) => Promise<void>;
  reviseBudget: (id: string, newAmount: number, reason?: string) => Promise<Budget>;
  archiveBudget: (id: string) => Promise<void>;
  getBudget: (id: string) => Budget | undefined;
  refreshBudget: (id: string) => Promise<void>;
  refreshBudgetsByAnalyticalAccount: (analyticalAccountId: string) => Promise<void>;
}

export const useBudgetStore = create<BudgetStore>()(
  persist(
    (set, get) => ({
      budgets: [],
      fetchBudgets: async () => {
        const { data, error } = await supabase
          .from('budgets')
          .select(`
            *,
            analytical_account:analytical_accounts(*)
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching budgets:', error);
          return;
        }

        const formattedBudgets: Budget[] = data.map((b: any) => ({
          ...b,
          startDate: new Date(b.start_date),
          endDate: new Date(b.end_date),
          budgetedAmount: Number(b.budgeted_amount),
          achievedAmount: Number(b.achieved_amount), // Use DB cached value initially, assume it's kept up to date
          achievementPercentage: Number(b.achievement_percentage),
          remainingBalance: Number(b.remaining_balance),
          analyticalAccountId: b.analytical_account_id,
          analyticalAccount: b.analytical_account,
          createdAt: new Date(b.created_at),
          updatedAt: new Date(b.updated_at),
          revisionHistory: [] // TODO: Fetch revision history if needed
        }));

        set({ budgets: formattedBudgets });
      },
      addBudget: async (budgetData) => {
        const dbData = {
          name: budgetData.name,
          start_date: budgetData.startDate.toISOString(),
          end_date: budgetData.endDate.toISOString(),
          analytical_account_id: budgetData.analyticalAccountId,
          type: budgetData.type,
          budgeted_amount: budgetData.budgetedAmount,
          state: 'draft' as BudgetState
        };

        const { data, error } = await supabase
          .from('budgets')
          .insert(dbData)
          .select()
          .single();

        if (error) throw error;

        await get().fetchBudgets(); // Simple refresh
        return get().getBudget(data.id) as Budget; // Return fetched object
      },
      updateBudget: async (id, data) => {
        const { error } = await supabase
          .from('budgets')
          .update(data)
          .eq('id', id);

        if (error) throw error;
        await get().fetchBudgets();
      },
      confirmBudget: async (id) => {
        const { error } = await supabase
          .from('budgets')
          .update({ state: 'confirmed' })
          .eq('id', id);

        if (error) throw error;

        set((state) => ({
          budgets: state.budgets.map((b) =>
            b.id === id ? { ...b, state: 'confirmed', updatedAt: new Date() } : b
          ),
        }));
      },
      reviseBudget: async (id, newAmount, reason) => {
        // Complex logic: In DB we need to handle revision history or just clean update.
        // For Hackathon, let's just update the amount and create a revision record if table exists, 
        // or effectively just "Update Amount" but keep history.
        // Implementation: Calls update on current budget and inserts a revision record

        const oldBudget = get().getBudget(id);
        if (!oldBudget) throw new Error("Budget not found");

        const { error: revError } = await supabase
          .from('budget_revisions')
          .insert({
            budget_id: id,
            previous_amount: oldBudget.budgetedAmount,
            new_amount: newAmount,
            reason: reason,
            revision_date: new Date().toISOString()
          });

        if (revError) console.error("Error creating revision:", revError); // Log but continue

        const { error } = await supabase
          .from('budgets')
          .update({
            budgeted_amount: newAmount,
            state: 'revised'
          })
          .eq('id', id);

        if (error) throw error;

        await get().fetchBudgets();
        return get().getBudget(id) as Budget;
      },
      archiveBudget: async (id) => {
        const { error } = await supabase
          .from('budgets')
          .update({ is_archived: true, state: 'archived' })
          .eq('id', id);

        if (error) throw error;
        await get().fetchBudgets();
      },
      getBudget: (id) => get().budgets.find((b) => b.id === id),

      refreshBudgetsByAnalyticalAccount: async (analyticalAccountId: string) => {
        const budgets = get().budgets.filter(
          b => b.analyticalAccountId === analyticalAccountId && b.state === 'confirmed'
        );
        await Promise.all(budgets.map(b => get().refreshBudget(b.id)));
      },

      refreshBudget: async (id) => {
        const budget = get().getBudget(id);
        if (!budget) return;

        let totalAchieved = 0;

        try {
          if (budget.type === 'expense') {
            const { data: lines, error } = await supabase
              .from('vendor_bill_lines')
              .select(`
                subtotal,
                vendor_bills!inner (
                  status,
                  bill_date
                )
              `)
              .eq('analytical_account_id', budget.analyticalAccountId)
              .in('vendor_bills.status', ['posted', 'paid', 'partially_paid'])
              .gte('vendor_bills.bill_date', new Date(budget.startDate).toISOString())
              .lte('vendor_bills.bill_date', new Date(budget.endDate).toISOString());

            if (error) throw error;

            if (lines) {
              totalAchieved = lines.reduce((sum, line) => sum + line.subtotal, 0);
            }
          } else if (budget.type === 'income') {
            const { data: lines, error } = await supabase
              .from('customer_invoice_lines')
              .select(`
                subtotal,
                customer_invoices!inner (
                  status,
                  invoice_date
                )
              `)
              .eq('analytical_account_id', budget.analyticalAccountId)
              .in('customer_invoices.status', ['posted', 'paid', 'partially_paid'])
              .gte('customer_invoices.invoice_date', new Date(budget.startDate).toISOString())
              .lte('customer_invoices.invoice_date', new Date(budget.endDate).toISOString());

            if (error) throw error;

            if (lines) {
              totalAchieved = lines.reduce((sum, line) => sum + line.subtotal, 0);
            }
          }

          set((state) => ({
            budgets: state.budgets.map((b) => {
              if (b.id !== id) return b;

              const achievementPercentage = Math.min((totalAchieved / b.budgetedAmount) * 100, 100);
              const remainingBalance = b.budgetedAmount - totalAchieved;

              return {
                ...b,
                achievedAmount: totalAchieved,
                achievementPercentage,
                remainingBalance,
                updatedAt: new Date(),
              };
            }),
          }));

        } catch (error) {
          console.error(`Error refreshing budget ${id}:`, error);
        }
      },
    }),
    { name: 'erp-budgets' }
  )
);

// ==================== PURCHASE ORDER STORE ====================
interface PurchaseOrderStore {
  orders: PurchaseOrder[];
  fetchOrders: () => Promise<void>;
  addOrder: (order: Omit<PurchaseOrder, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>) => Promise<PurchaseOrder>;
  updateOrder: (id: string, data: Partial<PurchaseOrder>) => Promise<void>;
  confirmOrder: (id: string) => Promise<void>;
  archiveOrder: (id: string) => Promise<void>;
  getOrder: (id: string) => PurchaseOrder | undefined;
}

export const usePurchaseOrderStore = create<PurchaseOrderStore>()(
  persist(
    (set, get) => ({
      orders: [],
      fetchOrders: async () => {
        const { data, error } = await supabase
          .from('purchase_orders')
          .select(`
            *,
            lines:purchase_order_lines(*)
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching POs:', error);
          return;
        }

        const formattedOrders: PurchaseOrder[] = data.map((o: any) => ({
          ...o,
          orderNumber: o.order_number,
          vendorId: o.vendor_id,
          orderDate: new Date(o.order_date),
          totalAmount: o.total_amount, // DB is numeric
          analyticalAccountId: o.analytical_account_id,
          status: o.status,
          isArchived: o.is_archived,
          createdAt: new Date(o.created_at),
          updatedAt: new Date(o.updated_at),
          lines: o.lines.map((l: any) => ({
            ...l,
            purchaseOrderId: l.purchase_order_id,
            productId: l.product_id,
            unitPrice: l.unit_price,
            analyticalAccountId: l.analytical_account_id,
            budgetId: l.budget_id
          }))
        }));

        set({ orders: formattedOrders });
      },
      addOrder: async (orderData) => {
        // 1. Generate Order Number
        // Note: In a real app we might do this in DB trigger or separate function. 
        // For now, we query specifically to check count or just use random for simplicity? 
        // User asked for "Purchase Order creation". Let's try to fetch count or generic.
        const year = new Date().getFullYear();
        // A simple count might be race-condition prone but ok for hackathon.
        // Better: UUID or dedicated counter. I'll stick to store-side logical generation with a fresh fetch? 
        // Wait, I can't easily rely on client-side count if I haven't fetched all. 
        // I will actally fetch all first in onMount anyway.

        const currentOrders = get().orders;
        // Use timestamp to ensure uniqueness and avoid collision if list is not fully loaded
        const orderNumber = `PO-${year}${format(new Date(), 'MMddHHmmss')}`;

        const { lines, ...headerData } = orderData;

        // 2. Insert Header - use date string directly if it's a Date, otherwise keep as-is
        const orderDateStr = headerData.orderDate instanceof Date 
          ? format(headerData.orderDate, 'yyyy-MM-dd')
          : headerData.orderDate;
        const expectedDateStr = headerData.expectedDeliveryDate instanceof Date
          ? format(headerData.expectedDeliveryDate, 'yyyy-MM-dd')
          : headerData.expectedDeliveryDate || null;

        const { data: order, error: orderError } = await supabase
          .from('purchase_orders')
          .insert({
            order_number: orderNumber,
            vendor_id: headerData.vendorId,
            order_date: orderDateStr,
            expected_delivery_date: expectedDateStr,
            total_amount: headerData.totalAmount,
            status: 'draft',
            analytical_account_id: headerData.analyticalAccountId,
            notes: headerData.notes
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // 3. Insert Lines
        if (lines && lines.length > 0) {
          const lineInserts = lines.map(l => ({
            purchase_order_id: order.id,
            product_id: l.productId,
            quantity: l.quantity,
            unit_price: l.unitPrice,
            subtotal: l.subtotal,
            analytical_account_id: l.analyticalAccountId || null
            // budget_id temporarily removed due to Supabase cache issue
          }));

          const { error: lineError } = await supabase
            .from('purchase_order_lines')
            .insert(lineInserts);

          if (lineError) {
            console.error("Error inserting lines FULL:", JSON.stringify(lineError, null, 2));
            throw lineError;
          }
        }

        await get().fetchOrders();
        return get().getOrder(order.id) as PurchaseOrder;
      },
      updateOrder: async (id, data) => {
        const { lines, ...headerData } = data as any; // Handle lines separately if passed

        // Update header
        const updatePayload: any = {};
        if (headerData.status) updatePayload.status = headerData.status;
        if (headerData.vendorId) updatePayload.vendor_id = headerData.vendorId;
        // ... field mapping as needed

        if (Object.keys(updatePayload).length > 0) {
          const { error } = await supabase
            .from('purchase_orders')
            .update(updatePayload)
            .eq('id', id);
          if (error) throw error;
        }

        // Updating lines is complex (add/remove/update). 
        // For Hackathon prototype, simpler to maybe NOT update lines in 'updateOrder' unless explicitly handled.
        // Usually UI calls specific actions.

        await get().fetchOrders();
      },
      confirmOrder: async (id) => {
        const { error } = await supabase
          .from('purchase_orders')
          .update({ status: 'confirmed' })
          .eq('id', id);

        if (error) throw error;

        // Auto-create Vendor Bill (POSTED status) with Payment
        try {
          const order = get().getOrder(id);
          if (order) {
            // Step 1: Create bill with POSTED status
            const year = new Date().getFullYear();
            // Use timestamp to ensure uniqueness and avoid collision
            const billNumber = `BILL-${year}${format(new Date(), 'MMddHHmmss')}`;

            // Calculate due date (30 days from bill date)
            const billDate = new Date();
            const dueDate = new Date(billDate);
            dueDate.setDate(dueDate.getDate() + 30);

            const { data: bill, error: billError } = await supabase
              .from('vendor_bills')
              .insert({
                bill_number: billNumber,
                vendor_id: order.vendorId,
                purchase_order_id: order.id,
                bill_date: billDate.toISOString(),
                due_date: dueDate.toISOString(),
                total_amount: order.totalAmount,
                paid_amount: order.totalAmount, // Fully paid
                status: 'paid', // Directly to paid status
                analytical_account_id: order.analyticalAccountId,
              })
              .select()
              .single();

            if (billError) {
              console.error('Bill creation error:', JSON.stringify(billError, null, 2));
              throw billError;
            }

            // Step 2: Insert bill lines
            const lineInserts = order.lines.map(l => ({
              vendor_bill_id: bill.id,
              product_id: l.productId,
              quantity: l.quantity,
              unit_price: l.unitPrice,
              subtotal: l.subtotal,
              analytical_account_id: l.analyticalAccountId || null
            }));

            const { error: lineError } = await supabase
              .from('vendor_bill_lines')
              .insert(lineInserts);

            if (lineError) {
              console.error('Line insertion error:', JSON.stringify(lineError, null, 2));
              throw lineError;
            }

            // Step 3: Create payment record
            const paymentNumber = `BPAY-${Date.now()}`;

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const { error: paymentError } = await supabase
              .from('bill_payments')
              .insert({
                payment_number: paymentNumber,
                vendor_bill_id: bill.id,
                payment_date: new Date().toISOString(),
                amount: order.totalAmount,
                mode: 'bank_transfer',
                status: 'completed',
                reference: `Auto-payment for ${order.orderNumber}`,
                notes: 'Automatic payment on order confirmation',
                user_id: user.id
              });

            if (paymentError) {
              console.error('Payment creation error:', JSON.stringify(paymentError, null, 2));
              throw paymentError;
            }

            // Step 4: Trigger budget deduction
            const distinctAccounts = new Set<string>();
            order.lines.forEach(line => {
              if (line.analyticalAccountId) distinctAccounts.add(line.analyticalAccountId);
            });

            await Promise.all(
              Array.from(distinctAccounts).map(accountId =>
                useBudgetStore.getState().refreshBudgetsByAnalyticalAccount(accountId)
              )
            );

            toast.success('Order confirmed, bill paid, and budget deducted!');
          }
        } catch (err) {
          console.error('Failed to auto-create bill and payment:', err);
          toast.error('Order confirmed but failed to create bill/payment');
        }

        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === id ? { ...o, status: 'confirmed', updatedAt: new Date() } : o
          ),
        }));
      },
      archiveOrder: async (id) => {
        const { error } = await supabase
          .from('purchase_orders')
          .update({ is_archived: true })
          .eq('id', id);

        if (error) throw error;

        await get().fetchOrders();
      },
      getOrder: (id) => get().orders.find((o) => o.id === id),
    }),
    { name: 'erp-purchase-orders' }
  )
);

// ==================== VENDOR BILL STORE ====================
interface VendorBillStore {
  bills: VendorBill[];
  fetchBills: () => Promise<void>;
  addBill: (bill: Omit<VendorBill, 'id' | 'billNumber' | 'createdAt' | 'updatedAt' | 'paidAmount'>) => Promise<VendorBill>;
  updateBill: (id: string, data: Partial<VendorBill>) => Promise<void>;
  postBill: (id: string) => Promise<void>;
  archiveBill: (id: string) => Promise<void>;
  cancelBill: (id: string) => Promise<void>;
  getBill: (id: string) => VendorBill | undefined;
  updatePaymentStatus: (id: string, paidAmount: number) => Promise<void>;
}

export const useVendorBillStore = create<VendorBillStore>()(
  persist(
    (set, get) => ({
      bills: [],
      fetchBills: async () => {
        const { data, error } = await supabase
          .from('vendor_bills')
          .select(`
            *,
            lines:vendor_bill_lines(*)
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching Bills:', error);
          return;
        }

        const formattedBills: VendorBill[] = data.map((b: any) => ({
          ...b,
          billNumber: b.bill_number,
          vendorId: b.vendor_id,
          purchaseOrderId: b.purchase_order_id,
          billDate: new Date(b.bill_date),
          dueDate: b.due_date ? new Date(b.due_date) : undefined,
          totalAmount: b.total_amount,
          paidAmount: b.paid_amount,
          analyticalAccountId: b.analytical_account_id,
          status: b.status,
          isArchived: b.is_archived,
          createdAt: new Date(b.created_at),
          updatedAt: new Date(b.updated_at),
          lines: b.lines.map((l: any) => ({
            ...l,
            vendorBillId: l.vendor_bill_id,
            productId: l.product_id,
            unitPrice: l.unit_price,
            analyticalAccountId: l.analytical_account_id,
            budgetId: l.budget_id
          }))
        }));

        set({ bills: formattedBills });
      },
      addBill: async (billData) => {
        const year = new Date().getFullYear();
        // Use timestamp to ensure uniqueness and avoid collision
        const billNumber = `BILL-${year}${format(new Date(), 'MMddHHmmss')}`;

        const { lines, ...headerData } = billData;

        // 2. Insert Header
        const { data: bill, error: billError } = await supabase
          .from('vendor_bills')
          .insert({
            bill_number: billNumber,
            vendor_id: headerData.vendorId,
            purchase_order_id: headerData.purchaseOrderId,
            bill_date: headerData.billDate.toISOString(),
            due_date: headerData.dueDate?.toISOString(),
            total_amount: headerData.totalAmount,
            paid_amount: 0,
            status: 'draft',
            analytical_account_id: headerData.analyticalAccountId,
          })
          .select()
          .single();

        if (billError) throw billError;

        // 3. Insert Lines
        if (lines && lines.length > 0) {
          const lineInserts = lines.map(l => ({
            vendor_bill_id: bill.id,
            product_id: l.productId,
            quantity: l.quantity,
            unit_price: l.unitPrice,
            subtotal: l.subtotal,
            analytical_account_id: l.analyticalAccountId || null
            // budget_id temporarily removed due to Supabase cache issue
          }));

          const { error: lineError } = await supabase
            .from('vendor_bill_lines')
            .insert(lineInserts);

          if (lineError) {
            console.error("Error inserting lines:", lineError);
            throw lineError;
          }
        }

        await get().fetchBills();
        return get().getBill(bill.id) as VendorBill;
      },
      updateBill: async (id, data) => {
        const { lines, ...headerData } = data as any;
        const updatePayload: any = {};

        if (headerData.status) updatePayload.status = headerData.status;

        if (Object.keys(headerData).length > 0) {
          const { error } = await supabase
            .from('vendor_bills')
            .update({
              ...updatePayload,
              total_amount: headerData.totalAmount
            })
            .eq('id', id);
          if (error) console.warn("Partial update warn", error);
        }

        await get().fetchBills();
      },
      postBill: async (id) => {
        const bill = get().getBill(id);
        if (bill) {
          // Perform budget recalculations via analytical accounts (Robust/Source-based)
          const distinctAccounts = new Set<string>();
          bill.lines.forEach(line => {
            if (line.analyticalAccountId) distinctAccounts.add(line.analyticalAccountId);
          });

          // Update Supabase FIRST to ensure the query picks it up
          const { error } = await supabase
            .from('vendor_bills')
            .update({ status: 'posted' })
            .eq('id', id);

          if (error) {
            console.error('Error posting bill:', error);
            throw error;
          }

          // Trigger refresh for all affected accounts
          await Promise.all(
            Array.from(distinctAccounts).map(accountId =>
              useBudgetStore.getState().refreshBudgetsByAnalyticalAccount(accountId)
            )
          );
        }

        set((state) => ({
          bills: state.bills.map((b) =>
            b.id === id ? { ...b, status: 'posted', updatedAt: new Date() } : b
          ),
        }));
      },
      archiveBill: async (id) => {
        const { error } = await supabase
          .from('vendor_bills')
          .update({ is_archived: true })
          .eq('id', id);

        if (error) throw error;
        await get().fetchBills();
      },
      getBill: (id) => get().bills.find((b) => b.id === id),
      updatePaymentStatus: async (id, paidAmount) => {
        const bill = get().getBill(id);
        if (!bill) return;

        let status: VendorBill['status'] = 'posted';
        if (paidAmount >= bill.totalAmount) {
          status = 'paid';
        } else if (paidAmount > 0) {
          status = 'partially_paid';
        }

        const { error } = await supabase
          .from('vendor_bills')
          .update({
            paid_amount: paidAmount,
            status: status
          })
          .eq('id', id);

        if (error) throw error;

        await get().fetchBills();
      },
      cancelBill: async (id) => {
        const bill = get().getBill(id);
        if (!bill) return;

        // 1. Update Supabase
        const { error } = await supabase
          .from('vendor_bills')
          .update({ status: 'cancelled' })
          .eq('id', id);

        if (error) throw error;

        // 2. Trigger Budget Refresh (Revert)
        // We need to refresh budgets for all accounts used in this bill
        const distinctAccounts = new Set<string>();
        bill.lines.forEach(line => {
          if (line.analyticalAccountId) distinctAccounts.add(line.analyticalAccountId);
        });

        await Promise.all(
          Array.from(distinctAccounts).map(accountId =>
            useBudgetStore.getState().refreshBudgetsByAnalyticalAccount(accountId)
          )
        );

        await get().fetchBills();
      }
    }),
    { name: 'erp-vendor-bills' }
  )
);

// ==================== BILL PAYMENT STORE ====================
interface BillPaymentStore {
  payments: BillPayment[];
  addPayment: (payment: Omit<BillPayment, 'id' | 'paymentNumber' | 'createdAt'>) => BillPayment;
  getPayment: (id: string) => BillPayment | undefined;
  getPaymentsForBill: (billId: string) => BillPayment[];
}

export const useBillPaymentStore = create<BillPaymentStore>()(
  persist(
    (set, get) => ({
      payments: [
        {
          id: '1',
          paymentNumber: 'PAY-2026-0001',
          vendorBillId: '1',
          paymentDate: new Date('2026-01-15'),
          amount: 100000,
          mode: 'bank_transfer',
          status: 'completed',
          createdAt: new Date('2026-01-15'),
        },
      ],
      addPayment: (paymentData) => {
        const payments = get().payments;
        const year = new Date().getFullYear();
        const count = payments.filter((p) => p.paymentNumber.includes(String(year))).length + 1;
        const paymentNumber = `PAY-${year}-${String(count).padStart(4, '0')}`;

        const newPayment: BillPayment = {
          ...paymentData,
          id: Date.now().toString(),
          paymentNumber,
          createdAt: new Date(),
        };
        set((state) => ({ payments: [...state.payments, newPayment] }));

        // Update bill payment status
        const bill = useVendorBillStore.getState().getBill(paymentData.vendorBillId);
        if (bill) {
          const allPayments = get().getPaymentsForBill(paymentData.vendorBillId);
          const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0) + paymentData.amount;
          useVendorBillStore.getState().updatePaymentStatus(paymentData.vendorBillId, totalPaid);
        }

        return newPayment;
      },
      getPayment: (id) => get().payments.find((p) => p.id === id),
      getPaymentsForBill: (billId) =>
        get().payments.filter((p) => p.vendorBillId === billId),
    }),
    { name: 'erp-bill-payments' }
  )
);

// ==================== SALES ORDER STORE ====================
interface SalesOrderStore {
  orders: SalesOrder[];
  fetchOrders: () => Promise<void>;
  addOrder: (order: Omit<SalesOrder, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>) => Promise<SalesOrder>;
  updateOrder: (id: string, data: Partial<SalesOrder>) => Promise<void>;
  confirmOrder: (id: string) => Promise<void>;
  archiveOrder: (id: string) => Promise<void>;
  getOrder: (id: string) => SalesOrder | undefined;
}

export const useSalesOrderStore = create<SalesOrderStore>()(
  persist(
    (set, get) => ({
      orders: [],
      fetchOrders: async () => {
        const { data, error } = await supabase
          .from('sales_orders')
          .select(`
            *,
            lines:sales_order_lines(*)
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching Sales Orders:', error);
          return;
        }

        const formattedOrders: SalesOrder[] = data.map((o: any) => ({
          ...o,
          orderNumber: o.order_number,
          customerId: o.customer_id,
          orderDate: new Date(o.order_date),
          totalAmount: o.total_amount,
          analyticalAccountId: o.analytical_account_id,
          status: o.status,
          isArchived: o.is_archived,
          createdAt: new Date(o.created_at),
          updatedAt: new Date(o.updated_at),
          lines: o.lines.map((l: any) => ({
            ...l,
            salesOrderId: l.sales_order_id,
            productId: l.product_id,
            unitPrice: l.unit_price,
            analyticalAccountId: l.analytical_account_id,
            budgetId: l.budget_id
          }))
        }));

        set({ orders: formattedOrders });
      },
      addOrder: async (orderData) => {
        const year = new Date().getFullYear();
        // Use timestamp to ensure uniqueness and avoid collision
        const orderNumber = `SO-${year}${format(new Date(), 'MMddHHmmss')}`;

        const { lines, ...headerData } = orderData;

        // Insert Header - use date string to avoid timezone issues
        const orderDateStr = headerData.orderDate instanceof Date 
          ? format(headerData.orderDate, 'yyyy-MM-dd')
          : headerData.orderDate;

        const { data: order, error: orderError } = await supabase
          .from('sales_orders')
          .insert({
            order_number: orderNumber,
            customer_id: headerData.customerId,
            order_date: orderDateStr,
            total_amount: headerData.totalAmount,
            status: 'draft',
            analytical_account_id: headerData.analyticalAccountId,
            is_archived: false
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Insert Lines
        if (lines && lines.length > 0) {
          const lineInserts = lines.map(l => ({
            sales_order_id: order.id,
            product_id: l.productId,
            quantity: l.quantity,
            unit_price: l.unitPrice,
            subtotal: l.subtotal,
            analytical_account_id: l.analyticalAccountId || null
            // budget_id temporarily removed due to Supabase cache issue
          }));

          const { error: lineError } = await supabase
            .from('sales_order_lines')
            .insert(lineInserts);

          if (lineError) {
            console.error("Error inserting order lines:", lineError);
            throw lineError;
          }
        }

        // Auto-create Customer Invoice (Draft) immediately after saving order
        try {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 30);

          console.log('Creating invoice for order:', order.id);
          const createdInvoice = await useCustomerInvoiceStore.getState().addInvoice({
            customerId: orderData.customerId,
            salesOrderId: order.id,
            invoiceDate: new Date(),
            dueDate: dueDate,
            totalAmount: orderData.totalAmount,
            status: 'draft',
            analyticalAccountId: orderData.analyticalAccountId,
            isArchived: false,
            lines: lines.map(l => ({
              id: `temp-${Date.now()}-${l.productId}`,
              productId: l.productId,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              subtotal: l.subtotal,
              analyticalAccountId: l.analyticalAccountId
            })) as any
          });
          console.log('Invoice created successfully:', createdInvoice);
          toast.success('Sales Order and Invoice created!');
        } catch (err) {
          console.error('Failed to auto-create invoice:', err);
          toast.error('Order saved but failed to create invoice');
        }

        await get().fetchOrders();

        // Force page reload to show new invoice
        window.location.href = '/sale/invoices';
        return get().getOrder(order.id) as SalesOrder;
      },
      updateOrder: async (id, data) => {
        const updatePayload: any = {};
        if (data.status) updatePayload.status = data.status;
        if (data.totalAmount) updatePayload.total_amount = data.totalAmount;
        // Add other fields as necessary

        if (Object.keys(updatePayload).length > 0) {
          const { error } = await supabase
            .from('sales_orders')
            .update(updatePayload)
            .eq('id', id);
          if (error) throw error;
        }
        await get().fetchOrders();
      },
      confirmOrder: async (id) => {
        const { error } = await supabase
          .from('sales_orders')
          .update({ status: 'confirmed' })
          .eq('id', id);

        if (error) throw error;

        await get().fetchOrders();
      },
      archiveOrder: async (id) => {
        const { error } = await supabase
          .from('sales_orders')
          .update({ is_archived: true })
          .eq('id', id);

        if (error) throw error;
        await get().fetchOrders();
      },
      getOrder: (id) => get().orders.find((o) => o.id === id),
    }),
    { name: 'erp-sales-orders' }
  )
);

// ==================== CUSTOMER INVOICE STORE ====================
interface CustomerInvoiceStore {
  invoices: CustomerInvoice[];
  fetchInvoices: () => Promise<void>;
  addInvoice: (invoice: Omit<CustomerInvoice, 'id' | 'invoiceNumber' | 'createdAt' | 'updatedAt' | 'paidAmount'>) => Promise<CustomerInvoice>;
  updateInvoice: (id: string, data: Partial<CustomerInvoice>) => Promise<void>;
  postInvoice: (id: string) => Promise<void>;
  archiveInvoice: (id: string) => Promise<void>;
  cancelInvoice: (id: string) => Promise<void>;
  getInvoice: (id: string) => CustomerInvoice | undefined;
  updatePaymentStatus: (id: string, paidAmount: number) => Promise<void>;
}

export const useCustomerInvoiceStore = create<CustomerInvoiceStore>()(
  persist(
    (set, get) => ({
      invoices: [],
      fetchInvoices: async () => {
        const { data, error } = await supabase
          .from('customer_invoices')
          .select(`
            *,
            lines:customer_invoice_lines(*)
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching Customer Invoices:', error);
          return;
        }

        const formattedInvoices: CustomerInvoice[] = data.map((i: any) => ({
          ...i,
          invoiceNumber: i.invoice_number,
          salesOrderId: i.sales_order_id,
          customerId: i.customer_id,
          invoiceDate: new Date(i.invoice_date),
          dueDate: new Date(i.due_date),
          totalAmount: i.total_amount,
          paidAmount: i.paid_amount,
          status: i.status,
          analyticalAccountId: i.analytical_account_id,
          isArchived: i.is_archived,
          createdAt: new Date(i.created_at),
          updatedAt: new Date(i.updated_at),
          lines: i.lines.map((l: any) => ({
            ...l,
            customerInvoiceId: l.customer_invoice_id,
            productId: l.product_id,
            unitPrice: l.unit_price,
            analyticalAccountId: l.analytical_account_id,
            budgetId: l.budget_id
          }))
        }));

        set({ invoices: formattedInvoices });
      },
      addInvoice: async (invoiceData) => {
        const year = new Date().getFullYear();
        // Use timestamp to ensure uniqueness and avoid collision
        const invoiceNumber = `INV-${year}${format(new Date(), 'MMddHHmmss')}`;

        const { lines, ...headerData } = invoiceData;

        // Insert Header
        console.log('Inserting invoice header:', {
          invoice_number: invoiceNumber,
          customer_id: headerData.customerId,
          sales_order_id: headerData.salesOrderId,
          total_amount: headerData.totalAmount
        });

        const { data: invoice, error: invoiceError } = await supabase
          .from('customer_invoices')
          .insert({
            invoice_number: invoiceNumber,
            sales_order_id: headerData.salesOrderId,
            customer_id: headerData.customerId,
            invoice_date: headerData.invoiceDate.toISOString(),
            due_date: headerData.dueDate.toISOString(),
            total_amount: headerData.totalAmount,
            paid_amount: 0,
            status: 'draft',
            analytical_account_id: headerData.analyticalAccountId,
            is_archived: false
          })
          .select()
          .single();

        if (invoiceError) {
          console.error('Invoice header creation error:', JSON.stringify(invoiceError, null, 2));
          throw invoiceError;
        }

        console.log('Invoice header created:', invoice);

        // Insert Lines
        if (lines && lines.length > 0) {
          const lineInserts = lines.map(l => ({
            customer_invoice_id: invoice.id,
            product_id: l.productId,
            quantity: l.quantity,
            unit_price: l.unitPrice,
            subtotal: l.subtotal,
            analytical_account_id: l.analyticalAccountId || null
            // budget_id temporarily removed due to Supabase cache issue
          }));

          const { error: lineError } = await supabase
            .from('customer_invoice_lines')
            .insert(lineInserts);

          if (lineError) {
            console.error("Error inserting invoice lines:", lineError);
            throw lineError;
          }
        }

        // Refresh invoices to update the UI
        await get().fetchInvoices();
        return get().getInvoice(invoice.id) as CustomerInvoice;
      },
      updateInvoice: async (id, data) => {
        const updatePayload: any = {};
        if (data.status) updatePayload.status = data.status;
        // ... mapping other fields ...

        if (Object.keys(updatePayload).length > 0) {
          const { error } = await supabase
            .from('customer_invoices')
            .update(updatePayload)
            .eq('id', id);
          if (error) throw error;
        }
        await get().fetchInvoices();
      },
      postInvoice: async (id) => {
        const invoice = get().getInvoice(id);
        if (invoice) {
          // Perform budget recalculations via analytical accounts
          const distinctAccounts = new Set<string>();
          invoice.lines.forEach(line => {
            if (line.analyticalAccountId) distinctAccounts.add(line.analyticalAccountId);
          });

          // Update Supabase FIRST
          const { error } = await supabase
            .from('customer_invoices')
            .update({ status: 'posted' })
            .eq('id', id);

          if (error) {
            console.error('Error posting invoice:', error);
            throw error;
          }

          // Budget will be updated when customer makes payment
        }

        await get().fetchInvoices();
      },
      archiveInvoice: async (id) => {
        const { error } = await supabase
          .from('customer_invoices')
          .update({ is_archived: true })
          .eq('id', id);

        if (error) throw error;
        await get().fetchInvoices();
      },
      getInvoice: (id) => get().invoices.find((i) => i.id === id),
      cancelInvoice: async (id) => {
        const invoice = get().getInvoice(id);
        if (!invoice) return;

        // 1. Update Supabase
        const { error } = await supabase
          .from('customer_invoices')
          .update({ status: 'cancelled' })
          .eq('id', id);

        if (error) throw error;

        // 2. Trigger Budget Refresh (Revert)
        // We need to refresh budgets for all accounts used in this invoice
        const distinctAccounts = new Set<string>();
        invoice.lines.forEach(line => {
          if (line.analyticalAccountId) distinctAccounts.add(line.analyticalAccountId);
        });

        await Promise.all(
          Array.from(distinctAccounts).map(accountId =>
            useBudgetStore.getState().refreshBudgetsByAnalyticalAccount(accountId)
          )
        );

        await get().fetchInvoices();
      },
      updatePaymentStatus: async (id, paidAmount) => {
        const invoice = get().getInvoice(id);
        if (!invoice) return;

        let status: CustomerInvoice['status'] = 'posted';
        if (paidAmount >= invoice.totalAmount) {
          status = 'paid';
        } else if (paidAmount > 0) {
          status = 'partially_paid';
        }

        const { error } = await supabase
          .from('customer_invoices')
          .update({
            paid_amount: paidAmount,
            status: status
          })
          .eq('id', id);

        if (error) throw error;
        await get().fetchInvoices();
      },
    }),
    { name: 'erp-customer-invoices' }
  )
);

// ==================== INVOICE PAYMENT STORE ====================
interface InvoicePaymentStore {
  payments: InvoicePayment[];
  addPayment: (payment: Omit<InvoicePayment, 'id' | 'paymentNumber' | 'createdAt'>) => InvoicePayment;
  getPayment: (id: string) => InvoicePayment | undefined;
  getPaymentsForInvoice: (invoiceId: string) => InvoicePayment[];
}

export const useInvoicePaymentStore = create<InvoicePaymentStore>()(
  persist(
    (set, get) => ({
      payments: [
        {
          id: '1',
          paymentNumber: 'REC-2026-0001',
          customerInvoiceId: '1',
          paymentDate: new Date('2026-01-20'),
          amount: 118000,
          mode: 'online',
          status: 'completed',
          createdAt: new Date('2026-01-20'),
        },
      ],
      addPayment: (paymentData) => {
        const payments = get().payments;
        const year = new Date().getFullYear();
        const count = payments.filter((p) => p.paymentNumber.includes(String(year))).length + 1;
        const paymentNumber = `REC-${year}-${String(count).padStart(4, '0')}`;

        const newPayment: InvoicePayment = {
          ...paymentData,
          id: Date.now().toString(),
          paymentNumber,
          createdAt: new Date(),
        };
        set((state) => ({ payments: [...state.payments, newPayment] }));

        // Update invoice payment status
        const invoice = useCustomerInvoiceStore.getState().getInvoice(paymentData.customerInvoiceId);
        if (invoice) {
          const allPayments = get().getPaymentsForInvoice(paymentData.customerInvoiceId);
          const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0) + paymentData.amount;
          useCustomerInvoiceStore.getState().updatePaymentStatus(paymentData.customerInvoiceId, totalPaid);
        }

        return newPayment;
      },
      getPayment: (id) => get().payments.find((p) => p.id === id),
      getPaymentsForInvoice: (invoiceId) =>
        get().payments.filter((p) => p.customerInvoiceId === invoiceId),
    }),
    { name: 'erp-invoice-payments' }
  )
);
