import type { inboxTabs } from "../design-system";

export type DealType = "swap" | "sell" | "buy" | "both";

export type View =
  | "feed"
  | "shop"
  | "search"
  | "filter"
  | "sort"
  | "add"
  | "inbox"
  | "offer_detail"
  | "chat"
  | "profile"
  | "wallet"
  | "saved"
  | "profile_edit"
  | "campaign";

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
  latitude?: number | null;
  longitude?: number | null;
};

export type Wallet = {
  user_id: string;
  credit_balance: number;
};

export type Transaction = {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
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
    price_cash_unknown?: boolean;
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
    distance_km?: number | null;
    maps_url?: string;
  };
  stats: {
    requests: number;
    views: number;
  };
  trade?: {
    count: number;
    history: Array<{
      id: string;
      offer_id?: string | null;
      previous_owner_id?: string | null;
      previous_owner_name?: string | null;
      new_owner_id?: string | null;
      new_owner_name?: string | null;
      counterpart_items: Array<{ id: string; title: string }>;
      created_at: string;
      status: string;
    }>;
  };
  viewer: {
    is_owner: boolean;
    is_bookmarked: boolean;
  };
};

export type RequireLogin = (message?: string) => void;

export type InboxTab = (typeof inboxTabs)[number]["id"];

export type HashtagStat = {
  tag: string;
  label: string;
  item_count: number;
  created_today?: number;
};

export type LocationOption = {
  label: string;
  latitude: number | null;
  longitude: number | null;
};

export type Banner = {
  id: string;
  title: string;
  image_url: string;
  sort_order: number;
  target_type: "product_list" | "product_detail" | "campaign_detail";
  target_value: string;
  campaign_id?: string | null;
  campaign_title?: string | null;
  campaign_summary?: string | null;
};

export type Campaign = {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  body?: string;
  hero_image_url?: string;
  cta_label?: string;
  cta_target_type?: "product_list" | "product_detail" | "campaign_detail";
  cta_target_value?: string;
};

export type OfferStatus =
  | "pending"
  | "accepted_by_receiver"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "confirmed";

export type Shipment = {
  id: string;
  offer_id: string;
  status: string;
  current_step: string;
  tracking_number?: string;
  pickup_photo_url?: string | null;
  dropoff_photo_url?: string | null;
};

export type OfferSummary = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  target_item_id: string;
  status: OfferStatus;
  message?: string;
  cash_amount: number;
  credit_amount: number;
  instant_swap?: boolean;
  logistics?: {
    shipping_payer?: string;
    pickup_window?: string;
    courier_photo_required?: boolean;
    pickup_photo_required?: boolean;
    dropoff_photo_required?: boolean;
  } | null;
  rejection_reason?: string | null;
  created_at?: string;
  updated_at?: string;
  owner_name?: string;
  owner_avatar?: string;
  from_name?: string;
  from_avatar?: string;
  to_name?: string;
  to_avatar?: string;
  target_title?: string;
  target_image?: string;
};

export type OfferDetail = {
  offer: OfferSummary;
  target_item: Item | null;
  offered_items: Item[];
  shipment: Shipment | null;
  conversation_id: string | null;
  chat_enabled: boolean;
};
