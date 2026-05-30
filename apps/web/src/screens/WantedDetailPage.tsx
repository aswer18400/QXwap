import { useMemo, useState } from "react";
import { BackIcon, EditProfileIcon, SearchNavIcon, SwapDealIcon, Trash2, XwapActionIcon } from "../components/AppIcons";
import { asset } from "../lib/api";
import { categoryLabels, dealLabels, wantedFallbacks } from "../lib/constants";
import { formatIntegerValue, formatRatingValue, profileLevel } from "../lib/format";
import type { RequireLogin, User, WantedItem } from "../lib/types";
import { ImageGalleryDialog } from "../components/ImageGalleryDialog";
import { PageState } from "../components/PageState";
import { StatusBadge } from "../components/StatusBadge";
import { TrustPillList } from "../components/TrustPillList";

const urgencyLabels: Record<string, string> = {
  low: "ยังไม่รีบ",
  normal: "กำลังหาอยู่",
  high: "ต้องการด่วน"
};

export function WantedDetailPage({
  wantedItem,
  user,
  onBack,
  onOpenOwner,
  onOpenExplore,
  onEdit,
  onToggleAvailability,
  onDelete,
  onCreateListing,
  requireLogin
}: {
  wantedItem: WantedItem | null;
  user: User | null;
  onBack: () => void;
  onOpenOwner: (user: User) => void;
  onOpenExplore: (wantedItem: WantedItem) => void;
  onEdit: (wantedItem: WantedItem) => void;
  onToggleAvailability: (wantedItem: WantedItem) => void;
  onDelete: (wantedItem: WantedItem) => void;
  onCreateListing: () => void;
  requireLogin: RequireLogin;
}) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  if (!wantedItem) {
    return (
      <section className="screen wanted-detail-screen">
        <PageState
          state="empty"
          title="ไม่พบ wanted listing นี้"
          actions={[{ label: "กลับไปหน้า Explore", onClick: onBack }]}
          align="left"
        />
      </section>
    );
  }

  const isOwner = Boolean(user && user.id === wantedItem.owner_id);
  const owner = wantedItem.owner;
  const ownerLevel = profileLevel(owner || undefined);
  const images = wantedItem.reference_images?.length ? wantedItem.reference_images : [wantedFallbacks.Other];
  const trustPills = [
    ownerLevel.title,
    owner?.rating ? `รีวิว ★ ${formatRatingValue(owner.rating)}` : null,
    owner?.city ? `นัดรับ ${owner.city}` : null,
    wantedItem.status === "active" ? "กำลังเปิดรับข้อเสนอ" : "ปิดประกาศอยู่"
  ].filter(Boolean) as string[];
  const wantedTags = wantedItem.wanted_tags?.filter(Boolean) || [];
  const categoryLabel = categoryLabels[wantedItem.category] || wantedItem.category;
  const urgencyLabel = urgencyLabels[wantedItem.urgency || "normal"] || "กำลังหาอยู่";
  const ownerName = owner?.display_name || owner?.username || "QXwap user";
  const ownerMeta = owner?.rating ? `รีวิว ★ ${formatRatingValue(owner.rating)}` : owner?.city || "ยังไม่มีรีวิว";
  const summaryFacts = useMemo(
    () => [
      { label: "หมวดหมู่", value: categoryLabel },
      { label: "ประเภทดีล", value: dealLabels[wantedItem.deal_type] || wantedItem.deal_type },
      { label: "ความเร่งด่วน", value: urgencyLabel },
      { label: "พื้นที่ที่สะดวก", value: wantedItem.location_label || "ยังไม่ระบุ" }
    ],
    [categoryLabel, urgencyLabel, wantedItem.deal_type, wantedItem.location_label]
  );

  function openMatchingResults() {
    onOpenExplore(wantedItem!);
  }

  function openCreateListing() {
    if (!user) {
      requireLogin("เข้าสู่ระบบก่อนแล้วค่อยลงของที่มีเพื่อตอบโจทย์นี้");
      return;
    }
    onCreateListing();
  }

  return (
    <section className="screen wanted-detail-screen">
      <div className="wanted-detail-hero panel">
        <div className="wanted-detail-topbar">
          <button type="button" className="wanted-detail-icon" onClick={onBack} aria-label="ย้อนกลับ">
            <BackIcon size={18} />
          </button>
          <div className="wanted-detail-topbar-actions">
            <StatusBadge kind="dealType" status={wantedItem.deal_type} label={dealLabels[wantedItem.deal_type] || wantedItem.deal_type} />
            <StatusBadge kind="item" status={wantedItem.status} label={wantedItem.status === "active" ? "เปิดรับอยู่" : "ปิดประกาศ"} />
          </div>
        </div>

        <div className="wanted-detail-gallery">
          <button
            type="button"
            className="wanted-detail-gallery-button"
            onClick={() => {
              setGalleryIndex(0);
              setGalleryOpen(true);
            }}
            aria-label={`เปิดรูปอ้างอิงของ ${wantedItem.title}`}
          >
            <img src={asset(images[0]) || wantedFallbacks.Other} alt={wantedItem.title} />
          </button>
          {images.length > 1 ? <span className="wanted-detail-gallery-count">{formatIntegerValue(images.length)} รูปอ้างอิง</span> : null}
        </div>

        <div className="wanted-detail-copy">
          <h1>{wantedItem.title}</h1>
          <p>{wantedItem.wanted_text || wantedItem.description}</p>
        </div>

        <div className="wanted-detail-actions">
          {isOwner ? (
            <>
              <button type="button" className="primary" onClick={() => onEdit(wantedItem)}>
                <EditProfileIcon size={16} />
                แก้ wanted นี้
              </button>
              <button type="button" className="secondary" onClick={() => onToggleAvailability(wantedItem)}>
                <XwapActionIcon size={16} />
                {wantedItem.status === "active" ? "ปิดประกาศ" : "เปิดประกาศอีกครั้ง"}
              </button>
              <button type="button" className="danger" onClick={() => onDelete(wantedItem)}>
                <Trash2 size={16} />
                ลบ wanted นี้
              </button>
            </>
          ) : (
            <>
              <button type="button" className="primary" onClick={openMatchingResults}>
                <SearchNavIcon size={16} />
                ดูของที่ตรงกับ wanted นี้
              </button>
              <button type="button" className="secondary" onClick={openCreateListing}>
                <SwapDealIcon size={16} />
                ลงของที่มีเพื่อตอบโจทย์นี้
              </button>
            </>
          )}
        </div>
      </div>

      <div className="panel wanted-detail-owner-strip">
        <button
          type="button"
          className="wanted-detail-owner-summary"
          onClick={() => owner && onOpenOwner(owner)}
          disabled={!owner}
        >
          <img src={asset(owner?.avatar_url) || wantedFallbacks.Other} alt={ownerName} />
          <div className="wanted-detail-owner-copy">
            <small>{isOwner ? "wanted ของคุณ" : "เจ้าของ wanted นี้"}</small>
            <b>{ownerName}</b>
            <span>{ownerMeta}</span>
            <TrustPillList
              pills={trustPills}
              ariaLabel="สัญญาณความน่าเชื่อถือของเจ้าของ wanted"
              rowClassName="wanted-detail-owner-pill-row"
              pillClassName="wanted-detail-owner-pill"
            />
          </div>
        </button>
      </div>

      <div className="panel wanted-detail-facts">
        <div className="section-head compact">
          <h2>เจ้าของต้องการอะไร</h2>
        </div>
        <div className="wanted-detail-fact-grid">
          {summaryFacts.map((fact) => (
            <div key={fact.label} className="wanted-detail-fact-card">
              <small>{fact.label}</small>
              <b>{fact.value}</b>
            </div>
          ))}
        </div>
        <div className="wanted-detail-description">
          <b>รายละเอียดที่เจ้าของบอกไว้</b>
          <p>{wantedItem.description}</p>
        </div>
        {wantedTags.length ? (
          <div className="wanted-detail-tags">
            {wantedTags.map((tag) => (
              <span key={tag} className="shop-card-tag">#{tag}</span>
            ))}
          </div>
        ) : null}
      </div>

      {galleryOpen ? (
        <ImageGalleryDialog
          title={wantedItem.title}
          images={images}
          selectedIndex={galleryIndex}
          onSelect={setGalleryIndex}
          onClose={() => setGalleryOpen(false)}
        />
      ) : null}
    </section>
  );
}
