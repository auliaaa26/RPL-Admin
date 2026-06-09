import React, { useEffect, useState } from 'react'
import { Menu, Bell } from 'lucide-react'
import { supabase } from '../config/supabase'

export default function Topbar({ title, onMenuClick }) {
  const [adminInfo, setAdminInfo] = useState({ nama: 'Admin', role: 'Admin' })

  useEffect(() => {
    const fetchAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('admin_profile')
        .select('nama, role')
        .eq('id', user.id)
        .single()

      if (data) setAdminInfo({ nama: data.nama, role: data.role })
    }
    fetchAdmin()
  }, [])

  return (
    <header style={{ 
      height: 70, 
      background: 'white', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      padding: '0 24px', 
      borderBottom: '1px solid var(--gray-200)' 
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button 
          onClick={onMenuClick} 
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-700)' }}
        >
          <Menu size={22} />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--gray-800)', margin: 0 }}>
          {title}
        </h1>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Bell size={20} style={{ color: 'var(--gray-500)', cursor: 'pointer' }} />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-800)' }}>
            {adminInfo.nama}
          </div>
          <div style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 500 }}>
            {adminInfo.role}
          </div>
        </div>
      </div>
    </header>
  )
}