import { api } from "../lib/api";

export const mediaService = {
  async uploadImages(files: File[]) {
    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));
    const response = await api<{ urls: string[] }>("/upload", {
      method: "POST",
      body: formData
    });
    return response.urls || [];
  },

  async cleanupUploads(urls: string[]) {
    if (!urls.length) return;
    await api("/upload/cleanup", {
      method: "POST",
      body: JSON.stringify({ urls })
    });
  }
};

