import React, { useState, useEffect } from 'react';
import { SavedLand, Point, ManualTriangleConfig } from '../types';
import { api } from '../utils/api';
import { 
  Bookmark, 
  FolderOpen, 
  Save, 
  Trash2, 
  Calendar, 
  FileText, 
  CheckCircle, 
  Edit2, 
  X, 
  Check, 
  RefreshCw,
  Loader2
} from 'lucide-react';

interface SavedMeasurementsProps {
  points: Point[];
  isClosed: boolean;
  scalePixelRatio: number;
  manualTriangleConfigs: ManualTriangleConfig[];
  onLoadSavedLand: (land: SavedLand) => void;
  newName: string;
  setNewName: (val: string) => void;
  newNotes: string;
  setNewNotes: (val: string) => void;
  activeLandId: string | null;
  setActiveLandId: (id: string | null) => void;
}

export const SavedMeasurements: React.FC<SavedMeasurementsProps> = ({
  points,
  isClosed,
  scalePixelRatio,
  manualTriangleConfigs,
  onLoadSavedLand,
  newName,
  setNewName,
  newNotes,
  setNewNotes,
  activeLandId,
  setActiveLandId,
}) => {
  const [savedLands, setSavedLands] = useState<SavedLand[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Inline metadata editing state
  const [editingLandId, setEditingLandId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [editingNotes, setEditingNotes] = useState<string>('');

  // Load from D1
  const fetchLands = async () => {
    setLoading(true);
    try {
      const res = await api.request('/api/lands');
      if (res.ok) {
        const data: any = await res.json();
        // Convert camelCase from DB if necessary, but here we'll map correctly
        const mappedData: SavedLand[] = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          date: item.date,
          points: item.points,
          scalePixelRatio: item.scale_pixel_ratio,
          notes: item.notes,
          manualTriangleConfigs: item.manual_triangle_configs
        }));
        setSavedLands(mappedData);
      }
    } catch (err) {
      console.error('Failed to fetch lands', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLands();
  }, []);

  const handleSaveLand = async () => {
    if (points.length < 3 || !isClosed) return;
    if (!newName.trim()) return;

    const landData = {
      name: newName,
      date: new Date().toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      points,
      scale_pixel_ratio: scalePixelRatio,
      notes: newNotes.trim() ? newNotes : undefined,
      manual_triangle_configs: manualTriangleConfigs,
    };

    try {
      const res = await api.request('/api/lands', {
        method: 'POST',
        body: JSON.stringify(landData),
      });

      if (res.ok) {
        const result: any = await res.json();
        setActiveLandId(result.id);
        fetchLands();
        setSuccessMessage('Data pemetaan berhasil diarsipkan di cloud!');
        setShowSaveSuccess(true);
        setTimeout(() => setShowSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateLand = async () => {
    if (!activeLandId) return;
    if (!newName.trim()) return;

    const landData = {
      id: activeLandId,
      name: newName.trim(),
      notes: newNotes.trim() ? newNotes.trim() : undefined,
      points,
      scale_pixel_ratio: scalePixelRatio,
      manual_triangle_configs: manualTriangleConfigs,
      date: `${new Date().toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })} (diperbarui)`,
    };

    try {
      const res = await api.request('/api/lands', {
        method: 'POST',
        body: JSON.stringify(landData),
      });

      if (res.ok) {
        fetchLands();
        setSuccessMessage('Arsip pemetaan berhasil diperbarui!');
        setShowSaveSuccess(true);
        setTimeout(() => setShowSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnlinkLand = () => {
    setActiveLandId(null);
    setNewName('');
    setNewNotes('');
  };

  const handleDeleteLand = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Apakah Anda yakin ingin menghapus arsip data ukur lahan ini?')) {
      try {
        const res = await api.request(`/api/lands?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchLands();
          if (activeLandId === id) {
            setActiveLandId(null);
            setNewName('');
            setNewNotes('');
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Inline metadata editing handlers
  const handleStartInlineEdit = (e: React.MouseEvent, land: SavedLand) => {
    e.stopPropagation();
    setEditingLandId(land.id);
    setEditingName(land.name);
    setEditingNotes(land.notes || '');
  };

  const handleCancelInlineEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLandId(null);
  };

  const handleSaveInlineEdit = async (e: React.MouseEvent, land: SavedLand) => {
    e.stopPropagation();
    if (!editingName.trim()) return;

    const updatedData = {
      ...land,
      id: land.id, // ensure id is passed for update
      name: editingName.trim(),
      notes: editingNotes.trim() ? editingNotes.trim() : undefined,
      scale_pixel_ratio: land.scalePixelRatio, // Map back to DB field name
      manual_triangle_configs: land.manualTriangleConfigs
    };

    try {
      const res = await api.request('/api/lands', {
        method: 'POST',
        body: JSON.stringify(updatedData),
      });

      if (res.ok) {
        fetchLands();
        setEditingLandId(null);
        if (activeLandId === land.id) {
          setNewName(editingName.trim());
          setNewNotes(editingNotes.trim());
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-[#16191f] rounded-2xl border border-slate-800 shadow-xl p-6 flex flex-col gap-5 h-full" id="saved-measurements-container">
      {/* Title */}
      <div className="flex items-center gap-2.5">
        <Bookmark className="text-emerald-400" size={20} />
        <div>
          <h3 className="font-bold text-white text-sm">Arsip Pemetaan Cloud</h3>
          <p className="text-[11px] text-slate-400">Simpan, perbarui, dan kelola arsip pengukuran lahan Anda secara terpusat.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1">
        {/* Left column: Save / Update current plot form */}
        <div className="bg-[#0b0d10] rounded-xl border border-slate-800 p-4 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 font-mono block uppercase">
                {activeLandId ? 'EDIT / PERBARUI ARSIP' : 'SIMPAN PEMETAAN AKTIF'}
              </span>
              {activeLandId && (
                <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-mono font-semibold">
                  Terkoneksi
                </span>
              )}
            </div>
            
            {activeLandId && (
              <div className="p-2.5 bg-blue-500/5 border border-blue-500/15 rounded-lg text-[10.5px] text-blue-400 flex items-center justify-between gap-1.5 font-medium leading-relaxed">
                <div className="flex items-center gap-1.5 min-w-0">
                  <FileText size={13} className="text-blue-400 flex-shrink-0" />
                  <span className="truncate">Tergabung dengan arsip yang dimuat.</span>
                </div>
                <button
                  type="button"
                  onClick={handleUnlinkLand}
                  className="px-2 py-0.5 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 rounded transition-all text-[9.5px] font-mono cursor-pointer flex-shrink-0"
                >
                  Batal Link
                </button>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Nama Bidang Lahan</label>
              <input
                type="text"
                placeholder="Contoh: Sawah Babakan Hilir"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={points.length < 3 || !isClosed}
                className="w-full px-3 py-2 text-xs border border-slate-800 bg-[#16191f] text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-[#16191f]/40 disabled:text-slate-500"
                id="save-land-name-input"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Catatan Batas Lapangan <span className="text-slate-500 font-normal">(Opsional)</span></label>
              <textarea
                placeholder="Contoh: Bersebelahan dengan kebun pisang pak roni..."
                rows={3}
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                disabled={points.length < 3 || !isClosed}
                className="w-full px-3 py-2 text-xs border border-slate-800 bg-[#16191f] text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none disabled:bg-[#16191f]/40 disabled:text-slate-500"
                id="save-land-notes-input"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-900">
            {activeLandId ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleUpdateLand}
                  disabled={points.length < 3 || !isClosed || !newName.trim()}
                  className="py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                  title="Perbarui data ukur lapangan, koordinat, skala, dan manual segitiga dalam id arsip ini."
                >
                  <RefreshCw size={13} className="animate-spin-hover" />
                  Perbarui Arsip
                </button>
                <button
                  type="button"
                  onClick={handleSaveLand}
                  disabled={points.length < 3 || !isClosed || !newName.trim()}
                  className="py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                  title="Simpan sebagai berkas arsip terpisah yang baru."
                >
                  <Save size={13} />
                  Simpan Baru
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSaveLand}
                disabled={points.length < 3 || !isClosed || !newName.trim()}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/20 cursor-pointer"
                id="save-mapping-btn"
              >
                <Save size={14} />
                Arsipkan Lahan Sekarang
              </button>
            )}

            {showSaveSuccess && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[11px] text-emerald-400 flex items-center gap-1.5 font-medium justify-center animate-pulse">
                <CheckCircle size={14} className="text-emerald-400" />
                {successMessage}
              </div>
            )}

            {!isClosed && (
              <p className="text-[10px] text-center text-slate-500 leading-snug">
                ⚠️ Anda harus menyelesaikan penggambaran poligon di canvas sebelum mengarsipkan.
              </p>
            )}
          </div>
        </div>

        {/* Right column: List of saved items */}
        <div className="flex flex-col border border-slate-800 rounded-xl p-4 bg-[#0b0d10] h-[310px]">
          <div className="flex items-center gap-1.5 mb-3 border-b border-slate-800 pb-2 flex-shrink-0">
            <FolderOpen size={14} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 font-mono block uppercase">ARSIP LAHAN TERSIMPAN ({savedLands.length})</span>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="animate-spin text-slate-600" size={28} />
            </div>
          ) : savedLands.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <FolderOpen size={28} className="text-slate-700 mb-2 font-mono" />
              <p className="text-[11px] text-slate-500">Belum ada pemetaan yang diarsipkan.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {savedLands.map((land) => {
                const isEditingThis = editingLandId === land.id;
                const isActiveThis = activeLandId === land.id;

                if (isEditingThis) {
                  return (
                    <div 
                      key={land.id}
                      onClick={(e) => e.stopPropagation()} 
                      className="border border-blue-500/40 bg-[#1c2128] p-3 rounded-lg space-y-2 transition-all shadow-inner"
                    >
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-blue-400 uppercase font-mono block">Nama Lahan</label>
                        <input 
                          type="text" 
                          value={editingName} 
                          onChange={(e) => setEditingName(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-800 bg-[#0b0d10] text-white rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-blue-400 uppercase font-mono block">Catatan Lahan</label>
                        <textarea 
                          value={editingNotes} 
                          onChange={(e) => setEditingNotes(e.target.value)}
                          rows={2}
                          placeholder="Tambahkan catatan batas..."
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-800 bg-[#0b0d10] text-white rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                        />
                      </div>
                      <div className="flex justify-end gap-1.5 pt-1 border-t border-slate-800/60">
                        <button 
                          type="button"
                          onClick={handleCancelInlineEdit}
                          className="px-2.5 py-1 text-[10px] font-bold border border-slate-800 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                          Batal
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => handleSaveInlineEdit(e, land)}
                          disabled={!editingName.trim()}
                          className="px-3 py-1 text-[10px] font-bold bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 rounded text-white transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Check size={11} />
                          Simpan
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={land.id}
                    onClick={() => onLoadSavedLand(land)}
                    className={`border p-3 rounded-lg flex items-center justify-between gap-4 cursor-pointer transition-all group ${
                      isActiveThis 
                        ? 'bg-blue-950/20 border-blue-500/40 hover:border-blue-500/60 shadow-md shadow-blue-950/10' 
                        : 'bg-[#16191f] border-slate-800/80 hover:border-emerald-500/50 hover:bg-[#1c2128]'
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className={`text-xs font-bold truncate transition-colors flex items-center gap-1.5 ${
                        isActiveThis ? 'text-blue-400' : 'text-white group-hover:text-emerald-400'
                      }`}>
                        {isActiveThis && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0 animate-pulse"></span>}
                        {land.name}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                        <span className="flex items-center gap-0.5"><Calendar size={10} />{land.date.split(',')[0]}</span>
                        <span>•</span>
                        <span>{land.points.length} Koordinat</span>
                      </div>
                      {land.notes && (
                        <p className="text-[10px] text-slate-450 italic truncate max-w-[200px] leading-relaxed">
                          "{land.notes}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleStartInlineEdit(e, land)}
                        className="p-1.5 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 text-slate-500 hover:text-blue-400 rounded-md transition-all"
                        title="Edit Info Arsip Lahan"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteLand(e, land.id)}
                        className="p-1.5 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 text-slate-500 hover:text-rose-400 rounded-md transition-all"
                        title="Hapus Arsip"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
