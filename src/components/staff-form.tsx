"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface Store {
  id: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  storeAssignments: { store: { id: string; name: string } }[];
}

interface StaffFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
  stores: Store[];
  onSuccess: () => void;
}

const roles = [
  { value: "MANAGER", label: "Manager" },
  { value: "CASHIER", label: "Kasir" },
];

export function StaffForm({ open, onOpenChange, user, stores, onSuccess }: StaffFormProps) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [role, setRole] = React.useState("CASHIER");
  const [selectedStoreIds, setSelectedStoreIds] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isEditing = !!user;

  React.useEffect(() => {
    if (open) {
      if (user) {
        setEmail(user.email);
        setPassword("");
        setFullName(user.fullName);
        setRole(user.role);
        setSelectedStoreIds(user.storeAssignments.map((a) => a.store.id));
      } else {
        setEmail("");
        setPassword("");
        setFullName("");
        setRole("CASHIER");
        setSelectedStoreIds([]);
      }
    }
  }, [open, user]);

  const toggleStore = (storeId: string) => {
    setSelectedStoreIds((prev) =>
      prev.includes(storeId) ? prev.filter((id) => id !== storeId) : [...prev, storeId]
    );
  };

  const handleSubmit = async () => {
    if (!fullName || !email || (!isEditing && !password)) return;

    setIsSubmitting(true);
    try {
      const url = isEditing ? `/api/users/${user.id}` : "/api/users";
      const method = isEditing ? "PUT" : "POST";

      const body: any = {
        fullName,
        email,
        role,
        storeIds: selectedStoreIds,
      };

      if (password) {
        body.password = password;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Gagal menyimpan");
        return;
      }

      toast.success(isEditing ? "Staff berhasil diupdate" : "Staff berhasil ditambahkan");
      onSuccess();
      onOpenChange(false);
    } catch {
      toast.error("Gagal menyimpan data");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {isEditing ? "Edit Staff" : "Tambah Staff Baru"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nama Lengkap *</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Masukkan nama lengkap"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@kasirku.app"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              Password {isEditing ? "(kosongkan jika tidak diubah)" : "*"}
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEditing ? "••••••••" : "Masukkan password"}
            />
          </div>

          <div className="space-y-2">
            <Label>Role *</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Penugasan Toko</Label>
            <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
              {stores.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada toko</p>
              ) : (
                stores.map((store) => (
                  <div key={store.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`store-${store.id}`}
                      checked={selectedStoreIds.includes(store.id)}
                      onCheckedChange={() => toggleStore(store.id)}
                    />
                    <Label htmlFor={`store-${store.id}`} className="text-sm cursor-pointer">
                      {store.name}
                    </Label>
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Pilih toko yang dapat diakses staff ini
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!fullName || !email || (!isEditing && !password) || isSubmitting}
          >
            {isSubmitting ? "Menyimpan..." : isEditing ? "Simpan" : "Tambah"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
