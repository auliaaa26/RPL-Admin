import React, { useEffect, useState } from 'react'
import { supabase } from '../config/supabase'
import { useAuth } from '../context/AuthContext'
import { Printer, Eye, CheckCircle, Plus, Trash2, User } from 'lucide-react'

function BuktiBayarModal({ url, onClose }) {
  if (!url) return null
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'white', borderRadius: 16, padding: 20, maxWidth: 420, width: '90%'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontWeight: 700 }}>Bukti Pembayaran</span>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>
        <img src={url} alt="Bukti Bayar" style={{ width: '100%', borderRadius: 10, objectFit: 'contain', maxHeight: 500 }} />
      </div>
    </div>
  )
}

// Modal input pesanan offline — cari menu via combobox + pilih tanggal pesanan
function OfflineOrderModal({ onClose, onSaved, userId }) {
  const [namaPelanggan, setNamaPelanggan] = useState('')
  const [kamar, setKamar] = useState('')
  const [tipePembayaran, setTipePembayaran] = useState('tunai')
  const [tanggalPesanan, setTanggalPesanan] = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)

  const [menuList, setMenuList] = useState([])
  const [loadingMenu, setLoadingMenu] = useState(true)
  const [searchMenu, setSearchMenu] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [qtyToAdd, setQtyToAdd] = useState(1)

  const [items, setItems] = useState([]) // { id, nama, harga, qty }

  useEffect(() => {
    const fetchMenus = async () => {
      setLoadingMenu(true)
      const { data, error } = await supabase
        .from('menus')
        .select('id, nama, harga, kategori')
        .order('nama', { ascending: true })
      if (!error) setMenuList(data || [])
      setLoadingMenu(false)
    }
    fetchMenus()
  }, [])

  const menuFiltered = menuList.filter(m =>
    m.nama.toLowerCase().includes(searchMenu.trim().toLowerCase())
  )

  const handlePilihMenu = (menu) => {
    setShowDropdown(false)
    setItems(prev => {
      const existing = prev.find(i => i.id === menu.id)
      if (existing) {
        return prev.map(i => i.id === menu.id ? { ...i, qty: i.qty + Number(qtyToAdd) } : i)
      }
      return [...prev, { id: menu.id, nama: menu.nama, harga: menu.harga, qty: Number(qtyToAdd) }]
    })
    setSearchMenu('')
    setQtyToAdd(1)
  }

  const handleHapusItem = (id) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const handleUbahQty = (id, delta) => {
    setItems(prev =>
      prev.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)
    )
  }

  const totalHarga = items.reduce((sum, i) => sum + i.harga * i.qty, 0)
  const totalJumlah = items.reduce((sum, i) => sum + i.qty, 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!namaPelanggan) {
      alert('Nama pelanggan wajib diisi')
      return
    }
    if (items.length === 0) {
      alert('Pilih minimal 1 menu')
      return
    }
    if (!tanggalPesanan) {
      alert('Tanggal pesanan wajib diisi')
      return
    }
    setSaving(true)

    const detail_pesanan = items.map(i => `${i.nama} x${i.qty}`).join(', ')

    const now = new Date()
    const createdAt = new Date(tanggalPesanan)
    createdAt.setHours(now.getHours(), now.getMinutes(), now.getSeconds())

    const { data: pesanan, error } = await supabase.from('pesanan_masuk').insert({
      nama_pelanggan: namaPelanggan,
      kamar: kamar,
      detail_pesanan,
      jumlah: totalJumlah,
      total_harga: totalHarga,
      tipe_pembayaran: tipePembayaran,
      status: tipePembayaran === 'tempo' ? 'tempo' : 'diterima',
      sumber: 'offline',
      input_by: userId,
      created_at: createdAt.toISOString(),
    }).select().single()

    if (error) {
      setSaving(false)
      alert('Gagal simpan pesanan: ' + error.message)
      return
    }

    // Kalau bayar tempo, ikut catat juga ke tabel pembayaran_tempo
    // (pola yang sama seperti di halaman order customer / Payment.jsx)
    if (tipePembayaran === 'tempo') {
      const jatuhTempo = new Date(createdAt)
      jatuhTempo.setDate(jatuhTempo.getDate() + 14)

      const { error: tempoError } = await supabase.from('pembayaran_tempo').insert({
        id_pesanan: pesanan.id_pesanan,
        nama_pelanggan: namaPelanggan,
        kamar: kamar,
        detail_pesanan,
        total_tagihan: totalHarga,
        tanggal_order: createdAt.toISOString(),
        jatuh_tempo: jatuhTempo.toISOString(),
        status: 'Belum Lunas',
        bukti_bayar: null,
        tanggal_lunas: null,
      })

      if (tempoError) {
        setSaving(false)
        alert('Pesanan tersimpan, tapi gagal mencatat ke Pembayaran Tempo: ' + tempoError.message)
        return
      }
    }

    setSaving(false)
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
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16
    }}>
      <form onClick={e => e.stopPropagation()} onSubmit={handleSubmit} style={{
        background: 'white', borderRadius: 16, padding: 24, width: '90%', maxWidth: 460,
        maxHeight: '90vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontWeight: 800, fontSize: 17 }}>Input Pesanan Offline</span>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>

        <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Nama Pelanggan</label>
        <input style={inputStyle} value={namaPelanggan} onChange={e => setNamaPelanggan(e.target.value)} />

        <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>No Meja / Kamar</label>
        <input style={inputStyle} value={kamar} onChange={e => setKamar(e.target.value)} />

        <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Tanggal Pesanan</label>
        <input
          type="date"
          style={inputStyle}
          value={tanggalPesanan}
          max={new Date().toISOString().slice(0, 10)}
          onChange={e => setTanggalPesanan(e.target.value)}
        />

        <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Cari & Pilih Menu</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 4, position: 'relative' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              placeholder={loadingMenu ? 'Memuat menu...' : 'Ketik nama menu...'}
              value={searchMenu}
              onChange={e => { setSearchMenu(e.target.value); setShowDropdown(true) }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              style={{ ...inputStyle, marginBottom: 0 }}
              disabled={loadingMenu}
            />

            {showDropdown && searchMenu.trim() && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                background: 'white', border: '1px solid var(--gray-200)', borderRadius: 8,
                maxHeight: 220, overflowY: 'auto', zIndex: 20,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
              }}>
                {menuFiltered.length === 0 ? (
                  <div style={{ padding: '10px 12px', fontSize: 13, color: 'var(--gray-400)' }}>Menu tidak ditemukan</div>
                ) : menuFiltered.map(m => (
                  <div
                    key={m.id}
                    onMouseDown={() => handlePilihMenu(m)}
                    style={{
                      padding: '10px 12px', cursor: 'pointer', fontSize: 13,
                      borderBottom: '1px solid var(--gray-100)',
                      display: 'flex', justifyContent: 'space-between'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    <span style={{ fontWeight: 600 }}>{m.nama}</span>
                    <span style={{ color: 'var(--gray-500)' }}>Rp {Number(m.harga).toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <input
            type="number"
            min="1"
            value={qtyToAdd}
            onChange={e => setQtyToAdd(e.target.value)}
            style={{ ...inputStyle, marginBottom: 0, width: 60, flexShrink: 0 }}
          />
        </div>
        <p style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 12, marginTop: 4 }}>
          Ketik nama menu, klik hasil pencarian untuk menambahkan ke daftar
        </p>

        {items.length > 0 && (
          <div style={{ marginBottom: 14, border: '1px solid var(--gray-200)', borderRadius: 10, overflow: 'hidden' }}>
            {items.map(i => (
              <div key={i.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                borderBottom: '1px solid var(--gray-100)'
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.nama}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Rp {Number(i.harga).toLocaleString('id-ID')}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button type="button" onClick={() => handleUbahQty(i.id, -1)} style={{ border: '1px solid var(--gray-300)', background: 'white', borderRadius: 6, width: 22, height: 22, cursor: 'pointer' }}>-</button>
                  <span style={{ fontSize: 13, fontWeight: 700, minWidth: 16, textAlign: 'center' }}>{i.qty}</span>
                  <button type="button" onClick={() => handleUbahQty(i.id, 1)} style={{ border: '1px solid var(--gray-300)', background: 'white', borderRadius: 6, width: 22, height: 22, cursor: 'pointer' }}>+</button>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, minWidth: 80, textAlign: 'right' }}>
                  Rp {(i.harga * i.qty).toLocaleString('id-ID')}
                </div>
                <button type="button" onClick={() => handleHapusItem(i.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#DC2626' }}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--gray-50)', borderRadius: 10, padding: '10px 14px', marginBottom: 14
        }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Total Harga</span>
          <span style={{ fontSize: 17, fontWeight: 800 }}>Rp {totalHarga.toLocaleString('id-ID')}</span>
        </div>

        <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Tipe Pembayaran</label>
        <select style={inputStyle} value={tipePembayaran} onChange={e => setTipePembayaran(e.target.value)}>
          <option value="tunai">Tunai</option>
          <option value="qris">QRIS</option>
          <option value="tempo">Tempo</option>
        </select>

        <button type="submit" disabled={saving} style={{
          width: '100%', padding: 12, borderRadius: 8, border: 'none',
          background: 'var(--orange)', color: 'white', fontWeight: 700, fontSize: 14,
          cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, marginTop: 4
        }}>
          {saving ? 'Menyimpan...' : 'Simpan Pesanan'}
        </button>
      </form>
    </div>
  )
}

const STATUS_STYLE = {
  pending:             { background: '#FEF3C7', color: '#D97706' },
  menunggu_konfirmasi: { background: '#DBEAFE', color: '#1D4ED8' },
  diterima:            { background: '#D1FAE5', color: '#059669' },
  diproses:            { background: '#E0E7FF', color: '#4338CA' },
  dikirim:             { background: '#D1FAE5', color: '#065F46' },
  selesai:             { background: '#DCFCE7', color: '#15803D' },
  dibatalkan:          { background: '#FEE2E2', color: '#DC2626' },
  tempo:               { background: '#F3E8FF', color: '#7C3AED' },
}

const STATUS_LABEL = {
  pending:             'Pending',
  menunggu_konfirmasi: 'Menunggu Konfirmasi',
  diterima:            'Diterima',
  diproses:            'Diproses',
  dikirim:             'Dikirim',
  selesai:             'Selesai',
  dibatalkan:          'Dibatalkan',
  tempo:               'Tempo',
}

const STATUS_OPTIONS = {
  diterima:   ['diproses', 'selesai', 'dibatalkan'],
  diproses:   ['diproses', 'dikirim', 'selesai', 'dibatalkan'],
  dikirim:    ['dikirim', 'selesai'],
  selesai:    ['selesai'],
  dibatalkan: ['dibatalkan'],
}

const NEEDS_CONFIRM = ['pending', 'menunggu_konfirmasi', 'tempo']

function StatusDropdown({ currentStatus, onUpdate }) {
  const options = STATUS_OPTIONS[currentStatus] || [currentStatus]
  const style = STATUS_STYLE[currentStatus] || { background: '#F3F4F6', color: '#374151' }

  return (
    <select
      value={currentStatus}
      onChange={e => {
        if (e.target.value !== currentStatus) onUpdate(e.target.value)
      }}
      style={{
        ...style,
        border: 'none',
        borderRadius: 6,
        padding: '5px 10px',
        fontSize: 14,
        fontWeight: 700,
        cursor: options.length > 1 ? 'pointer' : 'default',
        appearance: options.length > 1 ? 'auto' : 'none',
        WebkitAppearance: options.length > 1 ? 'auto' : 'none',
        outline: 'none',
      }}
    >
      {options.map(s => (
        <option key={s} value={s}>{STATUS_LABEL[s] || s}</option>
      ))}
    </select>
  )
}

function KonfirmasiButton({ onConfirm, onBatal }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <button
        onClick={onConfirm}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: '#D1FAE5', color: '#065F46',
          border: 'none', borderRadius: 6,
          padding: '7px 14px', fontSize: 14, fontWeight: 700,
          cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        <CheckCircle size={14} /> Konfirmasi
      </button>
      <button
        onClick={onBatal}
        style={{
          background: '#FEE2E2', color: '#DC2626',
          border: 'none', borderRadius: 6,
          padding: '7px 14px', fontSize: 14, fontWeight: 700,
          cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        Batalkan
      </button>
    </div>
  )
}

export default function Orders() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [filterStatus, setFilterStatus] = useState('Semua')
  const [loading, setLoading] = useState(true)
  const [buktiBayarUrl, setBuktiBayarUrl] = useState(null)
  const [showOfflineModal, setShowOfflineModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [adminMap, setAdminMap] = useState({}) // { user_id: { nama, role } }

  useEffect(() => { fetchAdminProfiles() }, [])
  useEffect(() => { fetchOrders() }, [filterStatus])

  // Ambil semua data admin/kasir sekali di awal, buat "menerjemahkan" input_by (uid) jadi nama
  const fetchAdminProfiles = async () => {
    const { data, error } = await supabase
      .from('admin_profile')
      .select('user_id, nama, role')
    if (!error && data) {
      const map = {}
      data.forEach(p => { map[p.user_id] = { nama: p.nama, role: p.role } })
      setAdminMap(map)
    }
  }

  const fetchOrders = async () => {
    setLoading(true)
    let query = supabase.from('pesanan_masuk').select('*').order('created_at', { ascending: false })

    const map = {
      'Pending': 'pending',
      'Menunggu Konfirmasi': 'menunggu_konfirmasi',
      'Diterima': 'diterima',
      'Diproses': 'diproses',
      'Dikirim': 'dikirim',
      'Selesai': 'selesai',
      'Dibatalkan': 'dibatalkan',
      'Tempo': 'tempo',
    }
    if (filterStatus !== 'Semua') {
      const val = map[filterStatus]
      if (val) query = query.eq('status', val)
    }

    const { data, error } = await query
    if (error) console.error('Gagal mengambil data:', error.message)
    else setOrders(data || [])
    setLoading(false)
  }

  const updateStatus = async (idPesanan, nextStatus) => {
    await supabase.from('pesanan_masuk').update({ status: nextStatus }).eq('id_pesanan', idPesanan)
    fetchOrders()
  }

  const jumlahMenunggu = orders.filter(o => o.status === 'menunggu_konfirmasi').length

  const ordersFiltered = orders.filter(o => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.trim().toLowerCase()
    return (
      (o.nama_pelanggan || '').toLowerCase().includes(q) ||
      (o.detail_pesanan || '').toLowerCase().includes(q) ||
      (o.kamar || '').toLowerCase().includes(q)
    )
  })

  return (
    <div style={{ background: 'white', padding: 24, borderRadius: 16, boxShadow: 'var(--shadow-sm)' }}>
      <BuktiBayarModal url={buktiBayarUrl} onClose={() => setBuktiBayarUrl(null)} />
      {showOfflineModal && (
        <OfflineOrderModal
          userId={user?.id}
          onClose={() => setShowOfflineModal(false)}
          onSaved={() => { fetchOrders(); fetchAdminProfiles() }}
        />
      )}

      {filterStatus === 'Semua' && jumlahMenunggu > 0 && (
        <div style={{
          background: '#DBEAFE', color: '#1D4ED8', borderRadius: 10,
          padding: '10px 16px', marginBottom: 16, fontSize: 14, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          🔔 {jumlahMenunggu} pesanan menunggu konfirmasi bukti bayar
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--gray-300)' }}
          >
            <option>Semua</option>
            <option>Pending</option>
            <option>Menunggu Konfirmasi</option>
            <option>Diterima</option>
            <option>Diproses</option>
            <option>Dikirim</option>
            <option>Selesai</option>
            <option>Dibatalkan</option>
            <option>Tempo</option>
          </select>

          <input
            type="text"
            placeholder="Cari nama, kamar, atau pesanan..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--gray-300)', minWidth: 220 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setShowOfflineModal(true)}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: 'var(--orange)', color: 'white', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700
            }}
          >
            <Plus size={16} /> Input Pesanan Offline
          </button>
          <button
            onClick={() => window.print()}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--gray-300)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Printer size={16} /> Cetak Daftar
          </button>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 16, fontWeight: 600 }}>
        <thead>
          <tr style={{ background: 'var(--gray-50)', borderBottom: '2px solid var(--gray-200)', textAlign: 'left' }}>
            <th style={{ padding: 12, fontSize: 15, fontWeight: 700 }}>No Meja / Kamar</th>
            <th style={{ padding: 12, fontSize: 15, fontWeight: 700 }}>Nama Pelanggan</th>
            <th style={{ padding: 12, fontSize: 15, fontWeight: 700 }}>Detail Pesanan</th>
            <th style={{ padding: 12, fontSize: 15, fontWeight: 700 }}>Total Harga</th>
            <th style={{ padding: 12, fontSize: 15, fontWeight: 700 }}>Sumber</th>
            <th style={{ padding: 12, fontSize: 15, fontWeight: 700 }}>Diinput Oleh</th>
            <th style={{ padding: 12, fontSize: 15, fontWeight: 700 }}>Pembayaran</th>
            <th style={{ padding: 12, fontSize: 15, fontWeight: 700 }}>Bukti Bayar</th>
            <th style={{ padding: 12, fontSize: 15, fontWeight: 700 }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan="9" style={{ textAlign: 'center', padding: 16, fontSize: 16, fontWeight: 600 }}>Memuat data...</td></tr>
          ) : ordersFiltered.length === 0 ? (
            <tr><td colSpan="9" style={{ textAlign: 'center', padding: 16, fontSize: 16, fontWeight: 600, color: 'var(--gray-400)' }}>
              {searchQuery ? 'Tidak ada pesanan yang cocok.' : 'Belum ada pesanan masuk.'}
            </td></tr>
          ) : ordersFiltered.map(o => {
            const inputter = o.input_by ? adminMap[o.input_by] : null
            return (
              <tr
                key={o.id_pesanan}
                style={{
                  borderBottom: '1px solid var(--gray-100)',
                  background: o.status === 'menunggu_konfirmasi' ? '#F0F7FF' : 'white'
                }}
              >
                <td style={{ padding: 12, fontWeight: 700, fontSize: 17 }}>
                  {o.no_meja || '-'}<br />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-400)' }}>{o.kamar || 'Kamar -'}</span>
                </td>
                <td style={{ padding: 12, fontWeight: 700, fontSize: 17 }}>{o.nama_pelanggan || 'Pelanggan'}</td>
                <td style={{ padding: 12, fontWeight: 600, fontSize: 15 }}>
                  {o.detail_pesanan || '-'} <span style={{ color: 'var(--gray-500)', fontWeight: 700 }}>x{o.jumlah || 1}</span>
                </td>
                <td style={{ padding: 12, fontWeight: 800, fontSize: 17 }}>
                  Rp.{Number(o.total_harga)?.toLocaleString('id-ID')}
                </td>

                <td style={{ padding: 12 }}>
                  <span style={{
                    background: o.sumber === 'offline' ? '#FEF3C7' : '#E0F2FE',
                    color: o.sumber === 'offline' ? '#B45309' : '#0369A1',
                    fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
                  }}>
                    {o.sumber === 'offline' ? '🧾 Offline' : '🌐 Online'}
                  </span>
                </td>

                {/* Kolom Diinput Oleh */}
                <td style={{ padding: 12 }}>
                  {inputter ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <User size={13} style={{ color: 'var(--gray-400)', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{inputter.nama || '—'}</div>
                        <div style={{
                          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                          color: inputter.role === 'admin' ? 'var(--orange)' : '#2563EB'
                        }}>
                          {inputter.role === 'admin' ? 'Admin' : 'Kasir'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-400)' }}>
                      {o.sumber === 'offline' ? 'Tidak diketahui' : '— (pesan sendiri)'}
                    </span>
                  )}
                </td>

                <td style={{ padding: 12 }}>
                  {o.metode_bayar === 'tempo' || o.status === 'tempo' || o.tipe_pembayaran === 'tempo' ? (
                    <span style={{
                      background: '#F3E8FF', color: '#7C3AED',
                      fontSize: 13, fontWeight: 700,
                      padding: '5px 14px', borderRadius: 999,
                      display: 'inline-block',
                    }}>
                      📋 Tempo
                    </span>
                  ) : (
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-400)' }}>—</span>
                  )}
                </td>

                <td style={{ padding: 12 }}>
                  {o.bukti_bayar ? (
                    <button
                      onClick={() => setBuktiBayarUrl(o.bukti_bayar)}
                      style={{
                        border: 'none', background: '#DBEAFE', color: '#1D4ED8',
                        padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700
                      }}
                    >
                      <Eye size={13} /> Lihat
                    </button>
                  ) : (
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-400)' }}>Tidak ada</span>
                  )}
                </td>

                <td style={{ padding: 12 }}>
                  {NEEDS_CONFIRM.includes(o.status) ? (
                    <KonfirmasiButton
                      onConfirm={() => updateStatus(o.id_pesanan, 'diterima')}
                      onBatal={() => updateStatus(o.id_pesanan, 'dibatalkan')}
                    />
                  ) : (
                    <StatusDropdown
                      currentStatus={o.status}
                      onUpdate={(newStatus) => updateStatus(o.id_pesanan, newStatus)}
                    />
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}