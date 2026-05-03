import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/hooks/useAuth'

export default function OfferSheet({ open, onClose, item }: { open: boolean; onClose: () => void; item: any }) {
  const { user } = useAuth()
  const [message, setMessage] = useState('')
  const [cash, setCash] = useState('')
  const [credit, setCredit] = useState('')
  const [error, setError] = useState('')
  const utils = trpc.useContext()

  const myItems = trpc.item.list.useQuery(
    { ownerId: user?.id, limit: 50 },
    { enabled: !!user && open }
  )
  const [selectedItems, setSelectedItems] = useState<string[]>([])

  const createOffer = trpc.offer.create.useMutation({
    onSuccess: () => {
      utils.offer.list.invalidate()
      setMessage('')
      setCash('')
      setCredit('')
      setSelectedItems([])
      setError('')
      onClose()
    },
    onError: (err) => {
      setError(err.message || 'ส่งข้อเสนอไม่สำเร็จ')
    },
  })

  const hasContent = message.trim() || (cash && Number(cash) > 0) || (credit && Number(credit) > 0) || selectedItems.length > 0

  const submit = () => {
    if (!hasContent) {
      setError('กรุณาระบุข้อเสนอ: ข้อความ เงินสด เครดิต หรือเลือกสินค้า')
      return
    }
    setError('')
    createOffer.mutate({
      targetItemId: item.id,
      toUserId: item.ownerId,
      message,
      cashAmount: cash ? Number(cash) : 0,
      creditAmount: credit ? Number(credit) : 0,
      itemIds: selectedItems,
    })
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent side="bottom" className="rounded-t-2xl flex flex-col" style={{ maxHeight: '85vh' }}>
        <SheetHeader className="flex-shrink-0">
          <SheetTitle>ส่งข้อเสนอ</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto mt-4 space-y-4 pb-4">
          <div className="bg-gray-50 rounded-xl p-3 text-sm">
            <p className="font-medium truncate">{item.title}</p>
            <p className="text-gray-500 text-xs">ของ {item.owner?.profile?.displayName || item.owner?.email || 'ผู้ใช้'}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">ข้อความ</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="เขียนข้อเสนอของคุณ..."
              className="rounded-xl"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">เงินสด (บาท)</label>
              <Input
                type="number"
                value={cash}
                onChange={(e) => setCash(e.target.value)}
                placeholder="0"
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">เครดิต</label>
              <Input
                type="number"
                value={credit}
                onChange={(e) => setCredit(e.target.value)}
                placeholder="0"
                className="rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              เลือกสินค้าของคุณ {myItems.data?.length ? `(${myItems.data.length} รายการ)` : ''}
            </label>
            <div className="space-y-2 max-h-44 overflow-y-auto">
              {(myItems.data || []).map((it: any) => (
                <label key={it.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(it.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedItems([...selectedItems, it.id])
                      else setSelectedItems(selectedItems.filter((id) => id !== it.id))
                    }}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <div className="w-10 h-10 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                    {it.images?.[0]?.url && <img src={it.images[0].url} alt="" className="w-full h-full object-cover" loading="lazy" />}
                  </div>
                  <span className="text-sm truncate">{it.title}</span>
                </label>
              ))}
              {!myItems.isPending && !myItems.data?.length && (
                <p className="text-xs text-gray-400 py-2">คุณยังไม่มีสินค้า — ส่งข้อเสนอด้วยข้อความ เงิน หรือเครดิตได้เลย</p>
              )}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}

          <Button
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 h-12 font-semibold"
            onClick={submit}
            disabled={createOffer.isPending}
          >
            {createOffer.isPending ? 'กำลังส่ง...' : 'ส่งข้อเสนอ'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
