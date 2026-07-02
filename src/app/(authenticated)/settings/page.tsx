"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Save, Store } from "lucide-react";

interface StoreData {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  currency: string;
  taxRate: number;
  receiptHeader: string | null;
  receiptFooter: string | null;
}

export default function SettingsPage() {
  const [stores, setStores] = React.useState<StoreData[]>([]);
  const [selectedStoreId, setSelectedStoreId] = React.useState<string>("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
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
    async function load() {
      try {
        const res = await fetch("/api/stores");
        const data = await res.json();
        setStores(data.stores || []);
        if (data.stores?.length > 0) {
          setSelectedStoreId(data.stores[0].id);
        }
      } catch {
        toast.error("Gagal memuat data toko");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  React.useEffect(() => {
    const store = stores.find((s) => s.id === selectedStoreId);
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
    }
  }, [selectedStoreId, stores]);

  const handleSave = async () => {
    if (!selectedStoreId) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/stores/${selectedStoreId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        toast.error("Gagal menyimpan pengaturan");
        return;
      }

      toast.success("Pengaturan toko disimpan");
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Pengaturan</h1>
          <p className="text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pengaturan</h1>
          <p className="text-muted-foreground">Konfigurasi profil dan pengaturan toko</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Profil Toko
          </CardTitle>
          <CardDescription>Pilih toko yang ingin dikonfigurasi</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Pilih Toko</Label>
            <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih toko" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Toko</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
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

          <div className="grid gap-4 md:grid-cols-2">
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

          <Separator />

          <div>
            <h3 className="text-lg font-medium mb-4">Template Struk</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="receiptHeader">Kepala Struk</Label>
                <Textarea
                  id="receiptHeader"
                  value={form.receiptHeader}
                  onChange={(e) => setForm({ ...form, receiptHeader: e.target.value })}
                  placeholder="Terima kasih atas kunjungan Anda!"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receiptFooter">Kaki Struk</Label>
                <Textarea
                  id="receiptFooter"
                  value={form.receiptFooter}
                  onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
                  placeholder="Barang yang sudah dibeli tidak dapat dikembalikan."
                  rows={2}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving || !selectedStoreId}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Menyimpan..." : "Simpan Pengaturan"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
