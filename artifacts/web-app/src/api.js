const rawApiBase =
  (typeof window !== "undefined" && window.__API_BASE__) ||
  import.meta.env?.VITE_API_BASE ||
  "/api";

const BASE = String(rawApiBase).replace(/\/$/, "");

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

async function uploadRequest(path, formData) {
  const res = await fetch(BASE + path, {
    method: "POST",
    credentials: "include",
    body: formData,
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

function qs(params = {}) {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
  ).toString();
  return q ? "?" + q : "";
}

export const items = {
  list: (params = {}) => api.get(`/items${qs(params)}`),
  feed: () => api.get("/feed"),
  create: (payload) => api.post("/items", payload),
  update: (id, payload) => api.patch(`/items/${id}`, payload),
  remove: (id) => api.del(`/items/${id}`),
};

export const offers = {
  list: () => api.get("/offers"),
  sent: () => api.get("/offers/sent"),
  received: () => api.get("/offers/received"),
  get: (id) => api.get(`/offers/${id}`),
  create: (payload) => api.post("/offers", payload),
  accept: (id) => api.post(`/offers/${id}/accept`, {}),
  reject: (id) => api.post(`/offers/${id}/reject`, {}),
  cancel: (id) => api.post(`/offers/${id}/cancel`, {}),
  confirm: (id) => api.post(`/offers/${id}/confirm`, {}),
};

export const profiles = {
  me: () => api.get("/profiles/me"),
  get: (id) => api.get(`/profiles/${id}`),
  update: (payload) => api.patch("/profiles/me", payload),
};

export const bookmarks = {
  list: () => api.get("/bookmarks"),
  save: (itemId) => api.post("/bookmarks", { itemId }),
  unsave: (itemId) =>
    api.del(`/bookmarks/${encodeURIComponent(String(itemId || ""))}`),
};

export const wallet = {
  get: () => api.get("/wallet"),
  transactions: (params = {}) => api.get(`/transactions${qs(params)}`),
  deposit: (amount) => api.post("/wallet/deposit", { amount }),
};

export const notifications = {
  list: () => api.get("/notifications"),
  markRead: (ids) => api.post("/notifications/read", ids ? { ids } : {}),
};

export const deals = {
  mine: () => api.get("/deals/mine"),
  get: (id) => api.get(`/deals/${id}`),
  updateStage: (id, stage) => api.patch(`/deals/${id}/stage`, { stage }),
  updateLogistics: (id, payload) => api.patch(`/deals/${id}/logistics`, payload),
};

export const shipments = {
  start: (offerId) => api.post(`/shipments/${offerId}/start`, {}),
  updateStep: (id, step) => api.post(`/shipments/${id}/update-step`, { step }),
  finish: (id) => api.post(`/shipments/${id}/finish`, {}),
  get: (offerId) => api.get(`/shipments/${offerId}`),
};

export const chat = {
  conversations: () => api.get("/chat/conversations"),
  messages: (convId) => api.get(`/chat/conversations/${convId}/messages`),
  send: (convId, text) => api.post(`/chat/conversations/${convId}/messages`, { text }),
};

export const uploads = {
  images: async (files) => {
    const list = Array.from(files || []).filter(Boolean);
    if (!list.length) return { urls: [] };
    const form = new FormData();
    list.slice(0, 4).forEach((file) => form.append("images", file));
    return uploadRequest("/upload", form);
  },
};
