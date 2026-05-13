import {
  Bookmark,
  BookmarkCheck,
  Repeat2,
  Sparkles
} from "lucide-react";
import { asset } from "../lib/api";
import { dealLabels, wantedFallbacks } from "../lib/constants";
import { canXwap, conditionPercent } from "../lib/format";
import type { Item, RequireLogin, User, Wallet } from "../lib/types";
import { CreditCard } from "../components/CreditCard";
import { FollowRail } from "../components/FollowRail";
import { Price } from "../components/Price";

export function AiFeed({
  items,
  user,
  wallet,
  people,
  selectedPersonId,
  followingIds,
  onPerson,
  onOpen,
  onOffer,
  onSave,
  onTag,
  requireLogin,
  openProfile
}: {
  items: Item[];
  myItems: Item[];
  user: User | null;
  wallet: Wallet | null;
  people: User[];
  selectedPersonId: string;
  followingIds: string[];
  onPerson: (id: string) => void;
  onOpen: (i: Item) => void;
  onOffer: (i: Item) => void;
  onSave: (i: Item) => void;
  onTag: (t: string) => void;
  requireLogin: RequireLogin;
  openProfile: (p: User) => void;
}) {
  const followedSet = new Set(followingIds);
  const feedItems = selectedPersonId
    ? items.filter((item) => item.owner.id === selectedPersonId)
    : items;
  const recommendations = selectedPersonId
    ? feedItems
    : [
        ...feedItems.filter((item) => followedSet.has(item.owner.id)),
        ...feedItems.filter((item) => !followedSet.has(item.owner.id))
      ];

  return (
    <section className="screen ai-feed">
      <FollowRail
        people={people}
        selectedPersonId={selectedPersonId}
        onPerson={onPerson}
        openProfile={openProfile}
        showLevels={Boolean(user)}
      />
      <CreditCard wallet={wallet} user={user} requireLogin={requireLogin} />
      <div className="section-head ai-head">
        <h1>AI แนะนำการแลก</h1>
        <Sparkles size={22} />
      </div>

      {recommendations.length === 0 && (
        <div className="empty">ยังไม่มีรายการแนะนำ ลองติดตามผู้ใช้หรือเพิ่มของที่คุณมี</div>
      )}

      <div className="feed-market-list">
        {recommendations.map((item) => {
          const ownerProfile = people.find((p) => p.id === item.owner.id) ?? {
            id: item.owner.id,
            email: "",
            display_name: item.owner.name,
            avatar_url: item.owner.avatar_url
          };
          const isOwnItem = Boolean(user && item.owner.id === user.id);
          const xwapDisabled = Boolean(user) && (!canXwap(user) || isOwnItem);

          return (
            <article className="feed-market-card" key={item.id}>
              <button className="feed-market-owner" onClick={() => openProfile(ownerProfile)}>
                {item.owner.avatar_url ? (
                  <img src={asset(item.owner.avatar_url)} alt={item.owner.name || "เจ้าของสินค้า"} />
                ) : (
                  <span aria-hidden="true">{(item.owner.name || "Q").slice(0, 1)}</span>
                )}
                <span>
                  <b>{item.owner.name || "QXwap user"}</b>
                  <small>{item.location.label || "QXwap marketplace"}</small>
                </span>
              </button>

              <button className="feed-market-main" onClick={() => onOpen(item)} aria-label={`เปิดรายละเอียด ${item.title}`}>
                <span className="feed-market-photo">
                  <img src={asset(item.media.images[0]) || wantedFallbacks.Other} loading="lazy" alt={item.title} />
                  <em>สภาพ {conditionPercent(item)}%</em>
                </span>
                <span className="feed-market-content">
                  <span className="feed-market-title">{item.title}</span>
                  <span className="feed-market-meta">
                    <span>{dealLabels[item.deal.type]}</span>
                    {item.is_fast_responder ? <span>ตอบไว</span> : null}
                    {item.is_featured ? <span>ผู้ใช้งานดีเด่น</span> : null}
                  </span>
                  <Price item={item} compact />
                  {item.wanted.text ? <span className="feed-market-wanted">{item.wanted.text}</span> : null}
                </span>
              </button>

              {item.wanted.tags.length ? (
                <div className="feed-market-tags" aria-label="สิ่งที่อยากได้">
                  {item.wanted.tags.slice(0, 4).map((tag) => (
                    <button key={tag} onClick={() => onTag(tag)} aria-label={`ค้นหา ${tag}`}>
                      #{tag}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="feed-market-actions">
                <button
                  className="feed-market-save"
                  onClick={() => onSave(item)}
                  aria-label={item.viewer.is_bookmarked ? "ยกเลิกบันทึก" : "บันทึก"}
                >
                  {item.viewer.is_bookmarked ? <BookmarkCheck size={21} /> : <Bookmark size={21} />}
                  <span>{item.viewer.is_bookmarked ? "บันทึกแล้ว" : "บันทึก"}</span>
                </button>
                <button
                  className="feed-market-xwap"
                  onClick={() => (!user ? requireLogin() : !xwapDisabled ? onOffer(item) : undefined)}
                  disabled={xwapDisabled}
                  aria-label={`Xwap ${item.title}`}
                >
                  <Repeat2 size={18} />
                  <span>Xwap</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
