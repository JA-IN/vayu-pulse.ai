/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Printer, FileText, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { WHO_GUIDELINES, calculateCigaretteEquivalence, getAqiCategory } from '../lib/aqi.ts';

interface AuditReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  city: string;
  coords: { lat: number; lng: number };
  aqi: number | null;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  so2: number | null;
  co: number | null;
  o3: number | null;
  observedAt: string | null;
}

export function AuditReportModal({
  isOpen,
  onClose,
  city,
  coords,
  aqi,
  pm25,
  pm10,
  no2,
  so2,
  co,
  o3,
  observedAt,
}: AuditReportModalProps) {
  if (!isOpen) return null;

  const category = getAqiCategory(aqi);
  const cigarettes = calculateCigaretteEquivalence(pm25);

  const pollutants = [
    { name: 'PM2.5 (Fine Particulate)', val: pm25, unit: 'µg/m³', who: WHO_GUIDELINES.pm2_5.value, period: '24h', ratio: pm25 === null ? null : pm25 / WHO_GUIDELINES.pm2_5.value },
    { name: 'PM10 (Coarse Particulate)', val: pm10, unit: 'µg/m³', who: WHO_GUIDELINES.pm10.value, period: '24h', ratio: pm10 === null ? null : pm10 / WHO_GUIDELINES.pm10.value },
    { name: 'NO₂ (Nitrogen Dioxide)', val: no2, unit: 'µg/m³', who: WHO_GUIDELINES.nitrogen_dioxide.value, period: '24h', ratio: no2 === null ? null : no2 / WHO_GUIDELINES.nitrogen_dioxide.value },
    { name: 'SO₂ (Sulfur Dioxide)', val: so2, unit: 'µg/m³', who: WHO_GUIDELINES.sulphur_dioxide.value, period: '24h', ratio: so2 === null ? null : so2 / WHO_GUIDELINES.sulphur_dioxide.value },
    { name: 'CO (Carbon Monoxide)', val: co, unit: 'mg/m³', who: WHO_GUIDELINES.carbon_monoxide.value, period: '24h', ratio: co === null ? null : co / WHO_GUIDELINES.carbon_monoxide.value },
    { name: 'O₃ (Ground Ozone)', val: o3, unit: 'µg/m³', who: WHO_GUIDELINES.ozone.value, period: '8h', ratio: o3 === null ? null : o3 / WHO_GUIDELINES.ozone.value },
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-3xl bg-surface-container-low border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Modal Action Bar (Hidden on print) */}
        <div className="p-4 border-b border-white/10 bg-surface-container/60 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="font-display font-bold text-sm text-high-contrast">
              Atmospheric Environmental Impact &amp; Compliance Statement
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-surface-container-lowest font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Export PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted hover:text-high-contrast hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 space-y-6 overflow-y-auto text-high-contrast print:text-black print:overflow-visible">
          {/* Header Lab Banner */}
          <div className="border-b border-white/10 print:border-black/30 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display font-extrabold text-2xl tracking-tight text-primary print:text-emerald-700">
                  VayuPulse AI Environmental Audit
                </div>
                <div className="text-xs font-mono text-muted print:text-gray-600 mt-0.5">
                  Modeled Air Quality Data Report
                </div>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-1 rounded text-xs font-mono font-bold uppercase bg-surface-container-high border border-white/10 print:border-black/20 text-high-contrast print:text-black">
                  WHO 2021 Benchmark
                </span>
                <div className="text-[11px] font-mono text-muted print:text-gray-600 mt-1">
                  Issued: {new Date().toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {/* Station Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono p-4 rounded-xl bg-surface-container-lowest print:bg-gray-100 print:text-black border border-white/5 print:border-gray-300">
            <div>
              <span className="text-muted print:text-gray-600 block text-[10px] uppercase">Location</span>
              <span className="font-bold">{city}</span>
            </div>
            <div>
              <span className="text-muted print:text-gray-600 block text-[10px] uppercase">Geo-Coordinates</span>
              <span>
                {Math.abs(coords.lat).toFixed(4)}° {coords.lat < 0 ? 'S' : 'N'}, {Math.abs(coords.lng).toFixed(4)}° {coords.lng < 0 ? 'W' : 'E'}
              </span>
            </div>
            <div>
              <span className="text-muted print:text-gray-600 block text-[10px] uppercase">Observed Timestamp</span>
              <span>{observedAt ?? 'Unavailable'}</span>
            </div>
            <div>
              <span className="text-muted print:text-gray-600 block text-[10px] uppercase">Overall US-AQI</span>
              <span className="font-bold" style={{ color: category.color }}>{aqi ?? '—'} ({category.label})</span>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="p-4 rounded-xl border border-white/10 print:border-gray-300 bg-surface-container/40 print:bg-white">
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-primary print:text-emerald-800 mb-1">
              Atmospheric Health Assessment Summary
            </h4>
            <p className="text-xs text-muted print:text-gray-700 leading-relaxed">
              {pm25 === null
                ? `PM2.5 data for ${city} is unavailable, so no particulate guideline comparison or cigarette-equivalent estimate can be reported.`
                : `Current modeled PM2.5 concentration in ${city} is ${pm25.toFixed(1)} µg/m³, ${(pm25 / WHO_GUIDELINES.pm2_5.value).toFixed(1)}x the WHO 2021 24-hour guideline reference of ${WHO_GUIDELINES.pm2_5.value} µg/m³. This is not a measured 24-hour average. The Berkeley Earth method estimates this concentration as equivalent to `}
              {pm25 !== null && <strong className="text-rose-400 print:text-red-700 font-mono font-bold">{cigarettes ?? '—'} cigarettes/day (not a measured daily exposure).</strong>}
            </p>
          </div>

          {/* Chemical Pollutant Matrix Table */}
          <div>
            <h4 className="font-display font-semibold text-xs uppercase tracking-wider text-muted print:text-gray-700 mb-3">
              Modeled Pollutant Values vs WHO Guideline References
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-white/10 print:border-black/30 text-muted print:text-gray-600 text-[11px]">
                    <th className="py-2">Pollutant</th>
                    <th className="py-2">Recorded</th>
                    <th className="py-2">WHO Guideline</th>
                    <th className="py-2">Multiple</th>
                    <th className="py-2 text-right">Reference Comparison</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 print:divide-black/10">
                  {pollutants.map((p, idx) => {
                    const isExceeded = p.ratio !== null && p.ratio > 1.0;
                    return (
                      <tr key={idx} className="hover:bg-white/5 print:hover:bg-transparent">
                        <td className="py-2.5 font-semibold text-high-contrast print:text-black">{p.name}</td>
                        <td className="py-2.5">{p.val === null ? '—' : `${p.val.toFixed(2)} ${p.unit}`}</td>
                        <td className="py-2.5">{p.who} {p.unit} ({p.period})</td>
                        <td className="py-2.5 font-bold" style={{ color: p.ratio === null ? '#86948a' : isExceeded ? '#f43f5e' : '#10b981' }}>
                          {p.ratio === null ? '—' : `${p.ratio.toFixed(1)}x`}
                        </td>
                        <td className="py-2.5 text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.ratio === null
                                ? 'bg-slate-500/10 text-slate-400 border border-slate-500/30'
                                : isExceeded
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 print:border-red-400 print:text-red-700'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 print:border-emerald-400 print:text-emerald-700'
                            }`}
                          >
                            {p.ratio === null ? 'UNAVAILABLE' : isExceeded ? 'ABOVE REFERENCE' : 'WITHIN REFERENCE'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Methodology & Data Provenance */}
          <div className="pt-4 border-t border-white/10 print:border-black/30 text-[11px] font-mono text-muted print:text-gray-600 space-y-1.5">
            <div className="font-semibold text-high-contrast print:text-black">Data Provenance &amp; Verification Chain:</div>
            <div>• Air quality data: <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo Air Quality API</a> (CAMS model output)</div>
            <div>• Health guideline comparisons: World Health Organization (WHO) Global Air Quality Guidelines 2021; ozone uses the 8-hour guideline.</div>
            <div>• Cigarette-equivalent estimate: Berkeley Earth method (PM2.5 concentration ÷ 22); an exposure comparison, not a medical equivalence.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
