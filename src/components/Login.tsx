import React, { useState } from 'react';
import { Compass, Lock, User as UserIcon, Loader2 } from 'lucide-react';
import { api } from '../utils/api';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      const data: any = await res.json();
      if (res.ok) {
        api.setToken(data.token);
        api.setUser(data.user);
        onLoginSuccess(data.user);
      } else {
        setError(data.error || 'Login gagal. Periksa kembali username dan password.');
      }
    } catch (err) {
      setError('Terjadi kesalahan koneksi ke server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1115] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#16191f] rounded-2xl border border-slate-800 p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl mb-4">
            <Compass size={40} className="animate-spin-slow" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">HeronMapper Pro</h1>
          <p className="text-slate-400 text-sm mt-1 text-center">Masuk ke sistem pemetaan lahan digital</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <UserIcon size={14} /> Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-[#0b0d10] border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
              placeholder="admin / username"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Lock size={14} /> Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#0b0d10] border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 mt-4"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Masuk ke Sistem'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800/50 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
            Sistem Informasi Katastrasi Digital v2.4
          </p>
        </div>
      </div>
    </div>
  );
};
