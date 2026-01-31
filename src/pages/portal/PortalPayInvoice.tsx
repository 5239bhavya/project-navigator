import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { usePortalInvoiceDetail } from '@/hooks/usePortalData';
import { processInvoicePayment, getInvoiceBalance, PaymentMode } from '@/services/paymentService';
import { usePortalRefresh } from '@/contexts/PortalRefreshContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CreditCard, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function PortalPayInvoice() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { invoice, loading, refresh } = usePortalInvoiceDetail(id || '');
  const { triggerRefresh, setLastRefreshType } = usePortalRefresh();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('online');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [amount, setAmount] = useState('');
  
  // Real-time balance (recalculated from payments)
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Fetch real-time balance on mount and after any change
  useEffect(() => {
    async function fetchBalance() {
      if (!id) return;
      setBalanceLoading(true);
      try {
        const balanceData = await getInvoiceBalance(id);
        setCurrentBalance(balanceData.balanceDue);
        // Initialize amount with current balance if not already set
        if (!amount && balanceData.balanceDue > 0) {
          setAmount(balanceData.balanceDue.toString());
        }
      } catch (error) {
        console.error('Error fetching balance:', error);
      } finally {
        setBalanceLoading(false);
      }
    }
    fetchBalance();
  }, [id]);

  // Use recalculated balance or fall back to stored value
  const balance = currentBalance ?? (invoice ? Number(invoice.total_amount) - Number(invoice.paid_amount) : 0);

  const handlePayment = async () => {
    if (!invoice || !id) return;

    const paymentAmount = parseFloat(amount);

    // Client-side validation
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid payment amount',
        variant: 'destructive',
      });
      return;
    }

    if (paymentAmount > balance) {
      toast({
        title: 'Amount Exceeds Balance',
        description: `Payment amount cannot exceed balance due (${formatCurrency(balance)})`,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Process payment through ERP-grade service
      const result = await processInvoicePayment(id, {
        amount: paymentAmount,
        mode: paymentMode,
        reference: reference || undefined,
        notes: notes || undefined,
      });

      if (!result.success) {
        toast({
          title: 'Payment Failed',
          description: result.error || 'An error occurred while processing the payment.',
          variant: 'destructive',
        });
        return;
      }

      // Payment successful
      setPaymentSuccess(true);
      toast({
        title: 'Payment Successful',
        description: `Payment of ${formatCurrency(paymentAmount)} has been recorded. ${
          result.newStatus === 'paid' 
            ? 'Invoice is now fully paid.' 
            : `Remaining balance: ${formatCurrency(result.newBalanceDue || 0)}`
        }`,
      });

      // Trigger global refresh for all portal views
      setLastRefreshType('invoice_payment');
      triggerRefresh();

      // Refresh local data
      refresh();

    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment Failed',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || balanceLoading) {
    return (
      <MainLayout>
        <div className="space-y-6 max-w-2xl mx-auto">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!invoice) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Invoice not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/portal/invoices')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
        </div>
      </MainLayout>
    );
  }

  if (balance <= 0) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto">
          <Alert className="border-chart-3">
            <CheckCircle className="h-4 w-4 text-chart-3" />
            <AlertTitle>Invoice Fully Paid</AlertTitle>
            <AlertDescription>
              This invoice has been fully paid. No payment is required.
            </AlertDescription>
          </Alert>
          <Button variant="outline" className="mt-4" onClick={() => navigate(`/portal/invoices/${id}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            View Invoice
          </Button>
        </div>
      </MainLayout>
    );
  }

  if (paymentSuccess) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="h-16 w-16 rounded-full bg-chart-3/20 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-chart-3" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Payment Successful!</h2>
              <p className="text-muted-foreground text-center mb-6">
                Your payment has been recorded and the invoice has been updated.
              </p>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => navigate('/portal/invoices')}>
                  Back to Invoices
                </Button>
                <Button onClick={() => navigate(`/portal/invoices/${id}`)}>
                  View Invoice
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const paidAmount = Number(invoice.total_amount) - balance;

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/portal/invoices/${id}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pay Invoice</h1>
            <p className="text-muted-foreground">{invoice.invoice_number}</p>
          </div>
        </div>

        {/* Invoice Summary - Computed values */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Summary</CardTitle>
            <CardDescription>Values are computed from payment records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-lg font-semibold">{formatCurrency(invoice.total_amount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount Paid</p>
                <p className="text-lg font-semibold text-chart-3">{formatCurrency(paidAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Balance Due</p>
                <p className="text-lg font-semibold text-destructive">{formatCurrency(balance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Details
            </CardTitle>
            <CardDescription>Enter your payment information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount *</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                max={balance}
                min={1}
                step="0.01"
              />
              <p className="text-sm text-muted-foreground">
                Maximum payable: {formatCurrency(balance)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mode">Payment Mode *</Label>
              <Select value={paymentMode} onValueChange={(value: PaymentMode) => setPaymentMode(value)}>
                <SelectTrigger id="mode">
                  <SelectValue placeholder="Select payment mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online Payment (UPI/Card)</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer (NEFT/RTGS)</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Reference / Transaction ID</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Enter transaction reference"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this payment"
                rows={3}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate(`/portal/invoices/${id}`)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handlePayment}
                disabled={isSubmitting || parseFloat(amount) <= 0 || parseFloat(amount) > balance}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Pay ${formatCurrency(parseFloat(amount) || 0)}`
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
