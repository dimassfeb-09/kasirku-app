"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Search, Pencil, Trash2, Package } from "lucide-react";
import { ProductForm } from "@/components/product-form";
import { StockEditDialog } from "@/components/stock-edit-dialog";
import { toast } from "sonner";
import { useStore } from "@/lib/store-context";

interface Category {
  id: string;
  name: string;
}

interface InventoryItem {
  id: string;
  storeId: string;
  quantity: number;
  lowStockThreshold: number;
  store: { id: string; name: string };
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
  category: Category | null;
  inventory?: InventoryItem[];
}

export default function ProductsPage() {
  const { currentStoreId } = useStore();
  const [products, setProducts] = React.useState<Product[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [search, setSearch] = React.useState("");
  const [categoryIdFilter, setCategoryIdFilter] = React.useState("all");
  const [loading, setLoading] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editProduct, setEditProduct] = React.useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = React.useState<Product | null>(null);
  const [stockEditProduct, setStockEditProduct] = React.useState<Product | null>(null);
  const [userRole, setUserRole] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchUserRole() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        setUserRole(data.user?.role || null);
      } catch {
        // ignore
      }
    }
    fetchUserRole();
  }, []);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      // OWNER/MANAGER: fetch all products without store filter
      // CASHIER: fetch products filtered by current store
      const isAdminRole = userRole === "OWNER" || userRole === "MANAGER";
      const storeParam = isAdminRole ? "" : (currentStoreId ? `&storeId=${currentStoreId}` : "");
      const categoryParam = categoryIdFilter && categoryIdFilter !== "all" ? `&categoryId=${categoryIdFilter}` : "";
      const [productsRes, categoriesRes] = await Promise.all([
        fetch(`/api/products?search=${encodeURIComponent(search)}${storeParam}${categoryParam}`),
        fetch("/api/categories"),
      ]);
      const [productsData, categoriesData] = await Promise.all([
        productsRes.json(),
        categoriesRes.json(),
      ]);
      setProducts(productsData.products || []);
      setCategories(categoriesData.categories || []);
    } catch {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [search, categoryIdFilter, currentStoreId, userRole]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async () => {
    if (!deleteProduct) return;
    try {
      const res = await fetch(`/api/products/${deleteProduct.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Produk dihapus");
        fetchData();
      }
    } catch {
      toast.error("Gagal menghapus produk");
    }
    setDeleteProduct(null);
  };

  const handleOpenStockEdit = async (product: Product) => {
    // Fetch fresh inventory data
    try {
      const res = await fetch(`/api/products/${product.id}/inventory`);
      const data = await res.json();
      setStockEditProduct({ ...product, inventory: data.inventory || [] });
    } catch {
      toast.error("Gagal memuat data stok");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produk</h1>
          <p className="text-muted-foreground">Kelola katalog produk Anda</p>
        </div>
        <Button onClick={() => { setEditProduct(null); setFormOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Produk
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryIdFilter} onValueChange={setCategoryIdFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Semua Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Semua Produk ({products.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Memuat...</p>
          ) : products.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Belum ada produk. Klik &quot;Tambah Produk&quot; untuk membuat.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Harga</TableHead>
                    <TableHead className="text-right">Stok</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const totalStock = product.inventory?.reduce((sum, inv) => sum + inv.quantity, 0);
                    const hasInventory = product.inventory && product.inventory.length > 0;
                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{product.sku || "-"}</Badge>
                        </TableCell>
                        <TableCell>{product.category?.name || "-"}</TableCell>
                        <TableCell className="text-right">
                          Rp {product.price.toLocaleString("id-ID")}
                        </TableCell>
                        <TableCell className="text-right">
                          {hasInventory ? (
                            <Badge variant={totalStock === 0 ? "destructive" : "default"}>
                              {totalStock}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {hasInventory && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleOpenStockEdit(product)}
                                title="Edit Stok"
                              >
                                <Package className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => { setEditProduct(product); setFormOpen(true); }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => setDeleteProduct(product)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ProductForm
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editProduct}
        categories={categories}
        onSuccess={fetchData}
      />

      {stockEditProduct && (
        <StockEditDialog
          open={!!stockEditProduct}
          onOpenChange={(open) => { if (!open) setStockEditProduct(null); }}
          productId={stockEditProduct.id}
          productName={stockEditProduct.name}
          inventory={stockEditProduct.inventory || []}
          onSuccess={fetchData}
        />
      )}

      <AlertDialog open={!!deleteProduct} onOpenChange={() => setDeleteProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Produk</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus &quot;{deleteProduct?.name}&quot;? Tindakan ini tidak dapat dibatalkan.
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
