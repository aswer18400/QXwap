import { api } from "../lib/api";
import type { User, UserProfile } from "../lib/types";
import { buildQuery } from "./service-utils";

type UpdateProfilePayload = Partial<Pick<User, "display_name" | "username" | "city" | "bio" | "avatar_url" | "latitude" | "longitude">>;

export const profileService = {
  async getCurrentProfile() {
    const response = await api<{ profile: UserProfile }>("/profiles/me");
    return response.profile;
  },

  async updateCurrentProfile(payload: UpdateProfilePayload) {
    const response = await api<{ profile: UserProfile }>("/profiles/me", {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
    return response.profile;
  },

  async listProfiles(query?: { q?: string }) {
    const qs = buildQuery(query || {});
    const response = await api<{ profiles: UserProfile[] }>(qs ? `/profiles?${qs}` : "/profiles");
    return response.profiles || [];
  },

  async getProfile(profileId: string) {
    const response = await api<{ profile: UserProfile }>(`/profiles/${profileId}`);
    return response.profile;
  }
};

