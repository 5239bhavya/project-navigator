-- ============================================================================
-- Add missing foreign keys to tables
-- ============================================================================

-- Add FK constraint name for profiles -> contacts
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS fk_portal_contact,
  ADD CONSTRAINT fk_portal_contact 
  FOREIGN KEY (portal_contact_id) REFERENCES public.contacts(id);

-- Add FK for auto_analytical_models
ALTER TABLE public.auto_analytical_models 
  DROP CONSTRAINT IF EXISTS auto_analytical_models_partner_tag_id_fkey,
  ADD CONSTRAINT auto_analytical_models_partner_tag_id_fkey 
  FOREIGN KEY (partner_tag_id) REFERENCES public.tags(id);

ALTER TABLE public.auto_analytical_models 
  DROP CONSTRAINT IF EXISTS auto_analytical_models_partner_id_fkey,
  ADD CONSTRAINT auto_analytical_models_partner_id_fkey 
  FOREIGN KEY (partner_id) REFERENCES public.contacts(id);

ALTER TABLE public.auto_analytical_models 
  DROP CONSTRAINT IF EXISTS auto_analytical_models_product_category_id_fkey,
  ADD CONSTRAINT auto_analytical_models_product_category_id_fkey 
  FOREIGN KEY (product_category_id) REFERENCES public.product_categories(id);

ALTER TABLE public.auto_analytical_models 
  DROP CONSTRAINT IF EXISTS auto_analytical_models_product_id_fkey,
  ADD CONSTRAINT auto_analytical_models_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES public.products(id);

ALTER TABLE public.auto_analytical_models 
  DROP CONSTRAINT IF EXISTS auto_analytical_models_analytical_account_id_fkey,
  ADD CONSTRAINT auto_analytical_models_analytical_account_id_fkey 
  FOREIGN KEY (analytical_account_id) REFERENCES public.analytical_accounts(id);

ALTER TABLE public.auto_analytical_models 
  DROP CONSTRAINT IF EXISTS auto_analytical_models_budget_id_fkey,
  ADD CONSTRAINT auto_analytical_models_budget_id_fkey 
  FOREIGN KEY (budget_id) REFERENCES public.budgets(id);

-- Add FK for budgets
ALTER TABLE public.budgets 
  DROP CONSTRAINT IF EXISTS budgets_analytical_account_id_fkey,
  ADD CONSTRAINT budgets_analytical_account_id_fkey 
  FOREIGN KEY (analytical_account_id) REFERENCES public.analytical_accounts(id);

ALTER TABLE public.budgets 
  DROP CONSTRAINT IF EXISTS budgets_parent_budget_id_fkey,
  ADD CONSTRAINT budgets_parent_budget_id_fkey 
  FOREIGN KEY (parent_budget_id) REFERENCES public.budgets(id);

-- Add FK for budget_revisions
ALTER TABLE public.budget_revisions 
  DROP CONSTRAINT IF EXISTS budget_revisions_budget_id_fkey,
  ADD CONSTRAINT budget_revisions_budget_id_fkey 
  FOREIGN KEY (budget_id) REFERENCES public.budgets(id) ON DELETE CASCADE;

-- Add FK for purchase_orders
ALTER TABLE public.purchase_orders 
  DROP CONSTRAINT IF EXISTS purchase_orders_vendor_id_fkey,
  ADD CONSTRAINT purchase_orders_vendor_id_fkey 
  FOREIGN KEY (vendor_id) REFERENCES public.contacts(id);

ALTER TABLE public.purchase_orders 
  DROP CONSTRAINT IF EXISTS purchase_orders_analytical_account_id_fkey,
  ADD CONSTRAINT purchase_orders_analytical_account_id_fkey 
  FOREIGN KEY (analytical_account_id) REFERENCES public.analytical_accounts(id);

