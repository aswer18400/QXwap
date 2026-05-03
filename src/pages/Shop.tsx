import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/hooks/useAuth'
import { Input } from '@/components/ui/input'
import { Search, SlidersHorizontal, Bookmark, BookmarkCheck } from 'lucide-react'
import FilterSheet from '@/components/FilterSheet'

const SHOP_TABS = [
  { key: 'all', label: 'ทั้งหมด', dealType: undefined },
  { key: 'buy', label: 'ซื้อได้เลย', dealType: 'sell' },
  { key: 'xwap', label: 'Xwap ได้', dealType: 'swap' },
]

const CATEGORIES = [
  { name: 'ทั้งหมด', icon: '🔍' },
  { name: 'Gadget', icon: '⌚' },
  { name: 'Fashion', icon: '👕' },
  { name: 'Sports', icon: '⚽' },
  { name: 'Home', icon: '🏠' },
  { name: 'Books', icon: '📚' },
  { name: 'Beauty', icon: '💄' },
  { name: 'Electronics', icon: '💻' },
  { name: 'Toys', icon: '🧸' },
  { name: 'Other', icon: '📦' },
]

export default function Shop() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [activeCategory, setActiveCategory] = useState('ทั้งหมด')
  const [showFilter, setShowFilter] = useState(false)
  const [filters, setFilters] = useState<Record<string, any>>({})

  const wantedTagFromUrl = searchParams.get('wantedTag')

  useEffect(() => {
    if (wantedTagFromUrl) {
      setFilters((prev) => ({ ...prev, wantedTag: wantedTagFromUrl }))
    }
  }, [wantedTagFromUrl])

  const tabDealType = useMemo(() => {
    return SHOP_TABS.find((t) => t.key === activeTab)?.dealType
  }, [activeTab])

  const categoryFilter = activeCategory !== 'ทั้งหมด' ? activeCategory : undefined

  const { data, isLoading } = trpc.item.list.useQuery(
    {
      q: search || undefined,
      category: categoryFilter,
      dealType: tabDealType,
      ...filters,
      limit: 50,
    },
    { enabled: true }
  )
  const items = data || []

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

  const activeFilterCount = Object.keys(filters).length + (wantedTagFromUrl ? 1 : 0)

  return (
    <div className="max-w-md mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">สินค้าทั้งหมด</h1>
          <button
            onClick={() => setShowFilter(true)}
            className="relative w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 active:bg-gray-50"
          >
            <SlidersHorizontal size={18} className="text-gray-600" />
            {activeFilterCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full" />
            )}
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
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className={`flex-shrink-0 flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl border transition min-w-[68px] ${
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

      {/* Wanted tag chip */}
      {wantedTagFromUrl && (
        <div className="px-4 pb-2 flex items-center gap-2">
          <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
            อยากได้: {wantedTagFromUrl}
          </span>
          <button
            onClick={() => {
              setFilters((prev) => { const f = { ...prev }; delete f.wantedTag; return f })
              navigate('/shop', { replace: true })
            }}
            className="text-gray-400 active:opacity-60"
          >
            <span className="text-xs">✕ ล้าง</span>
          </button>
        </div>
      )}

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
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm cursor-pointer select-none"
              onClick={() => navigate(`/item/${it.id}`)}
            >
              {/* Image */}
              <div className="relative">
                <div className="w-full aspect-square bg-gray-100">
                  {it.images?.[0]?.url ? (
                    <img src={it.images[0].url} alt={it.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">ไม่มีรูป</div>
                  )}
                </div>
                {/* Deal badge */}
                <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 text-white text-[10px] font-medium rounded-full">
                  {it.dealType === 'swap' ? 'แลก' : it.dealType === 'sell' ? 'ขาย' : it.dealType === 'buy' ? 'ต้องการซื้อ' : 'ขาย/แลก'}
                </span>
                {/* Bookmark */}
                <button
                  onClick={(e) => toggleBookmark(e, it.id)}
                  className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-white/90 active:opacity-70 transition-opacity"
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
      </div>

      <FilterSheet
        open={showFilter}
        onClose={() => setShowFilter(false)}
        onApply={setFilters}
        initialFilters={filters}
      />
    </div>
  )
}
