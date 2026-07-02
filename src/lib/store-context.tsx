"use client";

import * as React from "react";

interface Store {
  id: string;
  name: string;
  currency: string;
}

interface StoreContextType {
  currentStoreId: string | null;
  currentStore: Store | null;
  stores: Store[];
  setCurrentStoreId: (storeId: string) => void;
  loading: boolean;
}

const StoreContext = React.createContext<StoreContextType | undefined>(undefined);

const STORAGE_KEY = "kasirku-current-store";

const ALL_STORES = "__all__";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [stores, setStores] = React.useState<Store[]>([]);
  const [currentStoreId, setCurrentStoreIdState] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchStores() {
      try {
        const res = await fetch("/api/user-stores");
        const data = await res.json();
        const storeList = data.stores || [];
        setStores(storeList);

        // Restore from localStorage or pick first
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === ALL_STORES) {
          setCurrentStoreIdState(null);
        } else if (saved && storeList.some((s: Store) => s.id === saved)) {
          setCurrentStoreIdState(saved);
        } else if (storeList.length > 0) {
          setCurrentStoreIdState(storeList[0].id);
          localStorage.setItem(STORAGE_KEY, storeList[0].id);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchStores();
  }, []);

  const setCurrentStoreId = React.useCallback((storeId: string) => {
    if (storeId === ALL_STORES) {
      setCurrentStoreIdState(null);
      localStorage.setItem(STORAGE_KEY, ALL_STORES);
    } else {
      setCurrentStoreIdState(storeId);
      localStorage.setItem(STORAGE_KEY, storeId);
    }
  }, []);

  const currentStore = stores.find((s) => s.id === currentStoreId) || null;

  return (
    <StoreContext.Provider value={{ currentStoreId, currentStore, stores, setCurrentStoreId, loading }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = React.useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
