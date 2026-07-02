"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Search,
  Package,
  AlertTriangle,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { StockEditDialog } from "@/components/stock-edit-dialog";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/utils";

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
  cost: number;
  category: { id: string; name: string } | null;
  inventory: InventoryItem[];
}

interface Category {
  id: string;
  name: string;
}

interface Adjustment {
  id: string;
  quantity: number;
  reason: string;
  note: string | null;
  createdAt: string;
  inventory: {
    product: { id: string; name: string; sku: string | null };
    store: { id: string; name: string };
  };
  user: { id: string; fullName: string; email: string };
}

const COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#f97316", "#6366f1", "#ec4899"];

function getStockBadge(quantity: number, threshold: number) {
  if (quantity === 0) return <Badge variant="destructive">0</Badge>;
  if (quantity <= threshold)
    return (
      <Badge variant="outline" className="border-yellow-500 text-yellow-700">
        {quantity}
      </Badge>
    );
  return <Badge variant="secondary">{quantity}</Badge>;
}

const reasonLabels: Record<string, string> = {
  RESTOCK: "Restock",
  DAMAGED: "Rusak",
  CORRECTION: "Koreksi",
  RETURN: "Retur",
  SALE: "Penjualan",
  OTHER: "Lainnya",
};

export default function InventoryPage() {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [adjustments, setAdjustments] = React.useState<Adjustment[]>([]);
  const [search, setSearch] = React.useState("");
  const [lowStockOnly, setLowStockOnly] = React.useState(false);
  const [sort, setSort] = React.useState("name");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [loading, setLoading] = React.useState(true);
  const [stockEditProduct, setStockEditProduct] = React.useState<Product | null>(null);
  const [activeTab, setActiveTab] = React.useState("stock");

  const fetchProducts = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (lowStockOnly) params.set("lowStock", "true");
      if (sort) params.set("sort", sort);
      if (categoryFilter && categoryFilter !== "all") params.set("categoryId", categoryFilter);

      const res = await fetch(`/api/inventory?${params}`);
      const data = await res.json();
      setProducts(data.products || []);
    } catch {
      toast.error("Gagal memuat data persediaan");
    } finally {
      setLoading(false);
    }
  }, [search, lowStockOnly, sort, categoryFilter]);

  const fetchCategories = React.useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data.categories || []);
    } catch {
      // ignore
    }
  }, []);

  const fetchAdjustments = React.useCallback(async () => {
    try {
      const res = await fetch("/api/inventory/adjustments?limit=50");
      const data = await res.json();
      setAdjustments(data.adjustments || []);
    } catch {
      toast.error("Gagal memuat riwayat");
    }
  }, []);

  React.useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  React.useEffect(() => {
    if (activeTab === "stock") {
      fetchProducts();
    } else {
      fetchAdjustments();
    }
  }, [activeTab, fetchProducts, fetchAdjustments]);

  const handleOpenStockEdit = async (product: Product) => {
    try {
      const res = await fetch(`/api/products/${product.id}/inventory`);
      const data = await res.json();
      setStockEditProduct({ ...product, inventory: data.inventory || [] });
    } catch {
      toast.error("Gagal memuat data stok");
    }
  };

  // Get unique store names from all products
  const storeNames = React.useMemo(() => {
    const names = new Set<string>();
    products.forEach((p) =>
      p.inventory.forEach((inv) => names.add(inv.store.name))
    );
    return Array.from(names).sort();
  }, [products]);

  // Summary stats
  const summary = React.useMemo(() => {
    const totalProducts = products.length;
    const totalStockValue = products.reduce((sum, p) => {
      const productStock = p.inventory.reduce((s, inv) => s + inv.quantity, 0);
      return sum + productStock * Number(p.cost);
    }, 0);
    const lowStockCount = products.filter((p) =>
      p.inventory.some((inv) => inv.quantity <= inv.lowStockThreshold)
    ).length;
    const outOfStockCount = products.filter((p) =>
      p.inventory.length > 0 && p.inventory.every((inv) => inv.quantity === 0)
    ).length;

    return { totalProducts, totalStockValue, lowStockCount, outOfStockCount };
  }, [products]);

  // Chart data: stock by store
  const stockByStore = React.useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) =>
      p.inventory.forEach((inv) => {
        map.set(inv.store.name, (map.get(inv.store.name) || 0) + inv.quantity);
      })
    );
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [products]);

  // Chart data: stock by category
  const stockByCategory = React.useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      const catName = p.category?.name || "Tanpa Kategori";
      const total = p.inventory.reduce((s, inv) => s + inv.quantity, 0);
      map.set(catName, (map.get(catName) || 0) + total);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [products]);

  // Top 10 highest stock
  const top10Highest = React.useMemo(() => {
    return [...products]
      .map((p) => ({
        ...p,
        totalStock: p.inventory.reduce((s, inv) => s + inv.quantity, 0),
      }))
      .sort((a, b) => b.totalStock - a.totalStock)
      .slice(0, 10);
  }, [products]);

  // Top 10 lowest stock
  const top10Lowest = React.useMemo(() => {
    return [...products]
      .map((p) => ({
        ...p,
        totalStock: p.inventory.reduce((s, inv) => s + inv.quantity, 0),
      }))
      .sort((a, b) => a.totalStock - b.totalStock)
      .slice(0, 10);
  }, [products]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Persediaan</h1>
        <p className="text-muted-foreground">Kelola dan analisis stok produk per toko</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="stock" className="gap-2">
            <Package className="h-4 w-4" />
            Stock Produk
          </TabsTrigger>
          <TabsTrigger value="report" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Laporan
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Clock className="h-4 w-4" />
            Riwayat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Produk</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalProducts}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Nilai Stok</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatRupiah(summary.totalStockValue)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Stok Rendah</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{summary.lowStockCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Stok Habis</CardTitle>
                <ShoppingCart className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{summary.outOfStockCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari produk atau SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
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
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Urutkan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Nama A-Z</SelectItem>
                <SelectItem value="stock_desc">Stok Tertinggi</SelectItem>
                <SelectItem value="stock_asc">Stok Terendah</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={lowStockOnly ? "default" : "outline"}
              onClick={() => setLowStockOnly(!lowStockOnly)}
              className="gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              Stok Rendah
              {lowStockOnly && summary.lowStockCount > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {summary.lowStockCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Product Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                Semua Produk ({products.length})
                {lowStockOnly && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    — Filter stok rendah aktif
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Memuat...</p>
              ) : products.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {lowStockOnly ? "Tidak ada produk dengan stok rendah." : "Belum ada data persediaan."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produk</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Kategori</TableHead>
                        {storeNames.map((name) => (
                          <TableHead key={name} className="text-right">
                            {name}
                          </TableHead>
                        ))}
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => {
                        const totalStock = product.inventory.reduce(
                          (sum, inv) => sum + inv.quantity,
                          0
                        );
                        return (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{product.sku || "-"}</Badge>
                            </TableCell>
                            <TableCell>{product.category?.name || "-"}</TableCell>
                            {storeNames.map((storeName) => {
                              const inv = product.inventory.find(
                                (i) => i.store.name === storeName
                              );
                              return (
                                <TableCell key={storeName} className="text-right">
                                  {inv
                                    ? getStockBadge(inv.quantity, inv.lowStockThreshold)
                                    : "-"}
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-right font-medium">{totalStock}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleOpenStockEdit(product)}
                                title="Edit Stok"
                              >
                                <Package className="h-4 w-4" />
                              </Button>
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
        </TabsContent>

        <TabsContent value="report" className="space-y-4">
          {/* Charts Row */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Stock by Store */}
            <Card>
              <CardHeader>
                <CardTitle>Stock per Toko</CardTitle>
              </CardHeader>
              <CardContent>
                {stockByStore.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Belum ada data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stockByStore}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                      >
                        {stockByStore.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => Number(value ?? 0).toLocaleString("id-ID")} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Stock by Category */}
            <Card>
              <CardHeader>
                <CardTitle>Stock per Kategori</CardTitle>
              </CardHeader>
              <CardContent>
                {stockByCategory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Belum ada data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stockByCategory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip formatter={(value) => Number(value ?? 0).toLocaleString("id-ID")} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top 10 Ranking */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Top 10 Highest */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Top 10 Stok Tertinggi
                </CardTitle>
              </CardHeader>
              <CardContent>
                {top10Highest.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Belum ada data</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Produk</TableHead>
                        <TableHead className="text-right">Stok</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {top10Highest.map((product, i) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{i + 1}</TableCell>
                          <TableCell>{product.name}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">{product.totalStock}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Top 10 Lowest */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  Top 10 Stok Terendah
                </CardTitle>
              </CardHeader>
              <CardContent>
                {top10Lowest.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Belum ada data</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Produk</TableHead>
                        <TableHead className="text-right">Stok</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {top10Lowest.map((product, i) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{i + 1}</TableCell>
                          <TableCell>{product.name}</TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={product.totalStock === 0 ? "destructive" : "outline"}
                            >
                              {product.totalStock}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Penyesuaian Stok</CardTitle>
            </CardHeader>
            <CardContent>
              {adjustments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Belum ada riwayat penyesuaian.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Produk</TableHead>
                        <TableHead>Toko</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead>Alasan</TableHead>
                        <TableHead>Catatan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adjustments.map((adj) => (
                        <TableRow key={adj.id}>
                          <TableCell className="text-sm">
                            {new Date(adj.createdAt).toLocaleString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </TableCell>
                          <TableCell className="font-medium">
                            {adj.inventory.product.name}
                          </TableCell>
                          <TableCell>{adj.inventory.store.name}</TableCell>
                          <TableCell>{adj.user.fullName}</TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={adj.quantity > 0 ? "default" : "destructive"}
                            >
                              {adj.quantity > 0 ? "+" : ""}
                              {adj.quantity}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {reasonLabels[adj.reason] || adj.reason}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {adj.note || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {stockEditProduct && (
        <StockEditDialog
          open={!!stockEditProduct}
          onOpenChange={(open) => {
            if (!open) setStockEditProduct(null);
          }}
          productId={stockEditProduct.id}
          productName={stockEditProduct.name}
          inventory={stockEditProduct.inventory || []}
          onSuccess={() => {
            fetchProducts();
            if (activeTab === "history") fetchAdjustments();
          }}
        />
      )}
    </div>
  );
}
