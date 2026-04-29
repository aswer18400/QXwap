import { Routes, Route, useLocation, useNavigate } from 'react-router'
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
import { useEffect } from 'react'

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const hideNav = ['/login', '/item/', '/chat/'].some(p => location.pathname.startsWith(p))
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {children}
      {!hideNav && <BottomNav />}
    </div>
  )
}

export default function App() {
  const { isLoading, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !user && location.pathname !== '/login') {
      const protectedPaths = ['/add', '/inbox', '/profile', '/wallet', '/notifications', '/edit-profile']
      if (protectedPaths.some(p => location.pathname.startsWith(p))) {
        navigate('/login')
      }
    }
  }, [isLoading, user, location.pathname, navigate])

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Feed />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/add" element={<AddProduct />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/login" element={<Login />} />
        <Route path="/item/:id" element={<ItemDetail />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/edit-profile" element={<EditProfile />} />
        <Route path="/chat/:conversationId" element={<Chat />} />
      </Routes>
    </Layout>
  )
}
