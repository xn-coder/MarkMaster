
'use client';

import React, { createContext, useContext, useState, useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface LoadingContextType {
  isLoading: boolean;
  showLoader: () => void;
  hideLoader: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const showLoader = () => setIsLoading(true);
  const hideLoader = () => setIsLoading(false);

  return (
    <LoadingContext.Provider value={{ isLoading, showLoader, hideLoader }}>
      {children}
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      )}
    </LoadingContext.Provider>
  );
}

export function useLoadingIndicator() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoadingIndicator must be used within a LoadingProvider');
  }
  return context;
}

// This component is a client component that will use the hooks
function NavigationEvents() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showLoader } // hideLoader is called by the page itself
    = useLoadingIndicator();

  useEffect(() => {
    // Show loader on path change
    showLoader();
    // The responsibility to hide the loader will be on the page component
    // that finishes loading its critical data.
  }, [pathname, searchParams, showLoader]);

  return null;
}

// We create a wrapper component that uses Suspense
export function NavigationEventsManager() {
  return (
    <Suspense fallback={null}>
      <NavigationEvents />
    </Suspense>
  );
}
