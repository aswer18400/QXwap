import { Navigate, Routes, Route, useLocation } from 'react-router'
import Feed from './pages/Feed'
import Shop from './pages/Shop'
import AddProduct from './pages/AddProduct'
import Inbox from './pages/Inbox'
import Profile from './pages/Profile'
import Login from './pages/Login'
import ItemDetail from './pages/ItemDetail'
import Wallet from './pages/Wallet'
import Notifications from './pages/Notifications'
import EditProfile from './pages/EditProfile'
import Chat from './pages/Chat'
import BottomNav from './components/layout/BottomNav'
import { useAuth } from './hooks/useAuth'
import { useEffect, useState } from 'react'

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const hideNav = ['/login', '/item/', '/chat/'].some(p => location.pathname.startsWith(p))
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <NetworkBanner />
      {children}
      {!hideNav && <BottomNav />}
    </div>
  )
}

function NetworkBanner() {
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine)

  useEffect(() => {
    const online = () => setIsOnline(true)
    const offline = () => setIsOnline(false)
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
    }
  }, [])

  if (isOnline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[80] bg-amber-500 px-4 py-2 text-center text-xs font-semibold text-white">
      ออฟไลน์อยู่ บางข้อมูลอาจไม่โหลดจนกว่าจะเชื่อมต่ออีกครั้ง
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-400">
      กำลังตรวจสอบบัญชี...
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" state={{ from: location }} />

  return children
}

export default function App() {
  const { isLoading, user } = useAuth()
  const location = useLocation()

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Feed />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/add" element={<ProtectedRoute><AddProduct /></ProtectedRoute>} />
        <Route path="/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/login" element={!isLoading && user ? <Navigate to={(location.state as any)?.from?.pathname || '/'} replace /> : <Login />} />
        <Route path="/item/:id" element={<ItemDetail />} />
        <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
        <Route path="/chat/:conversationId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
      </Routes>
    </Layout>
  )
}
