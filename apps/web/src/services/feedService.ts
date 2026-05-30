import { api } from "../lib/api";
import type { Banner, Campaign, FeedPost, ItemListPage } from "../lib/types";
import { buildQuery } from "./service-utils";

type FeedQuery = {
  limit?: number | string;
  offset?: number | string;
  owner_id?: string;
  q?: string;
  category?: string;
  wanted_tag?: string;
  deal_type?: string;
  sort?: string;
  following?: boolean | string;
};

export const feedService = {
  async getHomeFeed(query: FeedQuery = {}) {
    const qs = buildQuery(query);
    return await api<ItemListPage>(qs ? `/feed?${qs}` : "/feed");
  },

  async getFollowingFeed(query: FeedQuery = {}) {
    const qs = buildQuery({ ...query, following: true });
    return await api<ItemListPage>(`/items?${qs}`);
  },

  async listFeedPosts(query: { following?: boolean; limit?: number; offset?: number } = {}) {
    const qs = buildQuery(query);
    const response = await api<{ posts: FeedPost[] }>(qs ? `/feed/posts?${qs}` : "/feed/posts");
    return response.posts || [];
  },

  async listBanners() {
    const response = await api<{ banners: Banner[] }>("/banners");
    return response.banners || [];
  },

  async getCampaign(campaignId: string) {
    const response = await api<{ campaign: Campaign }>(`/campaigns/${campaignId}`);
    return response.campaign;
  }
};

