-- =====================================================
-- SHIV FURNITURE ERP DATABASE SCHEMA
-- =====================================================

-- 1. Create user role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'portal');

-- 2. Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'portal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create user_roles table for role-based access
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 4. Create tags table
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT 'hsl(var(--chart-1))',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create product_categories table
CREATE TABLE public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.product_categories(id),
  sales_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (sales_price >= 0),
  purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
  image_url TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Create contacts table
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  street TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  pincode TEXT,
  image_url TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Create contact_tags junction table
CREATE TABLE public.contact_tags (
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, tag_id)
);

-- 9. Create analytical_accounts table (Cost Centers)
CREATE TABLE public.analytical_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Create auto_analytical_models table
CREATE TABLE public.auto_analytical_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  partner_tag_id UUID REFERENCES public.tags(id),
  partner_id UUID REFERENCES public.contacts(id),
  product_category_id UUID REFERENCES public.product_categories(id),
  product_id UUID REFERENCES public.products(id),
  analytical_account_id UUID NOT NULL REFERENCES public.analytical_accounts(id),
  priority INTEGER NOT NULL DEFAULT 0,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Create budget_type and budget_state enums
CREATE TYPE public.budget_type AS ENUM ('income', 'expense');
CREATE TYPE public.budget_state AS ENUM ('draft', 'confirmed', 'revised', 'archived');

-- 12. Create budgets table
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  analytical_account_id UUID NOT NULL REFERENCES public.analytical_accounts(id),
  type budget_type NOT NULL,
  budgeted_amount NUMERIC(14,2) NOT NULL CHECK (budgeted_amount >= 0),
  achieved_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  achievement_percentage NUMERIC(6,2) NOT NULL DEFAULT 0,
  remaining_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  state budget_state NOT NULL DEFAULT 'draft',
  parent_budget_id UUID REFERENCES public.budgets(id),
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Create budget_revisions table
CREATE TABLE public.budget_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  revision_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  previous_amount NUMERIC(14,2) NOT NULL,
  new_amount NUMERIC(14,2) NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Create order_status and invoice_status enums
CREATE TYPE public.order_status AS ENUM ('draft', 'confirmed', 'cancelled');
CREATE TYPE public.invoice_status AS ENUM ('draft', 'posted', 'paid', 'partially_paid', 'cancelled');
CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed');
CREATE TYPE public.payment_mode AS ENUM ('cash', 'bank_transfer', 'cheque', 'online');

-- 15. Create purchase_orders table
CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  vendor_id UUID NOT NULL REFERENCES public.contacts(id),
  user_id UUID REFERENCES auth.users(id),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status order_status NOT NULL DEFAULT 'draft',
  analytical_account_id UUID REFERENCES public.analytical_accounts(id),
  notes TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. Create purchase_order_lines table
CREATE TABLE public.purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  subtotal NUMERIC(14,2) NOT NULL,
  analytical_account_id UUID REFERENCES public.analytical_accounts(id)
);

-- 17. Create vendor_bills table
CREATE TABLE public.vendor_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number TEXT NOT NULL UNIQUE,
  purchase_order_id UUID REFERENCES public.purchase_orders(id),
  vendor_id UUID NOT NULL REFERENCES public.contacts(id),
  user_id UUID REFERENCES auth.users(id),
  bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status invoice_status NOT NULL DEFAULT 'draft',
  analytical_account_id UUID REFERENCES public.analytical_accounts(id),
  notes TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 18. Create vendor_bill_lines table
CREATE TABLE public.vendor_bill_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_bill_id UUID NOT NULL REFERENCES public.vendor_bills(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  subtotal NUMERIC(14,2) NOT NULL,
  analytical_account_id UUID REFERENCES public.analytical_accounts(id)
);

-- 19. Create bill_payments table
CREATE TABLE public.bill_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number TEXT NOT NULL UNIQUE,
  vendor_bill_id UUID NOT NULL REFERENCES public.vendor_bills(id),
  user_id UUID REFERENCES auth.users(id),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  mode payment_mode NOT NULL,
  reference TEXT,
  status payment_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 20. Create sales_orders table
CREATE TABLE public.sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.contacts(id),
  user_id UUID REFERENCES auth.users(id),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status order_status NOT NULL DEFAULT 'draft',
  analytical_account_id UUID REFERENCES public.analytical_accounts(id),
  notes TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 21. Create sales_order_lines table
