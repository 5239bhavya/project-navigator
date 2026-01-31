import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { usePortalDashboard, usePortalSalesOrders, usePortalInvoices, usePortalPurchaseOrders, usePortalVendorBills } from '@/hooks/usePortalData';
import {
  ShoppingCart,
  DollarSign,
  ArrowRight,
  FileText,
  Receipt,
  CreditCard,
  Package,
} from 'lucide-react';
import { format } from 'date-fns';

export default function PortalDashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { stats, loading: statsLoading } = usePortalDashboard();
  const { orders: salesOrders, loading: ordersLoading } = usePortalSalesOrders();
  const { invoices, loading: invoicesLoading } = usePortalInvoices();
  const { orders: purchaseOrders, loading: poLoading } = usePortalPurchaseOrders();
  const { bills: vendorBills, loading: billsLoading } = usePortalVendorBills();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'paid':
      case 'confirmed':
        return 'default';
      case 'partially_paid':
        return 'secondary';
      case 'posted':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'partially_paid':
        return 'Partial';
      case 'posted':
        return 'Unpaid';
      default:
        return status;
    }
  };

  const loading = statsLoading || ordersLoading || invoicesLoading || poLoading || billsLoading;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome, {profile?.name || user?.email?.split('@')[0]}!
          </h1>
          <p className="text-muted-foreground">
            {format(new Date(), 'EEEE, MMMM d, yyyy')} • My Portal
          </p>
        </div>

        {/* Financial Overview - Vendor/Customer Performance */}
        {!loading && (stats.totalBilledAmount > 0 || stats.totalInvoicedAmount > 0) && (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Vendor Financials (if applicable) */}
            {stats.totalBilledAmount > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CreditCard className="h-4 w-4" />
                    Vendor Financials
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Billed</p>
                      <p className="text-lg font-bold">{formatCurrency(stats.totalBilledAmount)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
                      <p className="text-lg font-bold text-chart-2">{formatCurrency(stats.totalPaidAmount)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Outstanding</p>
                      <p className="text-lg font-bold text-destructive">{formatCurrency(stats.totalBilledAmount - stats.totalPaidAmount)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Customer Financials (if applicable) */}
            {stats.totalInvoicedAmount > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4" />
                    Customer Financials
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Invoiced</p>
                      <p className="text-lg font-bold">{formatCurrency(stats.totalInvoicedAmount)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
                      <p className="text-lg font-bold text-chart-2">{formatCurrency(stats.totalReceivedAmount)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Outstanding</p>
                      <p className="text-lg font-bold text-destructive">{formatCurrency(stats.totalInvoicedAmount - stats.totalReceivedAmount)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Quick Stats - NO BUDGET INFO per ERP requirements */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Pending Orders */}
            <Card
              className="border-l-4 border-l-primary cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate('/portal/sales-orders')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Orders
                </CardTitle>
                <Package className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingSalesOrders + stats.pendingPurchaseOrders}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.pendingSalesOrders} sales, {stats.pendingPurchaseOrders} purchase
                </p>
              </CardContent>
            </Card>

            {/* Pending Payments */}
            <Card
              className="border-l-4 border-l-destructive cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate('/portal/invoices')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Payments
                </CardTitle>
                <DollarSign className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.unpaidInvoices + stats.unpaidBills}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(stats.unpaidInvoiceAmount + stats.unpaidBillAmount)} total due
                </p>
              </CardContent>
            </Card>

            {/* My Sales Orders */}
            <Card
              className="border-l-4 border-l-chart-3 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate('/portal/sales-orders')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  My Sales Orders
                </CardTitle>
                <ShoppingCart className="h-4 w-4 text-chart-3" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSalesOrders}</div>
                <p className="text-xs text-muted-foreground">Confirmed orders</p>
              </CardContent>
            </Card>

            {/* My Invoices */}
            <Card
              className="border-l-4 border-l-chart-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate('/portal/invoices')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  My Invoices
                </CardTitle>
                <FileText className="h-4 w-4 text-chart-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{invoices.length}</div>
                <p className="text-xs text-muted-foreground">{stats.unpaidInvoices} unpaid</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Button
            variant="outline"
            className="h-auto flex-col gap-2 p-4"
            onClick={() => navigate('/portal/sales-orders')}
          >
            <ShoppingCart className="h-6 w-6" />
            <span>My Sales Orders</span>
            <span className="text-xs text-muted-foreground">
              {salesOrders.length} confirmed
            </span>
          </Button>

          <Button
            variant="outline"
            className="h-auto flex-col gap-2 p-4"
            onClick={() => navigate('/portal/invoices')}
          >
            <FileText className="h-6 w-6" />
            <span>My Invoices</span>
            <span className="text-xs text-muted-foreground">
              {stats.unpaidInvoices} pending payment
            </span>
          </Button>

          <Button
            variant="outline"
            className="h-auto flex-col gap-2 p-4"
            onClick={() => navigate('/portal/purchase-orders')}
          >
            <Receipt className="h-6 w-6" />
            <span>My Purchase Orders</span>
            <span className="text-xs text-muted-foreground">
              {purchaseOrders.length} confirmed (as vendor)
            </span>
          </Button>

          <Button
            variant="outline"
            className="h-auto flex-col gap-2 p-4"
            onClick={() => navigate('/portal/vendor-bills')}
          >
            <CreditCard className="h-6 w-6" />
            <span>My Vendor Bills</span>
            <span className="text-xs text-muted-foreground">
              {stats.unpaidBills} pending payment
            </span>
          </Button>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Sales Orders</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/portal/sales-orders')}>
                View all <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : salesOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No confirmed sales orders
                </div>
              ) : (
                <div className="space-y-3">
                  {salesOrders.slice(0, 5).map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/30 cursor-pointer"
                      onClick={() => navigate(`/portal/sales-orders/${order.id}`)}
                    >
                      <div>
                        <p className="font-medium">{order.order_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(order.order_date), 'dd MMM yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(order.total_amount)}</p>
                        <Badge variant="default" className="mt-1">
                          Confirmed
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Invoices</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/portal/invoices')}>
                View all <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {invoicesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No invoices yet
                </div>
              ) : (
                <div className="space-y-3">
                  {invoices.slice(0, 5).map((invoice) => {
                    const balance = Number(invoice.total_amount) - Number(invoice.paid_amount);
                    return (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/30 cursor-pointer"
                        onClick={() => navigate(`/portal/invoices/${invoice.id}`)}
                      >
                        <div>
                          <p className="font-medium">{invoice.invoice_number}</p>
                          <p className="text-sm text-muted-foreground">
                            Due: {format(new Date(invoice.due_date), 'dd MMM yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${balance > 0 ? 'text-destructive' : 'text-chart-3'}`}>
                            {balance > 0 ? formatCurrency(balance) + ' due' : 'Paid'}
                          </p>
                          <Badge variant={getStatusVariant(invoice.status)} className="mt-1">
                            {getStatusLabel(invoice.status)}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
