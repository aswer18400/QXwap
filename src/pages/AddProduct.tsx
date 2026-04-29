import { useState, useRef } from 'react'
import { useNavigate } from 'react-router'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Camera, X, ArrowLeft } from 'lucide-react'

const DEAL_TYPES = [
  { key: 'swap', label: 'แลก', sub: 'แลกเปลี่ยน', icon: '🔁', color: 'border-purple-200 bg-purple-50 text-purple-700' },
  { key: 'sell', label: 'ขาย', sub: 'ขายสินค้า', icon: '💰', color: 'border-green-200 bg-green-50 text-green-700' },
  { key: 'buy', label: 'ต้องการซื้อ', sub: 'ประกาศหาซื้อ', icon: '🛒', color: 'border-blue-200 bg-blue-50 text-blue-700' },
  { key: 'both', label: 'ขายหรือแลก', sub: 'ได้ทั้งสองแบบ', icon: '💱', color: 'border-amber-200 bg-amber-50 text-amber-700' },
]

const CATEGORIES = ['Electronics','Fashion','Home','Sports','Vehicles','Collectibles','Books','Beauty','Toys','Other']
const CONDITIONS = ['New','Like new','Good','Used']

export default function AddProduct() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  const [dealType, setDealType] = useState('swap')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [condition, setCondition] = useState('')
  const [locationLabel, setLocationLabel] = useState('')
  const [priceCash, setPriceCash] = useState('')
  const [priceCredit, setPriceCredit] = useState('')
  const [openToOffers, setOpenToOffers] = useState(false)
  const [wantedTags, setWantedTags] = useState<string[]>([''])
  const [wantedText, setWantedText] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  const createItem = trpc.item.create.useMutation({
    onSuccess: () => { navigate('/') },
  })

  if (!user) {
    return (
      <div className="max-w-md mx-auto min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">กรุณาเข้าสู่ระบบเพื่อโพสต์สินค้า</p>
        <Button className="rounded-full px-8" onClick={() => navigate('/login')}>เข้าสู่ระบบ</Button>
      </div>
    )
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !files.length) return
    setUploading(true)
    const form = new FormData()
    for (let i = 0; i < files.length; i++) form.append('images', files[i])
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (data.urls) setImages((prev) => [...prev, ...data.urls])
    } catch {
      alert('อัปโหลดรูปไม่สำเร็จ')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    createItem.mutate({
      title,
      description,
      category,
      condition,
      dealType,
      priceCash: priceCash ? Number(priceCash) : undefined,
      priceCredit: priceCredit ? Number(priceCredit) : undefined,
      openToOffers,
      wantedText,
      wantedTags: wantedTags.filter(Boolean),
      locationLabel,
      images,
    })
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 transition">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold">โพสต์สินค้า</h1>
      </div>

      <form onSubmit={submit} className="p-4 space-y-5 pb-28">
        {/* Deal type */}
        <div>
          <Label className="text-sm font-semibold text-gray-900 mb-3 block">เลือกประเภท</Label>
          <div className="grid grid-cols-2 gap-3">
            {DEAL_TYPES.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => setDealType(d.key)}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition ${dealType === d.key ? d.color.replace('bg-', 'ring-2 ring-offset-1 ring-') + ' ' + d.color : 'border-gray-200 bg-white'}`}
              >
                <span className="text-3xl mb-1">{d.icon}</span>
                <span className="text-sm font-bold">{d.label}</span>
                <span className="text-[10px] text-gray-500 mt-0.5">{d.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Images */}
        <div>
          <Label className="text-sm font-semibold text-gray-900 mb-3 block">รูปภาพ</Label>
          <div className="flex gap-2 flex-wrap">
            {images.map((url, idx) => (
              <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => setImages(images.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5">
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-20 h-20 flex flex-col items-center justify-center bg-white border-2 border-dashed border-gray-200 rounded-xl text-gray-400 active:bg-gray-50 transition"
            >
              <Camera size={20} />
              <span className="text-[10px] mt-1">{uploading ? 'กำลัง...' : 'เพิ่ม'}</span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
          </div>
        </div>

        {/* Title */}
        <div>
          <Label className="text-sm font-semibold text-gray-900 mb-1.5 block">ชื่อสินค้า</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="เช่น iPhone 14 Pro" className="rounded-xl h-12 bg-white border-gray-200" />
        </div>

        {/* Description */}
        <div>
          <Label className="text-sm font-semibold text-gray-900 mb-1.5 block">รายละเอียด</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="อธิบายสินค้าของคุณ..." className="rounded-xl bg-white border-gray-200 min-h-[100px]" />
        </div>

        {/* Category */}
        <div>
          <Label className="text-sm font-semibold text-gray-900 mb-2 block">หมวดหมู่</Label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button key={c} type="button" onClick={() => setCategory(c)} className={`px-4 py-2 rounded-full text-sm font-medium border transition ${category === c ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}>{c}</button>
            ))}
          </div>
        </div>

        {/* Condition */}
        <div>
          <Label className="text-sm font-semibold text-gray-900 mb-2 block">สภาพสินค้า</Label>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map((c) => (
              <button key={c} type="button" onClick={() => setCondition(c)} className={`px-4 py-2 rounded-full text-sm font-medium border transition ${condition === c ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}>{c}</button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div>
          <Label className="text-sm font-semibold text-gray-900 mb-1.5 block">สถานที่</Label>
          <Input value={locationLabel} onChange={(e) => setLocationLabel(e.target.value)} placeholder="เช่น กรุงเทพฯ" className="rounded-xl h-12 bg-white border-gray-200" />
        </div>

        {/* Price */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-sm font-semibold text-gray-900 mb-1.5 block">ราคาเงินสด (บาท)</Label>
            <Input type="number" value={priceCash} onChange={(e) => setPriceCash(e.target.value)} placeholder="เว้นว่างได้" className="rounded-xl h-12 bg-white border-gray-200" />
          </div>
          <div>
            <Label className="text-sm font-semibold text-gray-900 mb-1.5 block">เครดิต</Label>
            <Input type="number" value={priceCredit} onChange={(e) => setPriceCredit(e.target.value)} placeholder="เว้นว่างได้" className="rounded-xl h-12 bg-white border-gray-200" />
          </div>
        </div>

        {/* Open to offers */}
        <label className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-200 cursor-pointer active:bg-gray-50 transition">
          <input type="checkbox" checked={openToOffers} onChange={(e) => setOpenToOffers(e.target.checked)} className="w-5 h-5 rounded accent-blue-600" />
          <div>
            <p className="text-sm font-semibold text-gray-900">เปิดกว้างทุกข้อเสนอ</p>
            <p className="text-xs text-gray-500">รับข้อเสนอทุกรูปแบบ</p>
          </div>
        </label>

        {/* Wanted tags */}
        <div>
          <Label className="text-sm font-semibold text-gray-900 mb-2 block">อยากได้ (แท็ก)</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {wantedTags.filter(Boolean).map((tag, idx) => (
              <span key={idx} className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm font-medium">
                {tag}
                <button type="button" onClick={() => setWantedTags(wantedTags.filter((_, i) => i !== idx))}><X size={12} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="พิมพ์แล้วกด Enter"
              className="rounded-xl bg-white border-gray-200"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const val = e.currentTarget.value.trim()
                  if (val && !wantedTags.includes(val)) {
                    setWantedTags([...wantedTags.filter(Boolean), val])
                    e.currentTarget.value = ''
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Wanted description */}
        <div>
          <Label className="text-sm font-semibold text-gray-900 mb-1.5 block">รายละเอียดสิ่งที่อยากได้</Label>
          <Textarea value={wantedText} onChange={(e) => setWantedText(e.target.value)} placeholder="เช่น อยากได้ MacBook Air M2..." className="rounded-xl bg-white border-gray-200" />
        </div>

        {/* Submit */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 max-w-md mx-auto">
          <Button type="submit" className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-base font-bold shadow-lg shadow-blue-600/20 active:scale-[0.98] transition" disabled={createItem.isPending || !title.trim()}>
            {createItem.isPending ? 'กำลังโพสต์...' : 'โพสต์สินค้า'}
          </Button>
        </div>
      </form>
    </div>
  )
}
