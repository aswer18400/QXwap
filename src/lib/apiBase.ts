function readWindowApiBase() {
  if (typeof window === "undefined") return undefined;
  const apiBase = (window as Window & { API_BASE?: unknown }).API_BASE;
  return typeof apiBase === "string" && apiBase.trim() ? apiBase : undefined;
}

export function getApiBase() {
  const configuredBase = readWindowApiBase()
    || import.meta.env.VITE_API_BASE
    || import.meta.env.VITE_API_URL
    || "/api";

  return configuredBase.replace(/\/+$/, "");
}

export function getApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBase()}${normalizedPath}`;
}