-- Add FK for purchase_order_lines
ALTER TABLE public.purchase_order_lines 
  DROP CONSTRAINT IF EXISTS purchase_order_lines_purchase_order_id_fkey,
  ADD CONSTRAINT purchase_order_lines_purchase_order_id_fkey 
  FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;

ALTER TABLE public.purchase_order_lines 
  DROP CONSTRAINT IF EXISTS purchase_order_lines_product_id_fkey,
  ADD CONSTRAINT purchase_order_lines_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES public.products(id);

ALTER TABLE public.purchase_order_lines 
  DROP CONSTRAINT IF EXISTS purchase_order_lines_analytical_account_id_fkey,
  ADD CONSTRAINT purchase_order_lines_analytical_account_id_fkey 
  FOREIGN KEY (analytical_account_id) REFERENCES public.analytical_accounts(id);

ALTER TABLE public.purchase_order_lines 
  DROP CONSTRAINT IF EXISTS purchase_order_lines_budget_id_fkey,
  ADD CONSTRAINT purchase_order_lines_budget_id_fkey 
  FOREIGN KEY (budget_id) REFERENCES public.budgets(id);

-- Add FK for vendor_bills
ALTER TABLE public.vendor_bills 
  DROP CONSTRAINT IF EXISTS vendor_bills_purchase_order_id_fkey,
  ADD CONSTRAINT vendor_bills_purchase_order_id_fkey 
  FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id);

ALTER TABLE public.vendor_bills 
  DROP CONSTRAINT IF EXISTS vendor_bills_vendor_id_fkey,
  ADD CONSTRAINT vendor_bills_vendor_id_fkey 
  FOREIGN KEY (vendor_id) REFERENCES public.contacts(id);

ALTER TABLE public.vendor_bills 
  DROP CONSTRAINT IF EXISTS vendor_bills_analytical_account_id_fkey,
  ADD CONSTRAINT vendor_bills_analytical_account_id_fkey 
  FOREIGN KEY (analytical_account_id) REFERENCES public.analytical_accounts(id);

-- Add FK for vendor_bill_lines
ALTER TABLE public.vendor_bill_lines 
  DROP CONSTRAINT IF EXISTS vendor_bill_lines_vendor_bill_id_fkey,
  ADD CONSTRAINT vendor_bill_lines_vendor_bill_id_fkey 
  FOREIGN KEY (vendor_bill_id) REFERENCES public.vendor_bills(id) ON DELETE CASCADE;

ALTER TABLE public.vendor_bill_lines 
  DROP CONSTRAINT IF EXISTS vendor_bill_lines_product_id_fkey,
  ADD CONSTRAINT vendor_bill_lines_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES public.products(id);

ALTER TABLE public.vendor_bill_lines 
  DROP CONSTRAINT IF EXISTS vendor_bill_lines_analytical_account_id_fkey,
  ADD CONSTRAINT vendor_bill_lines_analytical_account_id_fkey 
  FOREIGN KEY (analytical_account_id) REFERENCES public.analytical_accounts(id);

ALTER TABLE public.vendor_bill_lines 
  DROP CONSTRAINT IF EXISTS vendor_bill_lines_budget_id_fkey,
  ADD CONSTRAINT vendor_bill_lines_budget_id_fkey 
  FOREIGN KEY (budget_id) REFERENCES public.budgets(id);

-- Add FK for bill_payments
ALTER TABLE public.bill_payments 
  DROP CONSTRAINT IF EXISTS bill_payments_vendor_bill_id_fkey,
  ADD CONSTRAINT bill_payments_vendor_bill_id_fkey 
  FOREIGN KEY (vendor_bill_id) REFERENCES public.vendor_bills(id);

-- Add FK for sales_orders
ALTER TABLE public.sales_orders 
  DROP CONSTRAINT IF EXISTS sales_orders_customer_id_fkey,
  ADD CONSTRAINT sales_orders_customer_id_fkey 
  FOREIGN KEY (customer_id) REFERENCES public.contacts(id);

