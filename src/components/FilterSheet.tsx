import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const CATEGORIES = ['Electronics','Fashion','Home','Sports','Vehicles','Collectibles','Books','Beauty','Toys','Other']
const DEAL_TYPES = ['swap','sell','buy','both']
const CONDITIONS = ['New','Like new','Good','Used']
const SORTS = [
  { value: 'newest', label: 'ใหม่ล่าสุด' },
  { value: 'nearby', label: 'ใกล้ที่สุด' },
  { value: 'price_asc', label: 'ราคาต่ำไปสูง' },
  { value: 'price_desc', label: 'ราคาสูงไปต่ำ' },
  { value: 'most_requested', label: 'มีคนขอมากสุด' },
]

export default function FilterSheet({ open, onClose, onApply, initialFilters }: { open: boolean; onClose: () => void; onApply: (f: any) => void; initialFilters?: Record<string, any> }) {
  const [category, setCategory] = useState('')
  const [dealType, setDealType] = useState('')
  const [condition, setCondition] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [openToOffers, setOpenToOffers] = useState(false)
  const [sort, setSort] = useState('newest')
  const [nearbyRadius, setNearbyRadius] = useState('')
  const [following, setFollowing] = useState(false)

  useEffect(() => {
    if (initialFilters) {
      setCategory(initialFilters.category || '')
      setDealType(initialFilters.dealType || '')
      setCondition(initialFilters.condition || '')
      setMinPrice(initialFilters.minPrice?.toString() || '')
      setMaxPrice(initialFilters.maxPrice?.toString() || '')
      setOpenToOffers(!!initialFilters.openToOffers)
      setSort(initialFilters.sort || 'newest')
      setNearbyRadius(initialFilters.nearbyRadiusKm?.toString() || '')
      setFollowing(!!initialFilters.following)
    }
  }, [initialFilters, open])

  const activeCount = [
    category, dealType, condition, minPrice, maxPrice, openToOffers, sort !== 'newest', nearbyRadius, following
  ].filter(Boolean).length

  const apply = () => {
    onApply({
      category: category || undefined,
      dealType: dealType || undefined,
      condition: condition || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      openToOffers: openToOffers || undefined,
      sort: sort || undefined,
      nearbyRadiusKm: nearbyRadius ? Number(nearbyRadius) : undefined,
      following: following || undefined,
    })
    onClose()
  }

  const clear = () => {
    setCategory('')
    setDealType('')
    setCondition('')
    setMinPrice('')
    setMaxPrice('')
    setOpenToOffers(false)
    setSort('newest')
    setNearbyRadius('')
    setFollowing(false)
    onApply({})
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-2xl flex flex-col" style={{ maxHeight: '88vh' }}>
        <SheetHeader className="flex-shrink-0">
          <SheetTitle>ตัวกรอง {activeCount > 0 && <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">{activeCount}</span>}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto mt-4 space-y-5 pb-4">
          <div>
            <Label>หมวดหมู่</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setCategory(category === c ? '' : c)} className={`px-3 py-1.5 rounded-full text-xs border ${category === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}>{c}</button>
              ))}
            </div>
          </div>

          <div>
            <Label>ประเภทดีล</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {DEAL_TYPES.map(d => (
                <button key={d} onClick={() => setDealType(dealType === d ? '' : d)} className={`px-3 py-1.5 rounded-full text-xs border ${dealType === d ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}>
                  {d === 'swap' ? 'แลก' : d === 'sell' ? 'ขาย' : d === 'buy' ? 'ต้องการซื้อ' : 'ขายหรือแลก'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>สภาพสินค้า</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {CONDITIONS.map(c => (
                <button key={c} onClick={() => setCondition(condition === c ? '' : c)} className={`px-3 py-1.5 rounded-full text-xs border ${condition === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}>{c}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>ราคาต่ำสุด</Label>
              <Input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} className="rounded-xl" />
            </div>
            <div>
              <Label>ราคาสูงสุด</Label>
              <Input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="rounded-xl" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="open" checked={openToOffers} onChange={e => setOpenToOffers(e.target.checked)} />
            <Label htmlFor="open" className="mb-0">เปิดกว้างทุกข้อเสนอ</Label>
          </div>

          <div>
            <Label>ระยะห่าง (กม.)</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {['3','5','10','15','20','30','50'].map(r => (
                <button key={r} onClick={() => setNearbyRadius(nearbyRadius === r ? '' : r)} className={`px-3 py-1.5 rounded-full text-xs border ${nearbyRadius === r ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}>{r} กม.</button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="following" checked={following} onChange={e => setFollowing(e.target.checked)} />
            <Label htmlFor="following" className="mb-0">เฉพาะคนที่ติดตาม</Label>
          </div>

          <div>
            <Label>เรียงตาม</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {SORTS.map(s => (
                <button key={s.value} onClick={() => setSort(s.value)} className={`px-3 py-1.5 rounded-full text-xs border ${sort === s.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}>{s.label}</button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={clear}>ล้างตัวกรอง</Button>
            <Button className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700" onClick={apply}>ใช้ตัวกรอง</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
