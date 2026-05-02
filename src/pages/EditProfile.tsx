import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Camera, ArrowLeft } from 'lucide-react'
import { getApiUrl } from '@/lib/apiBase'

export default function EditProfile() {
  const navigate = useNavigate()
  const { user, refetch } = useAuth()
  const { data: me } = trpc.profile.me.useQuery(undefined, { enabled: !!user })
  const update = trpc.profile.updateMe.useMutation({ onSuccess: () => { refetch(); navigate('/profile') } })

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [city, setCity] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (me?.profile) {
      setDisplayName(me.profile.displayName || '')
      setUsername(me.profile.username || '')
      setCity(me.profile.city || '')
      setBio(me.profile.bio || '')
      setAvatarUrl(me.profile.avatarUrl || '')
    }
  }, [me])

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const form = new FormData()
    form.append('images', file)
    try {
      const res = await fetch(getApiUrl('/api/upload'), { method: 'POST', body: form, credentials: 'include' })
      const data = await res.json()
      if (data.urls?.[0]) setAvatarUrl(data.urls[0])
    } catch {
      alert('อัปโหลดไม่สำเร็จ')
    } finally {
      setUploading(false)
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    update.mutate({ displayName, username, city, bio, avatarUrl })
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50">
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 transition">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold">แก้ไขโปรไฟล์</h1>
      </div>

      <form onSubmit={submit} className="p-4 space-y-5 pb-28">
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-blue-100 overflow-hidden flex items-center justify-center text-blue-600 text-2xl font-black border-4 border-white shadow-md">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>{(displayName?.[0] || user?.email?.[0] || '?').toUpperCase()}</span>
              )}
            </div>
            <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-md cursor-pointer active:scale-90 transition">
              <Camera size={14} className="text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
            </label>
          </div>
        </div>
        {uploading && <p className="text-center text-xs text-gray-400">กำลังอัปโหลด...</p>}

        <div>
          <Label className="text-sm font-semibold text-gray-900 mb-1.5 block">ชื่อที่แสดง</Label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="rounded-xl h-12 bg-white border-gray-200" />
        </div>
        <div>
          <Label className="text-sm font-semibold text-gray-900 mb-1.5 block">ชื่อผู้ใช้</Label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@username" className="rounded-xl h-12 bg-white border-gray-200" />
        </div>
        <div>
          <Label className="text-sm font-semibold text-gray-900 mb-1.5 block">เมือง</Label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="เช่น กรุงเทพฯ" className="rounded-xl h-12 bg-white border-gray-200" />
        </div>
        <div>
          <Label className="text-sm font-semibold text-gray-900 mb-1.5 block">เกี่ยวกับฉัน</Label>
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="เล่าเกี่ยวกับตัวคุณ..." className="rounded-xl bg-white border-gray-200 min-h-[100px]" />
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 max-w-md mx-auto">
          <Button type="submit" className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-base font-bold shadow-lg shadow-blue-600/20" disabled={update.isPending}>
            {update.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </div>
      </form>
    </div>
  )
}
