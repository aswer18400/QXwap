import { resolveApiBase } from "@/lib/apiBase";

const API_BASE_URL = resolveApiBase();

export class ApiClientError extends Error {
  status?: number;
  url: string;
  contentType?: string;
  responsePreview?: string;
  payload?: unknown;

  constructor(
    message: string,
    options: {
      status?: number;
      url: string;
      contentType?: string;
      responsePreview?: string;
      payload?: unknown;
    },
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = options.status;
    this.url = options.url;
    this.contentType = options.contentType;
    this.responsePreview = options.responsePreview;
    this.payload = options.payload;
  }
}

function getApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const data = payload as { message?: unknown; error?: unknown };
    if (typeof data.message === "string" && data.message.trim()) return data.message;
    if (typeof data.error === "string" && data.error.trim()) return data.error;
  }
  return fallback;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = getApiUrl(path);
  const response = await fetch(url, {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.toLowerCase().includes("application/json");

  if (!isJson) {
    const text = await response.text();
    const responsePreview = text.slice(0, 300);

    console.error("[apiClient] API did not return JSON", {
      url,
      status: response.status,
      contentType,
      responsePreview,
    });

    throw new ApiClientError("ไม่สามารถเชื่อมต่อ API ได้ กรุณาตรวจสอบ Backend URL", {
      status: response.status,
      url,
      contentType,
      responsePreview,
    });
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    console.error("[apiClient] Failed to parse JSON response", {
      url,
      status: response.status,
      contentType,
      error,
    });

    throw new ApiClientError("ไม่สามารถอ่านข้อมูลจาก API ได้", {
      status: response.status,
      url,
      contentType,
    });
  }

  if (!response.ok) {
    throw new ApiClientError(getErrorMessage(data, "API request failed"), {
      status: response.status,
      url,
      contentType,
      payload: data,
    });
  }

  return data as T;
}
