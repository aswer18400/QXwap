import { useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Bookmark, BookmarkCheck, ArrowLeft, Pencil, Trash2, MapPin, Tag, Package, Star } from 'lucide-react'
import OfferSheet from '@/components/OfferSheet'

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [showOffer, setShowOffer] = useState(false)
  const [currentImg, setCurrentImg] = useState(0)

  const { data: item, isLoading } = trpc.item.byId.useQuery({ id: id! }, { enabled: !!id })
  const { data: bookmarksData } = trpc.bookmark.list.useQuery(undefined, { enabled: !!user })
  const bookmarkIds = new Set((bookmarksData || []).map((b: any) => b.id))
  const del = trpc.item.delete.useMutation({
    onSuccess: () => { navigate('/') },
  })
  const utils = trpc.useContext()
  const addBookmark = trpc.bookmark.create.useMutation({
    onSuccess: () => utils.bookmark.list.invalidate(),
  })
  const removeBookmark = trpc.bookmark.delete.useMutation({
    onSuccess: () => utils.bookmark.list.invalidate(),
  })

  if (isLoading || !item) {
    return (
      <div className="max-w-md mx-auto min-h-screen flex items-center justify-center text-gray-400">
        <div className="animate-pulse">กำลังโหลด...</div>
      </div>
    )
  }

  const isOwner = user?.id === item.ownerId

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      {/* Image gallery */}
      <div className="relative">
        <div className="w-full aspect-square bg-gray-100">
          {item.images?.[currentImg]?.url ? (
            <img src={item.images[currentImg].url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">ไม่มีรูป</div>
          )}
        </div>

        {/* Top overlay */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-sm active:scale-95 transition">
            <ArrowLeft size={20} />
          </button>
          <div className="flex gap-2">
            {isOwner && (
              <>
                <button onClick={() => navigate(`/add?edit=${item.id}`)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-sm active:scale-95 transition">
                  <Pencil size={18} className="text-gray-600" />
                </button>
                <button onClick={() => { if (confirm('ลบสินค้านี้?')) del.mutate({ id: item.id }) }} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-sm active:scale-95 transition">
                  <Trash2 size={18} className="text-red-500" />
                </button>
              </>
            )}
            <button
              onClick={() => {
                if (!user) { navigate('/login'); return }
                if (bookmarkIds.has(item.id)) removeBookmark.mutate({ itemId: item.id })
                else addBookmark.mutate({ itemId: item.id })
              }}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-sm active:scale-95 transition"
            >
              {bookmarkIds.has(item.id) ? <BookmarkCheck size={18} className="text-blue-600" /> : <Bookmark size={18} />}
            </button>
          </div>
        </div>

        {/* Image dots */}
        {item.images && item.images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {item.images.map((_: any, i: number) => (
              <button key={i} onClick={() => setCurrentImg(i)} className={`w-2 h-2 rounded-full transition ${i === currentImg ? 'bg-white' : 'bg-white/50'}`} />
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${item.dealType === 'swap' ? 'bg-purple-100 text-purple-700' : item.dealType === 'sell' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
              {item.dealType === 'swap' ? 'แลก' : item.dealType === 'sell' ? 'ขาย' : item.dealType === 'buy' ? 'ต้องการซื้อ' : 'ขายหรือแลก'}
            </span>
            {item.condition && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">{item.condition}</span>
            )}
            {item.openToOffers && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">เปิดกว้าง</span>
            )}
          </div>
          <h1 className="text-2xl font-black text-gray-900">{item.title}</h1>
        </div>

        {/* Price */}
        <div className="bg-gray-50 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">ราคา / ข้อเสนอ</p>
              <p className="text-xl font-black text-blue-600">
                {item.openToOffers ? 'เปิดรับข้อเสนอ' : item.priceCash ? `฿${item.priceCash.toLocaleString()}` : item.priceCredit ? `${item.priceCredit} เครดิต` : 'แลกเปลี่ยน'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">หมวดหมู่</p>
              <p className="text-sm font-bold text-gray-700">{item.category || 'ไม่ระบุ'}</p>
            </div>
          </div>
          {(item.priceCash && item.priceCredit) ? (
            <p className="text-sm text-gray-500 mt-2">หรือ {item.priceCredit} เครดิต</p>
          ) : null}
        </div>

        {/* Description */}
        {item.description && (
          <div>
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2"><Package size={16} /> รายละเอียด</h3>
            <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{item.description}</p>
          </div>
        )}

        {/* Wanted */}
        <div className="bg-purple-50 rounded-2xl p-4">
          <h3 className="font-bold text-purple-900 mb-2 flex items-center gap-2"><Star size={16} /> อยากได้</h3>
          <div className="flex flex-wrap gap-2 mb-2">
            {item.wantedTags?.map((tag: string) => (
              <span
                key={tag}
                className="px-3 py-1.5 bg-white text-purple-700 rounded-full text-xs font-medium border border-purple-100 cursor-pointer active:scale-95 transition"
                onClick={() => navigate(`/shop?wantedTag=${encodeURIComponent(tag)}`)}
              >
                {tag}
              </span>
            ))}
          </div>
          {item.wantedText && <p className="text-sm text-purple-800">{item.wantedText}</p>}
          {!item.wantedTags?.length && !item.wantedText && <p className="text-sm text-purple-400">ไม่ระบุ</p>}
        </div>

        {/* Location */}
        {item.locationLabel && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MapPin size={16} className="text-gray-400" />
            {item.locationLabel}
          </div>
        )}

        {/* Category tag */}
        {item.category && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Tag size={16} className="text-gray-400" />
            {item.category}
          </div>
        )}

        {/* Owner */}
        <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
            {(item.owner?.profile?.displayName?.[0] || item.owner?.email?.[0] || '?').toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-900">{item.owner?.profile?.displayName || item.owner?.email || 'ผู้ใช้'}</p>
            <p className="text-xs text-gray-500">{item.owner?.profile?.city || 'ไม่ระบุตำแหน่ง'}</p>
          </div>
        </div>

        {/* CTA */}
        {!isOwner && (
          <Button
            className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-base font-bold shadow-lg shadow-blue-600/20 active:scale-[0.98] transition"
            onClick={() => {
              if (!user) { navigate('/login'); return }
              setShowOffer(true)
            }}
          >
            Xwap ข้อเสนอ
          </Button>
        )}
        {isOwner && (
          <div className="text-center text-sm text-gray-400 py-2 bg-gray-50 rounded-2xl">สินค้าของคุณ</div>
        )}
      </div>

      <OfferSheet open={showOffer} onClose={() => setShowOffer(false)} item={item} />
    </div>
  )
}
