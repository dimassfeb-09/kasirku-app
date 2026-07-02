"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface InventoryItem {
  id: string;
  storeId: string;
  quantity: number;
  lowStockThreshold: number;
  store: { id: string; name: string };
}

interface StockEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  inventory: InventoryItem[];
  onSuccess?: () => void;
}

export function StockEditDialog({
  open,
  onOpenChange,
  productId,
  productName,
  inventory,
  onSuccess,
}: StockEditDialogProps) {
  const [stocks, setStocks] = React.useState<Record<string, number>>({});
  const [saving, setSaving] = React.useState(false);

  // Initialize stock values when dialog opens
  React.useEffect(() => {
    if (open) {
      const initial: Record<string, number> = {};
      inventory.forEach((inv) => {
        initial[inv.storeId] = inv.quantity;
      });
      setStocks(initial);
    }
  }, [open, inventory]);

  const handleStockChange = (storeId: string, value: string) => {
    const num = parseInt(value) || 0;
    setStocks((prev) => ({ ...prev, [storeId]: num }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises = inventory.map((inv) => {
        const newQty = stocks[inv.storeId] ?? inv.quantity;
        if (newQty === inv.quantity) return Promise.resolve();

        return fetch(`/api/products/${productId}/inventory`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storeId: inv.storeId, quantity: newQty }),
        });
      });

      const results = await Promise.all(promises);
      const hasError = results.some((r) => r && !r.ok);

      if (hasError) {
        toast.error("Gagal menyimpan beberapa stok");
      } else {
        toast.success("Stok berhasil diupdate");
        onOpenChange(false);
        onSuccess?.();
      }
    } catch {
      toast.error("Gagal menyimpan stok");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Stok Produk</DialogTitle>
          <DialogDescription>
            {productName} — Atur stok per toko
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {inventory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Produk belum di-assign ke toko mana pun
            </p>
          ) : (
            inventory.map((inv) => (
              <div key={inv.id} className="space-y-2">
                <Label htmlFor={`stock-${inv.storeId}`}>{inv.store.name}</Label>
                <Input
                  id={`stock-${inv.storeId}`}
                  type="number"
                  min="0"
                  value={stocks[inv.storeId] ?? inv.quantity}
                  onChange={(e) => handleStockChange(inv.storeId, e.target.value)}
                />
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={saving || inventory.length === 0}>
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
