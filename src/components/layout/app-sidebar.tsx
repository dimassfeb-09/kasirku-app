"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { hasPermission, hasAnyPermission, type Role, type Permission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tag,
  Users,
  BarChart3,
  Settings,
  Store,
  Menu,
  Receipt,
  UserCog,
  Warehouse,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: Permission;
  permissions?: Permission[];
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "POS / Checkout", icon: ShoppingCart, permission: "pos.use" },
  { href: "/transactions", label: "Transaksi", icon: Receipt, permissions: ["orders.view_all", "orders.view_own"] },
  { href: "/products", label: "Produk", icon: Package, permission: "products.view" },
  { href: "/inventory", label: "Persediaan", icon: Warehouse, permission: "products.view" },
  { href: "/categories", label: "Kategori", icon: Tag, permission: "categories.view" },
  { href: "/customers", label: "Pelanggan", icon: Users, permission: "customers.view" },
  { href: "/stores", label: "Toko", icon: Store, permission: "stores.view" },
  { href: "/staff", label: "Staff", icon: UserCog, permission: "users.view" },
  { href: "/reports", label: "Laporan", icon: BarChart3, permissions: ["reports.view_all", "reports.view_own"] },
  { href: "/settings", label: "Pengaturan", icon: Settings, permission: "settings.view" },
];

function SidebarContent({ userRole }: { userRole: Role }) {
  const pathname = usePathname();

  const filteredItems = navItems.filter((item) => {
    if (item.permissions) return hasAnyPermission(userRole, item.permissions);
    if (item.permission) return hasPermission(userRole, item.permission);
    return true;
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b px-4 lg:px-6">
        <Link href="/dashboard" className="text-xl font-bold">
          Kasirku
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3 lg:p-4">
        {filteredItems.map((item) => {
          const isActive =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function AppSidebar({ userRole }: { userRole: string }) {
  const [open, setOpen] = React.useState(false);
  const role = userRole as Role;

  return (
    <>
      {/* Mobile sidebar */}
      <div className="flex shrink-0 items-center border-b bg-card px-4 lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-14 w-14">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SidebarContent userRole={role} />
          </SheetContent>
        </Sheet>
        <Link
          href="/dashboard"
          className="ml-2 text-xl font-bold lg:hidden"
        >
          Kasirku
        </Link>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-card lg:block">
        <SidebarContent userRole={role} />
      </aside>
    </>
  );
}
