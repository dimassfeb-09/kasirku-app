export type Role = "OWNER" | "MANAGER" | "CASHIER";

export type Permission =
  // Produk & Kategori
  | "products.view"
  | "products.create"
  | "products.edit"
  | "products.delete"
  | "categories.view"
  | "categories.create"
  | "categories.edit"
  | "categories.delete"
  // Pelanggan
  | "customers.view"
  | "customers.create"
  | "customers.edit"
  | "customers.delete"
  // Toko
  | "stores.view"
  | "stores.create"
  | "stores.edit"
  | "stores.delete"
  // User/Staff
  | "users.view"
  | "users.create"
  | "users.edit"
  | "users.delete"
  // Transaksi
  | "pos.use"
  | "orders.view_all"
  | "orders.view_own"
  // Laporan
  | "reports.view_all"
  | "reports.view_own"
  // Pengaturan
  | "settings.view"
  | "settings.edit";

const rolePermissions: Record<Role, Permission[]> = {
  OWNER: [
    "products.view",
    "products.create",
    "products.edit",
    "products.delete",
    "categories.view",
    "categories.create",
    "categories.edit",
    "categories.delete",
    "customers.view",
    "customers.create",
    "customers.edit",
    "customers.delete",
    "stores.view",
    "stores.create",
    "stores.edit",
    "stores.delete",
    "users.view",
    "users.create",
    "users.edit",
    "users.delete",
    "pos.use",
    "orders.view_all",
    "reports.view_all",
    "settings.view",
    "settings.edit",
  ],
  MANAGER: [
    "products.view",
    "products.create",
    "products.edit",
    "products.delete",
    "categories.view",
    "categories.create",
    "categories.edit",
    "categories.delete",
    "customers.view",
    "customers.create",
    "customers.edit",
    "customers.delete",
    "stores.view",
    "stores.edit",
    "users.view",
    "pos.use",
    "orders.view_all",
    "reports.view_all",
    "settings.view",
    "settings.edit",
  ],
  CASHIER: [
    "pos.use",
    "orders.view_own",
    "reports.view_own",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}
