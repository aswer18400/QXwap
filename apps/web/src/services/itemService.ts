import { api } from "../lib/api";
import type { HashtagStat, Item, ItemListPage, LocationOption } from "../lib/types";
import { buildQuery } from "./service-utils";

type ItemQuery = Record<string, string | number | boolean | undefined | null>;

type ItemPayload = {
  title: string;
  description?: string;
  category?: string;
  condition?: string;
  deal_type: "swap" | "sell" | "buy" | "both";
  status?: "active" | "inactive" | "pending_swap" | "swapped";
  price_cash?: number;
  price_cash_unknown?: boolean;
  price_credit?: number;
  open_to_offers?: boolean;
  wanted_text?: string;
  wanted_tags?: string[];
  location_label?: string;
  latitude?: number | null;
  longitude?: number | null;
  images?: string[];
};

export const itemService = {
  async listItems(query: ItemQuery = {}) {
    const qs = buildQuery(query);
    return await api<ItemListPage>(qs ? `/items?${qs}` : "/items");
  },

  async searchItems(query: ItemQuery = {}) {
    return this.listItems(query);
  },

  async getItemDetail(itemId: string) {
    return await api<{ item: Item; related: Item[] }>(`/items/${itemId}`);
  },

  async createItem(payload: ItemPayload, idempotencyKey?: string) {
    const headers = idempotencyKey ? { "x-idempotency-key": idempotencyKey } : undefined;
    const response = await api<{ item: Item }>("/items", {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
    return response.item;
  },

  async updateItem(itemId: string, payload: Partial<ItemPayload>) {
    const response = await api<{ item: Item }>(`/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
    return response.item;
  },

  async deleteItem(itemId: string) {
    await api(`/items/${itemId}`, { method: "DELETE" });
  },

  async listTrendingHashtags(limit = 10) {
    const response = await api<{ hashtags: HashtagStat[] }>(`/hashtags/trending?limit=${limit}`);
    return response.hashtags || [];
  },

  async suggestHashtags(query: string, limit = 8) {
    const response = await api<{ hashtags: HashtagStat[] }>(`/hashtags/suggest?q=${encodeURIComponent(query)}&limit=${limit}`);
    return response.hashtags || [];
  },

  async searchLocations(query: string) {
    const response = await api<{ locations: LocationOption[] }>(`/location/search?q=${encodeURIComponent(query)}`);
    return response.locations || [];
  }
};
