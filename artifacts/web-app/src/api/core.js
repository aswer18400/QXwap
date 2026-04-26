const rawApiBase =
  (typeof window !== "undefined" && window.__API_BASE__) ||
  import.meta.env?.VITE_API_BASE ||
  "/api";

export const BASE = String(rawApiBase).replace(/\/$/, "");

function parseJsonSafe(res) {
  return res.json().catch(() => null);
}

function toErrorMessage(data, status) {
  return data?.error || `HTTP ${status}`;
}

export async function request(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(toErrorMessage(data, res.status));
  return data;
}

export async function uploadRequest(path, formData) {
  const res = await fetch(BASE + path, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(toErrorMessage(data, res.status));
  return data;
}

export function queryString(params = {}) {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
  ).toString();
  return q ? "?" + q : "";
}