CREATE TABLE public.sales_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  subtotal NUMERIC(14,2) NOT NULL,
  analytical_account_id UUID REFERENCES public.analytical_accounts(id)
);

-- 22. Create customer_invoices table
CREATE TABLE public.customer_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  sales_order_id UUID REFERENCES public.sales_orders(id),
  customer_id UUID NOT NULL REFERENCES public.contacts(id),
  user_id UUID REFERENCES auth.users(id),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status invoice_status NOT NULL DEFAULT 'draft',
  analytical_account_id UUID REFERENCES public.analytical_accounts(id),
  notes TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 23. Create customer_invoice_lines table
CREATE TABLE public.customer_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_invoice_id UUID NOT NULL REFERENCES public.customer_invoices(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  subtotal NUMERIC(14,2) NOT NULL,
  analytical_account_id UUID REFERENCES public.analytical_accounts(id)
);

-- 24. Create invoice_payments table
CREATE TABLE public.invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number TEXT NOT NULL UNIQUE,
  customer_invoice_id UUID NOT NULL REFERENCES public.customer_invoices(id),
  user_id UUID REFERENCES auth.users(id),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  mode payment_mode NOT NULL,
  reference TEXT,
  status payment_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- HELPER FUNCTIONS (Security Definer)
-- =====================================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytical_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_analytical_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_bill_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());

-- User roles policies (admin only except self-read)
CREATE POLICY "Admin can manage user roles" ON public.user_roles FOR ALL USING (public.is_admin());
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());

-- Tags policies (public read, admin write)
CREATE POLICY "Anyone can view tags" ON public.tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage tags" ON public.tags FOR ALL USING (public.is_admin());

-- Product categories policies (public read, admin write)
CREATE POLICY "Anyone can view categories" ON public.product_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage categories" ON public.product_categories FOR ALL USING (public.is_admin());

-- Products policies (public read, admin write)
CREATE POLICY "Anyone can view products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage products" ON public.products FOR ALL USING (public.is_admin());

-- Contacts policies
CREATE POLICY "Admin can manage all contacts" ON public.contacts FOR ALL USING (public.is_admin());
CREATE POLICY "Users can view own contacts" ON public.contacts FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Users can insert own contacts" ON public.contacts FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Users can update own contacts" ON public.contacts FOR UPDATE USING (user_id = auth.uid() OR public.is_admin());

-- Contact tags policies
CREATE POLICY "Anyone can view contact tags" ON public.contact_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage contact tags" ON public.contact_tags FOR ALL USING (public.is_admin());

-- Analytical accounts policies (public read, admin write)
CREATE POLICY "Anyone can view analytical accounts" ON public.analytical_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage analytical accounts" ON public.analytical_accounts FOR ALL USING (public.is_admin());

-- Auto analytical models policies (public read, admin write)
CREATE POLICY "Anyone can view auto analytical models" ON public.auto_analytical_models FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage auto analytical models" ON public.auto_analytical_models FOR ALL USING (public.is_admin());

-- Budgets policies
CREATE POLICY "Admin can manage all budgets" ON public.budgets FOR ALL USING (public.is_admin());
CREATE POLICY "Users can view budgets" ON public.budgets FOR SELECT TO authenticated USING (true);

-- Budget revisions policies
CREATE POLICY "Admin can manage budget revisions" ON public.budget_revisions FOR ALL USING (public.is_admin());
CREATE POLICY "Users can view budget revisions" ON public.budget_revisions FOR SELECT TO authenticated USING (true);

-- Purchase orders policies
CREATE POLICY "Admin can manage all POs" ON public.purchase_orders FOR ALL USING (public.is_admin());
CREATE POLICY "Users can view own POs" ON public.purchase_orders FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Users can insert own POs" ON public.purchase_orders FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Users can update own POs" ON public.purchase_orders FOR UPDATE USING (user_id = auth.uid() OR public.is_admin());

-- Purchase order lines policies
CREATE POLICY "Users can manage PO lines" ON public.purchase_order_lines FOR ALL USING (
  EXISTS (SELECT 1 FROM public.purchase_orders po WHERE po.id = purchase_order_id AND (po.user_id = auth.uid() OR public.is_admin()))
);

-- Vendor bills policies
CREATE POLICY "Admin can manage all bills" ON public.vendor_bills FOR ALL USING (public.is_admin());
CREATE POLICY "Users can view own bills" ON public.vendor_bills FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Users can insert own bills" ON public.vendor_bills FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Users can update own bills" ON public.vendor_bills FOR UPDATE USING (user_id = auth.uid() OR public.is_admin());

