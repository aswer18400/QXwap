import { useNavigate } from 'react-router'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Bell, ArrowLeft } from 'lucide-react'

export default function Notifications() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: notis } = trpc.notification.list.useQuery(undefined, { enabled: !!user })
  const read = trpc.notification.read.useMutation()

  if (!user) {
    return (
      <div className="max-w-md mx-auto min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">กรุณาเข้าสู่ระบบ</p>
        <Button className="rounded-full px-8" onClick={() => navigate('/login')}>เข้าสู่ระบบ</Button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50">
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 transition">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold">การแจ้งเตือน</h1>
      </div>

      <div className="p-4 space-y-2 pb-24">
        {(notis || []).length === 0 && (
          <div className="text-center py-12">
            <Bell size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 text-sm">ไม่มีการแจ้งเตือน</p>
          </div>
        )}
        {(notis || []).map((n: any) => (
          <div
            key={n.id}
            className={`flex items-start gap-3 bg-white rounded-2xl border border-gray-100 p-4 active:bg-gray-50 transition ${n.readAt ? 'opacity-60' : ''}`}
            onClick={() => { if (!n.readAt) read.mutate({ ids: [n.id] }) }}
          >
            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${n.readAt ? 'bg-gray-300' : 'bg-blue-600'}`} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">{n.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
              <p className="text-[10px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleDateString('th-TH')}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
