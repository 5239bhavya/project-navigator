import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { FormActions } from '@/components/common/FormActions';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useCustomerInvoiceStore } from '@/stores';
import { toast } from 'sonner';
import { Plus, Trash2, Package, User, Calendar, Info, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useAutoAnalyticalEvaluator } from '@/hooks/useAutoAnalytical';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface InvoiceLine {
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    analyticalAccountId: string | null;
    budgetId?: string | null;
    isAutoAssigned?: boolean;
}

export default function CustomerInvoiceForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isNew = id === 'new';

    const [formData, setFormData] = useState({
        customerId: '',
        invoiceNumber: '',
        invoiceDate: format(new Date(), 'yyyy-MM-dd'),
        dueDate: '',
        notes: '',
        status: 'draft' as 'draft' | 'posted' | 'paid' | 'partially_paid' | 'cancelled',
    });

    const [lines, setLines] = useState<InvoiceLine[]>([]);
    const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
    const [products, setProducts] = useState<{ id: string; name: string; sales_price: number }[]>([]);
    const [analyticalAccounts, setAnalyticalAccounts] = useState<{ id: string; name: string; code: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(!isNew);

    const { evaluateFull } = useAutoAnalyticalEvaluator();

    // Load master data
    useEffect(() => {
        const loadData = async () => {
            const [customersRes, productsRes, accountsRes] = await Promise.all([
                supabase.from('contacts').select('id, name').eq('is_archived', false),
                supabase.from('products').select('id, name, sales_price').eq('is_archived', false),
                supabase.from('analytical_accounts').select('id, name, code').eq('is_archived', false),
            ]);

            setCustomers(customersRes.data || []);
            setProducts(productsRes.data || []);
            setAnalyticalAccounts(accountsRes.data || []);
        };
        loadData();
    }, []);

    // Load existing invoice if editing
    useEffect(() => {
        if (!isNew && id) {
            const fetchInvoice = async () => {
                setIsFetching(true);
                const { data: invoice, error } = await supabase
                    .from('customer_invoices')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error || !invoice) {
                    toast.error('Invoice not found');
                    navigate('/sale/invoices');
                    return;
                }

                setFormData({
                    customerId: invoice.customer_id,
                    invoiceNumber: invoice.invoice_number,
                    invoiceDate: invoice.invoice_date,
                    dueDate: invoice.due_date || '',
                    notes: invoice.notes || '',
                    status: invoice.status,
                });

                const { data: linesData } = await supabase
                    .from('customer_invoice_lines')
                    .select('*')
                    .eq('customer_invoice_id', id);

                if (linesData) {
                    setLines(linesData.map(l => ({
                        id: l.id,
                        productId: l.product_id,
                        quantity: l.quantity,
                        unitPrice: l.unit_price,
                        subtotal: l.subtotal,
                        analyticalAccountId: l.analytical_account_id,
                        budgetId: l.budget_id,
                    })));
                }
                setIsFetching(false);
            };
            fetchInvoice();
        }
    }, [id, isNew, navigate]);

    const handleLineChange = useCallback(async (index: number, field: keyof InvoiceLine, value: any) => {
        const newLines = [...lines];
        const line = { ...newLines[index], [field]: value };

        // Recalculate subtotal if quantity or price changes
        if (field === 'quantity' || field === 'unitPrice') {
            line.subtotal = line.quantity * line.unitPrice;
        }

        // Auto-analytical assignment if product or customer changes
        if (field === 'productId' && value) {
            const product = products.find(p => p.id === value);
            if (product) {
                line.unitPrice = product.sales_price;
                line.subtotal = line.quantity * line.unitPrice;

                // Trigger auto-analytical
                const result = await evaluateFull(formData.customerId, value);
                if (result.analyticalAccountId) {
                    line.analyticalAccountId = result.analyticalAccountId;
                    line.budgetId = result.budgetId;
                    line.isAutoAssigned = true;
                    toast.info(`Auto-assigned analytics for line ${index + 1}: ${result.matchedModelName}`, {
                        icon: <FileText className="w-4 h-4" />
                    });
                }
            }
        }

        newLines[index] = line;
        setLines(newLines);
    }, [lines, products, formData.customerId, evaluateFull]);

    // Effect to re-evaluate all lines when customer changes
    useEffect(() => {
        if (!formData.customerId || lines.length === 0) return;

        const reEvaluateLines = async () => {
            let changed = false;
            const newLines = await Promise.all(lines.map(async (line, index) => {
                if (line.productId) {
                    const result = await evaluateFull(formData.customerId, line.productId);
                    if (result.analyticalAccountId && result.analyticalAccountId !== line.analyticalAccountId) {
                        changed = true;
                        return {
                            ...line,
                            analyticalAccountId: result.analyticalAccountId,
                            budgetId: result.budgetId,
                            isAutoAssigned: true
                        };
                    }
                }
                return line;
            }));

            if (changed) {
                setLines(newLines);
                toast.info('Analytical accounts updated based on new customer');
            }
        };

        reEvaluateLines();
    }, [formData.customerId, evaluateFull]);

    const addLine = () => {
        setLines([...lines, {
            id: `temp-${Date.now()}`,
            productId: '',
            quantity: 1,
            unitPrice: 0,
            subtotal: 0,
            analyticalAccountId: null,
            budgetId: null,
        }]);
    };

    const removeLine = (index: number) => {
        setLines(lines.filter((_, i) => i !== index));
    };

    const calculateTotal = () => lines.reduce((sum, line) => sum + line.subtotal, 0);

    const handleSave = async () => {
        if (!formData.customerId) {
            toast.error('Please select a customer');
            return;
        }
        if (lines.length === 0) {
            toast.error('Please add at least one line item');
            return;
        }
        if (lines.some(l => !l.productId)) {
            toast.error('Please select a product for all lines');
            return;
        }

        setIsLoading(true);
        try {
            const totalAmount = calculateTotal();
            const invoiceData = {
                customer_id: formData.customerId,
                invoice_number: formData.invoiceNumber || `INV-${format(new Date(), 'yyyyMMddHHmm')}`,
                invoice_date: formData.invoiceDate,
                due_date: formData.dueDate || null,
                notes: formData.notes,
                status: formData.status,
                total_amount: totalAmount,
                payment_status: 'unpaid',
            };

            let invoiceId = id;

            if (isNew) {
                const newInvoice = await useCustomerInvoiceStore.getState().addInvoice({
                    customerId: formData.customerId,
                    invoiceDate: new Date(formData.invoiceDate),
                    dueDate: formData.dueDate ? new Date(formData.dueDate) : new Date(formData.invoiceDate), // Default due date if empty
                    notes: formData.notes,
                    status: formData.status,
                    totalAmount: totalAmount,
                    analyticalAccountId: null,
                    isArchived: false,
                    lines: lines.map(l => ({
                        id: l.id,
                        productId: l.productId,
                        quantity: l.quantity,
                        unitPrice: l.unitPrice,
                        subtotal: l.subtotal,
                        analyticalAccountId: l.analyticalAccountId,
                        budgetId: l.budgetId
                    })) as any
                });
                invoiceId = newInvoice.id;
            } else {
                const { error } = await supabase
                    .from('customer_invoices')
                    .update(invoiceData)
                    .eq('id', id);
                if (error) throw error;

                // Handle lines
                if (!isNew) {
                    await supabase.from('customer_invoice_lines').delete().eq('customer_invoice_id', invoiceId);
                }

                const { error: linesError } = await supabase.from('customer_invoice_lines').insert(
                    lines.map(l => ({
                        customer_invoice_id: invoiceId,
                        product_id: l.productId,
                        quantity: l.quantity,
                        unit_price: l.unitPrice,
                        subtotal: l.subtotal,
                        analytical_account_id: l.analyticalAccountId,
                        budget_id: l.budgetId,
                    }))
                );

                if (linesError) throw linesError;

                await useCustomerInvoiceStore.getState().fetchInvoices();
            }

            toast.success(isNew ? 'Customer invoice created' : 'Customer invoice updated');
            navigate(`/sale/invoices/${invoiceId}`);
        } catch (error) {
            console.error(error);
            toast.error('Failed to save invoice');
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetching) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <PageHeader
                title={isNew ? 'New Customer Invoice' : 'Edit Customer Invoice'}
                subtitle="Create or modify customer invoice"
            />

            <div className="grid gap-6">
                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <User className="h-4 w-4" />
                                Customer Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="customerId">Customer *</Label>
                                <Select
                                    value={formData.customerId}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, customerId: value }))}
                                    disabled={formData.status !== 'draft'}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select customer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {customers.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="invoiceNumber">Invoice Number</Label>
                                <Input
                                    id="invoiceNumber"
                                    placeholder="Enter invoice number"
                                    value={formData.invoiceNumber}
                                    onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                                    disabled={formData.status !== 'draft'}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Calendar className="h-4 w-4" />
                                Dates \u0026 Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="invoiceDate">Invoice Date *</Label>
                                <Input
                                    id="invoiceDate"
                                    type="date"
                                    value={formData.invoiceDate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, invoiceDate: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dueDate">Due Date</Label>
                                <Input
                                    id="dueDate"
                                    type="date"
                                    value={formData.dueDate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Package className="h-4 w-4" />
                            Line Items
                        </CardTitle>
                        <Button size="sm" onClick={addLine} disabled={formData.status !== 'draft'}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add Line
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[300px]">Product</TableHead>
                                    <TableHead className="w-[200px]">Analytical Account</TableHead>
                                    <TableHead className="w-[100px] text-right">Quantity</TableHead>
                                    <TableHead className="w-[120px] text-right">Unit Price</TableHead>
                                    <TableHead className="w-[120px] text-right">Subtotal</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {lines.map((line, index) => (
                                    <TableRow key={line.id}>
                                        <TableCell>
                                            <Select
                                                value={line.productId}
                                                onValueChange={(value) => handleLineChange(index, 'productId', value)}
                                                disabled={formData.status !== 'draft'}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select product" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {products.map((p) => (
                                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Select
                                                    value={line.analyticalAccountId || 'none'}
                                                    onValueChange={(value) => handleLineChange(index, 'analyticalAccountId', value === 'none' ? null : value)}
                                                    disabled={formData.status !== 'draft'}
                                                >
                                                    <SelectTrigger className={line.isAutoAssigned ? 'border-primary/50 bg-primary/5' : ''}>
                                                        <SelectValue placeholder="No analytics" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">No analytics</SelectItem>
                                                        {analyticalAccounts.map((a) => (
                                                            <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {line.isAutoAssigned && (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="text-primary hover:opacity-80">
                                                                    <Info className="h-4 w-4" />
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>This account was automatically suggested based on your rules.</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                value={line.quantity}
                                                onChange={(e) => handleLineChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                                className="text-right"
                                                min="1"
                                                disabled={formData.status !== 'draft'}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                value={line.unitPrice}
                                                onChange={(e) => handleLineChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                className="text-right"
                                                disabled={formData.status !== 'draft'}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(line.subtotal)}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeLine(index)}
                                                disabled={formData.status !== 'draft'}
                                                className="text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {lines.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No lines added. Click "Add Line" to start.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <FormActions
                    mode={isNew ? 'create' : 'edit'}
                    status={formData.status as any}
                    onSave={handleSave}
                    onCancel={() => navigate('/sale/invoices')}
                    isLoading={isLoading}
                    canConfirm={!isNew && formData.status === 'draft'}
                    canRevise={false}
                />
            </div>
        </MainLayout>
    );
}
