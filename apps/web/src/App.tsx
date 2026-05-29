import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { qxwapDesignSystem } from "./design-system";
import { API, api } from "./lib/api";
import { emptyFilters } from "./lib/constants";
import type { Filters } from "./lib/constants";
import { mergeItems, uniqueOwners } from "./lib/format";
import type { Banner, Campaign, Item, OfferTab, User, View } from "./lib/types";
import { AppShellErrorBoundary } from "./components/AppShellErrorBoundary";
import { AuthNudge } from "./components/AuthNudge";
import { BottomNav } from "./components/BottomNav";
import { FeedSkeleton, ShopSkeleton, SplashScreen } from "./components/Skeletons";
import { Topbar } from "./components/Topbar";
import { AiFeed } from "./screens/AiFeed";
import type { AuthMode } from "./sheets/AuthModal";

const INITIAL_BATCH_SIZE = 6;
const PAGE_CHUNK_SIZE = 6;
const PREFILL_TARGET = 20;
const SPLASH_MIN_MS = 2000;
const USER_CACHE_KEY = "qxwap:user-cache";
const SESSION_SYNC_KEY = "qxwap:session-sync";
const ROUTE_FILTER_KEYS = [
  "q",
  "wanted_tag",
  "category",
  "deal_type",
  "sort",
  "location_label",
  "nearby_radius_km",
  "condition",
  "min_price",
  "max_price",
  "open_to_offers",
  "fast_responder",
  "featured",
  "following"
] as const;
const FOCUSED_VIEWS: View[] = ["search", "filter", "sort"];
const HIDE_BOTTOM_NAV_VIEWS: View[] = ["search", "filter", "sort", "add", "profile_edit", "offer_detail", "chat"];

const AddProduct = lazy(() => import("./screens/AddProduct").then((module) => ({ default: module.AddProduct })));
const CampaignDetailPage = lazy(() => import("./screens/CampaignDetailPage").then((module) => ({ default: module.CampaignDetailPage })));
const ChatPage = lazy(() => import("./screens/ChatPage").then((module) => ({ default: module.ChatPage })));
const Detail = lazy(() => import("./screens/Detail").then((module) => ({ default: module.Detail })));
const OffersPage = lazy(() => import("./screens/InboxPage").then((module) => ({ default: module.OffersPage })));
const NotificationsPage = lazy(() => import("./screens/NotificationsPage").then((module) => ({ default: module.NotificationsPage })));
const OfferDetailPage = lazy(() => import("./screens/OfferDetailPage").then((module) => ({ default: module.OfferDetailPage })));
const Profile = lazy(() => import("./screens/Profile").then((module) => ({ default: module.Profile })));
const ProfileEditPage = lazy(() => import("./screens/ProfileEditPage").then((module) => ({ default: module.ProfileEditPage })));
const SavedPage = lazy(() => import("./screens/SavedPage").then((module) => ({ default: module.SavedPage })));
const ShopPage = lazy(() => import("./screens/ShopPage").then((module) => ({ default: module.ShopPage })));
const AuthModal = lazy(() => import("./sheets/AuthModal").then((module) => ({ default: module.AuthModal })));
const FilterSheet = lazy(() => import("./sheets/FilterSheet").then((module) => ({ default: module.FilterSheet })));
const OfferSheet = lazy(() => import("./sheets/OfferSheet").then((module) => ({ default: module.OfferSheet })));
const SearchSheet = lazy(() => import("./sheets/SearchSheet").then((module) => ({ default: module.SearchSheet })));

type ItemPageResponse = {
  items: Item[];
  page?: {
    limit: number;
    offset: number;
    has_more: boolean;
    next_offset: number | null;
  };
};

const APP_BASE_PATH = (() => {
  const base = import.meta.env.BASE_URL || "/";
  if (base === "/") return "/";
  return base.endsWith("/") ? base.slice(0, -1) : base;
})();

function stripBasePath(pathname: string) {
  if (APP_BASE_PATH === "/") return pathname || "/";
  if (pathname === APP_BASE_PATH) return "/";
  if (pathname.startsWith(`${APP_BASE_PATH}/`)) return pathname.slice(APP_BASE_PATH.length) || "/";
  return pathname || "/";
}

function normalizeRoute(pathname: string) {
  const path = stripBasePath(pathname).replace(/\/+$/, "");
  return path || "/";
}

function resolveAuthRoute(): { mode: AuthMode; message: string } | null {
  const route = normalizeRoute(window.location.pathname).toLowerCase();
  if (route === "/login" || route === "/signin") {
    return { mode: "signin", message: "เข้าสู่ระบบเพื่อใช้งาน QXwap" };
  }
  if (route === "/signup") {
    return { mode: "signup", message: "สร้างบัญชีเพื่อเริ่มใช้งาน QXwap" };
  }
  const hash = window.location.hash.replace("#", "").toLowerCase();
  if (hash === "login" || hash === "signin") {
    return { mode: "signin", message: "เข้าสู่ระบบเพื่อใช้งาน QXwap" };
  }
  if (hash === "signup") {
    return { mode: "signup", message: "สร้างบัญชีเพื่อเริ่มใช้งาน QXwap" };
  }
  return null;
}

function clearAuthRoute() {
  const basePath = APP_BASE_PATH === "/" ? "/" : `${APP_BASE_PATH}/`;
  window.history.replaceState(null, "", `${basePath}${window.location.search}`);
}

function normalizeInboxTab(value?: string | null): OfferTab {
  return value === "sent" ? "sent" : "received";
}

type AppRouteState = {
  app: "qxwap";
  view: View;
  inboxTab: OfferTab;
  editMode: "edit" | "reswap";
  feedPersonId: string;
  filters: Filters;
  selectedId: string | null;
  offerId: string | null;
  profileId: string | null;
  editingItemId: string | null;
  campaignId: string | null;
  selectedItem?: Item | null;
  profileUser?: User | null;
  editingItem?: Item | null;
  campaignData?: Campaign | null;
};

function buildAppRouteUrl(route: AppRouteState) {
  const params = new URLSearchParams();
  if (route.view !== "feed") params.set("view", route.view);
  if (route.inboxTab === "sent" && (route.view === "inbox" || route.view === "offer_detail" || route.view === "chat")) {
    params.set("tab", route.inboxTab);
  }
  if (route.view === "add" && route.editMode === "reswap") params.set("reswap", "1");
  if (route.feedPersonId) params.set("person", route.feedPersonId);
  if (route.selectedId) params.set("item", route.selectedId);
  if (route.offerId) params.set("offer", route.offerId);
  if (route.profileId) params.set("profile", route.profileId);
  if (route.editingItemId) params.set("edit", route.editingItemId);
  if (route.campaignId) params.set("campaign", route.campaignId);
  if (["shop", "search", "filter", "sort"].includes(route.view)) {
    for (const key of ROUTE_FILTER_KEYS) {
      const value = route.filters[key];
      if (!value) continue;
      if (key === "sort" && value === "newest") continue;
      params.set(key, typeof value === "boolean" ? String(value) : value);
    }
  }
  const basePath = APP_BASE_PATH === "/" ? "/" : `${APP_BASE_PATH}/`;
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function parseAppRouteFromLocation(): Partial<AppRouteState> {
  const params = new URLSearchParams(window.location.search);
  const nextView = params.get("view");
  const route: Partial<AppRouteState> = {
    view: (nextView as View) || "feed",
    inboxTab: normalizeInboxTab(params.get("tab")),
    editMode: params.get("reswap") === "1" ? "reswap" : "edit",
    feedPersonId: params.get("person") || "",
    selectedId: params.get("item"),
    offerId: params.get("offer"),
    profileId: params.get("profile"),
    editingItemId: params.get("edit"),
    campaignId: params.get("campaign")
  };
  const nextFilters: Filters = { ...emptyFilters };
  let hasFilter = false;
  for (const key of ROUTE_FILTER_KEYS) {
    const value = params.get(key);
    if (value) {
      if (value === "true" || value === "false") {
        nextFilters[key] = (value === "true") as never;
      } else {
        nextFilters[key] = value as never;
      }
      hasFilter = true;
    }
  }
  if (hasFilter) route.filters = nextFilters;
  return route;
}

function getSplashMessage() {
  const authRoute = resolveAuthRoute();
  if (authRoute?.mode === "signin") return "กำลังเตรียมหน้าเข้าสู่ระบบ...";
  if (authRoute?.mode === "signup") return "กำลังเตรียมหน้าสมัครสมาชิก...";
  const nextView = parseAppRouteFromLocation().view;
  switch (nextView) {
    case "shop":
    case "following":
      return "กำลังเตรียมหน้าช็อปสินค้า...";
    case "search":
      return "กำลังเตรียมหน้าค้นหา...";
    case "filter":
      return "กำลังเตรียมหน้าตัวกรอง...";
    case "sort":
      return "กำลังเตรียมหน้าจัดเรียงสินค้า...";
    default:
      return "กำลังเตรียม QXwap...";
  }
}

function isIgnorableAbortError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const namedError = error as { name?: string; message?: string };
  return (
    namedError.name === "AbortError" ||
    namedError.message === "Fetch is aborted" ||
    namedError.message === "The operation was aborted."
  );
}

