"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Store } from "lucide-react";
import { StoreForm } from "@/components/store-form";
import { toast } from "sonner";

interface StoreData {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  currency: string;
  taxRate: number;
  receiptHeader: string | null;
  receiptFooter: string | null;
  isActive: boolean;
  _count: { orders: number; staffAssignments: number };
}

export default function StoresPage() {
  const [stores, setStores] = React.useState<StoreData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editStore, setEditStore] = React.useState<StoreData | null>(null);
  const [deleteStore, setDeleteStore] = React.useState<StoreData | null>(null);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stores");
      const data = await res.json();
      setStores(data.stores || []);
    } catch {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async () => {
    if (!deleteStore) return;
    try {
      const res = await fetch(`/api/stores/${deleteStore.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Toko dihapus");
        fetchData();
      }
    } catch {
      toast.error("Gagal menghapus toko");
    }
    setDeleteStore(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Toko</h1>
          <p className="text-muted-foreground">Kelola toko dan cabang Anda</p>
        </div>
        <Button onClick={() => { setEditStore(null); setFormOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Toko
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Semua Toko ({stores.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Memuat...</p>
          ) : stores.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Belum ada toko. Klik &quot;Tambah Toko&quot; untuk membuat.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Alamat</TableHead>
                    <TableHead>Mata Uang</TableHead>
                    <TableHead className="text-right">Pajak</TableHead>
                    <TableHead className="text-right">Staff</TableHead>
                    <TableHead className="text-right">Transaksi</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stores.map((store) => (
                    <TableRow key={store.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-muted-foreground" />
                          {store.name}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{store.address || "-"}</TableCell>
                      <TableCell>{store.currency}</TableCell>
                      <TableCell className="text-right">{store.taxRate}%</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{store._count.staffAssignments}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{store._count.orders}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => { setEditStore(store); setFormOpen(true); }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteStore(store)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <StoreForm
        open={formOpen}
        onOpenChange={setFormOpen}
        store={editStore}
        onSuccess={fetchData}
      />

      <AlertDialog open={!!deleteStore} onOpenChange={() => setDeleteStore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Toko</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus &quot;{deleteStore?.name}&quot;? Semua data terkait juga akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
