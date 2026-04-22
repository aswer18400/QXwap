export const state = {
  currentUser: null,
  shopFilter: "all",
  feedFilter: "all",
  inboxFilter: "action",
  currentCategory: "all",
};

export const categories = [
  { key: "all", name: "ทั้งหมด", icon: "🧩" },
  { key: "baby", name: "แม่และเด็ก", icon: "🍼" },
  { key: "gadget", name: "Gadget", icon: "⌚" },
  { key: "phone", name: "มือถือ", icon: "📱" },
  { key: "fashion", name: "แฟชั่น", icon: "👕" },
  { key: "home", name: "ของใช้ในบ้าน", icon: "🏠" },
  { key: "electronics", name: "Electronics", icon: "💻" },
];
