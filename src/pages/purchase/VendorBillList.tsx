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
import { format } from 'date-fns';
import { Eye, Plus, Search, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface VendorBill {
  id: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  status: 'draft' | 'posted' | 'paid' | 'partially_paid' | 'cancelled';
  total_amount: number;
  paid_amount: number;
  vendor: { id: string; name: string } | null;
}

export default function VendorBillList() {
  const navigate = useNavigate();
  const [bills, setBills] = useState<VendorBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
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
        vendor:contacts!vendor_bills_vendor_id_fkey(id, name)
      `)
      .eq('is_archived', false)
      .order('bill_date', { ascending: false });

    if (error) {
      console.error('Error fetching bills:', error);
      toast.error('Failed to load bills');
    } else {
      setBills(data || []);
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

  const filteredBills = bills.filter(
    (bill) =>
      bill.bill_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.vendor?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout>
      <PageHeader
        title="Vendor Bills"
        subtitle="Manage vendor bills and payments"
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bills..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => navigate('/purchase/bills/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Bill
        </Button>
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
                  <TableHead>Bill #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No bills found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {bill.bill_number}
                        </div>
                      </TableCell>
                      <TableCell>{bill.vendor?.name || 'Unknown'}</TableCell>
                      <TableCell>{format(new Date(bill.bill_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>{format(new Date(bill.due_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>
                        <StatusBadge status={bill.status} />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(bill.total_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(bill.total_amount - bill.paid_amount)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/purchase/bills/${bill.id}/view`)}
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