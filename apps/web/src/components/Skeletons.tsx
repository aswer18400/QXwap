type SkeletonLineProps = {
  width?: string;
  height?: number;
  className?: string;
};

function SkeletonLine({ width = "100%", height = 14, className = "" }: SkeletonLineProps) {
  return (
    <span
      className={`qx-skeleton-line${className ? ` ${className}` : ""}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function SplashScreen() {
  return (
    <section className="app-splash" aria-label="กำลังเริ่มต้น QXwap">
      <div className="app-splash-mark">QXwap</div>
      <div className="app-splash-card">
        <SkeletonLine width="44%" height={18} />
        <SkeletonLine width="72%" />
        <SkeletonLine width="58%" />
      </div>
      <p>กำลังเตรียมหน้าแรกและโหลดสินค้าแนะนำ...</p>
    </section>
  );
}

export function FeedSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="page-skeleton feed-page-skeleton" aria-hidden="true">
      <div className="follow-rail-skeleton">
        {Array.from({ length: 5 }).map((_, index) => (
          <div className="follow-pill-skeleton" key={`follow-${index}`}>
            <span className="qx-skeleton-avatar" />
            <SkeletonLine width="38px" height={10} />
          </div>
        ))}
      </div>
      <div className="credit-card-skeleton qx-skeleton-panel">
        <div>
          <SkeletonLine width="72px" height={10} />
          <SkeletonLine width="120px" height={18} />
        </div>
        <SkeletonLine width="92px" height={34} className="qx-skeleton-pill" />
      </div>
      <div className="section-head">
        <SkeletonLine width="146px" height={24} />
      </div>
      <div className="feed-market-list">
        {Array.from({ length: cards }).map((_, index) => (
          <div className="feed-market-card-skeleton qx-skeleton-panel" key={`feed-card-${index}`}>
            <div className="feed-market-owner-skeleton">
              <span className="qx-skeleton-avatar large" />
              <div>
                <SkeletonLine width="112px" />
                <SkeletonLine width="82px" height={11} />
              </div>
            </div>
            <div className="feed-market-main-skeleton">
              <span className="qx-skeleton-box photo" />
              <div className="feed-market-copy-skeleton">
                <SkeletonLine width="76%" height={16} />
                <SkeletonLine width="48%" height={12} />
                <SkeletonLine width="40%" height={20} />
                <SkeletonLine width="92%" />
              </div>
            </div>
            <div className="feed-market-tags-skeleton">
              <SkeletonLine width="74px" height={28} className="qx-skeleton-pill" />
              <SkeletonLine width="62px" height={28} className="qx-skeleton-pill" />
              <SkeletonLine width="84px" height={28} className="qx-skeleton-pill" />
            </div>
            <div className="feed-market-actions-skeleton">
              <SkeletonLine width="112px" height={40} className="qx-skeleton-pill" />
              <SkeletonLine width="112px" height={40} className="qx-skeleton-pill" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ShopSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="page-skeleton shop-page-skeleton" aria-hidden="true">
      <div className="shop-search-skeleton">
        <SkeletonLine width="100%" height={48} className="qx-skeleton-pill" />
        <SkeletonLine width="104px" height={48} className="qx-skeleton-pill" />
      </div>
      <div className="category-rail-skeleton">
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonLine key={`category-${index}`} width="88px" height={34} className="qx-skeleton-pill" />
        ))}
      </div>
      <div className="section-head">
        <SkeletonLine width="112px" height={24} />
        <SkeletonLine width="52px" height={12} />
      </div>
      <div className="shop-grid">
        {Array.from({ length: cards }).map((_, index) => (
          <div className="shop-card-skeleton qx-skeleton-panel" key={`shop-card-${index}`}>
            <span className="qx-skeleton-box shop-photo" />
            <div className="shop-card-skeleton-body">
              <SkeletonLine width="78%" height={16} />
              <SkeletonLine width="62%" height={12} />
              <SkeletonLine width="44%" height={18} />
              <div className="shop-card-skeleton-tags">
                <SkeletonLine width="66px" height={24} className="qx-skeleton-pill" />
                <SkeletonLine width="72px" height={24} className="qx-skeleton-pill" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InboxSkeleton() {
  return (
    <div className="page-skeleton inbox-page-skeleton" aria-hidden="true">
      <div className="section-head">
        <SkeletonLine width="98px" height={24} />
      </div>
      <div className="inbox-tabs-skeleton">
        <SkeletonLine width="96px" height={36} className="qx-skeleton-pill" />
        <SkeletonLine width="96px" height={36} className="qx-skeleton-pill" />
        <SkeletonLine width="96px" height={36} className="qx-skeleton-pill" />
      </div>
      {Array.from({ length: 3 }).map((_, index) => (
        <div className="inbox-card-skeleton qx-skeleton-panel" key={`inbox-${index}`}>
          <SkeletonLine width="58%" height={16} />
          <SkeletonLine width="82%" />
          <SkeletonLine width="66%" />
          <div className="inbox-card-actions-skeleton">
            <SkeletonLine width="120px" height={38} className="qx-skeleton-pill" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function WalletSkeleton() {
  return (
    <div className="page-skeleton wallet-page-skeleton" aria-hidden="true">
      <div className="wallet-skeleton-hero qx-skeleton-panel">
        <SkeletonLine width="88px" height={10} />
        <SkeletonLine width="168px" height={26} />
        <SkeletonLine width="92%" />
      </div>
      <div className="wallet-skeleton-panel qx-skeleton-panel">
        <SkeletonLine width="96px" height={18} />
        <div className="wallet-skeleton-presets">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonLine key={`wallet-preset-${index}`} width="74px" height={36} className="qx-skeleton-pill" />
          ))}
        </div>
        <SkeletonLine width="100%" height={48} className="qx-skeleton-pill" />
        <SkeletonLine width="100%" height={48} className="qx-skeleton-pill" />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="page-skeleton profile-page-skeleton" aria-hidden="true">
      <div className="profile-cover-skeleton qx-skeleton-panel" />
      <div className="profile-overview-skeleton qx-skeleton-panel">
        <span className="qx-skeleton-avatar xl" />
        <div className="profile-overview-copy-skeleton">
          <SkeletonLine width="132px" height={24} />
          <SkeletonLine width="72%" />
          <SkeletonLine width="58%" />
        </div>
      </div>
      <div className="profile-summary-skeleton">
        {Array.from({ length: 3 }).map((_, index) => (
          <div className="profile-summary-card qx-skeleton-panel" key={`profile-summary-${index}`}>
            <SkeletonLine width="72px" height={10} />
            <SkeletonLine width="54px" height={24} />
            <SkeletonLine width="92%" />
          </div>
        ))}
      </div>
    </div>
  );
}
