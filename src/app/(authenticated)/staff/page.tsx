"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Plus, Pencil, Trash2, UserCheck, UserX, Store } from "lucide-react";
import { toast } from "sonner";
import { StaffForm } from "@/components/staff-form";

interface StoreAssignment {
  store: { id: string; name: string };
}

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  storeAssignments: StoreAssignment[];
  _count: { orders: number };
}

interface Store {
  id: string;
  name: string;
}

const roleLabels: Record<string, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  CASHIER: "Kasir",
};

const roleBadgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  OWNER: "default",
  MANAGER: "secondary",
  CASHIER: "outline",
};

export default function StaffPage() {
  const [users, setUsers] = React.useState<User[]>([]);
  const [stores, setStores] = React.useState<Store[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<User | null>(null);
  const [deleteUser, setDeleteUser] = React.useState<User | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, storesRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/stores"),
      ]);
      const usersData = await usersRes.json();
      const storesData = await storesRes.json();
      setUsers(usersData.users || []);
      setStores(storesData.stores || []);
    } catch {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const filteredUsers = React.useMemo(() => {
    if (!searchQuery) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditingUser(null);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    try {
      const res = await fetch(`/api/users/${deleteUser.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus");
      toast.success("Staff berhasil dihapus");
      setDeleteUser(null);
      fetchData();
    } catch {
      toast.error("Gagal menghapus staff");
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (!res.ok) throw new Error("Gagal update");
      toast.success(`Staff berhasil ${user.isActive ? "dinonaktifkan" : "diaktifkan"}`);
      fetchData();
    } catch {
      toast.error("Gagal update status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Staff</h1>
          <p className="text-muted-foreground">Kelola pengguna dan penugasan toko</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari nama, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Tambah Staff
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Staff</p>
            <p className="text-2xl font-bold">{users.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Aktif</p>
            <p className="text-2xl font-bold text-green-600">
              {users.filter((u) => u.isActive).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Manager</p>
            <p className="text-2xl font-bold">
              {users.filter((u) => u.role === "MANAGER").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Kasir</p>
            <p className="text-2xl font-bold">
              {users.filter((u) => u.role === "CASHIER").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">Toko</TableHead>
                  <TableHead className="hidden sm:table-cell">Transaksi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Memuat data...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Tidak ada staff ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium">{user.fullName}</div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant={roleBadgeVariant[user.role] || "default"}>
                          {roleLabels[user.role] || user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {user.storeAssignments.length === 0 ? (
                            <span className="text-xs text-muted-foreground">-</span>
                          ) : (
                            user.storeAssignments.map((a) => (
                              <Badge key={a.store.id} variant="outline" className="text-xs">
                                <Store className="w-3 h-3 mr-1" />
                                {a.store.name}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{user._count.orders}</TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "default" : "destructive"}>
                          {user.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleToggleActive(user)}
                          >
                            {user.isActive ? (
                              <UserX className="h-4 w-4 text-orange-500" />
                            ) : (
                              <UserCheck className="h-4 w-4 text-green-500" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <StaffForm
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editingUser}
        stores={stores}
        onSuccess={fetchData}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Staff?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteUser?.fullName} akan dihapus dari sistem. Tindakan ini tidak dapat dibatalkan.
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
