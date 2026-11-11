/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { HourlyPoint } from '../lib/api/openMeteo.ts';
import { calculatePercentageChange } from '../lib/aqi.ts';
import { ProvenanceBadge } from './ProvenanceBadge.tsx';

interface HistoricalTrackerProps {
  historicalData: HourlyPoint[];
  cityName: string;
}

export const HistoricalTracker: React.FC<HistoricalTrackerProps> = ({
  historicalData,
  cityName,
}) => {
  const [rangeFilter, setRangeFilter] = useState<'24h' | '7d' | '14d' | '30d' | 'diwali'>('7d');
  const [hoveredPoint, setHoveredPoint] = useState<HourlyPoint | null>(null);

  // Date comparison state (defaults to 7 days ago vs today)
  const [dateA, setDateA] = useState<string>('');
  const [dateB, setDateB] = useState<string>('');

  // Filter historical hours based on range
  const filteredPoints = useMemo(() => {
    if (!historicalData || historicalData.length === 0) return [];

    let count = 24 * 7;
    if (rangeFilter === '24h') count = 24;
    else if (rangeFilter === '7d') count = 24 * 7;
    else if (rangeFilter === '14d') count = 24 * 14;
    else if (rangeFilter === '30d') count = 24 * 30;
    else if (rangeFilter === 'diwali') count = 24 * 7; // Focus on festive week

    return historicalData.slice(-count);
  }, [historicalData, rangeFilter]);

  // Aggregate daily averages for comparison
  const dailyGroups = useMemo(() => {
    const groups: Record<string, { pm25List: number[]; pm10List: number[] }> = {};
    filteredPoints.forEach((p) => {
      const dayKey = p.time.split('T')[0];
      if (!groups[dayKey]) groups[dayKey] = { pm25List: [], pm10List: [] };
      if (p.pm2_5 !== null) groups[dayKey].pm25List.push(p.pm2_5);
      if (p.pm10 !== null) groups[dayKey].pm10List.push(p.pm10);
    });

    const entries = Object.entries(groups).map(([date, data]) => {
      const avgPm25 = data.pm25List.length
        ? Math.round((data.pm25List.reduce((a, b) => a + b, 0) / data.pm25List.length) * 10) / 10
        : 0;
      const maxPm25 = data.pm25List.length ? Math.max(...data.pm25List) : 0;
      const avgPm10 = data.pm10List.length
        ? Math.round((data.pm10List.reduce((a, b) => a + b, 0) / data.pm10List.length) * 10) / 10
        : 0;
      return { date, avgPm25, maxPm25, avgPm10 };
    });

    return entries;
  }, [filteredPoints]);

  // Auto-init comparison dates if not set
  useEffect(() => {
    if (dailyGroups.length >= 2 && (!dateA || !dateB)) {
      setDateA(dailyGroups[0].date);
      setDateB(dailyGroups[dailyGroups.length - 1].date);
    }
  }, [dailyGroups, dateA, dateB]);

  // Comparison metrics calculation
  const comparison = useMemo(() => {
    const dayA = dailyGroups.find((g) => g.date === dateA);
    const dayB = dailyGroups.find((g) => g.date === dateB);

    if (!dayA || !dayB) return null;

    const pm25Change = calculatePercentageChange(dayA.avgPm25, dayB.avgPm25);
    const pm10Change = calculatePercentageChange(dayA.avgPm10, dayB.avgPm10);

    return {
      dayA,
      dayB,
      pm25Change,
      pm10Change,
    };
  }, [dailyGroups, dateA, dateB]);

  // Detected spikes count
  const spikesCount = useMemo(() => {
    return filteredPoints.filter((p) => p.isSpike).length;
  }, [filteredPoints]);

  // Overall period change %
  const periodChange = useMemo(() => {
    if (filteredPoints.length < 2) return null;
    const firstAqi = filteredPoints[0].us_aqi;
    const lastAqi = filteredPoints[filteredPoints.length - 1].us_aqi;
    return calculatePercentageChange(firstAqi, lastAqi);
  }, [filteredPoints]);

  // Calculate SVG chart coordinates
  const chartHeight = 220;
  const chartWidth = 720;
  const paddingX = 40;
  const paddingY = 24;

  const validPm25 = filteredPoints.map((p) => p.pm2_5).filter((v): v is number => v !== null);
  const maxPm25 = Math.max(120, ...validPm25);

  const getX = (idx: number) => {
    if (filteredPoints.length <= 1) return paddingX;
    return paddingX + (idx / (filteredPoints.length - 1)) * (chartWidth - paddingX * 2);
  };

  const getY = (val: number | null) => {
    if (val === null) return chartHeight - paddingY;
    const ratio = Math.min(1, Math.max(0, val / maxPm25));
    return chartHeight - paddingY - ratio * (chartHeight - paddingY * 2);
  };

  // Generate SVG path for PM2.5 and PM10
  const pm25Path = useMemo(() => {
    if (filteredPoints.length === 0) return '';
    return filteredPoints.reduce((acc, p, idx) => {
      const x = getX(idx);
      const y = getY(p.pm2_5);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [filteredPoints, maxPm25]);

  const pm10Path = useMemo(() => {
    if (filteredPoints.length === 0) return '';
    return filteredPoints.reduce((acc, p, idx) => {
      const x = getX(idx);
      const y = getY(p.pm10);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [filteredPoints, maxPm25]);

  const pm25Area = useMemo(() => {
    if (!pm25Path || filteredPoints.length === 0) return '';
    const lastX = getX(filteredPoints.length - 1);
    const firstX = getX(0);
    const bottomY = chartHeight - paddingY;
    return `${pm25Path} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [pm25Path, filteredPoints]);

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-5 relative overflow-hidden">
      {/* Header and Filter Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-300 text-[20px]">
              stacked_line_chart
            </span>
            <h3 className="font-display font-bold text-lg sm:text-xl text-white">
              Historical Pollution Tracker &amp; Spike Detection
            </h3>
            <ProvenanceBadge kind="historical" />
          </div>
          <p className="text-xs text-[#bbcabf] mt-0.5">
            Archived observation records for {cityName}. Anomaly markers indicate sudden Z-score thermal inversion shocks.
          </p>
        </div>

        {/* Date Range Selector Buttons */}
        <div className="flex items-center gap-1 bg-[#131b2e] p-1 rounded-xl border border-white/10">
          {(['24h', '7d', '14d', '30d', 'diwali'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setRangeFilter(mode)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                rangeFilter === mode
                  ? mode === 'diwali'
                    ? 'bg-rose-700 text-white shadow-sm'
                    : 'bg-emerald-500 text-[#003824] shadow-sm'
                  : 'text-[#bbcabf] hover:text-white'
              }`}
            >
              {mode === 'diwali' ? '🪔 Diwali Week' : mode.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Delta Badges & Anomaly Summary Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#131b2e] px-4 py-2.5 rounded-xl border border-white/10 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-4">
          {periodChange !== null && (
            <span
              className={`px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 ${
                periodChange > 0
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">
                {periodChange > 0 ? 'trending_up' : 'trending_down'}
              </span>
              <span>{periodChange > 0 ? `▲ +${periodChange}%` : `▼ ${periodChange}%`} vs start</span>
            </span>
          )}

          <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px]">warning</span>
            <span>{spikesCount} Z-Score Anomaly Spikes Detected (Z ≥ 2.0)</span>
          </span>
        </div>

        <div className="flex items-center gap-3 text-[#86948a] text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span> PM2.5 Core
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span> PM10 Coarse
          </span>
        </div>
      </div>

      {/* SVG Dual-Area Historical Chart */}
      <div className="relative w-full h-[260px] bg-[#060e20] rounded-xl p-3 border border-white/10 overflow-hidden">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="hist-pm25-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="hist-pm10-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Dotted Reference Threshold Lines */}
          <line
            x1={paddingX}
            y1={getY(150)}
            x2={chartWidth - paddingX}
            y2={getY(150)}
            stroke="#86948a"
            strokeDasharray="3 3"
            strokeWidth="0.8"
            opacity="0.4"
          />
          <text x={paddingX + 4} y={getY(150) - 4} fill="#86948a" fontSize="9" fontFamily="monospace">
            CRITICAL HEALTH THRESHOLD (150 µg)
          </text>

          <line
            x1={paddingX}
            y1={getY(45)}
            x2={chartWidth - paddingX}
            y2={getY(45)}
            stroke="#3c4a42"
            strokeDasharray="3 3"
            strokeWidth="0.8"
            opacity="0.5"
          />
          <text x={paddingX + 4} y={getY(45) - 4} fill="#86948a" fontSize="9" fontFamily="monospace">
            WHO 24H BENCHMARK (15–45 µg)
          </text>

          {/* PM10 Path (Secondary) */}
          <path d={pm10Path} fill="none" stroke="#a855f7" strokeWidth="1.8" opacity="0.6" />

          {/* PM2.5 Area & Path (Primary Hazard) */}
          <path d={pm25Area} fill="url(#hist-pm25-grad)" />
          <path d={pm25Path} fill="none" stroke="#f43f5e" strokeWidth="2.2" />

          {/* Spike Callout Pins */}
          {filteredPoints.map((p, idx) => {
            if (!p.isSpike) return null;
            const x = getX(idx);
            const y = getY(p.pm2_5);
            return (
              <g key={idx} className="cursor-pointer" onClick={() => setHoveredPoint(p)}>
                <circle cx={x} cy={y} r="5.5" fill="#f43f5e" className="animate-ping" opacity="0.75" />
                <circle cx={x} cy={y} r="4.5" fill="#ffffff" stroke="#f43f5e" strokeWidth="2" />
                <line x1={x} y1={y} x2={x} y2={y - 18} stroke="#f43f5e" strokeWidth="1" strokeDasharray="2 2" />
              </g>
            );
          })}
        </svg>

        {/* Hovered Point Tooltip */}
        {hoveredPoint && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#0f172a]/95 backdrop-blur-xl border border-white/20 p-2.5 rounded-xl shadow-2xl text-xs font-mono z-30">
            <div className="flex items-center justify-between gap-4">
              <span className="text-white font-bold">{hoveredPoint.time}</span>
              <button onClick={() => setHoveredPoint(null)} className="text-[#86948a] hover:text-white">✕</button>
            </div>
            <div className="mt-1 flex items-center gap-3">
              <span className="text-rose-400">PM2.5: {hoveredPoint.pm2_5 ?? '—'} µg</span>
              <span className="text-purple-400">PM10: {hoveredPoint.pm10 ?? '—'} µg</span>
              <span className="text-emerald-400">AQI: {hoveredPoint.us_aqi ?? '—'}</span>
            </div>
            {hoveredPoint.isSpike && (
              <div className="mt-1 text-rose-300 font-bold text-[10px]">
                🚨 Inversion Anomaly Spike (Z-Score +{hoveredPoint.zScore})
              </div>
            )}
          </div>
        )}
      </div>

      {/* Two-Date Direct Comparison Tool */}
      <div className="bg-[#131b2e] p-4 rounded-xl border border-white/10 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-mono uppercase font-bold text-emerald-400 tracking-wider">
            Compare Two Historical Dates (A vs B)
          </span>
          <span className="text-[10px] font-mono text-[#86948a]">
            Formula: % Change = ((B − A) ÷ A) × 100
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date Picker A */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#bbcabf] shrink-0">Date A:</span>
            <select
              value={dateA}
              onChange={(e) => setDateA(e.target.value)}
              className="flex-1 bg-[#171f33] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-400"
            >
              {dailyGroups.map((d) => (
                <option key={d.date} value={d.date}>
                  {d.date} (PM2.5 Avg: {d.avgPm25} µg)
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker B */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#bbcabf] shrink-0">Date B:</span>
            <select
              value={dateB}
              onChange={(e) => setDateB(e.target.value)}
              className="flex-1 bg-[#171f33] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-400"
            >
              {dailyGroups.map((d) => (
                <option key={d.date} value={d.date}>
                  {d.date} (PM2.5 Avg: {d.avgPm25} µg)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Side-by-Side Comparison Metric Card */}
        {comparison && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/5 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-[#171f33] border border-white/5">
              <span className="text-[10px] text-[#86948a] uppercase block">Date A ({comparison.dayA.date})</span>
              <span className="text-sm font-bold text-white block mt-0.5">
                {comparison.dayA.avgPm25} µg/m³ PM2.5
              </span>
              <span className="text-[10px] text-[#bbcabf]">Peak: {comparison.dayA.maxPm25} µg</span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#171f33] border border-white/5">
              <span className="text-[10px] text-[#86948a] uppercase block">Date B ({comparison.dayB.date})</span>
              <span className="text-sm font-bold text-white block mt-0.5">
                {comparison.dayB.avgPm25} µg/m³ PM2.5
              </span>
              <span className="text-[10px] text-[#bbcabf]">Peak: {comparison.dayB.maxPm25} µg</span>
            </div>

            <div
              className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                comparison.pm25Change && comparison.pm25Change < 0
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              <span className="text-[10px] uppercase font-bold">Relative Change:</span>
              <span className="text-base font-bold">
                {comparison.pm25Change !== null
                  ? comparison.pm25Change > 0
                    ? `▲ +${comparison.pm25Change}% (Worse)`
                    : `▼ ${comparison.pm25Change}% (Better Air)`
                  : '—'}
              </span>
              <span className="text-[10px] opacity-80">PM10 delta: {comparison.pm10Change ?? '—'}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
