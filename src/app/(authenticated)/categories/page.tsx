"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  createdAt: string;
  _count: { products: number };
}

export default function CategoriesPage() {
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editCategory, setEditCategory] = React.useState<Category | null>(null);
  const [deleteCategory, setDeleteCategory] = React.useState<Category | null>(null);
  const [formName, setFormName] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data.categories || []);
    } catch {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  React.useEffect(() => {
    if (editCategory) {
      setFormName(editCategory.name);
    } else {
      setFormName("");
    }
  }, [editCategory, formOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setSaving(true);

    try {
      const url = editCategory ? `/api/categories/${editCategory.id}` : "/api/categories";
      const method = editCategory ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Gagal menyimpan kategori");
        setSaving(false);
        return;
      }

      toast.success(editCategory ? "Kategori diperbarui" : "Kategori ditambahkan");
      setFormOpen(false);
      setEditCategory(null);
      fetchData();
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteCategory) return;
    try {
      const res = await fetch(`/api/categories/${deleteCategory.id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Gagal menghapus kategori");
        return;
      }

      toast.success("Kategori dihapus");
      fetchData();
    } catch {
      toast.error("Gagal menghapus kategori");
    }
    setDeleteCategory(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kategori</h1>
          <p className="text-muted-foreground">Kelola kategori produk Anda</p>
        </div>
        <Button onClick={() => { setEditCategory(null); setFormName(""); setFormOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Kategori
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Semua Kategori ({categories.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Memuat...</p>
          ) : categories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Belum ada kategori. Klik &quot;Tambah Kategori&quot; untuk membuat.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead className="text-right">Jumlah Produk</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-muted-foreground" />
                          {category.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{category._count.products}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => { setEditCategory(category); setFormOpen(true); }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteCategory(category)}
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

      {/* Add/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editCategory ? "Edit Kategori" : "Tambah Kategori"}</DialogTitle>
            <DialogDescription>
              {editCategory ? "Ubah nama kategori" : "Tambahkan kategori baru untuk produk"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Kategori *</Label>
                <Input
                  id="name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Makanan, Minuman"
                  required
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving || !formName.trim()}>
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteCategory} onOpenChange={() => setDeleteCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kategori</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus &quot;{deleteCategory?.name}&quot;?
              {deleteCategory && deleteCategory._count.products > 0 && (
                <span className="block mt-1 text-destructive font-medium">
                  Masih ada {deleteCategory._count.products} produk dalam kategori ini.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
              disabled={deleteCategory ? deleteCategory._count.products > 0 : false}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
