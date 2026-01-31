-- Add missing columns to auto_analytical_models table
ALTER TABLE public.auto_analytical_models ADD COLUMN IF NOT EXISTS budget_id UUID REFERENCES public.budgets(id);
ALTER TABLE public.auto_analytical_models ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmed';

-- Add budget_id to all line tables
ALTER TABLE public.purchase_order_lines ADD COLUMN IF NOT EXISTS budget_id UUID REFERENCES public.budgets(id);
ALTER TABLE public.vendor_bill_lines ADD COLUMN IF NOT EXISTS budget_id UUID REFERENCES public.budgets(id);
ALTER TABLE public.sales_order_lines ADD COLUMN IF NOT EXISTS budget_id UUID REFERENCES public.budgets(id);
ALTER TABLE public.customer_invoice_lines ADD COLUMN IF NOT EXISTS budget_id UUID REFERENCES public.budgets(id);