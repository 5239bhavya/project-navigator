import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { FormActions } from '@/components/common/FormActions';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useBudgetStore, useAnalyticalAccountStore } from '@/stores';
import { Budget, BudgetState, BudgetType } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function BudgetForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = id === 'new';
  const {
    budgets,
    addBudget,
    updateBudget,
    confirmBudget,
    reviseBudget,
    archiveBudget,
    getBudget,
  } = useBudgetStore();
  const { accounts } = useAnalyticalAccountStore();

  const [formData, setFormData] = useState<{
    name: string;
    startDate: string;
    endDate: string;
    analyticalAccountId: string;
    type: BudgetType;
    budgetedAmount: number;
    state: BudgetState;
  }>({
    name: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    analyticalAccountId: '',
    type: 'expense',
    budgetedAmount: 0,
    state: 'draft',
  });

  const [budgetDetails, setBudgetDetails] = useState<Budget | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showReviseDialog, setShowReviseDialog] = useState(false);
  const [newBudgetedAmount, setNewBudgetedAmount] = useState(0);
  const [revisionReason, setRevisionReason] = useState('');

  useEffect(() => {
    if (!isNew && id) {
      const budget = getBudget(id);
      if (budget) {
        setFormData({
          name: budget.name,
          startDate: format(new Date(budget.startDate), 'yyyy-MM-dd'),
          endDate: format(new Date(budget.endDate), 'yyyy-MM-dd'),
          analyticalAccountId: budget.analyticalAccountId,
          type: budget.type,
          budgetedAmount: budget.budgetedAmount,
          state: budget.state,
        });
        setBudgetDetails(budget);
        setNewBudgetedAmount(budget.budgetedAmount);
      } else {
        toast.error('Budget not found');
        navigate('/account/budgets');
      }
    }
  }, [id, isNew, getBudget, navigate]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Budget name is required');
      return false;
    }
    if (!formData.analyticalAccountId) {
      toast.error('Analytical account is required');
      return false;
    }
    if (!formData.startDate || !formData.endDate) {
      toast.error('Budget period is required');
      return false;
    }
    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      toast.error('Start date must be before end date');
      return false;
    }
    if (formData.budgetedAmount <= 0) {
      toast.error('Budgeted amount must be greater than 0');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      if (isNew) {
        const newBudget = addBudget({
          name: formData.name,
          startDate: new Date(formData.startDate),
          endDate: new Date(formData.endDate),
          analyticalAccountId: formData.analyticalAccountId,
          type: formData.type,
          budgetedAmount: formData.budgetedAmount,
          state: 'draft',
          isArchived: false,
        });
        toast.success('Budget created successfully');
        navigate(`/account/budgets/${newBudget.id}`);
      } else if (id && formData.state === 'draft') {
        updateBudget(id, {
          name: formData.name,
          startDate: new Date(formData.startDate),
          endDate: new Date(formData.endDate),
          analyticalAccountId: formData.analyticalAccountId,
          type: formData.type,
          budgetedAmount: formData.budgetedAmount,
        });
        toast.success('Budget updated successfully');
      }
    } catch {
      toast.error('Failed to save budget');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (id) {
      confirmBudget(id);
      setFormData((prev) => ({ ...prev, state: 'confirmed' }));
      toast.success('Budget confirmed');
    }
  };

  const handleRevise = () => {
    if (id && newBudgetedAmount > 0) {
      const newBudget = reviseBudget(id, newBudgetedAmount, revisionReason);
      toast.success('Budget revision created');
      setShowReviseDialog(false);
      navigate(`/account/budgets/${newBudget.id}`);
    }
  };

  const handleArchive = () => {
    if (id) {
      archiveBudget(id);
      toast.success('Budget archived');
      navigate('/account/budgets');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const pieData = budgetDetails
    ? [
        { name: 'Achieved', value: budgetDetails.achievedAmount, color: 'hsl(var(--chart-3))' },
        { name: 'Remaining', value: Math.max(0, budgetDetails.remainingBalance), color: 'hsl(var(--chart-1))' },
      ]
    : [];

  const isReadOnly = formData.state !== 'draft';

  return (
    <MainLayout>
      <PageHeader
        title={isNew ? 'New Budget' : formData.name || 'Budget'}
        subtitle={isNew ? 'Create a new budget allocation' : 'View and manage budget'}
      >
        {budgetDetails && (
          <StatusBadge status={budgetDetails.state} className="ml-4" />
        )}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Budget Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Budget Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  placeholder="Enter budget name"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: BudgetType) =>
                      setFormData((prev) => ({ ...prev, type: value }))
                    }
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="analyticalAccountId">Analytical Account *</Label>
                  <Select
                    value={formData.analyticalAccountId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, analyticalAccountId: value }))
                    }
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select cost center" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts
                        .filter((a) => !a.isArchived)
                        .map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.code} - {account.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={handleChange}
                    disabled={isReadOnly}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    name="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={handleChange}
                    disabled={isReadOnly}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budgetedAmount">Budgeted Amount (₹) *</Label>
                <Input
                  id="budgetedAmount"
                  name="budgetedAmount"
                  type="number"
                  min="0"
                  value={formData.budgetedAmount}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  placeholder="0"
                />
              </div>
            </CardContent>
          </Card>

          {budgetDetails && budgetDetails.revisionHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Revision History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {budgetDetails.revisionHistory.map((revision) => (
                    <div
                      key={revision.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div>
                        <p className="font-medium">
                          {format(new Date(revision.revisionDate), 'dd MMM yyyy')}
                        </p>
                        {revision.reason && (
                          <p className="text-sm text-muted-foreground">{revision.reason}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(revision.previousAmount)} →
                        </p>
                        <p className="font-medium">{formatCurrency(revision.newAmount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {budgetDetails && !isNew && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Budget Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={60}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 text-center">
                    <span className="text-3xl font-bold">
                      {budgetDetails.achievementPercentage.toFixed(1)}%
                    </span>
                    <p className="text-sm text-muted-foreground">
                      {formData.type === 'income' ? 'Achieved' : 'Utilized'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Budgeted:</span>
                    <span className="font-medium">
                      {formatCurrency(budgetDetails.budgetedAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Achieved:</span>
                    <span className="font-medium text-chart-3">
                      {formatCurrency(budgetDetails.achievedAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-3">
                    <span className="text-muted-foreground">Remaining:</span>
                    <span className={`font-medium ${budgetDetails.remainingBalance >= 0 ? 'text-chart-1' : 'text-destructive'}`}>
                      {formatCurrency(budgetDetails.remainingBalance)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {formData.state === 'archived' && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="pt-6">
                <p className="text-sm text-destructive">
                  This budget is archived and cannot be edited.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {formData.state !== 'archived' && (
        <div className="mt-6">
          <FormActions
            mode={isNew ? 'create' : 'edit'}
            status={formData.state}
            onSave={formData.state === 'draft' ? handleSave : undefined}
            onConfirm={formData.state === 'draft' && !isNew ? handleConfirm : undefined}
            onRevise={formData.state === 'confirmed' ? () => setShowReviseDialog(true) : undefined}
            onArchive={!isNew ? handleArchive : undefined}
            isLoading={isLoading}
            canConfirm={formData.state === 'draft'}
            canRevise={formData.state === 'confirmed'}
          />
        </div>
      )}

      {/* Revise Dialog */}
      <Dialog open={showReviseDialog} onOpenChange={setShowReviseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revise Budget</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="newAmount">New Budgeted Amount (₹)</Label>
              <Input
                id="newAmount"
                type="number"
                min="0"
                value={newBudgetedAmount}
                onChange={(e) => setNewBudgetedAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Revision</Label>
              <Input
                id="reason"
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowReviseDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleRevise}>Create Revision</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
