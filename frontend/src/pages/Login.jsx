import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setLibraUser } from '../utils/auth';

const Login = () => {
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
    <div className="flex items-center justify-center min-h-screen bg-black text-white">
      <div className="w-full max-w-md p-8 bg-gray-900 rounded-xl border border-gray-800 shadow-2xl">
        <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Miron AI Giriş
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

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white focus:border-blue-500 focus:outline-none"
              placeholder="cdtmiron@gmail.com"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white focus:border-blue-500 focus:outline-none"
              placeholder="2003"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded font-semibold transition-colors"
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
