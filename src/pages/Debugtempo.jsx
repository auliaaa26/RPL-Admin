import { useEffect, useState } from 'react'
import { supabase } from '../config/supabase'

/**
 * HALAMAN DEBUG SEMENTARA
 * Tempel sementara di route /debug-tempo untuk cek masalah data tempo
 * Hapus setelah masalah teratasi
 */
export default function DebugTempo() {
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(false)
  const [insertLog, setInsertLog] = useState([])

  const log = (msg, data = null, isError = false) => {
    setInsertLog(prev => [...prev, { msg, data, isError, time: new Date().toLocaleTimeString('id-ID') }])
  }

  // 1. Cek apakah tabel pembayaran_tempo bisa dibaca
  const checkRead = async () => {
    setResults({})
    setInsertLog([])
    setLoading(true)
    log('🔍 Membaca tabel pembayaran_tempo...')

    const { data, error, status } = await supabase
      .from('pembayaran_tempo')
      .select('*')
      .limit(5)

    if (error) {
      log(`❌ READ GAGAL — HTTP ${status}`, error, true)
      log('→ Kemungkinan: tabel tidak ada, atau RLS memblokir SELECT', null, true)
    } else {
      log(`✅ READ berhasil — ${data.length} baris ditemukan`, data)

      if (data.length > 0) {
        log('📋 Kolom yang ada di tabel:', Object.keys(data[0]))
        const punya_bukti = 'bukti_bayar' in data[0]
        const punya_lunas = 'tanggal_lunas' in data[0]
        if (!punya_bukti) log('⚠️ Kolom bukti_bayar TIDAK ADA — perlu ALTER TABLE', null, true)
        else log('✅ Kolom bukti_bayar ada')
        if (!punya_lunas) log('⚠️ Kolom tanggal_lunas TIDAK ADA — perlu ALTER TABLE', null, true)
        else log('✅ Kolom tanggal_lunas ada')
      } else {
        log('⚠️ Tabel kosong — akan coba test INSERT sekarang...')
      }
    }

    setResults(prev => ({ ...prev, read: { data, error, status } }))
    setLoading(false)
  }

  // 2. Test INSERT dummy ke pembayaran_tempo
  const checkInsert = async () => {
    setLoading(true)
    log('🔍 Mencoba INSERT test ke pembayaran_tempo...')

    const testPayload = {
      id_pesanan: 'TEST-' + Date.now(),
      nama_pelanggan: 'Test Debug',
      kamar: 'TEST',
      detail_pesanan: 'Debug test item',
      total_tagihan: 1000,
      jatuh_tempo: new Date(Date.now() + 14 * 86400000).toISOString(),
      status: 'Belum Lunas',
    }

    log('📦 Payload yang dikirim:', testPayload)

    const { data, error, status } = await supabase
      .from('pembayaran_tempo')
      .insert([testPayload])
      .select()

    if (error) {
      log(`❌ INSERT GAGAL — HTTP ${status}`, error, true)

      if (status === 403 || error.code === '42501') {
        log('→ RLS (Row Level Security) memblokir INSERT dari pelanggan', null, true)
        log('→ Solusi: Tambahkan policy INSERT di Supabase Dashboard → Authentication → Policies', null, true)
      } else if (error.code === '23502') {
        log('→ Ada kolom NOT NULL yang wajib diisi tapi kosong: ' + error.details, null, true)
      } else if (error.code === '42P01') {
        log('→ Tabel pembayaran_tempo tidak ditemukan!', null, true)
      } else if (error.code === '42703') {
        log('→ Nama kolom tidak cocok: ' + error.message, null, true)
      }
    } else {
      log(`✅ INSERT berhasil!`, data)
      log('→ Data masuk ke tabel. Masalah bukan di kode, cek ulang flow Payment.jsx')

      // Langsung hapus data test
      if (data?.[0]?.id) {
        await supabase.from('pembayaran_tempo').delete().eq('id', data[0].id)
        log('🗑️ Data test sudah dihapus otomatis')
      }
    }

    setResults(prev => ({ ...prev, insert: { data, error, status } }))
    setLoading(false)
  }

  // 3. Cek pesanan_masuk yang bertipe tempo (apakah insert ke sana berhasil)
  const checkPesananTempo = async () => {
    setLoading(true)
    log('🔍 Membaca pesanan_masuk dengan tipe_pembayaran = tempo...')

    const { data, error, status } = await supabase
      .from('pesanan_masuk')
      .select('id_pesanan, nama_pelanggan, kamar, detail_pesanan, total_harga, tipe_pembayaran, status, created_at')
      .eq('tipe_pembayaran', 'tempo')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      log(`❌ READ pesanan_masuk GAGAL — HTTP ${status}`, error, true)
    } else {
      log(`✅ Ditemukan ${data.length} pesanan dengan tipe tempo`, data)

      if (data.length > 0) {
        log('→ id_pesanan yang perlu ada di pembayaran_tempo:', data.map(d => d.id_pesanan))

        // Bandingkan dengan yang ada di pembayaran_tempo
        const ids = data.map(d => d.id_pesanan)
        const { data: tempoRows } = await supabase
          .from('pembayaran_tempo')
          .select('id_pesanan')
          .in('id_pesanan', ids)

        const tempoIds = (tempoRows || []).map(r => r.id_pesanan)
        const hilang = ids.filter(id => !tempoIds.includes(id))

        if (hilang.length > 0) {
          log(`⚠️ ${hilang.length} pesanan tempo TIDAK ADA di tabel pembayaran_tempo:`, hilang, true)
          log('→ INSERT ke pembayaran_tempo gagal saat order. Lihat error INSERT di atas.', null, true)
        } else {
          log('✅ Semua pesanan tempo sudah ada di pembayaran_tempo')
        }
      }
    }

    setLoading(false)
  }

  // 4. Repair: masukkan ulang pesanan tempo yang hilang
  const repairMissingTempo = async () => {
    setLoading(true)
    log('🔧 Mencoba repair — insert ulang pesanan tempo yang hilang...')

    const { data: pesanan } = await supabase
      .from('pesanan_masuk')
      .select('*')
      .eq('tipe_pembayaran', 'tempo')
      .order('created_at', { ascending: false })

    if (!pesanan || pesanan.length === 0) {
      log('Tidak ada pesanan tempo untuk di-repair')
      setLoading(false)
      return
    }

    const { data: existing } = await supabase
      .from('pembayaran_tempo')
      .select('id_pesanan')

    const existingIds = (existing || []).map(r => r.id_pesanan)
    const missing = pesanan.filter(p => !existingIds.includes(p.id_pesanan))

    log(`Ditemukan ${missing.length} pesanan yang perlu di-repair`, missing.map(m => m.id_pesanan))

    for (const p of missing) {
      const jatuhTempo = new Date(p.created_at)
      jatuhTempo.setDate(jatuhTempo.getDate() + 14)

      const { error } = await supabase
        .from('pembayaran_tempo')
        .insert([{
          id_pesanan: p.id_pesanan,
          nama_pelanggan: p.nama_pelanggan,
          kamar: p.kamar,
          detail_pesanan: p.detail_pesanan,
          total_tagihan: p.total_harga,
          jatuh_tempo: jatuhTempo.toISOString(),
          status: 'Belum Lunas',
          tanggal_order: p.created_at,
        }])

      if (error) {
        log(`❌ Gagal repair id_pesanan=${p.id_pesanan}: ${error.message}`, error, true)
      } else {
        log(`✅ Berhasil repair id_pesanan=${p.id_pesanan}`)
      }
    }

    log('🔧 Repair selesai. Refresh halaman Manajemen Pembayaran Tempo.')
    setLoading(false)
  }

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto', fontFamily: 'monospace', fontSize: 15 }}>
      <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 10, padding: '10px 16px', marginBottom: 20 }}>
        <strong>⚠️ Halaman Debug Sementara</strong> — Hapus setelah masalah teratasi
      </div>

      <h2 style={{ marginBottom: 16, fontFamily: 'sans-serif' }}>Debug: Pembayaran Tempo Tidak Muncul</h2>

      {/* Tombol aksi */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        {[
          { label: '1. Cek Baca Tabel', fn: checkRead, color: '#1D4ED8', bg: '#DBEAFE' },
          { label: '2. Cek Insert', fn: checkInsert, color: '#065F46', bg: '#D1FAE5' },
          { label: '3. Cek Pesanan Tempo', fn: checkPesananTempo, color: '#7C3AED', bg: '#EDE9FE' },
          { label: '4. Repair Data Hilang', fn: repairMissingTempo, color: '#92400E', bg: '#FEF3C7' },
        ].map(btn => (
          <button
            key={btn.label}
            onClick={btn.fn}
            disabled={loading}
            style={{
              background: btn.bg, color: btn.color,
              border: `1px solid ${btn.color}30`,
              padding: '8px 16px', borderRadius: 8,
              fontWeight: 700, fontSize: 14, cursor: 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Log output */}
      <div style={{
        background: '#111827', color: '#F9FAFB',
        borderRadius: 12, padding: 16, minHeight: 200,
        maxHeight: 500, overflowY: 'auto',
      }}>
        {insertLog.length === 0 && (
          <p style={{ color: '#6B7280', margin: 0 }}>Klik tombol di atas untuk mulai diagnosa...</p>
        )}
        {insertLog.map((l, i) => (
          <div key={i} style={{ marginBottom: 6 }}>
            <span style={{ color: '#6B7280', marginRight: 8 }}>[{l.time}]</span>
            <span style={{ color: l.isError ? '#F87171' : l.msg.startsWith('✅') ? '#34D399' : '#FCD34D' }}>
              {l.msg}
            </span>
            {l.data && (
              <pre style={{
                marginTop: 4, marginLeft: 16,
                color: '#9CA3AF', fontSize: 14,
                whiteSpace: 'pre-wrap', wordBreak: 'break-all'
              }}>
                {JSON.stringify(l.data, null, 2)}
              </pre>
            )}
          </div>
        ))}
        {loading && <p style={{ color: '#60A5FA', margin: 0, marginTop: 8 }}>⏳ Memproses...</p>}
      </div>

      {/* Solusi umum */}
      <div style={{ marginTop: 24, background: 'white', borderRadius: 12, padding: 16, border: '1px solid #E5E7EB' }}>
        <h3 style={{ marginBottom: 12, fontFamily: 'sans-serif', fontSize: 15 }}>Kemungkinan Solusi</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            {
              title: 'RLS Policy INSERT kurang',
              desc: 'Supabase Dashboard → Table Editor → pembayaran_tempo → RLS Policies → tambah policy INSERT untuk role authenticated/anon',
              color: '#DC2626', bg: '#FEE2E2'
            },
            {
              title: 'Kolom tidak ada (bukti_bayar / tanggal_lunas)',
              desc: 'Jalankan di SQL Editor: ALTER TABLE pembayaran_tempo ADD COLUMN IF NOT EXISTS bukti_bayar TEXT, ADD COLUMN IF NOT EXISTS tanggal_lunas TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS tanggal_order TIMESTAMPTZ;',
              color: '#D97706', bg: '#FEF3C7'
            },
            {
              title: 'Nama kolom berbeda',
              desc: 'Cek di Table Editor apakah nama kolom di DB sama persis dengan yang dipakai di kode (case-sensitive)',
              color: '#7C3AED', bg: '#F3E8FF'
            },
          ].map((s, i) => (
            <div key={i} style={{ background: s.bg, borderRadius: 8, padding: '10px 14px' }}>
              <p style={{ color: s.color, fontWeight: 700, margin: '0 0 4px', fontFamily: 'sans-serif' }}>
                {i + 1}. {s.title}
              </p>
              <p style={{ color: '#374151', margin: 0, fontFamily: 'sans-serif', fontSize: 14 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}