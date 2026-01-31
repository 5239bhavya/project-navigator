import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ArrowLeft, ShoppingCart, Calendar, Download } from 'lucide-react';

interface SalesOrderLine {
  id: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface SalesOrder {
  id: string;
  order_number: string;
  order_date: string;
  expected_delivery_date: string | null;
  total_amount: number;
  status: 'draft' | 'confirmed' | 'cancelled';
  notes: string | null;
}

export default function PortalSalesOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [lines, setLines] = useState<SalesOrderLine[]>([]);
  const [loading, setLoading] = useState(true);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'default';
      case 'draft':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      // Fetch order
      const { data: orderData, error: orderError } = await supabase
        .from('sales_orders')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (orderError) throw orderError;
      setOrder(orderData);

      // Fetch lines with products
      const { data: linesData, error: linesError } = await supabase
        .from('sales_order_lines')
        .select(`
          id,
          product_id,
          quantity,
          unit_price,
          subtotal,
          products:product_id (name)
        `)
        .eq('sales_order_id', id);

      if (linesError) throw linesError;
      setLines(linesData?.map(line => ({
        id: line.id,
        product_id: line.product_id,
        product_name: (line.products as any)?.name || 'Unknown Product',
        quantity: Number(line.quantity),
        unit_price: Number(line.unit_price),
        subtotal: Number(line.subtotal),
      })) || []);
    } catch (error) {
      console.error('Error fetching order detail:', error);
      toast({
        title: 'Error',
        description: 'Failed to load order details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!order) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Sales order not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/portal/sales-orders')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sales Orders
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/portal/sales-orders')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">{order.order_number}</h1>
                <Badge variant={getStatusVariant(order.status)}>
                  {order.status}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Order Date: {format(new Date(order.order_date), 'dd MMM yyyy')}
              </p>
            </div>
          </div>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Order Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Order Date</p>
                <p className="font-medium">{format(new Date(order.order_date), 'dd MMM yyyy')}</p>
              </div>
              {order.expected_delivery_date && (
                <div>
                  <p className="text-sm text-muted-foreground">Expected Delivery</p>
                  <p className="font-medium">{format(new Date(order.expected_delivery_date), 'dd MMM yyyy')}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={getStatusVariant(order.status)} className="mt-1">
                  {order.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-xl font-bold">{formatCurrency(order.total_amount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium">{line.product_name}</TableCell>
                    <TableCell className="text-right">{line.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(line.unit_price)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(line.subtotal)}</TableCell>
                  </TableRow>
                ))}
                {lines.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No line items
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            
            <Separator className="my-4" />
            
            <div className="flex justify-end">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(order.total_amount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {order.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{order.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}