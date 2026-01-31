import { useEffect } from "react";
import {
  useContactStore,
  useBudgetStore,
  usePurchaseOrderStore,
  useVendorBillStore,
  useAnalyticalAccountStore,
  useSalesOrderStore,
  useCustomerInvoiceStore
} from '@/stores';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PortalRefreshProvider } from "@/contexts/PortalRefreshContext";
// Pages
import Dashboard from "./pages/Dashboard";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ContactList from "./pages/account/ContactList";
import ContactForm from "./pages/account/ContactForm";
import ProductList from "./pages/account/ProductList";
import ProductForm from "./pages/account/ProductForm";
import AnalyticalAccountList from "./pages/account/AnalyticalAccountList";
import AnalyticalAccountForm from "./pages/account/AnalyticalAccountForm";
import AutoAnalyticalModelList from "./pages/account/AutoAnalyticalModelList";
import AutoAnalyticalModelForm from "./pages/account/AutoAnalyticalModelForm";
import BudgetList from "./pages/account/BudgetList";
import BudgetForm from "./pages/account/BudgetForm";
import PortalUserList from "./pages/account/PortalUserList";
import PortalUserDetail from "./pages/account/PortalUserDetail";
import NotFound from "./pages/NotFound";

// Sale Pages
import { SalesOrderList, SalesOrderDetail, SalesOrderForm, CustomerInvoiceList, CustomerInvoiceDetail, CustomerInvoiceForm, InvoicePaymentList } from "./pages/sale";

// Purchase Pages
import { PurchaseOrderList, PurchaseOrderDetail, PurchaseOrderForm, VendorBillList, VendorBillDetail, VendorBillForm, BillPaymentList } from "./pages/purchase";

// Portal Pages
import {
  PortalDashboard,
  PortalSalesOrders,
  PortalSalesOrderDetail,
  PortalInvoices,
  PortalInvoiceDetail,
  PortalPayInvoice,
  PortalPurchaseOrders,
  PortalVendorBills,
  PortalBillDetail,
  PortalPayBill,
} from "./pages/portal";

const queryClient = new QueryClient();

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/portal/dashboard" replace />;
  }

  return <>{children}</>;
}

function PortalRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Portal users go to portal routes, admins can also access
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  // Fetch initial data
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      useContactStore.getState().fetchContacts();
      useBudgetStore.getState().fetchBudgets();
      usePurchaseOrderStore.getState().fetchOrders();
      useVendorBillStore.getState().fetchBills();
      useAnalyticalAccountStore.getState().fetchAccounts();
      useSalesOrderStore.getState().fetchOrders();
      useCustomerInvoiceStore.getState().fetchInvoices();
    }
  }, [isAuthenticated, isAdmin]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Determine where to redirect based on role
  const getDefaultRoute = () => {
    if (!isAuthenticated) return "/login";
    return isAdmin ? "/dashboard" : "/portal/dashboard";
  };

  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={isAuthenticated ? <Navigate to={getDefaultRoute()} /> : <Login />} />
      <Route path="/signup" element={isAuthenticated ? <Navigate to={getDefaultRoute()} /> : <Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Root redirect based on role */}
      <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />

      {/* Admin Dashboard */}
      <Route path="/dashboard" element={<ProtectedRoute adminOnly><Dashboard /></ProtectedRoute>} />

      {/* Account Module - Admin Only */}
      <Route path="/account/contacts" element={<ProtectedRoute adminOnly><ContactList /></ProtectedRoute>} />
      <Route path="/account/contacts/:id" element={<ProtectedRoute adminOnly><ContactForm /></ProtectedRoute>} />
      <Route path="/account/products" element={<ProtectedRoute adminOnly><ProductList /></ProtectedRoute>} />
      <Route path="/account/products/:id" element={<ProtectedRoute adminOnly><ProductForm /></ProtectedRoute>} />
      <Route path="/account/analytical-accounts" element={<ProtectedRoute adminOnly><AnalyticalAccountList /></ProtectedRoute>} />
      <Route path="/account/analytical-accounts/:id" element={<ProtectedRoute adminOnly><AnalyticalAccountForm /></ProtectedRoute>} />
      <Route path="/account/auto-analytical-models" element={<ProtectedRoute adminOnly><AutoAnalyticalModelList /></ProtectedRoute>} />
      <Route path="/account/auto-analytical-models/:id" element={<ProtectedRoute adminOnly><AutoAnalyticalModelForm /></ProtectedRoute>} />
      <Route path="/account/budgets" element={<ProtectedRoute adminOnly><BudgetList /></ProtectedRoute>} />
      <Route path="/account/budgets/:id" element={<ProtectedRoute adminOnly><BudgetForm /></ProtectedRoute>} />
      <Route path="/account/portal-users" element={<ProtectedRoute adminOnly><PortalUserList /></ProtectedRoute>} />
      <Route path="/account/portal-users/:id" element={<ProtectedRoute adminOnly><PortalUserDetail /></ProtectedRoute>} />

      {/* Purchase Module - Admin Only */}
      <Route path="/purchase/orders" element={<ProtectedRoute adminOnly><PurchaseOrderList /></ProtectedRoute>} />
      <Route path="/purchase/orders/:id" element={<ProtectedRoute adminOnly><PurchaseOrderForm /></ProtectedRoute>} />
      <Route path="/purchase/orders/:id/view" element={<ProtectedRoute adminOnly><PurchaseOrderDetail /></ProtectedRoute>} />
      <Route path="/purchase/bills" element={<ProtectedRoute adminOnly><VendorBillList /></ProtectedRoute>} />
      <Route path="/purchase/bills/:id" element={<ProtectedRoute adminOnly><VendorBillForm /></ProtectedRoute>} />
      <Route path="/purchase/bills/:id/view" element={<ProtectedRoute adminOnly><VendorBillDetail /></ProtectedRoute>} />
      <Route path="/purchase/payments" element={<ProtectedRoute adminOnly><BillPaymentList /></ProtectedRoute>} />

      {/* Sale Module - Admin Only */}
      <Route path="/sale/orders" element={<ProtectedRoute adminOnly><SalesOrderList /></ProtectedRoute>} />
      <Route path="/sale/orders/:id" element={<ProtectedRoute adminOnly><SalesOrderForm /></ProtectedRoute>} />
      <Route path="/sale/orders/:id/view" element={<ProtectedRoute adminOnly><SalesOrderDetail /></ProtectedRoute>} />
      <Route path="/sale/invoices" element={<ProtectedRoute adminOnly><CustomerInvoiceList /></ProtectedRoute>} />
      <Route path="/sale/invoices/:id" element={<ProtectedRoute adminOnly><CustomerInvoiceForm /></ProtectedRoute>} />
      <Route path="/sale/invoices/:id/view" element={<ProtectedRoute adminOnly><CustomerInvoiceDetail /></ProtectedRoute>} />
      <Route path="/sale/payments" element={<ProtectedRoute adminOnly><InvoicePaymentList /></ProtectedRoute>} />

      {/* Portal Routes */}
      <Route path="/portal/dashboard" element={<PortalRoute><PortalDashboard /></PortalRoute>} />
      <Route path="/portal/sales-orders" element={<PortalRoute><PortalSalesOrders /></PortalRoute>} />
      <Route path="/portal/sales-orders/:id" element={<PortalRoute><PortalSalesOrderDetail /></PortalRoute>} />
      <Route path="/portal/invoices" element={<PortalRoute><PortalInvoices /></PortalRoute>} />
      <Route path="/portal/invoices/:id" element={<PortalRoute><PortalInvoiceDetail /></PortalRoute>} />
      <Route path="/portal/invoices/:id/pay" element={<PortalRoute><PortalPayInvoice /></PortalRoute>} />
      <Route path="/portal/purchase-orders" element={<PortalRoute><PortalPurchaseOrders /></PortalRoute>} />
      <Route path="/portal/purchase-orders/:id" element={<PortalRoute><PortalPurchaseOrders /></PortalRoute>} />
      <Route path="/portal/vendor-bills" element={<PortalRoute><PortalVendorBills /></PortalRoute>} />
      <Route path="/portal/vendor-bills/:id" element={<PortalRoute><PortalBillDetail /></PortalRoute>} />
      <Route path="/portal/vendor-bills/:id/pay" element={<PortalRoute><PortalPayBill /></PortalRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <PortalRefreshProvider>
            <AppRoutes />
          </PortalRefreshProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
