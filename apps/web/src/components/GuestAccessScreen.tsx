import type { RequireLogin } from "../lib/types";
import { getLoginCtaContent } from "./LoginCTA";
import { PageHeader } from "./PageHeader";

export function GuestAccessScreen({
  title,
  subtitle,
  requireLogin,
  onBack
}: {
  title: string;
  subtitle?: string;
  requireLogin: RequireLogin;
  onBack?: () => void;
}) {
  const content = getLoginCtaContent(title);

  return (
    <section className="screen guest-access-screen">
      {onBack ? (
        <PageHeader title={title} subtitle={subtitle || content.summary} onBack={onBack} align="left" />
      ) : (
        <div className="section-head guest-access-heading">
          <div>
            <span className="eyebrow">{content.eyebrow}</span>
            <h1>{title}</h1>
            <p>{subtitle || content.summary}</p>
          </div>
        </div>
      )}

      <div className="panel guest-access-preview">
        <div className="guest-access-preview-copy">
          <b>หน้านี้ใช้บัญชีของคุณเพื่อเก็บสถานะและพากลับมาทำต่อได้ทันที</b>
          <p>{content.summary}</p>
        </div>

        <div className="guest-access-metrics" aria-label={`สิ่งที่จะปลดล็อกในหน้า ${title}`}>
          {content.metrics.map((metric) => (
            <div className="guest-access-metric" key={`${metric.value}-${metric.label}`}>
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </div>
          ))}
        </div>

        <div className="guest-access-steps">
          {content.steps.map((step, index) => (
            <div className="guest-access-step" key={step}>
              <i aria-hidden="true">{index + 1}</i>
              <small>{step}</small>
            </div>
          ))}
        </div>

        <div className="guest-access-lock">
          <div className="guest-access-lock-copy">
            <strong>{content.action || "เข้าสู่ระบบเพื่อปลดล็อกหน้านี้"}</strong>
            <p>{content.note || "กดเข้าสู่ระบบจากแถบลอยด้านล่างได้ทุกเมื่อ แล้วระบบจะพากลับมาหน้านี้ต่อให้อัตโนมัติ"}</p>
          </div>
          <button type="button" className="secondary" onClick={() => requireLogin(content.message)}>
            เปิดหน้าล็อกอิน
          </button>
        </div>
      </div>
    </section>
  );
}
