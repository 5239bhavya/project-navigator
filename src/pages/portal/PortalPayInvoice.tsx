import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePortalInvoiceDetail, usePortalContactId } from '@/hooks/usePortalData';
import { getInvoiceBalance } from '@/services/paymentService';
import { openRazorpayCheckout } from '@/services/razorpayService';
import { usePortalRefresh } from '@/contexts/PortalRefreshContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CreditCard, AlertCircle, CheckCircle, Loader2, IndianRupee } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

export default function PortalPayInvoice() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { invoice, lines, loading, refresh } = usePortalInvoiceDetail(id || '');
  const { contactId } = usePortalContactId();
  const { triggerRefresh, setLastRefreshType } = usePortalRefresh();
  const { toast } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<{
    paymentId?: string;
    razorpayPaymentId?: string;
    paymentDate?: string;
    amount?: number;
    newStatus?: string;
  } | null>(null);
  
  // Real-time balance
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  
  // Customer details for Razorpay prefill
  const [customerDetails, setCustomerDetails] = useState<{
    name: string;
    email?: string;
    phone?: string;
  } | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Fetch real-time balance
  useEffect(() => {
    async function fetchBalance() {
      if (!id) return;
      setBalanceLoading(true);
      try {
        const balanceData = await getInvoiceBalance(id);
        setCurrentBalance(balanceData.balanceDue);
      } catch (error) {
        console.error('Error fetching balance:', error);
      } finally {
        setBalanceLoading(false);
      }
    }
    fetchBalance();
  }, [id]);

  // Fetch customer details for Razorpay prefill
  useEffect(() => {
    async function fetchCustomerDetails() {
      if (!contactId) return;
      try {
        const { data, error } = await supabase
          .from('contacts')
          .select('name, email, phone')
          .eq('id', contactId)
          .single();
        
        if (!error && data) {
          setCustomerDetails({
            name: data.name,
            email: data.email || undefined,
            phone: data.phone || undefined,
          });
        }
      } catch (err) {
        console.error('Error fetching customer details:', err);
      }
    }
    fetchCustomerDetails();
  }, [contactId]);

  const balance = currentBalance ?? (invoice ? Number(invoice.total_amount) - Number(invoice.paid_amount) : 0);

  const handlePayNow = async () => {
    if (!invoice || !id || balance <= 0) return;

    setIsProcessing(true);

    // Get product description from invoice lines
    const productDescription = lines.length > 0
      ? lines.map(l => l.product_name).join(', ').slice(0, 100)
      : `Invoice ${invoice.invoice_number}`;

    openRazorpayCheckout({
      invoiceId: id,
      invoiceNumber: invoice.invoice_number,
      amount: balance,
      customerName: customerDetails?.name || 'Customer',
      customerEmail: customerDetails?.email,
      customerPhone: customerDetails?.phone,
      productDescription,
      onSuccess: (result) => {
        setIsProcessing(false);
        setPaymentSuccess(true);
        setPaymentDetails({
          paymentId: result.paymentId,
          razorpayPaymentId: result.razorpayPaymentId,
          paymentDate: result.paymentDate,
          amount: balance,
          newStatus: result.newStatus,
        });

        toast({
          title: 'Payment Successful',
          description: `Payment of ${formatCurrency(balance)} has been recorded.${
            result.newStatus === 'paid' 
              ? ' Invoice is now fully paid.' 
              : ` Remaining balance: ${formatCurrency(result.newBalanceDue || 0)}`
          }`,
        });

        // Trigger global refresh
        setLastRefreshType('invoice_payment');
        triggerRefresh();
        refresh();
      },
      onError: (error) => {
        setIsProcessing(false);
        toast({
          title: 'Payment Failed',
          description: error,
          variant: 'destructive',
        });
      },
      onDismiss: () => {
        setIsProcessing(false);
      },
    });
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

  if (balance <= 0 && !paymentSuccess) {
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

  if (paymentSuccess && paymentDetails) {
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
              
              {/* Payment Details */}
              <div className="w-full max-w-md bg-muted/50 rounded-lg p-4 mb-6 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="font-semibold">{formatCurrency(paymentDetails.amount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction ID</span>
                  <span className="font-mono text-sm">{paymentDetails.razorpayPaymentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Date</span>
                  <span>{paymentDetails.paymentDate 
                    ? new Date(paymentDetails.paymentDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="capitalize font-medium text-chart-3">
                    {paymentDetails.newStatus?.replace('_', ' ')}
                  </span>
                </div>
              </div>

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

        {/* Invoice Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Summary</CardTitle>
            <CardDescription>Review before payment</CardDescription>
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

        {/* Line Items */}
        {lines.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lines.map((line) => (
                  <div key={line.id} className="flex justify-between items-center py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{line.product_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {line.quantity} × {formatCurrency(line.unit_price)}
                      </p>
                    </div>
                    <p className="font-medium">{formatCurrency(line.subtotal)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pay Now Button */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Secure Payment
            </CardTitle>
            <CardDescription>
              Pay securely using UPI, Cards, Netbanking, or Wallets
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <span className="text-muted-foreground">Amount to Pay</span>
              <span className="text-2xl font-bold flex items-center gap-1">
                <IndianRupee className="h-5 w-5" />
                {balance.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate(`/portal/invoices/${id}`)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handlePayNow}
                disabled={isProcessing || balance <= 0}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay Now
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Powered by Razorpay • 100% Secure Payment
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
