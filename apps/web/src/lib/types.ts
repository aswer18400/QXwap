export type DealType = "swap" | "sell" | "buy" | "both";

export type View =
  | "feed"
  | "shop"
  | "following"
  | "search"
  | "filter"
  | "sort"
  | "add"
  | "inbox"
  | "notifications"
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
  roles?: UserRoleCode[];
  latitude?: number | null;
  longitude?: number | null;
};

export type UserRoleCode = "member" | "trusted" | "restricted" | "moderator" | "admin";

export type UserRole = {
  id: string;
  user_id: string;
  role: UserRoleCode;
  granted_at: string;
};

export type UserProfile = User;

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
  source_kind?: string | null;
  source_id?: string | null;
  rule_key?: string | null;
  created_at: string;
};

export type Item = {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  status: "active" | "pending_swap" | "swapped" | "inactive" | string;
  is_featured: boolean;
  is_fast_responder: boolean;
  created_at?: string;
  updated_at?: string;
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

export type ItemListPage = {
  items: Item[];
  page?: {
    limit: number;
    offset: number;
    has_more: boolean;
    next_offset: number | null;
  };
};

export type WantedItem = {
  id: string;
  owner_id: string;
  source_item_id?: string | null;
  title: string;
  description: string;
  category: string;
  deal_type: DealType;
  wanted_text: string;
  wanted_tags: string[];
  reference_images: string[];
  urgency?: "low" | "normal" | "high" | string;
  location_label: string;
  latitude?: number | null;
  longitude?: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  owner?: User | null;
};

export type FeedPostType = "item" | "wanted_item" | "swap_update" | "reward_redemption" | "follow";

export type FeedPost = {
  id: string;
  source_key: string;
  actor_user_id: string;
  post_type: FeedPostType;
  item_id?: string | null;
  wanted_item_id?: string | null;
  reward_item_id?: string | null;
  visibility: string;
  created_at: string;
  updated_at: string;
  actor?: User | null;
  item?: Item | null;
  wanted_item?: WantedItem | null;
};

export type RequireLogin = (message?: string) => void;

export type OfferTab = "received" | "sent";
export type InboxTab = OfferTab;

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
  created_at?: string;
  updated_at?: string;
};

export type OfferLogistics = {
  shipping_payer?: "split" | "requester" | "owner" | string;
  pickup_window?: string;
  shipping_method?: "courier" | "meetup" | string;
  meetup_location?: string;
  meetup_maps_url?: string;
  meetup_time?: string;
  meetup_note?: string;
  courier_photo_required?: boolean;
  pickup_photo_required?: boolean;
  dropoff_photo_required?: boolean;
  proofs?: Record<string, string>;
  schedule_confirmations?: Record<string, string>;
  receipt_confirmations?: Record<string, string>;
  return_requested_by?: string;
  return_reason?: string;
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
  logistics?: OfferLogistics | null;
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

export type ChatConversation = {
  id: string;
  offer_id?: string | null;
  item_id?: string | null;
  counterpart_id?: string | null;
  counterpart_name?: string | null;
  counterpart_avatar?: string | null;
  item_title?: string | null;
  item_image?: string | null;
  item_status?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ChatMessage = {
  id: string;
  conversation_id?: string;
  sender_id: string;
  text: string;
  created_at: string;
};

export type NotificationEntry = {
  id: string;
  user_id?: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  read_at?: string | null;
  created_at?: string;
};

export type Review = {
  id: string;
  reviewer_user_id: string;
  reviewee_user_id: string;
  offer_id?: string | null;
  rating: number;
  comment?: string | null;
  created_at: string;
};

export type ReportRecord = {
  id: string;
  reporter_user_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  description?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type RewardItem = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  credit_cost: number;
  inventory_count: number;
  status: string;
  created_at?: string;
  updated_at?: string;
};

export type RewardRedemption = {
  id: string;
  user_id: string;
  reward_item_id: string;
  credit_amount: number;
  status: string;
  created_at: string;
  updated_at?: string;
};
