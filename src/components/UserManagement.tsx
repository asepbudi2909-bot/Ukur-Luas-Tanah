import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, Users, Shield, User, Loader2, X } from 'lucide-react';
import { api } from '../utils/api';

interface UserData {
  id: string;
  username: string;
  role: string;
  created_at: string;
}

export const UserManagement: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.request('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAdding(true);
    try {
      const res = await api.request('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ username, password, role }),
      });
      if (res.ok) {
        setUsername('');
        setPassword('');
        setRole('user');
        fetchUsers();
      } else {
        const data: any = await res.json();
        setError(data.error || 'Gagal menambah user');
      }
    } catch (err) {
      setError('Kesalahan koneksi');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Hapus user ini?')) return;
    try {
      const res = await api.request(`/api/admin/users?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#16191f] border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-none">Kelola Pengguna</h2>
              <p className="text-xs text-slate-400 mt-1">Daftarkan dan kelola akses juru ukur</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Add Form */}
          <form onSubmit={handleAddUser} className="bg-[#0b0d10] p-4 rounded-xl border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <UserPlus size={14} /> Daftarkan User Baru
            </h3>

            {error && <p className="text-xs text-rose-400 bg-rose-400/10 p-2 rounded border border-rose-400/20">{error}</p>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-[#16191f] border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-[#16191f] border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 bg-[#16191f] border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="user">User Biasa</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={adding}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {adding ? <Loader2 size={14} className="animate-spin" /> : <><UserPlus size={14} /> Daftarkan Juru Ukur</>}
            </button>
          </form>

          {/* User List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Daftar Pengguna Aktif</h3>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-slate-600" /></div>
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u.id} className="bg-[#0b0d10] p-3 rounded-xl border border-slate-800 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${u.role === 'admin' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-500/10 text-slate-400'}`}>
                        {u.role === 'admin' ? <Shield size={16} /> : <User size={16} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{u.username}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter ${
                            u.role === 'admin' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-slate-800 text-slate-500'
                          }`}>
                            {u.role}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-mono">ID: {u.id.slice(0, 8)}... • Terdaftar: {new Date(u.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="p-2 hover:bg-rose-500/10 text-slate-600 hover:text-rose-400 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
