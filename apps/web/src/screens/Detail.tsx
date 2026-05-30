import { useEffect, useRef, useState } from "react";
import {
  BackIcon,
  ChatActionIcon,
  EditProfileIcon,
  MapPinned,
  SaveActionIcon,
  SavedActionIcon,
  ShareActionIcon,
  StoreIcon,
  Trash2,
  XwapActionIcon
} from "../components/AppIcons";
import { asset } from "../lib/api";
import { categoryLabels, conditionLabels, wantedFallbacks } from "../lib/constants";
import { canXwap, formatCashAmountValue, formatDistanceKmValue, formatIntegerValue, formatRatingValue, profileLevel } from "../lib/format";
import type { Item, OfferDetail, OfferTab, RequireLogin, User } from "../lib/types";
import { DealTypeBadge } from "../components/DealTypeBadge";
import { ImageGalleryDialog } from "../components/ImageGalleryDialog";
import { Price } from "../components/Price";
import { ProductGridCard } from "../components/ProductGridCard";
import { swapService } from "../services";

function ExpandableDetailText({
  text,
  threshold = 64,
  className = ""
}: {
  text: string;
  threshold?: number;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const normalized = text.trim();
  const canExpand = normalized.length > threshold;

  if (!normalized) return null;

  return (
    <div className={`detail-expandable${expanded ? " is-expanded" : ""}${className ? ` ${className}` : ""}`}>
      <button
        type="button"
        className="detail-expandable-trigger"
        onClick={() => {
          if (canExpand) setExpanded((value) => !value);
        }}
        aria-expanded={canExpand ? expanded : undefined}
      >
        <span>{normalized}</span>
        {canExpand ? <em>{expanded ? "ย่อ" : "อ่านต่อ"}</em> : null}
      </button>
    </div>
  );
}

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
  const wantedText = item.wanted.text || (item.wanted.tags.length ? item.wanted.tags.join(" · ") : "เปิดรับข้อเสนอที่ตรงกับสินค้าชิ้นนี้");
  const distanceLabel = formatDistanceKmValue(item.location.distance_km);
  const meetupLabel = (item.location.label || "").split(",")[0]?.trim();
  const ownerLevel = profileLevel({ account_level: item.owner.account_level ?? 2 } as User);
  const ownerTrustPills = [
    formatRatingValue(item.owner.rating) ? `รีวิว ★ ${formatRatingValue(item.owner.rating)}` : null,
    item.is_featured ? "โปรไฟล์น่าเชื่อถือ" : null,
    item.is_fast_responder ? "ตอบไว" : null,
    ownerLevel.title,
    meetupLabel ? `นัดรับ ${meetupLabel}` : null
  ].filter(Boolean).slice(0, 4) as string[];
  const ownerMetaLine = formatRatingValue(item.owner.rating)
    ? `รีวิว ★ ${formatRatingValue(item.owner.rating)}`
    : "เริ่มต้นคุยดีลได้ทันที";
  const detailFacts = [
    {
      id: "category",
      label: "หมวดหมู่",
      value: categoryLabels[item.category] || item.category
    },
    {
      id: "condition",
      label: "สภาพ",
      value: conditionLabels[item.condition] || item.condition
    },
    {
      id: "location",
      label: "พื้นที่",
      value: [item.location.label || "ยังไม่ระบุพื้นที่", distanceLabel].filter(Boolean).join(" · ")
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
    swapService.listReceivedOffers()
      .then(async (response) => {
        if (!live) return;
        const matched = (response || []).filter((offer) => offer.target_item_id === item.id);
        const details = await Promise.all(
          matched.map((offer) =>
            swapService.getOfferDetail(offer.id).catch(() => null)
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
    swapService.listSentOffers()
      .then((response) => {
        if (!live) return;
        const matchingOffer = (response || []).find(
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
      <div className="detail-hero-shell">
        <div className="detail-hero-chrome">
          <button type="button" className="detail-circle-button" onClick={onBack} aria-label="ย้อนกลับ">
            <BackIcon size={18} />
          </button>
          <div className="detail-circle-actions">
            <button type="button" className="detail-circle-button" onClick={() => void handleShare()} aria-label={`แชร์ ${item.title}`}>
              <ShareActionIcon size={16} />
            </button>
            {!item.viewer.is_owner ? (
              <button
                type="button"
                className={`detail-circle-button${isSaveActive ? " active" : ""}`}
                onClick={() => onSave(item)}
                aria-label={isSaveActive ? `เลิกบันทึก ${item.title}` : `บันทึก ${item.title}`}
              >
                {isSaveActive ? <SavedActionIcon size={18} /> : <SaveActionIcon size={18} />}
              </button>
            ) : null}
          </div>
        </div>
        <div className="detail-hero-media">
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
          <span className="detail-hero-counter">
            {selectedImageIndex + 1}/{images.length}
          </span>
        </div>
      </div>
      {images.length > 1 ? (
        <div className="detail-thumb-tray" aria-label="รูปย่อสินค้า">
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
      <div className="detail-summary-shell">
        <small className="detail-summary-kicker">รายละเอียดสินค้า</small>
        <div className="detail-summary-top">
          <DealTypeBadge type={item.deal.type} />
        </div>
        <h1 className="detail-heading">{item.title}</h1>
        <div className="detail-inline-wanted">
          <small>ต้องการแลกกับ</small>
          <ExpandableDetailText text={wantedText} className="detail-wanted-block" threshold={52} />
          {topTags.length ? (
            <div className="detail-tag-box-row">
              {topTags.map((tag) => (
                <button key={tag} type="button" className="detail-top-tag" onClick={() => onTag(tag)}>
                  #{tag}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="detail-price-block">
          <Price item={item} />
        </div>
        <div className="detail-activity-line">
          <span>{item.location.label || "ยังไม่ระบุพื้นที่"}</span>
          <span>เข้าชม {formatIntegerValue(item.stats.views)} ครั้ง</span>
        </div>
        <ExpandableDetailText text={item.description} className="detail-description-block" />
        {shareFeedback ? <p className="detail-feedback">{shareFeedback}</p> : null}
      </div>
      <div className="panel detail-owner-strip">
        <button
          type="button"
          className="detail-owner-summary"
          onClick={() => onOpenOwner(item.owner)}
        >
          <img src={asset(item.owner.avatar_url) || wantedFallbacks.Other} alt={item.owner.name} />
          <div className="detail-owner-copy">
            <small>เจ้าของสินค้า</small>
            <b>{item.owner.name}</b>
            <span>{ownerMetaLine} · {item.location.label || "พร้อมนัดรับ"}</span>
            {ownerTrustPills.length ? (
              <div className="detail-owner-pill-row" aria-label="สัญญาณความน่าเชื่อถือของเจ้าของสินค้า">
                {ownerTrustPills.map((pill) => (
                  <span key={pill} className="detail-owner-pill">{pill}</span>
                ))}
              </div>
            ) : null}
            <small>ดูโปรไฟล์ร้าน รีวิว และประกาศทั้งหมด</small>
          </div>
        </button>
        <button type="button" className="secondary detail-owner-cta" onClick={() => onOpenOwner(item.owner)}>
          ดูร้านค้า
        </button>
      </div>
      {!item.viewer.is_owner ? (
        <div className="panel detail-primary-cta-card">
          <div className="detail-primary-cta-copy">
            <small>พร้อมเริ่มดีล</small>
            <b>{user && !canXwap(user) ? "บัญชีนี้ยังส่งข้อเสนอไม่ได้" : "เสนอการแลกเปลี่ยนให้เด่นและคุยต่อได้ทันที"}</b>
            <span>
              {activeChatOfferId
                ? "มีบทสนทนากับเจ้าของแล้ว กลับไปคุยต่อหรือส่งข้อเสนอเพิ่มได้"
                : "เริ่มจากแชทหรือส่งของที่อยากแลกกับสินค้าชิ้นนี้"}
            </span>
          </div>
          <div className="detail-primary-cta-actions">
            <button
              className="secondary detail-chat-button"
              onClick={handleChatAction}
              disabled={chatOfferLoading}
            >
              <ChatActionIcon size={16} />
              {chatOfferLoading ? "กำลังเช็กแชท..." : activeChatOfferId ? "กลับไปคุยต่อ" : "เริ่มแชท"}
            </button>
            <button
              className="primary detail-hero-offer-button"
              onClick={() => (!user ? onOffer(item) : canXwap(user) ? onOffer(item) : undefined)}
              disabled={Boolean(user) && !canXwap(user)}
              aria-haspopup="dialog"
            >
              <XwapActionIcon /> {user && !canXwap(user) ? "ดูได้เท่านั้น" : "เสนอการแลกเปลี่ยน"}
            </button>
          </div>
        </div>
      ) : null}
      <div className="detail-fact-grid detail-fact-grid--three">
        {detailFacts.map((fact) => (
          <div key={fact.id} className="detail-fact-card">
            <small>{fact.label}</small>
            <b>{fact.value}</b>
          </div>
        ))}
        {item.location.maps_url ? (
          <a className="detail-fact-card detail-fact-card--action" href={item.location.maps_url} target="_blank" rel="noreferrer">
            <small>แผนที่</small>
            <b><MapPinned size={15} /> เปิดดูตำแหน่ง</b>
          </a>
        ) : null}
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
            <h2>ข้อเสนอการแลกเปลี่ยน</h2>
          </div>
          {incomingOffersLoading ? <div className="empty-inline">กำลังโหลดข้อเสนอ...</div> : null}
          {!incomingOffersLoading && incomingOffers.length ? (
            <div className="detail-incoming-offers-list">
              {incomingOffers.map((offerDetail) => {
                const leadItem = offerDetail.offered_items[0];
                const extraCount = Math.max(offerDetail.offered_items.length - 1, 0);
                const cashAmountLabel = formatCashAmountValue(offerDetail.offer.cash_amount);
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
                        {offerDetail.offered_items.length} สินค้า{cashAmountLabel ? ` + ${cashAmountLabel}` : ""}
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
                onOpen={onOpenRelated}
                onSave={onSave}
                onTag={onTag}
              />
            ))}
          </div>
        </section>
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
