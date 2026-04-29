import { Link, useLocation } from 'react-router'
import { LayoutGrid, ShoppingBag, Plus, MessageCircle, User } from 'lucide-react'

const navs = [
  { path: '/', label: 'ฟีด', icon: LayoutGrid },
  { path: '/shop', label: 'ช้อป', icon: ShoppingBag },
  { path: '/add', label: 'Add', icon: Plus, isCenter: true },
  { path: '/inbox', label: 'Inbox', icon: MessageCircle },
  { path: '/profile', label: 'Profile', icon: User },
]

export default function BottomNav() {
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100">
      <div className="flex items-end justify-around h-16 max-w-md mx-auto relative pb-1">
        {navs.map((n) => {
          const active = location.pathname === n.path
          const Icon = n.icon

          if (n.isCenter) {
            return (
              <Link
                key={n.path}
                to={n.path}
                className="flex flex-col items-center -mt-5"
              >
                <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30 active:scale-95 transition-transform">
                  <Plus size={28} strokeWidth={2.5} className="text-white" />
                </div>
                <span className="text-[10px] mt-1 text-gray-500">{n.label}</span>
              </Link>
            )
          }

          return (
            <Link
              key={n.path}
              to={n.path}
              className={`flex flex-col items-center justify-center w-16 h-full rounded-2xl mx-0.5 transition ${
                active
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-400 hover:text-gray-500'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.5} />
              <span className="text-[10px] mt-0.5 font-medium">{n.label}</span>
            </Link>
          )
        })}
      </div>
      {/* Safe area padding for mobile */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  )
}
