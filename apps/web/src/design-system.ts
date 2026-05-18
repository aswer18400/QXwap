export const qxwapDesignSystem = {
  brand: {
    name: "QXwap",
    primary: "#176bff",
    secondary: "#53a7ff",
    ink: "#101322",
    muted: "#68748a",
    surface: "#ffffff",
    page: "#fbfcff"
  },
  spacing: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40
  },
  radius: {
    xs: 12,
    sm: 16,
    md: 18,
    lg: 20,
    control: 16,
    card: 22,
    xl: 24,
    sheet: 28,
    media: 18,
    pill: 30,
    modal: 32,
    full: 999
  },
  shadow: {
    soft: "0 8px 22px rgba(16, 24, 40, .06)",
    card: "0 14px 32px rgba(35,50,90,.09)",
    raised: "0 18px 42px rgba(32,45,85,.16)",
    primary: "0 12px 28px rgba(23,107,255,.28)",
    sheet: "0 -18px 46px rgba(16, 24, 40, .18)",
    nav: "0 -10px 28px rgba(16, 24, 40, .10)"
  },
  copy: {
    loginRequired: "กรุณาเข้าสู่ระบบก่อนเพื่อใช้งานต่อ",
    restricted: "บัญชีนี้ถูกจำกัดสิทธิ์ สามารถดูได้เท่านั้น"
  }
} as const;

export const inboxTabs = [
  { id: "offers", label: "Xwap" },
  { id: "notifications", label: "โนติฟิเคชัน" }
] as const;

export const profileMenus = [
  { id: "shop", label: "ร้านของฉัน" },
  { id: "offers", label: "จัดการข้อเสนอ" },
  { id: "settings", label: "เซ็ตติ้ง" },
  { id: "saved", label: "บันทึกไว้" },
  { id: "credits", label: "เครดิต" },
  { id: "shipping", label: "การจัดส่ง" }
] as const;

export const publicProfileMenus = [
  { id: "shop", label: "ร้านค้า" },
  { id: "offers", label: "Xwap" },
  { id: "shipping", label: "การจัดส่ง" }
] as const;

export const profileProductTabs = [
  { id: "have", label: "มีอยู่" },
  { id: "want", label: "อยากได้" }
] as const;
