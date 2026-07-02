"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatRupiah } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Banknote,
  CreditCard,
  Smartphone,
  QrCode,
  Landmark,
  Receipt,
  Search,
  User,
  X,
  Check,
} from "lucide-react";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Customer {
  id: string;
  name: string;
  phone?: string | null;
}

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  onCheckout: (paymentMethod: string, paymentAmount: number, customerId?: string) => Promise<void>;
}

const paymentMethods = [
  { id: "CASH", label: "Tunai", icon: Banknote, color: "bg-green-500" },
  { id: "CARD", label: "Kartu", icon: CreditCard, color: "bg-blue-500" },
  { id: "EWALLET", label: "E-Wallet", icon: Smartphone, color: "bg-purple-500" },
  { id: "QRIS", label: "QRIS", icon: QrCode, color: "bg-orange-500" },
  { id: "TRANSFER", label: "Transfer", icon: Landmark, color: "bg-indigo-500" },
];

const formatInputNumber = (value: string) => {
  const raw = value.replace(/\D/g, "");
  const cleaned = raw.replace(/^0+/, "") || "";
  return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseInputNumber = (formatted: string) => {
  return parseInt(formatted.replace(/\./g, ""), 10) || 0;
};

export function CheckoutDialog({
  open,
  onOpenChange,
  cart,
  subtotal,
  taxAmount,
  total,
  onCheckout,
}: CheckoutDialogProps) {
  const [selectedMethod, setSelectedMethod] = useState("CASH");
  const [cashAmount, setCashAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || null;

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch("/api/customers?limit=100");
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (open) {
      setSelectedMethod("CASH");
      setCashAmount("");
      setSelectedCustomerId(null);
      setCustomerSearch("");
      setShowCustomerDropdown(false);
      fetchCustomers();
    }
  }, [open, fetchCustomers]);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const cashReceived = selectedMethod === "CASH" ? parseInputNumber(cashAmount) : total;
  const change = cashReceived - total;

  const canPay =
    (selectedMethod !== "CASH" || cashReceived >= total) && !isProcessing;

  const handlePay = async () => {
    if (!canPay) return;
    setIsProcessing(true);
    try {
      await onCheckout(selectedMethod, cashReceived, selectedCustomer?.id);
      onOpenChange(false);
    } catch (error) {
      console.error("Checkout failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-4xl max-h-[95vh] overflow-y-auto p-0 gap-0"
      >
        <div className="p-5 sm:p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl sm:text-2xl font-bold">Pembayaran</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            {/* Left Column - Customer & Order Summary */}
            <div className="md:col-span-2 space-y-6">
              {/* Customer Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Pelanggan (Opsional)
                </Label>
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Cari nama atau telepon..."
                        value={selectedCustomer ? selectedCustomer.name : customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          setSelectedCustomerId(null);
                          setShowCustomerDropdown(true);
                        }}
                        onFocus={() => setShowCustomerDropdown(true)}
                        onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                        className="pl-9"
                      />
                    </div>
                    {selectedCustomer && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => {
                          setSelectedCustomerId(null);
                          setCustomerSearch("");
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {showCustomerDropdown && !selectedCustomer && (
                    <div className="absolute z-[60] top-full mt-1 w-full bg-card border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      <button
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 border-b"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedCustomerId(null);
                          setShowCustomerDropdown(false);
                          setCustomerSearch("");
                        }}
                      >
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Guest (Tanpa Pelanggan)</span>
                      </button>
                      {filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSelectedCustomerId(customer.id);
                            setCustomerSearch("");
                            setShowCustomerDropdown(false);
                          }}
                        >
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            {customer.phone && (
                              <p className="text-xs text-muted-foreground">{customer.phone}</p>
                            )}
                          </div>
                          {selectedCustomerId === customer.id && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </button>
                      ))}
                      {filteredCustomers.length === 0 && (
                        <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                          Tidak ada pelanggan ditemukan
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {selectedCustomer && (
                  <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                    <User className="w-4 h-4 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{selectedCustomer.name}</p>
                      {selectedCustomer.phone && (
                        <p className="text-xs text-muted-foreground">{selectedCustomer.phone}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      Terpilih
                    </Badge>
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-sm">Ringkasan Pesanan ({cart.length} item)</h4>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground truncate mr-3">
                        {item.name}
                        <span className="ml-1 text-xs">x{item.quantity}</span>
                      </span>
                      <span className="font-medium shrink-0">
                        {formatRupiah(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatRupiah(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pajak</span>
                    <span>{formatRupiah(taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold border-t pt-3 mt-3">
                    <span>Total</span>
                    <span className="text-primary">{formatRupiah(total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Payment */}
            <div className="md:col-span-3 space-y-6">
              {/* Payment Method */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Metode Pembayaran</Label>
                <div className="flex flex-wrap gap-3">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    const isSelected = selectedMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setSelectedMethod(method.id)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all flex-1 min-w-[80px] ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-transparent bg-muted hover:bg-muted/80"
                        }`}
                      >
                        <div
                          className={`w-11 h-11 rounded-full flex items-center justify-center text-white ${method.color}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-medium">{method.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cash Input */}
              {selectedMethod === "CASH" && (
                <div className="space-y-4">
                  <Label htmlFor="cash" className="text-sm font-semibold">Uang Diterima</Label>
                  <Input
                    id="cash"
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(formatInputNumber(e.target.value))}
                    className="text-lg font-semibold h-12"
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {(() => {
                      const denominations = [10000, 20000, 50000, 100000];
                      const quickAmounts = [
                        total,
                        ...denominations
                          .map((d) => Math.ceil(total / d) * d)
                          .filter((v, i, a) => a.indexOf(v) === i && v !== total),
                      ].slice(0, 4);
                      return quickAmounts.map((amount) => (
                        <Button
                          key={amount}
                          variant="outline"
                          size="sm"
                          onClick={() => setCashAmount(formatInputNumber(String(amount)))}
                          className="text-sm h-10"
                          type="button"
                        >
                          {formatRupiah(amount)}
                        </Button>
                      ));
                    })()}
                  </div>
                  {cashReceived > 0 && (
                    <div className={`flex justify-between text-lg font-bold p-5 rounded-xl ${change >= 0 ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                      <span>Kembalian</span>
                      <span>{formatRupiah(Math.max(0, change))}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Non-cash info */}
              {selectedMethod !== "CASH" && (
                <div className="bg-muted/50 rounded-xl p-5 text-center space-y-2">
                  <div className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center text-white ${paymentMethods.find((m) => m.id === selectedMethod)?.color}`}>
                    {(() => {
                      const MethodIcon = paymentMethods.find((m) => m.id === selectedMethod)?.icon;
                      return MethodIcon ? <MethodIcon className="w-7 h-7" /> : null;
                    })()}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Pastikan pembayaran <span className="font-semibold text-foreground">{paymentMethods.find((m) => m.id === selectedMethod)?.label}</span> sebesar{" "}
                    <span className="font-bold text-foreground">{formatRupiah(total)}</span> sudah diterima.
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-8 pt-5 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Batal
            </Button>
            <Button onClick={handlePay} disabled={!canPay} className="w-full sm:w-auto gap-2 h-11 px-8">
              <Receipt className="w-4 h-4" />
              {isProcessing ? "Memproses..." : "Bayar Sekarang"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
