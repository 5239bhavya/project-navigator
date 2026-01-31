import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  User,
  Link,
  ArrowLeft,
  ShoppingCart,
  FileText,
  Receipt,
  CreditCard,
  Eye,
  ExternalLink,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface PortalUserProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'portal';
  portal_contact_id: string | null;
  created_at: string;
}

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
}

interface SalesOrder {
  id: string;
  order_number: string;
  order_date: string;
  status: 'draft' | 'confirmed' | 'cancelled';
  total_amount: number;
}

interface CustomerInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  status: 'draft' | 'posted' | 'paid' | 'partially_paid' | 'cancelled';
  total_amount: number;
  paid_amount: number;
}

interface PurchaseOrder {
  id: string;
  order_number: string;
  order_date: string;
  status: 'draft' | 'confirmed' | 'cancelled';
  total_amount: number;
}

interface VendorBill {
  id: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  status: 'draft' | 'posted' | 'paid' | 'partially_paid' | 'cancelled';
  total_amount: number;
  paid_amount: number;
}

export default function PortalUserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [user, setUser] = useState<PortalUserProfile | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [bills, setBills] = useState<VendorBill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      setIsLoading(true);
      try {
        // Fetch user profile
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();

        if (userError) throw userError;
        setUser(userData);

        if (!userData.portal_contact_id) {
          setIsLoading(false);
          return;
        }

        // Fetch linked contact
        const { data: contactData, error: contactError } = await supabase
          .from('contacts')
          .select('id, name, email, phone, city')
          .eq('id', userData.portal_contact_id)
          .single();

        if (!contactError && contactData) {
          setContact(contactData);

          // Fetch sales orders where contact is customer
          const { data: salesData } = await supabase
            .from('sales_orders')
            .select('id, order_number, order_date, status, total_amount')
            .eq('customer_id', contactData.id)
            .eq('is_archived', false)
            .order('order_date', { ascending: false });
          setSalesOrders(salesData || []);

          // Fetch customer invoices
          const { data: invoiceData } = await supabase
            .from('customer_invoices')
            .select('id, invoice_number, invoice_date, due_date, status, total_amount, paid_amount')
            .eq('customer_id', contactData.id)
            .eq('is_archived', false)
            .order('invoice_date', { ascending: false });
          setInvoices(invoiceData || []);

          // Fetch purchase orders where contact is vendor
          const { data: poData } = await supabase
            .from('purchase_orders')
            .select('id, order_number, order_date, status, total_amount')
            .eq('vendor_id', contactData.id)
            .eq('is_archived', false)
            .order('order_date', { ascending: false });
          setPurchaseOrders(poData || []);

          // Fetch vendor bills
          const { data: billData } = await supabase
            .from('vendor_bills')
            .select('id, bill_number, bill_date, due_date, status, total_amount, paid_amount')
            .eq('vendor_id', contactData.id)
            .eq('is_archived', false)
            .order('bill_date', { ascending: false });
          setBills(billData || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load portal user details',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, toast]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Portal user not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/account/portal-users')}>
            Back to Portal Users
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/account/portal-users')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Portal Users
        </Button>

        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user.name}</h1>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </div>

      {/* User & Contact Info */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role</span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${user.role === 'admin' ? 'bg-chart-1/20 text-chart-1' : 'bg-primary/10 text-primary'}`}>
                {user.role}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{format(new Date(user.created_at), 'dd MMM yyyy')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Linked Contact
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contact ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{contact.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span>{contact.email || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span>{contact.phone || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">City</span>
                  <span>{contact.city || '-'}</span>
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => navigate(`/account/contacts/${contact.id}`)}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Contact Details
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No contact linked to this user
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sales Orders
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salesOrders.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(salesOrders.reduce((sum, o) => sum + o.total_amount, 0))} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Invoices
            </CardTitle>
            <FileText className="h-4 w-4 text-chart-1" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(invoices.reduce((sum, i) => sum + i.total_amount - i.paid_amount, 0))} pending
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Purchase Orders
            </CardTitle>
            <Receipt className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchaseOrders.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(purchaseOrders.reduce((sum, o) => sum + o.total_amount, 0))} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vendor Bills
            </CardTitle>
            <CreditCard className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bills.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(bills.reduce((sum, b) => sum + b.total_amount - b.paid_amount, 0))} pending
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Tabs */}
      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sales">Sales Orders ({salesOrders.length})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
          <TabsTrigger value="purchases">PO ({purchaseOrders.length})</TabsTrigger>
          <TabsTrigger value="bills">Bills ({bills.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No sales orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    salesOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.order_number}</TableCell>
                        <TableCell>{format(new Date(order.order_date), 'dd MMM yyyy')}</TableCell>
                        <TableCell><StatusBadge status={order.status} /></TableCell>
                        <TableCell className="text-right">{formatCurrency(order.total_amount)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/sale/orders/${order.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No invoices found
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>{format(new Date(invoice.invoice_date), 'dd MMM yyyy')}</TableCell>
                        <TableCell>{format(new Date(invoice.due_date), 'dd MMM yyyy')}</TableCell>
                        <TableCell><StatusBadge status={invoice.status} /></TableCell>
                        <TableCell className="text-right">{formatCurrency(invoice.total_amount)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(invoice.total_amount - invoice.paid_amount)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/sale/invoices/${invoice.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No purchase orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    purchaseOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.order_number}</TableCell>
                        <TableCell>{format(new Date(order.order_date), 'dd MMM yyyy')}</TableCell>
                        <TableCell><StatusBadge status={order.status} /></TableCell>
                        <TableCell className="text-right">{formatCurrency(order.total_amount)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/purchase/orders/${order.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bills">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No vendor bills found
                      </TableCell>
                    </TableRow>
                  ) : (
                    bills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="font-medium">{bill.bill_number}</TableCell>
                        <TableCell>{format(new Date(bill.bill_date), 'dd MMM yyyy')}</TableCell>
                        <TableCell>{format(new Date(bill.due_date), 'dd MMM yyyy')}</TableCell>
                        <TableCell><StatusBadge status={bill.status} /></TableCell>
                        <TableCell className="text-right">{formatCurrency(bill.total_amount)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(bill.total_amount - bill.paid_amount)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/purchase/bills/${bill.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
