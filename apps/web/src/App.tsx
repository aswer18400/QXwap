import { useEffect, useMemo, useRef, useState } from "react";
import { qxwapDesignSystem } from "./design-system";
import { API, api } from "./lib/api";
import { emptyFilters } from "./lib/constants";
import type { Filters } from "./lib/constants";
import { mergeItems, uniqueOwners } from "./lib/format";
import type { InboxTab, Item, User, View, Wallet } from "./lib/types";
import { AuthNudge } from "./components/AuthNudge";
import { BottomNav } from "./components/BottomNav";
import { FeedSkeleton, ShopSkeleton, SplashScreen } from "./components/Skeletons";
import { Topbar } from "./components/Topbar";
import { AiFeed } from "./screens/AiFeed";
import { AddProduct } from "./screens/AddProduct";
import { Detail } from "./screens/Detail";
import { InboxPage } from "./screens/InboxPage";
import { Profile } from "./screens/Profile";
import { ShopPage } from "./screens/ShopPage";
import { WalletPage } from "./screens/WalletPage";
import { AuthModal, type AuthMode } from "./sheets/AuthModal";
import { FilterSheet } from "./sheets/FilterSheet";
import { OfferSheet } from "./sheets/OfferSheet";
import { SearchSheet } from "./sheets/SearchSheet";

const INITIAL_BATCH_SIZE = 6;
const PAGE_CHUNK_SIZE = 6;
const PREFILL_TARGET = 20;
const SPLASH_MIN_MS = 2000;

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

type AppRouteState = {
  app: "qxwap";
  view: View;
  inboxTab: InboxTab;
  feedPersonId: string;
  filters: Filters;
  selectedId: string | null;
  profileId: string | null;
  editingItemId: string | null;
  selectedItem?: Item | null;
  profileUser?: User | null;
  editingItem?: Item | null;
};

