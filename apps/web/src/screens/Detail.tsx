import { useEffect, useRef, useState } from "react";
import { Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, Edit3, MapPinned, Repeat2, Trash2 } from "lucide-react";
import { asset } from "../lib/api";
import { categoryLabels, conditionLabels, dealLabels, wantedFallbacks } from "../lib/constants";
import { canXwap, conditionPercent, wantedImage } from "../lib/format";
import type { Item, RequireLogin, User } from "../lib/types";
import { Price } from "../components/Price";
import { TrustPanel } from "../components/TrustPanel";
import { ImageCountBadge } from "../components/ImageCountBadge";

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
  requireLogin: RequireLogin;
  related: Item[];
}) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const images = item.media.images.length ? item.media.images : [wantedFallbacks.Other];

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
    if (nextIndex !== selectedImageIndex) setSelectedImageIndex(nextIndex);
  }

  return (
    <section className="screen detail">
      <button className="ghost" onClick={onBack}>
        กลับ
      </button>
      <div className="detail-hero-media">
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
      {images.length > 1 ? (
        <div className="detail-carousel-dots" aria-label="ตำแหน่งรูปสินค้า">
          {images.map((_, index) => (
            <button
              key={`${item.id}-dot-${index}`}
              type="button"
              className={selectedImageIndex === index ? "on" : ""}
              aria-label={`เปิดรูปที่ ${index + 1}`}
              onClick={() => scrollToImage(index)}
            />
          ))}
        </div>
      ) : null}
      {images.length > 1 ? (
        <div className="detail-thumb-row" aria-label="รูปสินค้าเพิ่มเติม">
          {images.map((image, index) => (
            <button
              key={`${item.id}-${index}`}
              type="button"
              className={selectedImageIndex === index ? "on" : ""}
              onClick={() => scrollToImage(index)}
            >
              <img src={asset(image) || wantedFallbacks.Other} alt={`รูปสินค้า ${index + 1}`} />
            </button>
          ))}
        </div>
      ) : null}
      <div className="detail-title">
        <h1>{item.title}</h1>
        <button
          className="icon-btn"
          onClick={() => onSave(item)}
          aria-label={item.viewer.is_bookmarked ? `เลิกบันทึก ${item.title}` : `บันทึก ${item.title}`}
        >
          {item.viewer.is_bookmarked ? <BookmarkCheck /> : <Bookmark />}
        </button>
      </div>
      <Price item={item} />
      <p>{item.description}</p>
      <div className="info-grid">
        <span>หมวด</span>
        <b>{categoryLabels[item.category] || item.category}</b>
        <span>สภาพ</span>
        <b>
          {conditionLabels[item.condition] || item.condition} · {conditionPercent(item)}%
        </b>
        <span>ดีล</span>
        <b>{dealLabels[item.deal.type]}</b>
        <span>พื้นที่</span>
        <b>{item.location.label || "ยังไม่ระบุ"}</b>
      </div>
      {item.location.maps_url ? (
        <a className="secondary wide detail-map-link" href={item.location.maps_url} target="_blank" rel="noreferrer">
          <MapPinned size={16} /> นำทางด้วย Google Maps
        </a>
      ) : null}
      <h3>อยากได้</h3>
      <div className="wanted-detail">
        <img src={wantedImage(item)} alt={`ตัวอย่างสิ่งที่อยากได้ ${item.wanted.tags[0] || "ข้อเสนอ"}`} />
        <div>
          <b>{item.wanted.tags[0] || "เปิดรับข้อเสนอ"}</b>
          <span>{item.wanted.text || "เสนอของที่ใกล้เคียงหรือเพิ่มเงิน/เครดิตได้"}</span>
        </div>
      </div>
      <div className="tags large">
        {item.wanted.tags.map((t: string) => (
          <button key={t} onClick={() => onTag(t)} aria-label={`ค้นหา ${t}`}>
            #{t}
          </button>
        ))}
      </div>
      <div className="owner-panel">
        <img src={asset(item.owner.avatar_url)} alt={item.owner.name} />
        <div>
          <b>{item.owner.name}</b>
          <span>สมาชิก QXwap</span>
        </div>
      </div>
      <TrustPanel />
      {item.viewer.is_owner ? (
        <div className="action-row">
          <button onClick={() => onEdit(item)}>
            <Edit3 size={18} /> แก้ไข
          </button>
          <button className="danger" onClick={() => onDelete(item)}>
            <Trash2 size={18} /> ลบ
          </button>
        </div>
      ) : (
        <button
          className="primary wide"
          onClick={() => (!user ? onOffer(item) : canXwap(user) ? onOffer(item) : undefined)}
          disabled={Boolean(user) && !canXwap(user)}
          aria-haspopup="dialog"
        >
          <Repeat2 /> {user && !canXwap(user) ? "ดูได้เท่านั้น" : "Xwap"}
        </button>
      )}
      {related.length ? (
        <>
          <h3>รายการใกล้เคียง</h3>
          <div className="mini-related">
            {related.map((r: Item) => (
              <button key={r.id} onClick={() => onOpenRelated(r)}>
                <img src={asset(r.media.images[0])} alt={r.title} />
                <span>{r.title}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
