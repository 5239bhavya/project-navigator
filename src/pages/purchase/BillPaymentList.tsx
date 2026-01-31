import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Eye, Search, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface BillPayment {
  id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  mode: 'cash' | 'bank_transfer' | 'cheque' | 'online';
  status: 'pending' | 'completed' | 'failed';
  reference: string | null;
  bill: {
    id: string;
    bill_number: string;
    vendor: { id: string; name: string } | null;
  } | null;
}

export default function BillPaymentList() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bill_payments')
      .select(`
        id,
        payment_number,
        payment_date,
        amount,
        mode,
        status,
        reference,
        bill:vendor_bills!bill_payments_vendor_bill_id_fkey(
          id,
          bill_number,
          vendor:contacts!vendor_bills_vendor_id_fkey(id, name)
        )
      `)
      .order('payment_date', { ascending: false });

    if (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payments');
    } else {
      setPayments(data || []);
    }
    setLoading(false);
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

  const filteredPayments = payments.filter(
    (payment) =>
      payment.payment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.bill?.bill_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.bill?.vendor?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout>
      <PageHeader
        title="Bill Payments"
        subtitle="Track payments made to vendors"
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search payments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment #</TableHead>
                  <TableHead>Bill</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No payments found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          {payment.payment_number}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="link"
                          className="p-0 h-auto"
                          onClick={() => navigate(`/purchase/bills/${payment.bill?.id}`)}
                        >
                          {payment.bill?.bill_number}
                        </Button>
                      </TableCell>
                      <TableCell>{payment.bill?.vendor?.name || 'Unknown'}</TableCell>
                      <TableCell>{format(new Date(payment.payment_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getModeLabel(payment.mode)}</Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={payment.status} />
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/purchase/bills/${payment.bill?.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}