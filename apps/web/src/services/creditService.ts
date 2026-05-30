import { api } from "../lib/api";
import type { Transaction, Wallet } from "../lib/types";

export const creditService = {
  async getWallet() {
    const response = await api<{ wallet: Wallet }>("/wallet");
    return response.wallet;
  },

  async getTransactions() {
    const response = await api<{ transactions: Transaction[] }>("/transactions");
    return response.transactions || [];
  },

  async depositCredits(amount: number) {
    const response = await api<{ wallet: Wallet }>("/wallet/deposit", {
      method: "POST",
      body: JSON.stringify({ amount })
    });
    return response.wallet;
  },

  async applyRule(rule_key: string, source_id?: string) {
    return await api<{ wallet: Wallet; transaction: Transaction | null }>("/credits/apply-rule", {
      method: "POST",
      body: JSON.stringify({ rule_key, source_id })
    });
  }
};

