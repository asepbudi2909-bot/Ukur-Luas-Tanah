import React, { useState, useEffect } from 'react';
import { SavedLand, Point, ManualTriangleConfig } from '../types';
import { Bookmark, FolderOpen, Save, Trash2, Calendar, FileText, CheckCircle } from 'lucide-react';

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
}) => {
  const [savedLands, setSavedLands] = useState<SavedLand[]>([]);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  // Load from local storage
  useEffect(() => {
    const data = localStorage.getItem('heron-saved-lands');
    if (data) {
      try {
        setSavedLands(JSON.parse(data));
      } catch (err) {
        console.error('Failed to parse saved lands', err);
      }
    }
  }, []);

  // Save to local storage
  const saveToLocalStorage = (lands: SavedLand[]) => {
    localStorage.setItem('heron-saved-lands', JSON.stringify(lands));
    setSavedLands(lands);
  };

  const handleSaveLand = () => {
    if (points.length < 3 || !isClosed) return;
    if (!newName.trim()) return;

    const newLand: SavedLand = {
      id: `land-${Date.now()}`,
      name: newName,
      date: new Date().toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      points: [...points],
      scalePixelRatio,
      notes: newNotes.trim() ? newNotes : undefined,
      manualTriangleConfigs: [...manualTriangleConfigs],
    };

    const updated = [newLand, ...savedLands];
    saveToLocalStorage(updated);

    // Clear active input after saving
    setNewName('');
    setNewNotes('');
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
  };

  const handleDeleteLand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Apakah Anda yakin ingin menghapus arsip data ukur lahan ini?')) {
      const updated = savedLands.filter((l) => l.id !== id);
      saveToLocalStorage(updated);
    }
  };

  return (
    <div className="bg-[#16191f] rounded-2xl border border-slate-800 shadow-xl p-6 flex flex-col gap-5 h-full" id="saved-measurements-container">
      {/* Title */}
      <div className="flex items-center gap-2.5">
        <Bookmark className="text-emerald-400" size={20} />
        <div>
          <h3 className="font-bold text-white text-sm">Arsip Pemetaan</h3>
          <p className="text-[11px] text-slate-400">Simpan, kelola, dan muat kembali riwayat pengukuran lahan Anda secara lokal.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1">
        {/* Left column: Save current plot form */}
        <div className="bg-[#0b0d10] rounded-xl border border-slate-800 p-4 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-slate-500 font-mono block uppercase">SIMPAN PEMETAAN AKTIF</span>
            
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

          <div className="space-y-2">
            <button
              onClick={handleSaveLand}
              disabled={points.length < 3 || !isClosed || !newName.trim()}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/20 cursor-pointer"
              id="save-mapping-btn"
            >
              <Save size={14} />
              Arsipkan Lahan Sekarang
            </button>

            {showSaveSuccess && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[11px] text-emerald-400 flex items-center gap-1.5 font-medium justify-center">
                <CheckCircle size={14} className="text-emerald-400" />
                Data pemetaan berhasil diarsipkan secara lokal!
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
        <div className="flex flex-col border border-slate-800 rounded-xl p-4 bg-[#0b0d10]">
          <div className="flex items-center gap-1.5 mb-3 border-b border-slate-800 pb-2">
            <FolderOpen size={14} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 font-mono block uppercase">ARSIP LAHAN TERSIMPAN ({savedLands.length})</span>
          </div>

          {savedLands.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <FolderOpen size={28} className="text-slate-700 mb-2 font-mono" />
              <p className="text-[11px] text-slate-500">Belum ada pemetaan yang diarsipkan secara lokal.</p>
            </div>
          ) : (
            <div className="flex-1 max-h-[220px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {savedLands.map((land) => {
                return (
                  <div
                    key={land.id}
                    onClick={() => onLoadSavedLand(land)}
                    className="border border-slate-800/80 bg-[#16191f] hover:border-emerald-500/50 hover:bg-[#1c2128] p-3 rounded-lg flex items-center justify-between gap-4 cursor-pointer transition-all group"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                        {land.name}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                        <span className="flex items-center gap-0.5"><Calendar size={10} />{land.date.split(',')[0]}</span>
                        <span>•</span>
                        <span>{land.points.length} Koordinat</span>
                      </div>
                      {land.notes && (
                        <p className="text-[10px] text-slate-500 italic truncate max-w-[200px]">
                          "{land.notes}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => handleDeleteLand(e, land.id)}
                        className="p-1.5 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 text-slate-500 hover:text-rose-450 rounded-md transition-all"
                        title="Hapus Arsip"
                      >
                        <Trash2 size={13} />
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
