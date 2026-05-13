import React, { useState } from "react";
import { HeartHandshake } from "lucide-react";
import { api } from "../lib/api";
import { categories, conditionLabels, conditions, categoryLabels, dealLabels } from "../lib/constants";
import type { DealType, Item, RequireLogin, User } from "../lib/types";
import { LoginCTA } from "../components/LoginCTA";

export function AddProduct({
  onDone,
  user,
  requireLogin,
  editingItem
}: {
  onDone: (item: Item) => void;
  user: User | null;
  requireLogin: RequireLogin;
  editingItem?: Item | null;
}) {
  const [form, setForm] = useState({
    deal_type: (editingItem?.deal.type || "swap") as DealType,
    title: editingItem?.title || "",
    description: editingItem?.description || "",
    category: editingItem?.category || "Electronics",
    condition: editingItem?.condition || "Good",
    location_label: editingItem?.location.label || "",
    price_cash: editingItem?.deal.price_cash ? String(editingItem.deal.price_cash) : "",
    price_credit: editingItem?.deal.price_credit ? String(editingItem.deal.price_credit) : "",
    open_to_offers: editingItem?.deal.open_to_offers ?? true,
    wanted_text: editingItem?.wanted.text || "",
    wanted_tags: editingItem?.wanted.tags?.length ? editingItem.wanted.tags : [""]
  });
  const [files, setFiles] = useState<FileList | null>(null);
  const [err, setErr] = useState("");
  if (!user) return <LoginCTA requireLogin={requireLogin} title="เพิ่มรายการ QXwap" />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      let images: string[] = [];
      if (files?.length) {
        const fd = new FormData();
        Array.from(files).forEach((f) => fd.append("images", f));
        images = (await api<{ urls: string[] }>("/upload", { method: "POST", body: fd })).urls;
      }
      const data = await api<{ item: Item }>(editingItem ? `/items/${editingItem.id}` : "/items", {
        method: editingItem ? "PATCH" : "POST",
        body: JSON.stringify({
          ...form,
          price_cash: Number(form.price_cash || 0),
          price_credit: Number(form.price_credit || 0),
          wanted_tags: form.wanted_tags.filter(Boolean),
          images: editingItem ? [...editingItem.media.images, ...images] : images
        })
      });
      onDone(data.item);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <section className="screen">
      <h1>{editingItem ? "แก้ไขรายการ QXwap" : "เพิ่มรายการ QXwap"}</h1>
      <form className="form" onSubmit={submit}>
        <div className="deal-picks">
          {(["swap", "sell", "buy", "both"] as DealType[]).map((d) => (
            <button
              key={d}
              type="button"
              className={form.deal_type === d ? "picked" : ""}
              onClick={() => setForm({ ...form, deal_type: d })}
            >
              <HeartHandshake />
              {dealLabels[d]}
            </button>
          ))}
        </div>
        <input
          required
          placeholder="ชื่อของที่คุณมี"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <textarea
          placeholder="รายละเอียด สภาพ และสิ่งที่ควรรู้ก่อนแลก"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <div className="two">
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {categoryLabels[c]}
              </option>
            ))}
          </select>
          <select
            value={form.condition}
            onChange={(e) => setForm({ ...form, condition: e.target.value })}
          >
            {conditions.map((c) => (
              <option key={c} value={c}>
                {conditionLabels[c]}
              </option>
            ))}
          </select>
        </div>
        <input
          placeholder="พื้นที่นัดรับหรือจัดส่ง"
          value={form.location_label}
          onChange={(e) => setForm({ ...form, location_label: e.target.value })}
        />
        <input type="file" accept="image/*" multiple onChange={(e) => setFiles(e.target.files)} />
        <div className="two">
          <input
            inputMode="numeric"
            placeholder="เงินสด 100 บาท"
            value={form.price_cash}
            onChange={(e) => setForm({ ...form, price_cash: e.target.value })}
          />
          <input
            inputMode="numeric"
            placeholder="เครดิต 1000"
            value={form.price_credit}
            onChange={(e) => setForm({ ...form, price_credit: e.target.value })}
          />
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={form.open_to_offers}
            onChange={(e) => setForm({ ...form, open_to_offers: e.target.checked })}
          />{" "}
          เปิดกว้างทุกข้อเสนอ
        </label>
        <textarea
          placeholder="อยากได้อะไรเป็นพิเศษ"
          value={form.wanted_text}
          onChange={(e) => setForm({ ...form, wanted_text: e.target.value })}
        />
        {form.wanted_tags.map((t, i) => (
          <input
            key={i}
            placeholder="สิ่งที่อยากได้ เช่น กล้องฟิล์ม"
            value={t}
            onChange={(e) =>
              setForm({
                ...form,
                wanted_tags: form.wanted_tags.map((x, ix) => (ix === i ? e.target.value : x))
              })
            }
          />
        ))}
        <button
          type="button"
          onClick={() => setForm({ ...form, wanted_tags: [...form.wanted_tags, ""] })}
        >
          + เพิ่มสิ่งที่อยากได้
        </button>
        {err ? <p className="err">{err}</p> : null}
        <button className="primary wide">
          {editingItem ? "บันทึกการแก้ไข" : "บันทึกของและให้ AI จับคู่"}
        </button>
      </form>
    </section>
  );
}
