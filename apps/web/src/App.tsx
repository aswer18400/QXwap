import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { qxwapDesignSystem } from "./design-system";
import { emptyFilters } from "./lib/constants";
import type { Filters } from "./lib/constants";
import { mergeItems, uniqueOwners } from "./lib/format";
import type { Banner, Campaign, Item, NotificationEntry, OfferTab, Transaction, User, View, WantedItem } from "./lib/types";
import { AppLayout } from "./components/AppLayout";
import { AppShellErrorBoundary } from "./components/AppShellErrorBoundary";
import { AuthNudge } from "./components/AuthNudge";
import { BottomNav } from "./components/BottomNav";
import { FeedSkeleton, ShopSkeleton, SplashScreen } from "./components/Skeletons";
import { Topbar } from "./components/Topbar";
import { AiFeed } from "./screens/AiFeed";
import type { AuthMode } from "./sheets/AuthModal";
import { creditService, feedService, followService, itemService, notificationService, profileService, savedItemService, userService, wantedItemService } from "./services";

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
const HIDE_BOTTOM_NAV_VIEWS: View[] = ["search", "filter", "sort", "add", "profile_edit", "offer_detail"];

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
  postKind: "item" | "wanted";
  feedPersonId: string;
  filters: Filters;
  selectedId: string | null;
  wantedItemId: string | null;
  offerId: string | null;
  conversationId: string | null;
  profileId: string | null;
  editingItemId: string | null;
  editingWantedItemId: string | null;
  campaignId: string | null;
  selectedItem?: Item | null;
  profileUser?: User | null;
  editingItem?: Item | null;
  editingWantedItem?: WantedItem | null;
  campaignData?: Campaign | null;
};

function buildAppRouteUrl(route: AppRouteState) {
  const params = new URLSearchParams();
  if (route.view === "filter" || route.view === "sort" || route.view === "following" || route.view === "campaign") {
    params.set("view", route.view);
  }
  if (route.inboxTab === "sent" && (route.view === "inbox" || route.view === "offer_detail" || route.view === "chat")) {
    params.set("tab", route.inboxTab);
  }
  if (route.view === "add" && route.editMode === "reswap") params.set("reswap", "1");
  if (route.view === "add" && route.postKind === "wanted") params.set("kind", "wanted");
  if (route.feedPersonId) params.set("person", route.feedPersonId);
  if (!route.selectedId && route.offerId && route.view !== "offer_detail" && route.view !== "chat") params.set("offer", route.offerId);
  if (!route.profileId && route.campaignId) params.set("campaign", route.campaignId);
  if (!route.selectedId && !route.editingItemId && route.profileId && route.view !== "profile") params.set("profile", route.profileId);
  if (!route.selectedId && route.editingItemId && route.view !== "add") params.set("edit", route.editingItemId);
  if (route.view === "add" && route.editingWantedItemId) params.set("edit-wanted", route.editingWantedItemId);
  if (["shop", "search", "filter", "sort"].includes(route.view)) {
    for (const key of ROUTE_FILTER_KEYS) {
      const value = route.filters[key];
      if (!value) continue;
      if (key === "sort" && value === "newest") continue;
      params.set(key, typeof value === "boolean" ? String(value) : value);
    }
  }
  const normalizedBasePath = APP_BASE_PATH === "/" ? "" : APP_BASE_PATH;
  const routePath = (() => {
    if (route.selectedId) return `/items/${route.selectedId}`;
    if (route.wantedItemId) return `/wanted/${route.wantedItemId}`;
    if (route.view === "shop" || route.view === "following" || route.view === "filter" || route.view === "sort") return "/explore";
    if (route.view === "search") return "/search";
    if (route.view === "add") return "/post";
    if (route.view === "inbox") return "/deals";
    if (route.view === "notifications") return "/notifications";
    if (route.view === "saved") return "/saved";
    if (route.view === "profile") return "/profile";
    if (route.view === "profile_edit") return "/profile/edit";
    if (route.view === "offer_detail" && route.offerId) return `/swap/${route.offerId}`;
    if (route.view === "chat" && route.conversationId) return `/chats/${route.conversationId}`;
    if (route.view === "chat" && !route.offerId) return "/chats";
    if (route.view === "chat" && route.offerId) return `/chat/${route.offerId}`;
    return "/";
  })();
  const query = params.toString();
  const pathname = `${normalizedBasePath}${routePath}` || "/";
  return query ? `${pathname}?${query}` : pathname;
}

