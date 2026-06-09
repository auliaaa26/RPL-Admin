import React, { useEffect, useState } from 'react'
import { supabase } from '../config/supabase'
import { Check, Printer } from 'lucide-react'

export default function PembayaranTempo() {
  const [tempos, setTempos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('Semua')

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
      await supabase.from('pembayaran_tempo').update({ status: 'Lunas' }).eq('id', id)
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

  return (
    <div style={{ background: 'white', padding: 24, borderRadius: 16, boxShadow: 'var(--shadow-sm)' }}>

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

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
        <thead>
          <tr style={{ background: 'var(--gray-50)', borderBottom: '2px solid var(--gray-200)' }}>
            <th style={{ padding: 12 }}>Nama / Kamar</th>
            <th style={{ padding: 12 }}>Detail Pesanan</th>
            <th style={{ padding: 12 }}>Total Tagihan</th>
            <th style={{ padding: 12 }}>Tanggal Order</th>
            <th style={{ padding: 12 }}>Jatuh Tempo</th>
            <th style={{ padding: 12 }}>Sisa Waktu</th>
            <th style={{ padding: 12 }}>Status</th>
            <th style={{ padding: 12 }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan="8" style={{ textAlign: 'center', padding: 20 }}>Memuat...</td></tr>
          ) : tempos.length === 0 ? (
            <tr><td colSpan="8" style={{ textAlign: 'center', padding: 20, color: 'var(--gray-400)' }}>Belum ada tagihan tempo.</td></tr>
          ) : tempos.map((t) => (
            <tr key={t.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
              <td style={{ padding: 12, fontWeight: 700 }}>
                {t.nama_pelanggan}
                <br />
                <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>Kamar {t.kamar}</span>
              </td>
              <td style={{ padding: 12, maxWidth: 160, fontSize: 12 }}>{t.detail_pesanan || '-'}</td>
              <td style={{ padding: 12, fontWeight: 600 }}>
                Rp {Number(t.total_tagihan).toLocaleString('id-ID')}
              </td>
              <td style={{ padding: 12 }}>
                {new Date(t.tanggal_order).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </td>
              <td style={{ padding: 12 }}>
                {new Date(t.jatuh_tempo).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </td>
              <td style={{ padding: 12, fontSize: 12 }}>
                {getSisaHari(t.jatuh_tempo, t.status)}
              </td>
              <td style={{ padding: 12 }}>
                <span style={{ padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, ...getStatusStyle(t.status, t.jatuh_tempo) }}>
                  {getStatusLabel(t.status, t.jatuh_tempo)}
                </span>
              </td>
              <td style={{ padding: 12 }}>
                {t.status !== 'Lunas' && (
                  <button
                    onClick={() => markAsLunas(t.id)}
                    style={{ border: 'none', background: '#E6F4EA', color: '#137333', padding: '4px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
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
  )
}