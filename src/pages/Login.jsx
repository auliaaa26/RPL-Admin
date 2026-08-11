import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErrorMsg('Email atau password salah!');
      return;
    }

    navigate('/dashboard');
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--gray-50)' }}>
      <form onSubmit={handleLogin} style={{ background: 'white', padding: 32, borderRadius: 12, boxShadow: 'var(--shadow-lg)', width: 340 }}>
        <h2 style={{ textAlign: 'center', marginBottom: 24, color: 'var(--gray-800)', fontSize: 24 }}>Login Admin</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: '100%', padding: '12px', marginBottom: 12, borderRadius: 6, border: '1px solid var(--gray-300)', fontSize: 15, boxSizing: 'border-box' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', padding: '12px', marginBottom: 16, borderRadius: 6, border: '1px solid var(--gray-300)', fontSize: 15, boxSizing: 'border-box' }}
        />
        {errorMsg && <p style={{ color: 'red', fontSize: 13, marginBottom: 12 }}>{errorMsg}</p>}
        <button type="submit" style={{ width: '100%', padding: '12px', background: 'var(--orange)', color: 'white', border: 'none', borderRadius: 6, fontWeight: 'bold', fontSize: 15, cursor: 'pointer' }}>
          Masuk
        </button>
      </form>
    </div>
  );
}