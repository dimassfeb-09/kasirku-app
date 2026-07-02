"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Search, Eye, Filter, Receipt, ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store-context";

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Payment {
  id: string;
  method: string;
  amount: number;
}

interface Order {
  id: string;
  orderNumber: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
  payments: Payment[];
  user: { id: string; fullName: string };
  customer?: { id: string; name: string } | null;
  store: { name: string };
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

const statusBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  COMPLETED: { label: "Selesai", variant: "default", icon: <CheckCircle className="w-3 h-3" /> },
  VOIDED: { label: "Dibatalkan", variant: "destructive", icon: <XCircle className="w-3 h-3" /> },
  REFUNDED: { label: "Dikembalikan", variant: "secondary", icon: <ArrowLeft className="w-3 h-3" /> },
  HELD: { label: "Tertahan", variant: "outline", icon: <Clock className="w-3 h-3" /> },
};

export default function TransactionsPage() {
  const { currentStoreId } = useStore();
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState("ALL");

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders?limit=100${currentStoreId ? `&storeId=${currentStoreId}` : ""}`);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {
      toast.error("Gagal memuat transaksi");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchOrders();
  }, [currentStoreId]);

  const filteredOrders = React.useMemo(() => {
    let result = orders;
    if (statusFilter !== "ALL") {
      result = result.filter((o) => o.status === statusFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.user.fullName.toLowerCase().includes(q) ||
          o.customer?.name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [orders, searchQuery, statusFilter]);

  const handleViewDetail = (order: Order) => {
    setSelectedOrder(order);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Transaksi</h1>
          <p className="text-muted-foreground">Riwayat penjualan dan transaksi</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari nomor, kasir, pelanggan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full sm:w-64"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">Total Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">Selesai</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {orders.filter((o) => o.status === "COMPLETED").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">Total Pendapatan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {formatRupiah(orders.filter((o) => o.status === "COMPLETED").reduce((sum, o) => sum + o.total, 0))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">Dibatalkan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-red-600">
              {orders.filter((o) => o.status === "VOIDED").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["ALL", "COMPLETED", "VOIDED", "REFUNDED"].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(status)}
          >
            {status === "ALL" ? "Semua" : statusBadge[status]?.label}
          </Button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Pesanan</TableHead>
                  <TableHead className="hidden sm:table-cell">Tanggal</TableHead>
                  <TableHead className="hidden md:table-cell">Kasir</TableHead>
                  <TableHead className="hidden md:table-cell">Pelanggan</TableHead>
                  <TableHead className="hidden sm:table-cell">Pembayaran</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Memuat transaksi...
                    </TableCell>
                  </TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Tidak ada transaksi ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Receipt className="w-4 h-4 text-muted-foreground" />
                          {order.orderNumber}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{order.user.fullName}</TableCell>
                      <TableCell className="hidden md:table-cell">{order.customer?.name || "-"}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline">{paymentMethodLabel[order.payments[0]?.method] || "-"}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold">{formatRupiah(order.total)}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadge[order.status]?.variant || "default"} className="gap-1">
                          {statusBadge[order.status]?.icon}
                          {statusBadge[order.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewDetail(order)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Detail Pesanan
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nomor Pesanan</span>
                  <span className="font-bold">{selectedOrder.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tanggal</span>
                  <span>{new Date(selectedOrder.createdAt).toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kasir</span>
                  <span>{selectedOrder.user.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pelanggan</span>
                  <span>{selectedOrder.customer?.name || "Guest"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={statusBadge[selectedOrder.status]?.variant}>
                    {statusBadge[selectedOrder.status]?.label}
                  </Badge>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Item Pesanan</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        {item.productName} <span className="text-muted-foreground">x{item.quantity}</span>
                      </span>
                      <span className="font-medium">{formatRupiah(item.total)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatRupiah(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pajak</span>
                  <span>{formatRupiah(selectedOrder.taxAmount)}</span>
                </div>
                {selectedOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Diskon</span>
                    <span className="text-red-600">-{formatRupiah(selectedOrder.discountAmount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatRupiah(selectedOrder.total)}</span>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3">
                <h4 className="font-medium mb-1 text-sm">Pembayaran</h4>
                {selectedOrder.payments.map((payment) => (
                  <div key={payment.id} className="flex justify-between text-sm">
                    <span>{paymentMethodLabel[payment.method]}</span>
                    <span className="font-medium">{formatRupiah(payment.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
