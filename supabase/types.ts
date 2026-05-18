// Auto-generated TypeScript types for the live Supabase project
// `cpradtvneftyeflwjvmx`. Generated via the Supabase MCP
// `generate_typescript_types` tool on 2026-05-15.
//
// The QXwap API does not use the @supabase/supabase-js client (it talks to
// Postgres directly through `pg` / `DATABASE_URL`), so these types are not
// imported anywhere by default. They serve two purposes:
//
//   1. A machine-readable snapshot of the production schema, useful for
//      compile-time review and code review diffs.
//   2. A drop-in `Database` type for any future code that wants to use the
//      Supabase JS client (e.g. real-time subscriptions on the frontend).
//
// To regenerate after a schema change:
//
//   - Run a Supabase MCP `generate_typescript_types` call against
//     project `cpradtvneftyeflwjvmx` and replace this file's contents.
//   - Commit alongside the matching `supabase/migrations/*.sql` migration.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      auth_otps: {
        Row: {
          code_hash: string
          expires_at: string
          id: string
          purpose: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          expires_at: string
          id?: string
          purpose: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          expires_at?: string
          id?: string
          purpose?: string
          used_at?: string | null
          user_id?: string
        }
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
      }
      bookmarks: {
        Row: {
          created_at: string
          item_id: string
          user_id: string
        }
      }
      categories: {
        Row: {
          icon: string | null
          id: string
          name: string
          slug: string
        }
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          offer_id: string | null
          updated_at: string
        }
      }
      chat_messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
          text: string
        }
      }
      chat_participants: {
        Row: {
          conversation_id: string
          user_id: string
        }
      }
      deals: {
        Row: {
          buyer_id: string | null
          carrier: string | null
          created_at: string
          fulfillment_type: string
          id: string
          item_id: string | null
          logistics: Json | null
          logistics_confirmed: boolean
          offer_id: string
          pickup_point: string | null
          pickup_slot: string | null
          receipt_proof_ref: string | null
          receiver_id: string | null
          seller_id: string | null
          sender_id: string | null
          shipment_proof_ref: string | null
          shipping_address: string | null
          stage: string
          target_item_id: string | null
          tracking_code: string | null
          updated_at: string
        }
      }
      disputes: {
        Row: {
          created_at: string
          deal_id: string | null
          detail: string | null
          id: string
          reason: string
          reported_user_id: string
          reporter_id: string
          status: string
        }
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
      }
      item_images: {
        Row: {
          created_at: string
          id: string
          item_id: string
          sort_order: number | null
          url: string
        }
      }
      items: {
        Row: {
          category: string | null
          condition: string | null
          condition_label: string
          created_at: string
          deal_type: Database["public"]["Enums"]["deal_type"]
          description: string | null
          id: string
          image_emoji: string
          image_urls: string[]
          latitude: number | null
          location_label: string | null
          longitude: number | null
          open_to_offers: boolean
          owner_id: string
          price_cash: number
          price_credit: number
          request_count: number | null
          search_vector: unknown
          status: Database["public"]["Enums"]["item_status"]
          title: string
          updated_at: string
          view_count: number | null
          wanted_tags: string[]
          wanted_text: string | null
        }
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
      }
      offer_chats: {
        Row: {
          created_at: string
          id: string
          offer_id: string
        }
      }
      offer_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          offer_id: string
        }
      }
      offer_messages: {
        Row: {
          chat_id: string
          created_at: string
          id: string
          image_url: string | null
          message: string
          sender_id: string
        }
      }
      offers: {
        Row: {
          cash_amount: number | null
          created_at: string
          credit_amount: number | null
          from_user_id: string | null
          id: string
          instant_swap: boolean | null
          logistics: Json | null
          message: string | null
          offered_cash: number | null
          offered_credit: number | null
          receiver_id: string | null
          rejection_reason: string | null
          sender_id: string | null
          status: Database["public"]["Enums"]["offer_status"]
          target_item_id: string
          to_user_id: string | null
          updated_at: string
        }
      }
      profiles: {
        Row: {
          account_level: number | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          display_name: string | null
          id: string
          is_fast_responder: boolean | null
          is_featured: boolean | null
          latitude: number | null
          longitude: number | null
          notification_settings: string
          rating: number | null
          rating_avg: number
          response_time_minutes: number | null
          successful_deals_count: number
          updated_at: string
          username: string | null
          verified_status: boolean
        }
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          deal_id: string
          id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
        }
      }
      shipments: {
        Row: {
          created_at: string
          current_step: string | null
          dropoff_photo_url: string | null
          id: string
          offer_id: string
          pickup_photo_url: string | null
          status: string | null
          tracking_number: string | null
          updated_at: string
        }
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          type: string
          user_id: string
        }
      }
      user_sessions: {
        Row: {
          expire: string
          sess: Json
          sid: string
        }
      }
      users: {
        Row: {
          created_at: string
          email: string | null
          email_verified: boolean
          first_name: string | null
          id: string
          last_name: string | null
          password_hash: string | null
          profile_image_url: string | null
          replit_user_id: string | null
          updated_at: string
        }
      }
      wallets: {
        Row: {
          credit_balance: number | null
          updated_at: string
          user_id: string
        }
      }
    }
    Enums: {
      deal_type: "swap" | "buy" | "both" | "sell"
      item_status: "active" | "paused" | "locked" | "traded" | "closed"
      offer_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "canceled"
        | "shipping"
        | "completed"
        | "cancelled"
        | "confirmed"
    }
  }
}

export const ENUMS = {
  deal_type: ["swap", "buy", "both", "sell"] as const,
  item_status: ["active", "paused", "locked", "traded", "closed"] as const,
  offer_status: [
    "pending",
    "accepted",
    "rejected",
    "canceled",
    "shipping",
    "completed",
    "cancelled",
    "confirmed"
  ] as const
}
