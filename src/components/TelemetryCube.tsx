/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AirQualityDataset } from '../lib/api/openMeteo.ts';
import { getAqiCategory } from '../lib/aqi.ts';
import { ProvenanceBadge } from './ProvenanceBadge.tsx';

interface TelemetryCubeProps {
  data: AirQualityDataset;
}

type CubeFace = 'front' | 'right' | 'back' | 'left' | 'top' | 'bottom';

interface FaceRotation {
  x: number;
  y: number;
  name: string;
}

const FACE_ROTATIONS: Record<CubeFace, FaceRotation> = {
  front: { x: -16, y: 24, name: '1. Pollutant Matrix' },
  right: { x: -16, y: -66, name: '2. Bio-Health' },
  back: { x: -16, y: -156, name: '3. 72h Forecast' },
  left: { x: -16, y: 114, name: '4. Anomaly Spikes' },
  top: { x: -106, y: 24, name: '5. Wind Dispersion' },
  bottom: { x: 74, y: 24, name: '6. Provenance & AI' },
};

export const TelemetryCube: React.FC<TelemetryCubeProps> = ({ data }) => {
  const [activeFace, setActiveFace] = useState<CubeFace>('front');
  const [rotX, setRotX] = useState<number>(-16);
  const [rotY, setRotY] = useState<number>(24);
  const [isExploded, setIsExploded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startRotRef = useRef<{ x: number; y: number }>({ x: -16, y: 24 });
  const cubeRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check prefers-reduced-motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const snapToFace = useCallback((face: CubeFace) => {
    setActiveFace(face);
    const target = FACE_ROTATIONS[face];
    setRotX(target.x);
    setRotY(target.y);
  }, []);

  // Pointer drag controls (Mouse & Touch)
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    startRotRef.current = { x: rotX, y: rotY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    // Map drag distance to degrees
    setRotY(startRotRef.current.y + deltaX * 0.5);
    setRotX(Math.max(-120, Math.min(120, startRotRef.current.x - deltaY * 0.5)));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if not captured
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setRotY((prev) => prev - 45);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setRotY((prev) => prev + 45);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setRotX((prev) => Math.min(120, prev + 30));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setRotX((prev) => Math.max(-120, prev - 30));
    }
  };

  const aqiVal = data.current.us_aqi.value;
  const aqiCat = getAqiCategory(aqiVal);

  // Half-dimension of cube (150px on desktop = 300px cube)
  const HALF_CUBE = 150;

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden select-none">
      {/* Top Header & Explode Action */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-400 text-[20px]">
            view_in_ar
          </span>
          <span className="text-[11px] font-mono uppercase text-[#bbcabf] tracking-wider font-semibold">
            3D Spatial Telemetry Core
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExploded(!isExploded)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono border transition-all ${
              isExploded
                ? 'bg-emerald-500 text-[#003824] font-bold border-emerald-400 shadow-[0_0_12px_rgba(78,222,163,0.3)]'
                : 'bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] border-white/10'
            }`}
            title="Move tile rows apart along Z-axis"
          >
            <span className="material-symbols-outlined text-[15px]">unfold_more</span>
            <span>{isExploded ? 'Exploded: ON' : 'Explode 3D Layers'}</span>
          </button>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            360° Rotatable
          </span>
        </div>
      </div>

      {/* 3D Viewport Stage */}
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative w-full h-[320px] sm:h-[340px] flex items-center justify-center cursor-grab active:cursor-grabbing focus:outline-none focus:ring-1 focus:ring-emerald-400/50 rounded-xl bg-[#060e20]/40 overflow-hidden"
        style={{ perspective: '1000px' }}
        aria-label="Interactive 3D Telemetry Cube. Use mouse drag or arrow keys to rotate."
      >
        {/* Subtle radial ambient floor glow */}
        <div
          className="absolute bottom-2 w-64 h-12 rounded-full blur-xl pointer-events-none opacity-40 transition-colors duration-500"
          style={{ backgroundColor: aqiCat.color }}
        ></div>

        {/* The 3D Cube Container */}
        <div
          ref={cubeRef}
          className="relative w-[280px] h-[280px] sm:w-[300px] sm:h-[300px] preserve-3d transition-transform"
          style={{
            transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`,
            transitionDuration: isDragging || prefersReducedMotion ? '0ms' : '450ms',
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* FACE 1: FRONT - 3x3 Pollutant Matrix */}
          <div
            className="absolute inset-0 p-2.5 rounded-2xl bg-[#0f172a]/95 border border-white/15 backdrop-blur-2xl backface-hidden shadow-2xl flex flex-col justify-between"
            style={{
              transform: `translateZ(${HALF_CUBE}px)`,
            }}
          >
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">
                1. Pollutant Matrix (9-Tile)
              </span>
              <ProvenanceBadge kind="modeled" />
            </div>

            <div className="grid grid-cols-3 gap-1.5 flex-1 my-1">
              {/* Tile 1: US AQI */}
              <div
                className={`p-1.5 rounded-lg bg-[#171f33] border border-white/10 flex flex-col justify-between transition-transform duration-300 ${
                  isExploded ? 'translate-z-[45px] shadow-lg' : ''
                }`}
                style={{ transform: isExploded ? 'translateZ(40px)' : 'none' }}
              >
                <span className="text-[9px] font-mono text-[#86948a] uppercase">US AQI</span>
                <span className="font-mono font-bold text-lg leading-none" style={{ color: aqiCat.color }}>
                  {aqiVal ?? '—'}
                </span>
                <span className="text-[9px] font-mono truncate" style={{ color: aqiCat.color }}>
                  {aqiCat.label}
                </span>
              </div>

              {/* Tile 2: PM2.5 */}
              <div
                className={`p-1.5 rounded-lg bg-[#171f33] border border-white/10 flex flex-col justify-between transition-transform duration-300 ${
                  isExploded ? 'translate-z-[30px]' : ''
                }`}
                style={{ transform: isExploded ? 'translateZ(30px)' : 'none' }}
              >
                <span className="text-[9px] font-mono text-[#86948a] uppercase">PM2.5</span>
                <span className="font-mono font-bold text-base leading-none text-rose-300">
                  {data.current.pm2_5.value ?? '—'} <span className="text-[8px] font-normal text-[#86948a]">µg</span>
                </span>
                <span className="text-[9px] font-mono text-rose-400 font-bold">
                  {data.current.whoRatioPm25.value ?? '—'}x WHO
                </span>
              </div>

              {/* Tile 3: PM10 */}
              <div
                className={`p-1.5 rounded-lg bg-[#171f33] border border-white/10 flex flex-col justify-between transition-transform duration-300 ${
                  isExploded ? 'translate-z-[50px]' : ''
                }`}
                style={{ transform: isExploded ? 'translateZ(50px)' : 'none' }}
              >
                <span className="text-[9px] font-mono text-[#86948a] uppercase">PM10</span>
                <span className="font-mono font-bold text-base leading-none text-purple-300">
                  {data.current.pm10.value ?? '—'} <span className="text-[8px] font-normal text-[#86948a]">µg</span>
                </span>
                <span className="text-[9px] font-mono text-purple-300 font-bold">
                  {data.current.whoRatioPm10.value ?? '—'}x WHO
                </span>
              </div>

              {/* Tile 4: NO2 */}
              <div
                className="p-1.5 rounded-lg bg-[#171f33] border border-white/10 flex flex-col justify-between"
                style={{ transform: isExploded ? 'translateZ(25px)' : 'none' }}
              >
                <span className="text-[9px] font-mono text-[#86948a] uppercase">NO₂</span>
                <span className="font-mono font-bold text-base leading-none text-cyan-300">
                  {data.current.nitrogen_dioxide.value ?? '—'}
                </span>
                <span className="text-[9px] font-mono text-[#bbcabf]">µg/m³</span>
              </div>

              {/* Tile 5: SO2 */}
              <div
                className="p-1.5 rounded-lg bg-[#171f33] border border-white/10 flex flex-col justify-between"
                style={{ transform: isExploded ? 'translateZ(45px)' : 'none' }}
              >
                <span className="text-[9px] font-mono text-[#86948a] uppercase">SO₂</span>
                <span className="font-mono font-bold text-base leading-none text-emerald-300">
                  {data.current.sulphur_dioxide.value ?? '—'}
                </span>
                <span className="text-[9px] font-mono text-[#bbcabf]">µg/m³</span>
              </div>

              {/* Tile 6: O3 */}
              <div
                className="p-1.5 rounded-lg bg-[#171f33] border border-white/10 flex flex-col justify-between"
                style={{ transform: isExploded ? 'translateZ(35px)' : 'none' }}
              >
                <span className="text-[9px] font-mono text-[#86948a] uppercase">Ozone O₃</span>
                <span className="font-mono font-bold text-base leading-none text-purple-300">
                  {data.current.ozone.value ?? '—'}
                </span>
                <span className="text-[9px] font-mono text-[#bbcabf]">µg/m³</span>
              </div>

              {/* Tile 7: CO */}
              <div
                className="p-1.5 rounded-lg bg-[#171f33] border border-white/10 flex flex-col justify-between"
                style={{ transform: isExploded ? 'translateZ(35px)' : 'none' }}
              >
                <span className="text-[9px] font-mono text-[#86948a] uppercase">CO</span>
                <span className="font-mono font-bold text-base leading-none text-emerald-300">
                  {data.current.carbon_monoxide.value ?? '—'}
                </span>
                <span className="text-[9px] font-mono text-[#bbcabf]">mg/m³</span>
              </div>

              {/* Tile 8: Cigarettes */}
              <div
                className="p-1.5 rounded-lg bg-[#171f33] border border-white/10 flex flex-col justify-between"
                style={{ transform: isExploded ? 'translateZ(55px)' : 'none' }}
              >
                <span className="text-[9px] font-mono text-rose-300 uppercase">Cigarette Equivalent</span>
                <span className="font-mono font-bold text-base leading-none text-rose-400">
                  {data.current.cigaretteEquiv.value ?? '—'}
                </span>
                <span className="text-[9px] font-mono text-rose-300">Estimate, not exposure</span>
              </div>

              {/* Tile 9: WHO Ratio */}
              <div
                className="p-1.5 rounded-lg bg-[#171f33] border border-white/10 flex flex-col justify-between"
                style={{ transform: isExploded ? 'translateZ(25px)' : 'none' }}
              >
                <span className="text-[9px] font-mono text-[#86948a] uppercase">WHO Ratio</span>
                <span className="font-mono font-bold text-base leading-none text-rose-400">
                  {data.current.whoRatioPm25.value ?? '—'}x
                </span>
                <span className="text-[9px] font-mono text-[#bbcabf]">Threshold</span>
              </div>
            </div>

            <div className="text-[10px] font-mono text-[#86948a] flex items-center justify-between px-1">
              <span>6 pollutants + AQI</span>
              <span className="text-emerald-400">Drag to Flip Face</span>
            </div>
          </div>

          {/* FACE 2: RIGHT - Bio-Health */}
          <div
            className="absolute inset-0 p-4 rounded-2xl bg-[#0f172a]/95 border border-white/15 backdrop-blur-2xl backface-hidden shadow-2xl flex flex-col justify-between"
            style={{
              transform: `rotateY(90deg) translateZ(${HALF_CUBE}px)`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-secondary font-bold">
                2. Bio-Health Summary
              </span>
              <ProvenanceBadge kind="guidance" />
            </div>

            <div className="space-y-2.5 my-auto">
              <div className="bg-[#171f33] p-2.5 rounded-xl border border-white/10">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-[#bbcabf]">Pulmonary Stress</span>
                  <span className="text-rose-400 font-bold">
                    {aqiVal === null ? 'Unavailable' : aqiVal > 150 ? 'High Alveolar Load' : 'Nominal'}
                  </span>
                </div>
                <div className="w-full bg-[#060e20] h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round(((aqiVal ?? 0) / 300) * 100))}%`,
                      backgroundColor: aqiCat.color,
                    }}
                  ></div>
                </div>
              </div>

              <div className="bg-[#171f33] p-2.5 rounded-xl border border-white/10 space-y-1">
                <span className="text-[11px] font-mono text-emerald-400 uppercase font-bold block">
                  Persona Risk Rating
                </span>
                <div className="text-xs text-white">
                  <strong>Athletes & Runners:</strong> {aqiVal === null ? 'AQI unavailable' : aqiVal > 100 ? 'Switch to indoor gym' : 'Safe for workouts'}
                </div>
                <div className="text-xs text-white">
                  <strong>Children / Elderly:</strong> {aqiVal === null ? 'AQI unavailable' : aqiVal > 150 ? 'Keep indoors with HEPA' : 'Standard activity'}
                </div>
              </div>
            </div>

            <div className="text-[11px] font-mono text-[#86948a] flex items-center justify-between">
              <span>Guidance: ICMR / WHO</span>
              <span className="text-emerald-400">Swipe to rotate</span>
            </div>
          </div>

          {/* FACE 3: BACK - 72h Forecast (Counter-rotated inside so text is not mirrored) */}
          <div
            className="absolute inset-0 p-4 rounded-2xl bg-[#0f172a]/95 border border-white/15 backdrop-blur-2xl backface-hidden shadow-2xl flex flex-col justify-between"
            style={{
              transform: `rotateY(180deg) translateZ(${HALF_CUBE}px)`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-amber-300 font-bold">
                3. 72-Hour Forecast
              </span>
              <ProvenanceBadge kind="forecast" />
            </div>

            <div className="my-auto space-y-2">
              <div className="bg-[#171f33] p-2.5 rounded-xl border border-white/10">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-[#86948a]">Safe Window Projection:</span>
                  <span className="text-emerald-400 font-bold">
                    {data.safeWindow.found ? `${data.safeWindow.durationHours} hrs Safe` : 'No clean window'}
                  </span>
                </div>
                <p className="text-[11px] text-[#bbcabf] mt-1">
                  {data.safeWindow.found
                    ? `Lowest AQI ${data.safeWindow.minAqi} expected during window.`
                    : 'AQI expected to stay elevated over threshold.'}
                </p>
              </div>

              {/* Mini Sparkline Chart */}
              <div className="h-20 w-full bg-[#060e20] rounded-lg p-2 flex items-end gap-1 overflow-hidden">
                {data.forecastHours.slice(0, 18).map((h, idx) => {
                  if (h.us_aqi === null) {
                    return <div key={idx} className="flex-1" title={`${h.time}: AQI unavailable`} />;
                  }
                  const val = h.us_aqi;
                  const heightPct = Math.min(100, Math.max(10, Math.round((val / 300) * 100)));
                  const cat = getAqiCategory(val);
                  return (
                    <div
                      key={idx}
                      className="flex-1 rounded-t transition-all"
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor: cat.color,
                        opacity: 0.85,
                      }}
                      title={`${h.time}: ${val} AQI`}
                    ></div>
                  );
                })}
              </div>
            </div>

            <div className="text-[10px] font-mono text-[#86948a] flex items-center justify-between">
              <span>ECMWF CAMS Multi-Day</span>
              <span className="text-amber-300">Model Forecast</span>
            </div>
          </div>

          {/* FACE 4: LEFT - Historical Spikes */}
          <div
            className="absolute inset-0 p-4 rounded-2xl bg-[#0f172a]/95 border border-white/15 backdrop-blur-2xl backface-hidden shadow-2xl flex flex-col justify-between"
            style={{
              transform: `rotateY(-90deg) translateZ(${HALF_CUBE}px)`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-violet-300 font-bold">
                4. Historical Spikes (Z ≥ 2.0)
              </span>
              <ProvenanceBadge kind="historical" />
            </div>

            <div className="space-y-2 my-auto">
              {data.spikes.length > 0 ? (
                data.spikes.map((spike, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-[#171f33] border border-rose-500/30 flex items-center justify-between text-xs font-mono"
                  >
                    <div>
                      <span className="text-rose-400 font-bold">▲ {spike.aqi} AQI</span>
                      <span className="text-[#86948a] text-[10px] block">
                        {new Date(spike.time).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                        {new Date(spike.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                      Z: +{spike.zScore}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-xs font-mono text-[#86948a]">
                  No severe anomaly spikes (Z ≥ 2.0) detected in trailing baseline.
                </div>
              )}
            </div>

            <div className="text-[10px] font-mono text-[#86948a] flex items-center justify-between">
              <span>Trailing 7-Day Window</span>
              <span className="text-violet-300">Anomaly Engine</span>
            </div>
          </div>

          {/* FACE 5: TOP - Wind Dispersion */}
          <div
            className="absolute inset-0 p-4 rounded-2xl bg-[#0f172a]/95 border border-white/15 backdrop-blur-2xl backface-hidden shadow-2xl flex flex-col justify-between"
            style={{
              transform: `rotateX(90deg) translateZ(${HALF_CUBE}px)`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-cyan-300 font-bold">
                5. Wind &amp; Dispersion
              </span>
              <ProvenanceBadge kind="modeled" />
            </div>

            <div className="space-y-3 my-auto">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-[#171f33] p-2.5 rounded-xl border border-white/10">
                  <span className="text-[10px] font-mono text-[#86948a] uppercase block">Velocity</span>
                  <span className="text-lg font-mono font-bold text-cyan-300">
                    {data.wind.speed !== null ? `${data.wind.speed} km/h` : '—'}
                  </span>
                  <span className="text-[10px] font-mono text-[#bbcabf] block">
                    {data.wind.speed && data.wind.speed < 8 ? 'Stagnant (Trap)' : 'Venting Active'}
                  </span>
                </div>

                <div className="bg-[#171f33] p-2.5 rounded-xl border border-white/10">
                  <span className="text-[10px] font-mono text-[#86948a] uppercase block">Humidity</span>
                  <span className="text-lg font-mono font-bold text-emerald-300">
                    {data.wind.humidity !== null ? `${data.wind.humidity}%` : '—'}
                  </span>
                  <span className="text-[10px] font-mono text-[#bbcabf] block">
                    {data.wind.humidity && data.wind.humidity > 65 ? 'Fog Nucleation' : 'Dry Boundary'}
                  </span>
                </div>
              </div>

              <div className="bg-[#171f33] p-2 rounded-xl text-center text-xs font-mono text-[#dae2fd]">
                Vector Direction: {data.wind.direction !== null ? `${data.wind.direction}° Azimuth` : 'Calm'}
              </div>
            </div>

            <div className="text-[10px] font-mono text-[#86948a] flex items-center justify-between">
              <span>Open-Meteo Weather Model</span>
              <span className="text-cyan-300">Dispersion Vector</span>
            </div>
          </div>

          {/* FACE 6: BOTTOM - Provenance & AI */}
          <div
            className="absolute inset-0 p-4 rounded-2xl bg-[#0f172a]/95 border border-white/15 backdrop-blur-2xl backface-hidden shadow-2xl flex flex-col justify-between"
            style={{
              transform: `rotateX(-90deg) translateZ(${HALF_CUBE}px)`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-pink-300 font-bold">
                6. Provenance &amp; Verification
              </span>
              <ProvenanceBadge kind="ai" />
            </div>

            <div className="space-y-2 my-auto text-xs font-mono">
              <div className="bg-[#171f33] p-2 rounded-xl border border-white/10 space-y-1">
                <span className="text-[10px] uppercase text-[#86948a] block">Atmospheric Model</span>
                <span className="text-emerald-300">Open-Meteo &amp; Copernicus CAMS</span>
              </div>

              <div className="bg-[#171f33] p-2 rounded-xl border border-white/10 space-y-1">
                <span className="text-[10px] uppercase text-[#86948a] block">AI Copilot Core</span>
                <span className="text-pink-300">Google Gemini 2.5 Flash</span>
              </div>

              <div className="bg-[#171f33] p-2 rounded-xl border border-white/10 flex justify-between items-center">
                <span className="text-[10px] uppercase text-[#86948a]">Observed:</span>
                <span className="text-white text-[11px]">{data.observedAt || 'Unavailable'}</span>
              </div>
            </div>

            <div className="text-[10px] font-mono text-[#86948a] flex items-center justify-between">
              <span>Modeled data • source timestamp shown</span>
              <span className="text-pink-300">Open-Meteo CAMS</span>
            </div>
          </div>
        </div>
      </div>

      {/* 6-Button Quick Snap Dock */}
      <div className="space-y-2 mt-4">
        <div className="flex items-center justify-between text-[11px] font-mono text-[#86948a] uppercase">
          <span>Quick Snap Dock:</span>
          <span className="text-emerald-400 font-semibold">{FACE_ROTATIONS[activeFace].name}</span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5" role="toolbar" aria-label="Cube face selector">
          {(Object.keys(FACE_ROTATIONS) as CubeFace[]).map((face, idx) => {
            const isCurrent = activeFace === face;
            const labels = ['1. Pollutant', '2. Health', '3. Forecast', '4. Spikes', '5. Wind', '6. Provenance'];
            return (
              <button
                key={face}
                onClick={() => snapToFace(face)}
                aria-pressed={isCurrent}
                className={`py-1.5 px-2 rounded-lg text-xs font-mono transition-all text-center truncate ${
                  isCurrent
                    ? 'bg-emerald-500 text-[#003824] font-bold shadow-[0_0_12px_rgba(78,222,163,0.3)]'
                    : 'bg-[#171f33] hover:bg-[#222a3d] text-[#bbcabf] border border-white/5'
                }`}
              >
                {labels[idx]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
