import { api } from "../lib/api";
import type { RewardItem, RewardRedemption, Wallet } from "../lib/types";

export const rewardService = {
  async listRewards(options?: { includeInactive?: boolean }) {
    const params = new URLSearchParams();
    if (options?.includeInactive) params.set("include_inactive", "true");
    const query = params.toString();
    const response = await api<{ rewards: RewardItem[] }>(`/rewards${query ? `?${query}` : ""}`);
    return response.rewards || [];
  },

  async getReward(rewardId: string) {
    const response = await api<{ reward: RewardItem }>(`/rewards/${rewardId}`);
    return response.reward;
  },

  async redeemReward(rewardId: string) {
    return await api<{ redemption: RewardRedemption; wallet: Wallet; reward: RewardItem | null }>(`/rewards/${rewardId}/redeem`, {
      method: "POST",
      body: JSON.stringify({})
    });
  },

  async listRedemptions() {
    const response = await api<{ redemptions: RewardRedemption[] }>("/reward-redemptions");
    return response.redemptions || [];
  }
};
