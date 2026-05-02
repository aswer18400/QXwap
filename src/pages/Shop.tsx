import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/hooks/useAuth'
import { Input } from '@/components/ui/input'
import { Search, Bookmark, BookmarkCheck } from 'lucide-react'

const SHOP_TABS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'buy', label: 'ซื้อได้เลย' },
  { key: 'xwap', label: 'Xwap ได้' },
]

const CATEGORIES = [
  { name: 'ทั้งหมด', icon: '🔍' },
  { name: 'แม่และเด็ก', icon: '🍼' },
  { name: 'Gadget', icon: '⌚' },
  { name: 'เสื้อผ้า', icon: '👕' },
  { name: 'กีฬา', icon: '⚽' },
  { name: 'บ้าน', icon: '🏠' },
  { name: 'หนังสือ', icon: '📚' },
  { name: 'ความงาม', icon: '💄' },
]

export default function Shop() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [activeCategory, setActiveCategory] = useState('ทั้งหมด')
  const sentinelRef = useRef<HTMLDivElement>(null)

  const wantedTagFromUrl = searchParams.get('wantedTag') || undefined

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.item.list.useInfiniteQuery(
      {
        q: search || undefined,
        category: activeCategory !== 'ทั้งหมด' ? activeCategory : undefined,
        wantedTag: wantedTagFromUrl,
        limit: 20,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        initialCursor: undefined,
      }
    )

  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const { data: bookmarksData } = trpc.bookmark.list.useQuery(undefined, { enabled: !!user })
  const bookmarkIds = useMemo(() => new Set((bookmarksData || []).map((b: any) => b.id)), [bookmarksData])

  const utils = trpc.useContext()
  const addBookmark = trpc.bookmark.create.useMutation({
    onSuccess: () => utils.bookmark.list.invalidate(),
  })
  const removeBookmark = trpc.bookmark.delete.useMutation({
    onSuccess: () => utils.bookmark.list.invalidate(),
  })

  const toggleBookmark = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation()
    if (!user) { navigate('/login'); return }
    if (bookmarkIds.has(itemId)) {
      removeBookmark.mutate({ itemId })
    } else {
      addBookmark.mutate({ itemId })
    }
  }

  return (
    <div className="max-w-md mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">สินค้าทั้งหมด</h1>
          <button className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 active:bg-gray-50">
            <Search size={18} className="text-gray-600" />
          </button>
        </div>

        {/* Search bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาสินค้า..."
            className="pl-10 h-11 rounded-full bg-gray-50 border-gray-200 text-sm focus-visible:ring-blue-500"
          />
        </div>

        {/* Shop tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {SHOP_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition ${
                activeTab === tab.key
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category horizontal scroll */}
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-lg font-bold text-gray-900 mb-3">หมวดหมู่</h2>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className={`flex-shrink-0 flex flex-col items-center gap-2 px-4 py-3 rounded-2xl border transition min-w-[72px] ${
                activeCategory === cat.name
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-white border-gray-100'
              }`}
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-xs font-medium text-gray-700 whitespace-nowrap">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Product grid */}
      <div className="px-4 pb-24">
        {isLoading && <div className="text-center py-10 text-gray-400 text-sm">กำลังโหลด...</div>}
        {!isLoading && items.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">ไม่พบสินค้า</div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {items.map((it: any) => (
            <div
              key={it.id}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden active:scale-[0.98] transition-transform shadow-sm"
              onClick={() => navigate(`/item/${it.id}`)}
            >
              {/* Image */}
              <div className="relative">
                <div className="w-full aspect-square bg-gray-100">
                  {it.images?.[0]?.url ? (
                    <img src={it.images[0].url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">ไม่มีรูป</div>
                  )}
                </div>
                {/* Swap badge */}
                <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 text-white text-[10px] font-medium rounded-full">
                  แลกได้
                </span>
                {/* Bookmark */}
                <button
                  onClick={(e) => toggleBookmark(e, it.id)}
                  className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm active:scale-90 transition"
                >
                  {bookmarkIds.has(it.id) ? (
                    <BookmarkCheck size={14} className="text-blue-600" />
                  ) : (
                    <Bookmark size={14} className="text-gray-500" />
                  )}
                </button>
              </div>

              {/* Info */}
              <div className="p-3">
                <h3 className="text-sm font-bold text-gray-900 truncate mb-1">{it.title}</h3>
                <p className="text-blue-600 font-bold text-sm mb-1">
                  {it.openToOffers ? 'เปิดรับ Xwap' : it.priceCash ? `฿${it.priceCash}` : it.priceCredit ? `${it.priceCredit} เครดิต` : 'เปิดรับ Xwap'}
                </p>
                <p className="text-[11px] text-gray-400 mb-2">
                  {it.locationLabel || 'Bangkok'} · {it.viewCount || 0} คนสนใจ
                  {it.distanceKm != null && ` · ${it.distanceKm} km`}
                </p>
                {it.wantedTags && it.wantedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {it.wantedTags.slice(0, 2).map((tag: string) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px]"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/shop?wantedTag=${encodeURIComponent(tag)}`)
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-1 mt-2" />
        {isFetchingNextPage && (
          <div className="text-center py-4 text-gray-400 text-sm">กำลังโหลดเพิ่มเติม...</div>
        )}
      </div>
    </div>
  )
}
