import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, User, Package, FileText, Edit, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useSalesOrderStore } from '@/stores';

interface OrderLine {
  id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product: { id: string; name: string } | null;
  analytical_account: { id: string; name: string; code: string } | null;
}

interface SalesOrderData {
  id: string;
  order_number: string;
  order_date: string;
  expected_delivery_date: string | null;
  status: 'draft' | 'confirmed' | 'cancelled';
  total_amount: number;
  notes: string | null;
  customer: { id: string; name: string; email: string | null; phone: string | null } | null;
  lines: OrderLine[];
}

export default function SalesOrderDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [order, setOrder] = useState<SalesOrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && id !== 'new') {
      fetchOrder();
    }
  }, [id]);

  const fetchOrder = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sales_orders')
      .select(`
        id,
        order_number,
        order_date,
        expected_delivery_date,
        status,
        total_amount,
        notes,
        customer:contacts!sales_orders_customer_id_fkey(id, name, email, phone)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order');
      navigate('/sale/orders');
      return;
    }

    // Fetch lines separately
    const { data: linesData } = await supabase
      .from('sales_order_lines')
      .select(`
        id,
        quantity,
        unit_price,
        subtotal,
        product:products!sales_order_lines_product_id_fkey(id, name),
        analytical_account:analytical_accounts!sales_order_lines_analytical_account_id_fkey(id, name, code)
      `)
      .eq('sales_order_id', id);

    setOrder({
      ...data,
      lines: linesData || [],
    } as SalesOrderData);
    setLoading(false);
  };

  const handleConfirmOrder = async () => {
    if (!order) return;

    try {
      setLoading(true);
      await useSalesOrderStore.getState().confirmOrder(order.id);
      toast.success('Order confirmed and customer invoice created!');
      // Navigate to customer invoices list
      navigate('/sale/invoices');
    } catch (error) {
      console.error('Error confirming order:', error);
      toast.error('Failed to confirm order');
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <MainLayout>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/sale/orders')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title={order.order_number}
          subtitle="Sales Order Details"
        />
        <StatusBadge status={order.status} className="ml-auto" />
        {order.status === 'draft' && (
          <>
            <Button variant="outline" onClick={() => navigate(`/sale/orders/${order.id}`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button onClick={handleConfirmOrder} disabled={loading}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm Order
            </Button>
          </>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-medium">{order.customer?.name || 'Unknown'}</p>
            {order.customer?.email && (
              <p className="text-sm text-muted-foreground">{order.customer.email}</p>
            )}
            {order.customer?.phone && (
              <p className="text-sm text-muted-foreground">{order.customer.phone}</p>
            )}
          </CardContent>
        </Card>

        {/* Order Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Order Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order Date</span>
              <span>{format(new Date(order.order_date), 'dd MMM yyyy')}</span>
            </div>
            {order.expected_delivery_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expected Delivery</span>
                <span>{format(new Date(order.expected_delivery_date), 'dd MMM yyyy')}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-medium">
              <span>Total Amount</span>
              <span>{formatCurrency(order.total_amount)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Lines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4" />
            Order Lines
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Analytics</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No order lines
                  </TableCell>
                </TableRow>
              ) : (
                order.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium">{line.product?.name || 'Unknown'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {line.analytical_account ? `${line.analytical_account.code} - ${line.analytical_account.name}` : '-'}
                    </TableCell>
                    <TableCell className="text-right">{line.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(line.unit_price)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(line.subtotal)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {order.notes && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
          </CardContent>
        </Card>
      )}
    </MainLayout>
  );
}