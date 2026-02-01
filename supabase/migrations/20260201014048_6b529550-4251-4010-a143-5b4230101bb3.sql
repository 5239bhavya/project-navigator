-- Add linked_analytic_account_id to products table
ALTER TABLE public.products 
ADD COLUMN linked_analytic_account_id uuid REFERENCES public.analytical_accounts(id);

-- Create index for performance
CREATE INDEX idx_products_linked_analytic_account ON public.products(linked_analytic_account_id);

-- Function to auto-assign analytical account from product on order line insert/update
CREATE OR REPLACE FUNCTION public.auto_assign_product_analytical_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_linked_account_id uuid;
BEGIN
  -- Only process if analytical_account_id is not already set
  IF NEW.analytical_account_id IS NULL AND NEW.product_id IS NOT NULL THEN
    -- Get linked analytical account from product
    SELECT linked_analytic_account_id INTO v_linked_account_id
    FROM public.products
    WHERE id = NEW.product_id;
    
    -- Assign if found
    IF v_linked_account_id IS NOT NULL THEN
      NEW.analytical_account_id := v_linked_account_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply trigger to purchase_order_lines
CREATE TRIGGER trg_auto_assign_analytical_po_lines
BEFORE INSERT OR UPDATE ON public.purchase_order_lines
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_product_analytical_account();

-- Apply trigger to sales_order_lines
CREATE TRIGGER trg_auto_assign_analytical_so_lines
BEFORE INSERT OR UPDATE ON public.sales_order_lines
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_product_analytical_account();

-- Apply trigger to vendor_bill_lines
CREATE TRIGGER trg_auto_assign_analytical_bill_lines
BEFORE INSERT OR UPDATE ON public.vendor_bill_lines
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_product_analytical_account();

-- Apply trigger to customer_invoice_lines
CREATE TRIGGER trg_auto_assign_analytical_invoice_lines
BEFORE INSERT OR UPDATE ON public.customer_invoice_lines
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_product_analytical_account();