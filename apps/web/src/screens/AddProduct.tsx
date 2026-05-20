import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, HeartHandshake, ImagePlus, X } from "lucide-react";
import { api, asset } from "../lib/api";
import { categories, conditionLabels, conditions, categoryLabels, dealLabels, wantedFallbacks } from "../lib/constants";
import type { DealType, Item, RequireLogin, User } from "../lib/types";
import { LoginCTA } from "../components/LoginCTA";
import { useDialogA11y } from "../lib/useDialogA11y";

const maxProductImages = 5;
const maxWantedTags = 5;
const fileFingerprint = (file: File) => `${file.name}:${file.size}:${file.lastModified}`;
const normalizeImageUrls = (urls: string[]) => [...new Set(urls.map((url) => url.trim()).filter(Boolean))].slice(0, maxProductImages);
const digitsOnly = (value: string) => value.replace(/[^\d]/g, "");

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
  const pickerInputRef = useRef<HTMLInputElement | null>(null);
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
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [pickerFiles, setPickerFiles] = useState<File[]>([]);
  const [pickerError, setPickerError] = useState("");
  const [err, setErr] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ price_cash?: string; price_credit?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const { dialogRef, onBackdropMouseDown } = useDialogA11y(() => closeImagePicker());

  useEffect(() => {
    setExistingImages(editingItem?.media.images || []);
    setFiles([]);
    setImagePickerOpen(false);
    setPickerFiles([]);
    setPickerError("");
    setErr("");
    setFieldErrors({});
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

  const pickerPreviews = useMemo(
    () => pickerFiles.map((file, index) => ({ id: `picker-${index}`, url: URL.createObjectURL(file) })),
    [pickerFiles]
  );

  useEffect(() => {
    return () => {
      pickerPreviews.forEach((image) => URL.revokeObjectURL(image.url));
    };
  }, [pickerPreviews]);

  if (!user) return <LoginCTA requireLogin={requireLogin} title="ลงสินค้าใหม่" />;

  function acceptImageBatch(sourceFiles: File[], baseline: File[]) {
    const seen = new Set(baseline.map(fileFingerprint));
    const picked = sourceFiles.filter((file) => file.type.startsWith("image/") && !seen.has(fileFingerprint(file)));
    const remainingSlots = maxProductImages - normalizeImageUrls(existingImages).length - baseline.length;
    const accepted = picked.slice(0, Math.max(remainingSlots, 0));
    const rejected = picked.length - accepted.length;
    return {
      accepted,
      message:
        remainingSlots <= 0
          ? `เพิ่มรูปได้สูงสุด ${maxProductImages} รูปต่อสินค้า`
          : rejected > 0
            ? `เลือกได้สูงสุด ${maxProductImages} รูปต่อสินค้า`
            : ""
    };
  }

  function openImagePicker() {
    const currentCount = normalizeImageUrls(existingImages).length + files.length;
    if (currentCount >= maxProductImages) {
      setErr(`เพิ่มรูปได้สูงสุด ${maxProductImages} รูปต่อสินค้า`);
      return;
    }
    setPickerFiles([]);
    setPickerError("");
    setImagePickerOpen(true);
  }

  function closeImagePicker() {
    setImagePickerOpen(false);
    setPickerFiles([]);
    setPickerError("");
    if (pickerInputRef.current) pickerInputRef.current.value = "";
  }

  function openPickerFileDialog() {
    pickerInputRef.current?.click();
  }

  function queuePickerFiles(nextFiles: FileList | null) {
    if (!nextFiles?.length) return;
    const { accepted, message } = acceptImageBatch(Array.from(nextFiles), [...files, ...pickerFiles]);
    setPickerFiles((current) => [...current, ...accepted]);
    setPickerError(message);
    if (pickerInputRef.current) pickerInputRef.current.value = "";
  }

  function confirmImagePicker() {
    if (!pickerFiles.length) return;
    setErr("");
    setFiles((current) => [...current, ...pickerFiles]);
    closeImagePicker();
  }

  function changeNumericField(field: "price_cash" | "price_credit", value: string) {
    const nextValue = digitsOnly(value);
    setForm((current) => ({ ...current, [field]: nextValue }));
    setFieldErrors((current) => ({ ...current, [field]: value && !nextValue ? "กรอกตัวเลขเท่านั้น" : "" }));
  }

  function removePreview(index: number, isExisting: boolean) {
    setErr("");
    if (isExisting) {
      setExistingImages((current) => current.filter((_, currentIndex) => currentIndex !== index));
      return;
    }
    setFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function removePickerPreview(index: number) {
    setPickerError("");
    setPickerFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function removeWantedTag(index: number) {
    setForm((current) => {
      const nextTags = current.wanted_tags.filter((_, currentIndex) => currentIndex !== index);
      return { ...current, wanted_tags: nextTags.length ? nextTags : [""] };
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setErr("");
    const nextFieldErrors: { price_cash?: string; price_credit?: string } = {};
    if (form.price_cash && !digitsOnly(form.price_cash)) nextFieldErrors.price_cash = "กรอกตัวเลขเท่านั้น";
    if (form.price_credit && !digitsOnly(form.price_credit)) nextFieldErrors.price_credit = "กรอกตัวเลขเท่านั้น";
    setFieldErrors(nextFieldErrors);
    if (Object.values(nextFieldErrors).some(Boolean)) return;
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
      <div className="section-head add-product-head">
        <div>
          <h1>{editingItem ? "แก้ไขสินค้า" : "ลงสินค้าใหม่"}</h1>
          <p>{editingItem ? "อัปเดตข้อมูลสินค้า รูปภาพ และสิ่งที่อยากได้" : "เพิ่มสินค้าให้ครบ แล้วระบุว่าคุณอยากแลกกับอะไร"}</p>
        </div>
      </div>

      <form className="form" onSubmit={submit}>
        <fieldset className="form-fieldset" disabled={submitting}>
          <div className="panel add-product-section">
            <div className="section-head compact add-product-section-head">
              <h2>รูปแบบดีล</h2>
              <p>เลือกว่ารายการนี้ต้องการแลก ขาย ซื้อ หรือเปิดได้หลายแบบ</p>
            </div>
            <div className="deal-picks" role="radiogroup" aria-label="รูปแบบดีล">
              {(["swap", "sell", "buy", "both"] as DealType[]).map((dealType) => (
                <button
                  key={dealType}
                  type="button"
                  role="radio"
                  aria-checked={form.deal_type === dealType}
                  className={form.deal_type === dealType ? "picked" : ""}
                  onClick={() => setForm({ ...form, deal_type: dealType })}
                >
                  <HeartHandshake />
                  {dealLabels[dealType]}
                </button>
              ))}
            </div>
          </div>

          <div className="panel add-product-section">
            <div className="section-head compact add-product-section-head">
              <h2>ข้อมูลสินค้า</h2>
              <p>ใส่ชื่อ รายละเอียด หมวดหมู่ สภาพ และพื้นที่ที่สะดวกนัดรับ</p>
            </div>
            <label className="form-stack">
              <span>ชื่อสินค้า</span>
              <input
                required
                placeholder="เช่น Fujifilm X-T30 พร้อมเลนส์ kit"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </label>
            <label className="form-stack">
              <span>รายละเอียดสินค้า</span>
              <textarea
                placeholder="สภาพ ตำหนิ อุปกรณ์ที่ให้ไปด้วย หรือเงื่อนไขที่ควรรู้ก่อนติดต่อ"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </label>

            <div className="two add-product-two-col">
              <label className="form-stack">
                <span>หมวดหมู่</span>
                <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {categoryLabels[category]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-stack">
                <span>สภาพสินค้า</span>
                <select value={form.condition} onChange={(event) => setForm({ ...form, condition: event.target.value })}>
                  {conditions.map((condition) => (
                    <option key={condition} value={condition}>
                      {conditionLabels[condition]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="form-stack">
              <span>พื้นที่นัดรับหรือจัดส่ง</span>
              <input
                placeholder="เช่น อารีย์, BTS สยาม, ส่งผ่านขนส่งได้"
                value={form.location_label}
                onChange={(event) => setForm({ ...form, location_label: event.target.value })}
              />
            </label>
          </div>

          <div className="panel add-product-section">
            <div className="section-head compact add-product-section-head">
              <h2>รูปสินค้า</h2>
              <p>ใส่รูปได้สูงสุด 5 รูป รูปแรกจะเป็นภาพหลักของรายการนี้</p>
            </div>
            <div className="media-picker-panel">
              <div className="media-picker-head">
                <b>รูปที่เลือก</b>
                <span>{existingImages.length + files.length}/{maxProductImages} รูป</span>
              </div>
              <button type="button" className="media-picker-trigger secondary wide" onClick={openImagePicker}>
                <ImagePlus size={18} />
                เพิ่มรูปสินค้า
              </button>

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
          </div>

          <div className="panel add-product-section">
            <div className="section-head compact add-product-section-head">
              <h2>ราคาและข้อเสนอ</h2>
              <p>กำหนดราคาเงินสด ราคาเครดิต และระบุว่ารับข้อเสนอเพิ่มเติมหรือไม่</p>
            </div>
            <div className="two add-product-two-col">
              <label className="form-stack">
                <span>ราคาเงินสด</span>
                <input
                  aria-invalid={Boolean(fieldErrors.price_cash)}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="เช่น 100"
                  value={form.price_cash}
                  disabled={submitting}
                  onChange={(event) => changeNumericField("price_cash", event.target.value)}
                />
                {fieldErrors.price_cash ? <small className="field-error">{fieldErrors.price_cash}</small> : null}
              </label>
              <label className="form-stack">
                <span>ราคาเครดิต</span>
                <input
                  aria-invalid={Boolean(fieldErrors.price_credit)}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="เช่น 1000"
                  value={form.price_credit}
                  disabled={submitting}
                  onChange={(event) => changeNumericField("price_credit", event.target.value)}
                />
                {fieldErrors.price_credit ? <small className="field-error">{fieldErrors.price_credit}</small> : null}
              </label>
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
          </div>

          <div className="panel add-product-section">
            <div className="section-head compact add-product-section-head">
              <h2>สิ่งที่อยากได้</h2>
              <p>อธิบายสิ่งที่อยากแลกด้วย และเพิ่ม keyword ที่ช่วยให้คนค้นหาเจอได้ง่ายขึ้น</p>
            </div>
            <label className="form-stack">
              <span>รายละเอียดสิ่งที่อยากได้</span>
              <textarea
                placeholder="อยากได้อะไรตอบแทนเป็นพิเศษ"
                value={form.wanted_text}
                disabled={submitting}
                onChange={(event) => setForm({ ...form, wanted_text: event.target.value })}
              />
            </label>

            <div className="wanted-tag-list">
              {form.wanted_tags.map((tag, index) => (
                <div className="wanted-tag-row" key={index}>
                  <label className="form-stack">
                    <span>{`คำค้นที่อยากได้ ${index + 1}`}</span>
                    <input
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
                  </label>
                  {form.wanted_tags.length > 1 ? (
                    <button
                      type="button"
                      className="wanted-tag-remove"
                      aria-label={`ลบคำค้นที่อยากได้ ${index + 1}`}
                      disabled={submitting}
                      onClick={() => removeWantedTag(index)}
                    >
                      <X size={16} />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>

            <button
              type="button"
              className="secondary wide add-wanted-tag-button"
              disabled={submitting || form.wanted_tags.length >= maxWantedTags}
              onClick={() => setForm({ ...form, wanted_tags: [...form.wanted_tags, ""] })}
            >
              {form.wanted_tags.length >= maxWantedTags ? `เพิ่มได้สูงสุด ${maxWantedTags} คำค้น` : "+ เพิ่มคำค้นที่อยากได้"}
            </button>
          </div>
        </fieldset>

        {err ? <p className="err">{err}</p> : null}

        <button className="primary wide" disabled={submitting}>
          {submitting ? "กำลังบันทึก..." : editingItem ? "บันทึกสินค้า" : "เผยแพร่สินค้า"}
        </button>
      </form>

      {imagePickerOpen ? (
        <div className="sheet-backdrop" onMouseDown={onBackdropMouseDown}>
          <section
            ref={dialogRef}
            className="sheet add-product-image-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="image-picker-title"
            tabIndex={-1}
          >
            <div className="sheet-head">
              <h2 id="image-picker-title">เพิ่มรูปสินค้า</h2>
              <button type="button" onClick={closeImagePicker} aria-label="ปิดหน้าต่างเพิ่มรูปสินค้า">
                <X />
              </button>
            </div>
            <p className="add-product-image-sheet-copy">
              เลือกรูปที่จะเพิ่มเข้ารายการนี้ แล้วกดยืนยันเพื่อกลับไปหน้าฟอร์มเดิม
            </p>
            <input
              ref={pickerInputRef}
              className="media-picker-input"
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => queuePickerFiles(event.target.files)}
            />
            <button type="button" className="media-picker-trigger secondary wide add-product-image-sheet-trigger" onClick={openPickerFileDialog}>
              <ImagePlus size={18} />
              เลือกรูปจากเครื่อง
            </button>
            {pickerError ? <p className="err">{pickerError}</p> : null}
            <div className="media-preview-grid add-product-image-sheet-grid">
              {pickerPreviews.length ? (
                pickerPreviews.map((image, index) => (
                  <figure className="media-preview-card" key={image.id}>
                    <img src={image.url || wantedFallbacks.Other} alt={`รูปสินค้าที่เลือก ${index + 1}`} />
                    <figcaption>{`รูปที่ ${index + 1}`}</figcaption>
                    <button
                      type="button"
                      className="media-preview-remove"
                      aria-label={`ลบรูปที่เลือก ${index + 1}`}
                      onClick={() => removePickerPreview(index)}
                    >
                      <X size={14} />
                    </button>
                  </figure>
                ))
              ) : (
                <div className="media-preview-empty">ยังไม่ได้เลือกรูปสำหรับรอบนี้</div>
              )}
            </div>
            <div className="sheet-actions add-product-image-sheet-actions">
              <button type="button" className="secondary" onClick={closeImagePicker}>
                ยกเลิก
              </button>
              <button type="button" className="primary" onClick={confirmImagePicker} disabled={!pickerFiles.length}>
                <Check size={16} /> ยืนยันการเพิ่มรูป
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