ALTER TABLE public.sales_orders 
  DROP CONSTRAINT IF EXISTS sales_orders_analytical_account_id_fkey,
  ADD CONSTRAINT sales_orders_analytical_account_id_fkey 
  FOREIGN KEY (analytical_account_id) REFERENCES public.analytical_accounts(id);

-- Add FK for sales_order_lines
ALTER TABLE public.sales_order_lines 
  DROP CONSTRAINT IF EXISTS sales_order_lines_sales_order_id_fkey,
  ADD CONSTRAINT sales_order_lines_sales_order_id_fkey 
  FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id) ON DELETE CASCADE;

ALTER TABLE public.sales_order_lines 
  DROP CONSTRAINT IF EXISTS sales_order_lines_product_id_fkey,
  ADD CONSTRAINT sales_order_lines_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES public.products(id);

ALTER TABLE public.sales_order_lines 
  DROP CONSTRAINT IF EXISTS sales_order_lines_analytical_account_id_fkey,
  ADD CONSTRAINT sales_order_lines_analytical_account_id_fkey 
  FOREIGN KEY (analytical_account_id) REFERENCES public.analytical_accounts(id);

ALTER TABLE public.sales_order_lines 
  DROP CONSTRAINT IF EXISTS sales_order_lines_budget_id_fkey,
  ADD CONSTRAINT sales_order_lines_budget_id_fkey 
  FOREIGN KEY (budget_id) REFERENCES public.budgets(id);

-- Add FK for customer_invoices
ALTER TABLE public.customer_invoices 
  DROP CONSTRAINT IF EXISTS customer_invoices_sales_order_id_fkey,
  ADD CONSTRAINT customer_invoices_sales_order_id_fkey 
  FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id);

ALTER TABLE public.customer_invoices 
  DROP CONSTRAINT IF EXISTS customer_invoices_customer_id_fkey,
  ADD CONSTRAINT customer_invoices_customer_id_fkey 
  FOREIGN KEY (customer_id) REFERENCES public.contacts(id);

ALTER TABLE public.customer_invoices 
  DROP CONSTRAINT IF EXISTS customer_invoices_analytical_account_id_fkey,
  ADD CONSTRAINT customer_invoices_analytical_account_id_fkey 
  FOREIGN KEY (analytical_account_id) REFERENCES public.analytical_accounts(id);

-- Add FK for customer_invoice_lines
ALTER TABLE public.customer_invoice_lines 
  DROP CONSTRAINT IF EXISTS customer_invoice_lines_customer_invoice_id_fkey,
  ADD CONSTRAINT customer_invoice_lines_customer_invoice_id_fkey 
  FOREIGN KEY (customer_invoice_id) REFERENCES public.customer_invoices(id) ON DELETE CASCADE;

ALTER TABLE public.customer_invoice_lines 
  DROP CONSTRAINT IF EXISTS customer_invoice_lines_product_id_fkey,
  ADD CONSTRAINT customer_invoice_lines_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES public.products(id);

ALTER TABLE public.customer_invoice_lines 
  DROP CONSTRAINT IF EXISTS customer_invoice_lines_analytical_account_id_fkey,
  ADD CONSTRAINT customer_invoice_lines_analytical_account_id_fkey 
  FOREIGN KEY (analytical_account_id) REFERENCES public.analytical_accounts(id);

ALTER TABLE public.customer_invoice_lines 
  DROP CONSTRAINT IF EXISTS customer_invoice_lines_budget_id_fkey,
  ADD CONSTRAINT customer_invoice_lines_budget_id_fkey 
  FOREIGN KEY (budget_id) REFERENCES public.budgets(id);

-- Add FK for invoice_payments
ALTER TABLE public.invoice_payments 
  DROP CONSTRAINT IF EXISTS invoice_payments_customer_invoice_id_fkey,
  ADD CONSTRAINT invoice_payments_customer_invoice_id_fkey 
  FOREIGN KEY (customer_invoice_id) REFERENCES public.customer_invoices(id);

