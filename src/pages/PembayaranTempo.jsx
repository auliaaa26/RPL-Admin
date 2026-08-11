import React, { useEffect, useState, useMemo } from 'react'
import { supabase } from '../config/supabase'
import { Check, Printer, Eye, Search, User } from 'lucide-react'

// Modal lihat bukti bayar (reuse pattern dari Orders.jsx)
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
          <span style={{ fontWeight: 700 }}>Bukti Pembayaran Tempo</span>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
        <img src={url} alt="Bukti Bayar" style={{ width: '100%', borderRadius: 10, objectFit: 'contain', maxHeight: 500 }} />
      </div>
    </div>
  )
}

export default function PembayaranTempo() {
  const [tempos, setTempos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('Semua')
  const [buktiBayarUrl, setBuktiBayarUrl] = useState(null)
  const [searchNama, setSearchNama] = useState('')

  useEffect(() => {
    fetchTempoData()
  }, [filterStatus])

  const fetchTempoData = async () => {
    setLoading(true)
    let query = supabase
      .from('pembayaran_tempo')
      .select('*')
      .order('jatuh_tempo', { ascending: true })

    if (filterStatus !== 'Semua') {
      query = query.eq('status', filterStatus)
    }

    const { data, error } = await query
    if (!error) setTempos(data || [])
    setLoading(false)
  }

  const markAsLunas = async (id) => {
    if (window.confirm('Konfirmasi pelunasan tagihan ini?')) {
      await supabase
        .from('pembayaran_tempo')
        .update({ status: 'Lunas', tanggal_lunas: new Date().toISOString() })
        .eq('id', id)
      fetchTempoData()
    }
  }

  const getStatusStyle = (status, jatuhTempo) => {
    if (status === 'Lunas') return { background: '#D1FAE5', color: '#059669' }
    const isOverdue = new Date(jatuhTempo) < new Date()
    if (isOverdue) return { background: '#FEE2E2', color: '#DC2626' }
    return { background: '#FEF3C7', color: '#D97706' }
  }

  const getStatusLabel = (status, jatuhTempo) => {
    if (status === 'Lunas') return 'Lunas'
    return new Date(jatuhTempo) < new Date() ? 'Jatuh Tempo' : 'Belum Lunas'
  }

  const getSisaHari = (jatuhTempo, status) => {
    if (status === 'Lunas') return '—'
    const diff = new Date(jatuhTempo) - new Date()
    const hari = Math.ceil(diff / (1000 * 60 * 60 * 24))
    if (hari < 0) return <span style={{ color: '#DC2626', fontWeight: 700 }}>Lewat {Math.abs(hari)} hari</span>
    if (hari === 0) return <span style={{ color: '#D97706', fontWeight: 700 }}>Hari ini!</span>
    return <span style={{ color: hari <= 3 ? '#D97706' : '#374151' }}>{hari} hari lagi</span>
  }

  // ==== REKAP TAGIHAN PER NAMA (poin 4) ====
  const rekapPerNama = useMemo(() => {
    const belumLunas = tempos.filter(t => t.status !== 'Lunas')
    const grouped = {}
    belumLunas.forEach(t => {
      const key = (t.nama_pelanggan || 'Tanpa Nama').trim().toLowerCase()
      if (!grouped[key]) {
        grouped[key] = { nama: t.nama_pelanggan || 'Tanpa Nama', total: 0, jumlahPesanan: 0, kamar: t.kamar }
      }
      grouped[key].total += Number(t.total_tagihan) || 0
      grouped[key].jumlahPesanan += 1
    })
    return Object.values(grouped).sort((a, b) => b.total - a.total)
  }, [tempos])

  const rekapFiltered = useMemo(() => {
    if (!searchNama.trim()) return rekapPerNama
    const q = searchNama.trim().toLowerCase()
    return rekapPerNama.filter(r => r.nama.toLowerCase().includes(q))
  }, [rekapPerNama, searchNama])

  // Tabel detail juga ikut ke-filter kalau lagi search nama
  const temposFiltered = useMemo(() => {
    if (!searchNama.trim()) return tempos
    const q = searchNama.trim().toLowerCase()
    return tempos.filter(t => (t.nama_pelanggan || '').toLowerCase().includes(q))
  }, [tempos, searchNama])

  // Hitung ringkasan notifikasi
  const jumlahBuktiBaru = tempos.filter(t => t.status === 'Belum Lunas' && t.bukti_bayar).length

  return (
    <div>
      <BuktiBayarModal url={buktiBayarUrl} onClose={() => setBuktiBayarUrl(null)} />

      {/* ==== PANEL CEK TAGIHAN PER NAMA ==== */}
      <div style={{ background: 'white', padding: 24, borderRadius: 16, boxShadow: 'var(--shadow-sm)', marginBottom: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <User size={18} /> Cek Tagihan per Nama
        </div>

        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input
            type="text"
            placeholder="Ketik nama pelanggan..."
            value={searchNama}
            onChange={e => setSearchNama(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px 10px 36px', borderRadius: 8,
              border: '1px solid var(--gray-300)', fontSize: 14, boxSizing: 'border-box'
            }}
          />
        </div>

        {rekapFiltered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--gray-400)', fontSize: 14 }}>
            {searchNama ? 'Tidak ada nama yang cocok, atau nama tersebut tidak punya tagihan.' : 'Tidak ada tagihan belum lunas saat ini.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {rekapFiltered.map((r, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', borderRadius: 10,
                background: 'var(--gray-50)', border: '1px solid var(--gray-100)'
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{r.nama}</div>
                  <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                    {r.jumlahPesanan} tagihan belum lunas {r.kamar ? `• Kamar ${r.kamar}` : ''}
                  </div>
                </div>
                <div style={{ fontWeight: 800, fontSize: 17, color: '#DC2626' }}>
                  Rp {r.total.toLocaleString('id-ID')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ==== TABEL DETAIL (existing) ==== */}
      <div style={{ background: 'white', padding: 24, borderRadius: 16, boxShadow: 'var(--shadow-sm)' }}>
        {filterStatus === 'Semua' && jumlahBuktiBaru > 0 && (
          <div style={{
            background: '#F3E8FF', color: '#7C3AED', borderRadius: 10,
            padding: '10px 16px', marginBottom: 16, fontSize: 15, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            📋 {jumlahBuktiBaru} pelanggan sudah upload bukti bayar tempo — perlu dikonfirmasi
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--gray-300)' }}
          >
            <option>Semua</option>
            <option>Belum Lunas</option>
            <option>Lunas</option>
          </select>

          <button
            onClick={() => window.print()}
            style={{ background: 'var(--orange)', color: 'white', display: 'flex', gap: 6, alignItems: 'center', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}
          >
            <Printer size={16} /> Cetak Laporan Piutang
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15, textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--gray-50)', borderBottom: '2px solid var(--gray-200)' }}>
              <th style={{ padding: 12 }}>Nama / Kamar</th>
              <th style={{ padding: 12 }}>Detail Pesanan</th>
              <th style={{ padding: 12 }}>Total Tagihan</th>
              <th style={{ padding: 12 }}>Tanggal Order</th>
              <th style={{ padding: 12 }}>Jatuh Tempo</th>
              <th style={{ padding: 12 }}>Sisa Waktu</th>
              <th style={{ padding: 12 }}>Bukti Bayar</th>
              <th style={{ padding: 12 }}>Tgl Lunas</th>
              <th style={{ padding: 12 }}>Status</th>
              <th style={{ padding: 12 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="10" style={{ textAlign: 'center', padding: 20 }}>Memuat...</td></tr>
            ) : temposFiltered.length === 0 ? (
              <tr><td colSpan="10" style={{ textAlign: 'center', padding: 20, color: 'var(--gray-400)' }}>
                {searchNama ? 'Tidak ada data untuk nama ini.' : 'Belum ada tagihan tempo.'}
              </td></tr>
            ) : temposFiltered.map((t) => (
              <tr
                key={t.id}
                style={{
                  borderBottom: '1px solid var(--gray-100)',
                  background: (t.bukti_bayar && t.status !== 'Lunas') ? '#FAF5FF' : 'white',
                }}
              >
                <td style={{ padding: 12, fontWeight: 700 }}>
                  {t.nama_pelanggan}
                  <br />
                  <span style={{ fontSize: 14, color: 'var(--gray-400)' }}>Kamar {t.kamar}</span>
                </td>
                <td style={{ padding: 12, maxWidth: 160, fontSize: 14 }}>{t.detail_pesanan || '-'}</td>
                <td style={{ padding: 12, fontWeight: 600 }}>
                  Rp {Number(t.total_tagihan).toLocaleString('id-ID')}
                </td>
                <td style={{ padding: 12 }}>
                  {new Date(t.tanggal_order).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td style={{ padding: 12 }}>
                  {new Date(t.jatuh_tempo).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td style={{ padding: 12, fontSize: 14 }}>
                  {getSisaHari(t.jatuh_tempo, t.status)}
                </td>

                <td style={{ padding: 12 }}>
                  {t.bukti_bayar ? (
                    <button
                      onClick={() => setBuktiBayarUrl(t.bukti_bayar)}
                      style={{
                        border: 'none', background: '#EDE9FE', color: '#7C3AED',
                        padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: 14, fontWeight: 600
                      }}
                    >
                      <Eye size={13} /> Lihat
                    </button>
                  ) : (
                    <span style={{ fontSize: 14, color: 'var(--gray-400)' }}>Belum ada</span>
                  )}
                </td>

                <td style={{ padding: 12, fontSize: 14, color: t.tanggal_lunas ? '#059669' : 'var(--gray-400)' }}>
                  {t.tanggal_lunas
                    ? new Date(t.tanggal_lunas).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—'}
                </td>

                <td style={{ padding: 12 }}>
                  <span style={{ padding: '4px 8px', borderRadius: 6, fontSize: 14, fontWeight: 700, ...getStatusStyle(t.status, t.jatuh_tempo) }}>
                    {getStatusLabel(t.status, t.jatuh_tempo)}
                  </span>
                </td>
                <td style={{ padding: 12 }}>
                  {t.status !== 'Lunas' && (
                    <button
                      onClick={() => markAsLunas(t.id)}
                      style={{ border: 'none', background: '#E6F4EA', color: '#137333', padding: '4px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
                    >
                      <Check size={14} /> Set Lunas
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}