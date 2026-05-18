import type { inboxTabs } from "../design-system";

export type DealType = "swap" | "sell" | "buy" | "both";

export type View = "feed" | "shop" | "add" | "inbox" | "profile" | "wallet";

export type User = {
  id: string;
  email: string;
  display_name?: string;
  username?: string;
  city?: string;
  bio?: string;
  avatar_url?: string;
  rating?: number;
  is_featured?: boolean;
  is_fast_responder?: boolean;
  listing_count?: number;
  account_level?: number;
};

export type Wallet = {
  user_id: string;
  credit_balance: number;
};

export type Item = {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  is_featured: boolean;
  is_fast_responder: boolean;
  owner: {
    id: string;
    name: string;
    avatar_url: string;
    rating: number;
    account_level?: number;
  };
  media: {
    images: string[];
  };
  deal: {
    type: DealType;
    price_cash: number;
    price_credit: number;
    open_to_offers: boolean;
  };
  wanted: {
    text: string;
    tags: string[];
  };
  location: {
    label: string;
    latitude?: number | null;
    longitude?: number | null;
  };
  stats: {
    requests: number;
    views: number;
  };
  viewer: {
    is_owner: boolean;
    is_bookmarked: boolean;
  };
};

export type RequireLogin = (message?: string) => void;

export type InboxTab = (typeof inboxTabs)[number]["id"];
