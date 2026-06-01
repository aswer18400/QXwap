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
import { ApiError, asset } from "../lib/api";
import { categories, categoryLabels, conditionLabels, conditions, dealLabels, wantedFallbacks } from "../lib/constants";
import type { DealType, HashtagStat, Item, LocationOption, RequireLogin, User, WantedItem } from "../lib/types";
import { PageHeader } from "../components/PageHeader";
import { canXwap } from "../lib/format";
import { useDialogA11y } from "../lib/useDialogA11y";
import { GuestAccessScreen } from "../components/GuestAccessScreen";
import { PageState } from "../components/PageState";
import { itemService, mediaService, wantedItemService } from "../services";

const maxProductImages = 5;
const maxWantedTags = 5;
const draftKey = "qxwap:add-product:draft";
const wantedUrgencyOptions = [
  { value: "low", label: "ยังไม่รีบ" },
  { value: "normal", label: "ปกติ" },
  { value: "high", label: "ต้องการเร็ว" }
] as const;

type PostKind = "item" | "wanted";
type PublishStatus = "active" | "inactive";
type WantedUrgency = (typeof wantedUrgencyOptions)[number]["value"];
type SubmitState =
  | "draft"
  | "validating"
  | "uploading"
  | "publishing"
  | "success"
  | "error"
  | "validation_error"
  | "empty_required_fields";

type FieldErrors = Partial<Record<
  "title" | "description" | "category" | "condition" | "location_label" | "price_cash" | "wanted_tags" | "images" | "publish_status",
  string
>>;

type PostFormState = {
  deal_type: DealType;
  title: string;
  description: string;
  category: string;
  condition: string;
  location_label: string;
  latitude: string;
  longitude: string;
  price_cash: string;
  price_cash_unknown: boolean;
  open_to_offers: boolean;
  wanted_text: string;
  publish_status: PublishStatus;
  urgency: WantedUrgency;
};

type AddProductResult =
  | { kind: "item"; item: Item }
  | { kind: "wanted"; wantedItem: WantedItem };

function buildDefaultForm(postKind: PostKind): PostFormState {
  return {
    deal_type: postKind === "wanted" ? "buy" : "swap",
    title: "",
    description: "",
    category: "Electronics",
    condition: "Good",
    location_label: "",
    latitude: "",
    longitude: "",
    price_cash: "",
    price_cash_unknown: false,
    open_to_offers: true,
    wanted_text: "",
    publish_status: "active",
    urgency: "normal"
  };
}

function buildItemForm(item: Item | null | undefined): PostFormState {
  const base = buildDefaultForm("item");
  if (!item) return base;
  return {
    ...base,
    deal_type: item.deal.type,
    title: item.title || "",
    description: item.description || "",
    category: item.category || base.category,
    condition: item.condition || base.condition,
    location_label: item.location.label || "",
    latitude: item.location.latitude == null ? "" : String(item.location.latitude),
    longitude: item.location.longitude == null ? "" : String(item.location.longitude),
    price_cash: item.deal.price_cash ? String(item.deal.price_cash) : "",
    price_cash_unknown: item.deal.price_cash_unknown ?? false,
    open_to_offers: item.deal.open_to_offers ?? true,
    wanted_text: item.wanted.text || "",
    publish_status: item.status === "inactive" ? "inactive" : "active",
    urgency: "normal"
  };
}

function buildWantedForm(wantedItem: WantedItem | null | undefined): PostFormState {
  const base = buildDefaultForm("wanted");
  if (!wantedItem) return base;
  return {
    ...base,
    deal_type: wantedItem.deal_type || "buy",
    title: wantedItem.title || "",
    description: wantedItem.description || "",
    category: wantedItem.category || base.category,
    location_label: wantedItem.location_label || "",
    latitude: wantedItem.latitude == null ? "" : String(wantedItem.latitude),
    longitude: wantedItem.longitude == null ? "" : String(wantedItem.longitude),
    wanted_text: wantedItem.wanted_text || "",
    publish_status: wantedItem.status === "inactive" ? "inactive" : "active",
    urgency: (wantedItem.urgency as WantedUrgency) || "normal"
  };
}

function digitsOnly(value: string) {
  return value.replace(/[^\d]/g, "");
}

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim();
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

function extractTagKeywords(value: string) {
  return [...new Set(
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length >= 3)
  )].slice(0, 4);
}

