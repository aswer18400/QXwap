import { useEffect, useMemo, useRef, useState } from "react";
import { qxwapDesignSystem } from "./design-system";
import { API, api } from "./lib/api";
import { emptyFilters } from "./lib/constants";
import type { Filters } from "./lib/constants";
import { mergeItems, uniqueOwners } from "./lib/format";
import type { InboxTab, Item, User, View, Wallet } from "./lib/types";
import { AuthNudge } from "./components/AuthNudge";
import { BottomNav } from "./components/BottomNav";
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

const PAGE_SIZE = 20;

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
  const [authChecking, setAuthChecking] = useState(true);
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

  async function loadFeedPage(options?: { reset?: boolean }) {
    const reset = Boolean(options?.reset);
    if (reset) {
      feedAbortRef.current?.abort();
      const controller = new AbortController();
      feedAbortRef.current = controller;
      setFeedLoading(true);
      try {
        const data = await fetchItemPage(
          "/feed",
          {
            limit: String(PAGE_SIZE),
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
        limit: String(PAGE_SIZE),
        offset: String(feedItems.length),
        ...(feedPersonId ? { owner_id: feedPersonId } : {})
      });
      setFeedItems((current) => [...current, ...data.items]);
      setFeedHasMore(Boolean(data.page?.has_more));
    } finally {
      setFeedLoadingMore(false);
    }
  }

  async function loadShopPage(nextFilters: Filters = filters, options?: { reset?: boolean }) {
    const reset = Boolean(options?.reset);
    const params = new URLSearchParams();
    Object.entries(nextFilters).forEach(([k, v]) => {
      if (v !== "" && v !== false) params.set(k, String(v));
    });
    params.set("limit", String(PAGE_SIZE));

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
    void loadFeedPage({ reset: true }).catch((e) => live && setError(e.message));
    void loadMe()
      .then((me) => live && void loadSessionExtras(me).catch((e) => setError(e.message)))
      .catch((e) => live && setError(e.message))
      .finally(() => live && setAuthChecking(false));
    return () => {
      live = false;
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
    function openAuthFromHash() {
      const nextAuthRoute = resolveAuthRoute();
      if (nextAuthRoute) {
        setAuthMode(nextAuthRoute.mode);
        setAuthPrompt(nextAuthRoute.message);
        setAuthOpen(true);
      }
    }
    openAuthFromHash();
    window.addEventListener("hashchange", openAuthFromHash);
    window.addEventListener("popstate", openAuthFromHash);
    return () => {
      window.removeEventListener("hashchange", openAuthFromHash);
      window.removeEventListener("popstate", openAuthFromHash);
    };
  }, []);

  useEffect(() => {
    if (skipFirstFeedPersonEffect.current) {
      skipFirstFeedPersonEffect.current = false;
      return;
    }
    void loadFeedPage({ reset: true }).catch((e: Error) => e.name !== "AbortError" && setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedPersonId]);

  useEffect(() => {
    if (view !== "shop" && !shopInitialized) return;
    const queryKey = JSON.stringify(filters);
    if (view !== "shop" && queryKey === shopQueryKeyRef.current) return;
    shopQueryKeyRef.current = queryKey;
    const t = window.setTimeout(
      () => void loadShopPage(filters, { reset: true }).catch((e: Error) => e.name !== "AbortError" && setError(e.message)),
      200
    );
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, view]);

  async function reloadVisibleData() {
    const tasks: Promise<unknown>[] = [loadSessionExtras(user).catch(() => undefined)];
    if (view === "shop") tasks.push(loadShopPage(filters, { reset: true }));
    else tasks.push(loadFeedPage({ reset: true }));
    await Promise.all(tasks);
  }

  async function afterAuth(nextUser: User) {
    setUser(nextUser);
    setAuthOpen(false);
    setAuthMode("signin");
    setAuthPrompt(qxwapDesignSystem.copy.loginRequired);
    if (resolveAuthRoute()) {
      clearAuthRoute();
    }
    void loadSessionExtras(nextUser).catch((e) => setError(e.message));
    void loadFeedPage({ reset: true }).catch((e) => setError(e.message));
    if (view === "shop") {
      void loadShopPage(filters, { reset: true }).catch((e) => setError(e.message));
    }
  }

  async function afterAccountDeleted() {
    setUser(null);
    setWallet(null);
    setFollowing([]);
    setNoticeCount(0);
    setProfileView(null);
    setSelected(null);
    setEditingItem(null);
    setOfferItem(null);
    setView("feed");
    setAuthOpen(false);
    await loadFeedPage({ reset: true });
  }

  async function signOut() {
    await api("/auth/signout", { method: "POST" });
    setUser(null);
    setWallet(null);
    setFollowing([]);
    setNoticeCount(0);
    setProfileView(null);
    setSelected(null);
    setEditingItem(null);
    setOfferItem(null);
    setView("feed");
    await loadFeedPage({ reset: true });
  }

  function openWallet() {
    setView("wallet");
    setSelected(null);
    setEditingItem(null);
    setProfileView(null);
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
      clearAuthRoute();
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
    setSelected(null);
    await reloadVisibleData();
  }

  function wantedTag(tag: string) {
    setFilters((f) => ({ ...f, wanted_tag: tag, q: tag }));
    setView("shop");
    setSelected(null);
    setEditingItem(null);
  }

  function changeView(next: View) {
    if (next === "inbox") setInboxTab("offers");
    setView(next);
    setSelected(null);
    setEditingItem(null);
    setProfileView(null);
  }

  return (
    <div className={`app-shell${!user && !authOpen ? " guest" : ""}`}>
      <Topbar
        noticeCount={noticeCount}
        onHome={() => {
          setView("feed");
          setSelected(null);
          setProfileView(null);
        }}
        onSearch={() => setSearchOpen(true)}
        onNotifications={() => {
          setInboxTab("notifications");
          setView("inbox");
          setSelected(null);
          setProfileView(null);
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
            onAccountDeleted={afterAccountDeleted}
            onSignOut={signOut}
            onReload={reloadVisibleData}
            items={allItems}
            openItem={setSelected}
            openInbox={(tab = "offers") => {
              setInboxTab(tab);
              setProfileView(null);
              setView("inbox");
            }}
            openWallet={openWallet}
          />
        ) : null}
        {!profileView && selected ? (
          <Detail
            item={selected}
            user={user}
            onBack={() => setSelected(null)}
            onOffer={setOfferItem}
            onSave={saveToggle}
            onEdit={(item) => {
              setEditingItem(item);
              setSelected(null);
              setView("add");
            }}
            onDelete={removeItem}
            onTag={wantedTag}
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
          <AiFeed
            items={feedItems}
            myItems={myItems}
            user={user}
            wallet={wallet}
            people={followRailPeople}
            selectedPersonId={feedPersonId}
            followingIds={following.map((p) => p.id)}
            onPerson={setFeedPersonId}
            onOpen={setSelected}
            onOffer={setOfferItem}
            onSave={saveToggle}
            onTag={wantedTag}
            requireLogin={requireLogin}
            openProfile={(p) => {
              setProfileView(p);
              setSelected(null);
            }}
            openWallet={openWallet}
            loading={feedLoading && !feedInitialized}
            loadingMore={feedLoadingMore}
            hasMore={feedHasMore}
            onLoadMore={() => void loadFeedPage().catch((e) => setError(e.message))}
          />
        ) : null}
        {!profileView && !selected && view === "shop" ? (
          <ShopPage
            items={shopItems}
            filters={filters}
            setFilters={setFilters}
            activeFilterCount={activeFilterCount}
            openFilters={() => setFilterOpen(true)}
            onOpen={setSelected}
            onOffer={setOfferItem}
            onSave={saveToggle}
            onTag={wantedTag}
            loading={shopLoading && !shopInitialized}
            loadingMore={shopLoadingMore}
            hasMore={shopHasMore}
            onLoadMore={() => void loadShopPage(filters).catch((e) => setError(e.message))}
          />
        ) : null}
        {!profileView && !selected && view === "add" ? (
          <AddProduct
            onDone={(item: Item) => {
              setEditingItem(null);
              setSelected(item);
              void reloadVisibleData().catch((e) => setError(e.message));
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
            openItem={setSelected}
            openProfile={(p) => setProfileView(p)}
            initialTab={inboxTab}
          />
        ) : null}
        {!profileView && !selected && view === "profile" ? (
          <Profile
            user={user}
            requireLogin={requireLogin}
            onAuth={afterAuth}
            onAccountDeleted={afterAccountDeleted}
            onSignOut={signOut}
            onReload={reloadVisibleData}
            items={allItems}
            openItem={setSelected}
            openInbox={(tab = "offers") => {
              setInboxTab(tab);
              setView("inbox");
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
            setProfileView(p);
            setSelected(null);
            setSearchOpen(false);
          }}
          searchProducts={(q) => {
            setFilters((f) => ({ ...f, q }));
            setView("shop");
            setSelected(null);
            setProfileView(null);
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
            setInboxTab("offers");
            setView("inbox");
            setSelected(null);
            setProfileView(null);
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
