-- Create triggers for auto-analytical assignment on line items

-- Sales Order Lines trigger
DROP TRIGGER IF EXISTS trg_auto_assign_analytics_sales_order_line ON public.sales_order_lines;
CREATE TRIGGER trg_auto_assign_analytics_sales_order_line
  BEFORE INSERT ON public.sales_order_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_analytics_sales_order_line();

-- Purchase Order Lines trigger
DROP TRIGGER IF EXISTS trg_auto_assign_analytics_purchase_order_line ON public.purchase_order_lines;
CREATE TRIGGER trg_auto_assign_analytics_purchase_order_line
  BEFORE INSERT ON public.purchase_order_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_analytics_purchase_order_line();

-- Customer Invoice Lines trigger
DROP TRIGGER IF EXISTS trg_auto_assign_analytics_invoice_line ON public.customer_invoice_lines;
CREATE TRIGGER trg_auto_assign_analytics_invoice_line
  BEFORE INSERT ON public.customer_invoice_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_analytics_invoice_line();

-- Vendor Bill Lines trigger
DROP TRIGGER IF EXISTS trg_auto_assign_analytics_bill_line ON public.vendor_bill_lines;
CREATE TRIGGER trg_auto_assign_analytics_bill_line
  BEFORE INSERT ON public.vendor_bill_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_analytics_bill_line();