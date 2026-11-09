/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { getAqiCategory, calculateCigaretteEquivalence } from '../lib/aqi.ts';
import { ProvenanceBadge } from './ProvenanceBadge.tsx';

interface BiosphereMoodConverterProps {
  currentAqi: number | null;
  pm25: number | null;
  cityName: string;
  observedAt: string | null;
  diwaliSmogMode?: boolean;
}

export const BiosphereMoodConverter: React.FC<BiosphereMoodConverterProps> = ({
  currentAqi,
  pm25,
  cityName,
  diwaliSmogMode = false,
}) => {
  // Allow user to scrub simulated AQI to see organism transitions or sync with live
  const [useSimulation, setUseSimulation] = useState(false);
  const [simulatedAqi, setSimulatedAqi] = useState<number>(currentAqi ?? 100);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'sun' | 'earth' | 'plant' | 'lungs'>('all');

  const activeAqi = useSimulation ? simulatedAqi : currentAqi;
  const category = getAqiCategory(activeAqi);

  if (activeAqi === null) {
    return (
      <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-3">
        <h3 className="font-display font-bold text-xl text-white">Biosphere Eco-Mood Converter</h3>
        <p className="text-sm text-[#bbcabf]">AQI is unavailable, so no current mood or exposure estimate can be shown.</p>
        <button
          onClick={() => setUseSimulation(true)}
          className="px-3 py-2 rounded-lg text-xs font-mono border border-amber-500/40 bg-amber-500/10 text-amber-300"
        >
          Explore illustrative AQI simulation
        </button>
      </div>
    );
  }

  const effectivePm25 = useSimulation ? null : pm25;
  const cigarettes = useSimulation ? null : calculateCigaretteEquivalence(pm25);
  const whoRatio = effectivePm25 === null ? null : Math.round((effectivePm25 / 15) * 10) / 10;

  // Derive biological mood state
  const isHealthy = activeAqi <= 50;
  const isModerate = activeAqi > 50 && activeAqi <= 100;
  const isSensitive = activeAqi > 100 && activeAqi <= 150;
  const isUnhealthy = activeAqi > 150 && activeAqi <= 200;
  const isSevere = activeAqi > 200;

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden">
      {/* Dynamic ambient volumetric glow behind the cards */}
      <div
        className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl opacity-30 transition-all duration-700"
        style={{ backgroundColor: category.color }}
      ></div>

      <div>
        {/* Header Ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]" style={{ color: category.color }}>
              psychology_alt
            </span>
            <span className="text-[11px] font-mono uppercase text-[#bbcabf] tracking-wider font-semibold">
              Living Anthropomorphic Triad
            </span>
            <ProvenanceBadge kind="derived" sourceNote="Biological mood synthesis from US AQI" />
          </div>

          <div
            className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold"
            style={{ backgroundColor: category.bgTint, color: category.textColor }}
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: category.color }}
            ></span>
            <span>
              AQI {activeAqi} — {category.label} ({cityName})
            </span>
          </div>
        </div>

        <h3 className="font-display font-bold text-xl sm:text-2xl text-white tracking-tight">
          The Biosphere Eco-Mood Converter
        </h3>
        <p className="text-xs sm:text-sm text-[#bbcabf] mt-1 max-w-2xl">
          Translating ambient air metrics into visceral planetary, solar, botanical, and pulmonary distress expressions.
        </p>

        {/* View Mode Controls: Filter & Simulation Scrubber Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-2 border-t border-white/5">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-amber-300">
              Illustrative visualization; not biological sensor data.
            </span>
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                selectedFilter === 'all'
                  ? 'bg-emerald-500 text-[#003824] font-bold shadow-sm'
                  : 'bg-[#171f33] text-[#bbcabf] hover:text-white'
              }`}
            >
              All Organisms
            </button>
            <button
              onClick={() => setSelectedFilter('sun')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                selectedFilter === 'sun'
                  ? 'bg-emerald-500 text-[#003824] font-bold shadow-sm'
                  : 'bg-[#171f33] text-[#bbcabf] hover:text-white'
              }`}
            >
              Solar Sun
            </button>
            <button
              onClick={() => setSelectedFilter('earth')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                selectedFilter === 'earth'
                  ? 'bg-emerald-500 text-[#003824] font-bold shadow-sm'
                  : 'bg-[#171f33] text-[#bbcabf] hover:text-white'
              }`}
            >
              Earth
            </button>
            <button
              onClick={() => setSelectedFilter('plant')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                selectedFilter === 'plant'
                  ? 'bg-emerald-500 text-[#003824] font-bold shadow-sm'
                  : 'bg-[#171f33] text-[#bbcabf] hover:text-white'
              }`}
            >
              Tulsi / Flora
            </button>
            <button
              onClick={() => setSelectedFilter('lungs')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                selectedFilter === 'lungs'
                  ? 'bg-emerald-500 text-[#003824] font-bold shadow-sm'
                  : 'bg-[#171f33] text-[#bbcabf] hover:text-white'
              }`}
            >
              Pulmonary Lungs
            </button>
          </div>

          {/* Interactive Simulation Slider Toggle */}
          <button
            onClick={() => {
              setUseSimulation(!useSimulation);
              if (!useSimulation && currentAqi !== null) setSimulatedAqi(currentAqi);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${
              useSimulation
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-[#131b2e] text-[#86948a] border-white/10 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">tune</span>
            <span>{useSimulation ? 'Scrubbing AQI: ' + simulatedAqi : 'Scrub Mood Slider'}</span>
          </button>
        </div>

        {/* Scrubber slider when enabled */}
        {useSimulation && (
          <div className="mt-3 p-3 rounded-xl bg-[#060e20]/80 border border-amber-500/30 space-y-1">
            <div className="flex justify-between text-[11px] font-mono text-[#bbcabf]">
              <span>Simulated Air Quality Scrubber:</span>
              <strong className="text-amber-400 font-bold">{simulatedAqi} AQI ({category.label})</strong>
            </div>
            <input
              type="range"
              min="10"
              max="450"
              value={simulatedAqi}
              onChange={(e) => setSimulatedAqi(Number(e.target.value))}
              className="w-full h-1.5 bg-[#222a3d] rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
            <div className="flex justify-between text-[9px] font-mono text-[#86948a]">
              <span>25 (Good)</span>
              <span>75 (Moderate)</span>
              <span>125 (Sensitive)</span>
              <span>180 (Unhealthy)</span>
              <span>350+ (Hazardous)</span>
            </div>
          </div>
        )}

        {/* 4 Reactive Vector Characters Stage */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {/* 1. Solar Sun Character */}
          {(selectedFilter === 'all' || selectedFilter === 'sun') && (
            <div className="bg-[#131b2e]/80 border border-white/10 rounded-xl p-3 flex flex-col items-center text-center justify-between transition-all hover:border-white/20">
              <span className="text-[10px] font-mono uppercase text-amber-300 tracking-wider">
                Solar Visibility
              </span>

              {/* Sun SVG Vector Graphic */}
              <div className="w-24 h-24 my-2 relative flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
                  {/* Rays */}
                  <g
                    className={isHealthy ? 'animate-spin' : ''}
                    style={{ animationDuration: '30s', transformOrigin: 'center' }}
                  >
                    <circle cx="50" cy="50" r="32" fill="none" stroke={category.color} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.4" />
                    <line x1="50" y1="8" x2="50" y2="16" stroke={category.color} strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="50" y1="84" x2="50" y2="92" stroke={category.color} strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="8" y1="50" x2="16" y2="50" stroke={category.color} strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="84" y1="50" x2="92" y2="50" stroke={category.color} strokeWidth="2.5" strokeLinecap="round" />
                  </g>

                  {/* Sun Disc */}
                  <circle cx="50" cy="50" r="28" fill="#f59e0b" opacity={isSevere ? 0.35 : 0.85} />

                  {/* Smog particulate overlay in high pollution */}
                  {(isUnhealthy || isSevere) && (
                    <path
                      d="M26 40 Q50 32 74 38 T80 58 Q50 64 22 56 Z"
                      fill="#3c4a42"
                      opacity="0.65"
                    />
                  )}

                  {/* Eyes */}
                  {isHealthy ? (
                    // Smiling sunglasses
                    <g>
                      <polygon points="34,42 66,42 62,52 38,52" fill="#003824" />
                      <line x1="34" y1="44" x2="66" y2="44" stroke="#4edea3" strokeWidth="1.5" />
                      <path d="M42 58 Q50 64 58 58" stroke="#003824" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                    </g>
                  ) : isModerate ? (
                    // Mild neutral eyes
                    <g>
                      <circle cx="42" cy="46" r="2.5" fill="#451a03" />
                      <circle cx="58" cy="46" r="2.5" fill="#451a03" />
                      <line x1="44" y1="58" x2="56" y2="58" stroke="#451a03" strokeWidth="2" strokeLinecap="round" />
                    </g>
                  ) : isSensitive ? (
                    // Squinting eyes & cloth mask
                    <g>
                      <path d="M38 44 Q43 40 48 44" stroke="#451a03" strokeWidth="2" fill="none" />
                      <path d="M52 44 Q57 40 62 44" stroke="#451a03" strokeWidth="2" fill="none" />
                      <polygon points="35,50 65,50 58,64 42,64" fill="#dae2fd" opacity="0.9" />
                      <line x1="35" y1="52" x2="26" y2="48" stroke="#dae2fd" strokeWidth="1.5" />
                      <line x1="65" y1="52" x2="74" y2="48" stroke="#dae2fd" strokeWidth="1.5" />
                    </g>
                  ) : (
                    // Severe coughing sun with N95 mask
                    <g>
                      <path d="M38 42 L46 45 M46 42 L38 45" stroke="#ffdad6" strokeWidth="2" strokeLinecap="round" />
                      <path d="M54 42 L62 45 M62 42 L54 45" stroke="#ffdad6" strokeWidth="2" strokeLinecap="round" />
                      <polygon points="32,48 68,48 60,67 40,67" fill="#dae2fd" />
                      <circle cx="50" cy="57" r="3.5" fill="#86948a" />
                      <line x1="32" y1="50" x2="24" y2="46" stroke="#dae2fd" strokeWidth="1.5" />
                      <line x1="68" y1="50" x2="76" y2="46" stroke="#dae2fd" strokeWidth="1.5" />
                      {/* Cough puff */}
                      <circle cx="76" cy="36" r="2.5" fill="#ffb4ab" opacity="0.8" />
                      <circle cx="82" cy="30" r="3.5" fill="#ffb4ab" opacity="0.6" />
                    </g>
                  )}
                </svg>
              </div>

              <div className="space-y-0.5">
                <span className="font-mono text-xs font-bold text-white block">Solar Sun</span>
                <span className="text-[10px] font-mono text-amber-300">
                  {isHealthy ? 'Visual: clear' : isSevere ? 'Visual: heavily obscured' : 'Visual: hazy'}
                </span>
                <p className="text-[10px] text-[#bbcabf] line-clamp-2 leading-tight">
                  {isHealthy
                    ? 'Crisp blue skies and clear atmospheric transparency.'
                    : 'Aerosol optical depth scatters visible sunlight.'}
                </p>
              </div>
            </div>
          )}

          {/* 2. Mother Earth Character */}
          {(selectedFilter === 'all' || selectedFilter === 'earth') && (
            <div className="bg-[#131b2e]/80 border border-white/10 rounded-xl p-3 flex flex-col items-center text-center justify-between transition-all hover:border-white/20">
              <span className="text-[10px] font-mono uppercase text-secondary tracking-wider">
                Planetary Biosphere
              </span>

              {/* Earth SVG Vector Graphic */}
              <div className="w-24 h-24 my-2 relative flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
                  {/* Planetary Circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="28"
                    fill={isSevere ? '#1e293b' : '#131b2e'}
                    stroke={category.color}
                    strokeWidth="1.5"
                  />

                  {/* Continents */}
                  <path
                    d="M38 34 Q50 30 56 38 Q50 48 42 44 Z"
                    fill={isSevere ? '#571bc1' : '#10b981'}
                    opacity={isSevere ? 0.4 : 0.6}
                  />
                  <path
                    d="M34 56 Q48 50 46 68 Q36 68 34 56 Z"
                    fill={isSevere ? '#571bc1' : '#10b981'}
                    opacity={isSevere ? 0.4 : 0.6}
                  />

                  {/* Eyes and expression */}
                  {isHealthy ? (
                    // Glowing happy earth
                    <g>
                      <circle cx="43" cy="46" r="2.5" fill="#6ffbbe" />
                      <circle cx="57" cy="46" r="2.5" fill="#6ffbbe" />
                      <path d="M44 56 Q50 62 56 56" stroke="#6ffbbe" strokeWidth="2" strokeLinecap="round" fill="none" />
                      <circle cx="36" cy="52" r="2.5" fill="#ff7886" opacity="0.6" />
                      <circle cx="64" cy="52" r="2.5" fill="#ff7886" opacity="0.6" />
                    </g>
                  ) : isModerate || isSensitive ? (
                    // Concerned earth with sweat drop
                    <g>
                      <circle cx="43" cy="46" r="2.5" fill="#dae2fd" />
                      <circle cx="57" cy="46" r="2.5" fill="#dae2fd" />
                      <line x1="44" y1="58" x2="56" y2="58" stroke="#dae2fd" strokeWidth="2" strokeLinecap="round" />
                      {/* Sweat drop */}
                      <path d="M66 40 C66 40 69 44 69 46 C69 48 67 49 66 49 C65 49 63 48 63 46 Z" fill="#6ffbbe" />
                    </g>
                  ) : (
                    // Dizzy Earth with thermometer & fever band
                    <g>
                      {/* Fever band */}
                      <rect x="30" y="24" width="40" height="7" rx="2" fill="#ffb4ab" />
                      <line x1="50" y1="24" x2="50" y2="31" stroke="#93000a" strokeWidth="1" />

                      {/* Dizzy spiral eyes */}
                      <circle cx="42" cy="45" r="3.5" stroke="#ffb4ab" strokeWidth="1.5" fill="none" className="animate-spin" style={{ transformOrigin: '42px 45px' }} />
                      <circle cx="58" cy="45" r="3.5" stroke="#ffb4ab" strokeWidth="1.5" fill="none" className="animate-spin" style={{ transformOrigin: '58px 45px' }} />

                      {/* Flushed cheeks */}
                      <circle cx="34" cy="52" r="3" fill="#ff7886" opacity="0.8" />
                      <circle cx="66" cy="52" r="3" fill="#ff7886" opacity="0.8" />

                      {/* Thermometer in mouth */}
                      <line x1="48" y1="56" x2="38" y2="64" stroke="#ffb2b7" strokeWidth="3" strokeLinecap="round" />
                      <circle cx="36" cy="66" r="3.5" fill="#ff7886" />
                    </g>
                  )}
                </svg>
              </div>

              <div className="space-y-0.5">
                <span className="font-mono text-xs font-bold text-white block">Mother Earth</span>
                <span className="text-[10px] font-mono text-secondary">
                  {isHealthy ? 'Bio-Health: Resilient' : isSevere ? 'Boundary Inversion: Severe' : 'Thermal Inversion: Rising'}
                </span>
                <p className="text-[10px] text-[#bbcabf] line-clamp-2 leading-tight">
                  {isHealthy
                    ? 'Active tropospheric circulation venting micro-climates.'
                    : 'Cool nocturnal air traps particulate smog close to the surface.'}
                </p>
              </div>
            </div>
          )}

          {/* 3. Botanical Tulsi / Marigold Character */}
          {(selectedFilter === 'all' || selectedFilter === 'plant') && (
            <div className="bg-[#131b2e]/80 border border-white/10 rounded-xl p-3 flex flex-col items-center text-center justify-between transition-all hover:border-white/20">
              <span className="text-[10px] font-mono uppercase text-emerald-400 tracking-wider">
                Botanical Biomarker
              </span>

              {/* Tulsi Plant SVG Vector Graphic */}
              <div className="w-24 h-24 my-2 relative flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
                  {/* Terracotta Planter Pot */}
                  <polygon points="35,68 65,68 60,88 40,88" fill="#2d3449" />
                  <rect x="33" y="65" width="34" height="4" rx="1" fill="#3c4a42" />

                  {isHealthy ? (
                    // Vibrant blooming Tulsi with flower
                    <g>
                      <path d="M50 65 Q50 48 50 36" stroke="#4edea3" strokeWidth="3" fill="none" strokeLinecap="round" />
                      {/* Full leaves */}
                      <path d="M50 54 Q36 48 38 40 Q48 44 50 54 Z" fill="#10b981" />
                      <path d="M50 48 Q64 42 62 34 Q52 38 50 48 Z" fill="#10b981" />
                      <path d="M50 36 Q42 26 50 24 Q58 26 50 36 Z" fill="#4edea3" />
                      {/* Dew droplet */}
                      <circle cx="56" cy="28" r="2" fill="#6ffbbe" />
                    </g>
                  ) : isModerate || isSensitive ? (
                    // Slight curl, minor dust
                    <g>
                      <path d="M50 65 Q48 50 46 38" stroke="#4edea3" strokeWidth="3" fill="none" />
                      <path d="M48 52 Q34 50 38 42 Q46 44 48 52 Z" fill="#3c4a42" opacity="0.8" />
                      <path d="M47 44 Q60 40 58 34 Q49 38 47 44 Z" fill="#4edea3" opacity="0.7" />
                      <circle cx="42" cy="46" r="1.2" fill="#86948a" />
                      <circle cx="54" cy="38" r="1.2" fill="#86948a" />
                    </g>
                  ) : (
                    // Wilted drooping plant with heavy soot flecks
                    <g>
                      {/* Slumped stem */}
                      <path d="M50 65 Q44 48 30 46" stroke="#005236" strokeWidth="3" fill="none" strokeLinecap="round" />
                      {/* Drooping leaves */}
                      <path d="M44 54 C32 52 24 64 36 60" fill="#3c4a42" opacity="0.9" />
                      <path d="M38 48 C24 44 20 54 30 52" fill="#3c4a42" opacity="0.8" />
                      {/* Wilted flower bud drooping downward */}
                      <circle cx="28" cy="46" r="5" fill="#f59e0b" opacity="0.7" />
                      {/* Fallen petals on soil */}
                      <circle cx="42" cy="68" r="2.5" fill="#d97706" opacity="0.8" />
                      <circle cx="58" cy="68" r="2" fill="#d97706" opacity="0.7" />
                      {/* Particulate soot specks */}
                      <circle cx="36" cy="54" r="1.5" fill="#060e20" />
                      <circle cx="42" cy="50" r="1.5" fill="#060e20" />
                      <circle cx="32" cy="48" r="1.5" fill="#060e20" />
                    </g>
                  )}
                </svg>
              </div>

              <div className="space-y-0.5">
                <span className="font-mono text-xs font-bold text-white block">Tulsi Bio-Cell</span>
                <span className="text-[10px] font-mono text-emerald-400">
                  {isHealthy ? 'Illustrative: open leaves' : isSevere ? 'Illustrative: stressed leaves' : 'Illustrative: mild stress'}
                </span>
                <p className="text-[10px] text-[#bbcabf] line-clamp-2 leading-tight">
                  {isHealthy
                    ? 'Unclogged leaf cuticle facilitating healthy night transpiration.'
                    : 'Fine soot crust clogging gas exchange stomata pores.'}
                </p>
              </div>
            </div>
          )}

          {/* 4. Pulmonary Lungs Card */}
          {(selectedFilter === 'all' || selectedFilter === 'lungs') && (
            <div className="bg-[#131b2e]/80 border border-white/10 rounded-xl p-3 flex flex-col items-center text-center justify-between transition-all hover:border-white/20">
              <span className="text-[10px] font-mono uppercase text-rose-300 tracking-wider">
                Pulmonary Filter
              </span>

              {/* Lungs SVG Vector Graphic */}
              <div className="w-24 h-24 my-2 relative flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
                  {/* Trachea */}
                  <rect x="48" y="24" width="4" height="18" rx="1" fill="#3c4a42" />

                  {/* Left Lobe */}
                  <path
                    d="M47 40 C38 40 26 48 26 66 C26 78 38 80 44 74 C47 68 47 48 47 40 Z"
                    fill={isHealthy ? '#10b981' : isSevere ? '#ff7886' : '#2d3449'}
                    opacity={isHealthy ? 0.8 : isSevere ? 0.9 : 0.7}
                  />

                  {/* Right Lobe */}
                  <path
                    d="M53 40 C62 40 74 48 74 66 C74 78 62 80 56 74 C53 68 53 48 53 40 Z"
                    fill={isHealthy ? '#10b981' : isSevere ? '#ff7886' : '#2d3449'}
                    opacity={isHealthy ? 0.8 : isSevere ? 0.9 : 0.7}
                  />

                  {/* Bronchial Tree lines */}
                  <path d="M47 48 Q38 56 36 66" stroke="#ffffff" strokeWidth="1" strokeDasharray="1 1" opacity="0.6" fill="none" />
                  <path d="M53 48 Q62 56 64 66" stroke="#ffffff" strokeWidth="1" strokeDasharray="1 1" opacity="0.6" fill="none" />

                  {/* Infiltrating PM2.5 micro particles */}
                  {(isUnhealthy || isSevere) && (
                    <g fill="#ffdad6">
                      <circle cx="36" cy="62" r="1.5" className="animate-ping" />
                      <circle cx="64" cy="62" r="1.5" className="animate-ping" />
                      <circle cx="40" cy="70" r="1.2" />
                      <circle cx="60" cy="70" r="1.2" />
                    </g>
                  )}
                </svg>
              </div>

              <div className="space-y-0.5">
                <span className="font-mono text-xs font-bold text-white block">Alveolar Capillaries</span>
                <span className="text-[10px] font-mono text-rose-300">
                  PM2.5: {effectivePm25 === null ? '—' : `${effectivePm25.toFixed(1)} µg (${whoRatio}x WHO)`}
                </span>
                <p className="text-[10px] text-[#bbcabf] line-clamp-2 leading-tight">
                  {isHealthy
                    ? 'Zero particulate penetration into deep pulmonary tissue.'
                    : 'Sub-2.5µm carbon soot breaches alveolar blood barrier.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Berkeley Earth Passive Smoking Human Impact Card (Bottom Banner) */}
      <div className="mt-4 p-3.5 sm:p-4 rounded-xl bg-[#131b2e]/90 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
        <div className="flex items-center gap-3">
          <div className="text-3xl select-none">🚬</div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-300">
                Concentration-Based Estimate
              </span>
              <ProvenanceBadge kind="derived" sourceNote="Berkeley Earth passive-smoking estimate" />
            </div>
            <p className="text-xs sm:text-sm text-white mt-0.5">
              The modeled PM2.5 concentration corresponds to{' '}
              <span className="font-mono font-bold text-rose-400 text-sm sm:text-base tabular-nums">
                {cigarettes === null ? 'an unavailable estimate' : `${cigarettes} cigarette-equivalents/day`}
              </span>
              {' '}using the Berkeley Earth method; this is not a measured personal exposure.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden md:block text-[11px] font-mono text-[#86948a]">
            <div>Formula: PM2.5 ÷ 22</div>
            <div className="text-emerald-400">WHO 24h reference: 15 µg/m³</div>
          </div>
          <span
            className="px-3 py-1 rounded-full text-xs font-mono font-bold select-none"
            style={{ backgroundColor: category.bgTint, color: category.textColor }}
          >
            {category.label}
          </span>
        </div>
      </div>
    </div>
  );
};
