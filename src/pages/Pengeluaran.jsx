import React, { useEffect, useState } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from '../context/AuthContext'
import { Plus, Trash2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts'

const KATEGORI_LABEL = {
  stok_belanja: 'Stok / Belanja',
  gaji: 'Gaji Pegawai',
  operasional: 'Operasional',
  lainnya: 'Lainnya',
}

const KATEGORI_COLOR = {
  stok_belanja: '#F59E0B',
  gaji: '#3B82F6',
  operasional: '#10B981',
  lainnya: '#8B5CF6',
}

function TambahPengeluaranModal({ onClose, onSaved, userId }) {
  const [form, setForm] = useState({
    kategori: 'stok_belanja', keterangan: '', jumlah: '', tanggal: new Date().toISOString().slice(0, 10)
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.keterangan || !form.jumlah) {
      alert('Keterangan dan jumlah wajib diisi')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('pengeluaran').insert({
      kategori: form.kategori,
      keterangan: form.keterangan,
      jumlah: Number(form.jumlah),
      tanggal: form.tanggal,
      input_by: userId,
    })
    setSaving(false)
    if (error) {
      alert('Gagal simpan: ' + error.message)
      return
    }
    onSaved()
    onClose()
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid var(--gray-300)', fontSize: 14, boxSizing: 'border-box', marginBottom: 12
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <form onClick={e => e.stopPropagation()} onSubmit={handleSubmit} style={{
        background: 'white', borderRadius: 16, padding: 24, width: '90%', maxWidth: 400
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontWeight: 800, fontSize: 17 }}>Tambah Pengeluaran</span>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>

        <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Kategori</label>
        <select style={inputStyle} value={form.kategori} onChange={e => setForm(p => ({ ...p, kategori: e.target.value }))}>
          {Object.entries(KATEGORI_LABEL).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>

        <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Keterangan</label>
        <input style={inputStyle} placeholder="cth: Beli ayam & sayur" value={form.keterangan} onChange={e => setForm(p => ({ ...p, keterangan: e.target.value }))} />

        <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Jumlah (Rp)</label>
        <input type="number" min="0" style={inputStyle} value={form.jumlah} onChange={e => setForm(p => ({ ...p, jumlah: e.target.value }))} />

        <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Tanggal</label>
        <input type="date" style={inputStyle} value={form.tanggal} onChange={e => setForm(p => ({ ...p, tanggal: e.target.value }))} />

        <button type="submit" disabled={saving} style={{
          width: '100%', padding: 12, borderRadius: 8, border: 'none',
          background: 'var(--orange)', color: 'white', fontWeight: 700, fontSize: 14,
          cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, marginTop: 4
        }}>
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </form>
    </div>
  )
}

export default function Pengeluaran() {
  const { user } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [bulan, setBulan] = useState(new Date().toISOString().slice(0, 7)) // "2026-08"

  useEffect(() => { fetchData() }, [bulan])

  const fetchData = async () => {
    setLoading(true)
    const start = `${bulan}-01`
    const endDate = new Date(bulan + '-01')
    endDate.setMonth(endDate.getMonth() + 1)
    const end = endDate.toISOString().slice(0, 10)

    const { data, error } = await supabase
      .from('pengeluaran')
      .select('*')
      .gte('tanggal', start)
      .lt('tanggal', end)
      .order('tanggal', { ascending: false })

    if (error) console.error(error.message)
    else setData(data || [])
    setLoading(false)
  }

  const hapus = async (id) => {
    if (!confirm('Hapus pengeluaran ini?')) return
    await supabase.from('pengeluaran').delete().eq('id', id)
    fetchData()
  }

  const total = data.reduce((sum, d) => sum + d.jumlah, 0)

  // Data untuk pie chart (total per kategori)
  const perKategori = Object.keys(KATEGORI_LABEL).map(kat => ({
    name: KATEGORI_LABEL[kat],
    value: data.filter(d => d.kategori === kat).reduce((s, d) => s + d.jumlah, 0),
    color: KATEGORI_COLOR[kat],
  })).filter(k => k.value > 0)

  // Data untuk bar chart (total per hari)
  const perHari = Object.values(
    data.reduce((acc, d) => {
      const tgl = d.tanggal
      if (!acc[tgl]) acc[tgl] = { tanggal: tgl.slice(8, 10), jumlah: 0 }
      acc[tgl].jumlah += d.jumlah
      return acc
    }, {})
  ).sort((a, b) => a.tanggal.localeCompare(b.tanggal))

  return (
    <div>
      {showModal && (
        <TambahPengeluaranModal userId={user?.id} onClose={() => setShowModal(false)} onSaved={fetchData} />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <input
          type="month"
          value={bulan}
          onChange={e => setBulan(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--gray-300)' }}
        />
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: 'var(--orange)', color: 'white', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700
          }}
        >
          <Plus size={16} /> Tambah Pengeluaran
        </button>
      </div>

      {/* Ringkasan total */}
      <div style={{ background: 'white', padding: 20, borderRadius: 16, boxShadow: 'var(--shadow-sm)', marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: 'var(--gray-500)', fontWeight: 600 }}>Total Pengeluaran Bulan Ini</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--gray-800)' }}>Rp {total.toLocaleString('id-ID')}</div>
      </div>

      {/* Grafik */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ flex: '1 1 320px', background: 'white', padding: 20, borderRadius: 16, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Pengeluaran per Hari</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={perHari}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tanggal" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(v) => `Rp ${v.toLocaleString('id-ID')}`} />
              <Bar dataKey="jumlah" fill="var(--orange)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ flex: '1 1 280px', background: 'white', padding: 20, borderRadius: 16, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Pengeluaran per Kategori</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={perKategori}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="45%"
                outerRadius={70}
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                style={{ fontSize: 11 }}
              >
                {perKategori.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v) => `Rp ${v.toLocaleString('id-ID')}`} />
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabel detail */}
      <div style={{ background: 'white', padding: 24, borderRadius: 16, boxShadow: 'var(--shadow-sm)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: 'var(--gray-50)', borderBottom: '2px solid var(--gray-200)', textAlign: 'left' }}>
              <th style={{ padding: 12 }}>Tanggal</th>
              <th style={{ padding: 12 }}>Kategori</th>
              <th style={{ padding: 12 }}>Keterangan</th>
              <th style={{ padding: 12 }}>Jumlah</th>
              <th style={{ padding: 12 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: 16 }}>Memuat...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: 16, color: 'var(--gray-400)' }}>Belum ada pengeluaran bulan ini.</td></tr>
            ) : data.map(d => (
              <tr key={d.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                <td style={{ padding: 12 }}>{new Date(d.tanggal).toLocaleDateString('id-ID')}</td>
                <td style={{ padding: 12 }}>
                  <span style={{
                    background: KATEGORI_COLOR[d.kategori] + '22', color: KATEGORI_COLOR[d.kategori],
                    padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700
                  }}>
                    {KATEGORI_LABEL[d.kategori]}
                  </span>
                </td>
                <td style={{ padding: 12 }}>{d.keterangan}</td>
                <td style={{ padding: 12, fontWeight: 700 }}>Rp {d.jumlah.toLocaleString('id-ID')}</td>
                <td style={{ padding: 12 }}>
                  <button onClick={() => hapus(d.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#DC2626' }}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}