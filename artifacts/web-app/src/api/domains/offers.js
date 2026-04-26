export function createOffersApi(api) {
  return {
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
}
