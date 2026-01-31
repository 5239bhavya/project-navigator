import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  useBudgetStore,
  usePurchaseOrderStore,
  useSalesOrderStore,
  useCustomerInvoiceStore,
  useVendorBillStore,
  useContactStore,
  useProductStore,
} from '@/stores';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  ShoppingCart,
  Receipt,
  FileText,
  DollarSign,
  ArrowRight,
  PieChart,
} from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { format } from 'date-fns';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, isAdmin } = useAuth();
  const { budgets } = useBudgetStore();
  const { orders: purchaseOrders } = usePurchaseOrderStore();
  const { orders: salesOrders } = useSalesOrderStore();
  const { invoices } = useCustomerInvoiceStore();
  const { bills } = useVendorBillStore();
  const { contacts } = useContactStore();
  const { products } = useProductStore();

  const activeBudgets = budgets.filter((b) => b.state === 'confirmed' && !b.isArchived);
  const incomeBudgets = activeBudgets.filter((b) => b.type === 'income');
  const expenseBudgets = activeBudgets.filter((b) => b.type === 'expense');

  const totalBudgetedIncome = incomeBudgets.reduce((sum, b) => sum + b.budgetedAmount, 0);
  const totalAchievedIncome = incomeBudgets.reduce((sum, b) => sum + b.achievedAmount, 0);
  const totalBudgetedExpense = expenseBudgets.reduce((sum, b) => sum + b.budgetedAmount, 0);
  const totalAchievedExpense = expenseBudgets.reduce((sum, b) => sum + b.achievedAmount, 0);

  const pendingSalesOrders = salesOrders.filter((o) => o.status === 'draft').length;
  const pendingPurchaseOrders = purchaseOrders.filter((o) => o.status === 'draft').length;
  const unpaidInvoices = invoices.filter((i) => i.status !== 'paid' && !i.isArchived).length;
  const unpaidBills = bills.filter((b) => b.status !== 'paid' && !b.isArchived).length;

  const budgetPieData = [
    { name: 'Achieved', value: totalAchievedIncome, color: 'hsl(var(--chart-3))' },
    { name: 'Remaining', value: totalBudgetedIncome - totalAchievedIncome, color: 'hsl(var(--chart-1))' },
  ];

  const expensePieData = [
    { name: 'Spent', value: totalAchievedExpense, color: 'hsl(var(--chart-2))' },
    { name: 'Remaining', value: totalBudgetedExpense - totalAchievedExpense, color: 'hsl(var(--chart-5))' },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {profile?.name || user?.email?.split('@')[0]}!
          </h1>
          <p className="text-muted-foreground">
            {format(new Date(), 'EEEE, MMMM d, yyyy')} • {isAdmin ? 'Admin' : 'Portal'} Dashboard
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-chart-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Income (Budget)
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-chart-3" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalAchievedIncome)}</div>
              <p className="text-xs text-muted-foreground">
                of {formatCurrency(totalBudgetedIncome)} budgeted
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-chart-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Expenses (Budget)
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-chart-2" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalAchievedExpense)}</div>
              <p className="text-xs text-muted-foreground">
                of {formatCurrency(totalBudgetedExpense)} budgeted
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Orders
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingSalesOrders + pendingPurchaseOrders}</div>
              <p className="text-xs text-muted-foreground">
                {pendingSalesOrders} sales, {pendingPurchaseOrders} purchase
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-destructive">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Payments
              </CardTitle>
              <DollarSign className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unpaidInvoices + unpaidBills}</div>
              <p className="text-xs text-muted-foreground">
                {unpaidInvoices} invoices, {unpaidBills} bills
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Budget Charts */}
        {isAdmin && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-chart-3" />
                  Income Budget Achievement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={budgetPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {budgetPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 text-center">
                  <span className="text-2xl font-bold">
                    {totalBudgetedIncome > 0
                      ? Math.round((totalAchievedIncome / totalBudgetedIncome) * 100)
                      : 0}
                    %
                  </span>
                  <span className="text-muted-foreground"> achieved</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-chart-2" />
                  Expense Budget Utilization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={expensePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {expensePieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 text-center">
                  <span className="text-2xl font-bold">
                    {totalBudgetedExpense > 0
                      ? Math.round((totalAchievedExpense / totalBudgetedExpense) * 100)
                      : 0}
                    %
                  </span>
                  <span className="text-muted-foreground"> utilized</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {isAdmin && (
            <>
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 p-4"
                onClick={() => navigate('/account/contacts')}
              >
                <Users className="h-6 w-6" />
                <span>Contacts</span>
                <span className="text-xs text-muted-foreground">
                  {contacts.filter((c) => !c.isArchived).length} active
                </span>
              </Button>

              <Button
                variant="outline"
                className="h-auto flex-col gap-2 p-4"
                onClick={() => navigate('/account/products')}
              >
                <Package className="h-6 w-6" />
                <span>Products</span>
                <span className="text-xs text-muted-foreground">
                  {products.filter((p) => !p.isArchived).length} active
                </span>
              </Button>

              <Button
                variant="outline"
                className="h-auto flex-col gap-2 p-4"
                onClick={() => navigate('/account/budgets')}
              >
                <PieChart className="h-6 w-6" />
                <span>Budgets</span>
                <span className="text-xs text-muted-foreground">
                  {activeBudgets.length} active
                </span>
              </Button>
            </>
          )}

          <Button
            variant="outline"
            className="h-auto flex-col gap-2 p-4"
            onClick={() => navigate('/sale/orders')}
          >
            <ShoppingCart className="h-6 w-6" />
            <span>Sales Orders</span>
            <span className="text-xs text-muted-foreground">
              {salesOrders.filter((o) => !o.isArchived).length} total
            </span>
          </Button>

          <Button
            variant="outline"
            className="h-auto flex-col gap-2 p-4"
            onClick={() => navigate('/sale/invoices')}
          >
            <FileText className="h-6 w-6" />
            <span>Invoices</span>
            <span className="text-xs text-muted-foreground">
              {unpaidInvoices} unpaid
            </span>
          </Button>

          <Button
            variant="outline"
            className="h-auto flex-col gap-2 p-4"
            onClick={() => navigate('/purchase/orders')}
          >
            <Receipt className="h-6 w-6" />
            <span>Purchase Orders</span>
            <span className="text-xs text-muted-foreground">
              {purchaseOrders.filter((o) => !o.isArchived).length} total
            </span>
          </Button>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Sales Orders</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/sale/orders')}>
                View all <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {salesOrders
                  .filter((o) => !o.isArchived)
                  .slice(0, 5)
                  .map((order) => {
                    const customer = contacts.find((c) => c.id === order.customerId);
                    return (
                      <div
                        key={order.id}
                        className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/30 cursor-pointer"
                        onClick={() => navigate(`/sale/orders/${order.id}`)}
                      >
                        <div>
                          <p className="font-medium">{order.orderNumber}</p>
                          <p className="text-sm text-muted-foreground">{customer?.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(order.totalAmount)}</p>
                          <p className="text-sm text-muted-foreground capitalize">{order.status}</p>
                        </div>
                      </div>
                    );
                  })}
                {salesOrders.filter((o) => !o.isArchived).length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No sales orders yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Invoices</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/sale/invoices')}>
                View all <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invoices
                  .filter((i) => !i.isArchived)
                  .slice(0, 5)
                  .map((invoice) => {
                    const customer = contacts.find((c) => c.id === invoice.customerId);
                    return (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/30 cursor-pointer"
                        onClick={() => navigate(`/sale/invoices/${invoice.id}`)}
                      >
                        <div>
                          <p className="font-medium">{invoice.invoiceNumber}</p>
                          <p className="text-sm text-muted-foreground">{customer?.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(invoice.totalAmount)}</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {invoice.status.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                {invoices.filter((i) => !i.isArchived).length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No invoices yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
