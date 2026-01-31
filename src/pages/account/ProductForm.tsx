import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { FormActions } from '@/components/common/FormActions';
import { useProductStore, useCategoryStore } from '@/stores';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
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
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = id === 'new';
  const { products, addProduct, updateProduct, archiveProduct, getProduct } = useProductStore();
  const { categories, addCategory } = useCategoryStore();

  const [formData, setFormData] = useState<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    categoryId: '',
    salesPrice: 0,
    purchasePrice: 0,
    imageUrl: '',
    isArchived: false,
  });

  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isNew && id) {
      const product = getProduct(id);
      if (product) {
        setFormData({
          name: product.name,
          categoryId: product.categoryId,
          salesPrice: product.salesPrice,
          purchasePrice: product.purchasePrice,
          imageUrl: product.imageUrl,
          isArchived: product.isArchived,
        });
      } else {
        toast.error('Product not found');
        navigate('/account/products');
      }
    }
  }, [id, isNew, getProduct, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;
    
    const newCategory = addCategory({
      name: newCategoryName.trim(),
      description: '',
      isArchived: false,
    });
    setFormData((prev) => ({ ...prev, categoryId: newCategory.id }));
    setNewCategoryName('');
    setIsCategoryDialogOpen(false);
    toast.success('Category created');
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return false;
    }
    if (!formData.categoryId) {
      toast.error('Category is required');
      return false;
    }
    if (formData.salesPrice < 0) {
      toast.error('Sales price cannot be negative');
      return false;
    }
    if (formData.purchasePrice < 0) {
      toast.error('Purchase price cannot be negative');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      if (isNew) {
        const newProduct = addProduct(formData);
        toast.success('Product created successfully');
        navigate(`/account/products/${newProduct.id}`);
      } else if (id) {
        updateProduct(id, formData);
        toast.success('Product updated successfully');
      }
    } catch {
      toast.error('Failed to save product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = () => {
    if (id) {
      archiveProduct(id);
      toast.success('Product archived');
      navigate('/account/products');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const margin = formData.salesPrice - formData.purchasePrice;
  const marginPercentage = formData.purchasePrice > 0
    ? ((margin / formData.purchasePrice) * 100).toFixed(1)
    : 0;

  return (
    <MainLayout>
      <PageHeader
        title={isNew ? 'New Product' : formData.name || 'Product'}
        subtitle={isNew ? 'Create a new product' : 'View and edit product details'}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={formData.isArchived}
                  placeholder="Enter product name"
                />
              </div>

              <div className="space-y-2">
                <Label>Category *</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, categoryId: value }))
                    }
                    disabled={formData.isArchived}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter((c) => !c.isArchived)
                        .map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  {!formData.isArchived && (
                    <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create Category</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <Label htmlFor="categoryName">Category Name</Label>
                            <Input
                              id="categoryName"
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              placeholder="Enter category name"
                            />
                          </div>
                          <Button onClick={handleCreateCategory} className="w-full">
                            Create Category
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="salesPrice">Sales Price (₹) *</Label>
                  <Input
                    id="salesPrice"
                    name="salesPrice"
                    type="number"
                    min="0"
                    value={formData.salesPrice}
                    onChange={handleChange}
                    disabled={formData.isArchived}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">Purchase Price (₹) *</Label>
                  <Input
                    id="purchasePrice"
                    name="purchasePrice"
                    type="number"
                    min="0"
                    value={formData.purchasePrice}
                    onChange={handleChange}
                    disabled={formData.isArchived}
                    placeholder="0"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profit Margin</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Margin Amount:</span>
                  <span className={`font-medium ${margin >= 0 ? 'text-chart-3' : 'text-destructive'}`}>
                    {formatCurrency(margin)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Margin %:</span>
                  <span className={`font-medium ${margin >= 0 ? 'text-chart-3' : 'text-destructive'}`}>
                    {marginPercentage}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {formData.isArchived && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="pt-6">
                <p className="text-sm text-destructive">
                  This product is archived and cannot be edited.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {!formData.isArchived && (
        <div className="mt-6">
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