-- Vendor bill lines policies
CREATE POLICY "Users can manage bill lines" ON public.vendor_bill_lines FOR ALL USING (
  EXISTS (SELECT 1 FROM public.vendor_bills vb WHERE vb.id = vendor_bill_id AND (vb.user_id = auth.uid() OR public.is_admin()))
);

-- Bill payments policies
CREATE POLICY "Admin can manage all bill payments" ON public.bill_payments FOR ALL USING (public.is_admin());
CREATE POLICY "Users can view own bill payments" ON public.bill_payments FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Users can insert own bill payments" ON public.bill_payments FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- Sales orders policies
CREATE POLICY "Admin can manage all SOs" ON public.sales_orders FOR ALL USING (public.is_admin());
CREATE POLICY "Users can view own SOs" ON public.sales_orders FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Users can insert own SOs" ON public.sales_orders FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Users can update own SOs" ON public.sales_orders FOR UPDATE USING (user_id = auth.uid() OR public.is_admin());

-- Sales order lines policies
CREATE POLICY "Users can manage SO lines" ON public.sales_order_lines FOR ALL USING (
  EXISTS (SELECT 1 FROM public.sales_orders so WHERE so.id = sales_order_id AND (so.user_id = auth.uid() OR public.is_admin()))
);

-- Customer invoices policies
CREATE POLICY "Admin can manage all invoices" ON public.customer_invoices FOR ALL USING (public.is_admin());
CREATE POLICY "Users can view own invoices" ON public.customer_invoices FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Users can insert own invoices" ON public.customer_invoices FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Users can update own invoices" ON public.customer_invoices FOR UPDATE USING (user_id = auth.uid() OR public.is_admin());

-- Customer invoice lines policies
CREATE POLICY "Users can manage invoice lines" ON public.customer_invoice_lines FOR ALL USING (
  EXISTS (SELECT 1 FROM public.customer_invoices ci WHERE ci.id = customer_invoice_id AND (ci.user_id = auth.uid() OR public.is_admin()))
);

-- Invoice payments policies
CREATE POLICY "Admin can manage all invoice payments" ON public.invoice_payments FOR ALL USING (public.is_admin());
CREATE POLICY "Users can view own invoice payments" ON public.invoice_payments FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Users can insert own invoice payments" ON public.invoice_payments FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATE
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vendor_bills_updated_at BEFORE UPDATE ON public.vendor_bills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sales_orders_updated_at BEFORE UPDATE ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customer_invoices_updated_at BEFORE UPDATE ON public.customer_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'portal')
  );
  
  -- Also add to user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'portal')
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- SEED DATA
-- =====================================================

-- Insert default tags
INSERT INTO public.tags (name, color) VALUES
  ('Premium', 'hsl(234, 89%, 73%)'),
  ('Regular', 'hsl(255, 91%, 76%)'),
  ('VIP', 'hsl(270, 95%, 75%)');

-- Insert default product categories
INSERT INTO public.product_categories (name, description) VALUES
  ('Living Room', 'Sofas, couches, tables'),
  ('Bedroom', 'Beds, wardrobes, dressers'),
  ('Office', 'Desks, chairs, cabinets'),
  ('Dining', 'Dining tables, chairs');

-- Insert default products
INSERT INTO public.products (name, category_id, sales_price, purchase_price)
SELECT 'Royal Sofa Set', id, 45000, 28000 FROM public.product_categories WHERE name = 'Living Room'
UNION ALL
SELECT 'King Size Bed', id, 35000, 22000 FROM public.product_categories WHERE name = 'Bedroom'
UNION ALL
SELECT 'Executive Desk', id, 18000, 11000 FROM public.product_categories WHERE name = 'Office'
UNION ALL
SELECT 'Dining Table 6 Seater', id, 28000, 17000 FROM public.product_categories WHERE name = 'Dining';

-- Insert default analytical accounts
INSERT INTO public.analytical_accounts (code, name, description) VALUES
  ('CC-001', 'Deepavali Campaign', 'Deepavali sales and marketing expenses'),
  ('CC-002', 'Marriage Season', 'Wedding season promotions and bulk orders'),
  ('CC-003', 'Furniture Expo 2026', 'Annual furniture exhibition expenses'),
  ('CC-004', 'General Operations', 'Day-to-day operational expenses');