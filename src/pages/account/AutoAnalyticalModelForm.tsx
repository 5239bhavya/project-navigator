import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { FormActions } from '@/components/common/FormActions';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { calculateModelPriority } from '@/services/autoAnalyticalEngine';
import { AlertCircle, Info, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAISuggestion } from '@/hooks/useAISuggestion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { confidenceVariants } from '@/types/aiAnalyticalSuggestion';

interface FormData {
  name: string;
  partnerTagId: string;
  partnerId: string;
  productCategoryId: string;
  productId: string;
  analyticalAccountId: string;
  budgetId: string;
  status: 'draft' | 'confirmed' | 'archived';
  isArchived: boolean;
}

interface SelectOption {
  id: string;
  name: string;
  code?: string;
  color?: string;
}

export default function AutoAnalyticalModelForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = id === 'new';

  const [formData, setFormData] = useState<FormData>({
    name: '',
    partnerTagId: '',
    partnerId: '',
    productCategoryId: '',
    productId: '',
    analyticalAccountId: '',
    budgetId: '',
    status: 'draft',
    isArchived: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(!isNew);
  const [aiApplied, setAiApplied] = useState(false);

  // Options for select dropdowns
  const [tags, setTags] = useState<SelectOption[]>([]);
  const [partners, setPartners] = useState<SelectOption[]>([]);
  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [products, setProducts] = useState<SelectOption[]>([]);
  const [analyticalAccounts, setAnalyticalAccounts] = useState<SelectOption[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);

  // Track previous input to avoid redundant calls
  const prevInputRef = useRef<string>('');

  // AI Suggestion hook with auto-apply
  const {
    suggestion,
    isLoading: aiLoading,
    error: aiError,
    getSuggestion,
    clearSuggestion,
  } = useAISuggestion({
    onSuggestion: (result) => {
      // Auto-apply AI suggestion for new models
      if (isNew && result) {
        setFormData(prev => ({
          ...prev,
          name: result.modelName,
          analyticalAccountId: result.analyticalAccountId,
        }));
        setAiApplied(true);
      }
    },
  });

  // Auto-trigger AI suggestion when rule conditions change (for new models only)
  useEffect(() => {
    if (!isNew || formData.isArchived) return;

    const hasInput = formData.partnerTagId || formData.partnerId || formData.productCategoryId || formData.productId;
    const inputKey = JSON.stringify({
      partnerTagId: formData.partnerTagId,
      partnerId: formData.partnerId,
      productCategoryId: formData.productCategoryId,
      productId: formData.productId,
    });

    // Only trigger if input changed and has at least one value
    if (hasInput && inputKey !== prevInputRef.current) {
      prevInputRef.current = inputKey;
      setAiApplied(false);
      getSuggestion({
        partnerTagId: formData.partnerTagId || undefined,
        partnerId: formData.partnerId || undefined,
        productCategoryId: formData.productCategoryId || undefined,
        productId: formData.productId || undefined,
      });
    } else if (!hasInput) {
      // Clear if no input
      prevInputRef.current = '';
      clearSuggestion();
      setFormData(prev => ({
        ...prev,
        name: '',
        analyticalAccountId: '',
      }));
      setAiApplied(false);
    }
  }, [isNew, formData.partnerTagId, formData.partnerId, formData.productCategoryId, formData.productId, formData.isArchived, getSuggestion, clearSuggestion]);

  // Fetch all lookup data
  useEffect(() => {
    const fetchLookups = async () => {
      const [tagsRes, partnersRes, categoriesRes, productsRes, accountsRes] = await Promise.all([
        supabase.from('tags').select('id, name, color'),
        supabase.from('contacts').select('id, name').eq('is_archived', false),
        supabase.from('product_categories').select('id, name').eq('is_archived', false),
        supabase.from('products').select('id, name').eq('is_archived', false),
        supabase.from('analytical_accounts').select('id, name, code').eq('is_archived', false),
      ]);

      setTags(tagsRes.data || []);
      setPartners(partnersRes.data || []);
      setCategories(categoriesRes.data || []);
      setProducts(productsRes.data || []);
      setAnalyticalAccounts(accountsRes.data || []);

      // Fetch budgets separately because they might not be in supabase yet (mocked in store)
      // For now, let's try to fetch if table exists, else empty
      const { data: budgetsData } = await supabase.from('budgets').select('id, name, analytical_account_id, remaining_balance').eq('is_archived', false);
      setBudgets(budgetsData || []);
    };

    fetchLookups();
  }, []);

  // Fetch existing model if editing
  useEffect(() => {
    if (!isNew && id) {
      const fetchModel = async () => {
        setIsFetching(true);
        const { data, error } = await supabase
          .from('auto_analytical_models')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !data) {
          toast.error('Model not found');
          navigate('/account/auto-analytical-models');
        } else {
          setFormData({
            name: data.name,
            partnerTagId: data.partner_tag_id || '',
            partnerId: data.partner_id || '',
            productCategoryId: data.product_category_id || '',
            productId: data.product_id || '',
            analyticalAccountId: data.analytical_account_id,
            budgetId: data.budget_id || '',
            status: data.status as 'draft' | 'confirmed' | 'archived',
            isArchived: data.is_archived,
          });
        }
        setIsFetching(false);
      };

      fetchModel();
    }
  }, [id, isNew, navigate]);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Calculate specificity for display
  const priority = calculateModelPriority({
    partnerTagId: formData.partnerTagId || null,
    partnerId: formData.partnerId || null,
    productCategoryId: formData.productCategoryId || null,
    productId: formData.productId || null,
  });

  const getSpecificityLabel = () => {
    if (priority >= 3) return { label: 'Very Specific', variant: 'default' as const };
    if (priority === 2) return { label: 'Specific', variant: 'secondary' as const };
    if (priority === 1) return { label: 'Generic', variant: 'outline' as const };
    return { label: 'No Rules', variant: 'destructive' as const };
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Model name is required - please select at least one rule condition');
      return false;
    }
    if (!formData.analyticalAccountId) {
      toast.error('Analytics to Apply is required - please select at least one rule condition');
      return false;
    }
    if (priority === 0) {
      toast.error('At least one rule condition must be selected');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const modelData = {
        name: formData.name,
        partner_tag_id: formData.partnerTagId || null,
        partner_id: formData.partnerId || null,
        product_category_id: formData.productCategoryId || null,
        product_id: formData.productId || null,
        analytical_account_id: formData.analyticalAccountId,
        budget_id: formData.budgetId || null,
        priority,
        status: formData.status,
        is_archived: formData.status === 'archived',
      };

      if (isNew) {
        const { data, error } = await supabase
          .from('auto_analytical_models')
          .insert(modelData)
          .select()
          .single();

        if (error) throw error;
        toast.success('Auto analytical model created successfully');
        navigate(`/account/auto-analytical-models/${data.id}`);
      } else if (id) {
        const { error } = await supabase
          .from('auto_analytical_models')
          .update(modelData)
          .eq('id', id);

        if (error) throw error;
        toast.success('Auto analytical model updated successfully');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to save auto analytical model');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('auto_analytical_models')
        .update({ status: 'confirmed' })
        .eq('id', id);

      if (error) throw error;
      toast.success('Model confirmed and activated');
      setFormData(prev => ({ ...prev, status: 'confirmed' }));
    } catch (error) {
      console.error(error);
      toast.error('Failed to confirm model');
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('auto_analytical_models')
        .update({ status: 'archived', is_archived: true })
        .eq('id', id);

      if (error) throw error;
      toast.success('Model archived successfully');
      setFormData(prev => ({ ...prev, status: 'archived', isArchived: true }));
      navigate('/account/auto-analytical-models');
    } catch (error) {
      console.error(error);
      toast.error('Failed to archive model');
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

  const { label: specificityLabel, variant: specificityVariant } = getSpecificityLabel();
  const selectedAccount = analyticalAccounts.find(a => a.id === formData.analyticalAccountId);
  const confidenceInfo = suggestion ? confidenceVariants[suggestion.confidence] : null;

  return (
    <MainLayout>
      <PageHeader
        title={isNew ? 'New Auto Analytical Model' : formData.name || 'Auto Analytical Model'}
        subtitle={isNew ? 'AI-driven automatic analytical distribution rule' : 'View and edit rule configuration'}
      />

      {formData.status === 'archived' && (
        <Alert variant="destructive" className="mb-4 max-w-4xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This model is archived and will not be applied to transactions.
          </AlertDescription>
        </Alert>
      )}

      {formData.status === 'confirmed' && (
        <Alert className="mb-4 max-w-4xl border-primary/50 bg-primary/5">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <AlertDescription className="text-primary font-medium">
            This model is Confirmed and Active. It cannot be edited. To make changes, please archive this rule and create a new one.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 max-w-4xl">
        {/* Rule Conditions Card - NOW FIRST */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Rule Conditions</CardTitle>
              {isNew && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI-Powered
                </Badge>
              )}
            </div>
            <CardDescription>
              {isNew
                ? 'Select the matching criteria. AI will automatically determine the best analytics and generate a model name.'
                : 'Configure optional matching criteria. At least one field must be selected.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {isNew
                  ? 'Just select your criteria below - AI will handle the rest! All selected fields must match for the rule to apply.'
                  : 'All selected fields must match for this rule to apply. Empty fields are ignored.'}
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Partner Tag */}
              <div className="space-y-2">
                <Label htmlFor="partnerTagId">Partner Tag</Label>
                <Select
                  value={formData.partnerTagId}
                  onValueChange={(value) => handleChange('partnerTagId', value === 'none' ? '' : value)}
                  disabled={formData.status !== 'draft'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Any tag</SelectItem>
                    {tags.map((tag) => (
                      <SelectItem key={tag.id} value={tag.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          {tag.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Partner */}
              <div className="space-y-2">
                <Label htmlFor="partnerId">Partner</Label>
                <Select
                  value={formData.partnerId}
                  onValueChange={(value) => handleChange('partnerId', value === 'none' ? '' : value)}
                  disabled={formData.status !== 'draft'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any partner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Any partner</SelectItem>
                    {partners.map((partner) => (
                      <SelectItem key={partner.id} value={partner.id}>
                        {partner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Product Category */}
              <div className="space-y-2">
                <Label htmlFor="productCategoryId">Product Category</Label>
                <Select
                  value={formData.productCategoryId}
                  onValueChange={(value) => handleChange('productCategoryId', value === 'none' ? '' : value)}
                  disabled={formData.status !== 'draft'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Any category</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Product */}
              <div className="space-y-2">
                <Label htmlFor="productId">Product</Label>
                <Select
                  value={formData.productId}
                  onValueChange={(value) => handleChange('productId', value === 'none' ? '' : value)}
                  disabled={formData.status !== 'draft'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Any product</SelectItem>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Specificity Indicator */}
            <div className="flex items-center gap-2 pt-2">
              <span className="text-sm text-muted-foreground">Rule Specificity:</span>
              <Badge variant={specificityVariant}>{specificityLabel}</Badge>
              <span className="text-sm text-muted-foreground">({priority} field{priority !== 1 ? 's' : ''} configured)</span>
            </div>
          </CardContent>
        </Card>

        {/* AI Generated Model Info Card */}
        < Card >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle>AI-Generated Configuration</CardTitle>
                {isNew && aiLoading && (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
                {isNew && aiApplied && suggestion && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant={confidenceInfo?.variant || 'outline'} className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {confidenceInfo?.label || 'AI Generated'}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p className="font-medium mb-1">Why this suggestion?</p>
                        <p className="text-sm">{suggestion.reason}</p>
                        {suggestion.matchedPatterns.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground">Matched patterns:</p>
                            <ul className="text-xs list-disc list-inside">
                              {suggestion.matchedPatterns.map((p, i) => (
                                <li key={i}>{p}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
            <CardDescription>
              {isNew
                ? 'These fields are automatically determined by AI based on your selected criteria above.'
                : 'The rule name and analytical account assignment.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* AI Error Display */}
            {aiError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{aiError}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Model Name
                  {isNew && <span className="text-xs text-muted-foreground ml-2">(AI-Generated)</span>}
                </Label>
                <div className="relative">
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    disabled={formData.isArchived || (isNew && aiLoading)}
                    readOnly={isNew && !formData.isArchived}
                    placeholder={aiLoading ? 'AI is generating...' : 'Select criteria above'}
                    className={isNew ? 'bg-muted/50' : ''}
                  />
                  {isNew && aiLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="analyticalAccountId">
                  Analytics to Apply
                  {isNew && <span className="text-xs text-muted-foreground ml-2">(AI-Selected)</span>}
                </Label>
                {isNew ? (
                  <div className="relative">
                    <Input
                      id="analyticalAccountDisplay"
                      value={selectedAccount ? `${selectedAccount.code} - ${selectedAccount.name}` : ''}
                      readOnly
                      disabled={formData.isArchived || aiLoading}
                      placeholder={aiLoading ? 'AI is selecting...' : 'Select criteria above'}
                      className="bg-muted/50"
                    />
                    {aiLoading && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                ) : (
                  <Select
                    value={formData.analyticalAccountId}
                    onValueChange={(value) => handleChange('analyticalAccountId', value)}
                    disabled={formData.isArchived}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select analytical account" />
                    </SelectTrigger>
                    <SelectContent>
                      {analyticalAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.code} - {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Linked Budget */}
              <div className="space-y-2">
                <Label htmlFor="budgetId">
                  Linked Budget
                  <span className="text-xs text-muted-foreground ml-2">(Optional)</span>
                </Label>
                <Select
                  value={formData.budgetId}
                  onValueChange={(value) => handleChange('budgetId', value === 'none' ? '' : value)}
                  disabled={formData.isArchived || !formData.analyticalAccountId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.analyticalAccountId ? "Select a budget" : "Select analytics first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No linked budget</SelectItem>
                    {budgets
                      .filter(b => b.analytical_account_id === formData.analyticalAccountId)
                      .map((budget) => (
                        <SelectItem key={budget.id} value={budget.id}>
                          {budget.name} (Bal: ₹{budget.remaining_balance})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* AI Reasoning Display */}
            {isNew && suggestion && aiApplied && (
              <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">AI Reasoning:</span> {suggestion.reason}
                </p>
              </div>
            )}
          </CardContent>
        </Card >

        {/* Actions */}
        < FormActions
          mode={isNew ? 'create' : 'edit'}
          status={formData.status}
          isLoading={isLoading || aiLoading
          }
          onSave={handleSave}
          onCancel={() => navigate('/account/auto-analytical-models')}
          onConfirm={!isNew && formData.status === 'draft' ? handleConfirm : undefined}
          onArchive={!isNew && formData.status !== 'archived' ? handleArchive : undefined}
          canConfirm={!isNew && formData.status === 'draft'}
          canRevise={false}
        />
      </div >
    </MainLayout >
  );
}