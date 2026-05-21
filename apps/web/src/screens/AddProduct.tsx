import { useEffect, useMemo, useRef, useState } from "react";
import {
  AddMediaActionIcon,
  Check,
  DealBothIcon,
  HashtagMetaIcon,
  NearbyToolbarIcon,
  Plus,
  PriceCashIcon,
  ShoppingCartIcon,
  Sparkles,
  SwapDealIcon,
  X
} from "../components/AppIcons";
import { ApiError, api, asset } from "../lib/api";
import { categories, categoryLabels, conditionLabels, conditions, dealLabels, wantedFallbacks } from "../lib/constants";
import type { DealType, HashtagStat, Item, LocationOption, RequireLogin, User } from "../lib/types";
import { LoginCTA } from "../components/LoginCTA";
import { PageHeader } from "../components/PageHeader";
import { canXwap } from "../lib/format";
import { useDialogA11y } from "../lib/useDialogA11y";

const maxProductImages = 5;
const maxWantedTags = 5;
const draftKey = "qxwap:add-product:draft";

type FieldErrors = Partial<Record<
  "title" | "description" | "category" | "condition" | "location_label" | "price_cash" | "wanted_tags" | "images",
  string
>>;

function digitsOnly(value: string) {
  return value.replace(/[^\d]/g, "");
}

