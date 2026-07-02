"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Search, Plus, Minus, Trash2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { CheckoutDialog } from "@/components/checkout-dialog";
import { useStore } from "@/lib/store-context";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  inventory?: { quantity: number }[];
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function POSPage() {
  const { currentStoreId } = useStore();
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
  const [cartOpen, setCartOpen] = React.useState(false);
  const [animatingProductId, setAnimatingProductId] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchProducts() {
      if (!currentStoreId) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/products?storeId=${currentStoreId}`);
        const data = await res.json();
        setProducts(data.products || []);
      } catch {
        toast.error("Gagal memuat produk");
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, [currentStoreId]);

  const handleCheckout = async (paymentMethod: string, paymentAmount: number, customerId?: string) => {
    if (!currentStoreId) {
      toast.error("Pilih toko terlebih dahulu");
      return;
    }

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId: currentStoreId,
        customerId: customerId || null,
        items: cart.map((item) => ({
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        paymentMethod,
        paymentAmount,
      }),
    });

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Gagal memproses respons server");
    }

    if (!res.ok) {
      throw new Error(data.error || "Gagal memproses pembayaran");
    }

    toast.success("Pembayaran berhasil!", {
      description: `Nomor pesanan: ${data.order.orderNumber}`,
    });
    setCart([]);
  };

  const filteredProducts = React.useMemo(() => {
    if (!searchQuery) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  const addToCart = (product: Product) => {
    // Trigger animation
    setAnimatingProductId(product.id);
    setTimeout(() => setAnimatingProductId(null), 300);

    setCart((prev) => {
      const existing = prev.find((c) => c.id === product.id);
      if (existing) {
        return prev.map((c) =>
          c.id === product.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.id === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c
        )
        .filter((c) => c.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((c) => c.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="-m-4 lg:-m-6 flex h-[calc(100vh-3.5rem)]">
      {/* Product Grid — always visible */}
      <div className="flex flex-1 flex-col min-w-0">
        <div className="border-b bg-card p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari produk atau scan barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Memuat produk...</p>
          ) : filteredProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {searchQuery ? "Produk tidak ditemukan" : "Belum ada produk. Tambahkan produk terlebih dahulu."}
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
              {filteredProducts.map((product) => {
                const stock = product.inventory?.[0]?.quantity ?? 0;
                const isOutOfStock = stock === 0;
                const isAnimating = animatingProductId === product.id;
                return (
                  <Card
                    key={product.id}
                    className={`aspect-square transition-all select-none ${
                      isOutOfStock
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer hover:border-primary hover:shadow-md active:scale-95"
                    } ${
                      isAnimating ? "animate-pulse scale-95" : ""
                    }`}
                    onClick={() => !isOutOfStock && addToCart(product)}
                  >
                    <CardContent className="flex flex-col items-center justify-center p-2 h-full text-center relative select-none">
                      {isOutOfStock && (
                        <Badge variant="destructive" className="absolute top-1 right-1 text-[8px] sm:text-[10px] px-1 py-0">
                          Habis
                        </Badge>
                      )}
                      <p className="font-medium text-xs sm:text-sm line-clamp-2 mb-auto select-none">{product.name}</p>
                      <p className={`font-bold text-xs sm:text-sm mt-auto select-none ${
                        isOutOfStock ? "text-muted-foreground" : "text-primary"
                      }`}>Rp {product.price.toLocaleString("id-ID")}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cart Panel — desktop only */}
      <div className="hidden lg:flex w-80 xl:w-96 border-l bg-card flex-col">
        <CartContent
          cart={cart}
          subtotal={subtotal}
          tax={tax}
          total={total}
          totalItems={totalItems}
          updateQuantity={updateQuantity}
          removeFromCart={removeFromCart}
          onCheckout={() => setCheckoutOpen(true)}
        />
      </div>

      {/* Mobile Cart FAB */}
      {cart.length > 0 && (
        <Button
          size="lg"
          className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg lg:hidden flex flex-col items-center justify-center gap-0 p-0"
          onClick={() => setCartOpen(true)}
        >
          <ShoppingCart className="h-5 w-5" />
          <span className="text-[10px] leading-none font-bold">{totalItems}</span>
        </Button>
      )}

      {/* Mobile Cart Sheet */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="bottom" className="h-[85vh] p-0" showCloseButton={false}>
          <CartContent
            cart={cart}
            subtotal={subtotal}
            tax={tax}
            total={total}
            totalItems={totalItems}
            updateQuantity={updateQuantity}
            removeFromCart={removeFromCart}
            onCheckout={() => {
              setCartOpen(false);
              setCheckoutOpen(true);
            }}
          />
        </SheetContent>
      </Sheet>

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        cart={cart}
        subtotal={subtotal}
        taxAmount={tax}
        total={total}
        onCheckout={handleCheckout}
      />
    </div>
  );
}

function CartContent({
  cart,
  subtotal,
  tax,
  total,
  totalItems,
  updateQuantity,
  removeFromCart,
  onCheckout,
}: {
  cart: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  totalItems: number;
  updateQuantity: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  onCheckout: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-2 border-b p-4">
        <ShoppingCart className="h-5 w-5" />
        <h2 className="font-semibold">Keranjang</h2>
        <Badge variant="secondary" className="ml-auto">
          {totalItems} item
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {cart.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Keranjang kosong
          </p>
        ) : (
          <div className="space-y-3">
            {cart.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Rp {item.price.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.id, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium">
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.id, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-sm font-medium w-20 text-right">
                    Rp {(item.price * item.quantity).toLocaleString("id-ID")}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => removeFromCart(item.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="border-t p-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>Rp {subtotal.toLocaleString("id-ID")}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Pajak (10%)</span>
          <span>Rp {tax.toLocaleString("id-ID")}</span>
        </div>
        <Separator />
        <div className="flex justify-between font-bold text-lg">
          <span>Total</span>
          <span>Rp {total.toLocaleString("id-ID")}</span>
        </div>
        <Button
          className="w-full"
          size="lg"
          disabled={cart.length === 0}
          onClick={onCheckout}
        >
          Bayar Rp {total.toLocaleString("id-ID")}
        </Button>
      </div>
    </>
  );
}
