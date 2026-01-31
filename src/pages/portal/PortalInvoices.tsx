import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePortalInvoices } from '@/hooks/usePortalData';
import { usePortalRefresh } from '@/contexts/PortalRefreshContext';
import { format } from 'date-fns';
import { FileText, Calendar, CreditCard } from 'lucide-react';

export default function PortalInvoices() {
  const navigate = useNavigate();
  const { refreshTrigger } = usePortalRefresh();
  const { invoices, loading } = usePortalInvoices(refreshTrigger);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Compute status badge based on ERP rules
  const getStatusDisplay = (status: string, totalAmount: number, paidAmount: number) => {
    const balance = Number(totalAmount) - Number(paidAmount);
    
    // Derive status from amounts (source of truth)
    let computedStatus = status;
    if (balance <= 0) computedStatus = 'paid';
    else if (paidAmount > 0) computedStatus = 'partially_paid';
    else computedStatus = 'posted';

    switch (computedStatus) {
      case 'paid':
        return { variant: 'default' as const, label: 'Paid' };
      case 'partially_paid':
        return { variant: 'secondary' as const, label: 'Partial' };
      case 'posted':
        return { variant: 'outline' as const, label: 'Posted' };
      default:
        return { variant: 'outline' as const, label: status };
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
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
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">My Invoices</h1>
        </div>

        {invoices.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No invoices found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {invoices.map((invoice) => {
              // Compute balance from stored values (will be accurate after payment sync)
              const balance = Number(invoice.total_amount) - Number(invoice.paid_amount);
              const canPay = balance > 0;
              const statusDisplay = getStatusDisplay(invoice.status, invoice.total_amount, invoice.paid_amount);
              
              return (
                <Card
                  key={invoice.id}
                  className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                  onClick={() => navigate(`/portal/invoices/${invoice.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-lg">{invoice.invoice_number}</span>
                          <Badge variant={statusDisplay.variant}>
                            {statusDisplay.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(invoice.invoice_date), 'dd MMM yyyy')}
                          </span>
                          <span>
                            Due: {format(new Date(invoice.due_date), 'dd MMM yyyy')}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">Total</p>
                            <p className="font-medium">{formatCurrency(invoice.total_amount)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Paid</p>
                            <p className="font-medium text-chart-3">{formatCurrency(invoice.paid_amount)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Balance</p>
                            <p className={`font-medium ${balance > 0 ? 'text-destructive' : 'text-chart-3'}`}>
                              {formatCurrency(balance)}
                            </p>
                          </div>
                        </div>
                      </div>
                      {canPay && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/portal/invoices/${invoice.id}/pay`);
                          }}
                          className="shrink-0"
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Pay Now
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
