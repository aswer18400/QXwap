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

// Thrown when the backend returns 429 RATE_LIMITED. Carries the
// retry-after value so the UI can show a friendly countdown.
export class RateLimitError extends Error {
  retryAfterSec: number;
  requestId?: string;
  constructor(message: string, retryAfterSec: number, requestId?: string) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfterSec = retryAfterSec;
    this.requestId = requestId;
  }
}

// Thrown for any other API error. `requestId` is the value the server echoed
// in the response body (or response header); useful when reporting an issue.
export class ApiError extends Error {
  status: number;
  code?: string;
  requestId?: string;
  constructor(message: string, status: number, code?: string, requestId?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
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
    const requestId = data?.requestId || res.headers.get("x-request-id") || undefined;
    if (res.status === 429 || data?.error === "RATE_LIMITED") {
      const retryFromBody = Number(data?.retry_after_sec);
      const retryFromHeader = Number(res.headers.get("retry-after"));
      const retryAfterSec = Number.isFinite(retryFromBody) && retryFromBody > 0
        ? retryFromBody
        : Number.isFinite(retryFromHeader) && retryFromHeader > 0
          ? retryFromHeader
          : 30;
      const friendly = data?.message || `ลองอีกครั้งใน ${retryAfterSec} วินาที`;
      throw new RateLimitError(friendly, retryAfterSec, requestId);
    }
    throw new ApiError(
      data?.message || data?.error || `API ${res.status}`,
      res.status,
      data?.error,
      requestId
    );
  }
  return data as T;
}

export {};
