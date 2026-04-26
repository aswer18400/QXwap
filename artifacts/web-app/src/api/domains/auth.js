export function createAuthApi(api, base) {
  return {
    me: () => api.get("/auth/me"),
    signup: (email, password) => api.post("/auth/signup", { email, password }),
    signin: (email, password) => api.post("/auth/signin", { email, password }),
    signout: () => api.post("/auth/signout", {}),
    replitLoginUrl: () => `${base}/auth/replit/login`,
  };
}
