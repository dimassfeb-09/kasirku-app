import { toast } from "sonner";
import { queueMutation } from "./offline-queue";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export async function apiFetch<T = unknown>(
  url: string,
  options: { method?: HttpMethod; body?: unknown; headers?: Record<string, string> } = {}
): Promise<T> {
  const { method = "GET", body, headers } = options;
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  if (isMutation && typeof navigator !== "undefined" && !navigator.onLine) {
    await queueMutation(url, method, body);
    toast.success("Data disimpan secara offline dan akan dikirim saat koneksi tersedia");
    return {} as T;
  }

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  if (res.status === 204) return {} as T;
  return res.json();
}
