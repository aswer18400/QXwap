// ============================================================
// src/App.jsx  — QXwap v2 (เชื่อม Supabase แล้ว)
//
// สิ่งที่เปลี่ยนจาก v1:
//   • Auth: login / signup / logout จริง
//   • Feed ดึงข้อมูลจาก Supabase listings
//   • Inbox ดึง conversations จริง
//   • Chat รับ-ส่งข้อความ + realtime subscribe
//   • ส่งข้อเสนอขอแลกจริง
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import {
  supabase,
  signIn, signUp, signOut,
  onAuthStateChange, getProfile,
  getListings, getListing, getUserListings,
  sendOffer,
  getConversations, getMessages, sendMessage,
  subscribeToMessages, getOrCreateConversation,
  respondToOffer,
} from "./lib/supabase";

// ─────────────────────────────────────────────
// DESIGN TOKENS (เหมือนเดิม)
// ─────────────────────────────────────────────
const C = {
  bg: "#f7f5f1", card: "#ffffff", surface: "#f0ece6",
  text: "#171614", muted: "#756d63", brand: "#ff6a3d",
  green: "#1f8c58", line: "rgba(23,22,20,.08)",
  shadow: "0 8px 22px rgba(19,16,13,.06)",
};
const S = {
  app:       { maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: C.bg, fontFamily: "Inter,ui-sans-serif,system-ui,sans-serif", color: C.text, paddingBottom: 96 },
  screen:    { minHeight: "100vh", padding: "0 0 16px" },
  shell:     { padding: "0 14px" },
  topbar:    { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 16px 10px" },
  pageTitle: { fontSize: 26, fontWeight: 900, letterSpacing: "-0.045em", lineHeight: 1.05, margin: 0 },
  brand:     { fontSize: 28, fontWeight: 900, letterSpacing: "-0.05em", margin: 0 },
  sub:       { fontSize: 13, color: C.muted, lineHeight: 1.45, marginTop: 4, margin: 0 },
  card:      { background: C.card, borderRadius: 18, boxShadow: C.shadow, padding: 14 },
  primaryBtn:(disabled) => ({
    width: "100%", height: 52, border: "none", borderRadius: 18,
    background: disabled ? "#ccc" : "linear-gradient(180deg,#ff7b51,#ff6a3d)",
    color: disabled ? "#888" : "#341811",
    fontSize: 15, fontWeight: 900, letterSpacing: "0.03em",
    textTransform: "uppercase", cursor: disabled ? "default" : "pointer",
    boxShadow: disabled ? "none" : "0 12px 22px rgba(255,106,61,.18)",
  }),
  iconBtn:   { width: 42, height: 42, borderRadius: 14, background: C.card, boxShadow: C.shadow, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18 },
  chip:      (a) => ({ padding: "8px 14px", borderRadius: 999, background: a ? C.brand : C.card, color: a ? "#fff" : "#403a34", fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer", boxShadow: C.shadow, flexShrink: 0 }),
  input:     { width: "100%", height: 52, borderRadius: 16, border: `1px solid ${C.line}`, padding: "0 14px", fontSize: 15, background: C.surface, outline: "none", boxSizing: "border-box" },
  nav:       { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, height: 82, background: "rgba(255,255,255,.92)", backdropFilter: "blur(18px)", borderTop: `1px solid ${C.line}`, display: "flex", justifyContent: "space-around", alignItems: "flex-start", zIndex: 20 },
  navItem:   (a) => ({ flex: 1, background: "none", border: "none", padding: "10px 0 0", color: a ? C.brand : "#8d857b", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer" }),
  navIcon:   (a) => ({ width: 40, height: 30, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", background: a ? "rgba(255,106,61,.12)" : "transparent", fontSize: 20 }),
  bubble:    (s) => ({ maxWidth: "78%", padding: "10px 14px", borderRadius: s === "self" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: s === "self" ? C.brand : C.card, color: s === "self" ? "#fff" : C.text, fontSize: 15, lineHeight: 1.45, boxShadow: "0 4px 12px rgba(19,16,13,.08)", alignSelf: s === "self" ? "flex-end" : "flex-start" }),
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diff = Math.floor((now - d) / 60000);
  if (diff < 1) return "เมื่อกี้";
  if (diff < 60) return `${diff} นาทีที่แล้ว`;
  if (diff < 1440) return `${Math.floor(diff / 60)} ชม. ที่แล้ว`;
  return d.toLocaleDateString("th-TH");
}

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${C.surface}`, borderTop: `3px solid ${C.brand}`, animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={{ position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)", background: "#171614", color: "#fff", padding: "12px 20px", borderRadius: 14, fontSize: 14, fontWeight: 700, zIndex: 99, whiteSpace: "nowrap", boxShadow: "0 8px 24px rgba(0,0,0,.18)" }}>
      {message}
    </div>
  );
}

// ─────────────────────────────────────────────
// AUTH SCREENS
// ─────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
      } else {
        await signUp(email, password, displayName, username);
      }
      onAuth();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ ...S.screen, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, minHeight: "100vh" }}>
      <h1 style={{ ...S.brand, marginBottom: 8 }}>Q<span style={{ color: C.brand }}>X</span>wap</h1>
      <p style={{ ...S.sub, marginBottom: 32, textAlign: "center" }}>แพลตฟอร์มแลกเปลี่ยนสินค้า</p>

      <div style={{ width: "100%", display: "flex", gap: 8, marginBottom: 20 }}>
        {["login", "signup"].map(m => (
          <button key={m} style={{ ...S.chip(mode === m), flex: 1, justifyContent: "center", display: "flex", height: 48 }} onClick={() => setMode(m)}>
            {m === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
          </button>
        ))}
      </div>

      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
        {mode === "signup" && (
          <>
            <input style={S.input} placeholder="ชื่อที่แสดง" value={displayName} onChange={e => setDisplayName(e.target.value)} />
            <input style={S.input} placeholder="ชื่อผู้ใช้ (@username)" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))} />
          </>
        )}
        <input style={S.input} type="email" placeholder="อีเมล" value={email} onChange={e => setEmail(e.target.value)} />
        <input style={S.input} type="password" placeholder="รหัสผ่าน" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />

        {error && <div style={{ color: "#e53e3e", fontSize: 13, fontWeight: 700 }}>⚠️ {error}</div>}

        <button style={{ ...S.primaryBtn(loading), marginTop: 4 }} onClick={submit} disabled={loading}>
          {loading ? "กำลังโหลด…" : mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// FEED SCREEN
// ─────────────────────────────────────────────
function FeedScreen({ currentUser, onOpenDetail }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("all");

  useEffect(() => {
    setLoading(true);
    getListings({ mode }).then(data => {
      setListings(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [mode]);

  return (
    <div style={S.screen}>
      <div style={S.topbar}>
        <h1 style={S.brand}>Q<span style={{ color: C.brand }}>X</span>wap</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={S.iconBtn}>🔍</button>
          <button style={S.iconBtn}>🔔</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "0 14px 14px", scrollbarWidth: "none" }}>
        {[{ k: "all", l: "ทั้งหมด" }, { k: "swap", l: "แลก" }, { k: "sell", l: "ซื้อ" }].map(m => (
          <button key={m.k} style={S.chip(mode === m.k)} onClick={() => setMode(m.k)}>{m.l}</button>
        ))}
      </div>

      <div style={S.shell}>
        {loading ? <Spinner /> : listings.length === 0 ? (
          <div style={{ ...S.card, textAlign: "center", color: C.muted, padding: 32 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <div>ยังไม่มีสินค้า — เป็นคนแรกที่ลงประกาศ!</div>
          </div>
        ) : (
          listings.map(item => <FeedCard key={item.id} item={item} currentUser={currentUser} onOpen={onOpenDetail} />)
        )}
      </div>
    </div>
  );
}

function FeedCard({ item, currentUser, onOpen }) {
  const isOwner = item.owner_id === currentUser?.id;
  const haveImg = item.have_images?.[0] || `https://picsum.photos/seed/${item.id}/400/300`;
  const offerCount = item.offers?.[0]?.count ?? 0;

  return (
    <div style={{ background: C.card, borderRadius: 28, boxShadow: "0 16px 34px rgba(19,16,13,.08)", overflow: "hidden", marginBottom: 14 }} onClick={() => onOpen(item)}>
      <div style={{ padding: "12px 12px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderRadius: 24, overflow: "hidden", minHeight: 200, background: "#efeae3", position: "relative" }}>
          {[{ img: haveImg, label: "มีอยู่", dark: false }, { img: haveImg, label: "ต้องการ", dark: true }].map((side, i) => (
            <div key={i} style={{ position: "relative", overflow: "hidden", minHeight: 200 }}>
              <img src={side.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", minHeight: 200 }} />
              <div style={{ position: "absolute", left: 10, top: 10, background: side.dark ? "rgba(23,22,20,.74)" : "rgba(255,255,255,.92)", color: side.dark ? "#fff" : "#2b241e", padding: "7px 10px", borderRadius: 999, fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {side.label}
              </div>
            </div>
          ))}
          <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 54, height: 54, borderRadius: 999, background: C.brand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, border: "3px solid rgba(255,255,255,.92)", zIndex: 4 }}>⇄</div>
        </div>
      </div>
      <div style={{ padding: "14px 16px 16px" }}>
        <div style={{ fontSize: 18, fontWeight: 900 }}>{item.have_title}</div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <div>
            <div style={{ fontSize: 13, color: C.muted, fontWeight: 700 }}>📍 {item.owner?.location || item.location || "—"}</div>
            {item.price && <div style={{ fontSize: 14, fontWeight: 900, marginTop: 4 }}>{Number(item.price).toLocaleString("th-TH")} บาท</div>}
          </div>
          <div style={{ background: C.surface, color: "#2d2722", borderRadius: 14, padding: "8px 11px", fontSize: 12, fontWeight: 900, alignSelf: "flex-start" }}>
            {item.mode === "swap" ? "แลกได้" : item.mode === "sell" ? "ซื้อได้" : "ซื้อ/แลก"}
          </div>
        </div>
        {offerCount > 0 && (
          <div style={{ marginTop: 10, background: C.surface, borderRadius: 14, padding: "8px 12px", fontSize: 13, color: C.muted, fontWeight: 700 }}>
            🙋 {offerCount} คนส่งข้อเสนอ
          </div>
        )}
        {!isOwner && (
          <button style={{ ...S.primaryBtn(false), marginTop: 12 }} onClick={e => { e.stopPropagation(); onOpen(item); }}>
            🔄 ขอแลก
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// DETAIL SCREEN
// ─────────────────────────────────────────────
function DetailScreen({ listingId, currentUser, onBack, onOpenChat, showToast }) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!listingId) return;
    getListing(listingId).then(data => { setItem(data); setLoading(false); });
  }, [listingId]);

  const submitOffer = async () => {
    if (!currentUser) return showToast("กรุณาเข้าสู่ระบบก่อน");
    setSubmitting(true);
    try {
      await sendOffer(currentUser.id, item.id, { note, offer_items: [] });
      showToast("ส่งข้อเสนอแล้ว ✅");
      setNote("");
    } catch (e) {
      showToast("เกิดข้อผิดพลาด: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async (offerId, senderProfile) => {
    try {
      await respondToOffer(offerId, "accepted");
      // สร้าง conversation
      const conv = await getOrCreateConversation(currentUser.id, senderProfile.id, offerId);
      showToast("ยอมรับข้อเสนอแล้ว 🎉");
      onOpenChat(conv.id, senderProfile);
    } catch (e) {
      showToast("เกิดข้อผิดพลาด: " + e.message);
    }
  };

  if (loading) return <div style={S.screen}><Spinner /></div>;
  if (!item) return null;

  const isOwner = item.owner_id === currentUser?.id;
  const haveImg = item.have_images?.[0] || `https://picsum.photos/seed/${item.id}/400/300`;

  return (
    <div style={S.screen}>
      <div style={{ position: "relative" }}>
        <img src={haveImg} alt={item.have_title} style={{ width: "100%", height: 270, objectFit: "cover", display: "block" }} />
        <button style={{ position: "absolute", top: 16, left: 16, ...S.iconBtn }} onClick={onBack}>←</button>
      </div>
      <div style={{ ...S.shell, marginTop: 16 }}>
        <div style={S.card}>
          <h2 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>{item.have_title}</h2>
          {item.have_desc && <p style={S.sub}>{item.have_desc}</p>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            {item.location && <span style={{ padding: "8px 10px", borderRadius: 999, background: C.surface, fontSize: 12, fontWeight: 800 }}>📍 {item.location}</span>}
            {item.price && <span style={{ padding: "8px 10px", borderRadius: 999, background: C.surface, fontSize: 12, fontWeight: 800 }}>{Number(item.price).toLocaleString("th-TH")} บาท</span>}
            <span style={{ padding: "8px 10px", borderRadius: 999, background: C.surface, fontSize: 12, fontWeight: 800 }}>
              {item.condition === "new" ? "ใหม่" : item.condition === "used_good" ? "มือสอง สภาพดี" : "มือสอง"}
            </span>
          </div>

          {/* Owner */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.line}`, display: "flex", gap: 12, alignItems: "center" }}>
            <img src={item.owner?.avatar_url || `https://picsum.photos/seed/${item.owner_id}/48/48`} alt="" style={{ width: 48, height: 48, borderRadius: 16, objectFit: "cover" }} />
            <div>
              <div style={{ fontWeight: 900, fontSize: 14 }}>{item.owner?.display_name}</div>
              <div style={{ fontSize: 12, color: C.muted }}>⭐ {item.owner?.rating ?? "5.0"}</div>
            </div>
          </div>

          {/* Want */}
          {item.want_title && (
            <div style={{ marginTop: 14, background: C.surface, borderRadius: 14, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em", color: "#7b625a" }}>ต้องการแลก</div>
              <div style={{ fontSize: 14, fontWeight: 800, marginTop: 4 }}>{item.want_title}</div>
              {item.want_desc && <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{item.want_desc}</div>}
            </div>
          )}

          {/* Offers list (owner view) */}
          {isOwner && item.offers?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 10 }}>ข้อเสนอที่ได้รับ ({item.offers.length})</div>
              {item.offers.map((offer) => (
                <div key={offer.id} style={{ display: "flex", gap: 12, alignItems: "center", background: C.surface, borderRadius: 14, padding: 12, marginBottom: 8 }}>
                  <img src={offer.sender?.avatar_url || `https://picsum.photos/seed/${offer.sender_id}/44/44`} alt="" style={{ width: 44, height: 44, borderRadius: 14, objectFit: "cover" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 900 }}>{offer.sender?.display_name}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                      {offer.cash_amount > 0 ? `+ เงิน ${Number(offer.cash_amount).toLocaleString()} บาท` : ""}
                      {offer.note ? ` · ${offer.note}` : ""}
                    </div>
                    <div style={{ fontSize: 11, color: offer.status === "pending" ? C.brand : C.muted, fontWeight: 800, marginTop: 2 }}>
                      {offer.status === "pending" ? "⏳ รอตอบรับ" : offer.status === "accepted" ? "✅ ยอมรับแล้ว" : "❌ ปฏิเสธแล้ว"}
                    </div>
                  </div>
                  {offer.status === "pending" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <button style={{ padding: "6px 12px", borderRadius: 10, background: C.brand, color: "#fff", border: "none", fontSize: 12, fontWeight: 800, cursor: "pointer" }} onClick={() => handleAccept(offer.id, offer.sender)}>รับ</button>
                      <button style={{ padding: "6px 12px", borderRadius: 10, background: C.surface, color: C.text, border: "none", fontSize: 12, fontWeight: 800, cursor: "pointer" }} onClick={() => respondToOffer(offer.id, "rejected").then(() => showToast("ปฏิเสธแล้ว"))}>ปฏิเสธ</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Send offer (visitor view) */}
          {!isOwner && currentUser && (
            <div style={{ marginTop: 16 }}>
              <textarea
                placeholder="โน้ตถึงเจ้าของ (ไม่บังคับ)"
                value={note}
                onChange={e => setNote(e.target.value)}
                style={{ ...S.input, height: 80, padding: "12px 14px", resize: "none", marginBottom: 10, display: "block" }}
              />
              <button style={S.primaryBtn(submitting)} onClick={submitOffer} disabled={submitting}>
                {submitting ? "กำลังส่ง…" : "🔄 ส่งข้อเสนอขอแลก"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// INBOX SCREEN
// ─────────────────────────────────────────────
function InboxScreen({ currentUser, onOpenChat }) {
  const [convs, setConvs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    getConversations(currentUser.id).then(data => {
      setConvs(data || []);
      setLoading(false);
    });
  }, [currentUser]);

  if (loading) return <div style={S.screen}><div style={S.topbar}><h1 style={S.pageTitle}>Inbox</h1></div><Spinner /></div>;

  return (
    <div style={S.screen}>
      <div style={S.topbar}>
        <h1 style={S.pageTitle}>Inbox</h1>
      </div>
      <div style={S.shell}>
        {convs.length === 0 ? (
          <div style={{ ...S.card, textAlign: "center", color: C.muted, padding: 32 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
            <div>ยังไม่มีการสนทนา</div>
          </div>
        ) : (
          convs.map(conv => {
            const other = conv.participant_a === currentUser.id
              ? conv.participant_b_profile
              : conv.participant_a_profile;
            return (
              <div key={conv.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", ...S.card, marginBottom: 10, cursor: "pointer" }} onClick={() => onOpenChat(conv.id, other)}>
                <img src={other?.avatar_url || `https://picsum.photos/seed/${other?.id}/56/56`} alt="" style={{ width: 56, height: 56, borderRadius: 18, objectFit: "cover", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 900, fontSize: 16 }}>{other?.display_name}</span>
                    <span style={{ fontSize: 12, color: "#91887d" }}>{formatTime(conv.last_at)}</span>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 13, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {conv.last_message || "เริ่มการสนทนา…"}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CHAT SCREEN
// ─────────────────────────────────────────────
function ChatScreen({ conversationId, otherUser, currentUser, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    getMessages(conversationId).then(data => {
      setMessages(data || []);
      setLoading(false);
    });

    // Realtime subscribe
    const channel = subscribeToMessages(conversationId, (msg) => {
      setMessages(prev => [...prev, msg]);
    });
    return () => supabase.removeChannel(channel);
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    try {
      await sendMessage(conversationId, currentUser.id, text);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ ...S.screen, display: "flex", flexDirection: "column", paddingBottom: 0, maxHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderBottom: `1px solid ${C.line}`, background: "#fff" }}>
        <button style={{ ...S.iconBtn, background: "transparent", boxShadow: "none", fontSize: 22 }} onClick={onBack}>←</button>
        <img src={otherUser?.avatar_url || `https://picsum.photos/seed/${otherUser?.id}/42/42`} alt="" style={{ width: 42, height: 42, borderRadius: 14, objectFit: "cover" }} />
        <div style={{ fontWeight: 900, fontSize: 16 }}>{otherUser?.display_name}</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        {loading ? <Spinner /> : messages.map((m, i) => {
          const isSelf = m.sender_id === currentUser?.id;
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: isSelf ? "flex-end" : "flex-start" }}>
              <div style={S.bubble(isSelf ? "self" : "other")}>{m.text}</div>
              <span style={{ fontSize: 11, color: "#a09690", marginTop: 4 }}>{formatTime(m.created_at)}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: "12px 14px", background: "#fff", borderTop: `1px solid ${C.line}`, display: "flex", gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="พิมพ์ข้อความ…" style={{ flex: 1, height: 48, borderRadius: 16, border: `1px solid ${C.line}`, padding: "0 14px", fontSize: 15, background: C.surface, outline: "none" }} />
        <button style={{ ...S.primaryBtn(false), width: 48, height: 48, borderRadius: 16, letterSpacing: 0, textTransform: "none", fontSize: 20 }} onClick={send}>↑</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PROFILE SCREEN
// ─────────────────────────────────────────────
function ProfileScreen({ currentUser, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    getProfile(currentUser.id).then(setProfile);
    getUserListings(currentUser.id).then(data => setListings(data || []));
  }, [currentUser]);

  return (
    <div style={S.screen}>
      <div style={S.topbar}>
        <h1 style={S.pageTitle}>โปรไฟล์</h1>
        <button style={S.iconBtn} onClick={onLogout}>🚪</button>
      </div>
      <div style={S.shell}>
        <div style={S.card}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <img src={profile?.avatar_url || `https://picsum.photos/seed/${currentUser?.id}/78/78`} alt="" style={{ width: 78, height: 78, borderRadius: 24, objectFit: "cover", flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 900, fontSize: 20 }}>{profile?.display_name || "—"}</div>
              <div style={{ fontSize: 13, color: C.muted }}>@{profile?.username || "—"}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                <span style={{ padding: "8px 10px", borderRadius: 999, background: C.surface, fontSize: 11, fontWeight: 800 }}>⭐ {profile?.rating ?? "5.0"}</span>
                {profile?.verified && <span style={{ padding: "8px 10px", borderRadius: 999, background: C.surface, fontSize: 11, fontWeight: 800 }}>✅ ยืนยันแล้ว</span>}
                <span style={{ padding: "8px 10px", borderRadius: 999, background: C.surface, fontSize: 11, fontWeight: 800 }}>🔄 {profile?.total_swaps ?? 0} ดีล</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 900, fontSize: 17, marginBottom: 10 }}>สินค้าของฉัน ({listings.length})</div>
          {listings.map(item => (
            <div key={item.id} style={{ ...S.card, display: "flex", gap: 12, marginBottom: 10 }}>
              <img src={item.have_images?.[0] || `https://picsum.photos/seed/${item.id}/64/64`} alt="" style={{ width: 64, height: 64, borderRadius: 14, objectFit: "cover", flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 900 }}>{item.have_title}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                  {item.price ? `${Number(item.price).toLocaleString()} บาท · ` : ""}
                  {item.offers?.[0]?.count ?? 0} ข้อเสนอ
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, marginTop: 4, color: item.status === "active" ? C.green : C.muted }}>
                  {item.status === "active" ? "🟢 เปิดอยู่" : "⏸ หยุดชั่วคราว"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// BOTTOM NAV
// ─────────────────────────────────────────────
function BottomNav({ screen, onNav }) {
  const tabs = [
    { key: "feed", icon: "🏠", label: "หน้าแรก" },
    { key: "market", icon: "🛍️", label: "ตลาด" },
    { key: "inbox", icon: "💬", label: "Inbox" },
    { key: "activity", icon: "🔔", label: "แจ้งเตือน" },
    { key: "profile", icon: "👤", label: "โปรไฟล์" },
  ];
  return (
    <nav style={S.nav}>
      {tabs.map(t => (
        <button key={t.key} style={S.navItem(screen === t.key)} onClick={() => onNav(t.key)}>
          <span style={S.navIcon(screen === t.key)}>{t.icon}</span>
          <span style={{ fontSize: 10, fontWeight: 800 }}>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ─────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser] = useState(undefined); // undefined = loading
  const [screen, setScreen] = useState("feed");
  const [subScreen, setSubScreen] = useState(null); // "detail" | "chat"
  const [selectedListingId, setSelectedListingId] = useState(null);
  const [selectedConv, setSelectedConv] = useState(null); // { id, otherUser }
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  // Auth listener
  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange((user) => setCurrentUser(user));
    return () => subscription.unsubscribe();
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2000);
  }, []);

  const nav = useCallback((s) => { setSubScreen(null); setScreen(s); }, []);
  const openDetail = useCallback((item) => { setSelectedListingId(item.id); setSubScreen("detail"); }, []);
  const openChat = useCallback((convId, otherUser) => { setSelectedConv({ id: convId, otherUser }); setSubScreen("chat"); }, []);
  const closeSubScreen = useCallback(() => { setSubScreen(null); setSelectedListingId(null); setSelectedConv(null); }, []);
  const handleLogout = useCallback(async () => { await signOut(); setScreen("feed"); }, []);

  // ── Loading
  if (currentUser === undefined) {
    return <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center" }}><Spinner /></div>;
  }

  // ── Auth required
  if (!currentUser) {
    return <div style={S.app}><AuthScreen onAuth={() => {}} /></div>;
  }

  // ── Sub-screens
  if (subScreen === "detail") return (
    <div style={S.app}>
      <DetailScreen listingId={selectedListingId} currentUser={currentUser} onBack={closeSubScreen} onOpenChat={openChat} showToast={showToast} />
      <Toast message={toast} />
    </div>
  );

  if (subScreen === "chat") return (
    <div style={S.app}>
      <ChatScreen conversationId={selectedConv.id} otherUser={selectedConv.otherUser} currentUser={currentUser} onBack={closeSubScreen} />
      <Toast message={toast} />
    </div>
  );

  // ── Main tabs
  const renderMain = () => {
    switch (screen) {
      case "feed":     return <FeedScreen currentUser={currentUser} onOpenDetail={openDetail} />;
      case "market":   return <FeedScreen currentUser={currentUser} onOpenDetail={openDetail} />;
      case "inbox":    return <InboxScreen currentUser={currentUser} onOpenChat={openChat} />;
      case "profile":  return <ProfileScreen currentUser={currentUser} onLogout={handleLogout} />;
      default:         return <FeedScreen currentUser={currentUser} onOpenDetail={openDetail} />;
    }
  };

  return (
    <div style={S.app}>
      {renderMain()}
      <BottomNav screen={screen} onNav={nav} />
      <Toast message={toast} />
    </div>
  );
}
