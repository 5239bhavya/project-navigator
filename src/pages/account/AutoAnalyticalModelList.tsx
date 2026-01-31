import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface AutoAnalyticalModel {
  id: string;
  name: string;
  partner_tag_id: string | null;
  partner_id: string | null;
  product_category_id: string | null;
  product_id: string | null;
  analytical_account_id: string;
  priority: number;
  status: 'draft' | 'confirmed' | 'archived';
  is_archived: boolean;
  created_at: string;
  analytical_account?: { name: string; code: string } | null;
  partner?: { name: string } | null;
  product?: { name: string } | null;
  product_category?: { name: string } | null;
  partner_tag?: { name: string; color: string } | null;
}

export default function AutoAnalyticalModelList() {
  const navigate = useNavigate();
  const [models, setModels] = useState<AutoAnalyticalModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    fetchModels();
  }, [showArchived]);

  const fetchModels = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('auto_analytical_models')
      .select(`
        *,
        analytical_account:analytical_accounts(name, code),
        partner:contacts(name),
        product:products(name),
        product_category:product_categories(name),
        partner_tag:tags(name, color)
      `)
      .order('status', { ascending: false })
      .order('priority', { ascending: false });

    if (error) {
      toast.error('Failed to load auto analytical models');
      console.error('SUPABASE_ERROR [AutoAnalyticalModelList]:', JSON.stringify(error, null, 2));
    } else {
      setModels(data || []);
    }
    setIsLoading(false);
  };

  const getSpecificityLabel = (priority: number) => {
    if (priority >= 3) return { label: 'Very Specific', variant: 'default' as const };
    if (priority === 2) return { label: 'Specific', variant: 'secondary' as const };
    if (priority === 1) return { label: 'Generic', variant: 'outline' as const };
    return { label: 'No Rules', variant: 'destructive' as const };
  };

  const columns = [
    {
      key: 'name',
      label: 'Model Name',
      sortable: true,
    },
    {
      key: 'analytical_account',
      label: 'Analytics to Apply',
      render: (value: unknown) => {
        const account = value as { name: string; code: string } | null;
        return account ? `${account.code} - ${account.name}` : '-';
      },
    },
    {
      key: 'priority',
      label: 'Specificity',
      render: (value: unknown) => {
        const priority = value as number;
        const { label, variant } = getSpecificityLabel(priority);
        return <Badge variant={variant}>{label}</Badge>;
      },
    },
    {
      key: 'conditions',
      label: 'Rule Conditions',
      render: (_: unknown, row: AutoAnalyticalModel) => {
        const conditions: string[] = [];
        if (row.partner_tag) conditions.push(`Tag: ${row.partner_tag.name}`);
        if (row.partner) conditions.push(`Partner: ${row.partner.name}`);
        if (row.product_category) conditions.push(`Category: ${row.product_category.name}`);
        if (row.product) conditions.push(`Product: ${row.product.name}`);
        return conditions.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {conditions.map((c, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {c}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">No conditions</span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: unknown) => {
        const status = value as any;
        return <StatusBadge status={status} />;
      },
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (value: unknown) => format(new Date(value as string), 'dd MMM yyyy'),
    },
  ];

  return (
    <MainLayout>
      <PageHeader
        title="Auto Analytical Models"
        subtitle="Automatic analytical distribution rules"
        showNew
        showArchived
        isShowingArchived={showArchived}
        onNew={() => navigate('/account/auto-analytical-models/new')}
        onShowArchived={() => setShowArchived(!showArchived)}
      />

      <DataTable
        columns={columns}
        data={models}
        onRowClick={(row) => navigate(`/account/auto-analytical-models/${row.id}`)}
        searchPlaceholder="Search models..."
        emptyMessage={showArchived ? 'No archived models' : 'No auto analytical models found'}
        getRowId={(row) => row.id}
        isArchived={(row) => row.is_archived}
      />
    </MainLayout>
  );
}
