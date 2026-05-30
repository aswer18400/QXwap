import { api } from "../lib/api";
import type { User } from "../lib/types";

type AuthPayload = {
  email: string;
  password: string;
  display_name?: string;
};

export const userService = {
  async getCurrentUser() {
    const response = await api<{ user: User | null }>("/auth/me");
    return response.user;
  },

  async signIn(payload: AuthPayload) {
    const response = await api<{ user: User }>("/auth/signin", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return response.user;
  },

  async signUp(payload: AuthPayload) {
    const response = await api<{ user: User }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return response.user;
  },

  async signOut() {
    await api("/auth/signout", { method: "POST" });
  },

  async deleteAccount() {
    await api("/auth/account", { method: "DELETE" });
  }
};

