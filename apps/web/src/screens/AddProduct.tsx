import React, { useEffect, useMemo, useRef, useState } from "react";
import { HeartHandshake, ImagePlus, X } from "lucide-react";
import { api, asset } from "../lib/api";
import { categories, conditionLabels, conditions, categoryLabels, dealLabels, wantedFallbacks } from "../lib/constants";
import type { DealType, Item, RequireLogin, User } from "../lib/types";
import { LoginCTA } from "../components/LoginCTA";

const maxProductImages = 5;
const fileFingerprint = (file: File) => `${file.name}:${file.size}:${file.lastModified}`;
const normalizeImageUrls = (urls: string[]) => [...new Set(urls.map((url) => url.trim()).filter(Boolean))].slice(0, maxProductImages);

export function AddProduct({
  onDone,
  user,
  requireLogin,
  editingItem
}: {
  onDone: (item: Item) => void | Promise<void>;
  user: User | null;
  requireLogin: RequireLogin;
  editingItem?: Item | null;
}) {
  const draftKey = "qxwap:add-product:draft";
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const createRequestKeyRef = useRef("");
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
  const [existingImages, setExistingImages] = useState<string[]>(editingItem?.media.images || []);
  const [files, setFiles] = useState<File[]>([]);
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setExistingImages(editingItem?.media.images || []);
    setFiles([]);
    setErr("");
    setSubmitting(false);
    createRequestKeyRef.current = "";
  }, [editingItem]);

  useEffect(() => {
    if (editingItem) return;
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      setForm((current) => ({
        ...current,
        ...draft,
        wanted_tags: Array.isArray(draft?.wanted_tags) && draft.wanted_tags.length ? draft.wanted_tags : current.wanted_tags
      }));
    } catch {
      window.localStorage.removeItem(draftKey);
    }
  }, [editingItem]);

  useEffect(() => {
    if (editingItem) return;
    window.localStorage.setItem(draftKey, JSON.stringify(form));
  }, [draftKey, editingItem, form]);

  const imagePreviews = useMemo(
    () => [
      ...existingImages.map((url, index) => ({ id: `existing-${index}`, url: asset(url), existing: true })),
      ...files.map((file, index) => ({ id: `new-${index}`, url: URL.createObjectURL(file), existing: false }))
    ],
    [existingImages, files]
  );

  useEffect(() => {
    return () => {
      imagePreviews.forEach((image) => {
        if (!image.existing && image.url.startsWith("blob:")) URL.revokeObjectURL(image.url);
      });
    };
  }, [imagePreviews]);

  if (!user) return <LoginCTA requireLogin={requireLogin} title="ลงสินค้าใหม่" />;

  function appendFiles(nextFiles: FileList | null) {
    if (!nextFiles?.length) return;
    const seen = new Set(files.map(fileFingerprint));
    const picked = Array.from(nextFiles).filter((file) => file.type.startsWith("image/") && !seen.has(fileFingerprint(file)));
    const remainingSlots = maxProductImages - normalizeImageUrls(existingImages).length - files.length;
    if (remainingSlots <= 0) {
      setErr(`เพิ่มรูปได้สูงสุด ${maxProductImages} รูปต่อสินค้า`);
      return;
    }
    const accepted = picked.slice(0, remainingSlots);
    if (accepted.length < picked.length) {
      setErr(`เลือกได้สูงสุด ${maxProductImages} รูปต่อสินค้า`);
    } else {
      setErr("");
    }
    setFiles((current) => [...current, ...accepted]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePreview(index: number, isExisting: boolean) {
    setErr("");
    if (isExisting) {
      setExistingImages((current) => current.filter((_, currentIndex) => currentIndex !== index));
      return;
    }
    setFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setErr("");
    setSubmitting(true);
    try {
      let uploadedImages: string[] = [];
      if (files.length) {
        const fd = new FormData();
        files.forEach((file) => fd.append("images", file));
        uploadedImages = (await api<{ urls: string[] }>("/upload", { method: "POST", body: fd })).urls;
      }
      const images = normalizeImageUrls([...existingImages, ...uploadedImages]);
      if (!editingItem && !createRequestKeyRef.current) {
        createRequestKeyRef.current =
          globalThis.crypto?.randomUUID?.() || `qxwap-item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      }
      const data = await api<{ item: Item }>(editingItem ? `/items/${editingItem.id}` : "/items", {
        method: editingItem ? "PATCH" : "POST",
        headers: editingItem ? undefined : { "X-Idempotency-Key": createRequestKeyRef.current },
        body: JSON.stringify({
          ...form,
          price_cash: Number(form.price_cash || 0),
          price_credit: Number(form.price_credit || 0),
          wanted_tags: form.wanted_tags.filter(Boolean),
          images
        })
      });
      if (!editingItem) window.localStorage.removeItem(draftKey);
      createRequestKeyRef.current = "";
      setFiles([]);
      await onDone(data.item);
    } catch (error: any) {
      setErr(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="screen">
      <div className="section-head">
        <h1>{editingItem ? "แก้ไขสินค้า" : "ลงสินค้าใหม่"}</h1>
      </div>

      <form className="form" onSubmit={submit}>
        <fieldset className="form-fieldset" disabled={submitting}>
        <div className="deal-picks">
          {(["swap", "sell", "buy", "both"] as DealType[]).map((dealType) => (
            <button
              key={dealType}
              type="button"
              className={form.deal_type === dealType ? "picked" : ""}
              onClick={() => setForm({ ...form, deal_type: dealType })}
            >
              <HeartHandshake />
              {dealLabels[dealType]}
            </button>
          ))}
        </div>

        <input
          required
          placeholder="ชื่อสินค้า"
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
        />
        <textarea
          placeholder="สภาพ ตำหนิ อุปกรณ์ที่ให้ไปด้วย หรือเงื่อนไขที่ควรรู้ก่อนติดต่อ"
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
        />

        <div className="two">
          <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
            {categories.map((category) => (
              <option key={category} value={category}>
                {categoryLabels[category]}
              </option>
            ))}
          </select>
          <select value={form.condition} onChange={(event) => setForm({ ...form, condition: event.target.value })}>
            {conditions.map((condition) => (
              <option key={condition} value={condition}>
                {conditionLabels[condition]}
              </option>
            ))}
          </select>
        </div>

        <input
          placeholder="พื้นที่นัดรับหรือจัดส่ง"
          value={form.location_label}
          onChange={(event) => setForm({ ...form, location_label: event.target.value })}
        />

        <div className="media-picker-panel">
          <div className="media-picker-head">
            <b>รูปสินค้า</b>
            <span>{existingImages.length + files.length}/{maxProductImages} รูป</span>
          </div>
          <p>เพิ่มได้เรื่อย ๆ จนครบ 5 รูป รูปแรกจะถูกใช้เป็นภาพหลักของสินค้า</p>
          <label className="media-picker-trigger">
            <ImagePlus size={18} />
            {submitting ? "กำลังอัปโหลดรูป..." : "เพิ่มรูปสินค้า"}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              disabled={submitting}
              onChange={(event) => appendFiles(event.target.files)}
            />
          </label>

          <div className="media-preview-grid">
            {imagePreviews.length ? (
              imagePreviews.map((image, index) => (
                <figure className="media-preview-card" key={image.id}>
                  <img src={image.url || wantedFallbacks.Other} alt={`รูปสินค้า ${index + 1}`} />
                  <figcaption>{index === 0 ? "ภาพหลัก" : `ภาพที่ ${index + 1}`}</figcaption>
                  <button
                    type="button"
                    className="media-preview-remove"
                    aria-label={`ลบรูปที่ ${index + 1}`}
                    onClick={() => removePreview(image.existing ? index : index - existingImages.length, image.existing)}
                  >
                    <X size={14} />
                  </button>
                </figure>
              ))
            ) : (
              <div className="media-preview-empty">ยังไม่ได้เลือกรูปสินค้า</div>
            )}
          </div>
        </div>

        <div className="two">
          <input
            inputMode="numeric"
            placeholder="ราคาเงินสด เช่น 100"
            value={form.price_cash}
            disabled={submitting}
            onChange={(event) => setForm({ ...form, price_cash: event.target.value })}
          />
          <input
            inputMode="numeric"
            placeholder="เครดิต เช่น 1000"
            value={form.price_credit}
            disabled={submitting}
            onChange={(event) => setForm({ ...form, price_credit: event.target.value })}
          />
        </div>

        <label className="check">
          <input
            type="checkbox"
            checked={form.open_to_offers}
            disabled={submitting}
            onChange={(event) => setForm({ ...form, open_to_offers: event.target.checked })}
          />{" "}
          เปิดรับข้อเสนออื่นเพิ่มเติม
        </label>

        <textarea
          placeholder="อยากได้อะไรตอบแทนเป็นพิเศษ"
          value={form.wanted_text}
          disabled={submitting}
          onChange={(event) => setForm({ ...form, wanted_text: event.target.value })}
        />

        {form.wanted_tags.map((tag, index) => (
          <input
            key={index}
            placeholder="เช่น กล้องฟิล์ม, รองเท้าเทนนิส, บัตรคอนเสิร์ต"
            value={tag}
            disabled={submitting}
            onChange={(event) =>
              setForm({
                ...form,
                wanted_tags: form.wanted_tags.map((current, currentIndex) => (currentIndex === index ? event.target.value : current))
              })
            }
          />
        ))}

        <button
          type="button"
          className="secondary wide add-wanted-tag-button"
          disabled={submitting}
          onClick={() => setForm({ ...form, wanted_tags: [...form.wanted_tags, ""] })}
        >
          + เพิ่มสิ่งที่อยากได้
        </button>
        </fieldset>

        {err ? <p className="err">{err}</p> : null}

        <button className="primary wide" disabled={submitting}>
          {submitting ? "กำลังบันทึก..." : editingItem ? "บันทึกสินค้า" : "เผยแพร่สินค้า"}
        </button>
      </form>
    </section>
  );
}
