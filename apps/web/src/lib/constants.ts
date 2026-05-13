import type { DealType } from "./types";

export const categoryLabels: Record<string, string> = {
  Electronics: "อิเล็กทรอนิกส์",
  Fashion: "แฟชั่น",
  Home: "บ้าน",
  Sports: "กีฬา",
  Vehicles: "ยานพาหนะ",
  Collectibles: "ของสะสม",
  Books: "หนังสือ",
  Beauty: "บิวตี้",
  Toys: "ของเล่น",
  Other: "อื่น ๆ"
};

export const filterSummaryLabels: Record<string, string> = {
  q: "คำค้นหา",
  category: "หมวด",
  deal_type: "ประเภทดีล",
  min_price: "ราคาต่ำสุด",
  max_price: "ราคาสูงสุด",
  open_to_offers: "เปิดรับข้อเสนอ",
  wanted_tag: "สิ่งที่อยากได้",
  following: "เฉพาะคนที่ติดตาม",
  nearby_radius_km: "ระยะใกล้เคียง",
  fast_responder: "ตอบไว",
  featured: "ผู้ใช้งานดีเด่น",
  condition: "สภาพ",
  sort: "เรียง"
};

export const categories = [
  "Electronics",
  "Fashion",
  "Home",
  "Sports",
  "Vehicles",
  "Collectibles",
  "Books",
  "Beauty",
  "Toys",
  "Other"
];

export const conditions = ["New", "Like new", "Good", "Used"];

export const dealLabels: Record<DealType, string> = {
  swap: "แลก",
  sell: "ขาย",
  buy: "ต้องการซื้อ",
  both: "ขายหรือแลก"
};

export const conditionLabels: Record<string, string> = {
  New: "ใหม่",
  "Like new": "เหมือนใหม่",
  Good: "ดี",
  Used: "ผ่านการใช้งาน"
};

export const conditionScores: Record<string, number> = {
  New: 98,
  "Like new": 92,
  Good: 85,
  Used: 72
};

export const wantedFallbacks: Record<string, string> = {
  Electronics: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=700&q=80",
  Fashion: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=80",
  Home: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=700&q=80",
  Sports: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=700&q=80",
  Vehicles: "https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?auto=format&fit=crop&w=700&q=80",
  Collectibles: "https://images.unsplash.com/photo-1600721391689-2564bb8055de?auto=format&fit=crop&w=700&q=80",
  Books: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=700&q=80",
  Beauty: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=700&q=80",
  Toys: "https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&w=700&q=80",
  Other: "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=700&q=80"
};

export const emptyFilters = {
  q: "",
  category: "",
  deal_type: "",
  min_price: "",
  max_price: "",
  open_to_offers: false,
  wanted_tag: "",
  following: false,
  nearby_radius_km: "",
  fast_responder: false,
  featured: false,
  condition: "",
  sort: "newest"
};

export type Filters = typeof emptyFilters;
