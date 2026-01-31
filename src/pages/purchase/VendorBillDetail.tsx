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
import { ArrowLeft, Calendar, Building, Package, FileText, CreditCard, Download, Edit, Check, XCircle } from 'lucide-react';
import { useVendorBillStore } from '@/stores';
import { toast } from 'sonner';
import { generateInvoicePDF } from '@/services/pdfService';

interface BillLine {
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
}

interface BillData {
  id: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  status: 'draft' | 'posted' | 'paid' | 'partially_paid' | 'cancelled';
  total_amount: number;
  paid_amount: number;
  notes: string | null;
  vendor: { id: string; name: string; email: string | null; phone: string | null; street: string | null; city: string | null } | null;
  lines: BillLine[];
  payments: Payment[];
}

export default function VendorBillDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [bill, setBill] = useState<BillData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (id && id !== 'new') {
      fetchBill();
    }
  }, [id]);

  const fetchBill = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vendor_bills')
      .select(`
        id,
        bill_number,
        bill_date,
        due_date,
        status,
        total_amount,
        paid_amount,
        notes,
        vendor:contacts!vendor_bills_vendor_id_fkey(id, name, email, phone, street, city)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching bill:', error);
      toast.error('Failed to load bill');
      navigate('/purchase/bills');
      return;
    }

    // Fetch lines
    const { data: linesData } = await supabase
      .from('vendor_bill_lines')
      .select(`
        id,
        quantity,
        unit_price,
        subtotal,
        product:products!vendor_bill_lines_product_id_fkey(id, name),
        analytical_account:analytical_accounts!vendor_bill_lines_analytical_account_id_fkey(id, name, code)
      `)
      .eq('vendor_bill_id', id);

    // Fetch payments
    const { data: paymentsData } = await supabase
      .from('bill_payments')
      .select('id, payment_number, payment_date, amount, mode, status')
      .eq('vendor_bill_id', id)
      .order('payment_date', { ascending: false });

    setBill({
      ...data,
      lines: linesData || [],
      payments: paymentsData || [],
    } as BillData);
    setLoading(false);
  };

  const handleDownloadPDF = async () => {
    if (!bill) return;
    setPdfLoading(true);
    try {
      await generateInvoicePDF({
        type: 'bill',
        documentNumber: bill.bill_number,
        date: bill.bill_date,
        dueDate: bill.due_date,
        partyName: bill.vendor?.name || 'Unknown',
        partyAddress: [bill.vendor?.street, bill.vendor?.city].filter(Boolean).join(', '),
        partyEmail: bill.vendor?.email || undefined,
        partyPhone: bill.vendor?.phone || undefined,
        lines: bill.lines.map((l) => ({
          productName: l.product?.name || 'Unknown',
          quantity: l.quantity,
          unitPrice: l.unit_price,
          subtotal: l.subtotal,
        })),
        totalAmount: bill.total_amount,
        paidAmount: bill.paid_amount,
        notes: bill.notes || undefined,
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
    if (!bill) return;
    try {
      await useVendorBillStore.getState().postBill(bill.id);
      toast.success('Bill posted successfully, budget updated');
      fetchBill();
    } catch (error) {
      toast.error('Failed to post bill');
    }
  };

  const handleCancel = async () => {
    if (!bill) return;
    if (!confirm('Are you sure you want to cancel this bill? This will reverse the budget impact.')) return;
    try {
      await useVendorBillStore.getState().cancelBill(bill.id);
      toast.success('Bill cancelled, budget reversed');
      fetchBill();
    } catch (error) {
      console.error(error);
      toast.error('Failed to cancel bill');
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

  if (!bill) {
    return null;
  }

  const balanceAmount = bill.total_amount - bill.paid_amount;

  return (
    <MainLayout>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/purchase/bills')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title={bill.bill_number}
          subtitle="Vendor Bill"
        />
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge status={bill.status} />
          {bill.status === 'draft' && (
            <>
              <Button onClick={() => navigate(`/purchase/bills/${bill.id}`)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="secondary" onClick={handlePost}>
                <Check className="h-4 w-4 mr-2" />
                Post
              </Button>
            </>
          )}
          {bill.status === 'posted' && (
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
        {/* Vendor Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building className="h-4 w-4" />
              Vendor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-medium">{bill.vendor?.name || 'Unknown'}</p>
            {bill.vendor?.street && (
              <p className="text-sm text-muted-foreground">{bill.vendor.street}</p>
            )}
            {bill.vendor?.city && (
              <p className="text-sm text-muted-foreground">{bill.vendor.city}</p>
            )}
            {bill.vendor?.email && (
              <p className="text-sm text-muted-foreground">{bill.vendor.email}</p>
            )}
            {bill.vendor?.phone && (
              <p className="text-sm text-muted-foreground">{bill.vendor.phone}</p>
            )}
          </CardContent>
        </Card>

        {/* Bill Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Bill Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bill Date</span>
              <span>{format(new Date(bill.bill_date), 'dd MMM yyyy')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Due Date</span>
              <span>{format(new Date(bill.due_date), 'dd MMM yyyy')}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Amount</span>
              <span className="font-medium">{formatCurrency(bill.total_amount)}</span>
            </div>
            <div className="flex justify-between text-chart-4">
              <span>Paid Amount</span>
              <span>{formatCurrency(bill.paid_amount)}</span>
            </div>
            <div className="flex justify-between font-medium text-chart-1">
              <span>Balance Due</span>
              <span>{formatCurrency(balanceAmount)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bill Lines */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4" />
            Bill Lines
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
              {bill.lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No bill lines
                  </TableCell>
                </TableRow>
              ) : (
                bill.lines.map((line) => (
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
      {bill.payments.length > 0 && (
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
                {bill.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.payment_number}</TableCell>
                    <TableCell>{format(new Date(payment.payment_date), 'dd MMM yyyy')}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getModeLabel(payment.mode)}</Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={payment.status as 'pending' | 'completed' | 'failed'} />
                    </TableCell>
                    <TableCell className="text-right font-medium text-chart-1">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {bill.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{bill.notes}</p>
          </CardContent>
        </Card>
      )}
    </MainLayout>
  );
}