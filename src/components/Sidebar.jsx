import React from 'react'
import { NavLink } from 'react-router-dom'
import fotoLogo from '../assets/logo.jpeg'

const navItems = [
  { to: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { to: '/pesanan', icon: '📋', label: 'Manajemen Pesanan' },
  { to: '/pembayaran-tempo', icon: '💳', label: 'Manajemen Pembayaran Tempo' },
  { to: '/menu', icon: '🍽️', label: 'Manajemen Menu' },
  { to: '/pelanggan', icon: '👥', label: 'Data Pelanggan' },
]

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 99, backdropFilter: 'blur(2px)' }}
          onClick={onClose}
        />
      )}
      <aside style={{
        position: 'fixed', top: 0, left: 0, height: '100vh', width: 260,
        background: 'white', zIndex: 100, display: 'flex', flexDirection: 'column',
        boxShadow: '4px 0 24px rgba(0,0,0,0.08)',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease',
      }}>
        {/* Logo */}
        <div style={{ background: 'var(--orange)', padding: '28px 24px 32px', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', bottom: -20, right: -20, width: 100, height: 100,
            background: 'rgba(255,255,255,0.1)', borderRadius: '50%'
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img
              src={fotoLogo}
              alt="Logo"
              style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover', border: '2px solid white' }}
            />
            <div>
              <div style={{ color: 'white', fontWeight: 800, fontSize: 15, lineHeight: 1.2 }}>
                Warung Kuliner
              </div>
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 600 }}>
                3 Putri
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 14px', borderRadius: 10, marginBottom: 4,
                textDecoration: 'none', transition: 'all 0.2s',
                background: isActive ? 'var(--orange-bg)' : 'transparent',
                color: isActive ? 'var(--orange)' : 'var(--gray-600)',
                fontWeight: isActive ? 700 : 500,
                fontSize: 13.5,
                borderLeft: isActive ? '3px solid var(--orange)' : '3px solid transparent',
              })}
            >
              <span style={{ fontSize: 18, minWidth: 22, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Version */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--gray-100)', fontSize: 11, color: 'var(--gray-400)' }}>
          Admin Panel v1.0
        </div>
      </aside>
    </>
  )
}