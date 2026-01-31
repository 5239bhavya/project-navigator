import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { useAnalyticalAccountStore } from '@/stores';
import { format } from 'date-fns';

export default function AnalyticalAccountList() {
  const navigate = useNavigate();
  const { accounts } = useAnalyticalAccountStore();
  const [showArchived, setShowArchived] = useState(false);

  const filteredAccounts = accounts.filter((a) =>
    showArchived ? a.isArchived : !a.isArchived
  );

  const columns = [
    {
      key: 'code',
      label: 'Code',
      sortable: true,
      width: '120px',
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
    },
    {
      key: 'description',
      label: 'Description',
      render: (value: unknown) => (value as string) || '-',
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (value: unknown) => format(new Date(value as Date), 'dd MMM yyyy'),
    },
  ];

  return (
    <MainLayout>
      <PageHeader
        title="Analytical Accounts"
        subtitle="Cost centers for tracking profitability"
        showNew
        showArchived
        isShowingArchived={showArchived}
        onNew={() => navigate('/account/analytical-accounts/new')}
        onShowArchived={() => setShowArchived(!showArchived)}
      />

      <DataTable
        columns={columns}
        data={filteredAccounts}
        onRowClick={(row) => navigate(`/account/analytical-accounts/${row.id}`)}
        searchPlaceholder="Search analytical accounts..."
        emptyMessage={showArchived ? 'No archived accounts' : 'No analytical accounts found'}
        getRowId={(row) => row.id}
        isArchived={(row) => row.isArchived}
      />
    </MainLayout>
  );
}
