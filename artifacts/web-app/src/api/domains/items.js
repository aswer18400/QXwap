export function createItemsApi(api, queryString) {
  return {
    list: (params = {}) => api.get(`/items${queryString(params)}`),
    feed: () => api.get("/feed"),
    create: (payload) => api.post("/items", payload),
    update: (id, payload) => api.patch(`/items/${id}`, payload),
    remove: (id) => api.del(`/items/${id}`),
  };
}
