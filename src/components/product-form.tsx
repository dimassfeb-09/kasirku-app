"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
}

interface Store {
  id: string;
  name: string;
}

interface Inventory {
  storeId: string;
  quantity: number;
}

interface Product {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  price: number;
  cost: number;
  categoryId: string | null;
  inventory?: Inventory[];
}

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  categories: Category[];
  onSuccess?: () => void;
}

export function ProductForm({ open, onOpenChange, product, categories, onSuccess }: ProductFormProps) {
  const [loading, setLoading] = React.useState(false);
  const [stores, setStores] = React.useState<Store[]>([]);
  const [selectedStoreIds, setSelectedStoreIds] = React.useState<string[]>([]);
  const [form, setForm] = React.useState({
    name: "",
    sku: "",
    barcode: "",
    description: "",
    price: "",
    cost: "",
    categoryId: "",
  });

  // Fetch stores when dialog opens
  React.useEffect(() => {
    if (open) {
      fetch("/api/stores")
        .then((res) => res.json())
        .then((data) => setStores(data.stores || []))
        .catch(() => {});
    }
  }, [open]);

  // Set form values when product changes
  React.useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        sku: product.sku || "",
        barcode: product.barcode || "",
        description: product.description || "",
        price: String(product.price),
        cost: String(product.cost),
        categoryId: product.categoryId || "",
      });
      // Set selected stores from existing inventory
      setSelectedStoreIds(product.inventory?.map((inv) => inv.storeId) || []);
    } else {
      setForm({ name: "", sku: "", barcode: "", description: "", price: "", cost: "", categoryId: "" });
      setSelectedStoreIds([]);
    }
  }, [product, open]);

  const toggleStore = (storeId: string) => {
    setSelectedStoreIds((prev) =>
      prev.includes(storeId) ? prev.filter((id) => id !== storeId) : [...prev, storeId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = product ? `/api/products/${product.id}` : "/api/products";
      const method = product ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: parseFloat(form.price),
          cost: parseFloat(form.cost || "0"),
          categoryId: form.categoryId || null,
          storeAssignmentStoreIds: selectedStoreIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Gagal menyimpan produk");
        setLoading(false);
        return;
      }

      toast.success(product ? "Produk diperbarui" : "Produk ditambahkan");
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Produk" : "Tambah Produk"}</DialogTitle>
          <DialogDescription>
            {product ? "Ubah detail produk" : "Tambahkan produk baru ke katalog"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Produk *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="MK-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode</Label>
              <Input
                id="barcode"
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Kategori</Label>
            <Select
              value={form.categoryId}
              onValueChange={(v) => setForm({ ...form, categoryId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Harga Jual *</Label>
              <Input
                id="price"
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Harga Modal</Label>
              <Input
                id="cost"
                type="number"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                min="0"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
            />
          </div>

          {/* Store Assignment Section */}
          <div className="space-y-2">
            <Label>Penugasan Toko</Label>
            <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
              {stores.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada toko</p>
              ) : (
                stores.map((store) => (
                  <div key={store.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`store-${store.id}`}
                      checked={selectedStoreIds.includes(store.id)}
                      onCheckedChange={() => toggleStore(store.id)}
                    />
                    <Label htmlFor={`store-${store.id}`} className="text-sm cursor-pointer">
                      {store.name}
                    </Label>
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Pilih toko yang menjual produk ini. Stok awal otomatis 0, bisa diubah setelah produk disimpan.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
