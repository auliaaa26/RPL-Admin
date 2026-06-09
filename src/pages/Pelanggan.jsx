import React, { useEffect, useState } from 'react'
import { supabase } from '../config/supabase'
import { UserPlus, Trash2, Search, SlidersHorizontal, Edit2, X, Check } from 'lucide-react'

export default function Pelanggan() {
  const [pelanggan, setPelanggan] = useState([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('Semua')
  const [loading, setLoading] = useState(true)

  // State untuk mode edit
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState(null)

  // State untuk form input/edit pelanggan (Ditambahkan email & password)
  const [formInput, setFormInput] = useState({
    nama: '',
    kamar: '',
    no_tlpn: '',
    tipe_pemesanan: 'Reguler',
    email: '',       // 👈 Tambahan untuk integrasi akun pelanggan
    password: ''     // 👈 Tambahan untuk integrasi akun pelanggan
  })

  useEffect(() => {
    fetchPelanggan()
  }, [])

  const fetchPelanggan = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('pelanggan')
      .select('*')
      .order('nama', { ascending: true })
    
    if (error) {
      console.error("Gagal mengambil data pelanggan:", error.message)
    } else {
      setPelanggan(data || [])
    }
    setLoading(false)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormInput(prev => ({ ...prev, [name]: value }))
  }

  // FUNGSI SIMPAN (BISA TAMBAH DENGAN AUTH / EDIT PROFILE)
  const handleSavePelanggan = async (e) => {
    e.preventDefault()
    
    if (isEditing) {
      if (!formInput.nama || !formInput.kamar) return alert('Nama dan Nomor Kamar wajib diisi!')
      
      // LOGIKA EDIT DATA (Hanya mengedit profil, tidak mengubah password auth di sini)
      const { error } = await supabase
        .from('pelanggan')
        .update({
          nama: formInput.nama,
          kamar: formInput.kamar,
          no_tlpn: formInput.no_tlpn,
          tipe_pemesanan: formInput.tipe_pemesanan,
          email: formInput.email // Mengupdate email di tabel profil jika berubah
        })
        .eq('id', editingId)

      if (error) {
        alert('Gagal memperbarui pelanggan: ' + error.message)
      } else {
        alert('Data pelanggan berhasil diperbarui!')
        cancelEdit()
        fetchPelanggan()
      }
    } else {
      // LOGIKA TAMBAH BARU + BUAT AKUN AUTH SUPABASE
      if (!formInput.nama || !formInput.kamar || !formInput.email || !formInput.password) {
        return alert('Semua data termasuk Email dan Password wajib diisi untuk pendaftaran akun!')
      }

      console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('Anon Key ada?:', !!import.meta.env.VITE_SUPABASE_ANON_KEY)

      // 1. Daftarkan kredensial login ke Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formInput.email,
        password: formInput.password,
      })

      if (authError) {
        alert('Gagal mendaftarkan akun login: ' + authError.message)
        return
      }

      // 2. Jika Auth berhasil, gunakan User ID dari auth untuk dimasukkan ke tabel pelanggan
      const id_tagihan = 'T' + Math.floor(100 + Math.random() * 900)
      const { error: dbError } = await supabase.from('pelanggan').insert([
        {
          id: authData.user.id, // 👈 Relasi ID auth dengan ID tabel profile
          id_tagihan,
          nama: formInput.nama,
          kamar: formInput.kamar,
          no_tlpn: formInput.no_tlpn,
          tipe_pemesanan: formInput.tipe_pemesanan,
          email: formInput.email,
          tagihan: 0,
          status: true
        }
      ])

      if (dbError) {
        alert('Akun login terbuat, namun gagal menyimpan profil ke database: ' + dbError.message)
      } else {
        alert('Pelanggan baru dan Akun Aplikasi berhasil dibuat!')
        setFormInput({ nama: '', kamar: '', no_tlpn: '', tipe_pemesanan: 'Reguler', email: '', password: '' })
        fetchPelanggan()
      }
    }
  }

  // FUNGSI UNTUK MEMICU MODE EDIT (DATA MASUK KE FORM KIRI)
  const startEdit = (p) => {
    setIsEditing(true)
    setEditingId(p.id)
    setFormInput({
      nama: p.nama,
      kamar: p.kamar,
      no_tlpn: p.no_tlpn || '',
      tipe_pemesanan: p.tipe_pemesanan || 'Reguler',
      email: p.email || '',
      password: '' // Kosongkan password saat edit demi keamanan
    })
  }

  // FUNGSI BATAL EDIT
  const cancelEdit = () => {
    setIsEditing(false)
    setEditingId(null)
    setFormInput({ nama: '', kamar: '', no_tlpn: '', tipe_pemesanan: 'Reguler', email: '', password: '' })
  }

  // FUNGSI JALUR CEPAT SWITCH STATUS (AKTIF / TUNGGAKAN)
  const handleToggleStatus = async (idPelanggan, currentStatus) => {
    const { error } = await supabase
      .from('pelanggan')
      .update({ status: !currentStatus })
      .eq('id', idPelanggan)

    if (error) {
      alert('Gagal mengubah status: ' + error.message)
    } else {
      fetchPelanggan()
    }
  }

  const handleDeletePelanggan = async (idPelanggan) => {
    if (window.confirm('Apakah kamu yakin ingin menghapus data pelanggan ini? (Catatan: Ini hanya menghapus profil dari data tabel)')) {
      const { error } = await supabase.from('pelanggan').delete().eq('id', idPelanggan)
      if (error) {
        alert('Gagal menghapus data: ' + error.message)
      } else {
        fetchPelanggan()
      }
    }
  }

  // Logika pencarian dan filter status
  const filteredPelanggan = pelanggan.filter(p => {
    const matchesSearch = p.nama.toLowerCase().includes(search.toLowerCase()) || p.kamar.includes(search)
    
    if (filterStatus === 'Semua') return matchesSearch
    if (filterStatus === 'Aktif') return matchesSearch && p.status === true
    if (filterStatus === 'Tunggakan') return matchesSearch && p.status === false
    return matchesSearch
  })

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: '24px', alignItems: 'start' }}>
      
      {/* 📋 SEKSI FORM INPUT / EDIT (SEBELAH KIRI) */}
      <div style={{ background: 'white', padding: 20, borderRadius: 16, boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontWeight: 'bold', color: 'var(--gray-800)', fontSize: 16 }}>
            {isEditing ? '⚡ Edit Data Pelanggan' : 'Tambah Pelanggan & Akun'}
          </h3>
          {isEditing && (
            <button onClick={cancelEdit} style={{ background: '#F3F4F6', border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2, color: 'var(--gray-600)' }}>
              <X size={12}/> Batal
            </button>
          )}
        </div>

        <form onSubmit={handleSavePelanggan} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>Nama Pelanggan</label>
            <input type="text" name="nama" value={formInput.nama} onChange={handleInputChange} placeholder="Contoh: Aulia Rachmah" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--gray-300)', fontSize: 13 }} required />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>Nomor Kamar</label>
            <input type="text" name="kamar" value={formInput.kamar} onChange={handleInputChange} placeholder="Contoh: A-12" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--gray-300)', fontSize: 13 }} required />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>No. Telepon</label>
            <input type="text" name="no_tlpn" value={formInput.no_tlpn} onChange={handleInputChange} placeholder="Contoh: 0855xxxxxx" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--gray-300)', fontSize: 13 }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>Email Akun (Untuk Login)</label>
            <input type="email" name="email" value={formInput.email} onChange={handleInputChange} placeholder="Contoh: pelanggan@gmail.com" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--gray-300)', fontSize: 13 }} required />
          </div>

          {/* Kolom password disembunyikan/di-disable ketika mengedit demi keamanan */}
          {!isEditing && (
            <div>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>Password Akun</label>
              <input type="password" name="password" value={formInput.password} onChange={handleInputChange} placeholder="Minimal 6 karakter" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--gray-300)', fontSize: 13 }} required={!isEditing} />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>Tipe Pemesanan</label>
            <select name="tipe_pemesanan" value={formInput.tipe_pemesanan} onChange={handleInputChange} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--gray-300)', fontSize: 13 }}>
              <option value="Reguler">Reguler</option>
              <option value="Tempo">Tempo (Piutang)</option>
            </select>
          </div>

          <button type="submit" style={{ padding: '10px', borderRadius: 8, border: 'none', background: isEditing ? '#059669' : 'orange', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 13 }}>
            {isEditing ? <Check size={16} /> : <UserPlus size={16} />} 
            {isEditing ? 'Perbarui Data Profil' : 'Buat Akun & Simpan'}
          </button>
        </form>
      </div>

      {/* 📊 SEKSI TABEL DATA (SEBELAH KANAN) */}
      <div style={{ background: 'white', padding: 24, borderRadius: 16, boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          
          <div style={{ position: 'relative', flex: 1, maxWidth: 260 }}>
            <input type="text" style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: 8, border: '1px solid var(--gray-300)', fontSize: 13 }} placeholder="Cari Nama / Kamar..." value={search} onChange={e => setSearch(e.target.value)} />
            <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--gray-400)' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SlidersHorizontal size={14} style={{ color: 'var(--gray-500)' }} />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--gray-300)', fontSize: 12 }}>
              <option>Semua</option>
              <option>Aktif</option>
              <option>Tunggakan</option>
            </select>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--gray-50)', borderBottom: '2px solid var(--gray-200)', textAlign: 'left' }}>
              <th style={{ padding: 12 }}>ID Tagihan</th>
              <th style={{ padding: 12 }}>Nama Pelanggan</th>
              <th style={{ padding: 12 }}>Kamar</th>
              <th style={{ padding: 12 }}>No. Telp</th>
              <th style={{ padding: 12 }}>Tipe Pemesanan</th>
              <th style={{ padding: 12 }}>Tagihan</th>
              <th style={{ padding: 12 }}>Status</th>
              <th style={{ padding: 12, textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: 16 }}>Memuat data pelanggan...</td></tr>
            ) : filteredPelanggan.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: 16, color: 'var(--gray-400)' }}>Data pelanggan tidak ditemukan.</td></tr>
            ) : filteredPelanggan.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                <td style={{ padding: 12, fontWeight: 700 }}>{p.id_tagihan}</td>
                <td style={{ padding: 12, fontWeight: 600, color: 'var(--gray-800)' }}>{p.nama}</td>
                <td style={{ padding: 12 }}>{p.kamar}</td>
                <td style={{ padding: 12 }}>{p.no_tlpn || '-'}</td>
                <td style={{ padding: 12 }}>{p.tipe_pemesanan || 'Reguler'}</td>
                <td style={{ padding: 12, fontWeight: 600 }}>Rp {p.tagihan?.toLocaleString('id-ID')}</td>
                
                {/* STATUS CLICKABLE */}
                <td style={{ padding: 12 }}>
                  <button 
                    onClick={() => handleToggleStatus(p.id, p.status)}
                    title="Klik untuk mengubah status"
                    style={{ 
                      border: 'none',
                      padding: '4px 8px', 
                      borderRadius: 6, 
                      fontSize: 11, 
                      fontWeight: 700, 
                      background: p.status ? '#D1FAE5' : '#FEE2E2', 
                      color: p.status ? '#059669' : '#DC2626',
                      cursor: 'pointer',
                      transition: '0.2s'
                    }}
                  >
                    {p.status ? 'Aktif' : 'Tunggakan'}
                  </button>
                </td>

                {/* KOLOM AKSI (EDIT & HAPUS) */}
                <td style={{ padding: 12, textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    <button 
                      onClick={() => startEdit(p)} 
                      style={{ border: 'none', background: '#EFF6FF', color: '#2563EB', padding: '6px', borderRadius: 6, cursor: 'pointer' }}
                      title="Edit Data"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDeletePelanggan(p.id)} 
                      style={{ border: 'none', background: '#FCE8E6', color: '#C5221F', padding: '6px', borderRadius: 6, cursor: 'pointer' }}
                      title="Hapus Data"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  )
}