function parseAppRouteFromLocation(): Partial<AppRouteState> {
  const normalizedPath = normalizeRoute(window.location.pathname);
  const params = new URLSearchParams(window.location.search);
  const nextView = params.get("view");
  let inferredView: View = (nextView as View) || "feed";
  let selectedId: string | null = params.get("item");
  let offerId: string | null = params.get("offer");
  let conversationId: string | null = null;
  let profileId: string | null = params.get("profile");
  let editingItemId: string | null = params.get("edit");
  let editingWantedItemId: string | null = params.get("edit-wanted");
  let campaignId: string | null = params.get("campaign");
  let wantedItemId: string | null = null;

  if (normalizedPath === "/explore") inferredView = (nextView as View) || "shop";
  else if (normalizedPath === "/search") inferredView = "search";
  else if (normalizedPath === "/post") inferredView = "add";
  else if (normalizedPath === "/deals") inferredView = "inbox";
  else if (normalizedPath === "/notifications") inferredView = "notifications";
  else if (normalizedPath === "/chats") inferredView = "chat";
  else if (normalizedPath === "/saved") inferredView = "saved";
  else if (normalizedPath === "/profile") inferredView = "profile";
  else if (normalizedPath === "/profile/edit") inferredView = "profile_edit";
  else {
    const itemMatch = normalizedPath.match(/^\/items\/([^/]+)$/);
    const wantedMatch = normalizedPath.match(/^\/wanted\/([^/]+)$/);
    const swapMatch = normalizedPath.match(/^\/swap\/([^/]+)$/);
    const chatsThreadMatch = normalizedPath.match(/^\/chats\/([^/]+)$/);
    const chatThreadMatch = normalizedPath.match(/^\/chat\/thread\/([^/]+)$/);
    const chatMatch = normalizedPath.match(/^\/chat\/([^/]+)$/);
    if (itemMatch) {
      selectedId = decodeURIComponent(itemMatch[1]);
      inferredView = "feed";
    } else if (wantedMatch) {
      wantedItemId = decodeURIComponent(wantedMatch[1]);
      inferredView = "shop";
    } else if (swapMatch) {
      offerId = decodeURIComponent(swapMatch[1]);
      inferredView = "offer_detail";
    } else if (chatsThreadMatch) {
      conversationId = decodeURIComponent(chatsThreadMatch[1]);
      inferredView = "chat";
    } else if (chatThreadMatch) {
      conversationId = decodeURIComponent(chatThreadMatch[1]);
      inferredView = "chat";
    } else if (chatMatch) {
      offerId = decodeURIComponent(chatMatch[1]);
      inferredView = "chat";
    }
  }
  const route: Partial<AppRouteState> = {
    view: inferredView,
    inboxTab: normalizeInboxTab(params.get("tab")),
    editMode: params.get("reswap") === "1" ? "reswap" : "edit",
    feedPersonId: params.get("person") || "",
    postKind: params.get("kind") === "wanted" ? "wanted" : "item",
    selectedId,
    wantedItemId,
    offerId,
    conversationId,
    profileId,
    editingItemId,
    editingWantedItemId,
    campaignId
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
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editingWantedItem, setEditingWantedItem] = useState<WantedItem | null>(null);
  const [editMode, setEditMode] = useState<"edit" | "reswap">("edit");
  const [postKind, setPostKind] = useState<"item" | "wanted">("item");
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
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
  const [suggestedLoading, setSuggestedLoading] = useState(false);
  const [suggestedError, setSuggestedError] = useState("");
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [creditTransactions, setCreditTransactions] = useState<Transaction[]>([]);
  const [creditLoading, setCreditLoading] = useState(false);
  const [creditError, setCreditError] = useState("");
  const [homeNotifications, setHomeNotifications] = useState<NotificationEntry[]>([]);
  const [homeNotificationsLoading, setHomeNotificationsLoading] = useState(false);
  const [homeNotificationsError, setHomeNotificationsError] = useState("");
  const [followBusyId, setFollowBusyId] = useState<string | null>(null);
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
  const showTopbar =
    !selected &&
    !profileView &&
    (view === "feed" || view === "shop" || view === "following");
  const isFocusedSubpage = !selected && !profileView && FOCUSED_VIEWS.includes(view);
  const isChatThreadView = view === "chat" && Boolean(offerId || conversationId);
  const hideBottomNav = Boolean(selected) || Boolean(profileView) || HIDE_BOTTOM_NAV_VIEWS.includes(view) || isChatThreadView;
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
    conversationId || "",
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
      conversationId: conversationId || null,
      profileId: profileView?.id || null,
      editingItemId: editingItem?.id || null,
      campaignId: campaignView?.id || null,
      userId: user?.id || null
    }),
    [campaignView?.id, conversationId, editingItem?.id, inboxTab, offerId, profileView?.id, selected?.id, user?.id, view]
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
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (path === "/feed") return await feedService.getHomeFeed(query);
    return await itemService.listItems(query);
  }

  async function loadMe() {
    const nextUser = await userService.getCurrentUser();
    setUser(nextUser);
    writeCachedUser(nextUser);
    return nextUser;
  }

  async function loadSessionExtras(nextUser: User | null) {
    if (!nextUser) {
      setFollowing([]);
      setNoticeCount(0);
      return;
    }
    const [unreadCount, follows] = await Promise.all([
      notificationService.getUnreadCount().catch(() => 0),
      followService.listFollowing().catch(() => [])
    ]);
    setNoticeCount(unreadCount);
    setFollowing(follows);
  }

  async function loadHomePanels(nextUser: User | null) {
    setSuggestedLoading(true);
    setSuggestedError("");
    const suggestionsPromise = itemService.listItems({ limit: 18, sort: "newest" })
      .then((data) => {
        const followedIds = new Set(following.map((entry) => entry.id));
        const nextUsers = uniqueOwners(data.items).filter((entry) => entry.id !== nextUser?.id && !followedIds.has(entry.id));
        setSuggestedUsers(nextUsers.slice(0, 8));
      })
      .catch((error: Error) => {
        setSuggestedError(error.message || "โหลดรายชื่อแนะนำไม่สำเร็จ");
        setSuggestedUsers([]);
      })
      .finally(() => setSuggestedLoading(false));

    if (!nextUser) {
      setCreditBalance(null);
      setCreditTransactions([]);
      setCreditError("");
      setCreditLoading(false);
      setHomeNotifications([]);
      setHomeNotificationsError("");
      setHomeNotificationsLoading(false);
      await suggestionsPromise;
      return;
    }

    setCreditLoading(true);
    setCreditError("");
    setHomeNotificationsLoading(true);
    setHomeNotificationsError("");
    const [walletResult, transactionResult, notificationResult] = await Promise.allSettled([
      creditService.getWallet(),
      creditService.getTransactions(),
      notificationService.listNotifications()
    ]);

    if (walletResult.status === "fulfilled") {
      setCreditBalance(Number(walletResult.value?.credit_balance || 0));
      setCreditError("");
    } else {
      setCreditBalance(null);
      setCreditError(walletResult.reason?.message || "โหลดเครดิตกิจกรรมไม่สำเร็จ");
    }
    if (transactionResult.status === "fulfilled") {
      setCreditTransactions(transactionResult.value || []);
    } else {
      setCreditTransactions([]);
      setCreditError((current) => current || transactionResult.reason?.message || "โหลดกิจกรรมเครดิตไม่สำเร็จ");
    }
    setCreditLoading(false);

    if (notificationResult.status === "fulfilled") {
      const nextNotifications = notificationResult.value || [];
      setHomeNotifications(nextNotifications);
      setNoticeCount(nextNotifications.filter((entry) => !entry.read_at).length);
      setHomeNotificationsError("");
    } else {
      setHomeNotifications([]);
      setHomeNotificationsError(notificationResult.reason?.message || "โหลดการแจ้งเตือนไม่สำเร็จ");
    }
    setHomeNotificationsLoading(false);
    await suggestionsPromise;
  }

  function resetSessionState() {
    setUser(null);
    writeCachedUser(null);
    setFollowing([]);
    setNoticeCount(0);
    setSavedItems([]);
    setOfferItem(null);
    setCreditBalance(null);
    setCreditTransactions([]);
    setHomeNotifications([]);
  }

  function routeSnapshot(overrides: Partial<AppRouteState> = {}): AppRouteState {
    const nextView = overrides.view ?? view;
    const nextInboxTab = overrides.inboxTab ?? inboxTab;
    const nextEditMode = overrides.editMode ?? (nextView === "add" ? editMode : "edit");
    const nextPostKind = overrides.postKind ?? (nextView === "add" ? postKind : "item");
    const nextFeedPersonId = overrides.feedPersonId ?? feedPersonId;
    const nextFilters = overrides.filters ?? filters;
    const nextSelectedItem = overrides.selectedItem !== undefined ? overrides.selectedItem : selected;
    const nextProfileUser = overrides.profileUser !== undefined ? overrides.profileUser : profileView;
    const nextEditingItem = overrides.editingItem !== undefined ? overrides.editingItem : editingItem;
    const nextEditingWantedItem =
      overrides.editingWantedItem !== undefined ? overrides.editingWantedItem : nextView === "add" ? editingWantedItem : null;
    const nextCampaign = overrides.campaignData !== undefined ? overrides.campaignData : campaignView;
    return {
      app: "qxwap",
      view: nextView,
      inboxTab: nextInboxTab,
      editMode: nextEditMode,
      postKind: nextPostKind,
      feedPersonId: nextFeedPersonId,
      filters: { ...emptyFilters, ...nextFilters },
      selectedId: overrides.selectedId !== undefined ? overrides.selectedId : nextSelectedItem?.id || null,
      wantedItemId: overrides.wantedItemId !== undefined ? overrides.wantedItemId : null,
      offerId: overrides.offerId !== undefined ? overrides.offerId : offerId,
      conversationId: overrides.conversationId !== undefined ? overrides.conversationId : conversationId,
      profileId: overrides.profileId !== undefined ? overrides.profileId : nextProfileUser?.id || null,
      editingItemId: overrides.editingItemId !== undefined ? overrides.editingItemId : nextEditingItem?.id || null,
      editingWantedItemId:
        overrides.editingWantedItemId !== undefined ? overrides.editingWantedItemId : nextEditingWantedItem?.id || null,
      campaignId: overrides.campaignId !== undefined ? overrides.campaignId : nextCampaign?.id || nextCampaign?.slug || null,
      selectedItem: nextSelectedItem || null,
      profileUser: nextProfileUser || null,
      editingItem: nextEditingItem || null,
      editingWantedItem: nextEditingWantedItem || null,
      campaignData: nextCampaign || null
    };
  }

  function applyRouteLocally(route: AppRouteState) {
    setView(route.view === "wallet" ? "profile" : route.view);
    setInboxTab(route.inboxTab || "received");
    setEditMode(route.editMode || "edit");
    setPostKind(route.postKind || "item");
    setFeedPersonId(route.feedPersonId || "");
    setFilters({ ...emptyFilters, ...route.filters });
    setSelected(route.selectedItem || null);
    setOfferId(route.offerId || null);
    setConversationId(route.conversationId || null);
    setProfileView(route.profileUser || null);
    setEditingItem(route.editingItem || null);
    setEditingWantedItem(route.editingWantedItem || null);
    setCampaignView(route.campaignData || null);
  }

  function writeRoute(route: AppRouteState, mode: "push" | "replace" = "push") {
    const safeRoute = route.view === "wallet" ? { ...route, view: "profile" as View } : route;
    window.history[mode === "replace" ? "replaceState" : "pushState"](safeRoute, "", buildAppRouteUrl(safeRoute));
  }

  function navigateRoute(overrides: Partial<AppRouteState>, mode: "push" | "replace" = "push") {
    const shouldClearOfferId =
      overrides.offerId === undefined &&
      overrides.conversationId === undefined &&
      ((overrides.view !== undefined && overrides.view !== "offer_detail" && overrides.view !== "chat") ||
        overrides.selectedId !== undefined ||
        overrides.selectedItem !== undefined ||
        overrides.profileId !== undefined ||
        overrides.profileUser !== undefined ||
        overrides.editingItemId !== undefined ||
        overrides.editingItem !== undefined ||
        overrides.editingWantedItemId !== undefined ||
        overrides.editingWantedItem !== undefined ||
        overrides.campaignId !== undefined ||
        overrides.campaignData !== undefined);
    const nextRoute = routeSnapshot(
      shouldClearOfferId ? { ...overrides, offerId: null, conversationId: null } : overrides
    );
    applyRouteLocally(nextRoute);
    writeRoute(nextRoute, mode);
  }

  async function fetchItemById(itemId: string) {
    const data = await itemService.getItemDetail(itemId);
    return data.item;
  }

  async function fetchWantedItemById(wantedItemId: string) {
    return await wantedItemService.getWantedItem(wantedItemId);
  }

  async function fetchProfileById(profileId: string) {
    if (userRef.current?.id === profileId) return userRef.current;
    return await profileService.getProfile(profileId);
  }

  async function fetchCampaignById(campaignId: string) {
    return await feedService.getCampaign(campaignId);
  }

  async function restoreRoute(nextRoute: Partial<AppRouteState>, replaceHistory = true) {
    const token = ++routeRestoreRef.current;
    const baseRoute: AppRouteState = {
      app: "qxwap",
      view: nextRoute.view === "wallet" ? "profile" : (nextRoute.view || "feed"),
      inboxTab: nextRoute.inboxTab || "received",
      editMode: nextRoute.editMode || "edit",
      postKind: nextRoute.postKind || "item",
      feedPersonId: nextRoute.feedPersonId || "",
      filters: { ...emptyFilters, ...(nextRoute.filters || {}) },
      selectedId: nextRoute.selectedId || null,
      wantedItemId: nextRoute.wantedItemId || null,
      offerId: nextRoute.offerId || null,
      conversationId: nextRoute.conversationId || null,
      profileId: nextRoute.profileId || null,
      editingItemId: nextRoute.editingItemId || null,
      editingWantedItemId: nextRoute.editingWantedItemId || null,
      campaignId: nextRoute.campaignId || null,
      selectedItem: nextRoute.selectedItem || null,
      profileUser: nextRoute.profileUser || null,
      editingItem: nextRoute.editingItem || null,
      editingWantedItem: nextRoute.editingWantedItem || null,
      campaignData: nextRoute.campaignData || null
    };

    if (baseRoute.editingItemId || baseRoute.editingWantedItemId) {
      baseRoute.view = "add";
      baseRoute.offerId = null;
      baseRoute.conversationId = null;
      baseRoute.selectedId = null;
      baseRoute.selectedItem = null;
      baseRoute.profileId = null;
      baseRoute.profileUser = null;
      baseRoute.campaignId = null;
      baseRoute.campaignData = null;
    } else if (baseRoute.profileId) {
      baseRoute.view = "profile";
      baseRoute.offerId = null;
      baseRoute.conversationId = null;
      baseRoute.selectedId = null;
      baseRoute.selectedItem = null;
      baseRoute.editingItemId = null;
      baseRoute.editingItem = null;
      baseRoute.campaignId = null;
      baseRoute.campaignData = null;
    } else if ((baseRoute.offerId || baseRoute.conversationId) && (baseRoute.view === "offer_detail" || baseRoute.view === "chat")) {
      baseRoute.selectedId = null;
      baseRoute.selectedItem = null;
      baseRoute.profileId = null;
      baseRoute.profileUser = null;
      baseRoute.editingItemId = null;
      baseRoute.editingItem = null;
      baseRoute.editingWantedItemId = null;
      baseRoute.editingWantedItem = null;
      baseRoute.campaignId = null;
      baseRoute.campaignData = null;
    } else if (baseRoute.campaignId) {
      baseRoute.view = "campaign";
      baseRoute.offerId = null;
      baseRoute.conversationId = null;
      baseRoute.selectedId = null;
      baseRoute.selectedItem = null;
      baseRoute.profileId = null;
      baseRoute.profileUser = null;
      baseRoute.editingItemId = null;
      baseRoute.editingItem = null;
      baseRoute.editingWantedItemId = null;
      baseRoute.editingWantedItem = null;
    } else if (["profile_edit", "inbox", "notifications", "saved", "search", "filter", "sort"].includes(baseRoute.view)) {
      baseRoute.selectedId = null;
      baseRoute.selectedItem = null;
      baseRoute.wantedItemId = null;
      baseRoute.offerId = null;
      baseRoute.conversationId = null;
      baseRoute.profileId = null;
      baseRoute.profileUser = null;
      baseRoute.editingItemId = null;
      baseRoute.editingItem = null;
      baseRoute.editingWantedItemId = null;
      baseRoute.editingWantedItem = null;
      baseRoute.campaignId = null;
      baseRoute.campaignData = null;
    } else if (baseRoute.view === "profile" && !baseRoute.profileId) {
      baseRoute.selectedId = null;
      baseRoute.selectedItem = null;
      baseRoute.offerId = null;
      baseRoute.conversationId = null;
      baseRoute.editingItemId = null;
      baseRoute.editingItem = null;
      baseRoute.editingWantedItemId = null;
      baseRoute.editingWantedItem = null;
      baseRoute.campaignId = null;
      baseRoute.campaignData = null;
    }

    try {
      if (baseRoute.wantedItemId) {
        const wantedItem = await wantedItemService.getWantedItem(baseRoute.wantedItemId);
        baseRoute.view = "shop";
        baseRoute.filters = {
          ...emptyFilters,
          q: wantedItem.wanted_text || wantedItem.title,
          wanted_tag: wantedItem.wanted_tags[0] || "",
          category: wantedItem.category || "",
          location_label: wantedItem.location_label || ""
        };
        baseRoute.wantedItemId = null;
      }
      if (baseRoute.editingItemId && !baseRoute.editingItem) {
        baseRoute.editingItem = await fetchItemById(baseRoute.editingItemId);
      }
      if (baseRoute.editingWantedItemId && !baseRoute.editingWantedItem) {
        baseRoute.editingWantedItem = await fetchWantedItemById(baseRoute.editingWantedItemId);
        baseRoute.postKind = "wanted";
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
      baseRoute.editingWantedItemId = null;
      baseRoute.editingWantedItem = null;
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
      postKind: "item",
      editMode: nextEditMode,
      editingItem: item,
      editingItemId: item.id,
      editingWantedItem: null,
      editingWantedItemId: null,
      selectedItem: null,
      selectedId: null,
      profileUser: null,
      profileId: null,
      campaignData: null,
      campaignId: null
    });
  }

  function openWantedEditRoute(wantedItem: WantedItem) {
    navigateRoute({
      view: "add",
      postKind: "wanted",
      editMode: "edit",
      editingItem: null,
      editingItemId: null,
      editingWantedItem: wantedItem,
      editingWantedItemId: wantedItem.id,
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

  async function loadFeedPage(options?: { reset?: boolean; pageSize?: number; viewer?: User | null }) {
    const reset = Boolean(options?.reset);
    const limit = options?.pageSize || (reset ? INITIAL_BATCH_SIZE : PAGE_CHUNK_SIZE);
    const viewer = options?.viewer !== undefined ? options.viewer : userRef.current;
    if (!viewer) {
      setFeedItems([]);
      setFeedHasMore(false);
      setFeedInitialized(true);
      setFeedLoading(false);
      setFeedLoadingMore(false);
      setFeedError("");
      return;
    }
    if (reset) {
      feedAbortRef.current?.abort();
      const controller = new AbortController();
      feedAbortRef.current = controller;
      setFeedLoading(true);
      setFeedError("");
      try {
        if (controller.signal.aborted) throw new DOMException("Aborted", "AbortError");
        const data = await feedService.getFollowingFeed({
          limit,
          offset: 0
        });
        setFeedItems(mergeItems(data.items, []));
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
      const data = await feedService.getFollowingFeed({
        limit,
        offset: feedItems.length
      });
      setFeedItems((current) => mergeItems(current, data.items));
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
        if (controller.signal.aborted) throw new DOMException("Aborted", "AbortError");
        const data = await itemService.searchItems(Object.fromEntries(params.entries()));
        setShopItems(mergeItems(data.items, []));
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
      const data = await itemService.searchItems(Object.fromEntries(params.entries()));
      setShopItems((current) => mergeItems(current, data.items));
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
    void loadHomePanels(readCachedUser()).catch(() => undefined);
    void loadMe()
      .then((me) => {
        if (!live) return;
        setAuthChecking(false);
        if (me) {
          void loadSessionExtras(me).catch(() => undefined);
        }
        void loadFeedPage({ reset: true, viewer: me }).catch(() => undefined);
        void loadHomePanels(me).catch(() => undefined);
      })
      .catch((error) => {
        if (!live || isIgnorableAbortError(error)) return;
        resetSessionState();
        void loadFeedPage({ reset: true, viewer: null }).catch(() => undefined);
        void loadHomePanels(null).catch(() => undefined);
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
    savedItemService.listSavedItems({ limit: 40 })
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
    const tasks: Promise<unknown>[] = [loadSessionExtras(user).catch(() => undefined), loadHomePanels(user).catch(() => undefined)];
    if (isShopView) tasks.push(loadShopPage(filters, { reset: true }));
    else if (view === "saved" && user) {
      tasks.push(
        savedItemService.listSavedItems({ limit: 40 })
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
    userRef.current = nextUser;
    if (resolveAuthRoute()) {
      writeRoute(routeSnapshot(), "replace");
    }
    void loadSessionExtras(nextUser).catch(() => undefined);
    if (isShopView) {
      void loadShopPage(filters, { reset: true }).catch(() => undefined);
    } else if (view === "saved") {
      void savedItemService.listSavedItems({ limit: 40 })
        .then((data) => setSavedItems(data.items))
        .catch(() => undefined);
    } else {
      void loadFeedPage({ reset: true, viewer: nextUser }).catch(() => undefined);
    }
    void loadHomePanels(nextUser).catch(() => undefined);
    if (selected?.id) {
      void fetchItemById(selected.id)
        .then((item) => setSelected(item))
        .catch((e) => !isIgnorableAbortError(e) && setError(e.message));
    }
  }

  async function afterAccountDeleted() {
    resetSessionState();
    userRef.current = null;
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
    await loadHomePanels(null);
  }

  async function signOut() {
    await userService.signOut();
    resetSessionState();
    userRef.current = null;
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
    await loadHomePanels(null);
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
    if (item.viewer.is_bookmarked) await savedItemService.unsaveItem(item.id);
    else await savedItemService.saveItem(item.id);
    if (selected?.id === item.id) {
      try {
        setSelected(await fetchItemById(item.id));
      } catch {
        // noop, reloadVisibleData below will reconcile the rest
      }
    }
    await reloadVisibleData();
  }

  async function toggleFollowProfile(profile: User) {
    if (!user) {
      requireLogin("เข้าสู่ระบบเพื่อจัดการรายชื่อที่คุณติดตาม");
      return;
    }
    setFollowBusyId(profile.id);
    try {
      if (following.some((entry) => entry.id === profile.id)) {
        await followService.unfollowUser(profile.id);
      } else {
        await followService.followUser(profile.id);
      }
      await reloadVisibleData();
    } catch (error: any) {
      setError(error.message || "อัปเดตรายการติดตามไม่สำเร็จ");
    } finally {
      setFollowBusyId(null);
    }
  }

  async function removeItem(item: Item) {
    if (!window.confirm(`ปิดประกาศ "${item.title}" และซ่อนออกจากหน้า feed/search ใช่ไหม?`)) return;
    await itemService.deleteItem(item.id);
    navigateRoute({ selectedItem: null, selectedId: null }, "replace");
    await reloadVisibleData();
  }

  async function toggleItemAvailability(item: Item) {
    const nextStatus = item.status === "inactive" ? "active" : "inactive";
    await itemService.updateItem(item.id, { status: nextStatus });
    if (selected?.id === item.id) {
      setSelected(await fetchItemById(item.id));
    }
    await reloadVisibleData();
  }

  async function removeWantedItem(wantedItem: WantedItem) {
    if (!window.confirm(`ปิดประกาศ "${wantedItem.title}" และซ่อนออกจากหน้า feed/search ใช่ไหม?`)) return;
    await wantedItemService.deleteWantedItem(wantedItem.id);
    await reloadVisibleData();
  }

  async function toggleWantedAvailability(wantedItem: WantedItem) {
    const nextStatus = wantedItem.status === "inactive" ? "active" : "inactive";
    await wantedItemService.updateWantedItem(wantedItem.id, { status: nextStatus });
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

  function openWantedContext(item: Item) {
    navigateRoute({
      view: "shop",
      filters: {
        ...emptyFilters,
        wanted_tag: item.wanted.tags[0] || "",
        q: item.wanted.text || item.title
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

  function openWantedItemRoute(wantedItem: WantedItem) {
    navigateRoute({
      wantedItemId: wantedItem.id,
      selectedItem: null,
      selectedId: null,
      editingItem: null,
      editingItemId: null,
      editingWantedItem: null,
      editingWantedItemId: null,
      profileUser: null,
      profileId: null,
      campaignData: null,
      campaignId: null
    });
  }

  function changePostKind(nextKind: "item" | "wanted") {
    navigateRoute({
      view: "add",
      postKind: nextKind,
      editMode: "edit",
      editingItem: null,
      editingItemId: null,
      editingWantedItem: null,
      editingWantedItemId: null,
      selectedItem: null,
      selectedId: null,
      profileUser: null,
      profileId: null,
      campaignData: null,
      campaignId: null
    }, "replace");
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

  async function startSwapForItem(item: Item, source: "feed" | "detail" = "detail") {
    if (!user) {
      requireLogin(source === "feed" ? "เข้าสู่ระบบเพื่อเริ่มแลกเปลี่ยนจากโพสต์นี้" : "เข้าสู่ระบบเพื่อเริ่มข้อเสนอแลกเปลี่ยน");
      return;
    }
    if (item.viewer.is_owner) {
      setError("คุณไม่สามารถเริ่มแลกกับสินค้าของตัวเองได้");
      return;
    }
    if (item.status !== "active") {
      setError(item.status === "swapped" ? "สินค้านี้ถูกแลกไปแล้ว" : item.status === "pending_swap" ? "สินค้านี้กำลังอยู่ระหว่างดีล" : "สินค้านี้ยังไม่พร้อมรับข้อเสนอใหม่");
      return;
    }
    try {
      const inventory = await itemService.listItems({ owner_id: user.id, limit: 1 });
      if (!inventory.items.length) {
        navigateRoute({
          view: "add",
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
      setOfferItem(item);
    } catch (error: any) {
      setError(error.message || "ตรวจสอบสินค้าของคุณก่อนเริ่มแลกไม่สำเร็จ");
    }
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
      conversationId: null,
      wantedItemId: null,
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

  function openConversationChat(conversationIdToOpen: string) {
    navigateRoute({
      view: "chat",
      inboxTab,
      offerId: null,
      conversationId: conversationIdToOpen,
      wantedItemId: null,
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

  async function openNotificationTarget(entry: NotificationEntry) {
    try {
      if (!entry.read_at) {
        await notificationService.markNotificationRead(entry.id);
        setNoticeCount((current) => Math.max(0, current - 1));
      }
    } catch {
      // noop
    }
    const data = entry.data || {};
    if (data.conversation_id) {
      openConversationChat(String(data.conversation_id));
      return;
    }
    if (data.offer_id) {
      openOfferDetail(String(data.offer_id), data.inbox_tab || "received");
      return;
    }
    if (data.item_id) {
      await openItemById(String(data.item_id));
      return;
    }
    if (data.profile_id) {
      try {
        const profile = await fetchProfileById(String(data.profile_id));
        openProfileRoute(profile);
      } catch (error: any) {
        setError(error.message || "เปิดโปรไฟล์จากการแจ้งเตือนไม่สำเร็จ");
      }
      return;
    }
    if (entry.type === "credit_earned" || entry.type === "reward_redeemed") {
      navigateRoute({
        view: "profile",
        selectedItem: null,
        selectedId: null,
        profileUser: null,
        profileId: null,
        editingItem: null,
        editingItemId: null,
        campaignData: null,
        campaignId: null
      });
      await loadHomePanels(userRef.current);
      return;
    }
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
    await loadHomePanels(userRef.current);
  }

  function startSwapFromFeed(item: Item) {
    void startSwapForItem(item, "feed");
  }

  if (splashVisible) {
    return (
      <div className="app-shell app-shell-splash">
        <SplashScreen message={getSplashMessage()} />
      </div>
    );
  }

  return (
    <AppLayout
      focused={isFocusedSubpage}
      withTopbar={showTopbar}
      guest={!user}
      topbar={showTopbar ? (
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
      bottomNav={!hideBottomNav ? <BottomNav view={view} hasProfileView={Boolean(profileView)} onChange={changeView} /> : null}
      authNudge={!user && !authOpen ? <AuthNudge requireLogin={requireLogin} title={guestPromptTitle} withBottomNav={!hideBottomNav} /> : null}
    >

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
              openAdd={() =>
                navigateRoute({
                  view: "add",
                  postKind: "item",
                  selectedItem: null,
                  selectedId: null,
                  profileUser: null,
                  profileId: null,
                  editingItem: null,
                  editingItemId: null,
                  editingWantedItem: null,
                  editingWantedItemId: null,
                  campaignData: null,
                  campaignId: null
                })
              }
              openItemEdit={openEditRoute}
              toggleItemAvailability={toggleItemAvailability}
              deleteItem={removeItem}
              openWantedItem={openWantedItemRoute}
              openWantedEdit={openWantedEditRoute}
              toggleWantedAvailability={toggleWantedAvailability}
              deleteWantedItem={removeWantedItem}
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
              onOffer={(item) => {
                void startSwapForItem(item, "detail");
              }}
              onSave={saveToggle}
              onEdit={openEditRoute}
              onToggleAvailability={toggleItemAvailability}
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
              openConversationChat={openConversationChat}
              requireLogin={requireLogin}
              myItemCount={Math.max(myItems.length, Number(user?.listing_count || 0))}
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
        {!profileView && !selected && view === "chat" ? (
          <Suspense fallback={<RouteLoading message="กำลังโหลดแชท..." />}>
            <ChatPage
              key={`chat-${offerId || conversationId}`}
              offerId={offerId || undefined}
              conversationId={conversationId || undefined}
              user={user}
              requireLogin={requireLogin}
              openOfferDetail={openOfferDetail}
              openConversation={openConversationChat}
              openItemById={openItemById}
              openInbox={() =>
                navigateRoute({
                  view: "inbox",
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
              onNotificationCountChange={setNoticeCount}
              onBack={() =>
                offerId
                  ? navigateRoute({
                    view: "offer_detail",
                    offerId,
                    conversationId: null,
                    selectedItem: null,
                    selectedId: null,
                    profileUser: null,
                    profileId: null,
                    editingItem: null,
                    editingItemId: null,
                    campaignData: null,
                    campaignId: null
                  }, "replace")
                  : goBackOrFallback({
                    view: "feed",
                    offerId: null,
                    conversationId: null,
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
              user={user}
              items={feedItems}
              followingUsers={following}
              suggestedUsers={suggestedUsers}
              creditBalance={creditBalance}
              creditTransactions={creditTransactions}
              notifications={homeNotifications}
              followBusyId={followBusyId}
              onOpenItem={(item) => void openItemById(item.id, item)}
              onOpenWanted={openWantedContext}
              onOpenProfile={openProfileRoute}
              onSave={saveToggle}
              onTag={wantedTag}
              onToggleFollow={toggleFollowProfile}
              onStartSwap={startSwapFromFeed}
              onOpenNotification={(entry) => void openNotificationTarget(entry)}
              onOpenNotifications={() =>
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
              onOpenInbox={() =>
                navigateRoute({
                  view: "inbox",
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
              onOpenExplore={() =>
                navigateRoute({
                  view: "shop",
                  filters: { ...emptyFilters, sort: "newest" },
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
              onRequireLogin={() => requireLogin("เข้าสู่ระบบเพื่อให้ฟีดหน้านี้เป็นของคุณจริง ๆ")}
              feedError={feedError}
              feedLoading={feedLoading && !feedInitialized}
              feedLoadingMore={feedLoadingMore}
              hasMore={feedHasMore}
              creditLoading={creditLoading}
              creditError={creditError}
              suggestedLoading={suggestedLoading}
              suggestedError={suggestedError}
              notificationsLoading={homeNotificationsLoading}
              notificationsError={homeNotificationsError}
              onRetryFeed={() =>
                void loadFeedPage({ reset: true }).catch(() => undefined)
              }
              onRetryCredits={() =>
                void loadHomePanels(userRef.current).catch(() => undefined)
              }
              onRetrySuggested={() =>
                void loadHomePanels(userRef.current).catch(() => undefined)
              }
              onRetryNotifications={() =>
                void loadHomePanels(userRef.current).catch(() => undefined)
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
                onSearch={(query) => {
                  const trimmed = query.trim();
                  if (trimmed.startsWith("#")) {
                    wantedTag(trimmed.replace(/^#+/, ""));
                    return;
                  }
                  navigateRoute({
                    view: "shop",
                    filters: { ...filters, q: trimmed },
                    selectedItem: null,
                    selectedId: null,
                    profileUser: null,
                    profileId: null,
                    editingItem: null,
                    editingItemId: null,
                    campaignData: null,
                    campaignId: null
                  }, "replace");
                }}
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
              onDone={(result) => {
                const ownerProfile = userRef.current;
                if (result.kind === "wanted") {
                  if (ownerProfile) {
                    navigateRoute({
                      view: "profile",
                      profileUser: ownerProfile,
                      profileId: ownerProfile.id,
                      selectedItem: null,
                      selectedId: null,
                      editingItem: null,
                      editingItemId: null,
                      editingWantedItem: null,
                      editingWantedItemId: null
                    }, "replace");
                  } else {
                    navigateRoute({
                      view: "profile",
                      selectedItem: null,
                      selectedId: null,
                      editingItem: null,
                      editingItemId: null,
                      editingWantedItem: null,
                      editingWantedItemId: null
                    }, "replace");
                  }
                } else if (ownerProfile) {
                  const profileRoute = routeSnapshot({
                    view: "profile",
                    profileUser: ownerProfile,
                    profileId: ownerProfile.id,
                    postKind: "item",
                    editingItem: null,
                    editingItemId: null,
                    editingWantedItem: null,
                    editingWantedItemId: null,
                    selectedItem: null,
                    selectedId: null
                  });
                  applyRouteLocally(profileRoute);
                  writeRoute(profileRoute, "replace");
                  const detailRoute = {
                    ...profileRoute,
                    profileUser: null,
                    profileId: null,
                    selectedItem: result.item,
                    selectedId: result.item.id
                  };
                  applyRouteLocally(detailRoute);
                  writeRoute(detailRoute, "push");
                } else {
                  navigateRoute({
                    view: "feed",
                    postKind: "item",
                    editingItem: null,
                    editingItemId: null,
                    editingWantedItem: null,
                    editingWantedItemId: null,
                    selectedItem: result.item,
                    selectedId: result.item.id,
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
              editingWantedItem={editingWantedItem}
              postKind={postKind}
              onPostKindChange={changePostKind}
              editMode={editMode}
            />
          </Suspense>
        ) : null}
        {!profileView && !selected && view === "inbox" ? (
          <Suspense fallback={<RouteLoading message="กำลังโหลดดีล..." />}>
            <OffersPage
              user={user}
              requireLogin={requireLogin}
              items={allItems}
              openItemById={openItemById}
              openProfile={openProfileRoute}
              openOfferDetail={openOfferDetail}
              openChat={openOfferChat}
              initialTab={inboxTab}
              openAdd={() => changeView("add")}
              openShop={() => changeView("shop")}
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
              onOpenNotification={openNotificationTarget}
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
              openAdd={() =>
                navigateRoute({
                  view: "add",
                  postKind: "item",
                  selectedItem: null,
                  selectedId: null,
                  profileUser: null,
                  profileId: null,
                  editingItem: null,
                  editingItemId: null,
                  editingWantedItem: null,
                  editingWantedItemId: null,
                  campaignData: null,
                  campaignId: null
                })
              }
              openItemEdit={openEditRoute}
              toggleItemAvailability={toggleItemAvailability}
              deleteItem={removeItem}
              openWantedItem={openWantedItemRoute}
              openWantedEdit={openWantedEditRoute}
              toggleWantedAvailability={toggleWantedAvailability}
              deleteWantedItem={removeWantedItem}
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
    </AppLayout>
  );
}
