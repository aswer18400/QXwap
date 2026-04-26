export function createShipmentsApi(api) {
  return {
    start: (offerId) => api.post(`/shipments/${offerId}/start`, {}),
    updateStep: (id, step) => api.post(`/shipments/${id}/update-step`, { step }),
    finish: (id) => api.post(`/shipments/${id}/finish`, {}),
    get: (offerId) => api.get(`/shipments/${offerId}`),
  };
}
