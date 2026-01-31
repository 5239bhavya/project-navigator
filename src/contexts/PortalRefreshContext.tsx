/**
 * Portal Refresh Context
 * 
 * Provides a centralized way to trigger refresh across all portal views
 * after payment confirmation to ensure real-time synchronization.
 */

import React, { createContext, useContext, useCallback, useState } from 'react';

interface PortalRefreshContextType {
  // Refresh trigger counter - components can watch this to refresh
  refreshTrigger: number;
  // Call this after any payment to trigger global refresh
  triggerRefresh: () => void;
  // Optional: track what type of refresh (for selective updates)
  lastRefreshType: 'invoice_payment' | 'bill_payment' | 'manual' | null;
  setLastRefreshType: (type: 'invoice_payment' | 'bill_payment' | 'manual') => void;
}

const PortalRefreshContext = createContext<PortalRefreshContextType | undefined>(undefined);

export function PortalRefreshProvider({ children }: { children: React.ReactNode }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lastRefreshType, setLastRefreshType] = useState<'invoice_payment' | 'bill_payment' | 'manual' | null>(null);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <PortalRefreshContext.Provider 
      value={{ 
        refreshTrigger, 
        triggerRefresh, 
        lastRefreshType, 
        setLastRefreshType 
      }}
    >
      {children}
    </PortalRefreshContext.Provider>
  );
}

export function usePortalRefresh() {
  const context = useContext(PortalRefreshContext);
  if (context === undefined) {
    throw new Error('usePortalRefresh must be used within a PortalRefreshProvider');
  }
  return context;
}
