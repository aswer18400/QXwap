export function createNotificationsApi(api) {
  return {
    list: () => api.get("/notifications"),
    markRead: (ids) => api.post("/notifications/read", ids ? { ids } : {}),
  };
}
