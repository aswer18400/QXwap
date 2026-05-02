import { useNavigate } from 'react-router'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Pencil, LogOut, Wallet, Heart, Package, Settings, ChevronRight } from 'lucide-react'

export default function Profile() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { data: me } = trpc.profile.me.useQuery(undefined, { enabled: !!user })
  const { data: myItemsData } = trpc.item.list.useQuery({ ownerId: user?.id, limit: 50 }, { enabled: !!user })
  const myItems = myItemsData?.items
  const { data: saved } = trpc.bookmark.list.useQuery(undefined, { enabled: !!user })

  if (!user) {
    return (
      <div className="max-w-md mx-auto min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">กรุณาเข้าสู่ระบบเพื่อดูโปรไฟล์</p>
        <Button className="rounded-full px-8" onClick={() => navigate('/login')}>เข้าสู่ระบบ</Button>
      </div>
    )
  }

  const profile = me?.profile

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50">
      {/* Cover */}
      <div className="h-32 bg-blue-600 relative">
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {/* Profile card */}
      <div className="px-4 -mt-12 relative z-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-black border-4 border-white shadow-sm -mt-12">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <span>{(profile?.displayName?.[0] || user.email[0]).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-black text-gray-900">{profile?.displayName || user.email}</h1>
                  <p className="text-sm text-gray-500">@{profile?.username || 'username'}</p>
                </div>
                <button onClick={() => navigate('/edit-profile')} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 transition">
                  <Pencil size={16} className="text-gray-600" />
                </button>
              </div>
              {profile?.bio && <p className="text-sm text-gray-600 mt-2 leading-relaxed">{profile.bio}</p>}
              {profile?.city && <p className="text-xs text-gray-400 mt-1">{profile.city}</p>}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-gray-100">
            <div className="text-center">
              <p className="text-lg font-black text-gray-900">{myItems?.length || 0}</p>
              <p className="text-xs text-gray-500">รายการ</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-gray-900">{saved?.length || 0}</p>
              <p className="text-xs text-gray-500">บันทึก</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-gray-900">0</p>
              <p className="text-xs text-gray-500">เสร็จสิ้น</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-4 mt-4">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <button onClick={() => navigate('/wallet')} className="w-full flex items-center gap-4 p-4 text-left active:bg-gray-50 transition">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Wallet size={18} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">กระเป๋า</p>
              <p className="text-xs text-gray-500">เครดิตและธุรกรรม</p>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </button>
          <div className="h-px bg-gray-100 mx-4" />
          <button onClick={() => {}} className="w-full flex items-center gap-4 p-4 text-left active:bg-gray-50 transition">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <Heart size={18} className="text-red-500" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">รายการบันทึก</p>
              <p className="text-xs text-gray-500">{saved?.length || 0} รายการ</p>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </button>
          <div className="h-px bg-gray-100 mx-4" />
          <button onClick={() => navigate('/')} className="w-full flex items-center gap-4 p-4 text-left active:bg-gray-50 transition">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <Package size={18} className="text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">รายการของฉัน</p>
              <p className="text-xs text-gray-500">{myItems?.length || 0} รายการ</p>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </button>
          <div className="h-px bg-gray-100 mx-4" />
          <button onClick={() => navigate('/notifications')} className="w-full flex items-center gap-4 p-4 text-left active:bg-gray-50 transition">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Settings size={18} className="text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">การตั้งค่า</p>
              <p className="text-xs text-gray-500">แจ้งเตือนและบัญชี</p>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* My listings */}
      <div className="px-4 mt-6 pb-4">
        <h2 className="text-lg font-bold text-gray-900 mb-3">รายการของฉัน</h2>
        <div className="grid grid-cols-2 gap-3">
          {(myItems || []).map((it: any) => (
            <div key={it.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden active:scale-[0.98] transition" onClick={() => navigate(`/item/${it.id}`)}>
              <div className="w-full aspect-square bg-gray-100">
                {it.images?.[0]?.url ? <img src={it.images[0].url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">ไม่มีรูป</div>}
              </div>
              <div className="p-3">
                <p className="text-sm font-bold text-gray-900 truncate">{it.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{it.status}</p>
              </div>
            </div>
          ))}
        </div>
        {!myItems?.length && <p className="text-sm text-gray-400 text-center py-6">ยังไม่มีรายการ</p>}
      </div>

      {/* Saved items */}
      <div className="px-4 mt-2 pb-4">
        <h2 className="text-lg font-bold text-gray-900 mb-3">บันทึกไว้</h2>
        <div className="grid grid-cols-2 gap-3">
          {(saved || []).map((it: any) => (
            <div key={it.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden active:scale-[0.98] transition" onClick={() => navigate(`/item/${it.id}`)}>
              <div className="w-full aspect-square bg-gray-100">
                {it.images?.[0]?.url ? <img src={it.images[0].url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">ไม่มีรูป</div>}
              </div>
              <div className="p-3">
                <p className="text-sm font-bold text-gray-900 truncate">{it.title}</p>
              </div>
            </div>
          ))}
        </div>
        {!saved?.length && <p className="text-sm text-gray-400 text-center py-6">ยังไม่มีรายการบันทึก</p>}
      </div>

      {/* Logout */}
      <div className="px-4 pb-28">
        <Button variant="outline" className="w-full h-12 rounded-2xl text-red-500 border-red-200 hover:bg-red-50 font-semibold" onClick={logout}>
          <LogOut size={16} className="mr-2" /> ออกจากระบบ
        </Button>
      </div>
    </div>
  )
}
