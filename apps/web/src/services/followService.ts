import { api } from "../lib/api";
import type { User } from "../lib/types";

export const followService = {
  async listFollowing() {
    const response = await api<{ follows: User[] }>("/follows");
    return response.follows || [];
  },

  async listFollowers(userId: string) {
    const response = await api<{ profiles: User[] }>(`/profiles/${userId}/followers`);
    return response.profiles || [];
  },

  async listFollowingByUser(userId: string) {
    const response = await api<{ profiles: User[] }>(`/profiles/${userId}/following`);
    return response.profiles || [];
  },

  async followUser(userId: string) {
    await api(`/follows/${userId}`, { method: "POST" });
  },

  async unfollowUser(userId: string) {
    await api(`/follows/${userId}`, { method: "DELETE" });
  }
};
