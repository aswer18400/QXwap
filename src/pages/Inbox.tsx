import { useState } from 'react'
import { useNavigate } from 'react-router'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Check, X, Ban, CheckCircle, ArrowLeft, Inbox as InboxIcon } from 'lucide-react'

export default function Inbox() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tab, setTab] = useState<'received' | 'sent'>('received')
  const utils = trpc.useContext()

  const { data: offers } = trpc.offer.list.useQuery(undefined, { enabled: !!user })

  const accept = trpc.offer.accept.useMutation({ onSuccess: () => utils.offer.list.invalidate() })
  const reject = trpc.offer.reject.useMutation({ onSuccess: () => utils.offer.list.invalidate() })
  const cancel = trpc.offer.cancel.useMutation({ onSuccess: () => utils.offer.list.invalidate() })
  const confirm = trpc.offer.confirm.useMutation({ onSuccess: () => utils.offer.list.invalidate() })

  if (!user) {
    return (
      <div className="max-w-md mx-auto min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">กรุณาเข้าสู่ระบบ</p>
        <Button className="rounded-full px-8" onClick={() => navigate('/login')}>เข้าสู่ระบบ</Button>
      </div>
    )
  }

  const list = tab === 'received' ? (offers?.received || []) : (offers?.sent || [])

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-semibold">รอดำเนินการ</span>
      case 'accepted': return <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-semibold">ตอบรับแล้ว</span>
      case 'rejected': return <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-semibold">ปฏิเสธแล้ว</span>
      case 'cancelled': return <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px] font-semibold">ยกเลิกแล้ว</span>
      case 'confirmed': return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-semibold">ยืนยันแล้ว</span>
      default: return null
    }
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50">
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 transition">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold">ข้อเสนอ</h1>
      </div>

      <div className="p-4">
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab('received')} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${tab === 'received' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            ได้รับ ({offers?.received?.length || 0})
          </button>
          <button onClick={() => setTab('sent')} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${tab === 'sent' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            ส่งแล้ว ({offers?.sent?.length || 0})
          </button>
        </div>

        {list.length === 0 && (
          <div className="text-center py-12">
            <InboxIcon size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 text-sm">ไม่มีข้อเสนอ</p>
          </div>
        )}
        <div className="space-y-3">
          {list.map((o: any) => (
            <div key={o.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-2">
                {statusBadge(o.status)}
                <span className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleDateString('th-TH')}</span>
              </div>
              <p className="text-sm text-gray-700 font-medium mb-1">{o.message || 'ไม่มีข้อความ'}</p>
              <div className="text-xs text-gray-500 mb-3">
                {o.cashAmount ? `เงินสด ${o.cashAmount} บาท ` : ''}
                {o.creditAmount ? `เครดิต ${o.creditAmount}` : ''}
                {!o.cashAmount && !o.creditAmount && 'ไม่มีเงิน/เครดิต'}
              </div>

              {tab === 'received' && o.status === 'pending' && (
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 h-10 font-semibold" onClick={() => accept.mutate({ id: o.id })}>
                    <Check size={14} className="mr-1" /> ตอบรับ
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 rounded-xl h-10 font-semibold" onClick={() => reject.mutate({ id: o.id })}>
                    <X size={14} className="mr-1" /> ปฏิเสธ
                  </Button>
                </div>
              )}
              {tab === 'sent' && o.status === 'pending' && (
                <Button size="sm" variant="outline" className="rounded-xl h-10 font-semibold" onClick={() => cancel.mutate({ id: o.id })}>
                  <Ban size={14} className="mr-1" /> ยกเลิก
                </Button>
              )}
              {tab === 'received' && o.status === 'accepted' && (
                <Button size="sm" className="rounded-xl bg-blue-600 hover:bg-blue-700 h-10 font-semibold" onClick={() => confirm.mutate({ id: o.id })}>
                  <CheckCircle size={14} className="mr-1" /> ยืนยัน
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
