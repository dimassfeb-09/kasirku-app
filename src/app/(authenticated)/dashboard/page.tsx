"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, ShoppingCart, Receipt, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store-context";

interface ReportSummary {
  totalOrders: number;
  totalRevenue: number;
  totalTax: number;
  avgOrderValue: number;
}

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  staff: string;
  paymentMethod: string;
}

interface ReportData {
  summary: ReportSummary;
  topProducts: TopProduct[];
  recentOrders: RecentOrder[];
}

const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const paymentMethodLabel: Record<string, string> = {
  CASH: "Tunai",
  CARD: "Kartu",
  EWALLET: "E-Wallet",
  QRIS: "QRIS",
  TRANSFER: "Transfer",
  OTHER: "Lainnya",
};

const statusBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  COMPLETED: { label: "Selesai", variant: "default" },
  VOIDED: { label: "Dibatalkan", variant: "destructive" },
  REFUNDED: { label: "Dikembalikan", variant: "secondary" },
  HELD: { label: "Tertahan", variant: "outline" },
};

export default function DashboardPage() {
  const { currentStoreId } = useStore();
  const [data, setData] = React.useState<ReportData | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchDashboard = async () => {
    if (!currentStoreId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?period=today&storeId=${currentStoreId}`);
      const reportData = await res.json();
      setData(reportData);
    } catch {
      toast.error("Gagal memuat dashboard");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchDashboard();
  }, [currentStoreId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Memuat dashboard...</p>
      </div>
    );
  }

  const stats = [
    {
      title: "Penjualan Hari Ini",
      value: formatRupiah(data?.summary.totalRevenue || 0),
      icon: DollarSign,
      change: `${data?.summary.totalOrders || 0} transaksi`,
    },
    {
      title: "Transaksi",
      value: String(data?.summary.totalOrders || 0),
      icon: ShoppingCart,
      change: `Rata-rata ${formatRupiah(data?.summary.avgOrderValue || 0)}`,
    },
    {
      title: "Pajak",
      value: formatRupiah(data?.summary.totalTax || 0),
      icon: Receipt,
      change: "Hari ini",
    },
    {
      title: "Produk Terlaris",
      value: String(data?.topProducts?.length || 0),
      icon: TrendingUp,
      change: "produk terjual",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Ringkasan aktivitas toko hari ini.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Transaksi Terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.recentOrders && data.recentOrders.length > 0 ? (
              <div className="space-y-3">
                {data.recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.staff}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatRupiah(order.total)}</p>
                      <Badge
                        variant={statusBadge[order.status]?.variant || "default"}
                        className="text-[10px]"
                      >
                        {statusBadge[order.status]?.label || order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada transaksi hari ini.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Produk Terlaris</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.topProducts && data.topProducts.length > 0 ? (
              <div className="space-y-3">
                {data.topProducts.slice(0, 5).map((product, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-muted-foreground w-5">
                        {i + 1}.
                      </span>
                      <span>{product.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{product.quantity} terjual</p>
                      <p className="text-xs text-muted-foreground">
                        {formatRupiah(product.revenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada penjualan hari ini.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
