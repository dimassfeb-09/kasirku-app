"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";
import { Store, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    organizationName: "",
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      toast.error("Password tidak cocok");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          organizationName: form.organizationName || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Registrasi gagal");
        setLoading(false);
        return;
      }

      toast.success("Registrasi berhasil!");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Terjadi kesalahan jaringan");
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      <Card className="relative w-full max-w-sm shadow-lg">
        <CardHeader className="items-center pb-2 pt-8">
          <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/10">
            <Store className="size-6 text-primary" />
          </div>
          <CardTitle className="text-xl font-semibold tracking-tight">Kasirku</CardTitle>
          <CardDescription>Buat akun baru</CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Nama Lengkap</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                value={form.fullName}
                onChange={(e) =>
                  setForm({ ...form, fullName: e.target.value })
                }
                autoFocus
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@kasirku.app"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="organizationName">Nama Toko (opsional)</Label>
              <Input
                id="organizationName"
                placeholder="Toko Saya"
                value={form.organizationName}
                onChange={(e) =>
                  setForm({ ...form, organizationName: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimal 6 karakter"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                required
                minLength={6}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Ulangi password"
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm({ ...form, confirmPassword: e.target.value })
                }
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {loading ? "Mendaftar..." : "Daftar"}
            </Button>
          </form>
          <div className="mt-6 text-center text-xs text-muted-foreground">
            Sudah punya akun?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Masuk
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
