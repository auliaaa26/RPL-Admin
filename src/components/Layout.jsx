import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const pageTitles = {
  '/dashboard': 'Dashboard Analisis',
  '/pesanan': 'Manajemen Pemesanan',
  '/pembayaran-tempo': 'Manajemen Pembayaran Tempo',
  '/menu': 'Manajemen Menu & Stok',
  '/pelanggan': 'Data Pelanggan',
  '/profil': 'Profil Admin',
}

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'Warung Kuliner'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--gray-50)' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, marginLeft: sidebarOpen ? 260 : 0, transition: 'margin 0.3s ease' }}>
        <Topbar title={title} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main style={{ flex: 1, padding: '24px', maxWidth: '100%' }}>
          {children}
        </main>
      </div>
    </div>
  )
}