-- Add FK for products
ALTER TABLE public.products 
  DROP CONSTRAINT IF EXISTS products_category_id_fkey,
  ADD CONSTRAINT products_category_id_fkey 
  FOREIGN KEY (category_id) REFERENCES public.product_categories(id);

-- Add FK for contact_tags
ALTER TABLE public.contact_tags 
  DROP CONSTRAINT IF EXISTS contact_tags_contact_id_fkey,
  ADD CONSTRAINT contact_tags_contact_id_fkey 
  FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;

ALTER TABLE public.contact_tags 
  DROP CONSTRAINT IF EXISTS contact_tags_tag_id_fkey,
  ADD CONSTRAINT contact_tags_tag_id_fkey 
  FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;

-- ============================================================================
-- Auto Analytical Engine Functions
-- ============================================================================

-- Function to get partner tags for a contact
CREATE OR REPLACE FUNCTION public.get_contact_tag_ids(contact_id UUID)
RETURNS UUID[] AS $$
  SELECT COALESCE(array_agg(tag_id), ARRAY[]::UUID[])
  FROM public.contact_tags
  WHERE contact_tags.contact_id = $1;
$$ LANGUAGE sql STABLE SET search_path = public;

-- Function to get product category for a product
CREATE OR REPLACE FUNCTION public.get_product_category_id(product_id UUID)
RETURNS UUID AS $$
  SELECT category_id FROM public.products WHERE id = $1;
$$ LANGUAGE sql STABLE SET search_path = public;

