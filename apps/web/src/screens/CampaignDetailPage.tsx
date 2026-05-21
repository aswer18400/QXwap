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
      <PageHeader title={campaign?.title || "แคมเปญ"} onBack={onBack} />
      {loading ? <div className="empty">กำลังโหลดแคมเปญ...</div> : null}
      {!loading && error ? <p className="err" role="alert">{error}</p> : null}
      {!loading && !error && campaign ? (
        <>
          <div className="panel campaign-panel">
            <img className="campaign-hero" src={asset(campaign.hero_image_url)} alt={campaign.title} />
            <div className="campaign-copy">
              <h2>{campaign.title}</h2>
              {bodyCopy ? <p>{bodyCopy}</p> : null}
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
