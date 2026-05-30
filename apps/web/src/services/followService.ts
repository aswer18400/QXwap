import { api } from "../lib/api";
import type { User } from "../lib/types";

export const followService = {
  async listFollowing() {
    const response = await api<{ follows: User[] }>("/follows");
    return response.follows || [];
  },

  async followUser(userId: string) {
    await api(`/follows/${userId}`, { method: "POST" });
  },

  async unfollowUser(userId: string) {
    await api(`/follows/${userId}`, { method: "DELETE" });
  }
};

