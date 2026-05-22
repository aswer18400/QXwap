import { useEffect, useRef, useState } from "react";
import {
  CashIcon,
  CategoryIcon,
  CheckIcon,
  ConditionIcon,
  EditProfileIcon,
  ForwardIcon,
  GalleryIcon,
  LocationMetaIcon,
  PackageIcon,
  PrevIcon,
  SaveActionIcon,
  SavedActionIcon,
  SendIcon,
  StoreIcon,
  Trash2,
  UsersIcon,
  XwapActionIcon
} from "../components/AppIcons";
import { api, asset } from "../lib/api";
import { categoryLabels, conditionLabels, wantedFallbacks } from "../lib/constants";
import { canXwap, conditionPercent } from "../lib/format";
import type { Item, OfferDetail, RequireLogin, User } from "../lib/types";
import { DealTypeBadge } from "../components/DealTypeBadge";

function formatPrimaryPrice(item: Item) {
  if (item.deal.price_cash_unknown) return "ไม่ระบุราคา";
  if (item.deal.price_cash) return `฿${item.deal.price_cash.toLocaleString("th-TH")}`;
  if (item.deal.open_to_offers) return "เปิดรับข้อเสนอ";
  return "คุยราคาได้";
}

function formatRelatedPrice(item: Item) {
  if (item.deal.price_cash_unknown) return "ไม่ระบุราคา";
  if (item.deal.price_cash) return `฿${item.deal.price_cash.toLocaleString("th-TH")}`;
  return "เปิดรับข้อเสนอ";
}

function formatCashAmount(value: number | null | undefined) {
  const amount = Number(value || 0);
  return amount > 0 ? `฿${amount.toLocaleString("th-TH")}` : "ไม่มีเงินสดเพิ่ม";
}

function offerStatusMeta(status: OfferDetail["offer"]["status"]) {
  if (status === "pending") return { label: "รอดำเนินการ", tone: "pending" as const };
  if (status === "accepted_by_receiver") return { label: "ตอบรับแล้วบางส่วน", tone: "accepted" as const };
  if (status === "accepted") return { label: "ยอมรับแล้ว", tone: "accepted" as const };
  if (status === "confirmed") return { label: "แลกสำเร็จ", tone: "accepted" as const };
  if (status === "rejected") return { label: "ปฏิเสธแล้ว", tone: "rejected" as const };
  return { label: "ยกเลิกแล้ว", tone: "rejected" as const };
}

