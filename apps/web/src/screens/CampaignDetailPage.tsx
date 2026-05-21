import { ArrowRight } from "lucide-react";
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
  return (
    <section className="screen campaign-screen">
      <PageHeader title={campaign?.title || "แคมเปญ"} onBack={onBack} />
      {loading ? <div className="empty">กำลังโหลดแคมเปญ...</div> : null}
      {!loading && error ? <p className="err">{error}</p> : null}
      {!loading && !error && campaign ? (
        <>
          <div className="panel campaign-panel">
            <img className="campaign-hero" src={asset(campaign.hero_image_url)} alt={campaign.title} />
            <div className="campaign-copy">
              <h2>{campaign.title}</h2>
              {campaign.summary ? <p>{campaign.summary}</p> : null}
              {campaign.body ? <div className="campaign-body">{campaign.body}</div> : null}
            </div>
          </div>
          <div className="publish-action-bar campaign-action-bar">
            <div className="publish-action-copy">
              <b>{campaign.cta_label || "ถัดไป"}</b>
              <span>ดำเนินการต่อจากแคมเปญนี้</span>
            </div>
            <button type="button" className="primary publish-primary" onClick={onNext}>
              {campaign.cta_label || "ถัดไป"} <ArrowRight size={16} />
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
