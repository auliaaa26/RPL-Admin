import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'admin123') { // Ganti dengan password yang kamu mau
      navigate('/dashboard');
    } else {
      alert('Password salah!');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--gray-50)' }}>
      <form onSubmit={handleLogin} style={{ background: 'white', padding: 32, borderRadius: 12, boxShadow: 'var(--shadow-lg)', width: 320 }}>
        <h2 style={{ textAlign: 'center', marginBottom: 24, color: 'var(--gray-800)' }}>Login Admin</h2>
        <input 
          type="password" 
          placeholder="Masukkan Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', padding: '10px', marginBottom: 16, borderRadius: 6, border: '1px solid var(--gray-300)' }}
        />
        <button type="submit" style={{ width: '100%', padding: '10px', background: 'var(--orange)', color: 'white', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}>
          Masuk
        </button>
      </form>
    </div>
  );
}