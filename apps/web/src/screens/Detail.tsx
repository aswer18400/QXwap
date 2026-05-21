import { useEffect, useRef, useState } from "react";
import { Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, Edit3, Handshake, MapPinned, Repeat2, Trash2 } from "lucide-react";
import { asset } from "../lib/api";
import { categoryLabels, conditionLabels, dealLabels, wantedFallbacks } from "../lib/constants";
import { canXwap, conditionPercent } from "../lib/format";
import type { Item, RequireLogin, User } from "../lib/types";
import { DealTypeBadge } from "../components/DealTypeBadge";
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
        <button
          className="detail-save-button"
          onClick={() => onSave(item)}
          aria-label={item.viewer.is_bookmarked ? `เลิกบันทึก ${item.title}` : `บันทึก ${item.title}`}
        >
          {item.viewer.is_bookmarked ? <BookmarkCheck /> : <Bookmark />}
        </button>
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
      <div className="detail-title">
        <div className="detail-title-copy">
          <DealTypeBadge type={item.deal.type} emphasized />
          <h1>{item.title}</h1>
        </div>
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
        <span>ประเภทข้อเสนอ</span>
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
      <div className="wanted-detail no-preview">
        <div>
          <b>{item.wanted.tags[0] || "เปิดรับข้อเสนอ"}</b>
          <span>{item.wanted.text || "เสนอของที่ใกล้เคียงหรือคุยรายละเอียดเพิ่มเติมได้"}</span>
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
      {item.viewer.is_owner ? (
        <div className="action-row">
          <button onClick={() => onEdit(item)}>
            <Edit3 size={18} /> แก้ไข
          </button>
          <button className="secondary" onClick={() => onEdit(item)}>
            <Repeat2 size={18} /> แลกต่อ
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
          <Handshake /> {user && !canXwap(user) ? "ดูได้เท่านั้น" : "Xwap"}
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
