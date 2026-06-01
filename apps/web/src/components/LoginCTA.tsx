import { BrandMark } from "./BrandMark";
import type { RequireLogin } from "../lib/types";

type LoginCtaContent = {
  eyebrow: string;
  summary: string;
  metrics: Array<{ value: string; label: string }>;
  steps: string[];
  note?: string;
  action: string;
  message: string;
};

const DEFAULT_CONTENT: LoginCtaContent = {
  eyebrow: "เข้าสู่ระบบ",
  summary: "ใช้บัญชีเดียวเพื่อกลับมาทำต่อจากจุดเดิม",
  metrics: [],
  steps: [],
  action: "เข้าสู่ระบบ",
  message: "เข้าสู่ระบบเพื่อใช้งาน QXwap ต่อ"
};

const CONTENT_BY_TITLE: Record<string, Partial<LoginCtaContent>> = {
  โปรไฟล์: {
    eyebrow: "โปรไฟล์",
    summary: "ดูร้านและสินค้าของคุณ",
    action: "เปิดโปรไฟล์",
    message: "เข้าสู่ระบบเพื่อดูโปรไฟล์ของคุณ"
  },
  "ลงสินค้าใหม่": {
    eyebrow: "ลงสินค้า",
    summary: "ลงประกาศและรับข้อเสนอ",
    action: "ลงสินค้า",
    message: "เข้าสู่ระบบเพื่อลงสินค้า"
  },
  แลกต่อสินค้า: {
    eyebrow: "แลกต่อ",
    summary: "เปิดประกาศใหม่จากของชิ้นนี้",
    action: "เริ่มแลกต่อ",
    message: "เข้าสู่ระบบเพื่อแลกต่อสินค้า"
  },
  ข้อเสนอ: {
    eyebrow: "ข้อเสนอ",
    summary: "ดูดีลและตอบกลับได้ในที่เดียว",
    action: "เปิดข้อเสนอ",
    message: "เข้าสู่ระบบเพื่อดูข้อเสนอ"
  },
  ข้อเสนอแลกสินค้า: {
    eyebrow: "ข้อเสนอ",
    summary: "ดูดีลและตอบกลับได้ในที่เดียว",
    action: "เปิดข้อเสนอ",
    message: "เข้าสู่ระบบเพื่อดูข้อเสนอ"
  },
  แชท: {
    eyebrow: "แชต",
    summary: "คุยต่อจากดีลเดิมได้ทันที",
    action: "เปิดแชต",
    message: "เข้าสู่ระบบเพื่อเปิดแชต"
  },
  บันทึกไว้: {
    eyebrow: "บันทึกไว้",
    summary: "กลับมาดูของที่สนใจได้ง่ายขึ้น",
    action: "เปิดรายการบันทึก",
    message: "เข้าสู่ระบบเพื่อดูรายการที่บันทึกไว้"
  },
  โนติฟิเคชัน: {
    eyebrow: "การแจ้งเตือน",
    summary: "ดูอัปเดตของดีลและข้อความล่าสุด",
    action: "เปิดการแจ้งเตือน",
    message: "เข้าสู่ระบบเพื่อดูการแจ้งเตือน"
  },
  แก้ไขโปรไฟล์: {
    eyebrow: "แก้ไขโปรไฟล์",
    summary: "อัปเดตร้านและข้อมูลของคุณ",
    action: "แก้ไขโปรไฟล์",
    message: "เข้าสู่ระบบเพื่อแก้ไขโปรไฟล์"
  },
  เครดิต: {
    eyebrow: "เครดิต",
    summary: "ดูยอดและประวัติเครดิตของคุณ",
    action: "เปิดเครดิต",
    message: "เข้าสู่ระบบเพื่อดูเครดิต"
  }
};

export function getLoginCtaContent(title: string): LoginCtaContent {
  return {
    ...DEFAULT_CONTENT,
    ...(CONTENT_BY_TITLE[title] || {})
  };
}

export function LoginCTA({
  requireLogin,
  title = "QXwap"
}: {
  requireLogin: RequireLogin;
  text?: string;
  title?: string;
  action?: string;
}) {
  const content = getLoginCtaContent(title);

  return (
    <section className="panel login-cta-card" aria-label={`เข้าสู่ระบบเพื่อใช้หน้า ${title}`}>
      <div className="login-cta-hero">
        <div className="login-cta-mark-shell" aria-hidden="true">
          <BrandMark size={46} />
        </div>
        <div className="login-cta-copy">
          <span className="login-cta-kicker">{content.eyebrow}</span>
          <b>{title}</b>
          <p>{content.summary}</p>
        </div>
      </div>
      <div className="login-cta-actions">
        <button className="primary login-cta-button" onClick={() => requireLogin(content.message)}>
          {content.action}
        </button>
      </div>
    </section>
  );
}
