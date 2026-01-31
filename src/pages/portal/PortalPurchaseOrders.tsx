import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePortalPurchaseOrders } from '@/hooks/usePortalData';
import { format } from 'date-fns';
import { Receipt, Calendar, DollarSign } from 'lucide-react';

export default function PortalPurchaseOrders() {
  const navigate = useNavigate();
  const { orders, loading } = usePortalPurchaseOrders();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Portal only shows confirmed purchase orders

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Receipt className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">My Purchase Orders</h1>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No purchase orders found</p>
              <p className="text-sm text-muted-foreground mt-1">
                You'll see orders here if you're registered as a vendor
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card
                key={order.id}
                className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                onClick={() => navigate(`/portal/purchase-orders/${order.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-lg">{order.order_number}</span>
                        <Badge variant="default">
                          Confirmed
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(order.order_date), 'dd MMM yyyy')}
                        </span>
                        {order.expected_delivery_date && (
                          <span>
                            Expected: {format(new Date(order.expected_delivery_date), 'dd MMM yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="flex items-center gap-1 text-xl font-bold">
                        <DollarSign className="h-5 w-5" />
                        {formatCurrency(order.total_amount)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
