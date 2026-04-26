export function createDealsApi(api) {
  return {
    mine: () => api.get("/deals/mine"),
    get: (id) => api.get(`/deals/${id}`),
    updateStage: (id, stage) => api.patch(`/deals/${id}/stage`, { stage }),
    updateLogistics: (id, payload) => api.patch(`/deals/${id}/logistics`, payload),
  };
}
