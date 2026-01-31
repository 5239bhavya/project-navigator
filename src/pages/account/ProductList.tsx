import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { useProductStore, useCategoryStore } from '@/stores';
import { format } from 'date-fns';

export default function ProductList() {
  const navigate = useNavigate();
  const { products } = useProductStore();
  const { categories, getCategory } = useCategoryStore();
  const [showArchived, setShowArchived] = useState(false);

  const filteredProducts = products.filter((p) =>
    showArchived ? p.isArchived : !p.isArchived
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
      label: 'Product Name',
      sortable: true,
    },
    {
      key: 'categoryId',
      label: 'Category',
      sortable: true,
      render: (value: unknown) => {
        const category = getCategory(value as string);
        return category?.name || '-';
      },
    },
    {
      key: 'salesPrice',
      label: 'Sales Price',
      sortable: true,
      render: (value: unknown) => formatCurrency(value as number),
    },
    {
      key: 'purchasePrice',
      label: 'Purchase Price',
      sortable: true,
      render: (value: unknown) => formatCurrency(value as number),
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
        title="Products"
        subtitle="Manage product catalog"
        showNew
        showArchived
        isShowingArchived={showArchived}
        onNew={() => navigate('/account/products/new')}
        onShowArchived={() => setShowArchived(!showArchived)}
      />

      <DataTable
        columns={columns}
        data={filteredProducts}
        onRowClick={(row) => navigate(`/account/products/${row.id}`)}
        searchPlaceholder="Search products..."
        emptyMessage={showArchived ? 'No archived products' : 'No products found'}
        getRowId={(row) => row.id}
        isArchived={(row) => row.isArchived}
      />
    </MainLayout>
  );
}