function dealSummary(item: Item) {
  if (item.deal.type === "sell") return item.deal.open_to_offers ? "ขายและต่อรองได้" : "ขายอย่างเดียว";
  if (item.deal.type === "buy") return "รับซื้อ";
  if (item.deal.type === "both") return "ขายหรือแลก";
  return "แลกเปลี่ยน";
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
  requireLogin: RequireLogin;
  related: Item[];
}) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [incomingOffers, setIncomingOffers] = useState<OfferDetail[]>([]);
  const [incomingOffersLoading, setIncomingOffersLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showHeaderTitle, setShowHeaderTitle] = useState(false);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const offersSectionRef = useRef<HTMLElement | null>(null);
  const images = item.media.images.length ? item.media.images : [wantedFallbacks.Other];
  const isSaveActive = item.viewer.is_bookmarked;
  const topTags = item.wanted.tags.slice(0, 4);
  const userCanXwap = canXwap(user);
  const pendingOffers = incomingOffers.filter((offerDetail) => offerDetail.offer.status === "pending").length;
  const specCards = [
    {
      id: "category",
      label: "หมวดหมู่",
      value: categoryLabels[item.category] || item.category
    },
    {
      id: "condition",
      label: "สภาพ",
      value: `${conditionLabels[item.condition] || item.condition} · ${conditionPercent(item)}%`
    },
    {
      id: "location",
      label: "พื้นที่นัดรับ",
      value: item.location.label || "ยังไม่ระบุ"
    },
    {
      id: "gallery",
      label: "รูปสินค้า",
      value: `${images.length} รูป`
    },
    {
      id: "deal",
      label: "รูปแบบดีล",
      value: dealSummary(item)
    },
    {
      id: "requests",
      label: "จำนวนข้อเสนอ",
      value: `${item.stats.requests.toLocaleString("th-TH")} ครั้ง`
    },
    {
      id: "views",
      label: "จำนวนผู้ชม",
      value: `${item.stats.views.toLocaleString("th-TH")} ครั้ง`
    },
    {
      id: "cash",
      label: "ราคาเงินสด",
      value: formatPrimaryPrice(item)
    }
  ];

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

  useEffect(() => {
    const onScroll = () => {
      setShowHeaderTitle(window.scrollY > 260);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [item.id]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

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

  function handleCarouselScroll() {
    const node = carouselRef.current;
    if (!node) return;
    const nextIndex = Math.round(node.scrollLeft / Math.max(node.clientWidth, 1));
    if (nextIndex != selectedImageIndex) setSelectedImageIndex(nextIndex);
  }

  function handleSave() {
    onSave(item);
    setToastMessage(isSaveActive ? "ยกเลิกบันทึกแล้ว" : "บันทึกสินค้าแล้ว");
  }

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: item.title,
          text: item.title,
          url: window.location.href
        });
        setToastMessage("แชร์สินค้าแล้ว");
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href);
        setToastMessage("คัดลอกลิงก์แล้ว");
        return;
      }
    } catch {
      // noop
    }
    setToastMessage("แชร์ไม่สำเร็จ");
  }

  function handleOfferCTA() {
    if (user && !userCanXwap) return;
    onOffer(item);
  }

  return (
    <section className="screen detail">
      <div className="detail-header-offset" aria-hidden="true" />
      <header className="detail-header">
        <button type="button" className="detail-header-back" onClick={onBack} aria-label="กลับไปหน้าก่อนหน้า">
          <PrevIcon size={18} />
        </button>
        <div className={`detail-header-title${showHeaderTitle ? " visible" : ""}`}>{item.title}</div>
        <div className="detail-header-actions">
          {item.viewer.is_owner ? (
            <button type="button" className="detail-header-btn" onClick={() => onEdit(item)} aria-label={`แก้ไข ${item.title}`}>
              <EditProfileIcon size={16} />
            </button>
          ) : (
            <button
              type="button"
              className={`detail-header-btn${isSaveActive ? " active" : ""}`}
              onClick={handleSave}
              aria-label={isSaveActive ? `เลิกบันทึก ${item.title}` : `บันทึก ${item.title}`}
            >
              {isSaveActive ? <SavedActionIcon size={16} /> : <SaveActionIcon size={16} />}
            </button>
          )}
          <button type="button" className="detail-header-btn" onClick={handleShare} aria-label={`แชร์ ${item.title}`}>
            <SendIcon size={16} />
          </button>
        </div>
      </header>

      <section className="detail-gallery-shell" aria-label="แกลเลอรีสินค้า">
        <div className="detail-gallery-stage">
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
          {images.length > 1 ? (
            <>
              <button
                type="button"
                className="detail-gallery-nav prev"
                onClick={() => scrollToImage(selectedImageIndex - 1)}
                disabled={selectedImageIndex === 0}
                aria-label="รูปก่อนหน้า"
              >
                <PrevIcon size={18} />
              </button>
              <button
                type="button"
                className="detail-gallery-nav next"
                onClick={() => scrollToImage(selectedImageIndex + 1)}
                disabled={selectedImageIndex === images.length - 1}
                aria-label="รูปถัดไป"
              >
                <ForwardIcon size={18} />
              </button>
            </>
          ) : null}
          <div className="detail-gallery-counter">{selectedImageIndex + 1} / {images.length}</div>
        </div>
        {images.length > 1 ? (
          <div className="detail-gallery-thumbs" aria-label="เลือกรูปย่อย">
            {images.map((image, index) => (
              <button
                key={`${item.id}-thumb-${index}`}
                type="button"
                className={`detail-gallery-thumb${selectedImageIndex === index ? " active" : ""}`}
                onClick={() => scrollToImage(index)}
                aria-label={`ดูรูปที่ ${index + 1}`}
              >
                <img src={asset(image) || wantedFallbacks.Other} alt="" />
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="detail-info-section">
        <div className="detail-info-badges">
          <span className="detail-condition-badge">
            <CheckIcon size={14} /> สภาพ {conditionPercent(item)}%
          </span>
          <DealTypeBadge type={item.deal.type} emphasized />
        </div>
        <h1 className="detail-product-title">{item.title}</h1>
        <div className="detail-price-row">
          <span className="detail-price-current">{formatPrimaryPrice(item)}</span>
          {item.deal.open_to_offers ? <span className="detail-price-chip">ต่อรองได้</span> : null}
          <span className="detail-price-meta">{dealSummary(item)}</span>
        </div>
        <p className="detail-product-desc">{item.description}</p>
        {topTags.length ? (
          <div className="detail-tags" aria-label="แท็กสินค้า">
            {topTags.map((tag) => (
              <button key={tag} type="button" className="detail-tag" onClick={() => onTag(tag)}>
                #{tag}
              </button>
            ))}
          </div>
        ) : null}
        <div className="detail-wanted-box">
          <strong>ต้องการแลกกับ</strong>
          <p>{item.wanted.text || "เปิดรับข้อเสนอที่ใกล้เคียงหรือสินค้าสภาพดี"}</p>
        </div>
      </section>

      <section className="detail-card">
        <div className="detail-card-title">
          <GalleryIcon size={18} /> สเปคสินค้า
        </div>
        <div className="detail-specs-grid">
          {specCards.map((fact, index) => {
            const Icon = index % 4 === 0 ? CategoryIcon : index % 4 === 1 ? ConditionIcon : index % 4 === 2 ? LocationMetaIcon : CashIcon;
            return (
              <div key={fact.id} className="detail-spec-card">
                <div className="detail-spec-label">
                  <Icon size={14} />
                  <span>{fact.label}</span>
                </div>
                <div className="detail-spec-value">{fact.value}</div>
              </div>
            );
          })}
        </div>
      </section>

      <button type="button" className="detail-owner-card" onClick={() => onOpenOwner(item.owner)} aria-label={`ดูร้าน ${item.owner.name}`}>
        <span className="detail-owner-avatar">
          <img src={asset(item.owner.avatar_url) || wantedFallbacks.Other} alt={item.owner.name} />
          <span className="detail-owner-online" aria-hidden="true" />
        </span>
        <span className="detail-owner-info">
          <span className="detail-owner-name">{item.owner.name}</span>
          <span className="detail-owner-meta">
            <span>★ {Number(item.owner.rating || 0).toFixed(1)}</span>
            <span>•</span>
            <span>{item.stats.requests.toLocaleString("th-TH")} ข้อเสนอ</span>
            <span>•</span>
            <span>{item.location.label || "QXwap marketplace"}</span>
          </span>
        </span>
        <span className="detail-owner-link">ดูร้านค้า</span>
      </button>

      {item.viewer.is_owner ? (
        <section className="detail-card">
          <div className="detail-card-title">
            <StoreIcon size={18} /> จัดการสินค้า
          </div>
          <div className="detail-manage-grid">
            <button type="button" className="detail-manage-btn" onClick={() => onEdit(item)}>
              <EditProfileIcon size={20} />
              <span>แก้ไข</span>
            </button>
            <button
              type="button"
              className="detail-manage-btn"
              onClick={() => offersSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              <UsersIcon size={20} />
              <span>ดูข้อเสนอ</span>
            </button>
            <button type="button" className="detail-manage-btn" onClick={() => onOpenOwner(item.owner)}>
              <StoreIcon size={20} />
              <span>ดูร้าน</span>
            </button>
            <button type="button" className="detail-manage-btn danger" onClick={() => onDelete(item)}>
              <Trash2 size={20} />
              <span>ลบสินค้า</span>
            </button>
          </div>
        </section>
      ) : null}

      {item.viewer.is_owner ? (
        <section ref={offersSectionRef} className="detail-card detail-offers-section">
          <div className="detail-offers-header">
            <div>
              <div className="detail-card-title">
                <UsersIcon size={18} /> ข้อเสนอการแลกเปลี่ยน
              </div>
              <p className="detail-offers-subcopy">ข้อเสนอที่เข้ามาสำหรับสินค้าชิ้นนี้</p>
            </div>
            <span className="detail-swap-count">
              {incomingOffers.length} ข้อเสนอ{pendingOffers ? ` · ${pendingOffers} รอดำเนินการ` : ""}
            </span>
          </div>
          {incomingOffersLoading ? (
            <div className="detail-offers-skeleton" aria-hidden="true">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={`detail-offer-skeleton-${index}`} className="detail-offer-card detail-offer-card--loading">
                  <div className="detail-offer-skeleton-head">
                    <span className="detail-offer-skeleton-avatar" />
                    <div className="detail-offer-skeleton-copy">
                      <span className="detail-offer-skeleton-line short" />
                      <span className="detail-offer-skeleton-line medium" />
                    </div>
                  </div>
                  <div className="detail-offer-skeleton-grid">
                    {Array.from({ length: 3 }).map((_, imageIndex) => (
                      <span key={`detail-offer-skeleton-image-${imageIndex}`} className="detail-offer-skeleton-photo" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {!incomingOffersLoading && incomingOffers.length ? (
            <div className="detail-offer-list">
              {incomingOffers.map((offerDetail) => {
                const leadItems = offerDetail.offered_items.slice(0, 3);
                const extraCount = Math.max(offerDetail.offered_items.length - leadItems.length, 0);
                const cashAmount = Number(offerDetail.offer.cash_amount || 0);
                const status = offerStatusMeta(offerDetail.offer.status);
                const leadItem = offerDetail.offered_items[0];
                const offererName = offerDetail.offer.from_name || leadItem?.owner.name || "ผู้เสนอ";
                const offererAvatar = asset(offerDetail.offer.from_avatar || leadItem?.owner.avatar_url) || wantedFallbacks.Other;
                const offererRating = Number(leadItem?.owner.rating || 0).toFixed(1);
                const offererLocation = leadItem?.location.label || "ยังไม่ระบุพื้นที่";
                const note = offerDetail.offer.message || "ไม่ได้แนบข้อความเพิ่มเติม";
                return (
                  <article key={offerDetail.offer.id} className={`detail-offer-card detail-offer-card--${status.tone}`}>
                    <div className="detail-offer-head">
                      <div className="detail-offerer">
                        <img src={offererAvatar} alt={offererName} className="detail-offerer-avatar" />
                        <div className="detail-offerer-copy">
                          <b>{offererName}</b>
                          <span>★ {offererRating} • {leadItem?.stats.requests?.toLocaleString("th-TH") || "0"} รายการ • {offererLocation}</span>
                        </div>
                      </div>
                      <span className={`detail-offer-status detail-offer-status--${status.tone}`}>{status.label}</span>
                    </div>
                    <div className="detail-offer-section-label">
                      <PackageIcon size={14} />
                      <span>เสนอสินค้าแลก ({offerDetail.offered_items.length} ชิ้น)</span>
                    </div>
                    <div className="detail-offer-items-grid">
                      {leadItems.map((offerItem) => (
                        <button
                          key={offerItem.id}
                          type="button"
                          className="detail-offer-item"
                          onClick={() => openOfferDetail(offerDetail.offer.id)}
                          aria-label={`ดูข้อเสนอ ${offerItem.title}`}
                        >
                          <img src={asset(offerItem.media.images[0]) || wantedFallbacks.Other} alt={offerItem.title} />
                          <span className="detail-offer-item-overlay">
                            <span className="detail-offer-item-name">{offerItem.title}</span>
                            <span className="detail-offer-item-condition">สภาพ {conditionPercent(offerItem)}%</span>
                          </span>
                        </button>
                      ))}
                    </div>
                    {extraCount > 0 ? <div className="detail-offer-extra">และมีสินค้าเพิ่มเติมอีก {extraCount} ชิ้น</div> : null}
                    <div className={`detail-offer-cash${cashAmount > 0 ? " has-cash" : " no-cash"}`}>
                      <CashIcon size={15} />
                      <span>{cashAmount > 0 ? `เงินสดเพิ่ม ${formatCashAmount(cashAmount)}` : "ไม่มีเงินสดเพิ่ม"}</span>
                    </div>
                    <div className="detail-offer-note">
                      <b>หมายเหตุ</b>
                      <p>{note}</p>
                    </div>
                    <div className="detail-offer-actions">
                      {offerDetail.offer.status === "pending" ? (
                        <>
                          <button type="button" className="accept" onClick={() => openOfferDetail(offerDetail.offer.id)}>
                            ยอมรับ
                          </button>
                          <button type="button" className="counter" onClick={() => openOfferDetail(offerDetail.offer.id)}>
                            ต่อรอง
                          </button>
                          <button type="button" className="reject" onClick={() => openOfferDetail(offerDetail.offer.id)}>
                            ปฏิเสธ
                          </button>
                        </>
                      ) : (
                        <button type="button" className="view" onClick={() => openOfferDetail(offerDetail.offer.id)}>
                          ดูข้อเสนอ
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
          {!incomingOffersLoading && !incomingOffers.length ? (
            <div className="detail-empty-state">
              <div className="detail-empty-icon">
                <UsersIcon size={30} />
              </div>
              <div className="detail-empty-copy">
                <h3>ยังไม่มีข้อเสนอ</h3>
                <p>แชร์ประกาศนี้หรือเปิดรับข้อเสนอเพิ่มเติมเพื่อให้คนอื่นเข้ามาแลกได้ง่ายขึ้น</p>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {related.length ? (
        <section className="detail-card detail-related-section">
          <div className="detail-card-title">
            <GalleryIcon size={18} /> สินค้าที่คล้ายกัน
          </div>
          <div className="detail-related-rail">
            {related.map((relatedItem: Item) => (
              <button
                key={relatedItem.id}
                type="button"
                className="detail-related-card"
                onClick={() => onOpenRelated(relatedItem)}
                aria-label={`เปิดสินค้า ${relatedItem.title}`}
              >
                <img src={asset(relatedItem.media.images[0]) || wantedFallbacks.Other} alt={relatedItem.title} />
                <span className="detail-related-copy">
                  <span className="detail-related-title">{relatedItem.title}</span>
                  <span className="detail-related-meta">{relatedItem.location.label || "QXwap marketplace"}</span>
                  <span className="detail-related-price">{formatRelatedPrice(relatedItem)}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {!item.viewer.is_owner ? (
        <div className="detail-floating-cta">
          <div className="detail-floating-cta-shell">
            <button
              type="button"
              className={`detail-secondary-cta${isSaveActive ? " active" : ""}`}
              onClick={handleSave}
              aria-label={isSaveActive ? `เลิกบันทึก ${item.title}` : `บันทึก ${item.title}`}
            >
              {isSaveActive ? <SavedActionIcon size={18} /> : <SaveActionIcon size={18} />}
            </button>
            <button type="button" className="detail-secondary-cta" onClick={handleShare} aria-label={`แชร์ ${item.title}`}>
              <SendIcon size={18} />
            </button>
            <button type="button" className="detail-secondary-cta" onClick={() => onOpenOwner(item.owner)} aria-label={`ดูร้าน ${item.owner.name}`}>
              <StoreIcon size={18} />
            </button>
            <button
              type="button"
              className="detail-main-cta"
              onClick={handleOfferCTA}
              disabled={Boolean(user) && !userCanXwap}
              aria-haspopup="dialog"
            >
              <XwapActionIcon size={18} />
              <span>{user && !userCanXwap ? "ดูได้เท่านั้น" : "เสนอการแลกเปลี่ยน"}</span>
            </button>
          </div>
        </div>
      ) : null}

      {toastMessage ? (
        <div className="detail-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      ) : null}
    </section>
  );
}
