import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Types for portal data
export interface PortalSalesOrder {
  id: string;
  order_number: string;
  order_date: string;
  expected_delivery_date: string | null;
  total_amount: number;
  status: 'draft' | 'confirmed' | 'cancelled';
  notes: string | null;
  is_archived: boolean;
  created_at: string;
}

export interface PortalInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  status: 'draft' | 'posted' | 'paid' | 'partially_paid' | 'cancelled';
  notes: string | null;
  is_archived: boolean;
  created_at: string;
  sales_order_id: string | null;
}

export interface PortalPurchaseOrder {
  id: string;
  order_number: string;
  order_date: string;
  expected_delivery_date: string | null;
  total_amount: number;
  status: 'draft' | 'confirmed' | 'cancelled';
  notes: string | null;
  is_archived: boolean;
  created_at: string;
}

export interface PortalVendorBill {
  id: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  status: 'draft' | 'posted' | 'paid' | 'partially_paid' | 'cancelled';
  notes: string | null;
  is_archived: boolean;
  created_at: string;
  purchase_order_id: string | null;
}

export interface PortalInvoiceLine {
  id: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface PortalBillLine {
  id: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface PortalPayment {
  id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  mode: 'cash' | 'bank_transfer' | 'cheque' | 'online';
  status: 'pending' | 'completed' | 'failed';
  reference: string | null;
  notes: string | null;
  created_at: string;
}

// Portal Dashboard Stats - NO budget visibility per ERP requirements
export interface PortalDashboardStats {
  pendingSalesOrders: number;
  pendingPurchaseOrders: number;
  unpaidInvoices: number;
  unpaidBills: number;
  unpaidInvoiceAmount: number;
  unpaidBillAmount: number;
  totalSalesOrders: number;
  totalPurchaseOrders: number;
  // Added for Vendor/Customer Financial Reporting
  totalInvoicedAmount: number; // For Customer
  totalReceivedAmount: number; // For Customer
  totalBilledAmount: number;   // For Vendor
  totalPaidAmount: number;     // For Vendor
}

// Hook for portal user's contact ID
export function usePortalContactId() {
  const { user } = useAuth();
  const [contactId, setContactId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContactId() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('portal_contact_id')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching portal contact ID:', error);
        } else {
          setContactId(data?.portal_contact_id || null);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchContactId();
  }, [user?.id]);

  return { contactId, loading };
}

// Hook for portal dashboard stats - NO budgets, only transactional data
// Supports real-time refresh via refreshTrigger
export function usePortalDashboard(refreshTrigger?: number) {
  const [stats, setStats] = useState<PortalDashboardStats>({
    pendingSalesOrders: 0,
    pendingPurchaseOrders: 0,
    unpaidInvoices: 0,
    unpaidBills: 0,
    unpaidInvoiceAmount: 0,
    unpaidBillAmount: 0,
    totalSalesOrders: 0,
    totalPurchaseOrders: 0,
    totalInvoicedAmount: 0,
    totalReceivedAmount: 0,
    totalBilledAmount: 0,
    totalPaidAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchStats = useCallback(async () => {
    try {
      // Fetch CONFIRMED sales orders only (portal sees only confirmed)
      const { data: salesOrders, error: soError } = await supabase
        .from('sales_orders')
        .select('id, status, is_archived')
        .eq('is_archived', false)
        .eq('status', 'confirmed');

      if (soError) throw soError;

      // Fetch CONFIRMED purchase orders only
      const { data: purchaseOrders, error: poError } = await supabase
        .from('purchase_orders')
        .select('id, status, is_archived')
        .eq('is_archived', false)
        .eq('status', 'confirmed');

      if (poError) throw poError;

      // Fetch POSTED customer invoices only (not draft, not cancelled)
      const { data: invoices, error: invError } = await supabase
        .from('customer_invoices')
        .select('id, status, total_amount, paid_amount, is_archived')
        .eq('is_archived', false)
        .in('status', ['posted', 'partially_paid', 'paid']);

      if (invError) throw invError;

      // Fetch POSTED vendor bills only
      const { data: bills, error: billError } = await supabase
        .from('vendor_bills')
        .select('id, status, total_amount, paid_amount, is_archived')
        .eq('is_archived', false)
        .in('status', ['posted', 'partially_paid', 'paid']);

      if (billError) throw billError;

      // Count confirmed orders
      const confirmedSO = salesOrders?.length || 0;
      const confirmedPO = purchaseOrders?.length || 0;

      // Unpaid invoices = posted or partially_paid (not fully paid)
      const unpaidInvs = invoices?.filter(i => i.status !== 'paid') || [];
      const unpaidBlls = bills?.filter(b => b.status !== 'paid') || [];

      // Calculate Totals
      const totalInvoiced = invoices?.reduce((sum, i) => sum + Number(i.total_amount), 0) || 0;
      const totalReceived = invoices?.reduce((sum, i) => sum + Number(i.paid_amount), 0) || 0;

      const totalBilled = bills?.reduce((sum, b) => sum + Number(b.total_amount), 0) || 0;
      const totalPaid = bills?.reduce((sum, b) => sum + Number(b.paid_amount), 0) || 0;

      setStats({
        pendingSalesOrders: confirmedSO,
        pendingPurchaseOrders: confirmedPO,
        unpaidInvoices: unpaidInvs.length,
        unpaidBills: unpaidBlls.length,
        unpaidInvoiceAmount: unpaidInvs.reduce((sum, i) => sum + (Number(i.total_amount) - Number(i.paid_amount)), 0),
        unpaidBillAmount: unpaidBlls.reduce((sum, b) => sum + (Number(b.total_amount) - Number(b.paid_amount)), 0),
        totalSalesOrders: salesOrders?.length || 0,
        totalPurchaseOrders: purchaseOrders?.length || 0,
        totalInvoicedAmount: totalInvoiced,
        totalReceivedAmount: totalReceived,
        totalBilledAmount: totalBilled,
        totalPaidAmount: totalPaid,
      });
    } catch (error) {
      console.error('Error fetching portal stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, refreshTrigger]);

  return { stats, loading, refresh: fetchStats };
}

// Hook for portal sales orders - ONLY CONFIRMED orders visible
export function usePortalSalesOrders() {
  const [orders, setOrders] = useState<PortalSalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      // Portal users ONLY see CONFIRMED sales orders
      const { data, error } = await supabase
        .from('sales_orders')
        .select('*')
        .eq('is_archived', false)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching sales orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to load sales orders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return { orders, loading, refresh: fetchOrders };
}

// Hook for portal invoices - ONLY POSTED invoices visible (not draft)
// Hook for portal invoices (for customers) - ONLY POSTED invoices for THIS customer
export function usePortalInvoices(refreshTrigger?: number) {
  const [invoices, setInvoices] = useState<PortalInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { contactId } = usePortalContactId();

  const fetchInvoices = useCallback(async () => {
    if (!contactId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Portal users ONLY see POSTED invoices where they are the customer
      const { data, error } = await supabase
        .from('customer_invoices')
        .select('*')
        .eq('customer_id', contactId) // Filter by customer
        .eq('is_archived', false)
        .in('status', ['posted', 'partially_paid', 'paid'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({
        title: 'Error',
        description: 'Failed to load invoices',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, contactId]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices, refreshTrigger]);

  return { invoices, loading, refresh: fetchInvoices };
}

// Hook for portal purchase orders (for vendors) - ONLY CONFIRMED
export function usePortalPurchaseOrders() {
  const [orders, setOrders] = useState<PortalPurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      // Portal users ONLY see CONFIRMED purchase orders
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('is_archived', false)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to load purchase orders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return { orders, loading, refresh: fetchOrders };
}

// Hook for portal vendor bills - ONLY POSTED bills visible
// Supports real-time refresh via refreshTrigger
export function usePortalVendorBills(refreshTrigger?: number) {
  const [bills, setBills] = useState<PortalVendorBill[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      // Portal users ONLY see POSTED vendor bills
      const { data, error } = await supabase
        .from('vendor_bills')
        .select('*')
        .eq('is_archived', false)
        .in('status', ['posted', 'partially_paid', 'paid'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBills(data || []);
    } catch (error) {
      console.error('Error fetching vendor bills:', error);
      toast({
        title: 'Error',
        description: 'Failed to load vendor bills',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills, refreshTrigger]);

  return { bills, loading, refresh: fetchBills };
}

// Hook for invoice detail with lines
export function usePortalInvoiceDetail(invoiceId: string) {
  const [invoice, setInvoice] = useState<PortalInvoice | null>(null);
  const [lines, setLines] = useState<PortalInvoiceLine[]>([]);
  const [payments, setPayments] = useState<PortalPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDetail = useCallback(async () => {
    if (!invoiceId) return;
    setLoading(true);
    try {
      // Fetch invoice - only if posted (not draft)
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('customer_invoices')
        .select('*')
        .eq('id', invoiceId)
        .in('status', ['posted', 'partially_paid', 'paid'])
        .maybeSingle();

      if (invoiceError) throw invoiceError;
      setInvoice(invoiceData);

      if (invoiceData) {
        // Fetch lines with products
        const { data: linesData, error: linesError } = await supabase
          .from('customer_invoice_lines')
          .select(`
            id,
            product_id,
            quantity,
            unit_price,
            subtotal,
            products:product_id (name)
          `)
          .eq('customer_invoice_id', invoiceId);

        if (linesError) throw linesError;
        setLines(linesData?.map(line => ({
          id: line.id,
          product_id: line.product_id,
          product_name: (line.products as any)?.name || 'Unknown Product',
          quantity: Number(line.quantity),
          unit_price: Number(line.unit_price),
          subtotal: Number(line.subtotal),
        })) || []);

        // Fetch payments
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('invoice_payments')
          .select('*')
          .eq('customer_invoice_id', invoiceId)
          .order('payment_date', { ascending: false });

        if (paymentsError) throw paymentsError;
        setPayments(paymentsData || []);
      }
    } catch (error) {
      console.error('Error fetching invoice detail:', error);
      toast({
        title: 'Error',
        description: 'Failed to load invoice details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [invoiceId, toast]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { invoice, lines, payments, loading, refresh: fetchDetail };
}

// Hook for vendor bill detail with lines
export function usePortalBillDetail(billId: string) {
  const [bill, setBill] = useState<PortalVendorBill | null>(null);
  const [lines, setLines] = useState<PortalBillLine[]>([]);
  const [payments, setPayments] = useState<PortalPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDetail = useCallback(async () => {
    if (!billId) return;
    setLoading(true);
    try {
      // Fetch bill - only if posted
      const { data: billData, error: billError } = await supabase
        .from('vendor_bills')
        .select('*')
        .eq('id', billId)
        .in('status', ['posted', 'partially_paid', 'paid'])
        .maybeSingle();

      if (billError) throw billError;
      setBill(billData);

      if (billData) {
        // Fetch lines with products
        const { data: linesData, error: linesError } = await supabase
          .from('vendor_bill_lines')
          .select(`
            id,
            product_id,
            quantity,
            unit_price,
            subtotal,
            products:product_id (name)
          `)
          .eq('vendor_bill_id', billId);

        if (linesError) throw linesError;
        setLines(linesData?.map(line => ({
          id: line.id,
          product_id: line.product_id,
          product_name: (line.products as any)?.name || 'Unknown Product',
          quantity: Number(line.quantity),
          unit_price: Number(line.unit_price),
          subtotal: Number(line.subtotal),
        })) || []);

        // Fetch payments
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('bill_payments')
          .select('*')
          .eq('vendor_bill_id', billId)
          .order('payment_date', { ascending: false });

        if (paymentsError) throw paymentsError;
        setPayments(paymentsData || []);
      }
    } catch (error) {
      console.error('Error fetching bill detail:', error);
      toast({
        title: 'Error',
        description: 'Failed to load bill details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [billId, toast]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { bill, lines, payments, loading, refresh: fetchDetail };
}

// Generate next payment number
export async function generatePaymentNumber(prefix: 'PAY' | 'BPAY'): Promise<string> {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');

  // Get count from appropriate table
  let count = 1;
  if (prefix === 'PAY') {
    const { count: invoicePaymentCount } = await supabase
      .from('invoice_payments')
      .select('*', { count: 'exact', head: true });
    count = (invoicePaymentCount || 0) + 1;
  } else {
    const { count: billPaymentCount } = await supabase
      .from('bill_payments')
      .select('*', { count: 'exact', head: true });
    count = (billPaymentCount || 0) + 1;
  }

  return `${prefix}-${year}${month}-${count.toString().padStart(4, '0')}`;
}

// Compute invoice status dynamically based on amounts
export function computeInvoiceStatus(totalAmount: number, paidAmount: number): 'posted' | 'partially_paid' | 'paid' {
  if (paidAmount >= totalAmount) return 'paid';
  if (paidAmount > 0) return 'partially_paid';
  return 'posted';
}

// Compute bill status dynamically based on amounts
export function computeBillStatus(totalAmount: number, paidAmount: number): 'posted' | 'partially_paid' | 'paid' {
  if (paidAmount >= totalAmount) return 'paid';
  if (paidAmount > 0) return 'partially_paid';
  return 'posted';
}
