import { BrandMark } from "./BrandMark";
import type { RequireLogin } from "../lib/types";

type LoginCtaContent = {
  eyebrow: string;
  summary: string;
  metrics: Array<{ value: string; label: string }>;
  steps: string[];
  note?: string;
  action?: string;
  message?: string;
};

const DEFAULT_CONTENT: LoginCtaContent = {
  eyebrow: "QXwap Access",
  summary: "เข้าสู่ระบบก่อนเพื่อปลดล็อกฟังก์ชันของหน้านี้และกลับมาทำต่อจากจุดเดิมได้ทันที",
  metrics: [
    { value: "ปลอดภัย", label: "ผูก session กับบัญชี" },
    { value: "ต่อเนื่อง", label: "กลับมาทำต่อได้ทันที" },
    { value: "เรียลไทม์", label: "ตามดีลและข้อความได้" }
  ],
  steps: [
    "เก็บประวัติการใช้งานและรายการที่คุณติดตาม",
    "ใช้ฟังก์ชันที่ต้องมีบัญชีอย่างปลอดภัยต่อเนื่อง",
    "รับอัปเดตข้อเสนอ ข้อความ และสถานะดีลแบบเรียลไทม์"
  ],
  note: "หลังเข้าสู่ระบบแล้ว เราจะพากลับมาหน้านี้ให้อัตโนมัติ",
  action: "เข้าสู่ระบบเพื่อใช้งาน",
  message: "เข้าสู่ระบบเพื่อใช้งาน QXwap ต่อจากหน้านี้"
};

