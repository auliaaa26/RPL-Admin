import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import PembayaranTempo from './pages/PembayaranTempo'
import MenuManagement from './pages/MenuManagement'
import Pelanggan from './pages/Pelanggan'
import Profil from './pages/Profil'
import Pengeluaran from './pages/Pengeluaran'

import './index.css'

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />

          <Route path="/dashboard" element={
            <ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>
          } />
          <Route path="/pesanan" element={
            <ProtectedRoute><Layout><Orders /></Layout></ProtectedRoute>
          } />
          <Route path="/pembayaran-tempo" element={
            <ProtectedRoute allowedRoles={['admin']}><Layout><PembayaranTempo /></Layout></ProtectedRoute>
          } />
          <Route path="/menu" element={
            <ProtectedRoute allowedRoles={['admin']}><Layout><MenuManagement /></Layout></ProtectedRoute>
          } />
          <Route path="/pelanggan" element={
            <ProtectedRoute allowedRoles={['admin']}><Layout><Pelanggan /></Layout></ProtectedRoute>
          } />
          <Route path="/profil" element={
            <ProtectedRoute><Layout><Profil /></Layout></ProtectedRoute>
          } />
          <Route path="/pengeluaran" element={
  <ProtectedRoute allowedRoles={['admin']}><Layout><Pengeluaran /></Layout></ProtectedRoute>
} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}