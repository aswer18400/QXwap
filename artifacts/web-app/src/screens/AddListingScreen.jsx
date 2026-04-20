// ============================================================
// src/screens/AddListingScreen.jsx
// หน้าลงประกาศสินค้าใหม่ — 3 ขั้นตอน
// ============================================================

import { useState, useRef, useCallback } from "react";
import { createListing, uploadListingImages, supabase } from "../lib/supabase";

// ── Design tokens (sync กับ app หลัก) ──────────────────────
const C = {
  bg: "#f7f5f1", card: "#fff", surface: "#f0ece6",
  text: "#171614", muted: "#756d63", brand: "#ff6a3d",
  brandSoft: "rgba(255,106,61,.12)", green: "#1f8c58",
  line: "rgba(23,22,20,.08)", shadow: "0 8px 22px rgba(19,16,13,.06)",
};

// ── Categories ──────────────────────────────────────────────
const CATEGORIES = [
  { key: "electronics", label: "อิเล็กทรอนิกส์", icon: "⚡" },
  { key: "mobile",      label: "มือถือ",          icon: "📱" },
  { key: "computer",    label: "คอมพิวเตอร์",      icon: "💻" },
  { key: "camera",      label: "กล้อง",            icon: "📷" },
  { key: "gaming",      label: "เกม",             icon: "🎮" },
  { key: "fashion",     label: "แฟชั่น",           icon: "🧥" },
  { key: "home",        label: "บ้านและสวน",       icon: "🏡" },
  { key: "appliance",   label: "เครื่องใช้ไฟฟ้า",   icon: "🔌" },
  { key: "sport",       label: "กีฬา",            icon: "⚽" },
  { key: "books",       label: "หนังสือ",          icon: "📚" },
  { key: "collectibles",label: "ของสะสม",          icon: "🪙" },
  { key: "other",       label: "อื่นๆ",            icon: "📦" },
];

const CONDITIONS = [
  { key: "new",        label: "ใหม่",              sub: "ยังไม่เคยใช้ / มีซีล" },
  { key: "used_good",  label: "มือสอง สภาพดี",     sub: "ใช้แล้ว ไม่มีรอย" },
  { key: "used_fair",  label: "มือสอง พอใช้",      sub: "มีรอยนิดหน่อย" },
  { key: "used_poor",  label: "มือสอง สภาพทน",     sub: "มีร่องรอยการใช้งาน" },
];

const MODES = [
  { key: "swap", label: "แลกอย่างเดียว",   icon: "🔄", sub: "ไม่รับเงินสด" },
  { key: "both", label: "แลก หรือ ขาย",    icon: "⇄", sub: "รับทั้งสองแบบ" },
  { key: "sell", label: "ขายอย่างเดียว",   icon: "🏷️", sub: "ตั้งราคาได้" },
];

// ── Sub-components ──────────────────────────────────────────

function StepDots({ step }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", margin: "6px 0 18px" }}>
      {[1, 2, 3].map(n => (
        <div key={n} style={{
          width: n === step ? 22 : 8, height: 8, borderRadius: 999,
          background: n === step ? C.brand : n < step ? "rgba(255,106,61,.35)" : C.surface,
          transition: "all .25s ease",
        }} />
      ))}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8e8378", marginBottom: 10 }}>
      {children}
    </div>
  );
}

function TextInput({ label, placeholder, value, onChange, multiline, maxLength }) {
  const style = {
    width: "100%", borderRadius: 16, border: `1.5px solid ${C.line}`,
    padding: "14px 16px", fontSize: 15, background: C.card, outline: "none",
    boxSizing: "border-box", color: C.text, resize: "none",
    fontFamily: "inherit", lineHeight: 1.5,
    transition: "border-color .15s",
  };
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <SectionLabel>{label}</SectionLabel>}
      {multiline
        ? <textarea rows={3} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} maxLength={maxLength} style={{ ...style, minHeight: 88 }} />
        : <input type="text" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} maxLength={maxLength} style={{ ...style, height: 52 }} />
      }
      {maxLength && <div style={{ textAlign: "right", fontSize: 11, color: C.muted, marginTop: 4 }}>{value.length}/{maxLength}</div>}
    </div>
  );
}

