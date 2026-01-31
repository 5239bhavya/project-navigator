import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { FormActions } from '@/components/common/FormActions';
import { useContactStore, useTagStore } from '@/stores';
import { Contact, Tag } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { X, Plus } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export default function ContactForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = id === 'new';
  const { contacts, addContact, updateContact, archiveContact, getContact } = useContactStore();
  const { tags, addTag } = useTagStore();

  const [formData, setFormData] = useState<Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    imageUrl: '',
    tags: [],
    isArchived: false,
  });

  const [newTagName, setNewTagName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isNew && id) {
      const contact = getContact(id);
      if (contact) {
        setFormData({
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          street: contact.street,
          city: contact.city,
          state: contact.state,
          country: contact.country,
          pincode: contact.pincode,
          imageUrl: contact.imageUrl,
          tags: contact.tags,
          isArchived: contact.isArchived,
        });
      } else {
        toast.error('Contact not found');
        navigate('/account/contacts');
      }
    }
  }, [id, isNew, getContact, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleAddTag = (tag: Tag) => {
    if (!formData.tags.find((t) => t.id === tag.id)) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tag],
      }));
    }
  };

  const handleRemoveTag = (tagId: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t.id !== tagId),
    }));
  };

  const handleCreateTag = () => {
    if (!newTagName.trim()) return;
    
    const colors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];
    const newTag = addTag({
      name: newTagName.trim(),
      color: colors[Math.floor(Math.random() * colors.length)],
    });
    handleAddTag(newTag);
    setNewTagName('');
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Contact name is required');
      return false;
    }
    if (!formData.email.trim()) {
      toast.error('Email is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Invalid email address');
      return false;
    }
    // Check for duplicate email
    const existingContact = contacts.find(
      (c) => c.email.toLowerCase() === formData.email.toLowerCase() && c.id !== id
    );
    if (existingContact) {
      toast.error('A contact with this email already exists');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      if (isNew) {
        const newContact = addContact(formData);
        toast.success('Contact created successfully');
        navigate(`/account/contacts/${newContact.id}`);
      } else if (id) {
        updateContact(id, formData);
        toast.success('Contact updated successfully');
      }
    } catch {
      toast.error('Failed to save contact');
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = () => {
    if (id) {
      archiveContact(id);
      toast.success('Contact archived');
      navigate('/account/contacts');
    }
  };

  const availableTags = tags.filter(
    (tag) => !formData.tags.find((t) => t.id === tag.id)
  );

  return (
    <MainLayout>
      <PageHeader
        title={isNew ? 'New Contact' : formData.name || 'Contact'}
        subtitle={isNew ? 'Create a new contact' : 'View and edit contact details'}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Contact Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={formData.isArchived}
                    placeholder="Enter contact name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={formData.isArchived}
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={formData.isArchived}
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="street">Street</Label>
                <Input
                  id="street"
                  name="street"
                  value={formData.street}
                  onChange={handleChange}
                  disabled={formData.isArchived}
                  placeholder="Street address"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    disabled={formData.isArchived}
                    placeholder="City"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    disabled={formData.isArchived}
                    placeholder="State"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    disabled={formData.isArchived}
                    placeholder="Country"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    disabled={formData.isArchived}
                    placeholder="Pincode"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="gap-1"
                    style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                  >
                    {tag.name}
                    {!formData.isArchived && (
                      <button
                        onClick={() => handleRemoveTag(tag.id)}
                        className="ml-1 hover:opacity-70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))}
                {formData.tags.length === 0 && (
                  <p className="text-sm text-muted-foreground">No tags assigned</p>
                )}
              </div>

              {!formData.isArchived && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Tag
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        {availableTags.map((tag) => (
                          <Button
                            key={tag.id}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => handleAddTag(tag)}
                          >
                            <span
                              className="mr-2 h-3 w-3 rounded-full"
                              style={{ backgroundColor: tag.color }}
                            />
                            {tag.name}
                          </Button>
                        ))}
                      </div>
                      <div className="border-t pt-4">
                        <div className="flex gap-2">
                          <Input
                            placeholder="New tag name"
                            value={newTagName}
                            onChange={(e) => setNewTagName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                          />
                          <Button size="sm" onClick={handleCreateTag}>
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </CardContent>
          </Card>

          {formData.isArchived && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="pt-6">
                <p className="text-sm text-destructive">
                  This contact is archived and cannot be edited.
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
