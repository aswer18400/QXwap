export function createProfilesApi(api) {
  return {
    me: () => api.get("/profiles/me"),
    get: (id) => api.get(`/profiles/${id}`),
    update: (payload) => api.patch("/profiles/me", payload),
  };
}