function RouteLoading({ message }: { message: string }) {
  return <div className="empty" role="status">{message}</div>;
}

function readCachedUser(): User | null {
  try {
    const raw = window.localStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function writeCachedUser(user: User | null) {
  try {
    if (!user) window.localStorage.removeItem(USER_CACHE_KEY);
    else window.localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
  } catch {
    // noop
  }
}

function broadcastSessionSync(event: "signed-in" | "signed-out" | "account-deleted", userId?: string | null) {
  try {
    window.localStorage.setItem(
      SESSION_SYNC_KEY,
      JSON.stringify({
        event,
        userId: userId || null,
        ts: Date.now()
      })
    );
  } catch {
    // noop
  }
}

export function App() {
  const [user, setUser] = useState<User | null>(() => readCachedUser());
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [feedItems, setFeedItems] = useState<Item[]>([]);
  const [shopItems, setShopItems] = useState<Item[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [feedPersonId, setFeedPersonId] = useState("");
  const [view, setView] = useState<View>("feed");
  const [selected, setSelected] = useState<Item | null>(null);
  const [offerId, setOfferId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editMode, setEditMode] = useState<"edit" | "reswap">("edit");
  const [profileView, setProfileView] = useState<User | null>(null);
  const [campaignView, setCampaignView] = useState<Campaign | null>(null);
  const [filters, setFilters] = useState<Filters>({ ...emptyFilters });
  const [inboxTab, setInboxTab] = useState<OfferTab>("received");
  const [offerItem, setOfferItem] = useState<Item | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [authPrompt, setAuthPrompt] = useState<string>(qxwapDesignSystem.copy.loginRequired);
  const [noticeCount, setNoticeCount] = useState(0);
  const [dataVersion, setDataVersion] = useState(0);
  const [authChecking, setAuthChecking] = useState(true);
  const [splashVisible, setSplashVisible] = useState(true);
  const [error, setError] = useState("");
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState("");
  const [feedLoadingMore, setFeedLoadingMore] = useState(false);
  const [feedHasMore, setFeedHasMore] = useState(true);
  const [feedInitialized, setFeedInitialized] = useState(false);
  const [shopLoading, setShopLoading] = useState(false);
  const [shopLoadingMore, setShopLoadingMore] = useState(false);
  const [shopHasMore, setShopHasMore] = useState(true);
  const [shopInitialized, setShopInitialized] = useState(false);
  const [shopError, setShopError] = useState("");
  const [savedItems, setSavedItems] = useState<Item[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedError, setSavedError] = useState("");
  const [banners, setBanners] = useState<Banner[]>([]);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [campaignError, setCampaignError] = useState("");
  const feedAbortRef = useRef<AbortController | null>(null);
  const shopAbortRef = useRef<AbortController | null>(null);
  const shopQueryKeyRef = useRef("");
  const skipFirstFeedPersonEffect = useRef(true);
  const allItemsRef = useRef<Item[]>([]);
  const userRef = useRef<User | null>(null);
  const routeRestoreRef = useRef(0);

  const activeFilterCount = [
    filters.deal_type,
    filters.condition,
    filters.min_price,
    filters.max_price,
    filters.location_label,
    filters.open_to_offers ? "open_to_offers" : "",
    filters.fast_responder ? "fast_responder" : "",
    filters.featured ? "featured" : ""
  ].filter(Boolean).length;
  const canClearShopFilters = Boolean(
    filters.deal_type ||
    filters.condition ||
    filters.min_price ||
    filters.max_price ||
    filters.location_label ||
    filters.open_to_offers ||
    filters.fast_responder ||
    filters.featured
  );
  const canResetShopResults = Boolean(
    canClearShopFilters ||
    filters.q ||
    filters.wanted_tag ||
    filters.category ||
    filters.following ||
    filters.latitude ||
    filters.longitude ||
    filters.nearby_radius_km
  );
  const sortLabels: Record<string, string> = {
    newest: "เรียงลำดับ",
    ai: "AI แนะนำ",
    price_asc: "ราคาต่ำไปสูง",
    price_desc: "ราคาสูงไปต่ำ",
    most_requested: "ถูกขอมากสุด",
    fast_responder: "ตอบไว",
    nearby: "ใกล้ที่สุด"
  };
  const sortActive = Boolean(filters.sort && filters.sort !== "newest");
  const sortLabel = sortActive ? sortLabels[filters.sort] || "เรียงลำดับ" : "เรียงลำดับ";
  const nearbyActive = Boolean(filters.latitude || filters.longitude || filters.nearby_radius_km);
  const nearbyLabel = nearbyActive ? `ใกล้ฉัน ${filters.nearby_radius_km || "10"} กม.` : "ใกล้ฉัน";
  const allItems = useMemo(() => mergeItems(feedItems, shopItems), [feedItems, shopItems]);
  const myItems = useMemo(
    () => (user ? allItems.filter((i) => i.owner.id === user.id) : []),
    [allItems, user]
  );
  const discoveredPeople = useMemo(() => uniqueOwners(feedItems), [feedItems]);
  const followRailPeople = following.length ? following : discoveredPeople;
  const showTopbar =
    !selected &&
    !profileView &&
    (view === "feed" || view === "shop" || view === "following");
  const isFocusedSubpage = !selected && !profileView && FOCUSED_VIEWS.includes(view);
  const hideBottomNav = Boolean(selected) || Boolean(profileView) || HIDE_BOTTOM_NAV_VIEWS.includes(view);
  const guestPromptTitle = useMemo(() => {
    if (selected) return "ข้อเสนอแลกสินค้า";
    if (profileView) return "โปรไฟล์";
    if (view === "add") return editMode === "reswap" ? "แลกต่อสินค้า" : "ลงสินค้าใหม่";
    if (view === "inbox") return "ข้อเสนอ";
    if (view === "notifications") return "โนติฟิเคชัน";
    if (view === "saved") return "บันทึกไว้";
    if (view === "profile") return "โปรไฟล์";
    if (view === "profile_edit") return "แก้ไขโปรไฟล์";
    if (view === "chat") return "แชท";
    if (view === "wallet") return "เครดิต";
    return "QXwap";
  }, [editMode, profileView, selected, view]);
  const isShopView = view === "shop" || view === "following";
  const routeBoundaryKey = [
    view,
    inboxTab,
    feedPersonId,
    selected?.id || "",
    offerId || "",
    profileView?.id || "",
    editingItem?.id || "",
    campaignView?.id || "",
    filters.q || "",
    filters.wanted_tag || "",
    filters.category || "",
    filters.sort || "",
    String(dataVersion)
  ].join("|");
  const routeBoundaryContext = useMemo(
    () => ({
      view,
      pathname: typeof window !== "undefined" ? window.location.pathname : "/",
      search: typeof window !== "undefined" ? window.location.search : "",
      inboxTab,
      selectedId: selected?.id || null,
      offerId: offerId || null,
      profileId: profileView?.id || null,
      editingItemId: editingItem?.id || null,
      campaignId: campaignView?.id || null,
      userId: user?.id || null
    }),
    [campaignView?.id, editingItem?.id, inboxTab, offerId, profileView?.id, selected?.id, user?.id, view]
  );

  useEffect(() => {
    allItemsRef.current = allItems;
  }, [allItems]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== SESSION_SYNC_KEY || !event.newValue) return;
      try {
        const payload = JSON.parse(event.newValue) as { event?: string };
        if (payload.event === "signed-in" || payload.event === "signed-out" || payload.event === "account-deleted") {
          window.location.reload();
        }
      } catch {
        // ignore malformed sync payloads
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  async function fetchItemPage(path: "/feed" | "/items", query: Record<string, string>, signal?: AbortSignal) {
    const params = new URLSearchParams(query);
    const response = await fetch(`${API}${path}?${params.toString()}`, {
      credentials: "include",
      signal
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.message || "โหลดสินค้าไม่สำเร็จ");
    return json as ItemPageResponse;
  }

  async function loadMe() {
    const data = await api<{ user: User | null }>("/auth/me");
    setUser(data.user);
    writeCachedUser(data.user);
    return data.user;
  }

  async function loadSessionExtras(nextUser: User | null) {
    if (!nextUser) {
      setFollowing([]);
      setNoticeCount(0);
      return;
    }
    const [notifications, followsData] = await Promise.all([
      api<{ notifications: any[] }>("/notifications").catch(() => ({ notifications: [] })),
      api<{ follows: User[] }>("/follows").catch(() => ({ follows: [] }))
    ]);
    setNoticeCount(notifications.notifications.filter((n) => !n.read_at).length);
    setFollowing(followsData.follows || []);
  }

  function resetSessionState() {
    setUser(null);
    writeCachedUser(null);
    setFollowing([]);
    setNoticeCount(0);
    setSavedItems([]);
    setOfferItem(null);
  }

  function routeSnapshot(overrides: Partial<AppRouteState> = {}): AppRouteState {
    const nextView = overrides.view ?? view;
    const nextInboxTab = overrides.inboxTab ?? inboxTab;
    const nextEditMode = overrides.editMode ?? (nextView === "add" ? editMode : "edit");
    const nextFeedPersonId = overrides.feedPersonId ?? feedPersonId;
    const nextFilters = overrides.filters ?? filters;
    const nextSelectedItem = overrides.selectedItem !== undefined ? overrides.selectedItem : selected;
    const nextProfileUser = overrides.profileUser !== undefined ? overrides.profileUser : profileView;
    const nextEditingItem = overrides.editingItem !== undefined ? overrides.editingItem : editingItem;
    const nextCampaign = overrides.campaignData !== undefined ? overrides.campaignData : campaignView;
    return {
      app: "qxwap",
      view: nextView,
      inboxTab: nextInboxTab,
      editMode: nextEditMode,
      feedPersonId: nextFeedPersonId,
      filters: { ...emptyFilters, ...nextFilters },
      selectedId: overrides.selectedId !== undefined ? overrides.selectedId : nextSelectedItem?.id || null,
      offerId: overrides.offerId !== undefined ? overrides.offerId : offerId,
      profileId: overrides.profileId !== undefined ? overrides.profileId : nextProfileUser?.id || null,
      editingItemId: overrides.editingItemId !== undefined ? overrides.editingItemId : nextEditingItem?.id || null,
      campaignId: overrides.campaignId !== undefined ? overrides.campaignId : nextCampaign?.id || nextCampaign?.slug || null,
      selectedItem: nextSelectedItem || null,
      profileUser: nextProfileUser || null,
      editingItem: nextEditingItem || null,
      campaignData: nextCampaign || null
    };
  }

  function applyRouteLocally(route: AppRouteState) {
    setView(route.view === "wallet" ? "profile" : route.view);
    setInboxTab(route.inboxTab || "received");
    setEditMode(route.editMode || "edit");
    setFeedPersonId(route.feedPersonId || "");
    setFilters({ ...emptyFilters, ...route.filters });
    setSelected(route.selectedItem || null);
    setOfferId(route.offerId || null);
    setProfileView(route.profileUser || null);
    setEditingItem(route.editingItem || null);
    setCampaignView(route.campaignData || null);
  }

  function writeRoute(route: AppRouteState, mode: "push" | "replace" = "push") {
    const safeRoute = route.view === "wallet" ? { ...route, view: "profile" as View } : route;
    window.history[mode === "replace" ? "replaceState" : "pushState"](safeRoute, "", buildAppRouteUrl(safeRoute));
  }

  function navigateRoute(overrides: Partial<AppRouteState>, mode: "push" | "replace" = "push") {
    const shouldClearOfferId =
      overrides.offerId === undefined &&
      ((overrides.view !== undefined && overrides.view !== "offer_detail" && overrides.view !== "chat") ||
        overrides.selectedId !== undefined ||
        overrides.selectedItem !== undefined ||
        overrides.profileId !== undefined ||
        overrides.profileUser !== undefined ||
        overrides.editingItemId !== undefined ||
        overrides.editingItem !== undefined ||
        overrides.campaignId !== undefined ||
        overrides.campaignData !== undefined);
    const nextRoute = routeSnapshot(shouldClearOfferId ? { ...overrides, offerId: null } : overrides);
    applyRouteLocally(nextRoute);
    writeRoute(nextRoute, mode);
  }

  async function fetchItemById(itemId: string) {
    const data = await api<{ item: Item }>(`/items/${itemId}`);
    return data.item;
  }

  async function fetchProfileById(profileId: string) {
    if (userRef.current?.id === profileId) return userRef.current;
    const data = await api<{ profile: User }>(`/profiles/${profileId}`);
    return data.profile;
  }

  async function fetchCampaignById(campaignId: string) {
    const data = await api<{ campaign: Campaign }>(`/campaigns/${campaignId}`);
    return data.campaign;
  }

  async function restoreRoute(nextRoute: Partial<AppRouteState>, replaceHistory = true) {
    const token = ++routeRestoreRef.current;
    const baseRoute: AppRouteState = {
      app: "qxwap",
      view: nextRoute.view === "wallet" ? "profile" : (nextRoute.view || "feed"),
      inboxTab: nextRoute.inboxTab || "received",
      editMode: nextRoute.editMode || "edit",
      feedPersonId: nextRoute.feedPersonId || "",
      filters: { ...emptyFilters, ...(nextRoute.filters || {}) },
      selectedId: nextRoute.selectedId || null,
      offerId: nextRoute.offerId || null,
      profileId: nextRoute.profileId || null,
      editingItemId: nextRoute.editingItemId || null,
      campaignId: nextRoute.campaignId || null,
      selectedItem: nextRoute.selectedItem || null,
      profileUser: nextRoute.profileUser || null,
      editingItem: nextRoute.editingItem || null,
      campaignData: nextRoute.campaignData || null
    };

    if (baseRoute.editingItemId) {
      baseRoute.view = "add";
      baseRoute.offerId = null;
      baseRoute.selectedId = null;
      baseRoute.selectedItem = null;
      baseRoute.profileId = null;
      baseRoute.profileUser = null;
      baseRoute.campaignId = null;
      baseRoute.campaignData = null;
    } else if (baseRoute.profileId) {
      baseRoute.view = "profile";
      baseRoute.offerId = null;
      baseRoute.selectedId = null;
      baseRoute.selectedItem = null;
      baseRoute.editingItemId = null;
      baseRoute.editingItem = null;
      baseRoute.campaignId = null;
      baseRoute.campaignData = null;
    } else if (baseRoute.offerId && (baseRoute.view === "offer_detail" || baseRoute.view === "chat")) {
      baseRoute.selectedId = null;
      baseRoute.selectedItem = null;
      baseRoute.profileId = null;
      baseRoute.profileUser = null;
      baseRoute.editingItemId = null;
      baseRoute.editingItem = null;
      baseRoute.campaignId = null;
      baseRoute.campaignData = null;
    } else if (baseRoute.campaignId) {
      baseRoute.view = "campaign";
      baseRoute.offerId = null;
      baseRoute.selectedId = null;
      baseRoute.selectedItem = null;
      baseRoute.profileId = null;
      baseRoute.profileUser = null;
      baseRoute.editingItemId = null;
      baseRoute.editingItem = null;
    } else if (["profile_edit", "inbox", "notifications", "saved", "search", "filter", "sort"].includes(baseRoute.view)) {
      baseRoute.selectedId = null;
      baseRoute.selectedItem = null;
      baseRoute.offerId = null;
      baseRoute.profileId = null;
      baseRoute.profileUser = null;
      baseRoute.editingItemId = null;
      baseRoute.editingItem = null;
      baseRoute.campaignId = null;
      baseRoute.campaignData = null;
    } else if (baseRoute.view === "profile" && !baseRoute.profileId) {
      baseRoute.selectedId = null;
      baseRoute.selectedItem = null;
      baseRoute.offerId = null;
      baseRoute.editingItemId = null;
      baseRoute.editingItem = null;
      baseRoute.campaignId = null;
      baseRoute.campaignData = null;
    }

    try {
      if (baseRoute.editingItemId && !baseRoute.editingItem) {
        baseRoute.editingItem = await fetchItemById(baseRoute.editingItemId);
      }
      if (baseRoute.selectedId && !baseRoute.selectedItem) {
        baseRoute.selectedItem = await fetchItemById(baseRoute.selectedId);
      }
      if (baseRoute.profileId && !baseRoute.profileUser) {
        baseRoute.profileUser = await fetchProfileById(baseRoute.profileId);
      }
      if (baseRoute.campaignId && !baseRoute.campaignData) {
        baseRoute.campaignData = await fetchCampaignById(baseRoute.campaignId);
      }
    } catch (error: any) {
      if (!isIgnorableAbortError(error)) {
        setError(error.message || "เปิดหน้าที่ร้องขอไม่สำเร็จ");
      }
      baseRoute.selectedId = null;
      baseRoute.selectedItem = null;
      baseRoute.offerId = null;
      baseRoute.profileId = null;
      baseRoute.profileUser = null;
      baseRoute.editingItemId = null;
      baseRoute.editingItem = null;
      baseRoute.campaignId = null;
      baseRoute.campaignData = null;
    }

    if (token !== routeRestoreRef.current) return;
    applyRouteLocally(baseRoute);
    if (replaceHistory) writeRoute(baseRoute, "replace");
  }

  function openItemRoute(item: Item) {
    navigateRoute({
      selectedItem: item,
      selectedId: item.id,
      profileUser: null,
      profileId: null,
      editingItem: null,
      editingItemId: null,
      campaignData: null,
      campaignId: null
    });
  }

  async function openItemById(itemId: string, fallbackItem?: Item | null) {
    try {
      if (fallbackItem) openItemRoute(fallbackItem);
      const item = await fetchItemById(itemId);
      const current = window.history.state as AppRouteState | null;
      if (current?.app === "qxwap" && current.selectedId === itemId) {
        navigateRoute({ selectedItem: item, selectedId: item.id }, "replace");
        return;
      }
      openItemRoute(item);
    } catch (error: any) {
      if (!isIgnorableAbortError(error)) {
        setError(error.message || "เปิดรายละเอียดสินค้าไม่สำเร็จ");
      }
    }
  }

  function openProfileRoute(profile: User) {
    navigateRoute({
      view: "profile",
      profileUser: profile,
      profileId: profile.id,
      offerId: null,
      selectedItem: null,
      selectedId: null,
      editingItem: null,
      editingItemId: null,
      campaignData: null,
      campaignId: null
    });
  }

  function openEditRoute(item: Item, nextEditMode: "edit" | "reswap" = "edit") {
    navigateRoute({
      view: "add",
      editMode: nextEditMode,
      editingItem: item,
      editingItemId: item.id,
      selectedItem: null,
      selectedId: null,
      profileUser: null,
      profileId: null,
      campaignData: null,
      campaignId: null
    });
  }

  function goBackFromDetail() {
    const currentState = window.history.state as Partial<AppRouteState> | null;
    if (currentState?.app === "qxwap" && currentState.selectedId) {
      window.history.back();
      return;
    }
    navigateRoute({ selectedItem: null, selectedId: null }, "replace");
  }

  function goBackOrFallback(fallback: Partial<AppRouteState>) {
    const routeToken = routeRestoreRef.current;
    if (window.history.length > 1) {
      window.history.back();
      window.setTimeout(() => {
        if (routeRestoreRef.current === routeToken) {
          navigateRoute(fallback, "replace");
        }
      }, 180);
      return;
    }
    navigateRoute(fallback, "replace");
  }

  function openOfferDetail(nextOfferId: string, nextInboxTab: OfferTab = inboxTab) {
    navigateRoute({
      view: "offer_detail",
      inboxTab: nextInboxTab,
      offerId: nextOfferId,
      selectedItem: null,
      selectedId: null,
      profileUser: null,
      profileId: null,
      editingItem: null,
      editingItemId: null,
      campaignData: null,
      campaignId: null
    });
  }

  async function loadFeedPage(options?: { reset?: boolean; pageSize?: number }) {
    const reset = Boolean(options?.reset);
    const limit = options?.pageSize || (reset ? INITIAL_BATCH_SIZE : PAGE_CHUNK_SIZE);
    if (reset) {
      feedAbortRef.current?.abort();
      const controller = new AbortController();
      feedAbortRef.current = controller;
      setFeedLoading(true);
      setFeedError("");
      try {
        const data = await fetchItemPage(
          "/feed",
          {
            limit: String(limit),
            offset: "0",
            ...(feedPersonId ? { owner_id: feedPersonId } : {})
          },
          controller.signal
        );
        setFeedItems(data.items);
        setFeedHasMore(Boolean(data.page?.has_more));
        setFeedInitialized(true);
      } catch (error: any) {
        setFeedError(error.message || "โหลดสินค้าไม่สำเร็จ ลองใหม่อีกครั้ง");
        throw error;
      } finally {
        setFeedLoading(false);
      }
      return;
    }
    if (feedLoading || feedLoadingMore || !feedHasMore) return;
    setFeedLoadingMore(true);
    try {
      const data = await fetchItemPage("/feed", {
        limit: String(limit),
        offset: String(feedItems.length),
        ...(feedPersonId ? { owner_id: feedPersonId } : {})
      });
      setFeedItems((current) => [...current, ...data.items]);
      setFeedHasMore(Boolean(data.page?.has_more));
      setFeedError("");
    } catch (error: any) {
      setFeedError(error.message || "โหลดสินค้าเพิ่มไม่สำเร็จ");
      throw error;
    } finally {
      setFeedLoadingMore(false);
    }
  }

  async function loadShopPage(nextFilters: Filters = filters, options?: { reset?: boolean; pageSize?: number }) {
    const reset = Boolean(options?.reset);
    const limit = options?.pageSize || (reset ? INITIAL_BATCH_SIZE : PAGE_CHUNK_SIZE);
    const params = new URLSearchParams();
    Object.entries(nextFilters).forEach(([k, v]) => {
      if (v !== "" && v !== false) params.set(k, String(v));
    });
    params.set("limit", String(limit));

    if (reset) {
      shopAbortRef.current?.abort();
      const controller = new AbortController();
      shopAbortRef.current = controller;
      setShopLoading(true);
      setShopError("");
      try {
        params.set("offset", "0");
        const data = await fetchItemPage(
          "/items",
          Object.fromEntries(params.entries()),
          controller.signal
        );
        setShopItems(data.items);
        setShopHasMore(Boolean(data.page?.has_more));
        setShopInitialized(true);
      } catch (error: any) {
        setShopError(error.message || "โหลดสินค้าไม่สำเร็จ");
        throw error;
      } finally {
        setShopLoading(false);
      }
      return;
    }

    if (shopLoading || shopLoadingMore || !shopHasMore) return;
    setShopLoadingMore(true);
    try {
      params.set("offset", String(shopItems.length));
      const data = await fetchItemPage("/items", Object.fromEntries(params.entries()));
      setShopItems((current) => [...current, ...data.items]);
      setShopHasMore(Boolean(data.page?.has_more));
      setShopError("");
    } finally {
      setShopLoadingMore(false);
    }
  }

  useEffect(() => {
    let live = true;
    const splashTimer = window.setTimeout(() => {
      if (live) setSplashVisible(false);
    }, SPLASH_MIN_MS);
    void api<{ banners: Banner[] }>("/banners")
      .then((data) => live && setBanners(data.banners || []))
      .catch(() => live && setBanners([]));
    void loadFeedPage({ reset: true }).catch(() => undefined);
    void loadMe()
      .then((me) => {
        if (!live) return;
        setAuthChecking(false);
        if (me) {
          void loadSessionExtras(me).catch(() => undefined);
        }
      })
      .catch((error) => {
        if (!live || isIgnorableAbortError(error)) return;
        resetSessionState();
      })
      .finally(() => live && setAuthChecking(false));
    return () => {
      live = false;
      window.clearTimeout(splashTimer);
      feedAbortRef.current?.abort();
      shopAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [view, inboxTab, selected?.id, profileView?.id, editingItem?.id, campaignView?.id, offerId, feedPersonId, JSON.stringify(filters)]);

  useEffect(() => {
    if (!user || view !== "saved") return;
    setSavedLoading(true);
    setSavedError("");
    api<{ items: Item[] }>("/bookmarks?limit=40")
      .then((data) => setSavedItems(data.items))
      .catch((e: Error) => setSavedError(e.message))
      .finally(() => setSavedLoading(false));
  }, [user, view, dataVersion]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    function syncFromLocation(stateRoute?: AppRouteState | null) {
      const nextAuthRoute = resolveAuthRoute();
      if (nextAuthRoute) {
        setAuthMode(nextAuthRoute.mode);
        setAuthPrompt(nextAuthRoute.message);
        setAuthOpen(true);
        return;
      }
      setAuthOpen(false);
      const locationRoute = parseAppRouteFromLocation();
      void restoreRoute(stateRoute || locationRoute, true);
    }
    function handleHashChange() {
      syncFromLocation(null);
    }
    function handlePopState(event: PopStateEvent) {
      syncFromLocation(event.state?.app === "qxwap" ? (event.state as AppRouteState) : null);
    }
    const initialAuthRoute = resolveAuthRoute();
    if (!initialAuthRoute && window.history.state?.app !== "qxwap") {
      const parsed = parseAppRouteFromLocation();
      if (parsed.selectedId || parsed.profileId || parsed.editingItemId || parsed.view !== "feed" || parsed.feedPersonId || parsed.filters) {
        void restoreRoute(parsed, true);
      } else {
        writeRoute(routeSnapshot(), "replace");
      }
    } else {
      syncFromLocation(window.history.state?.app === "qxwap" ? (window.history.state as AppRouteState) : null);
    }
    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handlePopState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (skipFirstFeedPersonEffect.current) {
      skipFirstFeedPersonEffect.current = false;
      return;
    }
    void loadFeedPage({ reset: true }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedPersonId]);

  useEffect(() => {
    if (!isShopView && !shopInitialized) return;
    const queryKey = JSON.stringify(filters);
    if (!isShopView && queryKey === shopQueryKeyRef.current) return;
    shopQueryKeyRef.current = queryKey;
    const t = window.setTimeout(
      () => void loadShopPage(filters, { reset: true }).catch(() => undefined),
      200
    );
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, isShopView, view]);

  useEffect(() => {
    if (view !== "feed" || !feedInitialized || feedLoading || feedLoadingMore || !feedHasMore || feedItems.length >= PREFILL_TARGET) {
      return;
    }
    const timer = window.setTimeout(
      () => void loadFeedPage({ pageSize: PAGE_CHUNK_SIZE }).catch(() => undefined),
      120
    );
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, feedInitialized, feedLoading, feedLoadingMore, feedHasMore, feedItems.length]);

  useEffect(() => {
    if (!isShopView || !shopInitialized || shopLoading || shopLoadingMore || !shopHasMore || shopItems.length >= PREFILL_TARGET) {
      return;
    }
    const timer = window.setTimeout(
      () => void loadShopPage(filters, { pageSize: PAGE_CHUNK_SIZE }).catch(() => undefined),
      120
    );
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isShopView, view, shopInitialized, shopLoading, shopLoadingMore, shopHasMore, shopItems.length]);

  async function reloadVisibleData() {
    const tasks: Promise<unknown>[] = [loadSessionExtras(user).catch(() => undefined)];
    if (isShopView) tasks.push(loadShopPage(filters, { reset: true }));
    else if (view === "saved" && user) {
      tasks.push(
        api<{ items: Item[] }>("/bookmarks?limit=40")
          .then((data) => setSavedItems(data.items))
          .catch(() => undefined)
      );
    } else tasks.push(loadFeedPage({ reset: true }));
    await Promise.all(tasks);
    setDataVersion((current) => current + 1);
  }

  async function afterAuth(nextUser: User) {
    setUser(nextUser);
    writeCachedUser(nextUser);
    broadcastSessionSync("signed-in", nextUser.id);
    setAuthOpen(false);
    setAuthMode("signin");
    setAuthPrompt(qxwapDesignSystem.copy.loginRequired);
    if (resolveAuthRoute()) {
      writeRoute(routeSnapshot(), "replace");
    }
    void loadSessionExtras(nextUser).catch(() => undefined);
    if (isShopView) {
      void loadShopPage(filters, { reset: true }).catch(() => undefined);
    } else if (view === "saved") {
      void api<{ items: Item[] }>("/bookmarks?limit=40")
        .then((data) => setSavedItems(data.items))
        .catch(() => undefined);
    } else {
      void loadFeedPage({ reset: true }).catch(() => undefined);
    }
    if (selected?.id) {
      void fetchItemById(selected.id)
        .then((item) => setSelected(item))
        .catch((e) => !isIgnorableAbortError(e) && setError(e.message));
    }
  }

  async function afterAccountDeleted() {
    resetSessionState();
    broadcastSessionSync("account-deleted");
    setAuthOpen(false);
    navigateRoute({
      view: "feed",
      inboxTab: "received",
      feedPersonId: "",
      filters: { ...emptyFilters },
      profileUser: null,
      profileId: null,
      selectedItem: null,
      selectedId: null,
      editingItem: null,
      editingItemId: null,
      campaignData: null,
      campaignId: null
    }, "replace");
    await loadFeedPage({ reset: true });
  }

  async function signOut() {
    await api("/auth/signout", { method: "POST" });
    resetSessionState();
    broadcastSessionSync("signed-out");
    setAuthOpen(false);
    setAuthMode("signin");
    clearAuthRoute();
    navigateRoute({
      view: "feed",
      inboxTab: "received",
      feedPersonId: "",
      filters: { ...emptyFilters },
      profileUser: null,
      profileId: null,
      selectedItem: null,
      selectedId: null,
      editingItem: null,
      editingItemId: null,
      campaignData: null,
      campaignId: null
    }, "replace");
    await loadFeedPage({ reset: true });
  }

  function requireLogin(message: string = qxwapDesignSystem.copy.loginRequired) {
    setAuthMode("signin");
    setAuthPrompt(message);
    setAuthOpen(true);
  }

  function closeAuth() {
    setAuthOpen(false);
    setAuthMode("signin");
    if (resolveAuthRoute()) {
      writeRoute(routeSnapshot(), "replace");
    }
  }

  async function saveToggle(item: Item) {
    if (!user) return requireLogin("กรุณาเข้าสู่ระบบก่อนเพื่อบันทึกรายการ");
    if (item.viewer.is_bookmarked) await api(`/bookmarks/${item.id}`, { method: "DELETE" });
    else await api("/bookmarks", { method: "POST", body: JSON.stringify({ item_id: item.id }) });
    await reloadVisibleData();
  }

  async function removeItem(item: Item) {
    if (!window.confirm(`ลบรายการ "${item.title}" ถาวร?`)) return;
    await api(`/items/${item.id}`, { method: "DELETE" });
    navigateRoute({ selectedItem: null, selectedId: null }, "replace");
    await reloadVisibleData();
  }

  function wantedTag(tag: string) {
    navigateRoute({
      view: "shop",
      filters: { ...emptyFilters, wanted_tag: tag },
      selectedItem: null,
      selectedId: null,
      editingItem: null,
      editingItemId: null,
      profileUser: null,
      profileId: null,
      campaignData: null,
      campaignId: null
    });
  }

  function openProductListTarget(targetValue: string) {
    const nextFilters = { ...emptyFilters };
    if (targetValue.startsWith("tag:")) nextFilters.wanted_tag = targetValue.slice(4);
    else if (targetValue.startsWith("category:")) nextFilters.category = targetValue.slice(9);
    else if (targetValue.startsWith("location:")) nextFilters.location_label = targetValue.slice(9);
    else nextFilters.q = targetValue;
    navigateRoute({
      view: "shop",
      filters: nextFilters,
      selectedItem: null,
      selectedId: null,
      profileUser: null,
      profileId: null,
      editingItem: null,
      editingItemId: null,
      campaignData: null,
      campaignId: null
    });
  }

  function openSearchPage() {
    navigateRoute({
      view: "search",
      selectedItem: null,
      selectedId: null,
      profileUser: null,
      profileId: null,
      editingItem: null,
      editingItemId: null,
      campaignData: null,
      campaignId: null
    });
  }

  function openFilterPage() {
    navigateRoute({
      view: "filter",
      selectedItem: null,
      selectedId: null,
      profileUser: null,
      profileId: null,
      editingItem: null,
      editingItemId: null,
      campaignData: null,
      campaignId: null
    });
  }

  function openSortPage() {
    navigateRoute({
      view: "sort",
      selectedItem: null,
      selectedId: null,
      profileUser: null,
      profileId: null,
      editingItem: null,
      editingItemId: null,
      campaignData: null,
      campaignId: null
    });
  }

  function clearActiveFilters() {
    navigateRoute({
      view: "shop",
      filters: {
        ...emptyFilters,
        sort: filters.sort || "newest"
      },
      selectedItem: null,
      selectedId: null,
      profileUser: null,
      profileId: null,
      editingItem: null,
      editingItemId: null,
      campaignData: null,
      campaignId: null
    });
  }

  function openFollowingView() {
    navigateRoute({
      view: "following",
      filters: { ...emptyFilters, following: true, sort: "newest" },
      selectedItem: null,
      selectedId: null,
      profileUser: null,
      profileId: null,
      editingItem: null,
      editingItemId: null,
      campaignData: null,
      campaignId: null
    });
  }

  function openOfferChat(offerIdToOpen: string, nextInboxTab: OfferTab = inboxTab) {
    navigateRoute({
      view: "chat",
      inboxTab: nextInboxTab,
      offerId: offerIdToOpen,
      selectedItem: null,
      selectedId: null,
      profileUser: null,
      profileId: null,
      editingItem: null,
      editingItemId: null,
      campaignData: null,
      campaignId: null
    });
  }

  function showNearbyItems() {
    if (nearbyActive) {
      navigateRoute({
        view: "shop",
        filters: {
          ...filters,
          latitude: "",
          longitude: "",
          nearby_radius_km: "",
          sort: filters.sort === "nearby" ? "newest" : filters.sort
        },
        selectedItem: null,
        selectedId: null,
        profileUser: null,
        profileId: null,
        editingItem: null,
        editingItemId: null,
        campaignData: null,
        campaignId: null
      });
      return;
    }
    if (!navigator.geolocation) {
      setError("อุปกรณ์นี้ไม่รองรับการอ่านตำแหน่ง");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        navigateRoute({
          view: "shop",
          filters: {
            ...filters,
            latitude: String(position.coords.latitude),
            longitude: String(position.coords.longitude),
            nearby_radius_km: filters.nearby_radius_km || "10"
          },
          selectedItem: null,
          selectedId: null,
          profileUser: null,
          profileId: null,
          editingItem: null,
          editingItemId: null,
          campaignData: null,
          campaignId: null
        });
      },
      () => setError("ไม่สามารถอ่านตำแหน่งปัจจุบันได้"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function openCampaign(campaign: Campaign) {
    setCampaignError("");
    setCampaignLoading(false);
    navigateRoute({
      view: "campaign",
      campaignData: campaign,
      campaignId: campaign.id || campaign.slug,
      selectedItem: null,
      selectedId: null,
      profileUser: null,
      profileId: null,
      editingItem: null,
      editingItemId: null
    });
  }

  function openCampaignById(campaignId: string) {
    setCampaignError("");
    setCampaignLoading(true);
    navigateRoute({
      view: "campaign",
      campaignData: null,
      campaignId,
      selectedItem: null,
      selectedId: null,
      profileUser: null,
      profileId: null,
      editingItem: null,
      editingItemId: null
    });
    void fetchCampaignById(campaignId)
      .then((campaign) => openCampaign(campaign))
      .catch((error: Error) => setCampaignError(error.message))
      .finally(() => setCampaignLoading(false));
  }

  function openBannerTarget(banner: Banner) {
    if (banner.target_type === "product_detail" && banner.target_value) {
      void openItemById(banner.target_value);
      return;
    }
    if (banner.target_type === "campaign_detail") {
      const nextId = banner.campaign_id || banner.target_value;
      if (!nextId) return;
      openCampaignById(nextId);
      return;
    }
    openProductListTarget(banner.target_value || "");
  }

  function runCampaignNext(campaign: Campaign) {
    if (campaign.cta_target_type === "product_detail" && campaign.cta_target_value) {
      void openItemById(campaign.cta_target_value);
      return;
    }
    if (campaign.cta_target_type === "campaign_detail" && campaign.cta_target_value) {
      openCampaignById(campaign.cta_target_value);
      return;
    }
    openProductListTarget(campaign.cta_target_value || "");
  }

  function changeView(next: View) {
    navigateRoute({
      view: next,
      inboxTab: next === "inbox" ? "received" : inboxTab,
      selectedItem: null,
      selectedId: null,
      editingItem: null,
      editingItemId: null,
      profileUser: null,
      profileId: null,
      campaignData: null,
      campaignId: null
    });
  }

  if (splashVisible) {
    return (
      <div className="app-shell app-shell-splash">
        <SplashScreen message={getSplashMessage()} />
      </div>
    );
  }

  return (
    <div className={`app-shell${isFocusedSubpage ? " app-shell--focused" : ""}${showTopbar ? " app-shell--with-topbar" : ""}`}>
      {showTopbar ? (
        <Topbar
          view={view}
          noticeCount={noticeCount}
          onHome={() => {
            navigateRoute({
              view: "feed",
              selectedItem: null,
              selectedId: null,
              profileUser: null,
              profileId: null,
              editingItem: null,
              editingItemId: null,
              campaignData: null,
              campaignId: null
            });
          }}
          onSearch={openSearchPage}
          onSaved={() => {
            if (!user) return requireLogin("กรุณาเข้าสู่ระบบก่อนเพื่อดูรายการที่บันทึกไว้");
            navigateRoute({
              view: "saved",
              selectedItem: null,
              selectedId: null,
              profileUser: null,
              profileId: null,
              editingItem: null,
              editingItemId: null,
              campaignData: null,
              campaignId: null
            });
          }}
          onNotifications={() => {
            navigateRoute({
              view: "notifications",
              selectedItem: null,
              selectedId: null,
              profileUser: null,
              profileId: null,
              editingItem: null,
              editingItemId: null,
              campaignData: null,
              campaignId: null
            });
          }}
        />
      ) : null}

      {!isOnline ? (
        <div className="status-banner" role="status">
          ออฟไลน์อยู่ บางข้อมูลอาจยังไม่อัปเดตจนกว่าจะเชื่อมต่ออีกครั้ง
        </div>
      ) : null}

      <main>
        {error ? (
          <div className="toast" onClick={() => setError("")}>
            {error}
          </div>
        ) : null}
        <AppShellErrorBoundary
          resetKey={routeBoundaryKey}
          routeContext={routeBoundaryContext}
          onGoHome={() => {
            changeView("feed");
          }}
        >
        {profileView ? (
          <Suspense fallback={<RouteLoading message="กำลังโหลดโปรไฟล์..." />}>
            <Profile
              key={`profile-view-${profileView.id}`}
              user={user}
              viewedUser={profileView}
              requireLogin={requireLogin}
              onAuth={afterAuth}
              onSignOut={signOut}
              onReload={reloadVisibleData}
              refreshKey={dataVersion}
              openItem={(item) => void openItemById(item.id, item)}
              openInbox={(tab = "received") => {
                navigateRoute({
                  view: "inbox",
                  inboxTab: tab,
                  profileUser: null,
                  profileId: null,
                  selectedItem: null,
                  selectedId: null,
                  editingItem: null,
                  editingItemId: null,
                  campaignData: null,
                  campaignId: null
                });
              }}
              openFollowing={openFollowingView}
              openSaved={() =>
                navigateRoute({
                  view: "saved",
                  selectedItem: null,
                  selectedId: null,
                  profileUser: null,
                  profileId: null,
                  editingItem: null,
                  editingItemId: null,
                  campaignData: null,
                  campaignId: null
                })
              }
              openProfileEdit={() =>
                navigateRoute({
                  view: "profile_edit",
                  selectedItem: null,
                  selectedId: null,
                  profileUser: null,
                  profileId: null,
                  editingItem: null,
                  editingItemId: null,
                  campaignData: null,
                  campaignId: null
                })
              }
              openNotifications={() =>
                navigateRoute({
                  view: "notifications",
                  selectedItem: null,
                  selectedId: null,
                  profileUser: null,
                  profileId: null,
                  editingItem: null,
                  editingItemId: null,
                  campaignData: null,
                  campaignId: null
                })
              }
              onBack={() =>
                goBackOrFallback({
                  view: "profile",
                  selectedItem: null,
                  selectedId: null,
                  profileUser: null,
                  profileId: null,
                  editingItem: null,
                  editingItemId: null,
                  campaignData: null,
                  campaignId: null
                })
              }
            />
          </Suspense>
        ) : null}
        {!profileView && selected ? (
          <Suspense fallback={<RouteLoading message="กำลังโหลดรายละเอียดสินค้า..." />}>
            <Detail
              key={`detail-${selected.id}`}
              item={selected}
              user={user}
              onBack={goBackFromDetail}
              onOffer={setOfferItem}
              onSave={saveToggle}
              onEdit={openEditRoute}
              onDelete={removeItem}
              onTag={wantedTag}
              onOpenOwner={(owner) =>
                openProfileRoute({
                  id: owner.id,
                  email: "",
                  display_name: owner.name,
                  avatar_url: owner.avatar_url
                })
              }
              onOpenRelated={openItemRoute}
              openOfferDetail={openOfferDetail}
              openChat={openOfferChat}
              requireLogin={requireLogin}
              related={allItems
                .filter(
                  (i) =>
                    i.id !== selected.id &&
                    (i.category === selected.category ||
                      i.wanted.tags.some((t) => selected.wanted.tags.includes(t)))
                )
                .slice(0, 4)}
            />
          </Suspense>
        ) : null}
        {!profileView && !selected && view === "offer_detail" && offerId ? (
          <Suspense fallback={<RouteLoading message="กำลังโหลดข้อเสนอ..." />}>
            <OfferDetailPage
              key={`offer-${offerId}`}
              offerId={offerId}
              user={user}
              requireLogin={requireLogin}
              onBack={() =>
                goBackOrFallback({
                  view: "inbox",
                  inboxTab,
                  selectedItem: null,
                  selectedId: null,
                  profileUser: null,
                  profileId: null,
                  editingItem: null,
                  editingItemId: null,
                  campaignData: null,
                  campaignId: null
                })
              }
              openItemById={openItemById}
              onTradeOnward={(item) => openEditRoute(item, "reswap")}
              openProfile={openProfileRoute}
              openChat={openOfferChat}
              onOpenInbox={(tab = "received") =>
                navigateRoute({
                  view: "inbox",
                  inboxTab: tab,
                  selectedItem: null,
                  selectedId: null,
                  profileUser: null,
                  profileId: null,
                  editingItem: null,
                  editingItemId: null,
                  campaignData: null,
                  campaignId: null
                })
              }
            />
          </Suspense>
        ) : null}
        {!profileView && !selected && view === "chat" && offerId ? (
          <Suspense fallback={<RouteLoading message="กำลังโหลดแชท..." />}>
            <ChatPage
              key={`chat-${offerId}`}
              offerId={offerId}
              user={user}
              requireLogin={requireLogin}
              onBack={() =>
                navigateRoute({
                  view: "offer_detail",
                  offerId,
                  selectedItem: null,
                  selectedId: null,
                  profileUser: null,
                  profileId: null,
                  editingItem: null,
                  editingItemId: null,
                  campaignData: null,
                  campaignId: null
                }, "replace")
              }
            />
          </Suspense>
        ) : null}
        {!profileView && !selected && view === "campaign" ? (
          <Suspense fallback={<RouteLoading message="กำลังโหลดแคมเปญ..." />}>
            <CampaignDetailPage
              campaign={campaignView}
              loading={campaignLoading}
              error={campaignError}
              onBack={() =>
                goBackOrFallback({
                  view: "feed",
                  selectedItem: null,
                  selectedId: null,
                  profileUser: null,
                  profileId: null,
                  editingItem: null,
                  editingItemId: null,
                  campaignData: null,
                  campaignId: null
                })
              }
              onNext={() => campaignView && runCampaignNext(campaignView)}
            />
          </Suspense>
        ) : null}
        {!profileView && !selected && view === "feed" ? (
          feedLoading && !feedInitialized ? <FeedSkeleton cards={INITIAL_BATCH_SIZE} /> : (
            <AiFeed
              items={feedItems}
              people={followRailPeople}
              selectedPersonId={feedPersonId}
              followingIds={following.map((p) => p.id)}
              onCategory={(category) =>
                navigateRoute({
                  view: "shop",
                  filters: { ...emptyFilters, category, sort: "newest" },
                  selectedItem: null,
                  selectedId: null,
                  profileUser: null,
                  profileId: null,
                  editingItem: null,
                  editingItemId: null,
                  campaignData: null,
                  campaignId: null
                })
              }
              onOpen={(item) => void openItemById(item.id, item)}
              onSave={saveToggle}
              onTag={wantedTag}
              onBannerOpen={openBannerTarget}
              openProfile={openProfileRoute}
              banners={banners}
              error={feedError}
              loading={feedLoading && !feedInitialized}
              loadingMore={feedLoadingMore}
              hasMore={feedHasMore}
              onRetry={() =>
                void loadFeedPage({ reset: true }).catch(() => undefined)
              }
              onLoadMore={() =>
                void loadFeedPage({ pageSize: PAGE_CHUNK_SIZE }).catch(() => undefined)
              }
            />
          )
        ) : null}
        {!profileView && !selected && isShopView ? (
          shopLoading && !shopInitialized ? <ShopSkeleton cards={INITIAL_BATCH_SIZE} /> : (
            <Suspense fallback={<RouteLoading message="กำลังโหลดร้านค้า..." />}>
              <ShopPage
                items={shopItems}
                filters={filters}
                activeFilterCount={activeFilterCount}
                canClearFilters={canClearShopFilters}
                canResetResults={canResetShopResults}
                sortActive={sortActive}
                sortLabel={sortLabel}
                nearbyActive={nearbyActive}
                nearbyLabel={nearbyLabel}
                openSort={openSortPage}
                showNearby={showNearbyItems}
                openFilters={openFilterPage}
                clearFilters={clearActiveFilters}
                error={shopError}
                onCategoryChange={(category) =>
                  navigateRoute({
                    view,
                    filters: { ...filters, category },
                    selectedItem: null,
                    selectedId: null,
                    profileUser: null,
                    profileId: null,
                    editingItem: null,
                    editingItemId: null,
                    campaignData: null,
                    campaignId: null
                  }, "replace")
                }
                onOpen={(item) => void openItemById(item.id, item)}
                onSave={saveToggle}
                onTag={wantedTag}
                loading={shopLoading && !shopInitialized}
                loadingMore={shopLoadingMore}
                hasMore={shopHasMore}
                onRetry={() =>
                  void loadShopPage(filters, { reset: true }).catch(() => undefined)
                }
                onLoadMore={() =>
                  void loadShopPage(filters, { pageSize: PAGE_CHUNK_SIZE }).catch(() => undefined)
                }
              />
            </Suspense>
          )
        ) : null}
        {!profileView && !selected && view === "add" ? (
          <Suspense fallback={<RouteLoading message="กำลังโหลดฟอร์มสินค้า..." />}>
            <AddProduct
              onDone={(item: Item) => {
                const ownerProfile = userRef.current;
                if (ownerProfile) {
                  const profileRoute = routeSnapshot({
                    view: "profile",
                    profileUser: ownerProfile,
                    profileId: ownerProfile.id,
                    editingItem: null,
                    editingItemId: null,
                    selectedItem: null,
                    selectedId: null
                  });
                  applyRouteLocally(profileRoute);
                  writeRoute(profileRoute, "replace");
                  const detailRoute = { ...profileRoute, selectedItem: item, selectedId: item.id };
                  applyRouteLocally(detailRoute);
                  writeRoute(detailRoute, "push");
                } else {
                  navigateRoute({
                    view: "feed",
                    editingItem: null,
                    editingItemId: null,
                    selectedItem: item,
                    selectedId: item.id,
                    profileUser: null,
                    profileId: null
                  }, "replace");
                }
                void reloadVisibleData().catch((e) => !isIgnorableAbortError(e) && setError(e.message));
              }}
              onBack={() =>
                goBackOrFallback({
                  view: "feed",
                  selectedItem: null,
                  selectedId: null,
                  profileUser: null,
                  profileId: null,
                  editingItem: null,
                  editingItemId: null,
                  campaignData: null,
                  campaignId: null
                })
              }
              user={user}
              requireLogin={requireLogin}
              editingItem={editingItem}
              editMode={editMode}
            />
          </Suspense>
        ) : null}
        {!profileView && !selected && view === "inbox" ? (
          <Suspense fallback={<RouteLoading message="กำลังโหลดข้อเสนอ..." />}>
            <OffersPage
              user={user}
              requireLogin={requireLogin}
              items={allItems}
              openItemById={openItemById}
              openProfile={openProfileRoute}
              openOfferDetail={openOfferDetail}
              openChat={openOfferChat}
              initialTab={inboxTab}
              onBack={() =>
                goBackOrFallback({
                  view: "feed",
                  selectedItem: null,
                  selectedId: null,
                  profileUser: null,
                  profileId: null,
                  editingItem: null,
                  editingItemId: null,
                  campaignData: null,
                  campaignId: null
                })
              }
            />
          </Suspense>
        ) : null}
        {!profileView && !selected && view === "notifications" ? (
          <Suspense fallback={<RouteLoading message="กำลังโหลดโนติฟิเคชัน..." />}>
            <NotificationsPage
              user={user}
              requireLogin={requireLogin}
              openOfferDetail={openOfferDetail}
              onUnreadCountChange={setNoticeCount}
              onBack={() =>
                goBackOrFallback({
                  view: "feed",
                  selectedItem: null,
                  selectedId: null,
                  profileUser: null,
                  profileId: null,
                  editingItem: null,
                  editingItemId: null,
                  campaignData: null,
                  campaignId: null
                })
              }
            />
          </Suspense>
        ) : null}
        {!profileView && !selected && view === "profile" ? (
          <Suspense fallback={<RouteLoading message="กำลังโหลดหน้าบัญชี..." />}>
            <Profile
              key={`profile-own-${user?.id || "guest"}`}
              user={user}
              requireLogin={requireLogin}
              onAuth={afterAuth}
              onSignOut={signOut}
              onReload={reloadVisibleData}
              refreshKey={dataVersion}
              openItem={(item) => void openItemById(item.id, item)}
              openInbox={(tab = "received") => {
                navigateRoute({
                  view: "inbox",
                  inboxTab: tab,
                  selectedItem: null,
                  selectedId: null,
                  profileUser: null,
                  profileId: null,
                  editingItem: null,
                  editingItemId: null,
                  campaignData: null,
                  campaignId: null
                });
              }}
              openFollowing={openFollowingView}
              openSaved={() =>
                navigateRoute({
                  view: "saved",
                  selectedItem: null,
                  selectedId: null,
                  profileUser: null,
                  profileId: null,
                  editingItem: null,
                  editingItemId: null,
                  campaignData: null,
                  campaignId: null
                })
              }
              openProfileEdit={() =>
                navigateRoute({
                  view: "profile_edit",
                  selectedItem: null,
                  selectedId: null,
                  profileUser: null,
                  profileId: null,
                  editingItem: null,
                  editingItemId: null,
                  campaignData: null,
                  campaignId: null
                })
              }
              openNotifications={() =>
                navigateRoute({
                  view: "notifications",
                  selectedItem: null,
                  selectedId: null,
                  profileUser: null,
                  profileId: null,
                  editingItem: null,
                  editingItemId: null,
                  campaignData: null,
                  campaignId: null
                })
              }
            />
          </Suspense>
        ) : null}
        {!profileView && !selected && view === "profile_edit" ? (
          <Suspense fallback={<RouteLoading message="กำลังโหลดฟอร์มโปรไฟล์..." />}>
            <ProfileEditPage
              key={`profile-edit-${user?.id || "guest"}`}
              user={user}
              requireLogin={requireLogin}
              onBack={() =>
                goBackOrFallback({
                  view: "profile",
                  selectedItem: null,
                  selectedId: null,
                  profileUser: null,
                  profileId: null,
                  editingItem: null,
                  editingItemId: null,
                  campaignData: null,
                  campaignId: null
                })
              }
              onSaved={afterAuth}
            />
          </Suspense>
        ) : null}
        {!profileView && !selected && view === "saved" ? (
          <Suspense fallback={<RouteLoading message="กำลังโหลดรายการที่บันทึก..." />}>
            <SavedPage
              user={user}
              requireLogin={requireLogin}
              items={savedItems}
              loading={savedLoading}
              error={savedError}
              onBack={() =>
                goBackOrFallback({
                  view: "profile",
                  selectedItem: null,
                  selectedId: null,
                  profileUser: null,
                  profileId: null,
                  editingItem: null,
                  editingItemId: null,
                  campaignData: null,
                  campaignId: null
                })
              }
              onOpenItem={(item) => void openItemById(item.id, item)}
            />
          </Suspense>
        ) : null}
        {!profileView && !selected && view === "search" ? (
          <Suspense fallback={<RouteLoading message="กำลังโหลดหน้าค้นหา..." />}>
            <SearchSheet
              onBack={() =>
                goBackOrFallback({
                  view: "shop",
                  selectedItem: null,
                  selectedId: null,
                  profileUser: null,
                  profileId: null,
                  editingItem: null,
                  editingItemId: null,
                  campaignData: null,
                  campaignId: null
                })
              }
              openProfile={(p) => {
                openProfileRoute(p);
              }}
              openItemById={(itemId, fallbackItem) => void openItemById(itemId, fallbackItem || null)}
              searchProducts={(q) => {
                const trimmed = q.trim();
                if (trimmed.startsWith("#")) {
                  wantedTag(trimmed.replace(/^#+/, ""));
                  return;
                }
                navigateRoute({
                  view: "shop",
                  filters: { ...emptyFilters, q: trimmed, wanted_tag: "" },
                  selectedItem: null,
                  selectedId: null,
                  profileUser: null,
                  profileId: null,
                  editingItem: null,
                  editingItemId: null,
                  campaignData: null,
                  campaignId: null
                });
              }}
              searchHashtag={(tag) => {
                wantedTag(tag);
              }}
            />
          </Suspense>
        ) : null}
        {!profileView && !selected && view === "filter" ? (
          <Suspense fallback={<RouteLoading message="กำลังโหลดตัวกรอง..." />}>
            <FilterSheet
              filters={filters}
              onApply={(nextFilters) =>
                navigateRoute({
                  view: "shop",
                  filters: nextFilters,
                  selectedItem: null,
                  selectedId: null,
                  profileUser: null,
                  profileId: null,
                  editingItem: null,
                  editingItemId: null,
                  campaignData: null,
                  campaignId: null
                })
              }
              onBack={() =>
                goBackOrFallback({
                  view: "shop",
                  selectedItem: null,
                  selectedId: null,
                  profileUser: null,
                  profileId: null,
                  editingItem: null,
                  editingItemId: null,
                  campaignData: null,
                  campaignId: null
                })
              }
            />
          </Suspense>
        ) : null}
        {!profileView && !selected && view === "sort" ? (
          <Suspense fallback={<RouteLoading message="กำลังโหลดการเรียงลำดับ..." />}>
            <FilterSheet
              filters={filters}
              onApply={(nextFilters) =>
                navigateRoute({
                  view: "shop",
                  filters: nextFilters,
                  selectedItem: null,
                  selectedId: null,
                  profileUser: null,
                  profileId: null,
                  editingItem: null,
                  editingItemId: null,
                  campaignData: null,
                  campaignId: null
                })
              }
              onBack={() =>
                goBackOrFallback({
                  view: "shop",
                  selectedItem: null,
                  selectedId: null,
                  profileUser: null,
                  profileId: null,
                  editingItem: null,
                  editingItemId: null,
                  campaignData: null,
                  campaignId: null
                })
              }
              title="เรียงลำดับ"
              mode="sort"
            />
          </Suspense>
        ) : null}
        </AppShellErrorBoundary>
      </main>

      {!hideBottomNav ? <BottomNav view={view} hasProfileView={Boolean(profileView)} onChange={changeView} /> : null}
      {!user && !authOpen ? <AuthNudge requireLogin={requireLogin} title={guestPromptTitle} withBottomNav={!hideBottomNav} /> : null}
      {offerItem ? (
        <Suspense fallback={null}>
          <OfferSheet
            item={offerItem}
            user={user}
            myItems={myItems}
            close={() => setOfferItem(null)}
            requireLogin={requireLogin}
            openInbox={(tab) => {
              setOfferItem(null);
              navigateRoute({
                view: "inbox",
                inboxTab: tab || "received",
                selectedItem: null,
                selectedId: null,
                profileUser: null,
                profileId: null,
                editingItem: null,
                editingItemId: null
              });
            }}
            openOfferDetail={(offerId) => {
              setOfferItem(null);
              openOfferDetail(offerId, "sent");
            }}
          />
        </Suspense>
      ) : null}
      {authOpen ? (
        <Suspense fallback={null}>
          <AuthModal close={closeAuth} onAuth={afterAuth} message={authPrompt} initialMode={authMode} />
        </Suspense>
      ) : null}
    </div>
  );
}
