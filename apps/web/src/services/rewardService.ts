import { api } from "../lib/api";
import type { RewardItem, RewardRedemption, Wallet } from "../lib/types";

export const rewardService = {
  async listRewards() {
    const response = await api<{ rewards: RewardItem[] }>("/rewards");
    return response.rewards || [];
  },

  async getReward(rewardId: string) {
    const response = await api<{ reward: RewardItem }>(`/rewards/${rewardId}`);
    return response.reward;
  },

  async redeemReward(rewardId: string) {
    return await api<{ redemption: RewardRedemption; wallet: Wallet }>(`/rewards/${rewardId}/redeem`, {
      method: "POST",
      body: JSON.stringify({})
    });
  }
};

