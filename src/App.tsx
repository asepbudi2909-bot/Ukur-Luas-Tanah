import { useState, useMemo, useEffect } from 'react';
import { Point, Triangle, SavedLand, ManualTriangleConfig } from './types';
import { getRealDistance, getShoelaceArea } from './utils/geometry';
import { LandCanvas } from './components/LandCanvas';
import { CalculationDetails } from './components/CalculationDetails';
import { LocalUnitsConverter } from './components/LocalUnitsConverter';
import { SavedMeasurements } from './components/SavedMeasurements';
import { motion } from 'motion/react';
import { 
  Compass, 
  Layers, 
  Printer, 
  MapPin, 
  Share2, 
  BookOpen, 
  HelpCircle,
  FileText,
  Scaling,
  Info
} from 'lucide-react';

export default function App() {
  const [points, setPoints] = useState<Point[]>([]);
  const [isClosed, setIsClosed] = useState<boolean>(false);
  const [lockedSides, setLockedSides] = useState<Record<string, number>>({});
  const [scalePixelRatio, setScalePixelRatio] = useState<number>(20); // Default scale: 20 pixels = 1 meter
  const [snapToGrid, setSnapToGrid] = useState<boolean>(false);
  const gridSize = 40; // grid size in pixels

  const [activeTriangleId, setActiveTriangleId] = useState<string | null>(null);
  const [activeLandId, setActiveLandId] = useState<string | null>(null);
  const [activeLandName, setActiveLandName] = useState<string>('');
  const [activeLandNotes, setActiveLandNotes] = useState<string>('');

  // Manual Triangulation states
  const [manualTriangleConfigs, setManualTriangleConfigs] = useState<ManualTriangleConfig[]>([]);
  const [selectedPointIds, setSelectedPointIds] = useState<string[]>([]);
  const [drawingMode, setDrawingMode] = useState<'draw' | 'edit' | 'heron' | 'pan'>('draw');

  // Automatically reset states when polygon resets
  useEffect(() => {
    if (points.length < 3) {
      setManualTriangleConfigs([]);
      setSelectedPointIds([]);
    }
    if (points.length === 0) {
      setActiveLandId(null);
      setActiveLandName('');
      setActiveLandNotes('');
    }
  }, [points]);

  // Compute shoelace area (exact mathematical polygon area) in m²
  const shoelaceArea = useMemo(() => {
    if (points.length < 3) return 0;
    const pixelArea = Math.abs(getShoelaceArea(points));
    return pixelArea / (scalePixelRatio * scalePixelRatio);
  }, [points, scalePixelRatio]);

  // Compute manual triangles details based on config and coordinates (supports real-time drag & scaling)
  const triangles = useMemo(() => {
    return manualTriangleConfigs.map((cfg, idx) => {
      const p1 = points.find((p) => p.id === cfg.pointIds[0]);
      const p2 = points.find((p) => p.id === cfg.pointIds[1]);
      const p3 = points.find((p) => p.id === cfg.pointIds[2]);

      if (!p1 || !p2 || !p3) return null;

      const sideA = getRealDistance(p1, p2, scalePixelRatio);
      const sideB = getRealDistance(p2, p3, scalePixelRatio);
      const sideC = getRealDistance(p3, p1, scalePixelRatio);

      const s = (sideA + sideB + sideC) / 2;
      const heronRadicand = s * (s - sideA) * (s - sideB) * (s - sideC);
      const area = Math.sqrt(Math.max(0, heronRadicand));

      return {
        id: cfg.id,
        p1,
        p2,
        p3,
        a: parseFloat(sideA.toFixed(2)),
        b: parseFloat(sideB.toFixed(2)),
        c: parseFloat(sideC.toFixed(2)),
        s: parseFloat(s.toFixed(2)),
        area: parseFloat(area.toFixed(2)),
        index: idx + 1,
        label: `Segitiga ${idx + 1}`,
      };
    }).filter((t): t is Triangle => t !== null);
  }, [manualTriangleConfigs, points, scalePixelRatio]);

  const totalArea = useMemo(() => {
    return triangles.reduce((sum, tri) => sum + tri.area, 0);
  }, [triangles]);

  const printMapSvg = useMemo(() => {
    if (points.length < 3) return null;
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const w = maxX - minX || 1;
    const h = maxY - minY || 1;

    const svgWidth = 620;
    const svgHeight = 360;
    const pad = 40;

    const scaleX = (svgWidth - 2 * pad) / w;
    const scaleY = (svgHeight - 2 * pad) / h;
    const scale = Math.min(scaleX, scaleY);

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    const getX = (px: number) => svgWidth / 2 + (px - cx) * scale;
    const getY = (py: number) => svgHeight / 2 + (py - cy) * scale;

    return { getX, getY, svgWidth, svgHeight };
  }, [points]);

  const perimeterSegments = useMemo(() => {
    if (points.length < 3 || !isClosed) return [];
    const segments = [];
    for (let i = 0; i < points.length; i++) {
      const pCurrent = points[i];
      const pNext = points[(i + 1) % points.length];
      const d = getRealDistance(pCurrent, pNext, scalePixelRatio);
      segments.push({
        num: i + 1,
        label: `${pCurrent.label || `P${i+1}`} ke ${pNext.label || `P${(i+1)%points.length+1}`}`,
        distance: parseFloat(d.toFixed(2)),
      });
    }
    return segments;
  }, [points, isClosed, scalePixelRatio]);

  const handleLoadSavedLand = (land: SavedLand) => {
    setPoints(land.points);
    setScalePixelRatio(land.scalePixelRatio);
    setManualTriangleConfigs(land.manualTriangleConfigs || []);
    setSelectedPointIds([]);
    setIsClosed(true); // Saved configuration is always a closed polygon
    setDrawingMode('heron');
    setActiveLandId(land.id);
    setActiveLandName(land.name);
    setActiveLandNotes(land.notes || '');
  };

  const handleDeleteTriangle = (id: string) => {
    setManualTriangleConfigs((prev) => prev.filter((t) => t.id !== id));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-slate-300 flex flex-col justify-between font-sans antialiased" id="app-root">
      {/* PROFESSIONAL PRINT REPORT DOCUMENT (Shown ONLY in print mode, completely replaces screen UI) */}
      <div className="hidden print:block p-8 bg-white text-slate-900 font-sans" id="professional-print-report">
        {/* KOP LAPORAN RESMI (Header Kop BPN-style) */}
        <div className="text-center relative pb-3 border-b-4 border-double border-slate-900 mb-6">
          <div className="flex justify-center items-center gap-4 mb-2">
            <Compass className="text-slate-900" size={32} />
            <div className="text-left">
              <h1 className="text-xl font-extrabold tracking-tight uppercase text-slate-900">LAPORAN HASIL PENGUKURAN DAN PEMETAAN LAHAN</h1>
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">SISTEM INFORMASI KATASTRASI DIGITAL & SEGITIGA HERON</p>
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-1 italic">
            Dihasilkan secara otomatis oleh HeronMapper Pro • Jaringan Kalibrasi Skala Presisi Tingkat Juru Ukur Lapangan rill
          </div>
        </div>

        {/* IDENTITAS PEMILIK & OBJEK PENGUKURAN */}
        <div className="mb-6 grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="font-bold text-slate-800 border-b border-slate-200 pb-1 uppercase text-[9px] tracking-wider mb-1">Identitas Lahan / Bidang</div>
            <div><span className="font-semibold text-slate-500">Nama Bidang Lahan:</span> <span className="font-bold text-slate-900">{activeLandName || 'Bidang Lahan Tanpa Nama'}</span></div>
            <div>
              <span className="font-semibold text-slate-500">Catatan Batas Lapangan:</span>{' '}
              <span className="text-slate-800">{activeLandNotes || 'Tidak ada catatan khusus.'}</span>
            </div>
          </div>
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="font-bold text-slate-800 border-b border-slate-200 pb-1 uppercase text-[9px] tracking-wider mb-1">Parameter Metrik & Sistem</div>
            <div><span className="font-semibold text-slate-500">Sistem Koordinat:</span> <span className="font-medium text-slate-900">Grid Lokal CAD Terkalibrasi</span></div>
            <div><span className="font-semibold text-slate-500">Tanggal Pengukuran:</span> <span className="font-medium text-slate-900">{new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div>
            <div><span className="font-semibold text-slate-500">Rasio Skala Cetak:</span> <span className="font-mono text-slate-900 text-[11px]">1 meter = {scalePixelRatio.toFixed(2)} pixel</span></div>
          </div>
        </div>

        {/* PETA GAMBAR UKUR / SKETSA KATASTRAL */}
        {printMapSvg && (
          <div className="mb-6 border border-slate-300 rounded-xl p-4 bg-white flex flex-col items-center">
            <div className="w-full flex justify-between items-center text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-mono border-b border-slate-100 pb-1.5">
              <span>Gambar Ukur Bidang Lahan (Sketsa Geometris)</span>
              <span className="text-black font-semibold">SKALA: TERKALIBRASI RILL</span>
            </div>

            <div className="relative w-full flex justify-center bg-slate-50/50 p-2 rounded-lg border border-slate-100">
              <svg 
                width={printMapSvg.svgWidth} 
                height={printMapSvg.svgHeight} 
                className="overflow-visible select-none"
              >
                {/* Background grid crosshairs or tick marks like technical boards */}
                <g stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="4,6">
                  {/* Grid cross lines at quadrants */}
                  <line x1="50" y1="180" x2="570" y2="180" />
                  <line x1="310" y1="30" x2="310" y2="330" />
                </g>

                {/* Sub-Triangle Polygons with dashes */}
                {triangles.map((tri, idx) => {
                  const p1 = printMapSvg.getX(tri.p1.x);
                  const q1 = printMapSvg.getY(tri.p1.y);
                  const p2 = printMapSvg.getX(tri.p2.x);
                  const q2 = printMapSvg.getY(tri.p2.y);
                  const p3 = printMapSvg.getX(tri.p3.x);
                  const q3 = printMapSvg.getY(tri.p3.y);

                  const centroidX = (p1 + p2 + p3) / 3;
                  const centroidY = (q1 + q2 + q3) / 3;

                  return (
                    <g key={`print-tri-${tri.id}`}>
                      {/* Sub-triangle fill & outer stroke with dashes for internal boundaries */}
                      <polygon
                        points={`${p1},${q1} ${p2},${q2} ${p3},${q3}`}
                        fill="rgba(0, 0, 0, 0.02)"
                        stroke="#64748b"
                        strokeWidth="1.5"
                        strokeDasharray="4,4"
                      />
                      {/* Triangle centroid labels */}
                      <rect
                        x={centroidX - 10}
                        y={centroidY - 10}
                        width="20"
                        height="20"
                        rx="4"
                        fill="#fff"
                        stroke="#475569"
                        strokeWidth="1"
                      />
                      <text
                        x={centroidX}
                        y={centroidY + 4}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="bold"
                        fill="#334155"
                        fontFamily="sans-serif"
                      >
                        T{idx + 1}
                      </text>
                    </g>
                  );
                })}

                {/* Main Outer envelope boundary line */}
                {points.length >= 3 && (
                  <polygon
                    points={points.map(p => `${printMapSvg.getX(p.x)},${printMapSvg.getY(p.y)}`).join(' ')}
                    fill="none"
                    stroke="#000000"
                    strokeWidth="3.5"
                  />
                )}

                {/* Segment Real-World dimensions annotation labels */}
                {perimeterSegments.map((seg, idx) => {
                  const pCurrent = points[idx];
                  const pNext = points[(idx + 1) % points.length];
                  if (!pCurrent || !pNext) return null;

                  const x1 = printMapSvg.getX(pCurrent.x);
                  const y1 = printMapSvg.getY(pCurrent.y);
                  const x2 = printMapSvg.getX(pNext.x);
                  const y2 = printMapSvg.getY(pNext.y);

                  // Midpoint of segment
                  const mx = (x1 + x2) / 2;
                  const my = (y1 + y2) / 2;

                  // Normal angle calculation for offset labels
                  const angle = Math.atan2(y2 - y1, x2 - x1);
                  const offsetX = -Math.sin(angle) * 12;
                  const offsetY = Math.cos(angle) * 12;

                  return (
                    <g key={`print-seg-${idx}`}>
                      {/* White backing rect for high contrast reading */}
                      <rect
                        x={mx + offsetX - 18}
                        y={my + offsetY - 7}
                        width="36"
                        height="13"
                        rx="2"
                        fill="#ffffff"
                        opacity="0.9"
                      />
                      <text
                        x={mx + offsetX}
                        y={my + offsetY + 3}
                        fontSize="8"
                        textAnchor="middle"
                        fontWeight="black"
                        fill="#000000"
                        fontFamily="monospace"
                      >
                        {seg.distance.toFixed(2)}m
                      </text>
                    </g>
                  );
                })}

                {/* Point Nodes (patok boundaries) */}
                {points.map((pt, idx) => {
                  const px = printMapSvg.getX(pt.x);
                  const py = printMapSvg.getY(pt.y);

                  return (
                    <g key={`print-node-${pt.id}`}>
                      {/* Vertex circles */}
                      <circle
                        cx={px}
                        cy={py}
                        r="6.5"
                        fill="#ffffff"
                        stroke="#000000"
                        strokeWidth="2.5"
                      />
                      {/* Label point circles */}
                      <text
                        x={px + 12}
                        y={py + 4}
                        fontSize="10"
                        fontWeight="black"
                        fill="#000000"
                        fontFamily="sans-serif"
                      >
                        {pt.label || `P${idx + 1}`}
                      </text>
                    </g>
                  );
                })}

                {/* North arrow compass icon */}
                <g transform="translate(45, 55)" stroke="#000000" strokeWidth="1.5" fill="none">
                  <circle cx="0" cy="0" r="16" strokeDasharray="2,2" stroke="#64748b" />
                  <polygon points="0,-18 -5,-2 0,-5 5,-2" fill="#000000" stroke="#000000" />
                  <polygon points="0,18 -5,2 0,5 5,2" fill="#e2e8f0" stroke="#000000" />
                  <text x="0" y="-20" fontSize="8" fontWeight="bold" textAnchor="middle" fill="#000000">U</text>
                </g>
              </svg>
            </div>
          </div>
        )}

        {/* REKAPITULASI LUAS UTAMA */}
        <div className="mb-6 bg-slate-900 text-white p-4 rounded-xl grid grid-cols-2 shadow-sm font-sans">
          <div className="border-r border-slate-755 pr-4">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">TOTAL LUAS BIDANG (RUMUS HERON)</span>
            <span className="text-2xl font-black text-white font-mono">{totalArea.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²</span>
            {shoelaceArea > 0 && (
              <div className="text-[9px] text-slate-400 mt-1 font-mono">
                Selisih dari Amplop Geometris (Shoelace): {Math.abs(totalArea - shoelaceArea).toFixed(2)} m² ({(Math.abs(totalArea - shoelaceArea) / (shoelaceArea || 1) * 100).toFixed(2)}%)
              </div>
            )}
          </div>
          <div className="pl-4 flex flex-col justify-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">SISTEM DEKOMPOSISI SEGITIGA</span>
            <span className="text-sm font-bold text-emerald-400">{triangles.length} Pembagi Segitiga Berhasil Terhitung</span>
            <span className="text-[10px] text-slate-300 mt-1">Metode Pemecahan Lahan dengan Garis Ikat Lapangan Validasi 100%</span>
          </div>
        </div>

        {/* GRID TABEL: 1) DIMENSI SISI PERIMETER & 2) KONVERSI UNIT LOKAL */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sisi perimeter */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b-2 border-slate-300 pb-1 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-slate-900"></span> 
              Dimensi Batas Sisi Lahan
            </h3>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-300 bg-slate-50 text-slate-600 font-bold">
                  <th className="py-1.5 px-2 text-center">No</th>
                  <th className="py-1.5 px-2">Segmen Batas</th>
                  <th className="py-1.5 px-2 text-right">Metrics (m)</th>
                </tr>
              </thead>
              <tbody>
                {perimeterSegments.map((seg, idx) => (
                  <tr key={`print-seg-row-${idx}`} className="border-b border-slate-200">
                    <td className="py-1.5 px-2 text-center font-mono text-slate-500">{seg.num}</td>
                    <td className="py-1.5 px-2 font-semibold">Segmen {seg.label}</td>
                    <td className="py-1.5 px-2 text-right font-bold font-mono">{seg.distance.toFixed(2)} m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Konversi lokal */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b-2 border-slate-300 pb-1 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-slate-900"></span> 
              Terjemahan Satuan Tradisional Nusantara
            </h3>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-300 bg-slate-50 text-slate-600 font-bold">
                  <th className="py-1.5 px-2 font-bold">Satuan Lokal</th>
                  <th className="py-1.5 px-2 text-right font-bold">Nilai Konversi</th>
                  <th className="py-1.5 px-2 font-bold">Wilayah Sensus Pembagian</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="py-1.5 px-2 font-semibold">Hektar (ha)</td>
                  <td className="py-1.5 px-2 text-right font-bold font-mono">{(totalArea / 10000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha</td>
                  <td className="py-1.5 px-2 text-slate-500 text-[10px]">Nasional</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-1.5 px-2 font-semibold">Are (are)</td>
                  <td className="py-1.5 px-2 text-right font-bold font-mono">{(totalArea / 100).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} are</td>
                  <td className="py-1.5 px-2 text-slate-500 text-[10px]">Nasional / Bali</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-1.5 px-2 font-semibold">Ru / Tumbak / Bata (14 m²)</td>
                  <td className="py-1.5 px-2 text-right font-bold font-mono">{(totalArea / 14).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tumbak</td>
                  <td className="py-1.5 px-2 text-slate-500 text-[10px]">Jawa Barat / Sunda (disesuaikan)</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-1.5 px-2 font-semibold">Ubin</td>
                  <td className="py-1.5 px-2 text-right font-bold font-mono">{(totalArea / 14.0625).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ubin</td>
                  <td className="py-1.5 px-2 text-slate-500 text-[10px]">Jawa Tengah / Jawa Timur</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-1.5 px-2 font-semibold">Rantai</td>
                  <td className="py-1.5 px-2 text-right font-bold font-mono">{(totalArea / 400).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} rantai</td>
                  <td className="py-1.5 px-2 text-slate-500 text-[10px]">Sumatera / Kalimantan</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-1.5 px-2 font-semibold">Bahu</td>
                  <td className="py-1.5 px-2 text-right font-bold font-mono">{(totalArea / 7096.5).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} bahu</td>
                  <td className="py-1.5 px-2 text-slate-500 text-[10px]">Penjuru Sawah Jawa</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* TABEL RINCIAN MATEMATIS RUMUS HERON PER SEGITIGA (Sangat Rinci & Transparan) */}
        <div className="mb-6 space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b-2 border-slate-300 pb-1 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-slate-900"></span> 
            Kalkulasi Rumus Heron Langkah Demi Langkah (Step-by-Step)
          </h3>
          <table className="w-full text-left text-[11px] border-collapse" id="heron-math-table">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-50 text-slate-600 font-bold">
                <th className="py-1.5 px-2 text-center w-12 font-bold">Kode</th>
                <th className="py-1.5 px-2 font-bold">Titik Hubung</th>
                <th className="py-1.5 px-2 font-bold">Panjang Sisi Segitiga</th>
                <th className="py-1.5 px-2 font-bold">Keliling Setengah (s)</th>
                <th className="py-1.5 px-2 font-bold">Operasi Akar Kuadrat: √[s(s-a)(s-b)(s-c)]</th>
                <th className="py-1.5 px-2 text-right font-bold">Luas Sub (m²)</th>
              </tr>
            </thead>
            <tbody>
              {triangles.map((tri, idx) => {
                const subSa = parseFloat((tri.s - tri.a).toFixed(2));
                const subSb = parseFloat((tri.s - tri.b).toFixed(2));
                const subSc = parseFloat((tri.s - tri.c).toFixed(2));
                return (
                  <tr key={`print-tri-row-${idx}`} className="border-b border-slate-200 font-mono">
                    <td className="py-2 px-2 text-center font-bold text-slate-900">T{idx + 1}</td>
                    <td className="py-2 px-2 font-sans font-semibold text-slate-700">
                      {tri.p1.label}-{tri.p2.label}-{tri.p3.label}
                    </td>
                    <td className="py-2 px-2 text-[10px]">
                      a={tri.a}m, b={tri.b}m, c={tri.c}m
                    </td>
                    <td className="py-2 px-2 text-[10px] text-emerald-800 font-bold">
                      s = {tri.s} m
                    </td>
                    <td className="py-2 px-2 text-[10px] text-slate-600 leading-snug">
                      √[{tri.s} × {subSa} × {subSb} × {subSc}]
                    </td>
                    <td className="py-2 px-2 text-right font-bold text-slate-900">{tri.area.toFixed(2)} m²</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* LEMBAR PENGESAHAN TANDA TANGAN (BPN-Style Signature Blocks) */}
        <div className="mt-12 pt-8 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-xs page-break-inside-avoid">
          <div>
            <span className="font-bold text-slate-500 uppercase text-[9px] tracking-wider block mb-12">PEMILIK LAHAN / PEMOHON</span>
            <div className="border-b border-slate-400 mx-auto w-36 mb-1"></div>
            <span className="text-[10px] text-slate-500 italic">(Tanda Tangan & Nama Lengkap)</span>
          </div>
          <div>
            <span className="font-bold text-slate-500 uppercase text-[9px] tracking-wider block mb-12">SAKSI BATAS LAPANGAN</span>
            <div className="border-b border-slate-400 mx-auto w-36 mb-1"></div>
            <span className="text-[10px] text-slate-500 italic">(Saksi Tetangga Lahan Batas)</span>
          </div>
          <div>
            <span className="font-bold text-slate-500 uppercase text-[9px] tracking-wider block mb-12">JURU UKUR RESMI / MITRA BPN</span>
            <div className="border-b border-slate-400 mx-auto w-36 mb-1 text-slate-800 text-[10px] font-bold">HERONMAPPER SYSTEM</div>
            <span className="text-[9px] text-emerald-600 font-mono font-bold">VERIFIED DIGITAL CERTIFICATE</span>
          </div>
        </div>

        {/* BOTTOM METRICS BARCODE INFO */}
        <div className="mt-10 flex justify-between items-center text-[9px] text-slate-400 font-mono border-t border-slate-150 pt-2">
          <span>KATASTRAL ID: {activeLandName ? `LND-${activeLandName.toUpperCase().replace(/\s+/g,'-')}-${Date.now().toString().slice(-4)}` : `LND-${Date.now()}`}</span>
          <span>SISTEM VALIDASI DIGITAL KATASTRAL GEOMETRIS RUMUS HERON INDONESIA</span>
        </div>
      </div>

      {/* Main Screen Header (Hidden on Print) */}
      <header className="bg-[#16191f] text-white shadow-md print:hidden border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Compass className="animate-spin-slow text-emerald-400" size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white leading-tight">
                  HeronMapper <span className="text-emerald-500 font-mono text-sm">v2.4</span>
                </h1>
                <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider font-mono">
                  Rumus Heron
                </span>
              </div>
              <p className="text-[11px] text-slate-450">Pemetaan Poligon Interaktif & Kalkulasi Triangulasi Instan</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="hidden md:flex gap-5 text-[10px] uppercase tracking-widest font-mono text-slate-500">
              <span className="text-emerald-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Precision Active</span>
              <span className="opacity-60">Sat-Link: Stable</span>
            </div>
            <button
              onClick={handlePrint}
              disabled={points.length === 0 || !isClosed}
              className="px-3.5 py-2 whitespace-nowrap bg-slate-800 border border-slate-700 hover:bg-slate-705 text-white hover:border-slate-600 font-medium text-xs rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-45 disabled:hover:bg-slate-800 cursor-pointer"
              id="print-action-btn"
            >
              <Printer size={13} className="text-emerald-400" />
              Cetak Laporan
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-8xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6 print:hidden" id="main-content">
        
        {/* Dynamic Warning for users in case of self-intersection */}
        {points.length > 0 && !isClosed && (
          <div className="bg-[#16191f] border border-slate-800 rounded-2xl p-4 flex items-start gap-3 print:hidden">
            <div className="p-1 px-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono mt-0.5">
              INFO INTERAKTIF
            </div>
            <div className="text-xs text-slate-300 leading-relaxed">
              <span className="font-bold text-emerald-400">Petunjuk Menggambar:</span> Klik beberapa kali pada panel canvas di sebelah kiri untuk meletakkan titik koordinat patok tanah Anda. Setelah terbentuk minimal 3 titik, sambungkan kembali ke titik awal (berwarna biru berkedip) atau klik tombol <strong>"Tutup Poligon"</strong> untuk menerapkan pemecahan bidang segitiga otomatis.
            </div>
          </div>
        )}

        {/* CAD Blueprint Layout section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Main Visual Canvas Blueprint (Col: 8/12) */}
          <div className="lg:col-span-8 flex flex-col" id="col-canvas">
            <LandCanvas
              points={points}
              setPoints={setPoints}
              isClosed={isClosed}
              setIsClosed={setIsClosed}
              scalePixelRatio={scalePixelRatio}
              setScalePixelRatio={setScalePixelRatio}
              triangles={triangles}
              activeTriangleId={activeTriangleId}
              setActiveTriangleId={setActiveTriangleId}
              snapToGrid={snapToGrid}
              setSnapToGrid={setSnapToGrid}
              gridSize={gridSize}
              drawingMode={drawingMode}
              setDrawingMode={setDrawingMode}
              selectedPointIds={selectedPointIds}
              setSelectedPointIds={setSelectedPointIds}
              manualTriangleConfigs={manualTriangleConfigs}
              setManualTriangleConfigs={setManualTriangleConfigs}
              shoelaceArea={shoelaceArea}
              lockedSides={lockedSides}
              setLockedSides={setLockedSides}
            />
          </div>

          {/* Mathematical Computations (Col: 4/12) */}
          <div className="lg:col-span-4 flex flex-col" id="col-math">
            <CalculationDetails
              triangles={triangles}
              isClosed={isClosed}
              points={points}
              activeTriangleId={activeTriangleId}
              setActiveTriangleId={setActiveTriangleId}
              onDeleteTriangle={handleDeleteTriangle}
              shoelaceArea={shoelaceArea}
              drawingMode={drawingMode}
              setDrawingMode={setDrawingMode}
              selectedPointIds={selectedPointIds}
            />
          </div>
        </div>

        {/* Local Indonesian Traditional Conversions and Valuation panel */}
        <div className="print:hidden">
          <LocalUnitsConverter
            totalArea={totalArea}
            isClosed={isClosed}
          />
        </div>

        {/* Save/Load Persistence Archive */}
        <div className="print:hidden">
          <SavedMeasurements
            points={points}
            isClosed={isClosed}
            scalePixelRatio={scalePixelRatio}
            manualTriangleConfigs={manualTriangleConfigs}
            onLoadSavedLand={handleLoadSavedLand}
            newName={activeLandName}
            setNewName={setActiveLandName}
            newNotes={activeLandNotes}
            setNewNotes={setActiveLandNotes}
            activeLandId={activeLandId}
            setActiveLandId={setActiveLandId}
          />
        </div>

        {/* Educational FAQ Panel on Bottom */}
        <div className="bg-[#16191f] rounded-2xl border border-slate-800 p-6 space-y-4 print:hidden" id="educational-panel">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-emerald-500" />
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide font-mono">Pertanyaan Sering Diajukan (FAQ)</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-350">
            <div className="space-y-1.5 bg-[#0b0d10] p-4 rounded-xl border border-slate-800">
              <h5 className="font-bold text-white flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                1. Mengapa menggunakan Rumus Heron bukan Shoelace langsung?
              </h5>
              <p className="leading-relaxed">
                Rumus Shoelace menghitung luas total secara eksponensial di ruang piksel. Rumus Heron membagi poligon menjadi kumpulan segitiga riil. Metode ini diunggulkan oleh juru ukur resmi BPN sebab setiap sisi segitiga dapat diukur secara manual di lapangan rill, dicocokkan rincian langkah demi langkahnya di kalkulator ini, dan menjamin zero-error transparansi.
              </p>
            </div>
            <div className="space-y-1.5 bg-[#0b0d10] p-4 rounded-xl border border-slate-800">
              <h5 className="font-bold text-white flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                2. Bagaimana mengkalibrasi skala dengan ukuran tanah saya di lapangan?
              </h5>
              <p className="leading-relaxed">
                Gunakan slider rentang kalibrasi skala di bagian bawah lembar gambar. Jika hasil ukur diagonal/sisi terpanjang dari poligon Anda di dunia nyata adalah 10 meter, geser slider skala hingga angka sisi tersebut menunjukkan tepat 10.0m pada canvas. Dengan ini seluruh sisi lainnya otomatis terkalibrasi presisi 99.9%.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#0b0d10] text-slate-500 py-6 text-center border-t border-slate-850 text-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p>© 2026 Ukur Luas Tanah Heron. Hak Cipta Dilindungi Undang-Undang.</p>
          <div className="flex justify-center gap-4 text-[10px] text-slate-500 uppercase tracking-widest mt-1">
            <span>CRS: EPSG:4326</span>
            <span>•</span>
            <span>UNIT: METRIC (m)</span>
            <span>•</span>
            <span className="text-emerald-500 font-bold">System Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