export function AddProduct({
  onDone,
  onBack,
  user,
  requireLogin,
  editingItem,
  editingWantedItem,
  postKind,
  onPostKindChange,
  editMode = "edit"
}: {
  onDone: (result: AddProductResult) => void | Promise<void>;
  onBack: () => void;
  user: User | null;
  requireLogin: RequireLogin;
  editingItem?: Item | null;
  editingWantedItem?: WantedItem | null;
  postKind: PostKind;
  onPostKindChange: (nextKind: PostKind) => void;
  editMode?: "edit" | "reswap";
}) {
  const pickerInputRef = useRef<HTMLInputElement | null>(null);
  const createRequestKeyRef = useRef("");
  const activePostKind: PostKind = editingWantedItem ? "wanted" : editingItem ? "item" : postKind;
  const persistedDraftKey = user ? `${draftKey}:${user.id}:${activePostKind}` : `${draftKey}:${activePostKind}`;
  const [form, setForm] = useState<PostFormState>(() =>
    editingWantedItem ? buildWantedForm(editingWantedItem) : buildItemForm(editingItem)
  );
  const [wantedTags, setWantedTags] = useState<string[]>(
    editingWantedItem?.wanted_tags?.length
      ? editingWantedItem.wanted_tags
      : editingItem?.wanted.tags?.length
        ? editingItem.wanted.tags
        : []
  );
  const [wantedDraft, setWantedDraft] = useState("");
  const [wantedSuggestions, setWantedSuggestions] = useState<HashtagStat[]>([]);
  const [manualTagSuggestions, setManualTagSuggestions] = useState<HashtagStat[]>([]);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationOption[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(editingWantedItem?.reference_images || editingItem?.media.images || []);
  const [files, setFiles] = useState<File[]>([]);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [pickerFiles, setPickerFiles] = useState<File[]>([]);
  const [pickerError, setPickerError] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [hashtagsLoading, setHashtagsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>("draft");
  const [previewVisible, setPreviewVisible] = useState(false);
  const [err, setErr] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [locating, setLocating] = useState(false);
  const { dialogRef, onBackdropMouseDown } = useDialogA11y(() => closeImagePicker(), imagePickerOpen);
  const isReswap = editMode === "reswap" && Boolean(editingItem);
  const isEditingWanted = Boolean(editingWantedItem);
  const isWantedPost = activePostKind === "wanted";
  const latestTradeEntry = editingItem?.trade?.history?.[0] || null;

  function persistDraft(nextForm = form, nextWantedTags = wantedTags, nextWantedDraft = wantedDraft) {
    if (editingItem || editingWantedItem) return;
    const safeDraft = {
      postKind: activePostKind,
      form: {
        deal_type: nextForm.deal_type,
        title: nextForm.title,
        description: nextForm.description,
        category: nextForm.category,
        condition: nextForm.condition,
        location_label: nextForm.location_label,
        latitude: nextForm.latitude,
        longitude: nextForm.longitude,
        price_cash: nextForm.price_cash,
        price_cash_unknown: nextForm.price_cash_unknown,
        open_to_offers: nextForm.open_to_offers,
        wanted_text: nextForm.wanted_text,
        publish_status: nextForm.publish_status,
        urgency: nextForm.urgency
      },
      wantedTags: nextWantedTags,
      wantedDraft: nextWantedDraft
    };
    window.localStorage.setItem(persistedDraftKey, JSON.stringify(safeDraft));
  }

  function handleBack() {
    persistDraft();
    onBack();
  }

  useEffect(() => {
    const nextForm =
      editingWantedItem ? buildWantedForm(editingWantedItem) : editingItem ? buildItemForm(editingItem) : buildDefaultForm(activePostKind);
    setExistingImages(editingWantedItem?.reference_images || editingItem?.media.images || []);
    setFiles([]);
    setPickerFiles([]);
    setImagePickerOpen(false);
    setPickerError("");
    setErr("");
    setFieldErrors({});
    setSubmitState("draft");
    setPreviewVisible(false);
    setWantedTags(
      editingWantedItem?.wanted_tags?.length
        ? editingWantedItem.wanted_tags
        : editingItem?.wanted.tags?.length
          ? editingItem.wanted.tags
          : []
    );
    setWantedDraft("");
    setLocationSuggestions([]);
    createRequestKeyRef.current = "";
    if (editingItem || editingWantedItem) {
      setForm(nextForm);
      return;
    }
    try {
      const raw = window.localStorage.getItem(persistedDraftKey);
      if (!raw) {
        setForm(nextForm);
        return;
      }
      const draft = JSON.parse(raw);
      setForm({
        ...nextForm,
        ...draft.form,
        price_cash_unknown: Boolean(draft?.form?.price_cash_unknown),
        publish_status: draft?.form?.publish_status === "inactive" ? "inactive" : "active",
        urgency: draft?.form?.urgency === "low" || draft?.form?.urgency === "high" ? draft.form.urgency : "normal"
      });
      setWantedTags(Array.isArray(draft?.wantedTags) ? draft.wantedTags : []);
      setWantedDraft(typeof draft?.wantedDraft === "string" ? draft.wantedDraft : "");
    } catch {
      window.localStorage.removeItem(persistedDraftKey);
      setForm(nextForm);
    }
  }, [activePostKind, editingItem, editingWantedItem, persistedDraftKey]);

  useEffect(() => {
    persistDraft();
  }, [editingItem, editingWantedItem, form, persistedDraftKey, wantedDraft, wantedTags]);

  useEffect(() => {
    let active = true;
    const sourceText = `${form.title} ${form.description}`.trim();
    const keywords = extractTagKeywords(sourceText);
    if (!keywords.length) {
      setWantedSuggestions([]);
      setHashtagsLoading(false);
      return () => {
        active = false;
      };
    }
    setHashtagsLoading(true);
    Promise.all(
      keywords.map((keyword) =>
        itemService.suggestHashtags(keyword, 5).catch(() => [] as HashtagStat[])
      )
    )
      .then((responses) => {
        if (!active) return;
        const ranked = new Map<string, HashtagStat>();
        responses
          .flatMap((response) => response)
          .forEach((tag) => {
            if (!ranked.has(tag.tag)) ranked.set(tag.tag, tag);
          });
        setWantedSuggestions(Array.from(ranked.values()).slice(0, 8));
      })
      .catch(() => active && setWantedSuggestions([]))
      .finally(() => active && setHashtagsLoading(false));
    return () => {
      active = false;
    };
  }, [form.title, form.description]);

  useEffect(() => {
    let active = true;
    const query = normalizeTag(wantedDraft);
    if (!query) {
      setManualTagSuggestions([]);
      return () => {
        active = false;
      };
    }
    itemService.suggestHashtags(query, 8)
      .then((data) => active && setManualTagSuggestions(data))
      .catch(() => active && setManualTagSuggestions([]));
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
      itemService.searchLocations(query)
        .then((data) => setLocationSuggestions(data))
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
  const activeImageCount = existingImages.length + files.length;
  const publishLabel = isWantedPost
    ? isEditingWanted
      ? "บันทึกรายการที่อยากได้"
      : "เผยแพร่สิ่งที่อยากได้"
    : isReswap
      ? "ยืนยันแลกต่อ"
      : editingItem
        ? "บันทึกรายการ"
        : "เผยแพร่สินค้า";
  const priceFieldVisible = !form.price_cash_unknown;
  const guestTitle = isWantedPost ? "ลงสิ่งที่อยากได้" : isReswap ? "แลกต่อสินค้า" : "ลงสินค้าใหม่";
  const publishStateLabel =
    submitState === "uploading"
      ? "กำลังอัปโหลดรูป..."
      : submitState === "publishing"
        ? "กำลังเผยแพร่รายการ..."
        : submitState === "success"
          ? "เผยแพร่เรียบร้อย"
          : submitState === "validation_error" || submitState === "empty_required_fields"
            ? "ยังมีข้อมูลที่ต้องแก้ก่อนเผยแพร่"
            : submitState === "error"
              ? "เกิดข้อผิดพลาดระหว่างเผยแพร่"
              : "";

  useEffect(() => {
    return () => {
      pickerPreviews.forEach((image) => URL.revokeObjectURL(image.url));
    };
  }, [pickerPreviews]);

  if (!user) {
    return (
      <GuestAccessScreen
        requireLogin={requireLogin}
        title={guestTitle}
        subtitle={isReswap ? "เข้าสู่ระบบก่อนเริ่มแลกต่อ" : isWantedPost ? "เข้าสู่ระบบก่อนลงสิ่งที่อยากได้" : "เข้าสู่ระบบก่อนลงประกาศ"}
        onBack={handleBack}
        hideDefaultDetails
      />
    );
  }
  if (!canXwap(user)) {
    return (
      <section className="screen add-product-screen add-product-screen--restricted">
        <PageHeader title={isWantedPost ? "ลงสิ่งที่อยากได้" : isReswap ? "แลกต่อสินค้า" : "เพิ่มสินค้า"} onBack={handleBack} align="left" />
        <div className="panel">
          <PageState
            state="empty"
            title={isReswap ? "ยังไม่สามารถเปิดดีลรอบใหม่จากสินค้านี้" : "ยังไม่สามารถลงสินค้าใหม่ได้"}
            actions={[{ label: "กลับไปหน้าก่อน", onClick: handleBack, variant: "secondary" }]}
            align="left"
          />
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
    const incomingFiles = Array.from(list);
    const imageFiles = incomingFiles.filter((file) => file.type.startsWith("image/"));
    const accepted = acceptImageBatch(imageFiles, [...files, ...pickerFiles]);
    setPickerFiles((current) => [...current, ...accepted]);
    const rejectedCount = imageFiles.length - accepted.length;
    if (rejectedCount > 0) {
      setPickerError(`เลือกได้สูงสุด ${maxProductImages} รูป ระบบข้าม ${rejectedCount} รูปที่เกินลิมิตหรือซ้ำกับรูปเดิม`);
    } else if (incomingFiles.length !== imageFiles.length) {
      setPickerError("รองรับเฉพาะไฟล์รูปภาพ");
    } else {
      setPickerError("");
    }
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
    if (!navigator.geolocation) {
      setFieldErrors((current) => ({ ...current, location_label: "อุปกรณ์นี้ไม่รองรับการอ่านตำแหน่ง กรุณาค้นหาพื้นที่เอง" }));
      setErr("อุปกรณ์นี้ไม่รองรับ GPS");
      return;
    }
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
      (error) => {
        setLocating(false);
        let message = "ไม่สามารถอ่านตำแหน่งปัจจุบันได้ ลองค้นหาพื้นที่เองอีกครั้ง";
        if (error.code === error.PERMISSION_DENIED) {
          message = "คุณปฏิเสธสิทธิ์เข้าถึงตำแหน่ง เปิดสิทธิ์ Location ก่อน หรือพิมพ์พื้นที่นัดรับเอง";
        } else if (error.code === error.TIMEOUT) {
          message = "ใช้เวลาอ่านตำแหน่งนานเกินไป ลองอีกครั้งหรือพิมพ์พื้นที่นัดรับเอง";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = "ไม่สามารถระบุตำแหน่งปัจจุบันได้ในตอนนี้ กรุณาค้นหาพื้นที่เอง";
        }
        setFieldErrors((current) => ({ ...current, location_label: message }));
        setErr(message);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function handlePriceChange(rawValue: string) {
    const hasInvalidCharacters = /[^\d,\s]/.test(rawValue);
    setForm((current) => ({ ...current, price_cash: digitsOnly(rawValue) }));
    if (hasInvalidCharacters) {
      setFieldErrors((current) => ({ ...current, price_cash: "กรอกราคาเป็นตัวเลขเท่านั้น" }));
      return;
    }
    clearFieldError("price_cash");
  }

  function validateForm() {
    setSubmitState("validating");
    const nextFieldErrors: FieldErrors = {};
    const needsCashDecision = !isWantedPost && (form.deal_type === "sell" || form.deal_type === "both");
    if (!compactText(form.title)) nextFieldErrors.title = "กรอกชื่อสินค้า";
    if (!compactText(form.description)) nextFieldErrors.description = isWantedPost ? "อธิบายสิ่งที่อยากได้ให้ชัดเจน" : "กรอกรายละเอียดสินค้า";
    if (isWantedPost && compactText(form.description).length < 10) nextFieldErrors.description = "อธิบายสิ่งที่อยากได้อย่างน้อย 10 ตัวอักษร";
    if (!compactText(form.category)) nextFieldErrors.category = "เลือกหมวดหมู่";
    if (!isWantedPost && !compactText(form.condition)) nextFieldErrors.condition = "เลือกสภาพสินค้า";
    if (!compactText(form.location_label)) nextFieldErrors.location_label = "เลือกพื้นที่นัดรับ";
    if (!isWantedPost && normalizeImageUrls(existingImages).length + files.length === 0) nextFieldErrors.images = "เพิ่มรูปสินค้าอย่างน้อย 1 รูป";
    if (!form.price_cash_unknown && form.price_cash && !digitsOnly(form.price_cash)) nextFieldErrors.price_cash = "กรอกตัวเลขเท่านั้น";
    if (needsCashDecision && !form.price_cash_unknown && !Number(form.price_cash || 0)) {
      nextFieldErrors.price_cash = "กรอกราคาเงินสดหรือเลือกไม่ทราบราคา";
    }
    if (!isWantedPost && !wantedTags.length && !compactText(form.wanted_text)) {
      nextFieldErrors.wanted_tags = isWantedPost ? "เพิ่มแท็กหรือ preference เพื่ออธิบายสิ่งที่อยากได้" : "เพิ่ม Hashtag หรืออธิบายสิ่งที่อยากได้";
    }
    const hasErrors = Object.keys(nextFieldErrors).length > 0;
    setFieldErrors(nextFieldErrors);
    if (hasErrors) {
      setSubmitState(Object.values(nextFieldErrors).some(Boolean) ? "validation_error" : "empty_required_fields");
      setErr("ตรวจสอบข้อมูลที่กรอกอีกครั้ง");
      window.requestAnimationFrame(() => {
        document.querySelector<HTMLElement>(".field-error")?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    } else {
      setSubmitState("draft");
    }
    return !hasErrors;
  }

  async function finishPublishFlow(result: AddProductResult) {
    if (!editingItem && !editingWantedItem) {
      window.localStorage.removeItem(persistedDraftKey);
    }
    createRequestKeyRef.current = "";
    setFiles([]);
    setPickerFiles([]);
    setPreviewVisible(false);
    setSubmitState("success");
    await onDone(result);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting || !validateForm()) return;
    setSubmitting(true);
    setErr("");
    let uploadedImages: string[] = [];
    try {
      if (files.length) {
        setSubmitState("uploading");
        uploadedImages = await mediaService.uploadImages(files);
      }
      const images = normalizeImageUrls([...existingImages, ...uploadedImages]);
      setSubmitState("publishing");
      if (!editingItem && !createRequestKeyRef.current) {
        createRequestKeyRef.current = globalThis.crypto?.randomUUID?.() || `qxwap-item-${Date.now()}`;
      }
      if (isWantedPost) {
        const wantedPayload = {
          title: compactText(form.title),
          description: compactText(form.description),
          category: form.category,
          deal_type: "buy" as DealType,
          wanted_text: compactText(form.wanted_text),
          wanted_tags: wantedTags,
          reference_images: images,
          urgency: form.urgency,
          status: form.publish_status,
          location_label: compactText(form.location_label),
          latitude: form.latitude ? Number(form.latitude) : null,
          longitude: form.longitude ? Number(form.longitude) : null
        };
        const wantedItem = editingWantedItem
          ? await wantedItemService.updateWantedItem(editingWantedItem.id, wantedPayload)
          : await wantedItemService.createWantedItem(wantedPayload);
        await finishPublishFlow({ kind: "wanted", wantedItem });
      } else {
        const payload = {
          title: compactText(form.title),
          description: compactText(form.description),
          category: form.category,
          condition: form.condition,
          deal_type: form.deal_type,
          status: form.publish_status,
          location_label: compactText(form.location_label),
          latitude: form.latitude ? Number(form.latitude) : null,
          longitude: form.longitude ? Number(form.longitude) : null,
          price_cash: form.price_cash_unknown ? 0 : Number(form.price_cash || 0),
          price_cash_unknown: form.price_cash_unknown,
          price_credit: 0,
          open_to_offers: form.open_to_offers,
          wanted_text: compactText(form.wanted_text),
          wanted_tags: wantedTags,
          images
        };
        const item = editingItem
          ? await itemService.updateItem(editingItem.id, payload)
          : await itemService.createItem(payload, createRequestKeyRef.current);
        await finishPublishFlow({ kind: "item", item });
      }
    } catch (error) {
      if (uploadedImages.length) {
        void mediaService.cleanupUploads(uploadedImages).catch(() => undefined);
      }
      const mapped = mapValidationError(error);
      setSubmitState(mapped ? "validation_error" : "error");
      if (!mapped) setErr(error instanceof Error ? error.message : isWantedPost ? "เพิ่มสิ่งที่อยากได้ไม่สำเร็จ" : "เพิ่มสินค้าไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="screen add-product-screen">
      <PageHeader
        title={isWantedPost ? (isEditingWanted ? "แก้ไขสิ่งที่อยากได้" : "ลงสิ่งที่อยากได้") : isReswap ? "แลกต่อ" : editingItem ? "แก้ไขสินค้า" : "ลงสินค้า"}
        onBack={handleBack}
        align="left"
      />
      <form className="form add-product-form--reference" onSubmit={submit}>
        <fieldset className="form-fieldset" disabled={submitting}>
          {!editingItem && !editingWantedItem ? (
            <div className="panel add-product-section">
              <div className="deal-picks" role="radiogroup" aria-label="ประเภทประกาศ">
                <button
                  type="button"
                  role="radio"
                  aria-checked={!isWantedPost}
                  className={!isWantedPost ? "picked" : ""}
                  onClick={() => onPostKindChange("item")}
                >
                  <span className="deal-pick-icon" aria-hidden="true"><SwapDealIcon size={18} /></span>
                  <b>ลงของที่มี</b>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={isWantedPost}
                  className={isWantedPost ? "picked" : ""}
                  onClick={() => onPostKindChange("wanted")}
                >
                  <span className="deal-pick-icon" aria-hidden="true"><ShoppingCartIcon size={18} /></span>
                  <b>ลงสิ่งที่อยากได้</b>
                </button>
              </div>
            </div>
          ) : null}
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

          {!isWantedPost ? (
            <div className="panel add-product-section">
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
                    <span className="deal-pick-icon" aria-hidden="true">
                      {dealType === "swap" ? <SwapDealIcon size={18} /> : null}
                      {dealType === "sell" ? <PriceCashIcon size={18} /> : null}
                      {dealType === "buy" ? <ShoppingCartIcon size={18} /> : null}
                      {dealType === "both" ? <DealBothIcon size={18} /> : null}
                    </span>
                    <b>{dealLabels[dealType]}</b>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="panel add-product-section">
              <div className="section-head compact add-product-section-head">
                <h2>สถานะ</h2>
              </div>
              <label className="form-stack">
                <span>ความเร่งด่วน</span>
                <select value={form.urgency} onChange={(event) => setForm((current) => ({ ...current, urgency: event.target.value as WantedUrgency }))}>
                  {wantedUrgencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <div className="panel add-product-section">
            <div className="section-head compact add-product-section-head">
              <h2>รายละเอียด</h2>
            </div>
            <label className="form-stack">
              <span>ชื่อ <span className="field-required" aria-hidden="true">*</span></span>
              <input
                required
                aria-invalid={Boolean(fieldErrors.title)}
                value={form.title}
                onChange={(event) => {
                  clearFieldError("title");
                  setForm((current) => ({ ...current, title: event.target.value }));
                }}
                onBlur={() => setForm((current) => ({ ...current, title: compactText(current.title) }))}
                placeholder={isWantedPost ? "เช่น โต๊ะทำงานไม้โอ๊กขนาดเล็ก หรือกล้องฟิล์ม Canonet" : "เช่น iPhone 13 สี Midnight 128GB พร้อมกล่อง"}
              />
              {fieldErrors.title ? <small className="field-error">{fieldErrors.title}</small> : null}
            </label>
            <label className="form-stack">
              <span>รายละเอียด <span className="field-required" aria-hidden="true">*</span></span>
              <textarea
                aria-invalid={Boolean(fieldErrors.description)}
                value={form.description}
                onChange={(event) => {
                  clearFieldError("description");
                  setForm((current) => ({ ...current, description: event.target.value }));
                }}
                onBlur={() => setForm((current) => ({ ...current, description: compactText(current.description) }))}
                placeholder={isWantedPost ? "อธิบายสิ่งที่กำลังหา รุ่น สี งบประมาณ หรือเงื่อนไขที่ยอมรับได้ให้ชัดเจน" : "บอกสภาพ ตำหนิ อุปกรณ์ที่ให้ไปด้วย และเงื่อนไขสำคัญของรายการนี้"}
              />
              {fieldErrors.description ? <small className="field-error">{fieldErrors.description}</small> : null}
            </label>
            <div className="two add-product-two-col">
              <label className="form-stack">
                <span>หมวด <span className="field-required" aria-hidden="true">*</span></span>
                <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
                  {categories.map((category) => (
                    <option key={category} value={category}>{categoryLabels[category]}</option>
                  ))}
                </select>
                {fieldErrors.category ? <small className="field-error">{fieldErrors.category}</small> : null}
              </label>
              {!isWantedPost ? (
                <label className="form-stack">
                  <span>สภาพ <span className="field-required" aria-hidden="true">*</span></span>
                  <select value={form.condition} onChange={(event) => setForm((current) => ({ ...current, condition: event.target.value }))}>
                    {conditions.map((condition) => (
                      <option key={condition} value={condition}>{conditionLabels[condition]}</option>
                    ))}
                  </select>
                  {fieldErrors.condition ? <small className="field-error">{fieldErrors.condition}</small> : null}
                </label>
              ) : (
                <label className="form-stack">
                  <span>สถานะ</span>
                  <select value={form.publish_status} onChange={(event) => setForm((current) => ({ ...current, publish_status: event.target.value as PublishStatus }))}>
                    <option value="active">เผยแพร่ทันที</option>
                    <option value="inactive">เก็บเป็นร่าง</option>
                  </select>
                </label>
              )}
            </div>
          </div>

          <div className="panel add-product-section">
            <div className="section-head compact add-product-section-head">
              <h2>รูป {!isWantedPost ? <span className="field-required" aria-hidden="true">*</span> : null}</h2>
            </div>
            <div className="media-picker-head">
              <span>{activeImageCount}/{maxProductImages} รูป</span>
            </div>
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
              )) : <div className="media-preview-empty">{isWantedPost ? "แตะเพื่อเพิ่มรูปอ้างอิง (ไม่บังคับ)" : "แตะเพื่อเริ่มใส่รูปสินค้า"}</div>}
              {activeImageCount < maxProductImages ? (
                <button type="button" className="media-upload-add-tile" onClick={openImagePicker}>
                  <AddMediaActionIcon size={20} />
                  <span>เพิ่มรูป</span>
                </button>
              ) : null}
            </div>
          </div>

          {!isWantedPost ? (
            <div className="panel add-product-section">
            <div className="section-head compact add-product-section-head">
              <h2>ราคา</h2>
            </div>
            <label className="check">
              <input
                type="checkbox"
                aria-label="ไม่ทราบราคาสินค้า"
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
            {priceFieldVisible ? (
              <label className="form-stack">
                <span>ราคาเงินสด</span>
                <input
                  value={form.price_cash}
                  inputMode="numeric"
                  aria-invalid={Boolean(fieldErrors.price_cash)}
                  placeholder="เช่น 3,500"
                  onChange={(event) => handlePriceChange(event.target.value)}
                />
                {fieldErrors.price_cash ? <small className="field-error">{fieldErrors.price_cash}</small> : null}
              </label>
            ) : null}
            <label className="check">
              <input type="checkbox" aria-label="รับข้อเสนออื่นด้วย" checked={form.open_to_offers} onChange={(event) => setForm((current) => ({ ...current, open_to_offers: event.target.checked }))} /> รับข้อเสนออื่นด้วย
            </label>
            <label className="form-stack">
              <span>สถานะ</span>
              <select value={form.publish_status} onChange={(event) => setForm((current) => ({ ...current, publish_status: event.target.value as PublishStatus }))}>
                <option value="active">เผยแพร่ทันที</option>
                <option value="inactive">เก็บเป็นร่าง</option>
              </select>
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
          ) : null}

          <div className="panel add-product-section">
            <div className="section-head compact add-product-section-head">
              <h2>พื้นที่</h2>
            </div>
            <button type="button" className="secondary wide" onClick={() => void useCurrentLocation()} disabled={locating}>
              <NearbyToolbarIcon size={16} /> {locating ? "กำลังอ่านตำแหน่ง..." : "ใช้พื้นที่ปัจจุบัน"}
            </button>
            <label className="form-stack">
              <span>{isWantedPost ? "พื้นที่สะดวก" : "พื้นที่นัดรับ"}</span>
              <input
                aria-invalid={Boolean(fieldErrors.location_label)}
                value={form.location_label}
                onChange={(event) => {
                  clearFieldError("location_label");
                  setForm((current) => ({ ...current, location_label: event.target.value }));
                }}
                onBlur={() => setForm((current) => ({ ...current, location_label: compactText(current.location_label) }))}
                placeholder={isWantedPost ? "เช่น อารีย์, สยาม หรือส่งแมสเซนเจอร์ในเมือง" : "เช่น BTS สยาม, อารีย์, หรือเซ็นทรัลลาดพร้าว"}
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
              <h2>{isWantedPost ? "แท็ก" : "อยากแลกอะไร"}</h2>
            </div>
            <label className="form-stack">
              <span>แท็ก</span>
              <div className="hashtag-input-row">
                <span className="hashtag-prefix">#</span>
                <input value={wantedDraft} onChange={(event) => setWantedDraft(event.target.value)} onBlur={() => setWantedDraft(compactText(wantedDraft))} placeholder={isWantedPost ? "เช่น minimal, ไม้จริง, ส่งด่วน, หรือมือสองสภาพดี" : "เช่น กล้องฟิล์ม, โต๊ะทำงาน, หรือเครดิต"} />
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
              {hashtagsLoading ? <div className="hashtag-suggestion-head"><span>กำลังโหลด...</span></div> : null}
              <div className="tags large hashtag-grid">
                {wantedSuggestions.map((tag) => (
                  <button key={tag.tag} type="button" onClick={() => addWantedTag(tag.tag)}>
                    <HashtagMetaIcon size={14} /> #{tag.tag}
                  </button>
                ))}
              </div>
            </div>
            {manualTagSuggestions.length ? (
              <div className="hashtag-suggestion-block">
                <div className="tags large hashtag-grid">
                  {manualTagSuggestions.map((tag) => (
                    <button key={`manual-${tag.tag}`} type="button" onClick={() => addWantedTag(tag.tag)}>
                      <HashtagMetaIcon size={14} /> #{tag.tag}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <label className="form-stack">
              <span>{isWantedPost ? "รายละเอียดเพิ่ม" : "อยากได้อะไร"}</span>
              <textarea value={form.wanted_text} onChange={(event) => setForm((current) => ({ ...current, wanted_text: event.target.value }))} onBlur={() => setForm((current) => ({ ...current, wanted_text: compactText(current.wanted_text) }))} placeholder={isWantedPost ? "เช่น ขอสีเข้ม, รับของได้สุดสัปดาห์, หรือขอราคาไม่เกินงบที่ตั้งไว้" : "เช่น ขอเฉพาะสภาพดี หรือคุยรายละเอียดเพิ่มเติมได้"} />
            </label>
          </div>

          {previewVisible ? (
            <div className="panel add-product-section post-publish-shell">
              <div className="post-publish-card">
                <div className="post-publish-hero">
                  <img src={imagePreviews[0]?.url || wantedFallbacks.Other} alt={form.title || "ตัวอย่างประกาศ"} />
                  <span className="post-publish-badge">{isWantedPost ? "Wanted" : "สินค้า"}</span>
                </div>
                <div className="post-publish-copy">
                  <h1>{compactText(form.title) || "ยังไม่ได้ตั้งชื่อ"}</h1>
                  {compactText(form.description) ? <p>{compactText(form.description)}</p> : null}
                </div>
                <div className="post-publish-meta">
                  <span>{categoryLabels[form.category] || form.category}</span>
                  {!isWantedPost ? <span>{conditionLabels[form.condition] || form.condition}</span> : null}
                  <span>{compactText(form.location_label) || "ยังไม่ระบุพื้นที่"}</span>
                  {wantedTags.length ? <span>{`#${wantedTags.slice(0, 3).join(" #")}`}</span> : null}
                </div>
              </div>
            </div>
          ) : null}

          {err ? <p className="err" role="alert">{err}</p> : null}
        </fieldset>

        <div className="publish-action-bar inline">
          {publishStateLabel ? (
            <div className="publish-action-copy">
              <span className="inline-help">{publishStateLabel}</span>
            </div>
          ) : null}
          <button type="button" className="secondary" disabled={submitting} onClick={() => setPreviewVisible((current) => !current)}>
            {previewVisible ? "ซ่อนตัวอย่าง" : "ดูตัวอย่าง"}
          </button>
          <button type="submit" className="primary publish-primary" disabled={submitting}>
            <Sparkles size={16} /> {submitting ? (isWantedPost ? "กำลังเผยแพร่..." : isReswap ? "กำลังยืนยัน..." : editingItem ? "กำลังบันทึก..." : "กำลังเผยแพร่...") : publishLabel}
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
            <input ref={pickerInputRef} className="profile-avatar-input" type="file" aria-label="เลือกรูปสินค้า" accept="image/*" multiple onChange={(event) => queuePickerFiles(event.target.files)} />
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
