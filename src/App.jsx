// 1. KELOMPOK IMPORT (WAJIB DI PALING ATAS)
import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

// Import Layout (Pastikan ini di atas rute-rute halaman!)
import Layout from './components/Layout'

// Import Halaman-Halaman (Pages)
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import PembayaranTempo from './pages/PembayaranTempo'
import MenuManagement from './pages/MenuManagement'
import Pelanggan from './pages/Pelanggan'
import Profil from './pages/Profil'

// Import CSS Global
import './index.css'


// 2. FUNGSI UTAMA APLIKASI
export default function App() {
  return (
    <Router>
      <Routes>
        {/* Rute Login tanpa dibungkus Layout */}
        <Route path="/" element={<Login />} />

        {/* Semua rute admin dibungkus di dalam <Layout> */}
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/pesanan" element={<Layout><Orders /></Layout>} />
        <Route path="/pembayaran-tempo" element={<Layout><PembayaranTempo /></Layout>} />
        <Route path="/menu" element={<Layout><MenuManagement /></Layout>} />
        <Route path="/pelanggan" element={<Layout><Pelanggan /></Layout>} />
        <Route path="/profil" element={<Layout><Profil /></Layout>} />

        {/* Redirect otomatis jika rute tidak ditemukan */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  )
}