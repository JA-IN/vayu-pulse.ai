/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { HourlyPoint, AirQualityDataset } from '../lib/api/openMeteo.ts';
import { getAqiCategory } from '../lib/aqi.ts';
import { ProvenanceBadge } from './ProvenanceBadge.tsx';

interface ForecastSectionProps {
  data: AirQualityDataset;
  alertThreshold?: number;
}

export const ForecastSection: React.FC<ForecastSectionProps> = ({
  data,
  alertThreshold = 150,
}) => {
  const [selectedPoint, setSelectedPoint] = useState<HourlyPoint | null>(null);

  // Take the 72h forecast hours
  const forecastList = useMemo(() => {
    return data.forecastHours.slice(0, 72);
  }, [data.forecastHours]);

  // Connect the last historical point with forecast points for seamless visualization
  const combinedPoints = useMemo(() => {
    const lastHistorical = data.historicalHours.slice(-1)[0];
    if (lastHistorical) {
      return [lastHistorical, ...forecastList];
    }
    return forecastList;
  }, [data.historicalHours, forecastList]);

  // Chart coordinates
  const chartHeight = 220;
  const chartWidth = 720;
  const paddingX = 40;
  const paddingY = 24;

  const validAqi = combinedPoints.map((p) => p.us_aqi).filter((v): v is number => v !== null);
  const maxAqi = Math.max(250, ...validAqi);

  const getX = (idx: number) => {
    if (combinedPoints.length <= 1) return paddingX;
    return paddingX + (idx / (combinedPoints.length - 1)) * (chartWidth - paddingX * 2);
  };

  const getY = (val: number | null) => {
    if (val === null) return chartHeight - paddingY;
    const ratio = Math.min(1, Math.max(0, val / maxAqi));
    return chartHeight - paddingY - ratio * (chartHeight - paddingY * 2);
  };

  // Historic portion vs Forecast portion
  const historicPath = useMemo(() => {
    if (combinedPoints.length < 2) return '';
    const x0 = getX(0);
    const y0 = getY(combinedPoints[0].us_aqi);
    const x1 = getX(1);
    const y1 = getY(combinedPoints[1].us_aqi);
    return `M ${x0} ${y0} L ${x1} ${y1}`;
  }, [combinedPoints, maxAqi]);

  const forecastDashedPath = useMemo(() => {
    if (combinedPoints.length < 2) return '';
    return combinedPoints.slice(1).reduce((acc, p, idx) => {
      const realIdx = idx + 1;
      const x = getX(realIdx);
      const y = getY(p.us_aqi);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [combinedPoints, maxAqi]);

  // Lowest predicted AQI valley
  const lowestForecastPoint = useMemo(() => {
    if (forecastList.length === 0) return null;
    let minPoint = forecastList[0];
    forecastList.forEach((p) => {
      if (p.us_aqi !== null && (minPoint.us_aqi === null || p.us_aqi < minPoint.us_aqi)) {
        minPoint = p;
      }
    });
    return minPoint;
  }, [forecastList]);

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-5 relative overflow-hidden">
      {/* Header & Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-300 text-[20px]">
              vital_signs
            </span>
            <h3 className="font-display font-bold text-lg sm:text-xl text-white">
              72-Hour Atmospheric Prognostics &amp; Safe Outdoor Window
            </h3>
            <ProvenanceBadge kind="forecast" />
          </div>
          <p className="text-xs text-[#bbcabf] mt-0.5">
            ECMWF / CAMS Copernicus atmospheric dispersion modeling for {data.city.name}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            ✦ CAMS METEOROLOGICAL DISPERSION
          </span>
        </div>
      </div>

      {/* Safe Outdoor Window Banner */}
      <div className="bg-[#10b981]/10 border border-[#10b981]/30 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-2xl select-none">✅</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase font-bold text-emerald-400 tracking-wider">
                Optimal Outdoor Activity Window
              </span>
              <ProvenanceBadge kind="derived" sourceNote="Consecutive hours below threshold" />
            </div>
            <p className="text-xs sm:text-sm text-white mt-0.5">
              {data.safeWindow.found ? (
                <>
                  Safe run for{' '}
                  <strong className="text-emerald-400 font-mono">
                    {data.safeWindow.durationHours} consecutive hours
                  </strong>{' '}
                  (from {new Date(data.safeWindow.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                  to {new Date(data.safeWindow.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  — AQI dips to{' '}
                  <strong className="text-emerald-400 font-mono">{data.safeWindow.minAqi}</strong>.
                </>
              ) : (
                'Air quality expected to remain above threshold. Limit strenuous outdoor cardio.'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-mono text-[#bbcabf]">
            Statistical Trend:{' '}
            <strong className="text-emerald-400 font-bold">{data.trend.label}</strong>
          </span>
        </div>
      </div>

      {/* 72h Predictive SVG Chart */}
      <div className="relative w-full h-[260px] bg-[#060e20] rounded-xl p-3 border border-white/10 overflow-hidden">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Forecast Hatch Pattern */}
            <pattern id="forecast-hatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#222a3d" strokeWidth="1.2" />
            </pattern>
          </defs>

          {/* Forecast Hatched Region (From index 1 to end) */}
          <rect
            x={getX(1)}
            y={paddingY}
            width={chartWidth - paddingX - getX(1)}
            height={chartHeight - paddingY * 2}
            fill="url(#forecast-hatch)"
            opacity="0.8"
          />

          {/* Dotted "NOW" dividing line */}
          <line
            x1={getX(1)}
            y1={paddingY}
            x2={getX(1)}
            y2={chartHeight - paddingY}
            stroke="#4edea3"
            strokeDasharray="4 4"
            strokeWidth="1.5"
          />
          <text x={getX(1) + 6} y={paddingY + 12} fill="#4edea3" fontSize="9" fontFamily="monospace">
            NOW (PROJECTION START)
          </text>

          {/* Threshold alert line */}
          <line
            x1={paddingX}
            y1={getY(alertThreshold)}
            x2={chartWidth - paddingX}
            y2={getY(alertThreshold)}
            stroke="#f43f5e"
            strokeDasharray="3 3"
            strokeWidth="1"
            opacity="0.6"
          />
          <text x={paddingX + 4} y={getY(alertThreshold) - 4} fill="#f43f5e" fontSize="9" fontFamily="monospace">
            ALERT THRESHOLD ({alertThreshold} AQI)
          </text>

          {/* Historic solid connector */}
          <path d={historicPath} fill="none" stroke="#ffffff" strokeWidth="2.5" />

          {/* Forecast Dashed Curve */}
          <path d={forecastDashedPath} fill="none" stroke="#4edea3" strokeDasharray="5 5" strokeWidth="2.5" />

          {/* Interactive point markers */}
          {combinedPoints.map((p, idx) => {
            const x = getX(idx);
            const y = getY(p.us_aqi);
            const isSpikeWindow = p.us_aqi !== null && p.us_aqi >= alertThreshold;
            const isValley = lowestForecastPoint && p.time === lowestForecastPoint.time;

            return (
              <g key={idx} className="cursor-pointer" onClick={() => setSelectedPoint(p)}>
                {isValley && (
                  <>
                    <circle cx={x} cy={y} r="6" fill="#10b981" className="animate-ping" opacity="0.6" />
                    <circle cx={x} cy={y} r="4" fill="#ffffff" stroke="#10b981" strokeWidth="2" />
                  </>
                )}
                {isSpikeWindow && idx > 1 && (
                  <circle cx={x} cy={y} r="3" fill="#f43f5e" opacity="0.75" />
                )}
              </g>
            );
          })}
        </svg>

        {/* Selected forecast point popup */}
        {selectedPoint && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#0f172a]/95 backdrop-blur-xl border border-white/20 p-2.5 rounded-xl shadow-2xl text-xs font-mono z-30">
            <div className="flex items-center justify-between gap-4">
              <span className="text-white font-bold">{selectedPoint.time}</span>
              <button onClick={() => setSelectedPoint(null)} className="text-[#86948a] hover:text-white">✕</button>
            </div>
            <div className="mt-1 flex items-center gap-3">
              <span className="text-amber-400 font-bold">Predicted AQI: {selectedPoint.us_aqi ?? '—'}</span>
              <span className="text-rose-400">PM2.5: {selectedPoint.pm2_5 ?? '—'} µg</span>
            </div>
            <span className="text-[10px] text-[#86948a] block mt-1">
              {selectedPoint.us_aqi && selectedPoint.us_aqi >= alertThreshold
                ? '⚠️ Predicted High Smog Spike Window'
                : '✅ Below Alert Threshold'}
            </span>
          </div>
        )}
      </div>

      {/* Mandatory Accuracy Disclaimer Caption */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#86948a] pt-1">
        <span>⚠️ Statistical model (moving average and linear trend). Not a trained ML model.</span>
        <span>Caption: Model forecast, not an observation. Accuracy decreases with lead time.</span>
      </div>
    </div>
  );
};