function buildAppRouteUrl(route: AppRouteState) {
  const params = new URLSearchParams();
  if (route.view !== "feed") params.set("view", route.view);
  if (route.view === "inbox" && route.inboxTab !== "offers") params.set("tab", route.inboxTab);
  if (route.feedPersonId) params.set("person", route.feedPersonId);
  if (route.selectedId) params.set("item", route.selectedId);
  if (route.profileId) params.set("profile", route.profileId);
  if (route.editingItemId) params.set("edit", route.editingItemId);
  if (route.filters.q) params.set("q", route.filters.q);
  if (route.filters.wanted_tag) params.set("wanted_tag", route.filters.wanted_tag);
  if (route.filters.category) params.set("category", route.filters.category);
  if (route.filters.deal_type) params.set("deal_type", route.filters.deal_type);
  if (route.filters.sort && route.filters.sort !== "newest") params.set("sort", route.filters.sort);
  const basePath = APP_BASE_PATH === "/" ? "/" : `${APP_BASE_PATH}/`;
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function parseAppRouteFromLocation(): Partial<AppRouteState> {
  const params = new URLSearchParams(window.location.search);
  const nextView = params.get("view");
  const route: Partial<AppRouteState> = {
    view: (nextView as View) || "feed",
    inboxTab: (params.get("tab") as InboxTab) || "offers",
    feedPersonId: params.get("person") || "",
    selectedId: params.get("item"),
    profileId: params.get("profile"),
    editingItemId: params.get("edit")
  };
  const nextFilters: Filters = { ...emptyFilters };
  let hasFilter = false;
  for (const key of ["q", "wanted_tag", "category", "deal_type", "sort"] as const) {
    const value = params.get(key);
    if (value) {
      nextFilters[key] = value as never;
      hasFilter = true;
    }
  }
  if (hasFilter) route.filters = nextFilters;
  return route;
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

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [feedItems, setFeedItems] = useState<Item[]>([]);
  const [shopItems, setShopItems] = useState<Item[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [following, setFollowing] = useState<User[]>([]);
  const [feedPersonId, setFeedPersonId] = useState("");
  const [view, setView] = useState<View>("feed");
  const [selected, setSelected] = useState<Item | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [profileView, setProfileView] = useState<User | null>(null);
  const [filters, setFilters] = useState<Filters>({ ...emptyFilters });
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [inboxTab, setInboxTab] = useState<InboxTab>("offers");
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
  const [feedLoadingMore, setFeedLoadingMore] = useState(false);
  const [feedHasMore, setFeedHasMore] = useState(true);
  const [feedInitialized, setFeedInitialized] = useState(false);
  const [shopLoading, setShopLoading] = useState(false);
  const [shopLoadingMore, setShopLoadingMore] = useState(false);
  const [shopHasMore, setShopHasMore] = useState(true);
  const [shopInitialized, setShopInitialized] = useState(false);
  const feedAbortRef = useRef<AbortController | null>(null);
  const shopAbortRef = useRef<AbortController | null>(null);
  const shopQueryKeyRef = useRef("");
  const skipFirstFeedPersonEffect = useRef(true);
  const allItemsRef = useRef<Item[]>([]);
  const userRef = useRef<User | null>(null);
  const routeRestoreRef = useRef(0);

  const activeFilterCount = Object.entries(filters).filter(
    ([k, v]) => k !== "q" && k !== "sort" && Boolean(v)
  ).length;
  const allItems = useMemo(() => mergeItems(feedItems, shopItems), [feedItems, shopItems]);
  const myItems = useMemo(
    () => (user ? allItems.filter((i) => i.owner.id === user.id) : []),
    [allItems, user]
  );
  const discoveredPeople = useMemo(() => uniqueOwners(feedItems), [feedItems]);
  const followRailPeople = following.length ? following : discoveredPeople;

  useEffect(() => {
    allItemsRef.current = allItems;
  }, [allItems]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

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
    return data.user;
  }

  async function loadSessionExtras(nextUser: User | null) {
    if (!nextUser) {
      setWallet(null);
      setFollowing([]);
      setNoticeCount(0);
      return;
    }
    const [notifications, walletData, followsData] = await Promise.all([
      api<{ notifications: any[] }>("/notifications").catch(() => ({ notifications: [] })),
      api<{ wallet: Wallet }>("/wallet").catch(() => ({ wallet: null as unknown as Wallet })),
      api<{ follows: User[] }>("/follows").catch(() => ({ follows: [] }))
    ]);
    setNoticeCount(notifications.notifications.filter((n) => !n.read_at).length);
    setWallet(walletData.wallet);
    setFollowing(followsData.follows || []);
  }

  function routeSnapshot(overrides: Partial<AppRouteState> = {}): AppRouteState {
    const nextView = overrides.view ?? view;
    const nextInboxTab = overrides.inboxTab ?? inboxTab;
    const nextFeedPersonId = overrides.feedPersonId ?? feedPersonId;
    const nextFilters = overrides.filters ?? filters;
    const nextSelectedItem = overrides.selectedItem !== undefined ? overrides.selectedItem : selected;
    const nextProfileUser = overrides.profileUser !== undefined ? overrides.profileUser : profileView;
    const nextEditingItem = overrides.editingItem !== undefined ? overrides.editingItem : editingItem;
    return {
      app: "qxwap",
      view: nextView,
      inboxTab: nextInboxTab,
      feedPersonId: nextFeedPersonId,
      filters: { ...emptyFilters, ...nextFilters },
      selectedId: overrides.selectedId !== undefined ? overrides.selectedId : nextSelectedItem?.id || null,
      profileId: overrides.profileId !== undefined ? overrides.profileId : nextProfileUser?.id || null,
      editingItemId: overrides.editingItemId !== undefined ? overrides.editingItemId : nextEditingItem?.id || null,
      selectedItem: nextSelectedItem || null,
      profileUser: nextProfileUser || null,
      editingItem: nextEditingItem || null
    };
  }

  function applyRouteLocally(route: AppRouteState) {
    setView(route.view);
    setInboxTab(route.inboxTab || "offers");
    setFeedPersonId(route.feedPersonId || "");
    setFilters({ ...emptyFilters, ...route.filters });
    setSelected(route.selectedItem || null);
    setProfileView(route.profileUser || null);
    setEditingItem(route.editingItem || null);
  }

  function writeRoute(route: AppRouteState, mode: "push" | "replace" = "push") {
    window.history[mode === "replace" ? "replaceState" : "pushState"](route, "", buildAppRouteUrl(route));
  }

  function navigateRoute(overrides: Partial<AppRouteState>, mode: "push" | "replace" = "push") {
    const nextRoute = routeSnapshot(overrides);
    applyRouteLocally(nextRoute);
    writeRoute(nextRoute, mode);
  }

  async function fetchItemById(itemId: string) {
    const cached = allItemsRef.current.find((item) => item.id === itemId);
    if (cached) return cached;
    const data = await api<{ item: Item }>(`/items/${itemId}`);
    return data.item;
  }

  async function fetchProfileById(profileId: string) {
    if (userRef.current?.id === profileId) return userRef.current;
    const data = await api<{ profile: User }>(`/profiles/${profileId}`);
    return data.profile;
  }

  async function restoreRoute(nextRoute: Partial<AppRouteState>, replaceHistory = true) {
    const token = ++routeRestoreRef.current;
    const baseRoute: AppRouteState = {
      app: "qxwap",
      view: nextRoute.view || "feed",
      inboxTab: nextRoute.inboxTab || "offers",
      feedPersonId: nextRoute.feedPersonId || "",
      filters: { ...emptyFilters, ...(nextRoute.filters || {}) },
      selectedId: nextRoute.selectedId || null,
      profileId: nextRoute.profileId || null,
      editingItemId: nextRoute.editingItemId || null,
      selectedItem: nextRoute.selectedItem || null,
      profileUser: nextRoute.profileUser || null,
      editingItem: nextRoute.editingItem || null
    };

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
    } catch (error: any) {
      if (!isIgnorableAbortError(error)) {
        setError(error.message || "เปิดหน้าที่ร้องขอไม่สำเร็จ");
      }
      baseRoute.selectedId = null;
      baseRoute.selectedItem = null;
      baseRoute.profileId = null;
      baseRoute.profileUser = null;
      baseRoute.editingItemId = null;
      baseRoute.editingItem = null;
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
      editingItemId: null
    });
  }

  async function openItemById(itemId: string, fallbackItem?: Item | null) {
    try {
      if (fallbackItem) {
        openItemRoute(fallbackItem);
        return;
      }
      const item = await fetchItemById(itemId);
      openItemRoute(item);
    } catch (error: any) {
      if (!isIgnorableAbortError(error)) {
        setError(error.message || "เปิดรายละเอียดสินค้าไม่สำเร็จ");
      }
    }
  }

  function openProfileRoute(profile: User) {
    navigateRoute({
      profileUser: profile,
      profileId: profile.id,
      selectedItem: null,
      selectedId: null,
      editingItem: null,
      editingItemId: null
    });
  }

  function openEditRoute(item: Item) {
    navigateRoute({
      view: "add",
      editingItem: item,
      editingItemId: item.id,
      selectedItem: null,
      selectedId: null,
      profileUser: null,
      profileId: null
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

  async function loadFeedPage(options?: { reset?: boolean; pageSize?: number }) {
    const reset = Boolean(options?.reset);
    const limit = options?.pageSize || (reset ? INITIAL_BATCH_SIZE : PAGE_CHUNK_SIZE);
    if (reset) {
      feedAbortRef.current?.abort();
      const controller = new AbortController();
      feedAbortRef.current = controller;
      setFeedLoading(true);
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
    } finally {
      setShopLoadingMore(false);
    }
  }

  useEffect(() => {
    let live = true;
    const splashTimer = window.setTimeout(() => {
      if (live) setSplashVisible(false);
    }, SPLASH_MIN_MS);
    void loadFeedPage({ reset: true }).catch((e) => live && !isIgnorableAbortError(e) && setError(e.message));
    void loadMe()
      .then((me) => {
        if (!live) return;
        setAuthChecking(false);
        if (me) {
          void loadSessionExtras(me).catch((e) => !isIgnorableAbortError(e) && setError(e.message));
        }
      })
      .catch((e) => live && !isIgnorableAbortError(e) && setError(e.message))
      .finally(() => live && setAuthChecking(false));
    return () => {
      live = false;
      window.clearTimeout(splashTimer);
      feedAbortRef.current?.abort();
      shopAbortRef.current?.abort();
    };
  }, []);

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
    void loadFeedPage({ reset: true }).catch((e: Error) => !isIgnorableAbortError(e) && setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedPersonId]);

  useEffect(() => {
    if (view !== "shop" && !shopInitialized) return;
    const queryKey = JSON.stringify(filters);
    if (view !== "shop" && queryKey === shopQueryKeyRef.current) return;
    shopQueryKeyRef.current = queryKey;
    const t = window.setTimeout(
      () => void loadShopPage(filters, { reset: true }).catch((e: Error) => !isIgnorableAbortError(e) && setError(e.message)),
      200
    );
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, view]);

  useEffect(() => {
    if (view !== "feed" || !feedInitialized || feedLoading || feedLoadingMore || !feedHasMore || feedItems.length >= PREFILL_TARGET) {
      return;
    }
    const timer = window.setTimeout(
      () => void loadFeedPage({ pageSize: PAGE_CHUNK_SIZE }).catch((e: Error) => !isIgnorableAbortError(e) && setError(e.message)),
      120
    );
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, feedInitialized, feedLoading, feedLoadingMore, feedHasMore, feedItems.length]);

  useEffect(() => {
    if (view !== "shop" || !shopInitialized || shopLoading || shopLoadingMore || !shopHasMore || shopItems.length >= PREFILL_TARGET) {
      return;
    }
    const timer = window.setTimeout(
      () => void loadShopPage(filters, { pageSize: PAGE_CHUNK_SIZE }).catch((e: Error) => !isIgnorableAbortError(e) && setError(e.message)),
      120
    );
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, shopInitialized, shopLoading, shopLoadingMore, shopHasMore, shopItems.length]);

  async function reloadVisibleData() {
    const tasks: Promise<unknown>[] = [loadSessionExtras(user).catch(() => undefined)];
    if (view === "shop") tasks.push(loadShopPage(filters, { reset: true }));
    else tasks.push(loadFeedPage({ reset: true }));
    await Promise.all(tasks);
    setDataVersion((current) => current + 1);
  }

  async function afterAuth(nextUser: User) {
    setUser(nextUser);
    setAuthOpen(false);
    setAuthMode("signin");
    setAuthPrompt(qxwapDesignSystem.copy.loginRequired);
    if (resolveAuthRoute()) {
      writeRoute(routeSnapshot(), "replace");
    }
    void loadSessionExtras(nextUser).catch((e) => !isIgnorableAbortError(e) && setError(e.message));
    void loadFeedPage({ reset: true }).catch((e) => !isIgnorableAbortError(e) && setError(e.message));
    if (view === "shop") {
      void loadShopPage(filters, { reset: true }).catch((e) => !isIgnorableAbortError(e) && setError(e.message));
    }
  }

  async function afterAccountDeleted() {
    setUser(null);
    setWallet(null);
    setFollowing([]);
    setNoticeCount(0);
    setOfferItem(null);
    setAuthOpen(false);
    navigateRoute({
      view: "feed",
      inboxTab: "offers",
      feedPersonId: "",
      filters: { ...emptyFilters },
      profileUser: null,
      profileId: null,
      selectedItem: null,
      selectedId: null,
      editingItem: null,
      editingItemId: null
    }, "replace");
    await loadFeedPage({ reset: true });
  }

  async function signOut() {
    await api("/auth/signout", { method: "POST" });
    setUser(null);
    setWallet(null);
    setFollowing([]);
    setNoticeCount(0);
    setOfferItem(null);
    navigateRoute({
      view: "feed",
      inboxTab: "offers",
      feedPersonId: "",
      filters: { ...emptyFilters },
      profileUser: null,
      profileId: null,
      selectedItem: null,
      selectedId: null,
      editingItem: null,
      editingItemId: null
    }, "replace");
    await loadFeedPage({ reset: true });
  }

  function openWallet() {
    navigateRoute({
      view: "wallet",
      selectedItem: null,
      selectedId: null,
      editingItem: null,
      editingItemId: null,
      profileUser: null,
      profileId: null
    });
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
      filters: { ...filters, wanted_tag: tag, q: tag },
      selectedItem: null,
      selectedId: null,
      editingItem: null,
      editingItemId: null,
      profileUser: null,
      profileId: null
    });
  }

  function changeView(next: View) {
    navigateRoute({
      view: next,
      inboxTab: next === "inbox" ? "offers" : inboxTab,
      selectedItem: null,
      selectedId: null,
      editingItem: null,
      editingItemId: null,
      profileUser: null,
      profileId: null
    });
  }

  if (splashVisible) {
    return (
      <div className="app-shell app-shell-splash">
        <SplashScreen />
      </div>
    );
  }

  return (
    <div className={`app-shell${!user && !authOpen ? " guest" : ""}`}>
      <Topbar
        noticeCount={noticeCount}
        onHome={() => {
          navigateRoute({
            view: "feed",
            selectedItem: null,
            selectedId: null,
            profileUser: null,
            profileId: null,
            editingItem: null,
            editingItemId: null
          });
        }}
        onSearch={() => setSearchOpen(true)}
        onNotifications={() => {
          navigateRoute({
            view: "inbox",
            inboxTab: "notifications",
            selectedItem: null,
            selectedId: null,
            profileUser: null,
            profileId: null,
            editingItem: null,
            editingItemId: null
          });
        }}
      />

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
        {profileView ? (
          <Profile
            user={user}
            viewedUser={profileView}
            requireLogin={requireLogin}
            onAuth={afterAuth}
            onSignOut={signOut}
            onReload={reloadVisibleData}
            refreshKey={dataVersion}
            openItem={openItemRoute}
            openInbox={(tab = "offers") => {
              navigateRoute({
                view: "inbox",
                inboxTab: tab,
                profileUser: null,
                profileId: null,
                selectedItem: null,
                selectedId: null,
                editingItem: null,
                editingItemId: null
              });
            }}
            openWallet={openWallet}
          />
        ) : null}
        {!profileView && selected ? (
          <Detail
            item={selected}
            user={user}
            onBack={goBackFromDetail}
            onOffer={setOfferItem}
            onSave={saveToggle}
            onEdit={openEditRoute}
            onDelete={removeItem}
            onTag={wantedTag}
            onOpenRelated={openItemRoute}
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
        ) : null}
        {!profileView && !selected && view === "feed" ? (
          feedLoading && !feedInitialized ? <FeedSkeleton cards={INITIAL_BATCH_SIZE} /> : (
            <AiFeed
              items={feedItems}
              myItems={myItems}
              user={user}
              wallet={wallet}
              people={followRailPeople}
              selectedPersonId={feedPersonId}
              followingIds={following.map((p) => p.id)}
              onPerson={(personId) =>
                navigateRoute({
                  view: "feed",
                  feedPersonId: personId,
                  selectedItem: null,
                  selectedId: null,
                  profileUser: null,
                  profileId: null,
                  editingItem: null,
                  editingItemId: null
                })
              }
              onOpen={openItemRoute}
              onOffer={setOfferItem}
              onSave={saveToggle}
              onTag={wantedTag}
              requireLogin={requireLogin}
              openProfile={openProfileRoute}
              openWallet={openWallet}
              loading={feedLoading && !feedInitialized}
              loadingMore={feedLoadingMore}
              hasMore={feedHasMore}
              onLoadMore={() =>
                void loadFeedPage({ pageSize: PAGE_CHUNK_SIZE }).catch((e) => !isIgnorableAbortError(e) && setError(e.message))
              }
            />
          )
        ) : null}
        {!profileView && !selected && view === "shop" ? (
          shopLoading && !shopInitialized ? <ShopSkeleton cards={INITIAL_BATCH_SIZE} /> : (
            <ShopPage
              items={shopItems}
              filters={filters}
              setFilters={setFilters}
              activeFilterCount={activeFilterCount}
              openFilters={() => setFilterOpen(true)}
              onOpen={openItemRoute}
              onOffer={setOfferItem}
              onSave={saveToggle}
              onTag={wantedTag}
              loading={shopLoading && !shopInitialized}
              loadingMore={shopLoadingMore}
              hasMore={shopHasMore}
              onLoadMore={() =>
                void loadShopPage(filters, { pageSize: PAGE_CHUNK_SIZE }).catch((e) => !isIgnorableAbortError(e) && setError(e.message))
              }
            />
          )
        ) : null}
        {!profileView && !selected && view === "add" ? (
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
            user={user}
            requireLogin={requireLogin}
            editingItem={editingItem}
          />
        ) : null}
        {!profileView && !selected && view === "inbox" ? (
          <InboxPage
            user={user}
            requireLogin={requireLogin}
            items={allItems}
            openItemById={openItemById}
            openProfile={openProfileRoute}
            initialTab={inboxTab}
          />
        ) : null}
        {!profileView && !selected && view === "profile" ? (
          <Profile
            user={user}
            requireLogin={requireLogin}
            onAuth={afterAuth}
            onSignOut={signOut}
            onReload={reloadVisibleData}
            refreshKey={dataVersion}
            openItem={openItemRoute}
            openInbox={(tab = "offers") => {
              navigateRoute({
                view: "inbox",
                inboxTab: tab,
                selectedItem: null,
                selectedId: null,
                profileUser: null,
                profileId: null,
                editingItem: null,
                editingItemId: null
              });
            }}
            openWallet={openWallet}
          />
        ) : null}
        {!profileView && !selected && view === "wallet" ? (
          <WalletPage user={user} requireLogin={requireLogin} />
        ) : null}
      </main>

      <BottomNav view={view} hasProfileView={Boolean(profileView)} onChange={changeView} />

      {searchOpen ? (
        <SearchSheet
          viewerLoggedIn={Boolean(user)}
          close={() => setSearchOpen(false)}
          openProfile={(p) => {
            openProfileRoute(p);
            setSearchOpen(false);
          }}
          searchProducts={(q) => {
            navigateRoute({
              view: "shop",
              filters: { ...filters, q },
              selectedItem: null,
              selectedId: null,
              profileUser: null,
              profileId: null,
              editingItem: null,
              editingItemId: null
            });
            setSearchOpen(false);
          }}
        />
      ) : null}
      {filterOpen ? (
        <FilterSheet filters={filters} setFilters={setFilters} close={() => setFilterOpen(false)} />
      ) : null}
      {offerItem ? (
        <OfferSheet
          item={offerItem}
          user={user}
          myItems={myItems}
          close={() => setOfferItem(null)}
          requireLogin={requireLogin}
          openInbox={() => {
            setOfferItem(null);
            navigateRoute({
              view: "inbox",
              inboxTab: "offers",
              selectedItem: null,
              selectedId: null,
              profileUser: null,
              profileId: null,
              editingItem: null,
              editingItemId: null
            });
          }}
        />
      ) : null}
      {authOpen ? (
        <AuthModal close={closeAuth} onAuth={afterAuth} message={authPrompt} initialMode={authMode} />
      ) : null}
      {!user && !authOpen && !authChecking ? <AuthNudge requireLogin={requireLogin} /> : null}
    </div>
  );
}
