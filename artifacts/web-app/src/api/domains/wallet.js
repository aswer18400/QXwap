export function createWalletApi(api, queryString) {
  return {
    get: () => api.get("/wallet"),
    transactions: (params = {}) => api.get(`/transactions${queryString(params)}`),
    deposit: (amount) => api.post("/wallet/deposit", { amount }),
  };
}
