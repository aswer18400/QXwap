import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const { login, signup } = useAuth()
  const navigate = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await signup(email, password)
      }
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาด')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-blue-600">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-blue-500 rounded-full opacity-50" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-blue-700 rounded-full opacity-30" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl shadow-xl mb-4">
            <span className="text-3xl font-black">
              <span className="text-blue-600">Q</span>
              <span className="text-gray-900">X</span>
              <span className="text-blue-600">w</span>
            </span>
          </div>
          <h1 className="text-2xl font-black text-white">QXwap</h1>
          <p className="text-blue-200 text-sm mt-1">ตลาดแลกเปลี่ยนสินค้า</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            {mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {mode === 'login' ? 'ยินดีต้อนรับกลับมา!' : 'สร้างบัญชีใหม่'}
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">อีเมล</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="h-12 rounded-xl bg-gray-50 border-gray-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">รหัสผ่าน</label>
              <div className="relative">
                <Input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="h-12 rounded-xl bg-gray-50 border-gray-200 pr-10"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-base font-bold shadow-lg shadow-blue-600/20"
            >
              {mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            {mode === 'login' ? 'ยังไม่มีบัญชี? ' : 'มีบัญชีแล้ว? '}
            <button
              type="button"
              className="text-blue-600 font-semibold"
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
            >
              {mode === 'login' ? 'สมัครเลย' : 'เข้าสู่ระบบ'}
            </button>
          </p>
        </div>

        {/* Demo hint */}
        <p className="text-center text-xs text-blue-200 mt-6">
          Demo: demo@qxwap.com / demo1234
        </p>
      </div>
    </div>
  )
}
