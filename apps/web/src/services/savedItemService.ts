import { api } from "../lib/api";
import type { ItemListPage } from "../lib/types";
import { buildQuery } from "./service-utils";

export const savedItemService = {
  async listSavedItems(query: Record<string, string | number | boolean | undefined | null> = {}) {
    const qs = buildQuery(query);
    return await api<ItemListPage>(qs ? `/bookmarks?${qs}` : "/bookmarks");
  },

  async saveItem(itemId: string) {
    await api("/bookmarks", {
      method: "POST",
      body: JSON.stringify({ item_id: itemId })
    });
  },

  async unsaveItem(itemId: string) {
    await api(`/bookmarks/${itemId}`, { method: "DELETE" });
  }
};

