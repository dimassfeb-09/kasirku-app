"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Lock, Save, Building, Store } from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  organization: { name: string };
  storeAssignments: { store: { id: string; name: string } }[];
}

const roleLabels: Record<string, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  CASHIER: "Kasir",
};

export default function ProfilePage() {
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/users/me");
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        setFullName(data.user.fullName);
        setEmail(data.user.email);
      }
    } catch {
      toast.error("Gagal memuat profil");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async () => {
    if (!fullName || !email) {
      toast.error("Nama dan email harus diisi");
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      toast.error("Password baru tidak cocok");
      return;
    }

    if (newPassword && !currentPassword) {
      toast.error("Password lama harus diisi");
      return;
    }

    setSaving(true);
    try {
      const body: any = { fullName, email };
      if (newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }

      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Gagal menyimpan");
        return;
      }

      toast.success("Profil berhasil diupdate");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      fetchProfile();
    } catch {
      toast.error("Gagal menyimpan data");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Memuat profil...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Profil tidak ditemukan</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Profil Saya</h1>
        <p className="text-muted-foreground">Kelola informasi akun Anda</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informasi Pribadi
          </CardTitle>
          <CardDescription>Update nama dan email Anda</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nama Lengkap</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Masukkan nama lengkap"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@kasirku.app"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Ubah Password
          </CardTitle>
          <CardDescription>Kosongkan jika tidak ingin mengubah password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Password Lama</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Masukkan password lama"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">Password Baru</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Masukkan password baru"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi password baru"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Akun</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              Role
            </span>
            <Badge variant="secondary">{roleLabels[user.role] || user.role}</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-2">
              <Building className="h-4 w-4" />
              Organisasi
            </span>
            <span className="font-medium">{user.organization.name}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-2">
              <Store className="h-4 w-4" />
              Toko
            </span>
            <span className="font-medium">
              {user.storeAssignments.map((a) => a.store.name).join(", ") || "-"}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
      </div>
    </div>
  );
}
