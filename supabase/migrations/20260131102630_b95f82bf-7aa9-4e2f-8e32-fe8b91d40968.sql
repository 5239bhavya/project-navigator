-- ============================================================================
-- Auto Analytical Engine - Database Functions and Triggers
-- ============================================================================

-- Function to get partner tags for a contact
CREATE OR REPLACE FUNCTION public.get_contact_tag_ids(contact_id UUID)
RETURNS UUID[] AS $$
  SELECT COALESCE(array_agg(tag_id), ARRAY[]::UUID[])
  FROM contact_tags
  WHERE contact_tags.contact_id = $1;
$$ LANGUAGE sql STABLE;

-- Function to get product category for a product
CREATE OR REPLACE FUNCTION public.get_product_category_id(product_id UUID)
RETURNS UUID AS $$
  SELECT category_id FROM products WHERE id = $1;
$$ LANGUAGE sql STABLE;

-- Main function to find matching analytical account
-- Implements priority-aware rule matching:
-- 1. Only non-archived models are considered
-- 2. ALL selected fields in model must match (AND logic)
-- 3. Higher specificity (more matched fields) wins
-- 4. On tie: higher priority value, then earlier creation date
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
    -- All selected conditions must match (AND logic)
    AND (m.partner_id IS NULL OR m.partner_id = p_partner_id)
    AND (m.partner_tag_id IS NULL OR m.partner_tag_id = ANY(v_partner_tag_ids))
    AND (m.product_id IS NULL OR m.product_id = p_product_id)
    AND (m.product_category_id IS NULL OR m.product_category_id = v_product_category_id)
    -- Must have at least one condition defined
    AND (
      m.partner_id IS NOT NULL OR 
      m.partner_tag_id IS NOT NULL OR 
      m.product_id IS NOT NULL OR 
      m.product_category_id IS NOT NULL
    )
  ORDER BY 
    -- Higher specificity wins (count of defined fields)
    (CASE WHEN m.partner_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN m.partner_tag_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN m.product_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN m.product_category_id IS NOT NULL THEN 1 ELSE 0 END) DESC,
    -- Then by explicit priority
    m.priority DESC,
    -- Then by creation order (first wins)
    m.created_at ASC
  LIMIT 1;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- Trigger Functions for Each Transaction Type
-- ============================================================================

-- Sales Order Lines trigger
CREATE OR REPLACE FUNCTION public.auto_assign_analytics_sales_order_line()
RETURNS TRIGGER AS $$
DECLARE
  v_partner_id UUID;
  v_analytical_account_id UUID;
BEGIN
  -- Only assign if not already set
  IF NEW.analytical_account_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get partner from parent order
  SELECT customer_id INTO v_partner_id
  FROM sales_orders
  WHERE id = NEW.sales_order_id;
  
  -- Find matching analytical account
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
  -- Only assign if not already set
  IF NEW.analytical_account_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get partner from parent order
  SELECT vendor_id INTO v_partner_id
  FROM purchase_orders
  WHERE id = NEW.purchase_order_id;
  
  -- Find matching analytical account
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
  -- Only assign if not already set
  IF NEW.analytical_account_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get partner from parent invoice
  SELECT customer_id INTO v_partner_id
  FROM customer_invoices
  WHERE id = NEW.customer_invoice_id;
  
  -- Find matching analytical account
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
  -- Only assign if not already set
  IF NEW.analytical_account_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get partner from parent bill
  SELECT vendor_id INTO v_partner_id
  FROM vendor_bills
  WHERE id = NEW.vendor_bill_id;
  
  -- Find matching analytical account
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

-- Sales Order Lines: auto-assign on insert and update
DROP TRIGGER IF EXISTS trg_auto_analytics_sales_order_line ON sales_order_lines;
CREATE TRIGGER trg_auto_analytics_sales_order_line
  BEFORE INSERT OR UPDATE OF product_id ON sales_order_lines
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_analytics_sales_order_line();

-- Purchase Order Lines: auto-assign on insert and update
DROP TRIGGER IF EXISTS trg_auto_analytics_purchase_order_line ON purchase_order_lines;
CREATE TRIGGER trg_auto_analytics_purchase_order_line
  BEFORE INSERT OR UPDATE OF product_id ON purchase_order_lines
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_analytics_purchase_order_line();

-- Customer Invoice Lines: auto-assign on insert and update
DROP TRIGGER IF EXISTS trg_auto_analytics_invoice_line ON customer_invoice_lines;
CREATE TRIGGER trg_auto_analytics_invoice_line
  BEFORE INSERT OR UPDATE OF product_id ON customer_invoice_lines
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_analytics_invoice_line();

-- Vendor Bill Lines: auto-assign on insert and update
DROP TRIGGER IF EXISTS trg_auto_analytics_bill_line ON vendor_bill_lines;
CREATE TRIGGER trg_auto_analytics_bill_line
  BEFORE INSERT OR UPDATE OF product_id ON vendor_bill_lines
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_analytics_bill_line();