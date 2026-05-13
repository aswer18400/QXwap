declare global {
  interface Window {
    API_BASE?: string;
  }
}

function normalizeApiBase() {
  const raw = (window.API_BASE || import.meta.env.VITE_API_BASE || "/api")
    .trim()
    .replace(/\/+$/, "");
  if (!raw || raw === "/api") return "/api";
  return raw.endsWith("/api") ? raw : `${raw}/api`;
}

export const API = normalizeApiBase();

export const asset = (url?: string) =>
  !url ? "" : url.startsWith("/uploads") ? `${API.replace(/\/api$/, "")}${url}` : url;

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers:
      init.body instanceof FormData
        ? undefined
        : { "Content-Type": "application/json", ...(init.headers || {}) },
    ...init
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || `API ${res.status}`);
  return data as T;
}

export {};
