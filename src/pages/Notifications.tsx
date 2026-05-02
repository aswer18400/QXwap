import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Bell, ArrowLeft, BellOff } from 'lucide-react'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const arr = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i)
  return arr.buffer
}

export default function Notifications() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: notis } = trpc.notification.list.useQuery(undefined, { enabled: !!user })
  const read = trpc.notification.read.useMutation()

  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [pushLoading, setPushLoading] = useState(false)

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setPushPermission('unsupported')
    } else {
      setPushPermission(Notification.permission)
    }
  }, [])

  async function enablePush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    setPushLoading(true)
    try {
      const permission = await Notification.requestPermission()
      setPushPermission(permission)
      if (permission !== 'granted') return

      const res = await fetch(`${API_BASE}/api/push/vapid-public-key`, { credentials: 'include' })
      const { key } = await res.json()

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      })

      const json = sub.toJSON()
      await fetch(`${API_BASE}/api/push/subscribe`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      })
    } finally {
      setPushLoading(false)
    }
  }

  async function disablePush() {
    if (!('serviceWorker' in navigator)) return
    setPushLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch(`${API_BASE}/api/push/subscribe`, {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setPushPermission('default')
    } finally {
      setPushLoading(false)
    }
  }

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
        <h1 className="text-lg font-bold flex-1">การแจ้งเตือน</h1>

        {/* Push notification toggle */}
        {pushPermission !== 'unsupported' && (
          pushPermission === 'granted' ? (
            <button
              onClick={disablePush}
              disabled={pushLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-medium active:bg-blue-100 transition"
            >
              <Bell size={14} />
              เปิดอยู่
            </button>
          ) : (
            <button
              onClick={enablePush}
              disabled={pushLoading || pushPermission === 'denied'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium active:bg-gray-200 transition disabled:opacity-50"
            >
              <BellOff size={14} />
              {pushPermission === 'denied' ? 'ถูกบล็อก' : 'เปิดรับแจ้งเตือน'}
            </button>
          )
        )}
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
