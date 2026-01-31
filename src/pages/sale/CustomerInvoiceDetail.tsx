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
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, User, Package, FileText, CreditCard, Download, Edit, Check, XCircle } from 'lucide-react';
import { useCustomerInvoiceStore } from '@/stores';
import { toast } from 'sonner';
import { generateInvoicePDF } from '@/services/pdfService';

interface InvoiceLine {
  id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product: { id: string; name: string } | null;
  analytical_account: { id: string; name: string; code: string } | null;
}

interface Payment {
  id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  mode: string;
  status: string;
  reference: string | null;
}

interface InvoiceData {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  status: 'draft' | 'posted' | 'paid' | 'partially_paid' | 'cancelled';
  total_amount: number;
  paid_amount: number;
  notes: string | null;
  customer: { id: string; name: string; email: string | null; phone: string | null; street: string | null; city: string | null } | null;
  lines: InvoiceLine[];
  payments: Payment[];
}

export default function CustomerInvoiceDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (id && id !== 'new') {
      fetchInvoice();
    }
  }, [id]);

  const fetchInvoice = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customer_invoices')
      .select(`
        id,
        invoice_number,
        invoice_date,
        due_date,
        status,
        total_amount,
        paid_amount,
        notes,
        customer:contacts!customer_invoices_customer_id_fkey(id, name, email, phone, street, city)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching invoice:', error);
      toast.error('Failed to load invoice');
      navigate('/sale/invoices');
      return;
    }

    // Fetch lines
    const { data: linesData } = await supabase
      .from('customer_invoice_lines')
      .select(`
        id,
        quantity,
        unit_price,
        subtotal,
        product:products!customer_invoice_lines_product_id_fkey(id, name),
        analytical_account:analytical_accounts!customer_invoice_lines_analytical_account_id_fkey(id, name, code)
      `)
      .eq('customer_invoice_id', id);

    const { data: paymentsData } = await supabase
      .from('invoice_payments')
      .select('id, payment_number, payment_date, amount, mode, status, reference')
      .eq('customer_invoice_id', id)
      .order('payment_date', { ascending: false });

    setInvoice({
      ...data,
      lines: linesData || [],
      payments: paymentsData || [],
    } as InvoiceData);
    setLoading(false);
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    setPdfLoading(true);
    try {
      await generateInvoicePDF({
        type: 'invoice',
        documentNumber: invoice.invoice_number,
        date: invoice.invoice_date,
        dueDate: invoice.due_date,
        partyName: invoice.customer?.name || 'Unknown',
        partyAddress: [invoice.customer?.street, invoice.customer?.city].filter(Boolean).join(', '),
        partyEmail: invoice.customer?.email || undefined,
        partyPhone: invoice.customer?.phone || undefined,
        lines: invoice.lines.map((l) => ({
          productName: l.product?.name || 'Unknown',
          quantity: l.quantity,
          unitPrice: l.unit_price,
          subtotal: l.subtotal,
        })),
        totalAmount: invoice.total_amount,
        paidAmount: invoice.paid_amount,
        notes: invoice.notes || undefined,
        payments: invoice.payments.filter(p => p.status === 'completed').map(p => ({
          paymentNumber: p.payment_number,
          paymentDate: p.payment_date,
          amount: p.amount,
          mode: p.mode,
          reference: p.reference || undefined,
        })),
      });
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePost = async () => {
    if (!invoice) return;
    try {
      await useCustomerInvoiceStore.getState().postInvoice(invoice.id);
      toast.success('Invoice posted successfully, budget updated');
      fetchInvoice();
    } catch (error) {
      toast.error('Failed to post invoice');
    }
  };

  const handleCancel = async () => {
    if (!invoice) return;
    if (!confirm('Are you sure you want to cancel this invoice? This will reverse the budget impact.')) return;
    try {
      await useCustomerInvoiceStore.getState().cancelInvoice(invoice.id);
      toast.success('Invoice cancelled, budget reversed');
      fetchInvoice();
    } catch (error) {
      console.error(error);
      toast.error('Failed to cancel invoice');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getModeLabel = (mode: string) => {
    const labels: Record<string, string> = {
      cash: 'Cash',
      bank_transfer: 'Bank Transfer',
      cheque: 'Cheque',
      online: 'Online',
    };
    return labels[mode] || mode;
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

  if (!invoice) {
    return null;
  }

  const balanceAmount = invoice.total_amount - invoice.paid_amount;

  return (
    <MainLayout>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/sale/invoices')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title={invoice.invoice_number}
          subtitle="Customer Invoice"
        />
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge status={invoice.status} />
          {invoice.status === 'draft' && (
            <>
              <Button onClick={() => navigate(`/sale/invoices/${invoice.id}`)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="secondary" onClick={handlePost}>
                <Check className="h-4 w-4 mr-2" />
                Post
              </Button>
            </>
          )}
          {invoice.status === 'posted' && (
            <Button variant="destructive" onClick={handleCancel}>
              <XCircle className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}
          <Button variant="outline" onClick={handleDownloadPDF} disabled={pdfLoading}>
            <Download className="h-4 w-4 mr-2" />
            {pdfLoading ? 'Generating...' : 'Download PDF'}
          </Button>
        </div>
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
            <p className="font-medium">{invoice.customer?.name || 'Unknown'}</p>
            {invoice.customer?.street && (
              <p className="text-sm text-muted-foreground">{invoice.customer.street}</p>
            )}
            {invoice.customer?.city && (
              <p className="text-sm text-muted-foreground">{invoice.customer.city}</p>
            )}
            {invoice.customer?.email && (
              <p className="text-sm text-muted-foreground">{invoice.customer.email}</p>
            )}
            {invoice.customer?.phone && (
              <p className="text-sm text-muted-foreground">{invoice.customer.phone}</p>
            )}
          </CardContent>
        </Card>

        {/* Invoice Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Invoice Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice Date</span>
              <span>{format(new Date(invoice.invoice_date), 'dd MMM yyyy')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Due Date</span>
              <span>{format(new Date(invoice.due_date), 'dd MMM yyyy')}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Amount</span>
              <span className="font-medium">{formatCurrency(invoice.total_amount)}</span>
            </div>
            <div className="flex justify-between text-chart-4">
              <span>Paid Amount</span>
              <span>{formatCurrency(invoice.paid_amount)}</span>
            </div>
            <div className="flex justify-between font-medium text-chart-1">
              <span>Balance Due</span>
              <span>{formatCurrency(balanceAmount)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Lines */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4" />
            Invoice Lines
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
              {invoice.lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No invoice lines
                  </TableCell>
                </TableRow>
              ) : (
                invoice.lines.map((line) => (
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

      {/* Payments */}
      {invoice.payments.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.payment_number}</TableCell>
                    <TableCell>{format(new Date(payment.payment_date), 'dd MMM yyyy')}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getModeLabel(payment.mode)}</Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={payment.status as 'pending' | 'completed' | 'failed'} />
                    </TableCell>
                    <TableCell className="text-right font-medium text-chart-4">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}
    </MainLayout>
  );
}