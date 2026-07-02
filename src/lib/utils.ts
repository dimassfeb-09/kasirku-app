import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "Tunai",
  CARD: "Kartu",
  EWALLET: "E-Wallet",
  QRIS: "QRIS",
  TRANSFER: "Transfer",
  OTHER: "Lainnya",
};

export const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  COMPLETED: { label: "Selesai", variant: "default" },
  VOIDED: { label: "Dibatalkan", variant: "destructive" },
  REFUNDED: { label: "Dikembalikan", variant: "secondary" },
  HELD: { label: "Tertahan", variant: "outline" },
};
