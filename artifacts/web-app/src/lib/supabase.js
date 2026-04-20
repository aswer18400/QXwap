// ============================================================
// src/lib/supabase.js
// Supabase client + ฟังก์ชัน API ทั้งหมดของ QXwap
//
// สร้างไฟล์ .env.local ที่ root:
//   VITE_SUPABASE_URL=https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=eyJhbGci...
// ============================================================

import { createClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────
// CLIENT
// ─────────────────────────────────────────────

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);


// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────

/** สมัครสมาชิกด้วย email + password */
export async function signUp(email, password, displayName, username) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName, username },
    },
  });
  if (error) throw error;
  return data;
}

/** เข้าสู่ระบบ */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/** ออกจากระบบ */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** ดึง session ปัจจุบัน */
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** ฟัง auth state เปลี่ยน (login/logout) */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
}


// ─────────────────────────────────────────────
// PROFILES
// ─────────────────────────────────────────────

/** ดึงโปรไฟล์โดย id */
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

/** แก้ไขโปรไฟล์ตัวเอง */
export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** อัปโหลดรูปโปรไฟล์ */
export async function uploadAvatar(userId, file) {
  const ext = file.name.split(".").pop();
  const path = `avatars/${userId}.${ext}`;
  const { error } = await supabase.storage
    .from("listing-images")
    .upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
  return data.publicUrl;
}


// ─────────────────────────────────────────────
// LISTINGS
// ─────────────────────────────────────────────

/**
 * ดึง listings สำหรับ Feed
 * @param {{ category?: string, mode?: string, limit?: number, offset?: number }} options
 */
export async function getListings({ category, mode, limit = 20, offset = 0 } = {}) {
  let query = supabase
    .from("listings")
    .select(`
      *,
      owner:profiles(id, username, display_name, avatar_url, location, rating, verified),
      offers(count)
    `)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (category && category !== "all") query = query.eq("have_category", category);
  if (mode && mode !== "all") {
    if (mode === "swap") query = query.in("mode", ["swap", "both"]);
    if (mode === "sell") query = query.in("mode", ["sell", "both"]);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/** ดึง listing เดี่ยว + ข้อเสนอทั้งหมด */
export async function getListing(listingId) {
  const { data, error } = await supabase
    .from("listings")
    .select(`
      *,
      owner:profiles(id, username, display_name, avatar_url, location, rating, verified),
      offers(
        *,
        sender:profiles(id, username, display_name, avatar_url, rating)
      )
    `)
    .eq("id", listingId)
    .single();
  if (error) throw error;
  return data;
}

/** ลงประกาศสินค้าใหม่ */
export async function createListing(userId, listingData) {
  const { data, error } = await supabase
    .from("listings")
    .insert({ owner_id: userId, ...listingData })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** แก้ไขประกาศ */
export async function updateListing(listingId, updates) {
  const { data, error } = await supabase
    .from("listings")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", listingId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** อัปโหลดรูปสินค้า — คืน array ของ URL */
export async function uploadListingImages(listingId, files) {
  const urls = [];
  for (const file of files) {
    const ext = file.name.split(".").pop();
    const path = `listings/${listingId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("listing-images")
      .upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}

/** ดึง listings ของ user คนใดคนหนึ่ง */
export async function getUserListings(userId) {
  const { data, error } = await supabase
    .from("listings")
    .select("*, offers(count)")
    .eq("owner_id", userId)
    .neq("status", "deleted")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}


// ─────────────────────────────────────────────
// OFFERS
// ─────────────────────────────────────────────

/** ส่งข้อเสนอขอแลก */
export async function sendOffer(senderId, listingId, offerData) {
  const { data, error } = await supabase
    .from("offers")
    .insert({
      listing_id: listingId,
      sender_id: senderId,
      ...offerData,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** เจ้าของตอบรับ/ปฏิเสธข้อเสนอ */
export async function respondToOffer(offerId, status) {
  if (!["accepted", "rejected"].includes(status)) throw new Error("invalid status");
  const { data, error } = await supabase
    .from("offers")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", offerId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** ดึงข้อเสนอที่ฉันส่งออกไป */
export async function getSentOffers(userId) {
  const { data, error } = await supabase
    .from("offers")
    .select(`
      *,
      listing:listings(id, have_title, have_images, owner_id,
        owner:profiles(display_name, avatar_url))
    `)
    .eq("sender_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}


// ─────────────────────────────────────────────
// CONVERSATIONS & MESSAGES
// ─────────────────────────────────────────────

/**
 * ดึงหรือสร้าง conversation ระหว่าง 2 คน
 * (ใช้หลังจากข้อเสนอถูกยอมรับ)
 */
export async function getOrCreateConversation(userA, userB, offerId = null) {
  const [a, b] = [userA, userB].sort();
  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .eq("participant_a", a)
    .eq("participant_b", b)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from("conversations")
    .insert({ participant_a: a, participant_b: b, offer_id: offerId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** ดึงรายการ conversations ของ user */
export async function getConversations(userId) {
  const { data, error } = await supabase
    .from("conversations")
    .select(`
      *,
      participant_a_profile:profiles!conversations_participant_a_fkey(id, display_name, avatar_url),
      participant_b_profile:profiles!conversations_participant_b_fkey(id, display_name, avatar_url)
    `)
    .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
    .order("last_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** ดึงข้อความใน conversation */
export async function getMessages(conversationId) {
  const { data, error } = await supabase
    .from("messages")
    .select("*, sender:profiles(id, display_name, avatar_url)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

/** ส่งข้อความ */
export async function sendMessage(conversationId, senderId, text) {
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, text })
    .select()
    .single();
  if (error) throw error;

  await supabase
    .from("conversations")
    .update({ last_message: text, last_at: new Date().toISOString() })
    .eq("id", conversationId);

  return data;
}

/** Subscribe realtime messages ใน conversation */
export function subscribeToMessages(conversationId, onNewMessage) {
  return supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onNewMessage(payload.new)
    )
    .subscribe();
}


// ─────────────────────────────────────────────
// CREDITS
// ─────────────────────────────────────────────

/** ดึงยอด credit ของ user */
export async function getCreditBalance(userId) {
  const { data, error } = await supabase
    .from("user_credit_balance")
    .select("balance")
    .eq("user_id", userId)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data?.balance ?? 0;
}

/** ดึงประวัติ credit */
export async function getCreditHistory(userId, limit = 20) {
  const { data, error } = await supabase
    .from("credit_ledger")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}


// ─────────────────────────────────────────────
// SEARCH
// ─────────────────────────────────────────────

/** ค้นหาสินค้าจาก keyword */
export async function searchListings(query, limit = 20) {
  const { data, error } = await supabase
    .from("listings")
    .select("*, owner:profiles(display_name, avatar_url)")
    .eq("status", "active")
    .or(`have_title.ilike.%${query}%,have_desc.ilike.%${query}%,want_title.ilike.%${query}%`)
    .limit(limit);
  if (error) throw error;
  return data;
}
