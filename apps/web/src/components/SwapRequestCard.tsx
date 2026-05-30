import type { Item } from "../lib/types";
import { Button } from "./Button";
import { StatusBadge } from "./StatusBadge";
import { UserMiniCard } from "./UserMiniCard";
import { asset } from "../lib/api";
import { wantedFallbacks } from "../lib/constants";

export function SwapRequestCard({
  offerId,
  status,
  otherPartyName,
  otherPartyId,
  otherPartyAvatar,
  otherPartyMeta,
  createdAt,
  thumbnails,
  title,
  summary,
  targetLabel,
  targetTitle,
  primaryLabel,
  secondaryLabel,
  dangerSecondary = false,
  onOpenProfile,
  onOpenPrimary,
  onOpenSecondary
}: {
  offerId: string;
  status: string;
  otherPartyName: string;
  otherPartyId: string;
  otherPartyAvatar?: string;
  otherPartyMeta?: string;
  createdAt?: string;
  thumbnails: Array<{ id: string; title: string; image?: string | null; onOpen?: () => void }>;
  title: string;
  summary: string;
  targetLabel: string;
  targetTitle: string;
  primaryLabel: string;
  secondaryLabel: string;
  dangerSecondary?: boolean;
  onOpenProfile: () => void;
  onOpenPrimary: () => void;
  onOpenSecondary: () => void;
}) {
  return (
    <article className={`panel message-offer-card app-swap-request-card${status === "pending" ? " message-offer-card--urgent" : ""}`} key={offerId}>
      <div className="message-offer-head">
        <UserMiniCard
          user={{ id: otherPartyId, display_name: otherPartyName, avatar_url: otherPartyAvatar }}
          meta={otherPartyMeta}
          onClick={onOpenProfile}
          className="message-offer-party"
        />
        <div className="message-offer-status">
          <StatusBadge kind="swap" status={status} />
          {createdAt ? <small>{createdAt}</small> : null}
        </div>
      </div>
      <div className="message-offer-tray">
        {thumbnails.slice(0, 3).map((item) => (
          <button
            key={`message-thumb-${offerId}-${item.id}`}
            type="button"
            className="message-offer-thumb"
            onClick={item.onOpen}
            aria-label={`เปิดสินค้า ${item.title}`}
          >
            <img src={asset(item.image || "") || wantedFallbacks.Other} alt={item.title} />
          </button>
        ))}
        {thumbnails.length > 3 ? <span className="message-offer-thumb-count">+{thumbnails.length - 3}</span> : null}
      </div>
      <div className="message-offer-copy">
        <b>{title}</b>
        <p>{summary}</p>
      </div>
      <div className="message-offer-caption">
        <span>{targetLabel}</span>
        <b>{targetTitle}</b>
      </div>
      <div className="message-offer-actions">
        <Button wide onClick={onOpenPrimary}>{primaryLabel}</Button>
        <Button wide variant={dangerSecondary ? "danger" : "secondary"} onClick={onOpenSecondary}>
          {secondaryLabel}
        </Button>
      </div>
    </article>
  );
}
