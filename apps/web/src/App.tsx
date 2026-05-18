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
import { AuthModal } from "./sheets/AuthModal";
import { FilterSheet } from "./sheets/FilterSheet";
import { OfferSheet } from "./sheets/OfferSheet";
import { SearchSheet } from "./sheets/SearchSheet";

export function App() {
  const [user, setUser] = useState<User | null>(null);
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
  const [authPrompt, setAuthPrompt] = useState<string>(qxwapDesignSystem.copy.loginRequired);
  const [noticeCount, setNoticeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const skipFirstFilterEffect = useRef(true);

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

  async function loadMe() {
    const data = await api<{ user: User | null }>("/auth/me");
    setUser(data.user);
    if (!data.user) {
      setWallet(null);
      setFollowing([]);
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

  async function loadFeed() {
    const data = await api<{ items: Item[] }>("/feed");
    setFeedItems(data.items);
  }

  async function loadShop(nextFilters: Filters = filters) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const params = new URLSearchParams();
    Object.entries(nextFilters).forEach(([k, v]) => {
      if (v !== "" && v !== false) params.set(k, String(v));
    });
    const data = await fetch(`${API}/items?${params.toString()}`, {
      credentials: "include",
      signal: controller.signal
    }).then(async (r) => {
      const json = await r.json();
      if (!r.ok) throw new Error(json.message || "โหลดสินค้าไม่สำเร็จ");
      return json as { items: Item[] };
    });
    setShopItems(data.items);
  }

  useEffect(() => {
    let live = true;
    Promise.all([loadMe(), loadFeed(), loadShop()])
      .catch((e) => live && setError(e.message))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (skipFirstFilterEffect.current) {
      skipFirstFilterEffect.current = false;
      return;
    }
    const t = window.setTimeout(
      () =>
        loadShop(filters).catch((e) => e.name !== "AbortError" && setError(e.message)),
      260
    );
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  async function reloadAll() {
    await Promise.all([loadMe(), loadFeed(), loadShop(filters)]);
  }

  async function afterAuth(nextUser: User) {
    setUser(nextUser);
    setAuthOpen(false);
    setAuthPrompt(qxwapDesignSystem.copy.loginRequired);
    await reloadAll();
  }

  function requireLogin(message: string = qxwapDesignSystem.copy.loginRequired) {
    setAuthPrompt(message);
    setAuthOpen(true);
  }

  async function saveToggle(item: Item) {
    if (!user) return requireLogin("กรุณาเข้าสู่ระบบก่อนเพื่อบันทึกรายการ");
    if (item.viewer.is_bookmarked) await api(`/bookmarks/${item.id}`, { method: "DELETE" });
    else await api("/bookmarks", { method: "POST", body: JSON.stringify({ item_id: item.id }) });
    await reloadAll();
  }

  async function removeItem(item: Item) {
    await api(`/items/${item.id}`, { method: "DELETE" });
    setSelected(null);
    await reloadAll();
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
        user={user}
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
        onProfile={() => {
          setProfileView(null);
          setView("profile");
          setSelected(null);
        }}
        requireLogin={requireLogin}
      />

      <main>
        {error ? (
          <div className="toast" onClick={() => setError("")}>
            {error}
          </div>
        ) : null}
        {loading ? <div className="empty">กำลังโหลด QXwap...</div> : null}
        {!loading && profileView ? (
          <Profile
            user={user}
            viewedUser={profileView}
            requireLogin={requireLogin}
            onAuth={afterAuth}
            onReload={reloadAll}
            items={allItems}
            openItem={setSelected}
            openInbox={(tab = "offers") => {
              setInboxTab(tab);
              setProfileView(null);
              setView("inbox");
            }}
          />
        ) : null}
        {!loading && !profileView && selected ? (
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
        {!loading && !profileView && !selected && view === "feed" ? (
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
          />
        ) : null}
        {!loading && !profileView && !selected && view === "shop" ? (
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
          />
        ) : null}
        {!loading && !profileView && !selected && view === "add" ? (
          <AddProduct
            onDone={(item: Item) => {
              setEditingItem(null);
              setSelected(item);
              reloadAll();
            }}
            user={user}
            requireLogin={requireLogin}
            editingItem={editingItem}
          />
        ) : null}
        {!loading && !profileView && !selected && view === "inbox" ? (
          <InboxPage
            user={user}
            requireLogin={requireLogin}
            items={allItems}
            openItem={setSelected}
            openProfile={(p) => setProfileView(p)}
            initialTab={inboxTab}
          />
        ) : null}
        {!loading && !profileView && !selected && view === "profile" ? (
          <Profile
            user={user}
            requireLogin={requireLogin}
            onAuth={afterAuth}
            onReload={reloadAll}
            items={allItems}
            openItem={setSelected}
            openInbox={(tab = "offers") => {
              setInboxTab(tab);
              setView("inbox");
            }}
          />
        ) : null}
        {!loading && !profileView && !selected && view === "wallet" ? (
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
        />
      ) : null}
      {authOpen ? (
        <AuthModal close={() => setAuthOpen(false)} onAuth={afterAuth} message={authPrompt} />
      ) : null}
      {!user && !authOpen ? <AuthNudge requireLogin={requireLogin} /> : null}
    </div>
  );
}
