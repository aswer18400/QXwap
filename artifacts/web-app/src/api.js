const BASE = "/api";

async function request(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg = data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export const api = {
  get: (p) => request("GET", p),
  post: (p, body) => request("POST", p, body),
  patch: (p, body) => request("PATCH", p, body),
  del: (p) => request("DELETE", p),
};

export const auth = {
  me: () => api.get("/auth/me"),
  signup: (email, password) => api.post("/auth/signup", { email, password }),
  signin: (email, password) => api.post("/auth/signin", { email, password }),
  signout: () => api.post("/auth/signout", {}),
  replitLoginUrl: () => `${BASE}/auth/replit/login`,
};

export const items = {
  list: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
    ).toString();
    return api.get(`/items${qs ? "?" + qs : ""}`);
  },
  feed: () => api.get("/feed"),
  create: (payload) => api.post("/items", payload),
};

export const offers = {
  list: () => api.get("/offers/mine"),
  create: (payload) => api.post("/offers", payload),
  updateStatus: (id, status) => api.patch(`/offers/${id}`, { status }),
};

export const profiles = {
  get: (id) => api.get(`/profiles/${id}`),
};

export const bookmarks = {
  list: () => api.get("/bookmarks"),
  save: (itemId) => api.post("/bookmarks", { itemId }),
  unsave: (itemId) =>
    api.del(`/bookmarks/${encodeURIComponent(String(itemId || ""))}`),
};
