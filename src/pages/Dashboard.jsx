import React, { useEffect, useState } from 'react'
import { supabase } from '../config/supabase'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ShoppingBag, Wallet, Clock, AlertCircle } from 'lucide-react'

function StatCard({ label, value, sub, subColor, icon, iconBg }) {
  return (
    <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--gray-500)', fontWeight: 600, marginBottom: 8 }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 6 }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: subColor || 'var(--gray-500)', fontWeight: 500 }}>{sub}</div>}
      </div>
      <div style={{ width: 44, height: 44, background: iconBg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
    </div>
  )
}

const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']

export default function Dashboard() {
  const [stats, setStats] = useState({ orders: 0, revenue: 0, pending: 0, tempo: 0 })
  const [chartData, setChartData] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [selectedMonth])

  const fetchData = async () => {
    setLoading(true)

    const now = new Date()
    const year = now.getFullYear()

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString()
    const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()

    const daysInMonth = new Date(year, selectedMonth + 1, 0).getDate()
    const monthStart  = new Date(year, selectedMonth, 1, 0, 0, 0).toISOString()
    const monthEnd    = new Date(year, selectedMonth, daysInMonth, 23, 59, 59).toISOString()

    // Total pesanan hari ini (semua status kecuali dibatalkan)
    const { count: todayOrders } = await supabase
      .from('pesanan_masuk')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd)
      .not('status', 'eq', 'dibatalkan')

    // Pendapatan hari ini — semua status kecuali dibatalkan
    const { data: revenueData } = await supabase
      .from('pesanan_masuk')
      .select('total_harga')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd)
      .not('status', 'eq', 'dibatalkan')

    const revenue = revenueData?.reduce((s, o) => s + (Number(o.total_harga) || 0), 0) || 0

    // Perlu konfirmasi = status 'diproses'
    const { count: pending } = await supabase
      .from('pesanan_masuk')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'diproses')

    // Tagihan tempo jatuh tempo & belum lunas
    const { data: tempoData } = await supabase
      .from('pembayaran_tempo')
      .select('total_tagihan')
      .eq('status', 'Belum Lunas')
      .lt('jatuh_tempo', new Date().toISOString())

    const tempo = tempoData?.reduce((s, t) => s + (Number(t.total_tagihan) || 0), 0) || 0

    setStats({ orders: todayOrders || 0, revenue, pending: pending || 0, tempo })

    // Chart: pendapatan per hari di bulan yang dipilih (semua kecuali dibatalkan)
    const { data: monthOrders } = await supabase
      .from('pesanan_masuk')
      .select('created_at, total_harga')
      .gte('created_at', monthStart)
      .lte('created_at', monthEnd)
      .not('status', 'eq', 'dibatalkan')

    const byDay = {}
    for (let d = 1; d <= daysInMonth; d++) {
      byDay[d] = { day: d, total: 0, count: 0 }
    }
    monthOrders?.forEach(o => {
      const d = new Date(o.created_at).getDate()
      if (byDay[d]) {
        byDay[d].total += Number(o.total_harga) || 0
        byDay[d].count++
      }
    })

    setChartData(Object.values(byDay))
    setLoading(false)
  }

  const fmt = (n) => 'Rp.' + Number(n).toLocaleString('id-ID')

  return (
    <div>
      <div style={{
        background: 'linear-gradient(135deg, var(--orange) 0%, var(--orange-dark) 100%)',
        borderRadius: 20, padding: '28px', marginBottom: 24,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 60,
          background: 'rgba(255,255,255,0.07)',
          borderRadius: '60% 60% 0 0 / 30px',
        }} />
        <div style={{ position: 'relative' }}>
          <h2 style={{ color: 'white', fontWeight: 800, fontSize: 22, marginBottom: 20 }}>Dashboard</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>

            <StatCard
              label="Total Pesanan hari ini"
              value={loading ? '...' : stats.orders}
              sub="Pesanan masuk hari ini"
              subColor="#22c55e"
              icon={<ShoppingBag size={20} color="#f97316" />}
              iconBg="white"
            />

            <StatCard
              label="Total Pendapatan hari ini"
              value={loading ? '...' : fmt(stats.revenue)}
              sub="Dari semua pesanan hari ini"
              subColor="#22c55e"
              icon={<Wallet size={20} color="#22c55e" />}
              iconBg="white"
            />

            <StatCard
              label="Tagihan Tempo Jatuh Tempo"
              value={loading ? '...' : fmt(stats.tempo)}
              sub={stats.tempo > 0 ? '⚠️ Ada tagihan yang belum dibayar!' : '✓ Semua tagihan aman'}
              subColor={stats.tempo > 0 ? '#ef4444' : '#22c55e'}
              icon={<Clock size={20} color="#f59e0b" />}
              iconBg="white"
            />

            <StatCard
              label="Sedang Diproses"
              value={loading ? '...' : stats.pending}
              sub={stats.pending > 0 ? 'Ada pesanan sedang diproses' : 'Tidak ada pesanan diproses'}
              subColor={stats.pending > 0 ? '#ef4444' : '#22c55e'}
              icon={<AlertCircle size={20} color="#ef4444" />}
              iconBg="white"
            />

          </div>

          <div style={{ background: 'white', borderRadius: 14, padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 15 }}>Detail Penjualan</span>
                <span style={{ fontSize: 11, color: 'var(--gray-400)', marginLeft: 8 }}>
                  (semua pesanan kecuali dibatalkan)
                </span>
              </div>
              <select
                className="form-select"
                style={{ width: 'auto', fontSize: 12, padding: '5px 28px 5px 10px' }}
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
              >
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--orange)" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="var(--orange)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v === 0 ? '0' : v >= 1000 ? (v/1000).toFixed(0) + 'k' : v} />
                <Tooltip formatter={(v) => ['Rp.' + Number(v).toLocaleString('id-ID'), 'Pendapatan']} labelFormatter={(l) => `Tanggal ${l}`} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="var(--orange)"
                  strokeWidth={2.5}
                  fill="url(#colorTotal)"
                  dot={{ fill: 'var(--orange)', r: 3 }}
                  activeDot={{ r: 5, fill: 'var(--orange)' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}