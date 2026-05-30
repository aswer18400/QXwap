import { api } from "../lib/api";
import type { WantedItem } from "../lib/types";
import { buildQuery } from "./service-utils";

type WantedItemPayload = {
  title: string;
  description: string;
  category: string;
  deal_type?: "swap" | "sell" | "buy" | "both";
  wanted_text?: string;
  wanted_tags?: string[];
  reference_images?: string[];
  urgency?: "low" | "normal" | "high";
  status?: "active" | "inactive";
  location_label?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export const wantedItemService = {
  async listWantedItems(query: Record<string, string | number | boolean | undefined | null> = {}) {
    const qs = buildQuery(query);
    const response = await api<{ wanted_items: WantedItem[] }>(qs ? `/wanted-items?${qs}` : "/wanted-items");
    return response.wanted_items || [];
  },

  async getWantedItem(wantedItemId: string) {
    const response = await api<{ wanted_item: WantedItem }>(`/wanted-items/${wantedItemId}`);
    return response.wanted_item;
  },

  async createWantedItem(payload: WantedItemPayload) {
    const response = await api<{ wanted_item: WantedItem }>("/wanted-items", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return response.wanted_item;
  },

  async updateWantedItem(wantedItemId: string, payload: Partial<WantedItemPayload>) {
    const response = await api<{ wanted_item: WantedItem }>(`/wanted-items/${wantedItemId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
    return response.wanted_item;
  },

  async deleteWantedItem(wantedItemId: string) {
    await api(`/wanted-items/${wantedItemId}`, { method: "DELETE" });
  }
};
