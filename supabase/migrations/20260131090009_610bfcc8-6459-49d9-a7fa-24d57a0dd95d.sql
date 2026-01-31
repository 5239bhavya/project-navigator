-- Add portal_contact_id to profiles table to link portal users to their contact
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS portal_contact_id uuid REFERENCES public.contacts(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_portal_contact_id ON public.profiles(portal_contact_id);

-- Create a function to get portal user's contact_id
CREATE OR REPLACE FUNCTION public.get_portal_contact_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT portal_contact_id
  FROM public.profiles
  WHERE id = _user_id
$$;

-- Create RLS policies for portal users to view their own sales orders
DROP POLICY IF EXISTS "Portal users can view own sales orders" ON public.sales_orders;
CREATE POLICY "Portal users can view own sales orders"
ON public.sales_orders
FOR SELECT
USING (
  customer_id = get_portal_contact_id(auth.uid())
);

-- Create RLS policies for portal users to view their own customer invoices
DROP POLICY IF EXISTS "Portal users can view own invoices" ON public.customer_invoices;
CREATE POLICY "Portal users can view own invoices"
ON public.customer_invoices
FOR SELECT
USING (
  customer_id = get_portal_contact_id(auth.uid())
);

-- Create RLS policies for portal users to view their own purchase orders (as vendor)
DROP POLICY IF EXISTS "Portal users can view own purchase orders" ON public.purchase_orders;
CREATE POLICY "Portal users can view own purchase orders"
ON public.purchase_orders
FOR SELECT
USING (
  vendor_id = get_portal_contact_id(auth.uid())
);

-- Create RLS policies for portal users to view their own vendor bills
DROP POLICY IF EXISTS "Portal users can view own vendor bills" ON public.vendor_bills;
CREATE POLICY "Portal users can view own vendor bills"
ON public.vendor_bills
FOR SELECT
USING (
  vendor_id = get_portal_contact_id(auth.uid())
);

-- Portal users can insert invoice payments for their own invoices
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

-- Portal users can view their own invoice payments
DROP POLICY IF EXISTS "Portal users can view own invoice payments" ON public.invoice_payments;
CREATE POLICY "Portal users can view own invoice payments"
ON public.invoice_payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.customer_invoices ci
    WHERE ci.id = customer_invoice_id
    AND ci.customer_id = get_portal_contact_id(auth.uid())
  )
);

-- Portal users can insert bill payments for their own bills
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

-- Portal users can view their own bill payments
DROP POLICY IF EXISTS "Portal users can view own bill payments" ON public.bill_payments;
CREATE POLICY "Portal users can view own bill payments"
ON public.bill_payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.vendor_bills vb
    WHERE vb.id = vendor_bill_id
    AND vb.vendor_id = get_portal_contact_id(auth.uid())
  )
);

-- Portal users can view invoice lines for their invoices
DROP POLICY IF EXISTS "Portal users can view own invoice lines" ON public.customer_invoice_lines;
CREATE POLICY "Portal users can view own invoice lines"
ON public.customer_invoice_lines
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.customer_invoices ci
    WHERE ci.id = customer_invoice_id
    AND ci.customer_id = get_portal_contact_id(auth.uid())
  )
);

-- Portal users can view bill lines for their bills
DROP POLICY IF EXISTS "Portal users can view own bill lines" ON public.vendor_bill_lines;
CREATE POLICY "Portal users can view own bill lines"
ON public.vendor_bill_lines
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.vendor_bills vb
    WHERE vb.id = vendor_bill_id
    AND vb.vendor_id = get_portal_contact_id(auth.uid())
  )
);

-- Portal users can view sales order lines for their orders
DROP POLICY IF EXISTS "Portal users can view own SO lines" ON public.sales_order_lines;
CREATE POLICY "Portal users can view own SO lines"
ON public.sales_order_lines
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sales_orders so
    WHERE so.id = sales_order_id
    AND so.customer_id = get_portal_contact_id(auth.uid())
  )
);

-- Portal users can view purchase order lines for their orders
DROP POLICY IF EXISTS "Portal users can view own PO lines" ON public.purchase_order_lines;
CREATE POLICY "Portal users can view own PO lines"
ON public.purchase_order_lines
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_id
    AND po.vendor_id = get_portal_contact_id(auth.uid())
  )
);