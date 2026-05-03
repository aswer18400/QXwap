import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/hooks/useAuth'
import { Input } from '@/components/ui/input'
import { Search, SlidersHorizontal, Bookmark, BookmarkCheck, Bell } from 'lucide-react'
import FilterSheet from '@/components/FilterSheet'

const FEED_TABS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'following', label: 'Following' },
  { key: 'nearby', label: 'ใกล้ฉัน' },
  { key: 'fast', label: 'ตอบไว' },
]

export default function Feed() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [filters, setFilters] = useState<Record<string, any>>({})

  const tabFilters = useMemo(() => {
    if (activeTab === 'following') return { following: true }
    if (activeTab === 'fast') return { fastResponder: true }
    return {}
  }, [activeTab])

  const { data: items, isLoading } = trpc.item.list.useQuery(
    { status: 'active', q: search || undefined, ...tabFilters, ...filters, limit: 50, offset: 0 },
    { enabled: true }
  )

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
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 pt-3 pb-2">
        {/* Search row */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาของ ร้าน หรือหมวดที่อยากแลก"
              className="pl-10 h-11 rounded-full bg-gray-50 border-gray-200 text-sm focus-visible:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowFilter(true)}
            className="relative w-11 h-11 flex items-center justify-center rounded-full border border-gray-200 active:bg-gray-50"
          >
            <SlidersHorizontal size={18} className="text-gray-600" />
            {Object.keys(filters).length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full" />
            )}
          </button>
        </div>

        {/* Tab chips */}
        <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1">
          {FEED_TABS.map((tab) => (
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

      {/* Discover feed heading */}
      <div className="px-4 pt-4 pb-1">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Discover feed</h2>
      </div>

      {/* Feed cards */}
      <div className="px-4 space-y-5 pb-24">
        {isLoading && (
          <div className="flex justify-center py-10 text-blue-600 text-sm">กำลังโหลด...</div>
        )}
        {!isLoading && (items || []).length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">ยังไม่มีรายการ</div>
        )}
        {(items || []).map((it: any) => (
          <div
            key={it.id}
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm cursor-pointer select-none"
            onClick={() => navigate(`/item/${it.id}`)}
          >
            {/* Image section with overlays */}
            <div className="relative">
              <div className="w-full aspect-[4/3] bg-gray-100">
                {it.images?.[0]?.url ? (
                  <img src={it.images[0].url} alt={it.title} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">ไม่มีรูป</div>
                )}
              </div>

              {/* Overlay pills */}
              <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
                <span className="px-3 py-1 bg-white/90 rounded-full text-xs font-semibold text-gray-700">
                  มืออยู่
                </span>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-white/90 rounded-full text-xs font-medium text-gray-700">
                    อยากได้ · {it.openToOffers ? 'เปิดรับข้อเสนอ' : it.wantedTags?.[0] || 'แลกได้'}
                  </span>
                  <button
                    onClick={(e) => toggleBookmark(e, it.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/90 active:opacity-70 transition-opacity"
                  >
                    {bookmarkIds.has(it.id) ? (
                      <BookmarkCheck size={16} className="text-blue-600" />
                    ) : (
                      <Bookmark size={16} className="text-gray-500" />
                    )}
                  </button>
                </div>
              </div>

              {/* Offer button overlay */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (!user) { navigate('/login'); return }
                  navigate(`/item/${it.id}`)
                }}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-2.5 bg-gray-900/80 text-white rounded-full text-sm font-semibold active:opacity-80 transition-opacity"
              >
                <Bell size={14} />
                ข้อเสนอ
              </button>
            </div>

            {/* Info section */}
            <div className="p-4">
              <p className="text-xs text-gray-500 mb-1">
                {it.owner?.profile?.username || it.owner?.email || 'ผู้ใช้'} · {it.locationLabel || 'Bangkok'}
              </p>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{it.title}</h3>
              <div className="flex items-center justify-between">
                <span className="text-blue-600 font-bold text-sm">
                  {it.openToOffers ? 'เปิดรับ Xwap' : it.priceCash ? `฿${it.priceCash}` : it.priceCredit ? `${it.priceCredit} เครดิต` : 'เปิดรับ Xwap'}
                </span>
                <span className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600 font-medium">
                  {it.requestCount || 0} คนขอแลก
                </span>
              </div>

              {/* Wanted tags */}
              {it.wantedTags && it.wantedTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {it.wantedTags.slice(0, 3).map((tag: string) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-[10px] font-medium"
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

      <FilterSheet open={showFilter} onClose={() => setShowFilter(false)} onApply={setFilters} initialFilters={filters} />
    </div>
  )
}
