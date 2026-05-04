const PROD_API_BASE = "https://qxwap-api.onrender.com/api";

function getWindowApiBase() {
  if (typeof window === "undefined") return "";
  const value = (window as Window & { API_BASE?: unknown }).API_BASE;
  return typeof value === "string" ? value : "";
}

export function resolveApiBase() {
  const configured =
    getWindowApiBase() ||
    import.meta.env.VITE_API_BASE ||
    import.meta.env.VITE_API_URL ||
    "";

  const trimmed = configured.replace(/\/+$/, "");
  if (trimmed) return trimmed;

  return import.meta.env.PROD ? PROD_API_BASE : "/api";
}

