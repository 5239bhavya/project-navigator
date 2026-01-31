import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePortalInvoiceDetail } from '@/hooks/usePortalData';
import { getInvoiceBalance, DocumentStatus } from '@/services/paymentService';
import { format } from 'date-fns';
import { ArrowLeft, FileText, Calendar, CreditCard, Download, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PortalInvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { invoice, lines, payments, loading, refresh } = usePortalInvoiceDetail(id || '');
  
  // Server-computed financial values (source of truth)
  const [computedBalance, setComputedBalance] = useState<{
    totalAmount: number;
    paidAmount: number;
    balanceDue: number;
    status: DocumentStatus;
  } | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Fetch accurate balance from payment service (sum of all completed payments)
  useEffect(() => {
    async function fetchBalance() {
      if (!id || !invoice) return;
      setBalanceLoading(true);
      try {
        const balance = await getInvoiceBalance(id);
        setComputedBalance(balance);
      } catch (error) {
        console.error('Error fetching balance:', error);
        // Fallback to invoice values if balance fetch fails
        setComputedBalance({
          totalAmount: Number(invoice.total_amount),
          paidAmount: Number(invoice.paid_amount),
          balanceDue: Number(invoice.total_amount) - Number(invoice.paid_amount),
          status: invoice.status as DocumentStatus,
        });
      } finally {
        setBalanceLoading(false);
      }
    }
    fetchBalance();
  }, [id, invoice, payments.length]); // Re-fetch when payments change

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
        return 'default';
      case 'partially_paid':
        return 'secondary';
      case 'posted':
        return 'outline';
      case 'draft':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getPaymentStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Generate and download PDF
  const handleDownloadPDF = async () => {
    if (!invoice) return;
    
    setPdfLoading(true);
    try {
      // Use computed values for accurate PDF
      const totalAmount = computedBalance?.totalAmount ?? Number(invoice.total_amount);
      const paidAmount = computedBalance?.paidAmount ?? Number(invoice.paid_amount);
      const balanceDue = computedBalance?.balanceDue ?? (totalAmount - paidAmount);
      const status = computedBalance?.status ?? invoice.status;

      // Create PDF content
      const pdfContent = `
INVOICE
=======

Invoice Number: ${invoice.invoice_number}
Invoice Date: ${format(new Date(invoice.invoice_date), 'dd MMM yyyy')}
Due Date: ${format(new Date(invoice.due_date), 'dd MMM yyyy')}
Status: ${status.replace('_', ' ').toUpperCase()}

LINE ITEMS
----------
${lines.map(line => 
  `${line.product_name}\n  Qty: ${line.quantity} x ${formatCurrency(line.unit_price)} = ${formatCurrency(line.subtotal)}`
).join('\n\n')}

SUMMARY
-------
Total Amount: ${formatCurrency(totalAmount)}
Amount Paid: ${formatCurrency(paidAmount)}
Balance Due: ${formatCurrency(balanceDue)}

PAYMENT HISTORY
---------------
${payments.length === 0 ? 'No payments recorded' : payments.map(p => 
  `${p.payment_number} | ${format(new Date(p.payment_date), 'dd MMM yyyy')} | ${p.mode.replace('_', ' ')} | ${formatCurrency(p.amount)} | ${p.status}`
).join('\n')}

${invoice.notes ? `\nNOTES\n-----\n${invoice.notes}` : ''}

---
Generated on ${format(new Date(), 'dd MMM yyyy HH:mm')}
`;

      // Create blob and download
      const blob = new Blob([pdfContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoice.invoice_number}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Download Complete',
        description: `Invoice ${invoice.invoice_number} has been downloaded`,
      });
    } catch (error) {
      console.error('PDF download error:', error);
      toast({
        title: 'Download Failed',
        description: 'Unable to download the invoice. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPdfLoading(false);
    }
  };

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

  if (!invoice) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Invoice not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/portal/invoices')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
        </div>
      </MainLayout>
    );
  }

  // Use computed values (source of truth from payments)
  const totalAmount = computedBalance?.totalAmount ?? Number(invoice.total_amount);
  const paidAmount = computedBalance?.paidAmount ?? Number(invoice.paid_amount);
  const balanceDue = computedBalance?.balanceDue ?? (totalAmount - paidAmount);
  const displayStatus = computedBalance?.status ?? invoice.status;
  
  // Pay Now visible only if balance > 0 and not cancelled
  const canPay = balanceDue > 0 && displayStatus !== 'cancelled';

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/portal/invoices')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">{invoice.invoice_number}</h1>
                <Badge variant={getStatusVariant(displayStatus)}>
                  {displayStatus.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Invoice Date: {format(new Date(invoice.invoice_date), 'dd MMM yyyy')}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadPDF} disabled={pdfLoading}>
              {pdfLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download PDF
            </Button>
            {canPay && (
              <Button onClick={() => navigate(`/portal/invoices/${id}/pay`)}>
                <CreditCard className="h-4 w-4 mr-2" />
                Pay Now
              </Button>
            )}
          </div>
        </div>

        {/* Invoice Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Invoice Date</p>
                <p className="font-medium">{format(new Date(invoice.invoice_date), 'dd MMM yyyy')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="font-medium">{format(new Date(invoice.due_date), 'dd MMM yyyy')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={getStatusVariant(displayStatus)} className="mt-1">
                  {displayStatus.replace('_', ' ')}
                </Badge>
              </div>
              {invoice.sales_order_id && (
                <div>
                  <p className="text-sm text-muted-foreground">Sales Order</p>
                  <p className="font-medium">Linked</p>
                </div>
              )}
            </div>

            <Separator className="my-6" />

            {/* Financial Summary - Uses computed values */}
            <div className="grid grid-cols-3 gap-6">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                {balanceLoading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
                )}
              </div>
              <div className="p-4 rounded-lg bg-chart-3/10">
                <p className="text-sm text-muted-foreground">Amount Paid</p>
                {balanceLoading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-chart-3">{formatCurrency(paidAmount)}</p>
                )}
              </div>
              <div className={`p-4 rounded-lg ${balanceDue > 0 ? 'bg-destructive/10' : 'bg-chart-3/10'}`}>
                <p className="text-sm text-muted-foreground">Balance Due</p>
                {balanceLoading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <p className={`text-2xl font-bold ${balanceDue > 0 ? 'text-destructive' : 'text-chart-3'}`}>
                    {formatCurrency(balanceDue)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
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
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No payments recorded yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.payment_number}</TableCell>
                      <TableCell>{format(new Date(payment.payment_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="capitalize">{payment.mode.replace('_', ' ')}</TableCell>
                      <TableCell className="text-right">{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={getPaymentStatusVariant(payment.status)}>
                          {payment.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {payment.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        {invoice.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{invoice.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
