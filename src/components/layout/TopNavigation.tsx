import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  BookOpen,
  ShoppingCart,
  TrendingUp,
  ChevronDown,
  User,
  LogOut,
  Settings,
  LayoutDashboard,
  FileText,
  Receipt,
  CreditCard,
} from 'lucide-react';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: { label: string; path: string }[];
  adminOnly?: boolean;
  portalOnly?: boolean;
}

// Admin navigation items
const adminNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    icon: <LayoutDashboard className="h-4 w-4" />,
    path: '/dashboard',
    adminOnly: true,
  },
  {
    label: 'Account',
    icon: <BookOpen className="h-4 w-4" />,
    adminOnly: true,
    children: [
      { label: 'Contacts', path: '/account/contacts' },
      { label: 'Products', path: '/account/products' },
      { label: 'Portal Users', path: '/account/portal-users' },
      { label: 'Analytical Accounts', path: '/account/analytical-accounts' },
      { label: 'Auto Analytical Models', path: '/account/auto-analytical-models' },
      { label: 'Budgets', path: '/account/budgets' },
    ],
  },
  {
    label: 'Purchase',
    icon: <ShoppingCart className="h-4 w-4" />,
    adminOnly: true,
    children: [
      { label: 'Purchase Orders', path: '/purchase/orders' },
      { label: 'Vendor Bills', path: '/purchase/bills' },
      { label: 'Bill Payments', path: '/purchase/payments' },
    ],
  },
  {
    label: 'Sale',
    icon: <TrendingUp className="h-4 w-4" />,
    adminOnly: true,
    children: [
      { label: 'Sales Orders', path: '/sale/orders' },
      { label: 'Customer Invoices', path: '/sale/invoices' },
      { label: 'Invoice Payments', path: '/sale/payments' },
    ],
  },
];

// Portal navigation items
const portalNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    icon: <LayoutDashboard className="h-4 w-4" />,
    path: '/portal/dashboard',
    portalOnly: true,
  },
  {
    label: 'Sales',
    icon: <ShoppingCart className="h-4 w-4" />,
    portalOnly: true,
    children: [
      { label: 'My Sales Orders', path: '/portal/sales-orders' },
      { label: 'My Invoices', path: '/portal/invoices' },
    ],
  },
  {
    label: 'Purchases',
    icon: <Receipt className="h-4 w-4" />,
    portalOnly: true,
    children: [
      { label: 'My Purchase Orders', path: '/portal/purchase-orders' },
      { label: 'My Vendor Bills', path: '/portal/vendor-bills' },
    ],
  },
];

export function TopNavigation() {
  const location = useLocation();
  const { user, isAdmin, logout } = useAuth();

  const isActive = (path?: string, children?: { path: string }[]) => {
    if (path && location.pathname === path) return true;
    if (children) {
      return children.some((child) => location.pathname.startsWith(child.path));
    }
    return false;
  };

  // Use different nav items based on role
  const navItems = isAdmin ? adminNavItems : portalNavItems;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card shadow-sm">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link to={isAdmin ? '/dashboard' : '/portal/dashboard'} className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">SF</span>
          </div>
          <span className="hidden text-lg font-semibold text-foreground md:inline-block">
            Shiv Furniture
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) =>
            item.children ? (
              <DropdownMenu key={item.label}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      'flex items-center gap-1.5 text-muted-foreground hover:text-foreground',
                      isActive(item.path, item.children) &&
                        'bg-accent text-accent-foreground'
                    )}
                  >
                    {item.icon}
                    <span className="hidden sm:inline">{item.label}</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {item.children.map((child) => (
                    <DropdownMenuItem key={child.path} asChild>
                      <Link
                        to={child.path}
                        className={cn(
                          'w-full cursor-pointer',
                          location.pathname === child.path && 'bg-accent'
                        )}
                      >
                        {child.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                key={item.label}
                variant="ghost"
                asChild
                className={cn(
                  'flex items-center gap-1.5 text-muted-foreground hover:text-foreground',
                  isActive(item.path) && 'bg-accent text-accent-foreground'
                )}
              >
                <Link to={item.path!}>
                  {item.icon}
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              </Button>
            )
          )}
        </nav>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <User className="h-4 w-4" />
              </div>
              <div className="hidden flex-col items-start text-sm md:flex">
                <span className="font-medium">{user?.user_metadata?.name || user?.email?.split('@')[0]}</span>
                <span className="text-xs text-muted-foreground capitalize">
                  {isAdmin ? 'admin' : 'portal'}
                </span>
              </div>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