export function getLoginCtaContent(title: string): LoginCtaContent {
  switch (title) {
    case "โปรไฟล์":
      return {
        eyebrow: "Profile Hub",
        summary: "ดูประวัติร้าน รายการสินค้าที่กำลังลงขายหรือแลก และจัดการข้อมูลบัญชีของคุณในที่เดียว",
        metrics: [
          { value: "ร้าน", label: "สถิติและรีวิวรวม" },
          { value: "ประกาศ", label: "ดูสินค้าที่ลงไว้ทั้งหมด" },
          { value: "ตัวตน", label: "อัปเดตข้อมูลร้านได้" }
        ],
        steps: [
          "ดูประกาศ สถิติ และรีวิวของบัญชี",
          "ติดตามรายการที่กำลังคุยหรือมีคนสนใจ",
          "แก้ไขข้อมูลโปรไฟล์ รูป และรายละเอียดร้าน"
        ],
        note: "เหมาะสำหรับทั้งโปรไฟล์ของคุณเองและการติดตามร้านที่คุณสนใจ",
        action: "เข้าสู่ระบบเพื่อดูโปรไฟล์",
        message: "เข้าสู่ระบบเพื่อดูโปรไฟล์ ร้าน และประวัติดีลของคุณ"
      };
    case "ลงสินค้าใหม่":
      return {
        eyebrow: "Listing Studio",
        summary: "เพิ่มรูป ใส่รายละเอียดสินค้า และกำหนดว่าต้องการขายหรือแลก เพื่อเริ่มรับข้อเสนอได้ทันที",
        metrics: [
          { value: "หลายรูป", label: "ใส่ภาพได้ในโพสต์เดียว" },
          { value: "หลายดีล", label: "รองรับขายหรือแลก" },
          { value: "ติดตาม", label: "ดูสถานะข้อเสนอหลังโพสต์" }
        ],
        steps: [
          "อัปโหลดรูปหลายรูปและตั้งชื่อสินค้า",
          "ระบุราคา สภาพ และสิ่งที่อยากแลก",
          "เปิดรับข้อเสนอและติดตามสถานะดีลหลังโพสต์"
        ],
        note: "ยิ่งใส่ข้อมูลครบ คนสนใจจะตัดสินใจได้เร็วขึ้น",
        action: "เข้าสู่ระบบเพื่อลงสินค้า",
        message: "เข้าสู่ระบบเพื่อเริ่มลงสินค้าและรับข้อเสนอ"
      };
    case "แลกต่อสินค้า":
      return {
        eyebrow: "Reswap Flow",
        summary: "ใช้หน้าต่างนี้เพื่อโพสต์สินค้าที่คุณได้รับมาแล้วและเปิดรับข้อเสนอใหม่ต่อได้ทันที",
        metrics: [
          { value: "ต่อยอด", label: "คัดลอกข้อมูลจากดีลเดิม" },
          { value: "ยืดหยุ่น", label: "เปลี่ยนราคาและเงื่อนไขได้" },
          { value: "เก็บประวัติ", label: "ไม่เสีย trace ของรายการเดิม" }
        ],
        steps: [
          "คัดลอกรายละเอียดจากสินค้าที่มีอยู่เพื่อลดเวลาพิมพ์ซ้ำ",
          "ปรับราคา สภาพ และสิ่งที่ต้องการแลกใหม่",
          "เปิดดีลรอบถัดไปโดยยังเก็บประวัติรายการเดิมไว้"
        ],
        note: "เหมาะกับกรณีที่คุณอยากปล่อยต่อหรือหาแลกชิ้นใหม่จากของเดิม",
        action: "เข้าสู่ระบบเพื่อแลกต่อ",
        message: "เข้าสู่ระบบเพื่อโพสต์แลกต่อจากสินค้าชิ้นนี้"
      };
    case "ข้อเสนอ":
    case "ข้อเสนอแลกสินค้า":
      return {
        eyebrow: "Offer Control",
        summary: "ดูข้อเสนอที่คุณได้รับและที่คุณส่งไว้ เปรียบเทียบสินค้าที่เกี่ยวข้อง และตัดสินใจดีลได้จากจุดเดียว",
        metrics: [
          { value: "เปรียบเทียบ", label: "เห็นของทั้งสองฝั่งในดีล" },
          { value: "ตัดสินใจ", label: "ตอบรับ ปฏิเสธ หรือยกเลิก" },
          { value: "ติดตาม", label: "นัดรับ ส่งมอบ และรับของ" }
        ],
        steps: [
          "ดูสินค้าที่กำลังเสนอแลกแบบครบทุกชิ้น",
          "ตอบรับ ปฏิเสธ หรือเปิดแชทเพื่อต่อรองต่อ",
          "ติดตามสถานะนัดรับ ส่งมอบ และยืนยันรับของ"
        ],
        note: "ดีลทั้งหมดจะผูกกับบัญชีของคุณเพื่อไม่ให้สับสนข้ามอุปกรณ์",
        action: "เข้าสู่ระบบเพื่อดูข้อเสนอ",
        message: "เข้าสู่ระบบเพื่อเปิดข้อเสนอและตัดสินใจดีล"
      };
    case "แชท":
      return {
        eyebrow: "Live Conversation",
        summary: "กลับมาคุยต่อเรื่องราคา รายละเอียดสินค้า และการนัดรับได้จากห้องแชทของแต่ละดีลโดยตรง",
        metrics: [
          { value: "ต่อรอง", label: "คุยก่อนตอบรับจริง" },
          { value: "ชัดเจน", label: "อ้างอิงดีลและสินค้าได้" },
          { value: "ต่อเนื่อง", label: "อ่านข้อความย้อนหลังครบ" }
        ],
        steps: [
          "อ่านข้อความล่าสุดของแต่ละดีลในที่เดียว",
          "คุยต่อรองราคาและยืนยันสิ่งที่แนบในข้อเสนอ",
          "ใช้นัดหมายและติดตามขั้นตอนก่อนปิดดีล"
        ],
        note: "ข้อความจะผูกกับบัญชีเพื่อให้กลับมาอ่านต่อได้ทุกครั้ง",
        action: "เข้าสู่ระบบเพื่อเปิดแชท",
        message: "เข้าสู่ระบบเพื่อกลับไปคุยต่อในห้องแชท"
      };
    case "บันทึกไว้":
      return {
        eyebrow: "Saved Board",
        summary: "เก็บสินค้าที่สนใจไว้ก่อน แล้วกลับมาเปรียบเทียบหรือเปิดดีลภายหลังได้ง่ายขึ้น",
        metrics: [
          { value: "รวมไว้", label: "รวมสินค้าที่กดสนใจทั้งหมด" },
          { value: "เทียบง่าย", label: "สลับดูหลายชิ้นได้เร็ว" },
          { value: "พร้อมดีล", label: "เริ่มข้อเสนอจากรายการที่เก็บ" }
        ],
        steps: [
          "รวมรายการที่คุณกดบันทึกจากหลายหน้าไว้ในที่เดียว",
          "เปรียบเทียบสินค้าที่กำลังสนใจได้เร็วขึ้น",
          "เปิดดูรายละเอียดหรือเริ่มข้อเสนอจากรายการที่บันทึกไว้"
        ],
        note: "เหมาะกับการเก็บของที่ยังไม่พร้อมตัดสินใจทันที",
        action: "เข้าสู่ระบบเพื่อดูรายการบันทึก",
        message: "เข้าสู่ระบบเพื่อเปิดรายการที่คุณบันทึกไว้"
      };
    case "โนติฟิเคชัน":
      return {
        eyebrow: "Realtime Alerts",
        summary: "รับอัปเดตเมื่อมีข้อเสนอใหม่ มีข้อความเข้า หรือดีลของคุณเปลี่ยนสถานะโดยไม่ต้องคอยรีเฟรชเอง",
        metrics: [
          { value: "ข้อเสนอ", label: "แจ้งเมื่อมีคนสนใจทันที" },
          { value: "ข้อความ", label: "ไม่พลาดแชทต่อรอง" },
          { value: "สถานะ", label: "ตามนัดรับและรับของได้" }
        ],
        steps: [
          "ดูความเคลื่อนไหวล่าสุดของสินค้าและข้อเสนอ",
          "เปิดไปยังห้องแชทหรือรายละเอียดดีลได้ทันที",
          "ไม่พลาดการตอบรับ นัดรับ หรือการยืนยันรับของ"
        ],
        note: "ระบบจะแยกอัปเดตตามรายการและบัญชีของคุณให้โดยอัตโนมัติ",
        action: "เข้าสู่ระบบเพื่อดูการแจ้งเตือน",
        message: "เข้าสู่ระบบเพื่อรับอัปเดตข้อเสนอและข้อความล่าสุด"
      };
    case "แก้ไขโปรไฟล์":
      return {
        eyebrow: "Profile Setup",
        summary: "ตั้งชื่อร้าน รูปโปรไฟล์ รายละเอียดติดต่อ และข้อมูลที่อยู่ให้พร้อมก่อนเปิดรับข้อเสนอจริง",
        metrics: [
          { value: "ชื่อร้าน", label: "สร้างภาพจำที่ชัดเจน" },
          { value: "พื้นที่", label: "ให้คนค้นหาเจอง่ายขึ้น" },
          { value: "น่าเชื่อถือ", label: "เพิ่มโอกาสปิดดีล" }
        ],
        steps: [
          "แก้ไขชื่อ รูป และคำอธิบายร้านได้ตลอดเวลา",
          "อัปเดตข้อมูลติดต่อและพื้นที่ให้ส่งผลกับการค้นหา",
          "ทำให้โปรไฟล์ดูน่าเชื่อถือขึ้นก่อนคุยดีล"
        ],
        note: "ข้อมูลที่ครบและชัดจะช่วยให้คนตัดสินใจแลกกับคุณง่ายขึ้น",
        action: "เข้าสู่ระบบเพื่อแก้ไขโปรไฟล์",
        message: "เข้าสู่ระบบเพื่อแก้ไขข้อมูลโปรไฟล์และร้านของคุณ"
      };
    case "เครดิต":
      return {
        eyebrow: "Wallet Access",
        summary: "ดูยอดเครดิต ประวัติการใช้งาน และรายละเอียดการสนับสนุนดีลที่เชื่อมกับบัญชีของคุณ",
        metrics: [
          { value: "ยอดคงเหลือ", label: "เช็กเครดิตได้ทันที" },
          { value: "ย้อนหลัง", label: "ดูประวัติการใช้งาน" },
          { value: "ดีลที่เกี่ยวข้อง", label: "ผูกกับบัญชีของคุณเท่านั้น" }
        ],
        steps: [
          "ดูเครดิตคงเหลือและการเคลื่อนไหวล่าสุด",
          "ตรวจสอบรายการที่เกี่ยวกับค่าส่งหรือโปรโมชัน",
          "ติดตามการใช้สิทธิ์ในแต่ละดีลได้ง่ายขึ้น"
        ],
        note: "ข้อมูลเครดิตเป็นข้อมูลเฉพาะบัญชี จึงต้องเข้าสู่ระบบก่อน",
        action: "เข้าสู่ระบบเพื่อดูเครดิต",
        message: "เข้าสู่ระบบเพื่อเปิดกระเป๋าเครดิตและประวัติการใช้งาน"
      };
    default:
      return DEFAULT_CONTENT;
  }
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
        <div className="login-cta-visual" aria-hidden="true">
          <span className="login-cta-orbit login-cta-orbit--outer" />
          <span className="login-cta-orbit login-cta-orbit--inner" />
          <span className="login-cta-beacon login-cta-beacon--one" />
          <span className="login-cta-beacon login-cta-beacon--two" />
          <div className="login-cta-mark-shell">
            <BrandMark size={46} />
          </div>
        </div>
        <div className="login-cta-copy">
          <span className="login-cta-kicker">{content.eyebrow}</span>
          <b>{title}</b>
          <p>{content.summary}</p>
        </div>
      </div>
      <div className="login-cta-metrics" aria-label="สิ่งที่จะได้หลังเข้าสู่ระบบ">
        {content.metrics.map((metric) => (
          <div className="login-cta-metric" key={`${metric.value}-${metric.label}`}>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </div>
        ))}
      </div>
      <div className="step-list login-cta-steps">
        {content.steps.map((step, index) => (
          <span key={step}>
            <i aria-hidden="true">{index + 1}</i>
            <small>{step}</small>
          </span>
        ))}
      </div>
      {content.note ? <small className="login-cta-note">{content.note}</small> : null}
      <div className="login-cta-actions">
        <button className="primary login-cta-button" onClick={() => requireLogin(content.message)}>
          {content.action ?? "เข้าสู่ระบบ"}
        </button>
      </div>
    </section>
  );
}
