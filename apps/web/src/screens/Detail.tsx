import { Bookmark, BookmarkCheck, Edit3, HeartHandshake, Trash2 } from "lucide-react";
import { asset } from "../lib/api";
import { categoryLabels, conditionLabels, dealLabels, wantedFallbacks } from "../lib/constants";
import { canXwap, conditionPercent, wantedImage } from "../lib/format";
import type { Item, RequireLogin, User } from "../lib/types";
import { Price } from "../components/Price";
import { TrustPanel } from "../components/TrustPanel";

export function Detail({
  item,
  user,
  onBack,
  onOffer,
  onSave,
  onEdit,
  onDelete,
  onTag,
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
  requireLogin: RequireLogin;
  related: Item[];
}) {
  return (
    <section className="screen detail">
      <button className="ghost" onClick={onBack}>
        กลับ
      </button>
      <img className="hero-img" src={asset(item.media.images[0]) || wantedFallbacks.Other} alt={item.title} />
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
        <b>{item.location.label}</b>
      </div>
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
          onClick={() =>
            !user ? requireLogin() : canXwap(user) ? onOffer(item) : undefined
          }
          disabled={Boolean(user) && !canXwap(user)}
        >
          <HeartHandshake /> {user && !canXwap(user) ? "ดูได้เท่านั้น" : "Xwap"}
        </button>
      )}
      {related.length ? (
        <>
          <h3>รายการใกล้เคียง</h3>
          <div className="mini-related">
            {related.map((r: Item) => (
              <button key={r.id} onClick={() => onTag(r.wanted.tags[0] || r.category)}>
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
