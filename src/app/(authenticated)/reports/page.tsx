"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  Receipt,
  CalendarIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store-context";

interface ReportData {
  summary: {
    totalOrders: number;
    totalRevenue: number;
    totalTax: number;
    avgOrderValue: number;
  };
  topProducts: { name: string; quantity: number; revenue: number }[];
  paymentMethods: Record<string, number>;
  salesByHour: { hour: number; revenue: number }[];
  dailySales: { date: string; revenue: number; orders: number }[];
  topCustomers: { name: string; orders: number; total: number }[];
  cashierPerformance: {
    userId: string;
    userName: string;
    orderCount: number;
    totalRevenue: number;
    avgOrderValue: number;
  }[];
  recentOrders: {
    id: string;
    orderNumber: string;
    total: number;
    status: string;
    createdAt: string;
    staff: string;
    paymentMethod: string;
  }[];
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

const COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#f97316", "#6366f1", "#ec4899"];

const statusBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  COMPLETED: { label: "Selesai", variant: "default" },
  VOIDED: { label: "Dibatalkan", variant: "destructive" },
  REFUNDED: { label: "Dikembalikan", variant: "secondary" },
};

export default function ReportsPage() {
  const { currentStoreId } = useStore();
  const [data, setData] = React.useState<ReportData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [period, setPeriod] = React.useState("today");
  const [customRange, setCustomRange] = React.useState(false);
  const [dateFrom, setDateFrom] = React.useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = React.useState<Date | undefined>(undefined);

  const fetchReport = async () => {
    setLoading(true);
    try {
      let url = `/api/reports?`;
      if (customRange && dateFrom && dateTo) {
        const fromStr = dateFrom.toISOString().split("T")[0];
        const toStr = dateTo.toISOString().split("T")[0];
        url += `dateFrom=${fromStr}&dateTo=${toStr}`;
      } else {
        url += `period=${period}`;
      }
      if (currentStoreId) url += `&storeId=${currentStoreId}`;
      const res = await fetch(url);
      const reportData = await res.json();
      setData(reportData);
    } catch {
      toast.error("Gagal memuat laporan");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchReport();
  }, [period, currentStoreId, customRange, dateFrom, dateTo]);

  const paymentData = data
    ? Object.entries(data.paymentMethods).map(([method, amount]) => ({
        name: paymentMethodLabel[method] || method,
        value: amount,
      }))
    : [];

  const hourlyData = data
    ? Array.from({ length: 24 }, (_, i) => {
        const found = data.salesByHour.find((s) => s.hour === i);
        return { hour: `${i}:00`, revenue: found?.revenue || 0 };
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Laporan</h1>
          <p className="text-muted-foreground">Ringkasan penjualan dan analisis bisnis</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex gap-2">
            {[
              { value: "today", label: "Hari Ini" },
              { value: "week", label: "Minggu Ini" },
              { value: "month", label: "Bulan Ini" },
              { value: "year", label: "Tahun Ini" },
            ].map((p) => (
              <Button
                key={p.value}
                variant={period === p.value && !customRange ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setPeriod(p.value);
                  setCustomRange(false);
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              variant={customRange ? "default" : "outline"}
              size="sm"
              onClick={() => setCustomRange(!customRange)}
            >
              <CalendarIcon className="mr-1 h-4 w-4" />
              Custom
            </Button>
            {customRange && (
              <>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      {dateFrom ? dateFrom.toLocaleDateString("id-ID") : "Dari"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      {dateTo ? dateTo.toLocaleDateString("id-ID") : "Sampai"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pendapatan</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatRupiah(data?.summary.totalRevenue || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Transaksi</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.summary.totalOrders || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rata-rata per Transaksi</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatRupiah(data?.summary.avgOrderValue || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pajak</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatRupiah(data?.summary.totalTax || 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Grafik Penjualan</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Memuat data...</p>
            ) : period === "today" ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(value) => formatRupiah(Number(value))} />
                  <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data?.dailySales || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(value) => formatRupiah(Number(value))} />
                  <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Metode Pembayaran</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Memuat data...</p>
            ) : paymentData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Belum ada data</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={paymentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {paymentData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatRupiah(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {paymentData.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-2 text-sm">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="flex-1">{item.name}</span>
                      <span className="font-medium">{formatRupiah(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Produk Terlaris
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Memuat data...</p>
            ) : data?.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Belum ada data</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead className="text-center">Terjual</TableHead>
                    <TableHead className="text-right">Pendapatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.topProducts.map((product, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-center">{product.quantity}</TableCell>
                      <TableCell className="text-right">{formatRupiah(product.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Pelanggan Terbaik
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Memuat data...</p>
            ) : data?.topCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Belum ada data</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead className="text-center">Transaksi</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.topCustomers.map((customer, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell className="text-center">{customer.orders}</TableCell>
                      <TableCell className="text-right">{formatRupiah(customer.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cashier Performance */}
      {data?.cashierPerformance && data.cashierPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Performa Kasir
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Memuat data...</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Kasir</TableHead>
                      <TableHead className="text-center">Total Transaksi</TableHead>
                      <TableHead className="text-right">Total Pendapatan</TableHead>
                      <TableHead className="text-right">Rata-rata/Transaksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.cashierPerformance.map((cashier) => (
                      <TableRow key={cashier.userId}>
                        <TableCell className="font-medium">{cashier.userName}</TableCell>
                        <TableCell className="text-center">{cashier.orderCount}</TableCell>
                        <TableCell className="text-right">{formatRupiah(cashier.totalRevenue)}</TableCell>
                        <TableCell className="text-right">{formatRupiah(cashier.avgOrderValue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Transaksi Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Memuat data...</p>
          ) : data?.recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada transaksi</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Pesanan</TableHead>
                    <TableHead className="hidden sm:table-cell">Tanggal</TableHead>
                    <TableHead className="hidden md:table-cell">Kasir</TableHead>
                    <TableHead className="hidden sm:table-cell">Pembayaran</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{order.staff}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline">{paymentMethodLabel[order.paymentMethod] || order.paymentMethod}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold">{formatRupiah(order.total)}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadge[order.status]?.variant || "default"}>
                          {statusBadge[order.status]?.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
