import { ArrowRight } from "../components/AppIcons";
import { asset } from "../lib/api";
import type { Campaign } from "../lib/types";
import { PageHeader } from "../components/PageHeader";

export function CampaignDetailPage({
  campaign,
  loading,
  error,
  onBack,
  onNext
}: {
  campaign: Campaign | null;
  loading: boolean;
  error: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const bodyCopy = campaign?.summary || campaign?.body || "";
  const ctaLabel = campaign?.cta_label || "ถัดไป";

  return (
    <section className="screen campaign-screen">
      <PageHeader title={campaign?.title || "แคมเปญ"} subtitle="หน้าพิเศษของโปรโมชัน" onBack={onBack} align="left" />
      {loading ? <div className="empty">กำลังโหลดแคมเปญ...</div> : null}
      {!loading && error ? <p className="err" role="alert">{error}</p> : null}
      {!loading && !error && campaign ? (
        <>
          <div className="panel campaign-panel campaign-panel-hero">
            <img className="campaign-hero" src={asset(campaign.hero_image_url)} alt={campaign.title} />
            <div className="campaign-copy">
              <small>แคมเปญแนะนำ</small>
              <h2>{campaign.title}</h2>
              {bodyCopy ? <p>{bodyCopy}</p> : null}
            </div>
          </div>
          <div className="panel campaign-focus-card">
            <div className="section-head">
              <div>
                <h2>รวมสินค้าที่เหมาะกับแคมเปญนี้</h2>
                <p>ใช้หน้านี้เพื่อพาคนดูไปยังดีลที่ควรดันต่อได้เร็วขึ้น</p>
              </div>
            </div>
            <div className="campaign-focus-grid">
              <div>
                <small>เหมาะสำหรับ</small>
                <b>การดันสินค้าหรือหมวดที่เกี่ยวข้อง</b>
              </div>
              <div>
                <small>เป้าหมาย</small>
                <b>พาไปยังสินค้าที่พร้อมคุยและพร้อมแลกต่อ</b>
              </div>
            </div>
          </div>
          <div className="publish-action-bar campaign-action-bar">
            <button type="button" className="primary publish-primary" onClick={onNext}>
              {ctaLabel} <ArrowRight size={16} />
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
