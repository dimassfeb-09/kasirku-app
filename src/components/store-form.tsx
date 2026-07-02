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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Store {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  currency: string;
  taxRate: number;
  receiptHeader: string | null;
  receiptFooter: string | null;
}

interface StoreFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store?: Store | null;
  onSuccess?: () => void;
}

export function StoreForm({ open, onOpenChange, store, onSuccess }: StoreFormProps) {
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    address: "",
    phone: "",
    currency: "IDR",
    taxRate: "11",
    receiptHeader: "",
    receiptFooter: "",
  });

  React.useEffect(() => {
    if (store) {
      setForm({
        name: store.name,
        address: store.address || "",
        phone: store.phone || "",
        currency: store.currency,
        taxRate: String(store.taxRate),
        receiptHeader: store.receiptHeader || "",
        receiptFooter: store.receiptFooter || "",
      });
    } else {
      setForm({ name: "", address: "", phone: "", currency: "IDR", taxRate: "11", receiptHeader: "", receiptFooter: "" });
    }
  }, [store, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = store ? `/api/stores/${store.id}` : "/api/stores";
      const method = store ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Gagal menyimpan toko");
        setLoading(false);
        return;
      }

      toast.success(store ? "Toko diperbarui" : "Toko ditambahkan");
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{store ? "Edit Toko" : "Tambah Toko"}</DialogTitle>
          <DialogDescription>
            {store ? "Ubah data toko" : "Tambahkan toko baru"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Toko *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Alamat</Label>
            <Textarea
              id="address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telepon</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Mata Uang</Label>
              <Input
                id="currency"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxRate">Pajak (%)</Label>
              <Input
                id="taxRate"
                type="number"
                value={form.taxRate}
                onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
                min="0"
                max="100"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="receiptHeader">Kepala Struk</Label>
            <Input
              id="receiptHeader"
              value={form.receiptHeader}
              onChange={(e) => setForm({ ...form, receiptHeader: e.target.value })}
              placeholder="Terima kasih atas kunjungan Anda!"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="receiptFooter">Kaki Struk</Label>
            <Input
              id="receiptFooter"
              value={form.receiptFooter}
              onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
              placeholder="Barang yang sudah dibeli tidak dapat dikembalikan."
            />
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
