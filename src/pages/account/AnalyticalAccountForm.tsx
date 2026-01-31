import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { FormActions } from '@/components/common/FormActions';
import { useAnalyticalAccountStore } from '@/stores';
import { AnalyticalAccount } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function AnalyticalAccountForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = id === 'new';
  const { accounts, addAccount, updateAccount, archiveAccount, getAccount } = useAnalyticalAccountStore();

  const [formData, setFormData] = useState<Omit<AnalyticalAccount, 'id' | 'createdAt'>>({
    name: '',
    code: '',
    description: '',
    isArchived: false,
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isNew && id) {
      const account = getAccount(id);
      if (account) {
        setFormData({
          name: account.name,
          code: account.code,
          description: account.description || '',
          isArchived: account.isArchived,
        });
      } else {
        toast.error('Analytical account not found');
        navigate('/account/analytical-accounts');
      }
    } else if (isNew) {
      // Generate next code
      const maxCode = accounts
        .map((a) => parseInt(a.code.replace('CC-', ''), 10))
        .filter((n) => !isNaN(n))
        .reduce((max, n) => Math.max(max, n), 0);
      setFormData((prev) => ({
        ...prev,
        code: `CC-${String(maxCode + 1).padStart(3, '0')}`,
      }));
    }
  }, [id, isNew, getAccount, navigate, accounts]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Account name is required');
      return false;
    }
    if (!formData.code.trim()) {
      toast.error('Account code is required');
      return false;
    }
    // Check for duplicate code
    const existingAccount = accounts.find(
      (a) => a.code.toLowerCase() === formData.code.toLowerCase() && a.id !== id
    );
    if (existingAccount) {
      toast.error('An account with this code already exists');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      if (isNew) {
        const newAccount = addAccount(formData);
        toast.success('Analytical account created successfully');
        navigate(`/account/analytical-accounts/${newAccount.id}`);
      } else if (id) {
        updateAccount(id, formData);
        toast.success('Analytical account updated successfully');
      }
    } catch {
      toast.error('Failed to save analytical account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = () => {
    if (id) {
      archiveAccount(id);
      toast.success('Analytical account archived');
      navigate('/account/analytical-accounts');
    }
  };

  return (
    <MainLayout>
      <PageHeader
        title={isNew ? 'New Analytical Account' : formData.name || 'Analytical Account'}
        subtitle={isNew ? 'Create a new cost center' : 'View and edit cost center details'}
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">Account Code *</Label>
              <Input
                id="code"
                name="code"
                value={formData.code}
                onChange={handleChange}
                disabled={formData.isArchived}
                placeholder="CC-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Account Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={formData.isArchived}
                placeholder="Enter account name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              disabled={formData.isArchived}
              placeholder="Describe the purpose of this cost center"
              rows={3}
            />
          </div>

          {formData.isArchived && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
              <p className="text-sm text-destructive">
                This analytical account is archived and cannot be edited.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {!formData.isArchived && (
        <div className="mt-6 max-w-2xl">
          <FormActions
            mode={isNew ? 'create' : 'edit'}
            onSave={handleSave}
            onArchive={!isNew ? handleArchive : undefined}
            isLoading={isLoading}
            canConfirm={false}
            canRevise={false}
          />
        </div>
      )}
    </MainLayout>
  );
}
