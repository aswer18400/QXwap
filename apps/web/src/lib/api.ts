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

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export class RateLimitError extends ApiError {
  retryAfter?: number;

  constructor(status: number, message: string, code?: string, retryAfter?: number) {
    super(status, message, code);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

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
  if (!res.ok) {
    const message = data.message || data.error || `API ${res.status}`;
    const code = typeof data.error === "string" ? data.error : undefined;
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after") || 0) || undefined;
      throw new RateLimitError(res.status, message, code, retryAfter);
    }
    throw new ApiError(res.status, message, code);
  }
  return data as T;
}

export {};
