import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Send } from 'lucide-react'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export default function Chat() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const utils = trpc.useContext()

  const { data: messages } = trpc.chat.messages.useQuery(
    { conversationId: conversationId! },
    { enabled: !!conversationId }
  )

  // SSE real-time updates
  useEffect(() => {
    if (!conversationId || !user) return
    const es = new EventSource(`${API_BASE}/api/sse/chat/${conversationId}`, { withCredentials: true })
    es.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      utils.chat.messages.setData({ conversationId: conversationId! }, (old) => {
        if (!old) return [msg]
        if (old.some((m: any) => m.id === msg.id)) return old
        return [msg, ...old]
      })
    }
    return () => es.close()
  }, [conversationId, user, utils])

  const send = trpc.chat.sendMessage.useMutation()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!user) {
    return (
      <div className="max-w-md mx-auto min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">กรุณาเข้าสู่ระบบ</p>
        <Button className="rounded-full px-8" onClick={() => navigate('/login')}>เข้าสู่ระบบ</Button>
      </div>
    )
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    send.mutate(
      { conversationId: conversationId!, text },
      { onSuccess: () => setText('') }
    )
  }

  const msgs = messages || []

  return (
    <div className="max-w-md mx-auto h-[100dvh] flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 transition">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-gray-900">แชท</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {msgs.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-12">
            เริ่มต้นการสนทนา
          </div>
        )}
        {[...msgs].reverse().map((m: any) => {
          const isMe = m.senderId === user.id
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                isMe
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
              }`}>
                {m.text}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={submit} className="bg-white border-t border-gray-100 p-3 flex gap-2 flex-shrink-0">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="พิมพ์ข้อความ..." className="rounded-full bg-gray-50 border-gray-200 h-11" />
        <Button type="submit" size="icon" className="rounded-full bg-blue-600 hover:bg-blue-700 w-11 h-11 flex-shrink-0" disabled={!text.trim() || send.isPending}>
          <Send size={18} />
        </Button>
      </form>
    </div>
  )
}