function OptionGrid({ options, value, onChange }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
      {options.map(opt => {
        const active = value === opt.key;
        return (
          <button key={opt.key} onClick={() => onChange(opt.key)} style={{
            border: active ? `2px solid ${C.brand}` : `2px solid ${C.line}`,
            borderRadius: 18, padding: "14px 12px", background: active ? "rgba(255,106,61,.06)" : C.card,
            cursor: "pointer", textAlign: "left", transition: "all .15s",
            boxShadow: active ? `0 0 0 4px rgba(255,106,61,.08)` : "none",
          }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{opt.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: active ? C.brand : C.text }}>{opt.label}</div>
            {opt.sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 3, lineHeight: 1.35 }}>{opt.sub}</div>}
          </button>
        );
      })}
    </div>
  );
}

function CategoryGrid({ value, onChange }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
      {CATEGORIES.map(cat => {
        const active = value === cat.key;
        return (
          <button key={cat.key} onClick={() => onChange(cat.key)} style={{
            border: active ? `2px solid ${C.brand}` : `2px solid transparent`,
            borderRadius: 16, padding: "12px 8px", background: active ? "rgba(255,106,61,.06)" : C.surface,
            cursor: "pointer", textAlign: "center", transition: "all .15s",
          }}>
            <div style={{ fontSize: 20 }}>{cat.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: active ? C.brand : C.text, marginTop: 4, lineHeight: 1.2 }}>{cat.label}</div>
          </button>
        );
      })}
    </div>
  );
}

function ImageUploader({ images, onChange }) {
  const inputRef = useRef(null);

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const previews = files.map(f => ({ file: f, url: URL.createObjectURL(f) }));
    onChange(prev => [...prev, ...previews].slice(0, 6));
  };

  const removeImage = (idx) => {
    onChange(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <SectionLabel>รูปสินค้า (สูงสุด 6 รูป)</SectionLabel>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 10 }}>
        {images.map((img, i) => (
          <div key={i} style={{ position: "relative", borderRadius: 16, overflow: "hidden", aspectRatio: "1/1", background: C.surface }}>
            <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            {i === 0 && (
              <div style={{ position: "absolute", top: 6, left: 6, background: C.brand, color: "#fff", fontSize: 10, fontWeight: 900, padding: "3px 8px", borderRadius: 999 }}>
                หน้าปก
              </div>
            )}
            <button onClick={() => removeImage(i)} style={{
              position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: 999,
              background: "rgba(23,22,20,.65)", color: "#fff", border: "none", cursor: "pointer",
              fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
            }}>✕</button>
          </div>
        ))}

        {images.length < 6 && (
          <button onClick={() => inputRef.current?.click()} style={{
            borderRadius: 16, aspectRatio: "1/1", background: C.surface,
            border: `2px dashed rgba(23,22,20,.18)`, cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            color: C.muted, gap: 4,
          }}>
            <span style={{ fontSize: 24 }}>📷</span>
            <span style={{ fontSize: 11, fontWeight: 800 }}>เพิ่มรูป</span>
          </button>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleFiles} />

      {images.length === 0 && (
        <button onClick={() => inputRef.current?.click()} style={{
          width: "100%", padding: "20px 16px", borderRadius: 20,
          border: `2px dashed rgba(23,22,20,.18)`, background: C.surface,
          cursor: "pointer", display: "flex", gap: 14, alignItems: "center",
        }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: C.brandSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>📷</div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: C.text }}>เพิ่มรูปสินค้า</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>รูปแรกจะเป็นหน้าปก · รองรับ JPG, PNG · สูงสุด 6 รูป</div>
          </div>
        </button>
      )}
    </div>
  );
}

