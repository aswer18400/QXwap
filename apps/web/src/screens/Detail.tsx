import { useEffect, useRef, useState } from "react";
import {
  ChatActionIcon,
  EditProfileIcon,
  MapPinned,
  ProductGalleryIcon,
  SaveActionIcon,
  SavedActionIcon,
  ShareActionIcon,
  StoreIcon,
  Trash2,
  XwapActionIcon
} from "../components/AppIcons";
import { api, asset } from "../lib/api";
import { categoryLabels, conditionLabels, wantedFallbacks } from "../lib/constants";
import { canXwap, conditionPercent } from "../lib/format";
import type { Item, OfferDetail, OfferTab, RequireLogin, User } from "../lib/types";
import { DealTypeBadge } from "../components/DealTypeBadge";
import { ImageGalleryDialog } from "../components/ImageGalleryDialog";
import { PageHeader } from "../components/PageHeader";
import { Price } from "../components/Price";
import { TrustPanel } from "../components/TrustPanel";
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
  openOfferDetail,
  openChat,
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
  openOfferDetail: (offerId: string) => void;
  openChat: (offerId: string, nextInboxTab?: OfferTab) => void;
  requireLogin: RequireLogin;
  related: Item[];
}) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [incomingOffers, setIncomingOffers] = useState<OfferDetail[]>([]);
  const [incomingOffersLoading, setIncomingOffersLoading] = useState(false);
  const [activeChatOfferId, setActiveChatOfferId] = useState<string | null>(null);
  const [chatOfferLoading, setChatOfferLoading] = useState(false);
  const [shareFeedback, setShareFeedback] = useState("");
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const images = item.media.images.length ? item.media.images.map((image) => asset(image) || wantedFallbacks.Other) : [wantedFallbacks.Other];
  const isSaveActive = item.viewer.is_bookmarked;
  const topTags = item.wanted.tags.slice(0, 3);
  const detailFacts = [
    {
      id: "category",
      label: "หมวดหมู่",
      value: categoryLabels[item.category] || item.category
    },
    {
      id: "condition",
      label: "สภาพ",
      value: `${conditionLabels[item.condition] || item.condition} · ${conditionPercent(item)}%`
    }
  ];

  useEffect(() => {
    setSelectedImageIndex(0);
    setGalleryOpen(false);
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

  useEffect(() => {
    if (!user || !item.viewer.is_owner) {
      setIncomingOffers([]);
      return;
    }
    let live = true;
    setIncomingOffersLoading(true);
    api<{ offers: Array<{ id: string; target_item_id: string; status: string }> }>("/offers/received")
      .then(async (response) => {
        if (!live) return;
        const matched = (response.offers || []).filter((offer) => offer.target_item_id === item.id);
        const details = await Promise.all(
          matched.map((offer) =>
            api<OfferDetail>(`/offers/${offer.id}/detail`).catch(() => null)
          )
        );
        if (!live) return;
        setIncomingOffers(details.filter(Boolean) as OfferDetail[]);
      })
      .catch(() => {
        if (!live) return;
        setIncomingOffers([]);
      })
      .finally(() => {
        if (live) setIncomingOffersLoading(false);
      });
    return () => {
      live = false;
    };
  }, [item.id, item.viewer.is_owner, user]);

  useEffect(() => {
    if (!user || item.viewer.is_owner) {
      setActiveChatOfferId(null);
      setChatOfferLoading(false);
      return;
    }
    let live = true;
    setChatOfferLoading(true);
    api<{ offers: Array<{ id: string; target_item_id: string; status: string }> }>("/offers/sent")
      .then((response) => {
        if (!live) return;
        const matchingOffer = (response.offers || []).find(
          (offer) => offer.target_item_id === item.id && offer.status !== "cancelled" && offer.status !== "rejected"
        );
        setActiveChatOfferId(matchingOffer?.id || null);
      })
      .catch(() => {
        if (live) setActiveChatOfferId(null);
      })
      .finally(() => {
        if (live) setChatOfferLoading(false);
      });
    return () => {
      live = false;
    };
  }, [item.id, item.viewer.is_owner, user]);

  useEffect(() => {
    if (!shareFeedback) return;
    const timer = window.setTimeout(() => setShareFeedback(""), 2200);
    return () => window.clearTimeout(timer);
  }, [shareFeedback]);

  function handleCarouselScroll() {
    const node = carouselRef.current;
    if (!node) return;
    const nextIndex = Math.round(node.scrollLeft / Math.max(node.clientWidth, 1));
    if (nextIndex != selectedImageIndex) setSelectedImageIndex(nextIndex);
  }

  async function handleShare() {
    const shareUrl = `${window.location.origin}${window.location.pathname}?item=${item.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: item.title,
          text: item.description,
          url: shareUrl
        });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setShareFeedback("คัดลอกลิงก์แล้ว");
      }
    } catch {
      return;
    }
  }

  function handleChatAction() {
    if (!user) {
      requireLogin("เข้าสู่ระบบก่อนเริ่มคุยกับเจ้าของสินค้า");
      return;
    }
    if (activeChatOfferId) {
      openChat(activeChatOfferId, "sent");
      return;
    }
    onOffer(item);
  }

  return (
    <section className="screen detail">
      <PageHeader title="รายละเอียดสินค้า" onBack={onBack} />
      <div className="detail-hero-media">
        <div className="detail-hero-topline">
          <button type="button" className="detail-gallery-trigger" onClick={() => setGalleryOpen(true)}>
            <ProductGalleryIcon size={16} /> {images.length} รูป
          </button>
        </div>
        <div className="detail-carousel" ref={carouselRef} onScroll={handleCarouselScroll} aria-label="รูปสินค้าทั้งหมด">
          {images.map((image, index) => (
            <button
              key={`${item.id}-hero-${index}`}
              type="button"
              className="detail-hero-slide"
              onClick={() => {
                setSelectedImageIndex(index);
                setGalleryOpen(true);
              }}
            >
              <img
                className="hero-img"
                src={image}
                alt={`${item.title} รูปที่ ${index + 1}`}
              />
            </button>
          ))}
        </div>
        {images.length > 1 ? (
          <div className="detail-thumb-strip" aria-label="รูปย่อสินค้า">
            {images.map((image, index) => (
              <button
                key={`${item.id}-thumb-${index}`}
                type="button"
                className={`detail-thumb-button${index === selectedImageIndex ? " active" : ""}`}
                onClick={() => scrollToImage(index)}
              >
                <img src={image} alt="" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="detail-title">
        <div className="detail-title-top">
          <div className="detail-title-copy">
            <div className="detail-title-line">
              <h1>{item.title}</h1>
              <DealTypeBadge type={item.deal.type} />
            </div>
            <Price item={item} />
            <p className="detail-description">{item.description}</p>
          </div>
          <div className="detail-title-actions">
            {!item.viewer.is_owner ? (
              <button
                type="button"
                className={`detail-save-inline detail-save-inline-title${isSaveActive ? " active" : ""}`}
                onClick={() => onSave(item)}
                aria-label={isSaveActive ? `เลิกบันทึก ${item.title}` : `บันทึก ${item.title}`}
              >
                {isSaveActive ? <SavedActionIcon size={18} /> : <SaveActionIcon size={18} />}
                <span>{isSaveActive ? "บันทึกแล้ว" : "บันทึก"}</span>
              </button>
            ) : null}
            <button type="button" className="detail-top-action-button" onClick={() => void handleShare()} aria-label={`แชร์ ${item.title}`}>
              <ShareActionIcon size={16} />
              <span>แชร์</span>
            </button>
          </div>
        </div>
        {shareFeedback ? <p className="detail-feedback">{shareFeedback}</p> : null}
      </div>
      <div className="panel detail-info-card">
        <div className="detail-fact-grid">
          {detailFacts.map((fact) => (
            <div key={fact.id} className="detail-fact-card">
              <small>{fact.label}</small>
              <b>{fact.value}</b>
            </div>
          ))}
        </div>
        <div className="detail-location-row">
          <div className="detail-location-copy">
            <small>พื้นที่</small>
            <b>{item.location.label || "ยังไม่ระบุพื้นที่"}</b>
            <span>{item.deal.open_to_offers ? "เปิดรับข้อเสนอแลกได้" : "ดีลนี้เน้นขายเป็นหลัก"}</span>
          </div>
          {item.location.maps_url ? (
            <a className="secondary detail-map-link detail-map-link-inline" href={item.location.maps_url} target="_blank" rel="noreferrer">
              <MapPinned size={16} /> แผนที่
            </a>
          ) : null}
        </div>
        {topTags.length ? (
          <div className="detail-tag-box" aria-label="แฮชแท็กที่เกี่ยวข้อง">
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
        <p className="detail-wanted-inline">{item.wanted.text}</p>
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
      {item.viewer.is_owner ? (
        <section className="detail-incoming-offers">
          <div className="section-head compact">
            <h2>คนที่มาเสนอแลก</h2>
          </div>
          {incomingOffersLoading ? <div className="empty-inline">กำลังโหลดข้อเสนอ...</div> : null}
          {!incomingOffersLoading && incomingOffers.length ? (
            <div className="detail-incoming-offers-list">
              {incomingOffers.map((offerDetail) => {
                const leadItem = offerDetail.offered_items[0];
                const extraCount = Math.max(offerDetail.offered_items.length - 1, 0);
                const cashAmount = Number(offerDetail.offer.cash_amount || 0);
                return (
                  <button
                    key={offerDetail.offer.id}
                    type="button"
                    className="panel detail-incoming-offer-card"
                    onClick={() => openOfferDetail(offerDetail.offer.id)}
                  >
                    <div className="detail-incoming-offer-top">
                      <span className={`offer-status-pill offer-status-pill--${offerDetail.offer.status}`}>
                        {offerDetail.offer.status === "pending" ? "รอการตอบรับ" : offerDetail.offer.status === "accepted_by_receiver" ? "ตอบรับแล้วบางส่วน" : offerDetail.offer.status === "accepted" ? "ทั้งสองฝ่ายตอบรับแล้ว" : offerDetail.offer.status === "confirmed" ? "แลกสำเร็จ" : offerDetail.offer.status === "rejected" ? "ปฏิเสธแล้ว" : "ยกเลิกแล้ว"}
                      </span>
                      <span className="detail-incoming-offer-summary">
                        {offerDetail.offered_items.length} สินค้า{cashAmount ? ` + ${cashAmount.toLocaleString("th-TH")} บาท` : ""}
                      </span>
                    </div>
                    <div className="detail-incoming-offer-body">
                      <div className="detail-incoming-offer-photo">
                        <img src={asset(leadItem?.media.images?.[0]) || wantedFallbacks.Other} alt={leadItem?.title || "สินค้าที่เสนอมา"} />
                      </div>
                      <div className="detail-incoming-offer-copy">
                        <b>{offerDetail.offer.from_name || "ผู้เสนอ"}</b>
                        <span>{leadItem?.title || "สินค้าที่เสนอมา"}</span>
                        <small>{extraCount ? `และมีสินค้าอีก ${extraCount} ชิ้น` : "แตะเพื่อดูรายละเอียดข้อเสนอ"}</small>
                      </div>
                    </div>
                    <span className="primary wide detail-incoming-offer-cta">ดูข้อเสนอ</span>
                  </button>
                );
              })}
            </div>
          ) : null}
          {!incomingOffersLoading && !incomingOffers.length ? (
            <div className="empty-inline">ยังไม่มีคนมาเสนอแลกสินค้าชิ้นนี้</div>
          ) : null}
        </section>
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
        <div className="detail-floating-cta">
          <div className="detail-floating-cta-shell">
            <button
              className="secondary detail-chat-button"
              onClick={handleChatAction}
              disabled={chatOfferLoading}
            >
              <ChatActionIcon size={16} />
              {chatOfferLoading ? "กำลังเช็กแชท..." : activeChatOfferId ? "แชท" : "เริ่มคุย"}
            </button>
            <button
              className="primary detail-hero-offer-button"
              onClick={() => (!user ? onOffer(item) : canXwap(user) ? onOffer(item) : undefined)}
              disabled={Boolean(user) && !canXwap(user)}
              aria-haspopup="dialog"
            >
              <XwapActionIcon /> {user && !canXwap(user) ? "ดูได้เท่านั้น" : "Xwap"}
            </button>
          </div>
        </div>
      ) : null}
      {galleryOpen ? (
        <ImageGalleryDialog
          images={images}
          title={item.title}
          selectedIndex={selectedImageIndex}
          onSelect={(index) => setSelectedImageIndex(index)}
          onClose={() => {
            setGalleryOpen(false);
            window.setTimeout(() => scrollToImage(selectedImageIndex, "auto"), 0);
          }}
        />
      ) : null}
    </section>
  );
}
