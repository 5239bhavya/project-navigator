import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useBudgetStore, useAnalyticalAccountStore } from '@/stores';
import { Budget } from '@/types';
import { format } from 'date-fns';

export default function BudgetList() {
  const navigate = useNavigate();
  const { budgets } = useBudgetStore();
  const { getAccount } = useAnalyticalAccountStore();
  const [showArchived, setShowArchived] = useState(false);

  const filteredBudgets = budgets.filter((b) =>
    showArchived ? b.state === 'archived' : b.state !== 'archived'
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const columns = [
    {
      key: 'name',
      label: 'Budget Name',
      sortable: true,
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (value: unknown) => <StatusBadge status={value as 'income' | 'expense'} />,
    },
    {
      key: 'analyticalAccountId',
      label: 'Cost Center',
      render: (value: unknown) => {
        const account = getAccount(value as string);
        return account?.name || '-';
      },
    },
    {
      key: 'startDate',
      label: 'Period',
      render: (value: unknown, row: Budget) => (
        `${format(new Date(row.startDate), 'dd MMM')} - ${format(new Date(row.endDate), 'dd MMM yyyy')}`
      ),
    },
    {
      key: 'budgetedAmount',
      label: 'Budgeted',
      sortable: true,
      render: (value: unknown) => formatCurrency(value as number),
    },
    {
      key: 'achievedAmount',
      label: 'Achieved',
      sortable: true,
      render: (value: unknown) => formatCurrency(value as number),
    },
    {
      key: 'achievementPercentage',
      label: 'Progress',
      sortable: true,
      render: (value: unknown) => {
        const percentage = value as number;
        return (
          <div className="flex items-center gap-2">
            <div className="h-2 w-16 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            <span className="text-sm">{percentage.toFixed(1)}%</span>
          </div>
        );
      },
    },
    {
      key: 'state',
      label: 'Status',
      sortable: true,
      render: (value: unknown) => <StatusBadge status={value as Budget['state']} />,
    },
  ];

  return (
    <MainLayout>
      <PageHeader
        title="Budgets"
        subtitle="Manage budget allocations and track progress"
        showNew
        showArchived
        isShowingArchived={showArchived}
        onNew={() => navigate('/account/budgets/new')}
        onShowArchived={() => setShowArchived(!showArchived)}
      />

      <DataTable
        columns={columns}
        data={filteredBudgets}
        onRowClick={(row) => navigate(`/account/budgets/${row.id}`)}
        searchPlaceholder="Search budgets..."
        emptyMessage={showArchived ? 'No archived budgets' : 'No budgets found'}
        getRowId={(row) => row.id}
        isArchived={(row) => row.state === 'archived'}
      />
    </MainLayout>
  );
}