-- Main function to find matching analytical account
CREATE OR REPLACE FUNCTION public.find_matching_analytical_account(
  p_partner_id UUID,
  p_product_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_partner_tag_ids UUID[];
  v_product_category_id UUID;
  v_result UUID;
BEGIN
  -- Get partner tags
  IF p_partner_id IS NOT NULL THEN
    v_partner_tag_ids := get_contact_tag_ids(p_partner_id);
  ELSE
    v_partner_tag_ids := ARRAY[]::UUID[];
  END IF;
  
  -- Get product category
  IF p_product_id IS NOT NULL THEN
    v_product_category_id := get_product_category_id(p_product_id);
  END IF;
  
  -- Find best matching model using specificity-based priority
  SELECT m.analytical_account_id INTO v_result
  FROM auto_analytical_models m
  WHERE m.is_archived = false
    AND (m.partner_id IS NULL OR m.partner_id = p_partner_id)
    AND (m.partner_tag_id IS NULL OR m.partner_tag_id = ANY(v_partner_tag_ids))
    AND (m.product_id IS NULL OR m.product_id = p_product_id)
    AND (m.product_category_id IS NULL OR m.product_category_id = v_product_category_id)
    AND (
      m.partner_id IS NOT NULL OR 
      m.partner_tag_id IS NOT NULL OR 
      m.product_id IS NOT NULL OR 
      m.product_category_id IS NOT NULL
    )
  ORDER BY 
    (CASE WHEN m.partner_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN m.partner_tag_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN m.product_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN m.product_category_id IS NOT NULL THEN 1 ELSE 0 END) DESC,
    m.priority DESC,
    m.created_at ASC
  LIMIT 1;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- Trigger Functions for Auto Analytics
-- ============================================================================

-- Sales Order Lines trigger
CREATE OR REPLACE FUNCTION public.auto_assign_analytics_sales_order_line()
RETURNS TRIGGER AS $$
DECLARE
  v_partner_id UUID;
  v_analytical_account_id UUID;
BEGIN
  IF NEW.analytical_account_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT customer_id INTO v_partner_id
  FROM sales_orders
  WHERE id = NEW.sales_order_id;
  
  v_analytical_account_id := find_matching_analytical_account(v_partner_id, NEW.product_id);
  
  IF v_analytical_account_id IS NOT NULL THEN
    NEW.analytical_account_id := v_analytical_account_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Purchase Order Lines trigger
CREATE OR REPLACE FUNCTION public.auto_assign_analytics_purchase_order_line()
RETURNS TRIGGER AS $$
DECLARE
  v_partner_id UUID;
  v_analytical_account_id UUID;
BEGIN
  IF NEW.analytical_account_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT vendor_id INTO v_partner_id
  FROM purchase_orders
  WHERE id = NEW.purchase_order_id;
  
  v_analytical_account_id := find_matching_analytical_account(v_partner_id, NEW.product_id);
  
  IF v_analytical_account_id IS NOT NULL THEN
    NEW.analytical_account_id := v_analytical_account_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Customer Invoice Lines trigger
CREATE OR REPLACE FUNCTION public.auto_assign_analytics_invoice_line()
RETURNS TRIGGER AS $$
DECLARE
  v_partner_id UUID;
  v_analytical_account_id UUID;
BEGIN
  IF NEW.analytical_account_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT customer_id INTO v_partner_id
  FROM customer_invoices
  WHERE id = NEW.customer_invoice_id;
  
  v_analytical_account_id := find_matching_analytical_account(v_partner_id, NEW.product_id);
  
  IF v_analytical_account_id IS NOT NULL THEN
    NEW.analytical_account_id := v_analytical_account_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Vendor Bill Lines trigger
CREATE OR REPLACE FUNCTION public.auto_assign_analytics_bill_line()
RETURNS TRIGGER AS $$
DECLARE
  v_partner_id UUID;
  v_analytical_account_id UUID;
BEGIN
  IF NEW.analytical_account_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT vendor_id INTO v_partner_id
  FROM vendor_bills
  WHERE id = NEW.vendor_bill_id;
  
  v_analytical_account_id := find_matching_analytical_account(v_partner_id, NEW.product_id);
  
  IF v_analytical_account_id IS NOT NULL THEN
    NEW.analytical_account_id := v_analytical_account_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- Create Triggers on Line Tables
-- ============================================================================

DROP TRIGGER IF EXISTS trg_auto_analytics_sales_order_line ON sales_order_lines;
CREATE TRIGGER trg_auto_analytics_sales_order_line
  BEFORE INSERT OR UPDATE OF product_id ON sales_order_lines
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_analytics_sales_order_line();

DROP TRIGGER IF EXISTS trg_auto_analytics_purchase_order_line ON purchase_order_lines;
CREATE TRIGGER trg_auto_analytics_purchase_order_line
  BEFORE INSERT OR UPDATE OF product_id ON purchase_order_lines
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_analytics_purchase_order_line();

DROP TRIGGER IF EXISTS trg_auto_analytics_invoice_line ON customer_invoice_lines;
CREATE TRIGGER trg_auto_analytics_invoice_line
  BEFORE INSERT OR UPDATE OF product_id ON customer_invoice_lines
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_analytics_invoice_line();

DROP TRIGGER IF EXISTS trg_auto_analytics_bill_line ON vendor_bill_lines;
CREATE TRIGGER trg_auto_analytics_bill_line
  BEFORE INSERT OR UPDATE OF product_id ON vendor_bill_lines
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_analytics_bill_line();

-- ============================================================================
-- Additional Portal RLS Policies
-- ============================================================================

-- Portal users can create invoice payments for their own invoices
DROP POLICY IF EXISTS "Portal users can create invoice payments" ON public.invoice_payments;
CREATE POLICY "Portal users can create invoice payments"
ON public.invoice_payments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.customer_invoices ci
    WHERE ci.id = customer_invoice_id
    AND ci.customer_id = get_portal_contact_id(auth.uid())
  )
);

-- Portal users can create bill payments for their own bills
DROP POLICY IF EXISTS "Portal users can create bill payments" ON public.bill_payments;
CREATE POLICY "Portal users can create bill payments"
ON public.bill_payments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.vendor_bills vb
    WHERE vb.id = vendor_bill_id
    AND vb.vendor_id = get_portal_contact_id(auth.uid())
  )
);