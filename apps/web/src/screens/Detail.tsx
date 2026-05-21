import { useEffect, useRef, useState } from "react";
import {
  EditProfileIcon,
  HashtagMetaIcon,
  LocationMetaIcon,
  MapPinned,
  SaveActionIcon,
  SavedActionIcon,
  StoreIcon,
  Trash2,
  XwapActionIcon,
  ChevronLeft,
  ChevronRight
} from "../components/AppIcons";
import { asset } from "../lib/api";
import { categoryLabels, conditionLabels, wantedFallbacks } from "../lib/constants";
import { canXwap, conditionPercent } from "../lib/format";
import type { Item, RequireLogin, User } from "../lib/types";
import { DealTypeBadge } from "../components/DealTypeBadge";
import { PageHeader } from "../components/PageHeader";
import { Price } from "../components/Price";
import { TrustPanel } from "../components/TrustPanel";
import { ImageCountBadge } from "../components/ImageCountBadge";
import { ProductGridCard } from "../components/ProductGridCard";

export function Detail({
  item,
  user,
  onBack,
  onOffer,
  onSave,
  onEdit,
  onDelete,
  onTag,
  onOpenRelated,
  onOpenOwner,
  requireLogin,
  related
}: {
  item: Item;
  user: User | null;
  onBack: () => void;
  onOffer: (item: Item) => void;
  onSave: (item: Item) => void;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  onTag: (tag: string) => void;
  onOpenRelated: (item: Item) => void;
  onOpenOwner: (owner: Item["owner"]) => void;
  requireLogin: RequireLogin;
  related: Item[];
}) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const images = item.media.images.length ? item.media.images : [wantedFallbacks.Other];
  const isSaveActive = item.viewer.is_bookmarked;
  const topTags = item.wanted.tags.slice(0, 3);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [item.id]);

  function scrollToImage(index: number, behavior: ScrollBehavior = "smooth") {
    const node = carouselRef.current;
    if (!node) return;
    const nextIndex = Math.max(0, Math.min(index, images.length - 1));
    node.scrollTo({ left: node.clientWidth * nextIndex, behavior });
    setSelectedImageIndex(nextIndex);
  }

  useEffect(() => {
    scrollToImage(0, "auto");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  function handleCarouselScroll() {
    const node = carouselRef.current;
    if (!node) return;
    const nextIndex = Math.round(node.scrollLeft / Math.max(node.clientWidth, 1));
    if (nextIndex != selectedImageIndex) setSelectedImageIndex(nextIndex);
  }

  return (
    <section className="screen detail">
      <PageHeader title="รายละเอียดสินค้า" onBack={onBack} />
      <div className="detail-hero-media">
        <div className="detail-hero-topline">
          <DealTypeBadge type={item.deal.type} emphasized />
          {!item.viewer.is_owner ? (
            <button
              type="button"
              className={`detail-save-inline detail-save-floating${isSaveActive ? " active" : ""}`}
              onClick={() => onSave(item)}
              aria-label={isSaveActive ? `เลิกบันทึก ${item.title}` : `บันทึก ${item.title}`}
            >
              {isSaveActive ? <SavedActionIcon size={18} /> : <SaveActionIcon size={18} />}
              <span>{isSaveActive ? "บันทึกแล้ว" : "บันทึก"}</span>
            </button>
          ) : null}
        </div>
        <div className="detail-carousel" ref={carouselRef} onScroll={handleCarouselScroll} aria-label="รูปสินค้าทั้งหมด">
          {images.map((image, index) => (
            <img
              key={`${item.id}-hero-${index}`}
              className="hero-img"
              src={asset(image) || wantedFallbacks.Other}
              alt={`${item.title} รูปที่ ${index + 1}`}
            />
          ))}
        </div>
        <ImageCountBadge count={item.media.images.length} />
        {images.length > 1 ? (
          <>
            <button
              type="button"
              className="detail-carousel-nav left"
              aria-label="ดูรูปก่อนหน้า"
              onClick={() => scrollToImage(selectedImageIndex - 1)}
              disabled={selectedImageIndex === 0}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className="detail-carousel-nav right"
              aria-label="ดูรูปถัดไป"
              onClick={() => scrollToImage(selectedImageIndex + 1)}
              disabled={selectedImageIndex === images.length - 1}
            >
              <ChevronRight size={18} />
            </button>
          </>
        ) : null}
      </div>
      <div className="detail-title">
        <div className="detail-title-copy">
          <h1>{item.title}</h1>
          <Price item={item} />
          <p className="detail-description">{item.description}</p>
        </div>
      </div>
      <div className="panel detail-info-card">
        <div className="detail-info-grid">
          <div className="detail-info-block">
            <span>หมวดหมู่</span>
            <b>{categoryLabels[item.category] || item.category}</b>
          </div>
          <div className="detail-info-block">
            <span>สภาพสินค้า</span>
            <b>
              {conditionLabels[item.condition] || item.condition} · {conditionPercent(item)}%
            </b>
          </div>
          <div className="detail-info-block detail-info-block-wide">
            <span>พื้นที่</span>
            <b>{item.location.label || "ยังไม่ระบุ"}</b>
          </div>
        </div>
        {topTags.length ? (
          <div className="detail-tag-box" aria-label="แฮชแท็กที่เกี่ยวข้อง">
            <div className="detail-tag-box-label">
              <HashtagMetaIcon size={16} />
              <span>Hashtag</span>
            </div>
            <div className="detail-tag-box-row">
              {topTags.map((tag) => (
                <button key={tag} type="button" className="detail-top-tag" onClick={() => onTag(tag)}>
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="detail-store-box">
          <button
            type="button"
            className="owner-panel owner-panel-button detail-owner-panel"
            onClick={() => onOpenOwner(item.owner)}
          >
            <img src={asset(item.owner.avatar_url) || wantedFallbacks.Other} alt={item.owner.name} />
            <div>
              <b>{item.owner.name}</b>
              <span>
                <StoreIcon size={14} /> ดูโปรไฟล์ร้าน
              </span>
            </div>
          </button>
          <div className="detail-store-meta">
            <span>
              <LocationMetaIcon size={14} /> พร้อมนัดรับตามพื้นที่ที่ระบุ
            </span>
          </div>
          {item.location.maps_url ? (
            <a className="secondary wide detail-map-link" href={item.location.maps_url} target="_blank" rel="noreferrer">
              <MapPinned size={16} /> นำทางด้วย Google Maps
            </a>
          ) : null}
        </div>
      </div>
      {item.viewer.is_owner ? (
        <div className="action-row detail-primary-action-row">
          <button onClick={() => onEdit(item)}>
            <EditProfileIcon size={18} /> แก้ไข
          </button>
          <button className="danger" onClick={() => onDelete(item)}>
            <Trash2 size={18} /> ลบ
          </button>
        </div>
      ) : null}
      {item.wanted.text ? (
        <p className="detail-wanted-inline">อยากได้เพิ่ม: {item.wanted.text}</p>
      ) : null}
      <TrustPanel />
      {item.trade?.count ? (
        <div className="panel detail-trade-history">
          <div className="section-head compact">
            <h2>ประวัติการแลกต่อ</h2>
          </div>
          <p>สินค้านี้ถูกแลกต่อมาแล้ว {item.trade.count} ครั้ง</p>
          <div className="detail-trade-list">
            {item.trade.history.map((entry) => (
              <div key={entry.id} className="detail-trade-row">
                <b>{entry.previous_owner_name || "เจ้าของเดิม"} → {entry.new_owner_name || "เจ้าของใหม่"}</b>
                <span>
                  {entry.counterpart_items.length
                    ? `แลกกับ ${entry.counterpart_items.map((counterpart) => counterpart.title).join(", ")}`
                    : "ไม่มีข้อมูลสินค้าคู่แลก"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {related.length ? (
        <section className="detail-related-section">
          <div className="section-head compact">
            <h2>รายการใกล้เคียง</h2>
          </div>
          <div className="shop-grid detail-related-grid">
            {related.map((relatedItem: Item) => (
              <ProductGridCard
                key={relatedItem.id}
                item={relatedItem}
                user={user}
                onOpen={onOpenRelated}
                onOffer={onOffer}
                onSave={onSave}
                onTag={onTag}
              />
            ))}
          </div>
        </section>
      ) : null}
      {!item.viewer.is_owner ? (
        <div className="detail-snapbar">
          <button
            className="primary wide detail-snapbar-button"
            onClick={() => (!user ? onOffer(item) : canXwap(user) ? onOffer(item) : undefined)}
            disabled={Boolean(user) && !canXwap(user)}
            aria-haspopup="dialog"
          >
            <XwapActionIcon /> {user && !canXwap(user) ? "ดูได้เท่านั้น" : "Xwap"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
