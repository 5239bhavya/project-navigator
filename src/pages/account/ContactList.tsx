import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { useContactStore, useTagStore } from '@/stores';
import { Contact } from '@/types';
import { format } from 'date-fns';

export default function ContactList() {
  const navigate = useNavigate();
  const { contacts } = useContactStore();
  const [showArchived, setShowArchived] = useState(false);

  const filteredContacts = contacts.filter((c) =>
    showArchived ? c.isArchived : !c.isArchived
  );

  const columns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
    },
    {
      key: 'phone',
      label: 'Phone',
    },
    {
      key: 'city',
      label: 'City',
      sortable: true,
    },
    {
      key: 'tags',
      label: 'Tags',
      render: (value: unknown) => {
        const tags = value as Contact['tags'];
        return (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        );
      },
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
        title="Contacts"
        subtitle="Manage customers and vendors"
        showNew
        showArchived
        isShowingArchived={showArchived}
        onNew={() => navigate('/account/contacts/new')}
        onShowArchived={() => setShowArchived(!showArchived)}
      />

      <DataTable
        columns={columns}
        data={filteredContacts}
        onRowClick={(row) => navigate(`/account/contacts/${row.id}`)}
        searchPlaceholder="Search contacts..."
        emptyMessage={showArchived ? 'No archived contacts' : 'No contacts found'}
        getRowId={(row) => row.id}
        isArchived={(row) => row.isArchived}
      />
    </MainLayout>
  );
}
