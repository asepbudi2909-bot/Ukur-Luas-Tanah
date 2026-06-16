import React, { useState } from 'react';
import { Point, Triangle } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calculator, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  Layers, 
  Info,
  ChevronRight,
  Trash2,
  PlusCircle,
  Move,
  PenTool
} from 'lucide-react';

interface CalculationDetailsProps {
  triangles: Triangle[];
  isClosed: boolean;
  points: Point[];
  activeTriangleId: string | null;
  setActiveTriangleId: (id: string | null) => void;
  onDeleteTriangle?: (id: string) => void;
  shoelaceArea?: number;
  drawingMode: 'draw' | 'edit' | 'heron' | 'pan';
  setDrawingMode: React.Dispatch<React.SetStateAction<'draw' | 'edit' | 'heron' | 'pan'>>;
  selectedPointIds: string[];
}

export const CalculationDetails: React.FC<CalculationDetailsProps> = ({
  triangles,
  isClosed,
  points,
  activeTriangleId,
  setActiveTriangleId,
  onDeleteTriangle,
  shoelaceArea = 0,
  drawingMode,
  setDrawingMode,
  selectedPointIds,
}) => {
  const [expandedTriangleId, setExpandedTriangleId] = useState<string | null>(null);
  const [showFormulaExplanation, setShowFormulaExplanation] = useState(false);

  const toggleTriangleExpand = (id: string) => {
    setExpandedTriangleId(expandedTriangleId === id ? null : id);
  };

  const totalHeronArea = triangles.reduce((sum, tri) => sum + tri.area, 0);

  return (
    <div className="bg-[#16191f] rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-full" id="calculation-details-container">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-[#16191f] border-b border-slate-800/85">
        <div className="flex items-center gap-2">
          <Calculator className="text-emerald-450 animate-pulse" size={18} />
          <h3 className="font-bold text-white text-sm">Alat Hitung Rumus Heron</h3>
        </div>
        <button
          onClick={() => setShowFormulaExplanation(!showFormulaExplanation)}
          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition-all cursor-pointer bg-transparent border-none"
          id="toggle-formula-info-btn"
        >
          <BookOpen size={13} />
          {showFormulaExplanation ? 'Sembunyikan Rumus' : 'Cara Kerja Rumus'}
        </button>
      </div>

      {/* Info Panel: Explanation of Heron's Formula */}
      <AnimatePresence>
        {showFormulaExplanation && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-[#0c0f14] border-b border-slate-800/70"
          >
            <div className="p-5 text-xs text-slate-350 space-y-3">
              <p className="font-bold text-emerald-450 flex items-center gap-1">
                <Info size={14} /> Apa itu Rumus Heron?
              </p>
              <p className="leading-relaxed">
                <strong>Rumus Heron</strong> digunakan untuk menghitung luas sembarang segitiga apabila panjang ketiga sisinya (a, b, dan c) sudah diketahui. Rumus ini sangat diunggulkan oleh juru ukur resmi BPN sebab tidak memerlukan tinggi segitiga rill dalam perhitungan.
              </p>
              <div className="p-3 bg-[#16191f] border border-slate-800 rounded-xl space-y-2 font-mono text-[11px]">
                <div>
                  <span className="text-emerald-400 font-bold">Langkah 1:</span> Hitung keliling setengah (s):
                  <div className="text-center py-1.5 font-black text-white">s = (a + b + c) / 2</div>
                </div>
                <div>
                  <span className="text-emerald-400 font-bold">Langkah 2:</span> Hitung Luas segitiga L:
                  <div className="text-center py-1.5 font-black text-white">Luas = √[s(s - a)(s - b)(s - c)]</div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Pilih mode <strong>Segitiga Manual</strong> untuk membagi area lahan menjadi beberapa sub-segitiga sesuai keinginan Anda secara akurat.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        
        {/* State 1: Polygon has not been closed yet */}
        {!isClosed && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-slate-500" id="waiting-state">
            <Layers size={36} className="text-slate-700 mb-3 animate-pulse" />
            <h4 className="text-xs font-semibold text-slate-400 mb-1">Mulai Petakan Batas Terlebih Dahulu</h4>
            <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed mb-4">
              Silakan letakkan patok tanah rill Anda di canvas. Minimal membutuhkan 3 koordinat batas lahan.
            </p>
            {points.length > 0 ? (
              <div className="px-3.5 py-2 bg-[#0b0d10] border border-slate-800 rounded-lg text-xs text-emerald-400 font-mono">
                Progress: Tergambar <span className="font-bold text-white font-mono">{points.length}</span> Patok Batas
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic">
                Klik bebas di grid canvas untuk menaruh patok awal
              </div>
            )}
          </div>
        )}

        {/* State 2: Polygon is closed but no manual triangles configured yet */}
        {isClosed && triangles.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center" id="empty-heron-triangles">
            <PlusCircle size={40} className="text-amber-500/70 mb-3 animate-bounce" />
            <h4 className="text-sm font-bold text-slate-300 mb-1">Dekomposisi Heron Menunggu Dibuat</h4>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-5">
              Anda telah menutup bidang batas lahan! Ketuk tombol <strong>"Segitiga Manual"</strong> di atas lalu pilih 3 patok secara berurutan untuk melukis rincian garis segitiga Heron Anda sendiri.
            </p>
            <div className="w-full bg-[#0b0d10] border border-slate-800 rounded-xl p-3 text-left text-xs text-slate-400 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center justify-center">1</span>
                <span>Klik mode <strong>Segitiga Manual</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center justify-center">2</span>
                <span>Klik 3 patok rill yang ingin disambungkan</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center justify-center">3</span>
                <span>Ulangi untuk membuat partisi lainnya secara sistematis</span>
              </div>
            </div>
            {shoelaceArea > 0 && (
              <div className="mt-5 w-full bg-slate-900/60 p-3 rounded-lg border border-slate-800 flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">Luas Poligon Asli:</span>
                <span className="font-bold text-white">{shoelaceArea.toLocaleString('id-ID', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} m²</span>
              </div>
            )}
          </div>
        )}

        {/* State 3: Display configured triangles list and final results comparing with Shoelace */}
        {isClosed && triangles.length > 0 && (
          <div className="space-y-4" id="triangles-list-container">
            <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold tracking-wider font-mono">
              <span>DAFTAR HERON SEGITIGA ({triangles.length} BIDANG)</span>
              <span>KLIK SEGITIGA UNTUK JALAN DETAIL</span>
            </div>

            {/* List of custom triangles */}
            <div className="max-h-[250px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {triangles.map((tri, idx) => {
                const isExpanded = expandedTriangleId === tri.id;
                const isHovered = activeTriangleId === tri.id;

                // Steps calculation strings
                const sa = parseFloat((tri.s - tri.a).toFixed(4));
                const sb = parseFloat((tri.s - tri.b).toFixed(4));
                const sc = parseFloat((tri.s - tri.c).toFixed(4));
                const product = parseFloat((tri.s * sa * sb * sc).toFixed(4));

                return (
                  <div
                    key={tri.id}
                    onMouseEnter={() => setActiveTriangleId(tri.id)}
                    onMouseLeave={() => setActiveTriangleId(null)}
                    className={`border rounded-xl transition-all duration-200 overflow-hidden ${
                      isHovered
                        ? 'border-emerald-500 bg-emerald-500/5 shadow-md shadow-emerald-950/20'
                        : 'border-slate-800 bg-[#0b0d10] hover:border-slate-700'
                    }`}
                  >
                    {/* Collapsible header */}
                    <div className="p-3 flex items-center justify-between select-none">
                      <div 
                        onClick={() => toggleTriangleExpand(tri.id)}
                        className="flex-1 flex items-center gap-2.5 cursor-pointer"
                      >
                        <span className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black font-mono transition-colors ${
                          isHovered ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-300'
                        }`}>
                          T{idx + 1}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            {tri.label}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Sisi: a={tri.a}m, b={tri.b}m, c={tri.c}m
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-emerald-400 font-mono">
                          +{tri.area.toLocaleString('id-ID', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} m²
                        </span>
                        {onDeleteTriangle && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteTriangle(tri.id);
                            }}
                            className="p-1 px-1.5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded transition-all cursor-pointer border-none"
                            title="Hapus Segitiga Heron"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                        <div 
                          onClick={() => toggleTriangleExpand(tri.id)}
                          className="cursor-pointer"
                        >
                          {isExpanded ? (
                            <ChevronUp size={15} className="text-slate-500" />
                          ) : (
                            <ChevronDown size={15} className="text-slate-500" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Step-by-step calculus expanded content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-slate-800/60 bg-[#0c0f14] space-y-3 text-xs font-mono text-slate-300">
                        <div className="space-y-1.5 border-l-2 border-emerald-500/60 pl-3">
                          <div className="text-[10px] text-slate-500 font-semibold uppercase">Langkah 1: Menghitung Keliling Setengah (s)</div>
                          <div className="text-slate-400">
                            s = (a + b + c) / 2
                          </div>
                          <div className="text-slate-300">
                            s = ({tri.a} + {tri.b} + {tri.c}) / 2
                          </div>
                          <div className="text-emerald-400 font-bold">
                            s = {tri.s} m
                          </div>
                        </div>

                        <div className="space-y-1.5 border-l-2 border-teal-500/60 pl-3">
                          <div className="text-[10px] text-slate-500 font-semibold uppercase">Langkah 2: Memasukkan ke Rumus Heron</div>
                          <div className="text-slate-400">
                            L = √[s(s-a)(s-b)(s-c)]
                          </div>
                          <div className="text-slate-300">
                            L = √[{tri.s}({tri.s} - {tri.a})({tri.s} - {tri.b})({tri.s} - {tri.c})]
                          </div>
                          <div className="text-slate-400">
                            L = √[{tri.s} × {sa} × {sb} × {sc}]
                          </div>
                          <div className="text-slate-400">
                            L = √[{product.toLocaleString('id-ID')}]
                          </div>
                          <div className="text-teal-400 font-bold text-[13px]">
                            L = {tri.area.toLocaleString('id-ID', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} m²
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summation panel comparison with exact geometric envelope */}
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg space-y-2">
              <div className="flex justify-between items-center">
                <div className="space-y-0.5">
                  <div className="text-[10px] text-slate-200 font-bold tracking-wider uppercase font-mono">TOTAL PARTISI HERON</div>
                  <div className="text-xs text-emerald-250 font-mono">Luas Segitiga Manual</div>
                </div>
                <div className="text-right">
                  <div className="text-[20px] font-extrabold font-mono tracking-tight text-white">
                    {totalHeronArea.toLocaleString('id-ID', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} <span className="text-xs font-normal">m²</span>
                  </div>
                  <div className="text-[9px] text-emerald-200 font-medium">BPN Sensus Standard</div>
                </div>
              </div>

              {shoelaceArea > 0 && (
                <div className="border-t border-emerald-500/40 pt-2 flex justify-between items-center text-[10px] font-mono opacity-90">
                  <span className="text-emerald-100 uppercase">Luas Amplop Asli (Shoelace):</span>
                  <span className="font-bold text-white">
                    {shoelaceArea.toLocaleString('id-ID', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} m²
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Floating current point selection status in Heron Mode */}
        {isClosed && drawingMode === 'heron' && (
          <div className="mt-4 p-3 bg-[#0c0f14] border border-slate-800 rounded-xl flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="text-slate-400">Pilih titik segitiga:</span>
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: 3 }).map((_, idx) => {
                const pId = selectedPointIds[idx];
                const pt = pId ? points.find(p => p.id === pId) : null;
                return (
                  <span 
                    key={idx}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      pt ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-600'
                    }`}
                  >
                    {pt ? pt.label : `?`}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
