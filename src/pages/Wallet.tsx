import { useState } from 'react'
import { useNavigate } from 'react-router'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, TrendingUp, TrendingDown, Wallet as WalletIcon } from 'lucide-react'

export default function Wallet() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [amount, setAmount] = useState('')
  const { data: wallet } = trpc.wallet.get.useQuery(undefined, { enabled: !!user })
  const { data: txs } = trpc.wallet.transactions.useQuery(undefined, { enabled: !!user })
  const deposit = trpc.wallet.deposit.useMutation({
    onSuccess: () => { setAmount('') },
  })

  if (!user) {
    return (
      <div className="max-w-md mx-auto min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">กรุณาเข้าสู่ระบบ</p>
        <Button className="rounded-full px-8" onClick={() => navigate('/login')}>เข้าสู่ระบบ</Button>
      </div>
    )
  }

  const balance = wallet?.creditBalance || 0

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50">
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 transition">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold">กระเป๋า</h1>
      </div>

      <div className="p-4 space-y-5 pb-24">
        {/* Balance card */}
        <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-lg shadow-blue-600/20">
          <div className="flex items-center gap-2 mb-3">
            <WalletIcon size={20} className="text-blue-200" />
            <span className="text-sm text-blue-200">เครดิตคงเหลือ</span>
          </div>
          <p className="text-4xl font-black">{balance.toLocaleString()}</p>
          <p className="text-sm text-blue-200 mt-1">เครดิต</p>
        </div>

        {/* Deposit */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-3">เติมเครดิต</h3>
          <div className="flex gap-2 mb-3">
            {['100', '500', '1000'].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(v)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition ${
                  amount === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="ระบุจำนวน"
            className="rounded-xl h-12 bg-gray-50 border-gray-200 mb-3"
          />
          <Button
            className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-600/20"
            onClick={() => deposit.mutate({ amount: Number(amount) })}
            disabled={deposit.isPending || !amount || Number(amount) <= 0}
          >
            {deposit.isPending ? 'กำลังเติม...' : 'เติมเครดิต'}
          </Button>
        </div>

        {/* Transactions */}
        <div>
          <h3 className="font-bold text-gray-900 mb-3">ประวัติธุรกรรม</h3>
          <div className="space-y-2">
            {(txs || []).length === 0 && <p className="text-sm text-gray-400 text-center py-6">ไม่มีรายการ</p>}
            {(txs || []).map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.amount > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    {tx.amount > 0 ? <TrendingUp size={18} className="text-green-600" /> : <TrendingDown size={18} className="text-red-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{tx.description || tx.type}</p>
                    <p className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleDateString('th-TH')}</p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
