export function createUploadsApi(uploadRequest) {
  return {
    images: async (files) => {
      const list = Array.from(files || []).filter(Boolean);
      if (!list.length) return { urls: [] };
      const form = new FormData();
      list.slice(0, 4).forEach((file) => form.append("images", file));
      return uploadRequest("/upload", form);
    },
  };
}
