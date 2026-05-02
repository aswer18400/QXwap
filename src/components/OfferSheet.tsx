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
  const utils = trpc.useContext()

  const myItemsQuery = trpc.item.list.useQuery({ ownerId: user?.id, limit: 50 }, { enabled: !!user })
  const myItems = { data: myItemsQuery.data?.items }
  const [selectedItems, setSelectedItems] = useState<string[]>([])

  const createOffer = trpc.offer.create.useMutation({
    onSuccess: () => {
      utils.offer.list.invalidate()
      onClose()
    },
  })

  const submit = () => {
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
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>ส่งข้อเสนอ</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4 overflow-y-auto pb-10">
          <div className="bg-gray-50 rounded-xl p-3 text-sm">
            <p className="font-medium">{item.title}</p>
            <p className="text-gray-500 text-xs">ของ {item.owner?.profile?.displayName || item.owner?.email}</p>
          </div>

          <div>
            <label className="text-sm text-gray-600">ข้อความ</label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="เขียนข้อเสนอ..." className="rounded-xl" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600">เงินสด (บาท)</label>
              <Input type="number" value={cash} onChange={(e) => setCash(e.target.value)} className="rounded-xl" />
            </div>
            <div>
              <label className="text-sm text-gray-600">เครดิต</label>
              <Input type="number" value={credit} onChange={(e) => setCredit(e.target.value)} className="rounded-xl" />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-600">เลือกสินค้าของคุณ (ถ้ามี)</label>
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
              {(myItems.data || []).map((it: any) => (
                <label key={it.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-2">
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(it.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedItems([...selectedItems, it.id])
                      else setSelectedItems(selectedItems.filter((id) => id !== it.id))
                    }}
                  />
                  <div className="w-10 h-10 bg-gray-200 rounded-lg overflow-hidden">
                    {it.images?.[0]?.url && <img src={it.images[0].url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <span className="text-sm truncate">{it.title}</span>
                </label>
              ))}
              {!myItems.data?.length && <p className="text-xs text-gray-400">คุณยังไม่มีสินค้า สามารถส่งข้อเสนอด้วยข้อความ/เงิน/เครดิตได้</p>}
            </div>
          </div>

          <Button className="w-full rounded-xl bg-blue-600 hover:bg-blue-700" onClick={submit} disabled={createOffer.isPending}>
            {createOffer.isPending ? 'กำลังส่ง...' : 'ส่งข้อเสนอ'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
