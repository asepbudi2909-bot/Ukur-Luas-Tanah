import React, { useState } from 'react';
import { Landmark, Compass, CircleDollarSign, Coins, HelpCircle } from 'lucide-react';

interface LocalUnitsConverterProps {
  totalArea: number; // in square meters
  isClosed: boolean;
}

export const LocalUnitsConverter: React.FC<LocalUnitsConverterProps> = ({
  totalArea,
  isClosed,
}) => {
  const [estimatedPricePerM2, setEstimatedPricePerM2] = useState<number>(500000); // 500k IDR default

  // Math Conversion formulas
  const roundedArea = Math.max(0, totalArea);
  
  const inHectares = roundedArea / 10000;
  const inAre = roundedArea / 100;
  const inRantai = roundedArea / 400; // Sumatra
  const inTumbakBata = roundedArea / 14; // West Java (Sunda) - Adjusted to exactly 14 m² per user request
  const inUbin = roundedArea / 14.0625; // Central/East Java
  const inBahu = roundedArea / 7096.5; // Traditional Java

  const totalValuation = roundedArea * estimatedPricePerM2;

  const UNIT_INFOS = [
    {
      unit: 'Hektar (ha)',
      value: inHectares,
      suffix: 'ha',
      description: 'Satuan standar nasional & internasional.',
      ratio: '1 ha = 10.000 m²',
      region: 'Nasional',
      color: 'border-emerald-500/10 bg-[#1c2128]/70 text-emerald-400'
    },
    {
      unit: 'Are (a)',
      value: inAre,
      suffix: 'are',
      description: 'Satuan standar desimal lahan menengah.',
      ratio: '1 are = 100 m²',
      region: 'Nasional & Bali',
      color: 'border-blue-500/10 bg-[#1c2128]/70 text-blue-400'
    },
    {
      unit: 'Bata / Ru / Tumbak',
      value: inTumbakBata,
      suffix: 'tumbak',
      description: 'Satuan tradisional utama di Jawa Barat (disesuaikan 14 m² pas).',
      ratio: '1 tumbak = 14 m²',
      region: 'Jawa Barat / Sunda',
      color: 'border-amber-500/10 bg-[#1c2128]/70 text-amber-400'
    },
    {
      unit: 'Ubin',
      value: inUbin,
      suffix: 'ubin',
      description: 'Satuan patokan jatah sawah petani desa.',
      ratio: '1 ubin ≈ 14.06 m²',
      region: 'Jawa Tengah & Jawa Timur',
      color: 'border-purple-500/10 bg-[#1c2128]/70 text-purple-400'
    },
    {
      unit: 'Rantai',
      value: inRantai,
      suffix: 'rantai',
      description: 'Sering digunakan di perkebunan sawit/kopi.',
      ratio: '1 rantai = 400 m²',
      region: 'Sumatera & Kalimantan',
      color: 'border-indigo-500/10 bg-[#1c2128]/70 text-indigo-400'
    },
    {
      unit: 'Bahu',
      value: inBahu,
      suffix: 'bahu',
      description: 'Digunakan untuk mengukur sawah ukuran besar.',
      ratio: '1 bahu ≈ 7.096 m²',
      region: 'Seluruh Jawa',
      color: 'border-rose-500/10 bg-[#1c2128]/70 text-rose-400'
    }
  ];

  return (
    <div className="bg-[#16191f] rounded-2xl border border-slate-800 shadow-xl p-6 flex flex-col gap-6" id="local-units-converter-container">
      {/* Title */}
      <div className="flex items-center gap-2.5">
        <Landmark className="text-emerald-500" size={20} />
        <div>
          <h3 className="font-bold text-white text-sm">Konversi Satuan Lokal & Estimasi Nilai Lahan</h3>
          <p className="text-[11px] text-slate-400">Menerjemahkan meter persegi ke sistem penamaan luas daerah tradisional Indonesia secara presisi.</p>
        </div>
      </div>

      {/* Main Conversion Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {UNIT_INFOS.map((info, idx) => {
          return (
            <div
              key={`trad-unit-${idx}`}
              className={`border border-slate-800/60 rounded-xl p-4 flex flex-col justify-between transition-all hover:border-slate-700 hover:shadow-lg ${info.color}`}
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-1">
                  <span className="text-xs font-bold text-slate-200">{info.unit}</span>
                  <span className="text-[9px] px-1.5 py-0.5 font-bold rounded bg-[#0b0d10] border border-slate-800 text-slate-400 font-mono">
                    {info.region}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-snug mb-3">
                  {info.description}
                </p>
              </div>

              <div className="space-y-1">
                <div className="text-xl font-black font-mono tracking-tight text-white">
                  {isClosed ? (
                    info.value.toLocaleString('id-ID', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  ) : (
                    <span className="text-slate-600 opacity-40">-</span>
                  )}{' '}
                  {isClosed && <span className="text-xs font-semibold text-slate-300">{info.suffix}</span>}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Rasio: {info.ratio}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Valuation calculator widget */}
      <div className="border border-slate-800/80 rounded-xl bg-[#0b0d10] p-4 grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <CircleDollarSign size={15} className="text-emerald-400" />
            Harga Taksiran Lahan per Meter Persegi (Rp/m²)
          </label>
          <p className="text-[10px] text-slate-400">
            Masukkan nilai jual objek pajak (NJOP) atau harga pasar aktual di daerah Anda untuk perhitungan otomatis nilai aset.
          </p>
          <div className="relative mt-2 max-w-xs">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
            <input
              type="number"
              min="0"
              step="50000"
              value={estimatedPricePerM2}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setEstimatedPricePerM2(isNaN(val) ? 0 : val);
              }}
              className="w-full pl-9 pr-4 py-2 bg-[#16191f] border border-slate-800 rounded-lg text-xs font-bold font-mono text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              id="valuation-price-input"
            />
          </div>
        </div>

        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="space-y-0.5">
            <div className="text-[9px] text-emerald-400 font-bold tracking-wider font-mono uppercase">Total Estimasi Aset Tanah</div>
            <div className="text-[10px] text-slate-400 font-mono">Luas Lahan × Nilai Pasar</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-black font-mono text-emerald-400 tracking-tight">
              {isClosed ? (
                `Rp ${totalValuation.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`
              ) : (
                <span className="text-slate-600 font-semibold">-</span>
              )}
            </div>
            <div className="text-[9px] text-emerald-500/80 font-medium font-mono">Standard Heron-Grid AI</div>
          </div>
        </div>
      </div>
    </div>
  );
};
