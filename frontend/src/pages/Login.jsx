import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setLibraUser } from '../utils/auth';

const Login = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Check for verified query param
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === '1') {
      setSuccess('E-posta başarıyla doğrulandı. Giriş yapabilirsiniz.');
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setSuccess('');

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      setError('Tüm alanlar zorunludur.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Lütfen geçerli bir e-posta adresi girin.');
      return;
    }
    if (password.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır.');
      return;
    }

    setLoading(true);

    try {
      const base = import.meta.env.VITE_API_URL || "https://miron22.onrender.com";
      const response = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const msg = data?.detail || data?.message || 'Giriş başarısız oldu.';
        throw new Error(msg);
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      const user = data?.user || {};
      setLibraUser({
        id: user?.id,
        email: user?.email,
        firstName: user?.user_metadata?.first_name || user?.user_metadata?.firstName || '',
        lastName: user?.user_metadata?.last_name || user?.user_metadata?.lastName || '',
      });

      navigate('/home');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white px-4">
      <div className="w-full max-w-md p-8 glass">
        <h2 className="text-3xl font-bold text-center mb-8 text-accent">
          Giriş
        </h2>

        {success && (
          <div className="mb-4 p-3 bg-green-900/30 border border-green-500/50 rounded text-green-200 text-sm">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded text-red-200 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-subtle mb-1">Ad</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={loading}
                className="w-full bg-black/40 border border-white/15 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-[var(--miron-gold)]"
                placeholder="Ad"
              />
            </div>
            <div>
              <label className="block text-sm text-subtle mb-1">Soyad</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={loading}
                className="w-full bg-black/40 border border-white/15 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-[var(--miron-gold)]"
                placeholder="Soyad"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-subtle mb-1">E-posta</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full bg-black/40 border border-white/15 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-[var(--miron-gold)]"
              placeholder="cdtmiron@gmail.com"
            />
          </div>
          <div>
            <label className="block text-sm text-subtle mb-1">Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full bg-black/40 border border-white/15 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-[var(--miron-gold)]"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary"
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
