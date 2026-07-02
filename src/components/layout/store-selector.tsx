"use client";

import { useStore } from "@/lib/store-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Store, Building2 } from "lucide-react";

export function StoreSelector() {
  const { currentStoreId, currentStore, stores, setCurrentStoreId, loading } = useStore();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Store className="h-4 w-4" />
        <span className="hidden sm:inline">Memuat toko...</span>
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Store className="h-4 w-4" />
        <span className="hidden sm:inline">Tidak ada toko</span>
      </div>
    );
  }

  if (stores.length === 1) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Store className="h-4 w-4 text-muted-foreground" />
        <span className="hidden sm:inline font-medium">{currentStore?.name}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Store className="h-4 w-4 text-muted-foreground" />
      <Select value={currentStoreId === null ? "__all__" : currentStoreId || ""} onValueChange={setCurrentStoreId}>
        <SelectTrigger className="w-full max-w-[200px] h-9 text-sm">
          <SelectValue placeholder="Pilih toko" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span>Semua Toko</span>
            </div>
          </SelectItem>
          {stores.map((store) => (
            <SelectItem key={store.id} value={store.id}>
              {store.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