function normalizeTag(value: string) {
  return value.replace(/^#+/, "").trim().replace(/\s+/g, "-").slice(0, 40);
}

function normalizeTagList(values: string[]) {
  return [...new Set(values.map(normalizeTag).filter(Boolean))].slice(0, maxWantedTags);
}

function fileFingerprint(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function normalizeImageUrls(urls: string[]) {
  return [...new Set(urls.map((url) => url.trim()).filter(Boolean))].slice(0, maxProductImages);
}

export function AddProduct({
  onDone,
  onBack,
  user,
  requireLogin,
  editingItem,
  editMode = "edit"
}: {
  onDone: (item: Item) => void | Promise<void>;
  onBack: () => void;
  user: User | null;
  requireLogin: RequireLogin;
  editingItem?: Item | null;
  editMode?: "edit" | "reswap";
}) {
  const pickerInputRef = useRef<HTMLInputElement | null>(null);
  const createRequestKeyRef = useRef("");
  const persistedDraftKey = user ? `${draftKey}:${user.id}` : draftKey;
  const [form, setForm] = useState({
    deal_type: (editingItem?.deal.type || "swap") as DealType,
    title: editingItem?.title || "",
    description: editingItem?.description || "",
    category: editingItem?.category || "Electronics",
    condition: editingItem?.condition || "Good",
    location_label: editingItem?.location.label || "",
    latitude: editingItem?.location.latitude == null ? "" : String(editingItem.location.latitude),
    longitude: editingItem?.location.longitude == null ? "" : String(editingItem.location.longitude),
    price_cash: editingItem?.deal.price_cash ? String(editingItem.deal.price_cash) : "",
    price_cash_unknown: editingItem?.deal.price_cash_unknown ?? false,
    open_to_offers: editingItem?.deal.open_to_offers ?? true,
    wanted_text: editingItem?.wanted.text || ""
  });
  const [wantedTags, setWantedTags] = useState<string[]>(editingItem?.wanted.tags?.length ? editingItem.wanted.tags : []);
  const [wantedDraft, setWantedDraft] = useState("");
  const [wantedSuggestions, setWantedSuggestions] = useState<HashtagStat[]>([]);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationOption[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(editingItem?.media.images || []);
  const [files, setFiles] = useState<File[]>([]);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [pickerFiles, setPickerFiles] = useState<File[]>([]);
  const [pickerError, setPickerError] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [hashtagsLoading, setHashtagsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [locating, setLocating] = useState(false);
  const { dialogRef, onBackdropMouseDown } = useDialogA11y(() => closeImagePicker(), imagePickerOpen);
  const isReswap = editMode === "reswap" && Boolean(editingItem);
  const latestTradeEntry = editingItem?.trade?.history?.[0] || null;

  useEffect(() => {
    setExistingImages(editingItem?.media.images || []);
    setFiles([]);
    setPickerFiles([]);
    setImagePickerOpen(false);
    setPickerError("");
    setErr("");
    setFieldErrors({});
    setWantedTags(editingItem?.wanted.tags?.length ? editingItem.wanted.tags : []);
    setWantedDraft("");
    setLocationSuggestions([]);
    createRequestKeyRef.current = "";
    setForm({
      deal_type: (editingItem?.deal.type || "swap") as DealType,
      title: editingItem?.title || "",
      description: editingItem?.description || "",
      category: editingItem?.category || "Electronics",
      condition: editingItem?.condition || "Good",
      location_label: editingItem?.location.label || "",
      latitude: editingItem?.location.latitude == null ? "" : String(editingItem.location.latitude),
      longitude: editingItem?.location.longitude == null ? "" : String(editingItem.location.longitude),
      price_cash: editingItem?.deal.price_cash ? String(editingItem.deal.price_cash) : "",
      price_cash_unknown: editingItem?.deal.price_cash_unknown ?? false,
      open_to_offers: editingItem?.deal.open_to_offers ?? true,
      wanted_text: editingItem?.wanted.text || ""
    });
  }, [editingItem]);

  useEffect(() => {
    if (editingItem) return;
    try {
      const raw = window.localStorage.getItem(persistedDraftKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      setForm((current) => ({
        ...current,
        ...draft.form,
        price_cash_unknown: Boolean(draft?.form?.price_cash_unknown)
      }));
      setWantedTags(Array.isArray(draft?.wantedTags) ? draft.wantedTags : []);
    } catch {
      window.localStorage.removeItem(persistedDraftKey);
    }
  }, [editingItem, persistedDraftKey]);

  useEffect(() => {
    if (editingItem) return;
    const safeDraft = {
      form: {
        deal_type: form.deal_type,
        title: form.title,
        description: form.description,
        category: form.category,
        condition: form.condition,
        price_cash: form.price_cash,
        price_cash_unknown: form.price_cash_unknown,
        open_to_offers: form.open_to_offers,
        wanted_text: form.wanted_text
      },
      wantedTags
    };
    window.localStorage.setItem(persistedDraftKey, JSON.stringify(safeDraft));
  }, [editingItem, form.category, form.condition, form.deal_type, form.description, form.open_to_offers, form.price_cash, form.price_cash_unknown, form.title, form.wanted_text, persistedDraftKey, wantedTags]);

  useEffect(() => {
    let active = true;
    const query = normalizeTag(wantedDraft);
    setHashtagsLoading(true);
    const endpoint = query ? `/hashtags/suggest?q=${encodeURIComponent(query)}&limit=8` : "/hashtags/trending?limit=10";
    api<{ hashtags: HashtagStat[] }>(endpoint)
      .then((data) => active && setWantedSuggestions(data.hashtags))
      .catch(() => active && setWantedSuggestions([]))
      .finally(() => active && setHashtagsLoading(false));
    return () => {
      active = false;
    };
  }, [wantedDraft]);

  useEffect(() => {
    const query = form.location_label.trim();
    if (query.length < 2) {
      setLocationSuggestions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setLocationLoading(true);
      api<{ locations: LocationOption[] }>(`/location/search?q=${encodeURIComponent(query)}`)
        .then((data) => setLocationSuggestions(data.locations))
        .catch(() => setLocationSuggestions([]))
        .finally(() => setLocationLoading(false));
    }, 220);
    return () => window.clearTimeout(timer);
  }, [form.location_label]);

  const imagePreviews = useMemo(
    () => [
      ...existingImages.map((url, index) => ({ id: `existing-${index}`, url: asset(url), existing: true })),
      ...files.map((file, index) => ({ id: `file-${index}`, url: URL.createObjectURL(file), existing: false }))
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

  if (!user) return <LoginCTA requireLogin={requireLogin} title={isReswap ? "แลกต่อสินค้า" : "ลงสินค้าใหม่"} />;
  if (!canXwap(user)) {
    return (
      <section className="screen">
        <PageHeader title={isReswap ? "แลกต่อสินค้า" : "เพิ่มสินค้า"} onBack={onBack} />
        <div className="panel">
          <p className="inline-help">บัญชีนี้ยังไม่สามารถลงสินค้าใหม่ได้ในตอนนี้</p>
        </div>
      </section>
    );
  }

  function clearFieldError(key: keyof FieldErrors) {
    setFieldErrors((current) => ({ ...current, [key]: "" }));
  }

  function mapValidationError(error: unknown) {
    if (!(error instanceof ApiError) || error.code !== "VALIDATION_ERROR" || !error.details || typeof error.details !== "object") return false;
    const details = error.details as { fieldErrors?: Record<string, string[]> };
    const nextFieldErrors: FieldErrors = {};
    if (details.fieldErrors?.title?.[0]) nextFieldErrors.title = details.fieldErrors.title[0];
    if (details.fieldErrors?.description?.[0]) nextFieldErrors.description = details.fieldErrors.description[0];
    if (details.fieldErrors?.category?.[0]) nextFieldErrors.category = details.fieldErrors.category[0];
    if (details.fieldErrors?.condition?.[0]) nextFieldErrors.condition = details.fieldErrors.condition[0];
    if (details.fieldErrors?.location_label?.[0]) nextFieldErrors.location_label = details.fieldErrors.location_label[0];
    if (details.fieldErrors?.price_cash?.[0]) nextFieldErrors.price_cash = details.fieldErrors.price_cash[0];
    if (details.fieldErrors?.wanted_tags?.[0]) nextFieldErrors.wanted_tags = details.fieldErrors.wanted_tags[0];
    setFieldErrors(nextFieldErrors);
    return Object.keys(nextFieldErrors).length > 0;
  }

  function addWantedTag(source: string) {
    const normalized = normalizeTag(source);
    if (!normalized) return;
    clearFieldError("wanted_tags");
    setWantedTags((current) => {
      const next = normalizeTagList([...current, normalized]);
      return next;
    });
    setWantedDraft("");
  }

  function removeWantedTag(tag: string) {
    setWantedTags((current) => current.filter((value) => value !== tag));
  }

  function acceptImageBatch(nextFiles: File[], baseline: File[]) {
    const seen = new Set(baseline.map(fileFingerprint));
    const accepted = nextFiles.filter((file) => file.type.startsWith("image/") && !seen.has(fileFingerprint(file)));
    const remainingSlots = maxProductImages - normalizeImageUrls(existingImages).length - baseline.length;
    return accepted.slice(0, Math.max(remainingSlots, 0));
  }

  function openImagePicker() {
    clearFieldError("images");
    const currentCount = normalizeImageUrls(existingImages).length + files.length;
    if (currentCount >= maxProductImages) {
      setErr(`เพิ่มรูปได้สูงสุด ${maxProductImages} รูป`);
      return;
    }
    setImagePickerOpen(true);
    setPickerFiles([]);
    setPickerError("");
  }

  function closeImagePicker() {
    setImagePickerOpen(false);
    setPickerFiles([]);
    setPickerError("");
    if (pickerInputRef.current) pickerInputRef.current.value = "";
  }

  function queuePickerFiles(list: FileList | null) {
    if (!list?.length) return;
    const accepted = acceptImageBatch(Array.from(list), [...files, ...pickerFiles]);
    setPickerFiles((current) => [...current, ...accepted]);
    if (!accepted.length) setPickerError(`เพิ่มรูปได้สูงสุด ${maxProductImages} รูป`);
    if (pickerInputRef.current) pickerInputRef.current.value = "";
  }

  function confirmImagePicker() {
    if (!pickerFiles.length) return;
    clearFieldError("images");
    setFiles((current) => [...current, ...pickerFiles]);
    closeImagePicker();
  }

  function removePreview(index: number, existing: boolean) {
    clearFieldError("images");
    if (existing) {
      setExistingImages((current) => current.filter((_, currentIndex) => currentIndex !== index));
      return;
    }
    setFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function useCurrentLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    clearFieldError("location_label");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({
          ...current,
          location_label: current.location_label || "ตำแหน่งปัจจุบัน",
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude)
        }));
        setLocating(false);
      },
      () => {
        setLocating(false);
        setFieldErrors((current) => ({ ...current, location_label: "ไม่สามารถอ่านตำแหน่งปัจจุบันได้ ลองค้นหาพื้นที่เองอีกครั้ง" }));
        setErr("ไม่สามารถอ่านตำแหน่งปัจจุบันได้");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function validateForm() {
    const nextFieldErrors: FieldErrors = {};
    const needsCashDecision = form.deal_type === "sell" || form.deal_type === "both";
    if (!form.title.trim()) nextFieldErrors.title = "กรอกชื่อสินค้า";
    if (!form.description.trim()) nextFieldErrors.description = "กรอกรายละเอียดสินค้า";
    if (!form.location_label.trim()) nextFieldErrors.location_label = "เลือกพื้นที่นัดรับ";
    if (!editingItem && normalizeImageUrls(existingImages).length + files.length === 0) nextFieldErrors.images = "เพิ่มรูปสินค้าอย่างน้อย 1 รูป";
    if (!form.price_cash_unknown && form.price_cash && !digitsOnly(form.price_cash)) nextFieldErrors.price_cash = "กรอกตัวเลขเท่านั้น";
    if (needsCashDecision && !form.price_cash_unknown && !Number(form.price_cash || 0)) {
      nextFieldErrors.price_cash = "กรอกราคาเงินสดหรือเลือกไม่ทราบราคา";
    }
    if (!wantedTags.length && !form.wanted_text.trim()) nextFieldErrors.wanted_tags = "เพิ่ม Hashtag หรืออธิบายสิ่งที่อยากได้";
    const hasErrors = Object.keys(nextFieldErrors).length > 0;
    setFieldErrors(nextFieldErrors);
    if (hasErrors) {
      setErr("ตรวจสอบข้อมูลที่กรอกอีกครั้ง");
      window.requestAnimationFrame(() => {
        document.querySelector<HTMLElement>(".field-error")?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
    return !hasErrors;
  }

  async function finishPublishFlow(item: Item) {
    if (!editingItem) {
      window.localStorage.removeItem(persistedDraftKey);
    }
    createRequestKeyRef.current = "";
    setFiles([]);
    setPickerFiles([]);
    await onDone(item);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting || !validateForm()) return;
    setSubmitting(true);
    setErr("");
    let uploadedImages: string[] = [];
    try {
      if (files.length) {
        const fd = new FormData();
        files.forEach((file) => fd.append("images", file));
        uploadedImages = (await api<{ urls: string[] }>("/upload", { method: "POST", body: fd })).urls;
      }
      const images = normalizeImageUrls([...existingImages, ...uploadedImages]);
      if (!editingItem && !createRequestKeyRef.current) {
        createRequestKeyRef.current = globalThis.crypto?.randomUUID?.() || `qxwap-item-${Date.now()}`;
      }
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        condition: form.condition,
        deal_type: form.deal_type,
        location_label: form.location_label.trim(),
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        price_cash: form.price_cash_unknown ? 0 : Number(form.price_cash || 0),
        price_cash_unknown: form.price_cash_unknown,
        price_credit: 0,
        open_to_offers: form.open_to_offers,
        wanted_text: form.wanted_text.trim(),
        wanted_tags: wantedTags,
        images
      };
      const data = await api<{ item: Item }>(editingItem ? `/items/${editingItem.id}` : "/items", {
        method: editingItem ? "PATCH" : "POST",
        headers: editingItem ? undefined : { "X-Idempotency-Key": createRequestKeyRef.current },
        body: JSON.stringify(payload)
      });
      await finishPublishFlow(data.item);
    } catch (error) {
      if (uploadedImages.length) {
        void api("/upload/cleanup", {
          method: "POST",
          body: JSON.stringify({ urls: uploadedImages })
        }).catch(() => undefined);
      }
      const mapped = mapValidationError(error);
      if (!mapped) setErr(error instanceof Error ? error.message : "เพิ่มสินค้าไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="screen">
      <PageHeader title={isReswap ? "แลกต่อสินค้า" : editingItem ? "แก้ไขสินค้า" : "เพิ่มสินค้า"} onBack={onBack} />
      <form className="form" onSubmit={submit}>
        <fieldset className="form-fieldset" disabled={submitting}>
          {isReswap && editingItem ? (
            <div className="panel add-product-section">
              <div className="section-head compact add-product-section-head">
                <h2>ยืนยันการแลกต่อ</h2>
              </div>
              <div className="offer-detail-copy offer-detail-facts">
                <div>
                  <small>สินค้าชิ้นเดิม</small>
                  <b>{editingItem.title}</b>
                </div>
                <div>
                  <small>เจ้าของปัจจุบัน</small>
                  <b>{editingItem.owner.name || "เจ้าของปัจจุบัน"}</b>
                </div>
                <div>
                  <small>เจ้าของก่อนหน้า</small>
                  <b>{latestTradeEntry?.previous_owner_name || "ไม่มีข้อมูล"}</b>
                </div>
                <div>
                  <small>จำนวนครั้งที่เคยแลก</small>
                  <b>{editingItem.trade?.count || 0} ครั้ง</b>
                </div>
              </div>
            </div>
          ) : null}

          <div className="panel add-product-section">
            <div className="section-head compact add-product-section-head">
              <h2>รูปแบบดีล</h2>
            </div>
            <div className="deal-picks" role="radiogroup" aria-label="รูปแบบดีล">
              {(["swap", "sell", "buy", "both"] as DealType[]).map((dealType) => (
                <button
                  key={dealType}
                  type="button"
                  role="radio"
                  aria-checked={form.deal_type === dealType}
                  className={form.deal_type === dealType ? "picked" : ""}
                  onClick={() => setForm((current) => ({ ...current, deal_type: dealType }))}
                >
                  {dealType === "swap" ? <SwapDealIcon size={18} /> : null}
                  {dealType === "sell" ? <PriceCashIcon size={18} /> : null}
                  {dealType === "buy" ? <ShoppingCartIcon size={18} /> : null}
                  {dealType === "both" ? <DealBothIcon size={18} /> : null}
                  {dealLabels[dealType]}
                </button>
              ))}
            </div>
          </div>

          <div className="panel add-product-section">
            <div className="section-head compact add-product-section-head">
              <h2>ข้อมูลสินค้า</h2>
            </div>
            <label className="form-stack">
              <span>ชื่อสินค้า</span>
              <input
                required
                value={form.title}
                onChange={(event) => {
                  clearFieldError("title");
                  setForm((current) => ({ ...current, title: event.target.value }));
                }}
                placeholder="เช่น Fujifilm X-T30 พร้อมเลนส์"
              />
              {fieldErrors.title ? <small className="field-error">{fieldErrors.title}</small> : null}
            </label>
            <label className="form-stack">
              <span>รายละเอียด</span>
              <textarea
                value={form.description}
                onChange={(event) => {
                  clearFieldError("description");
                  setForm((current) => ({ ...current, description: event.target.value }));
                }}
                placeholder="สภาพ อุปกรณ์ที่ให้ไปด้วย หรือเงื่อนไขสำคัญ"
              />
              {fieldErrors.description ? <small className="field-error">{fieldErrors.description}</small> : null}
            </label>
            <div className="two add-product-two-col">
              <label className="form-stack">
                <span>หมวดหมู่</span>
                <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
                  {categories.map((category) => (
                    <option key={category} value={category}>{categoryLabels[category]}</option>
                  ))}
                </select>
              </label>
              <label className="form-stack">
                <span>สภาพสินค้า</span>
                <select value={form.condition} onChange={(event) => setForm((current) => ({ ...current, condition: event.target.value }))}>
                  {conditions.map((condition) => (
                    <option key={condition} value={condition}>{conditionLabels[condition]}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="panel add-product-section">
            <div className="section-head compact add-product-section-head">
              <h2>รูปสินค้า</h2>
            </div>
            <div className="media-picker-head">
              <b>รูปที่เลือก</b>
              <span>{existingImages.length + files.length}/{maxProductImages} รูป</span>
            </div>
            <button type="button" className="media-picker-trigger secondary wide" onClick={openImagePicker}>
              <AddMediaActionIcon size={18} /> เพิ่มรูปสินค้า
            </button>
            {fieldErrors.images ? <small className="field-error">{fieldErrors.images}</small> : null}
            <div className="media-preview-grid compact">
              {imagePreviews.length ? imagePreviews.map((image, index) => (
                <figure className="media-preview-card compact" key={image.id}>
                  <img src={image.url || wantedFallbacks.Other} alt={`รูปสินค้า ${index + 1}`} />
                  <button
                    type="button"
                    className="media-preview-remove"
                    aria-label={`ลบรูปที่ ${index + 1}`}
                    onClick={() => removePreview(image.existing ? index : index - existingImages.length, image.existing)}
                  >
                    <X size={14} />
                  </button>
                </figure>
              )) : <div className="media-preview-empty">ยังไม่ได้เลือกรูปสินค้า</div>}
            </div>
          </div>

          <div className="panel add-product-section">
            <div className="section-head compact add-product-section-head">
              <h2>{isReswap ? "ราคาและสถานะสินค้า" : "ราคาและข้อเสนอ"}</h2>
            </div>
            <label className="form-stack">
              <span>ราคาเงินสด</span>
              <input
                value={form.price_cash}
                inputMode="numeric"
                disabled={form.price_cash_unknown}
                placeholder={form.price_cash_unknown ? "ไม่ทราบราคา" : "เช่น 3500"}
                onChange={(event) => {
                  clearFieldError("price_cash");
                  setForm((current) => ({ ...current, price_cash: digitsOnly(event.target.value) }));
                }}
              />
              {fieldErrors.price_cash ? <small className="field-error">{fieldErrors.price_cash}</small> : null}
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={form.price_cash_unknown}
                onChange={(event) => {
                  clearFieldError("price_cash");
                  setForm((current) => ({
                    ...current,
                    price_cash_unknown: event.target.checked,
                    price_cash: event.target.checked ? "" : current.price_cash
                  }));
                }}
              />{" "}
              ไม่ทราบราคา
            </label>
            <label className="check">
              <input type="checkbox" checked={form.open_to_offers} onChange={(event) => setForm((current) => ({ ...current, open_to_offers: event.target.checked }))} /> เปิดรับข้อเสนออื่นเพิ่มเติม
            </label>
            {isReswap ? (
              <div className="form-stack">
                <span>สถานะสินค้า</span>
                <div className="deal-picks reswap-status-picks" role="radiogroup" aria-label="สถานะสินค้า">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={form.open_to_offers}
                    className={form.open_to_offers ? "picked" : ""}
                    onClick={() => setForm((current) => ({ ...current, open_to_offers: true }))}
                  >
                    <Check size={18} /> พร้อมเปิดแลกต่อ
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={!form.open_to_offers}
                    className={!form.open_to_offers ? "picked" : ""}
                    onClick={() => setForm((current) => ({ ...current, open_to_offers: false }))}
                  >
                    <X size={18} /> พักรายการไว้ก่อน
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="panel add-product-section">
            <div className="section-head compact add-product-section-head">
              <h2>พื้นที่นัดรับ</h2>
            </div>
            <button type="button" className="secondary wide" onClick={() => void useCurrentLocation()} disabled={locating}>
              <NearbyToolbarIcon size={16} /> {locating ? "กำลังอ่านตำแหน่ง..." : "ใช้ตำแหน่งปัจจุบัน"}
            </button>
            <label className="form-stack">
              <span>ค้นหาพื้นที่จากแผนที่</span>
              <input
                value={form.location_label}
                onChange={(event) => {
                  clearFieldError("location_label");
                  setForm((current) => ({ ...current, location_label: event.target.value }));
                }}
                placeholder="เช่น BTS สยาม หรือ อารีย์"
              />
              {fieldErrors.location_label ? <small className="field-error">{fieldErrors.location_label}</small> : null}
            </label>
            {locationLoading ? <div className="inline-help">กำลังค้นหาพื้นที่...</div> : null}
            {locationSuggestions.length ? (
              <div className="location-suggestion-list">
                {locationSuggestions.map((location) => (
                  <button
                    key={`${location.label}-${location.latitude}-${location.longitude}`}
                    type="button"
                    className="location-suggestion-row"
                    onClick={() => {
                      setForm((current) => ({
                        ...current,
                        location_label: location.label,
                        latitude: location.latitude == null ? "" : String(location.latitude),
                        longitude: location.longitude == null ? "" : String(location.longitude)
                      }));
                      setLocationSuggestions([]);
                    }}
                  >
                    <NearbyToolbarIcon size={16} />
                    <span>{location.label}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="panel add-product-section">
            <div className="section-head compact add-product-section-head">
              <h2>Hashtag ที่อยากได้</h2>
            </div>
            <label className="form-stack">
              <span>เพิ่ม Hashtag</span>
              <div className="hashtag-input-row">
                <span className="hashtag-prefix">#</span>
                <input value={wantedDraft} onChange={(event) => setWantedDraft(event.target.value)} placeholder="เช่น กล้องฟิล์ม" />
                <button type="button" className="secondary" onClick={() => addWantedTag(wantedDraft)} disabled={!normalizeTag(wantedDraft)}>
                  <Plus size={16} /> เพิ่ม
                </button>
              </div>
            </label>
            {fieldErrors.wanted_tags ? <small className="field-error">{fieldErrors.wanted_tags}</small> : null}
            <div className="tags large hashtag-grid">
              {wantedTags.map((tag) => (
                <button key={tag} type="button" className="on" onClick={() => removeWantedTag(tag)}>
                    <HashtagMetaIcon size={14} /> #{tag} <X size={12} />
                  </button>
                ))}
              </div>
            <div className="hashtag-suggestion-block">
              <div className="hashtag-suggestion-head">
                <b>Hashtag จากระบบ</b>
                {hashtagsLoading ? <span>กำลังโหลด...</span> : null}
              </div>
              <div className="tags large hashtag-grid">
                {wantedSuggestions.map((tag) => (
                  <button key={tag.tag} type="button" onClick={() => addWantedTag(tag.tag)}>
                    <HashtagMetaIcon size={14} /> #{tag.tag}
                  </button>
                ))}
              </div>
            </div>
            <label className="form-stack">
              <span>คำอธิบายสิ่งที่อยากได้</span>
              <textarea value={form.wanted_text} onChange={(event) => setForm((current) => ({ ...current, wanted_text: event.target.value }))} placeholder="เช่น ขอเฉพาะสภาพดี หรือคุยรายละเอียดเพิ่มเติมได้" />
            </label>
          </div>

          {err ? <p className="err" role="alert">{err}</p> : null}
        </fieldset>

        <div className="publish-action-bar inline">
          <button type="submit" className="primary publish-primary" disabled={submitting}>
            <Sparkles size={16} /> {submitting ? (isReswap ? "กำลังยืนยัน..." : editingItem ? "กำลังบันทึก..." : "กำลังเผยแพร่...") : (isReswap ? "ยืนยันแลกต่อ" : editingItem ? "บันทึกรายการ" : "เผยแพร่สินค้า")}
          </button>
        </div>
      </form>

      {imagePickerOpen ? (
        <div className="sheet-backdrop" onMouseDown={onBackdropMouseDown}>
          <section ref={dialogRef} className="sheet media-picker-sheet" role="dialog" aria-modal="true" aria-labelledby="image-picker-title" tabIndex={-1}>
            <div className="sheet-head">
              <h2 id="image-picker-title">เพิ่มรูปสินค้า</h2>
              <button type="button" onClick={closeImagePicker} aria-label="ปิดหน้าต่างเพิ่มรูปสินค้า">
                <X />
              </button>
            </div>
            <input ref={pickerInputRef} className="profile-avatar-input" type="file" accept="image/*" multiple onChange={(event) => queuePickerFiles(event.target.files)} />
            <button type="button" className="secondary wide media-picker-trigger" onClick={() => pickerInputRef.current?.click()}>
              <AddMediaActionIcon size={18} /> เลือกรูปจากเครื่อง
            </button>
            <div className="media-preview-grid compact">
              {pickerPreviews.length ? pickerPreviews.map((image, index) => (
                <figure className="media-preview-card compact" key={image.id}>
                  <img src={image.url} alt={`ตัวอย่างรูป ${index + 1}`} />
                  <button type="button" className="media-preview-remove" aria-label={`ลบรูปที่ ${index + 1}`} onClick={() => setPickerFiles((current) => current.filter((_, currentIndex) => currentIndex !== index))}>
                    <X size={14} />
                  </button>
                </figure>
              )) : <div className="media-preview-empty">เลือกรูปก่อนกดยืนยัน</div>}
            </div>
            {pickerError ? <p className="err">{pickerError}</p> : null}
            <div className="sheet-actions">
              <button type="button" className="secondary" onClick={closeImagePicker}>ยกเลิก</button>
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
