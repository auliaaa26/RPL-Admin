import React, { useEffect, useState } from 'react'
import { supabase } from '../config/supabase'
import { Printer, Eye, CheckCircle } from 'lucide-react'

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
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
        <img src={url} alt="Bukti Bayar" style={{ width: '100%', borderRadius: 10, objectFit: 'contain', maxHeight: 500 }} />
      </div>
    </div>
  )
}

const STATUS_STYLE = {
  pending:             { background: '#FEF3C7', color: '#D97706' },
  menunggu_konfirmasi: { background: '#DBEAFE', color: '#1D4ED8' },
  diterima:            { background: '#D1FAE5', color: '#059669' },
  diproses:            { background: '#E0E7FF', color: '#4338CA' },
  dikirim:             { background: '#D1FAE5', color: '#065F46' },
  dibatalkan:          { background: '#FEE2E2', color: '#DC2626' },
  tempo:               { background: '#F3E8FF', color: '#7C3AED' },
}

const STATUS_LABEL = {
  pending:             'Pending',
  menunggu_konfirmasi: 'Menunggu Konfirmasi',
  diterima:            'Diterima',
  diproses:            'Diproses',
  dikirim:             'Dikirim',
  dibatalkan:          'Dibatalkan',
  tempo:               'Tempo',
}

// Setelah dikonfirmasi (diterima), dropdown hanya punya diproses & dibatalkan
const STATUS_OPTIONS = {
  diterima:   ['diproses', 'dibatalkan'],
  diproses:   ['diproses', 'dikirim', 'dibatalkan'],
  dikirim:    ['dikirim'],
  dibatalkan: ['dibatalkan'],
}

// Status yang PERLU tombol konfirmasi (bukan dropdown)
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
        padding: '4px 8px',
        fontSize: 11,
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

// Tombol konfirmasi untuk status pending / menunggu_konfirmasi / tempo
function KonfirmasiButton({ onConfirm, onBatal }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <button
        onClick={onConfirm}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: '#D1FAE5', color: '#065F46',
          border: 'none', borderRadius: 6,
          padding: '5px 10px', fontSize: 11, fontWeight: 700,
          cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        <CheckCircle size={12} /> Konfirmasi
      </button>
      <button
        onClick={onBatal}
        style={{
          background: '#FEE2E2', color: '#DC2626',
          border: 'none', borderRadius: 6,
          padding: '5px 10px', fontSize: 11, fontWeight: 700,
          cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        Batalkan
      </button>
    </div>
  )
}

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [filterStatus, setFilterStatus] = useState('Semua')
  const [loading, setLoading] = useState(true)
  const [buktiBayarUrl, setBuktiBayarUrl] = useState(null)

  useEffect(() => { fetchOrders() }, [filterStatus])

  const fetchOrders = async () => {
    setLoading(true)
    let query = supabase.from('pesanan_masuk').select('*').order('created_at', { ascending: false })

    const map = {
      'Pending': 'pending',
      'Menunggu Konfirmasi': 'menunggu_konfirmasi',
      'Diterima': 'diterima',
      'Diproses': 'diproses',
      'Dikirim': 'dikirim',
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

  return (
    <div style={{ background: 'white', padding: 24, borderRadius: 16, boxShadow: 'var(--shadow-sm)' }}>
      <BuktiBayarModal url={buktiBayarUrl} onClose={() => setBuktiBayarUrl(null)} />

      {filterStatus === 'Semua' && jumlahMenunggu > 0 && (
        <div style={{
          background: '#DBEAFE', color: '#1D4ED8', borderRadius: 10,
          padding: '10px 16px', marginBottom: 16, fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          🔔 {jumlahMenunggu} pesanan menunggu konfirmasi bukti bayar
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
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
          <option>Dibatalkan</option>
          <option>Tempo</option>
        </select>

        <button
          onClick={() => window.print()}
          style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--gray-300)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Printer size={16} /> Cetak Daftar
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--gray-50)', borderBottom: '2px solid var(--gray-200)', textAlign: 'left' }}>
            <th style={{ padding: 12 }}>No Meja / Kamar</th>
            <th style={{ padding: 12 }}>Nama Pelanggan</th>
            <th style={{ padding: 12 }}>Detail Pesanan</th>
            <th style={{ padding: 12 }}>Total Harga</th>
            <th style={{ padding: 12 }}>Pembayaran</th>
            <th style={{ padding: 12 }}>Bukti Bayar</th>
            <th style={{ padding: 12 }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan="7" style={{ textAlign: 'center', padding: 16 }}>Memuat data...</td></tr>
          ) : orders.length === 0 ? (
            <tr><td colSpan="7" style={{ textAlign: 'center', padding: 16, color: 'var(--gray-400)' }}>Belum ada pesanan masuk.</td></tr>
          ) : orders.map(o => (
            <tr
              key={o.id_pesanan}
              style={{
                borderBottom: '1px solid var(--gray-100)',
                background: o.status === 'menunggu_konfirmasi' ? '#F0F7FF' : 'white'
              }}
            >
              <td style={{ padding: 12, fontWeight: 700 }}>
                {o.no_meja || '-'}<br />
                <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>{o.kamar || 'Kamar -'}</span>
              </td>
              <td style={{ padding: 12 }}>{o.nama_pelanggan || 'Pelanggan'}</td>
              <td style={{ padding: 12 }}>
                {o.detail_pesanan || '-'} <span style={{ color: 'var(--gray-500)' }}>x{o.jumlah || 1}</span>
              </td>
              <td style={{ padding: 12, fontWeight: 600 }}>
                Rp.{Number(o.total_harga)?.toLocaleString('id-ID')}
              </td>

              {/* Kolom Pembayaran — tampilkan badge Tempo kalau metode tempo */}
              <td style={{ padding: 12 }}>
                {o.metode_bayar === 'tempo' || o.status === 'tempo' ? (
                  <span style={{
                    background: '#F3E8FF', color: '#7C3AED',
                    fontSize: 11, fontWeight: 700,
                    padding: '3px 10px', borderRadius: 999,
                    display: 'inline-block',
                  }}>
                    📋 Tempo
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>—</span>
                )}
              </td>

              <td style={{ padding: 12 }}>
                {o.bukti_bayar ? (
                  <button
                    onClick={() => setBuktiBayarUrl(o.bukti_bayar)}
                    style={{
                      border: 'none', background: '#DBEAFE', color: '#1D4ED8',
                      padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600
                    }}
                  >
                    <Eye size={13} /> Lihat
                  </button>
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>Tidak ada</span>
                )}
              </td>

              {/* Kolom Aksi: tombol Konfirmasi/Batalkan untuk status awal, dropdown untuk yang sudah diterima */}
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
          ))}
        </tbody>
      </table>
    </div>
  )
}