// ── Step 1: สินค้าที่มี ─────────────────────────────────────
function Step1({ data, onChange }) {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em" }}>สินค้าที่ฉันมี</div>
        <div style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>บอกผู้คนว่าคุณมีอะไร</div>
      </div>

      <ImageUploader images={data.images} onChange={val => onChange("images", val)} />

      <TextInput
        label="ชื่อสินค้า *"
        placeholder="เช่น iPhone 15 Pro Max 256GB สีดำ"
        value={data.haveTitle}
        onChange={v => onChange("haveTitle", v)}
        maxLength={80}
      />

      <TextInput
        label="รายละเอียด"
        placeholder="สภาพ รุ่น อายุการใช้งาน อุปกรณ์ที่แถม ฯลฯ"
        value={data.haveDesc}
        onChange={v => onChange("haveDesc", v)}
        multiline
        maxLength={300}
      />

      <SectionLabel>หมวดหมู่ *</SectionLabel>
      <CategoryGrid value={data.category} onChange={v => onChange("category", v)} />

      <SectionLabel>สภาพสินค้า *</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        {CONDITIONS.map(c => {
          const active = data.condition === c.key;
          return (
            <button key={c.key} onClick={() => onChange("condition", c.key)} style={{
              display: "flex", gap: 12, alignItems: "center", padding: "14px 16px",
              borderRadius: 16, border: active ? `2px solid ${C.brand}` : `2px solid ${C.line}`,
              background: active ? "rgba(255,106,61,.06)" : C.card, cursor: "pointer",
              transition: "all .15s",
            }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${active ? C.brand : "#ccc"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {active && <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.brand }} />}
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: active ? C.brand : C.text }}>{c.label}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{c.sub}</div>
              </div>
            </button>
          );
        })}
      </div>

      <TextInput
        label="ตำแหน่งที่ตั้ง"
        placeholder="เช่น ลาดพร้าว, เชียงใหม่"
        value={data.location}
        onChange={v => onChange("location", v)}
      />
    </div>
  );
}

