import React, { useEffect, useState } from 'react'
import { supabase } from '../config/supabase'
import { Plus, Trash2, SlidersHorizontal, Image, Pencil, X, Check } from 'lucide-react'

const EMPTY_FORM = { nama: '', harga: '', kategori: 'paket', deskripsi: '', foto: '' }

export default function MenuManagement() {
  const [menus, setMenus] = useState([])
  const [filterKategori, setFilterKategori] = useState('Semua')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [editId, setEditId] = useState(null) // null = mode tambah, ada id = mode edit
  const [formInput, setFormInput] = useState(EMPTY_FORM)

  useEffect(() => { fetchMenus() }, [filterKategori])

  const fetchMenus = async () => {
    setLoading(true)
    let query = supabase.from('menus').select('*').order('nama', { ascending: true })
    if (filterKategori !== 'Semua') query = query.eq('kategori', filterKategori.toLowerCase())
    const { data, error } = await query
    if (error) console.error("Gagal mengambil data menu:", error.message)
    else setMenus(data || [])
    setLoading(false)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormInput(prev => ({ ...prev, [name]: value }))
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      setUploading(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('menu-images').upload(fileName, file)
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('menu-images').getPublicUrl(fileName)
      setFormInput(prev => ({ ...prev, foto: data.publicUrl }))
    } catch (error) {
      alert('Gagal mengunggah foto: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  // Mode edit: isi form dengan data menu yang dipilih
  const handleEditClick = (item) => {
    setEditId(item.id)
    setFormInput({
      nama: item.nama || '',
      harga: item.harga || '',
      kategori: item.kategori || 'paket',
      deskripsi: item.deskripsi || '',
      foto: item.foto || '',
    })
  }

  const handleCancelEdit = () => {
    setEditId(null)
    setFormInput(EMPTY_FORM)
  }

  // Simpan edit
  const handleUpdateMenu = async (e) => {
    e.preventDefault()
    if (!formInput.nama || !formInput.harga) return alert('Nama dan Harga wajib diisi!')
    const { error } = await supabase.from('menus').update({
      nama: formInput.nama,
      harga: parseInt(formInput.harga),
      kategori: formInput.kategori.toLowerCase(),
      deskripsi: formInput.deskripsi || null,
      foto: formInput.foto || null,
    }).eq('id', editId)

    if (error) {
      alert('Gagal mengupdate menu: ' + error.message)
    } else {
      setEditId(null)
      setFormInput(EMPTY_FORM)
      fetchMenus()
    }
  }

  // Tambah baru
  const handleAddMenu = async (e) => {
    e.preventDefault()
    if (!formInput.nama || !formInput.harga) return alert('Nama dan Harga wajib diisi!')
    const { error } = await supabase.from('menus').insert([{
      nama: formInput.nama,
      harga: parseInt(formInput.harga),
      kategori: formInput.kategori.toLowerCase(),
      deskripsi: formInput.deskripsi || null,
      foto: formInput.foto || null,
    }])
    if (error) {
      alert('Gagal menambah menu: ' + error.message)
    } else {
      setFormInput(EMPTY_FORM)
      fetchMenus()
    }
  }

  const handleDeleteMenu = async (idMenu) => {
    if (window.confirm('Apakah kamu yakin ingin menghapus menu ini?')) {
      const { error } = await supabase.from('menus').delete().eq('id', idMenu)
      if (error) alert('Gagal menghapus menu: ' + error.message)
      else {
        if (editId === idMenu) handleCancelEdit()
        fetchMenus()
      }
    }
  }

  const isEditing = editId !== null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start', padding: '12px' }}>

      {/* FORM KIRI */}
      <div style={{ background: 'white', padding: 20, borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', position: 'sticky', top: 16 }}>
        {/* Header form berubah sesuai mode */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
            {isEditing ? '✏️ Edit Menu' : 'Tambah Menu Baru'}
          </h3>
          {isEditing && (
            <button onClick={handleCancelEdit} style={{ border: 'none', background: '#f3f4f6', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
              <X size={13} /> Batal
            </button>
          )}
        </div>

        {/* Banner nama menu yang sedang diedit */}
        {isEditing && (
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#9a3412' }}>
            Sedang mengedit: <strong>{formInput.nama}</strong>
          </div>
        )}

        <form onSubmit={isEditing ? handleUpdateMenu : handleAddMenu} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>Nama Menu</label>
            <input type="text" name="nama" value={formInput.nama} onChange={handleInputChange} placeholder="Contoh: Ayam Bakar" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box' }} required />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>Harga (Rp)</label>
            <input type="number" name="harga" value={formInput.harga} onChange={handleInputChange} placeholder="Contoh: 17000" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box' }} required />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>Kategori</label>
            <select name="kategori" value={formInput.kategori} onChange={handleInputChange} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, background: 'white', boxSizing: 'border-box' }}>
              <option value="paket">Paket</option>
              <option value="ayam">Ayam</option>
              <option value="bebek">Bebek</option>
              <option value="ikan">Ikan</option>
              <option value="cemilan">Cemilan</option>
              <option value="lainnya">Lainnya</option>
              <option value="minuman">Minuman</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>Foto Menu</label>
            <input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploading} style={{ fontSize: 12, width: '100%' }} />
            {uploading && <p style={{ fontSize: 11, color: 'orange', marginTop: 4 }}>Sedang mengunggah foto...</p>}
            {formInput.foto && (
              <div style={{ marginTop: 8 }}>
                <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Pratinjau:</p>
                <img src={formInput.foto} alt="Preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>Deskripsi Tambahan</label>
            <textarea name="deskripsi" value={formInput.deskripsi} onChange={handleInputChange} placeholder="Contoh: Sambal bawang pedas nampol..." rows="2" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>

          <button type="submit" disabled={uploading} style={{ padding: '10px', borderRadius: 8, border: 'none', background: uploading ? '#d1d5db' : isEditing ? '#f97316' : 'orange', color: 'white', fontWeight: 'bold', cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 13 }}>
            {isEditing ? <><Check size={16} /> Simpan Perubahan</> : <><Plus size={16} /> Simpan Menu</>}
          </button>
        </form>
      </div>

      {/* TABEL KANAN */}
      <div style={{ background: 'white', padding: 24, borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontWeight: 'bold', color: '#1f2937', margin: 0 }}>Daftar Menu Warung</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SlidersHorizontal size={14} style={{ color: '#6b7280' }} />
            <select value={filterKategori} onChange={e => setFilterKategori(e.target.value)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 12, background: 'white' }}>
              <option>Semua</option>
              <option>Paket</option>
              <option>Ayam</option>
              <option>Bebek</option>
              <option>Ikan</option>
              <option>Cemilan</option>
              <option>Lainnya</option>
              <option>Minuman</option>
            </select>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: 12, width: '60px' }}>Foto</th>
              <th style={{ padding: 12 }}>Nama Menu</th>
              <th style={{ padding: 12 }}>Kategori</th>
              <th style={{ padding: 12 }}>Harga</th>
              <th style={{ padding: 12, textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: 16 }}>Memuat daftar menu...</td></tr>
            ) : menus.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: 16, color: '#9ca3af' }}>Belum ada data menu.</td></tr>
            ) : menus.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6', background: editId === item.id ? '#fff7ed' : 'transparent', transition: 'background 0.2s' }}>
                <td style={{ padding: '8px 12px' }}>
                  {item.foto ? (
                    <img src={item.foto} alt={item.nama} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                  ) : (
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                      <Image size={16} />
                    </div>
                  )}
                </td>
                <td style={{ padding: 12, fontWeight: 600, color: '#1f2937' }}>
                  <div>{item.nama}</div>
                  {item.deskripsi && <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 400, marginTop: 2 }}>{item.deskripsi}</div>}
                </td>
                <td style={{ padding: 12, textTransform: 'capitalize', color: '#4b5563' }}>{item.kategori}</td>
                <td style={{ padding: 12, fontWeight: 600, color: '#1f2937' }}>Rp {Number(item.harga).toLocaleString('id-ID')}</td>
                <td style={{ padding: 12, textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    <button onClick={() => handleEditClick(item)} title="Edit" style={{ border: 'none', background: '#EFF6FF', color: '#1D4ED8', padding: '6px', borderRadius: 6, cursor: 'pointer' }}>
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDeleteMenu(item.id)} title="Hapus" style={{ border: 'none', background: '#FCE8E6', color: '#C5221F', padding: '6px', borderRadius: 6, cursor: 'pointer' }}>
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