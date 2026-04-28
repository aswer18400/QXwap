export const state = {
  currentUser: null,
  shopFilter: "all",
  feedFilter: "all",
  feedCategory: "all",
  inboxFilter: "action",
  currentCategory: "all",
  filters: {
    query: "",
    priceMin: "",
    priceMax: "",
    followingOnly: false,
    nearbyKm: "",
    fastResponder: false,
    topUser: false,
    hasRequests: false,
    category: "all",
    dealType: "all",
    openToOffers: false,
    wantedTag: "",
  },
};

export const distanceOptionsKm = [3, 5, 10, 15, 20, 30, 50];

export const categories = [
  { key: "all", name: "ทั้งหมด", icon: "🧩" },
  { key: "baby", name: "แม่และเด็ก", icon: "🍼" },
  { key: "gadget", name: "Gadget", icon: "⌚" },
  { key: "phone", name: "มือถือ", icon: "📱" },
  { key: "fashion", name: "แฟชั่น", icon: "👕" },
  { key: "home", name: "ของใช้ในบ้าน", icon: "🏠" },
  { key: "electronics", name: "Electronics", icon: "💻" },
];
