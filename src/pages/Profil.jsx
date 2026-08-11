import React, { useEffect, useState } from 'react'
import { supabase } from '../config/supabase'
import { LogOut, Save, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Profil() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState({ id: '', nama: '', no_tlpn: '', alamat: '', email: '' })

  useEffect(() => {
    fetchProfileData()
  }, [])

  const fetchProfileData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('admin_profile').select('*').eq('user_id', user.id).single()
      setProfile({
        id: data?.id || '',
        nama: data?.nama || '',
        no_tlpn: data?.no_tlpn || '',
        alamat: data?.alamat || '',
        email: user.email
      })
    }
  }

  const handleSave = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (profile.id) {
      await supabase.from('admin_profile').update({ nama: profile.nama, no_tlpn: profile.no_tlpn, alamat: profile.alamat }).eq('id', profile.id)
    } else {
      await supabase.from('admin_profile').insert({ user_id: user.id, nama: profile.nama, no_tlpn: profile.no_tlpn, alamat: profile.alamat })
    }
    alert('Profil berhasil diperbarui!')
    setLoading(false)
    fetchProfileData()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', background: 'linear-gradient(135deg, var(--orange) 0%, var(--orange-dark) 100%)', borderRadius: 20, padding: 32, color: 'white' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <User size={40} color="var(--orange)" />
        </div>
        <h3 style={{ margin: 0, fontWeight: 800 }}>{profile.nama || 'Admin Utama'}</h3>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>Warung Kuliner 3 Putri</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Email Anda</label>
          <input type="text" className="form-input" value={profile.email} disabled style={{ width: '100%', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none' }} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Nama Lengkap</label>
          <input type="text" className="form-input" value={profile.nama} onChange={(e) => setProfile({...profile, nama: e.target.value})} style={{ width: '100%', background: 'white', color: 'var(--gray-900)' }} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Nomor Telepon</label>
          <input type="text" className="form-input" value={profile.no_tlpn} onChange={(e) => setProfile({...profile, no_tlpn: e.target.value})} style={{ width: '100%', background: 'white', color: 'var(--gray-900)' }} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Alamat</label>
          <textarea className="form-input" value={profile.alamat} onChange={(e) => setProfile({...profile, alamat: e.target.value})} style={{ width: '100%', background: 'white', color: 'var(--gray-900)', height: 60, padding: 10 }} />
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <button onClick={handleSave} disabled={loading} style={{ flex: 1, background: 'white', color: 'var(--orange)', border: 'none', padding: 12, borderRadius: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
            <Save size={16} /> {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
          <button onClick={handleLogout} style={{ background: '#DC2626', color: 'white', border: 'none', padding: 12, borderRadius: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
            <LogOut size={16} /> Keluar Akun
          </button>
        </div>
      </div>
    </div>
  )
}