// ── Step 2: สิ่งที่ต้องการ + โหมดการขาย ───────────────────
function Step2({ data, onChange }) {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em" }}>ต้องการอะไรแลก?</div>
        <div style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>บอกสิ่งที่คุณอยากได้</div>
      </div>

      <SectionLabel>โหมดประกาศ *</SectionLabel>
      <OptionGrid options={MODES} value={data.mode} onChange={v => onChange("mode", v)} />

      {(data.mode === "swap" || data.mode === "both") && (
        <>
          <TextInput
            label="สินค้าที่ต้องการแลก *"
            placeholder="เช่น MacBook Air M2, Fujifilm X-T5 หรืออะไรก็ได้"
            value={data.wantTitle}
            onChange={v => onChange("wantTitle", v)}
            maxLength={80}
          />
          <TextInput
            label="รายละเอียดเพิ่มเติม"
            placeholder="สี รุ่น สภาพที่รับได้ ฯลฯ"
            value={data.wantDesc}
            onChange={v => onChange("wantDesc", v)}
            multiline
            maxLength={200}
          />
        </>
      )}

      {(data.mode === "sell" || data.mode === "both") && (
        <div style={{ marginBottom: 14 }}>
          <SectionLabel>ราคาที่ต้องการ (บาท)</SectionLabel>
          <div style={{ position: "relative" }}>
            <input
              type="number"
              placeholder="0"
              value={data.price}
              onChange={e => onChange("price", e.target.value)}
              style={{
                width: "100%", height: 52, borderRadius: 16,
                border: `1.5px solid ${C.line}`, padding: "0 16px 0 48px",
                fontSize: 18, fontWeight: 900, background: C.card, outline: "none",
                boxSizing: "border-box", color: C.text,
              }}
            />
            <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 16, fontWeight: 900, color: C.muted }}>฿</div>
          </div>
        </div>
      )}

      {data.mode === "swap" && (
        <div style={{ background: C.brandSoft, borderRadius: 18, padding: 16, marginTop: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: "#9d3f1c" }}>💡 เคล็ดลับ</div>
          <div style={{ fontSize: 13, color: "#7a3015", marginTop: 6, lineHeight: 1.5 }}>
            ยิ่งระบุรายละเอียดที่ต้องการมากเท่าไหร่ ยิ่งได้รับข้อเสนอที่ตรงใจมากขึ้น เช่น "iPhone 14 Pro สีดำ สภาพดี มีกล่อง"
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step 3: ตรวจสอบก่อนโพสต์ ──────────────────────────────
function Step3({ data }) {
  const coverImg = data.images[0]?.url;
  const cat = CATEGORIES.find(c => c.key === data.category);
  const cond = CONDITIONS.find(c => c.key === data.condition);
  const mode = MODES.find(m => m.key === data.mode);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em" }}>ตรวจก่อนโพสต์</div>
        <div style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>ดูว่าโพสต์ของคุณจะหน้าตาแบบไหน</div>
      </div>

      <div style={{ background: C.card, borderRadius: 24, overflow: "hidden", boxShadow: "0 16px 34px rgba(19,16,13,.10)", marginBottom: 20 }}>
        <div style={{ height: 200, background: C.surface, position: "relative" }}>
          {coverImg
            ? <img src={coverImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 40 }}>{cat?.icon || "📦"}</div>
          }
          <div style={{ position: "absolute", left: 10, top: 10, background: "rgba(255,255,255,.92)", padding: "6px 10px", borderRadius: 999, fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>
            มีอยู่
          </div>
          <div style={{ position: "absolute", right: 10, top: 10, background: C.brand, color: "#fff", padding: "6px 10px", borderRadius: 999, fontSize: 10, fontWeight: 900 }}>
            {mode?.label}
          </div>
        </div>

        <div style={{ padding: "14px 16px 16px" }}>
          <div style={{ fontSize: 18, fontWeight: 900 }}>{data.haveTitle || "(ยังไม่ได้ใส่ชื่อ)"}</div>
          {data.haveDesc && <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{data.haveDesc}</div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            {cat && <span style={{ padding: "6px 10px", borderRadius: 999, background: C.surface, fontSize: 11, fontWeight: 800 }}>{cat.icon} {cat.label}</span>}
            {cond && <span style={{ padding: "6px 10px", borderRadius: 999, background: C.surface, fontSize: 11, fontWeight: 800 }}>{cond.label}</span>}
            {data.location && <span style={{ padding: "6px 10px", borderRadius: 999, background: C.surface, fontSize: 11, fontWeight: 800 }}>📍 {data.location}</span>}
          </div>
          {data.wantTitle && (
            <div style={{ marginTop: 12, background: C.surface, borderRadius: 12, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#7b625a" }}>ต้องการแลก</div>
              <div style={{ fontSize: 14, fontWeight: 800, marginTop: 3 }}>{data.wantTitle}</div>
            </div>
          )}
          {data.price && (
            <div style={{ marginTop: 10, fontSize: 16, fontWeight: 900 }}>฿{Number(data.price).toLocaleString("th-TH")}</div>
          )}
        </div>
      </div>

      <div style={{ background: C.surface, borderRadius: 18, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 10 }}>รายการตรวจสอบ</div>
        {[
          { ok: data.images.length > 0,    label: `รูปสินค้า (${data.images.length} รูป)` },
          { ok: data.haveTitle.length > 3,  label: "ชื่อสินค้า" },
          { ok: !!data.category,            label: "หมวดหมู่" },
          { ok: !!data.condition,           label: "สภาพสินค้า" },
          { ok: data.mode !== "swap" || data.wantTitle.length > 2, label: "สินค้าที่ต้องการ (ถ้าเลือกโหมดแลก)" },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 0", borderBottom: i < 4 ? `1px solid ${C.line}` : "none" }}>
            <span style={{ fontSize: 16 }}>{item.ok ? "✅" : "⚠️"}</span>
            <span style={{ fontSize: 13, fontWeight: item.ok ? 700 : 900, color: item.ok ? C.muted : "#c0392b" }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────
export default function AddListingScreen({ currentUser, onDone, onBack, showToast }) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [data, setData] = useState({
    images:    [],
    haveTitle: "",
    haveDesc:  "",
    category:  "",
    condition: "used_good",
    location:  "",
    mode:      "swap",
    wantTitle: "",
    wantDesc:  "",
    price:     "",
  });

  const update = useCallback((key, val) => {
    setData(prev => ({ ...prev, [key]: val }));
  }, []);

  const canNext = () => {
    if (step === 1) return data.haveTitle.trim().length > 2 && data.category && data.condition;
    if (step === 2) return data.mode && (data.mode === "sell" || data.wantTitle.trim().length > 2);
    return true;
  };

  const handleNext = () => {
    if (step < 3) setStep(s => s + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(s => s - 1);
    else onBack();
  };

  const handleSubmit = async () => {
    if (!currentUser) return showToast("กรุณาเข้าสู่ระบบก่อน");
    setSubmitting(true);
    try {
      const listing = await createListing(currentUser.id, {
        have_title:    data.haveTitle.trim(),
        have_desc:     data.haveDesc.trim() || null,
        have_category: data.category,
        condition:     data.condition,
        location:      data.location.trim() || null,
        mode:          data.mode,
        want_title:    data.wantTitle.trim() || null,
        want_desc:     data.wantDesc.trim() || null,
        price:         data.price ? Number(data.price) : null,
        have_images:   [],
      });

      let imageUrls = [];
      if (data.images.length > 0) {
        const files = data.images.map(i => i.file).filter(Boolean);
        if (files.length > 0) {
          try {
            imageUrls = await uploadListingImages(listing.id, files);
          } catch {
            // รูปอัปโหลดไม่สำเร็จ — ยังโพสต์ได้แต่ไม่มีรูป
          }
        }
      }

      if (imageUrls.length > 0) {
        await supabase.from("listings").update({ have_images: imageUrls }).eq("id", listing.id);
      }

      showToast("โพสต์สำเร็จแล้ว 🎉");
      onDone();
    } catch (e) {
      showToast("เกิดข้อผิดพลาด: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const stepLabel = ["สินค้าที่มี", "สิ่งที่ต้องการ", "ตรวจก่อนโพสต์"];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "Inter,ui-sans-serif,system-ui,sans-serif", color: C.text, display: "flex", flexDirection: "column" }}>

      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px 0" }}>
        <button onClick={handleBack} style={{ width: 42, height: 42, borderRadius: 14, background: C.card, boxShadow: C.shadow, border: "none", cursor: "pointer", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          ←
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 900 }}>ลงประกาศ</div>
          <div style={{ fontSize: 12, color: C.muted }}>ขั้นตอน {step} — {stepLabel[step - 1]}</div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 900, color: C.brand }}>{step}/3</div>
      </div>

      <StepDots step={step} />

      <div style={{ flex: 1, padding: "0 14px", overflowY: "auto" }}>
        {step === 1 && <Step1 data={data} onChange={update} />}
        {step === 2 && <Step2 data={data} onChange={update} />}
        {step === 3 && <Step3 data={data} />}
        <div style={{ height: 100 }} />
      </div>

      <div style={{ position: "sticky", bottom: 0, padding: "12px 14px 28px", background: `linear-gradient(transparent, ${C.bg} 40%)` }}>
        {step < 3 ? (
          <button
            onClick={handleNext}
            disabled={!canNext()}
            style={{
              width: "100%", height: 56, borderRadius: 20,
              background: canNext() ? "linear-gradient(180deg,#ff7b51,#ff6a3d)" : C.surface,
              color: canNext() ? "#341811" : C.muted,
              border: "none", fontSize: 16, fontWeight: 900, letterSpacing: "0.02em",
              cursor: canNext() ? "pointer" : "default",
              boxShadow: canNext() ? "0 12px 22px rgba(255,106,61,.22)" : "none",
              transition: "all .2s",
            }}
          >
            ถัดไป →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              width: "100%", height: 56, borderRadius: 20,
              background: submitting ? C.surface : "linear-gradient(180deg,#1f8c58,#17714a)",
              color: submitting ? C.muted : "#fff",
              border: "none", fontSize: 16, fontWeight: 900, letterSpacing: "0.02em",
              cursor: submitting ? "default" : "pointer",
              boxShadow: submitting ? "none" : "0 12px 22px rgba(31,140,88,.22)",
              transition: "all .2s",
            }}
          >
            {submitting ? "กำลังโพสต์…" : "🚀 โพสต์เลย"}
          </button>
        )}
      </div>
    </div>
  );
}
