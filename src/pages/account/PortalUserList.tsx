import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  User,
  Link,
  Unlink,
  Search,
  ShoppingCart,
  FileText,
  Receipt,
  CreditCard,
  Eye,
  Settings,
  Users,
} from 'lucide-react';

interface PortalUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'portal';
  portal_contact_id: string | null;
  created_at: string;
  contact?: {
    id: string;
    name: string;
    email: string | null;
  } | null;
}

interface Contact {
  id: string;
  name: string;
  email: string | null;
}

export default function PortalUserList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [portalUsers, setPortalUsers] = useState<PortalUser[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<PortalUser | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [isLinking, setIsLinking] = useState(false);

  const fetchPortalUsers = async () => {
    setIsLoading(true);
    try {
      // Fetch portal users with their linked contacts
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          email,
          role,
          portal_contact_id,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch linked contact details for each user
      const usersWithContacts: PortalUser[] = [];
      for (const profile of profiles || []) {
        let contact = null;
        if (profile.portal_contact_id) {
          const { data: contactData } = await supabase
            .from('contacts')
            .select('id, name, email')
            .eq('id', profile.portal_contact_id)
            .single();
          contact = contactData;
        }
        usersWithContacts.push({
          ...profile,
          contact,
        });
      }

      setPortalUsers(usersWithContacts);
    } catch (error) {
      console.error('Error fetching portal users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load portal users',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, email')
        .eq('is_archived', false)
        .order('name');

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  useEffect(() => {
    fetchPortalUsers();
    fetchContacts();
  }, []);

  const handleLinkContact = async () => {
    if (!selectedUser) return;

    setIsLinking(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ portal_contact_id: selectedContactId || null })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: selectedContactId
          ? 'Portal user linked to contact successfully'
          : 'Portal user unlinked from contact',
      });

      setLinkDialogOpen(false);
      setSelectedUser(null);
      setSelectedContactId('');
      fetchPortalUsers();
    } catch (error) {
      console.error('Error updating portal user:', error);
      toast({
        title: 'Error',
        description: 'Failed to update portal user',
        variant: 'destructive',
      });
    } finally {
      setIsLinking(false);
    }
  };

  const openLinkDialog = (user: PortalUser) => {
    setSelectedUser(user);
    setSelectedContactId(user.portal_contact_id || '');
    setLinkDialogOpen(true);
  };

  const filteredUsers = portalUsers.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.contact?.name.toLowerCase().includes(query) ||
      false
    );
  });

  const portalOnlyUsers = filteredUsers.filter((u) => u.role === 'portal');
  const adminUsers = filteredUsers.filter((u) => u.role === 'admin');

  return (
    <MainLayout>
      <PageHeader
        title="Portal Users"
        subtitle="Manage portal users and their linked contacts"
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portalUsers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Portal Users
            </CardTitle>
            <User className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {portalUsers.filter((u) => u.role === 'portal').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Linked Users
            </CardTitle>
            <Link className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {portalUsers.filter((u) => u.portal_contact_id).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unlinked Users
            </CardTitle>
            <Unlink className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {portalUsers.filter((u) => !u.portal_contact_id && u.role === 'portal').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users or contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Portal Users Table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Portal Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Linked Contact</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {portalOnlyUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No portal users found
                    </TableCell>
                  </TableRow>
                ) : (
                  portalOnlyUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.contact ? (
                          <div className="flex items-center gap-2">
                            <Link className="h-4 w-4 text-chart-3" />
                            <div>
                              <p className="font-medium">{user.contact.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {user.contact.email || 'No email'}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            <Unlink className="mr-1 h-3 w-3" />
                            Not linked
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(user.created_at), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openLinkDialog(user)}
                          >
                            <Settings className="mr-1 h-3 w-3" />
                            {user.contact ? 'Change' : 'Link'}
                          </Button>
                          {user.contact && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                navigate(`/account/portal-users/${user.id}`)
                              }
                            >
                              <Eye className="mr-1 h-3 w-3" />
                              View
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Admin Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Admin Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No admin users found
                  </TableCell>
                </TableRow>
              ) : (
                adminUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-chart-1/10 text-chart-1">
                          <Settings className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-chart-1/10 text-chart-1 hover:bg-chart-1/20">
                        Admin
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(user.created_at), 'dd MMM yyyy')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Link Contact Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Portal User to Contact</DialogTitle>
            <DialogDescription>
              Select a contact to link with {selectedUser?.name}. This determines
              which transactions the portal user can see.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select
              value={selectedContactId}
              onValueChange={setSelectedContactId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a contact..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">
                  <span className="text-muted-foreground">No contact (unlink)</span>
                </SelectItem>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.name} {contact.email && `(${contact.email})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleLinkContact} disabled={isLinking}>
              {isLinking ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
