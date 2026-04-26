export function createBookmarksApi(api) {
  return {
    list: () => api.get("/bookmarks"),
    save: (itemId) => api.post("/bookmarks", { itemId }),
    unsave: (itemId) =>
      api.del(`/bookmarks/${encodeURIComponent(String(itemId || ""))}`),
  };
}
