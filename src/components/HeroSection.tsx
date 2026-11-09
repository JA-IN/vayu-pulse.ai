/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { AirQualityDataset } from '../lib/api/openMeteo.ts';
import { getAqiCategory } from '../lib/aqi.ts';
import { ProvenanceBadge } from './ProvenanceBadge.tsx';
import { BiosphereMoodConverter } from './BiosphereMoodConverter.tsx';
import { TelemetryCube } from './TelemetryCube.tsx';

interface HeroSectionProps {
  data: AirQualityDataset;
  diwaliSmogMode: boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ data, diwaliSmogMode }) => {
  const aqiVal = data.current.us_aqi.value;
  const isStationReading = data.current.us_aqi.kind === 'station';
  const category = getAqiCategory(aqiVal);

  // Animated count-up for the big AQI number
  const [displayedAqi, setDisplayedAqi] = useState(0);

  useEffect(() => {
    if (aqiVal === null) return;
    let start = 0;
    const end = aqiVal;
    if (start === end) return;
    const duration = 800; // ms
    const increment = Math.max(1, Math.round(end / 40));
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayedAqi(end);
        clearInterval(timer);
      } else {
        setDisplayedAqi(start);
      }
    }, duration / 40);

    return () => clearInterval(timer);
  }, [aqiVal]);

  return (
    <section className="relative space-y-6">
      {/* Dynamic Ambient Aurora Volumetric Glow Blobs */}
      <div className="pointer-events-none absolute -top-24 left-1/4 w-[600px] h-[400px] rounded-full blur-[140px] opacity-25 transition-all duration-1000 -z-10"
        style={{ backgroundColor: category.color }}
      ></div>

      {/* Current AQI source and observation status */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#060e20]/60 backdrop-blur-xl px-4 py-2.5 rounded-xl border border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full animate-ping"
              style={{ backgroundColor: category.color }}
            ></span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              ATMOSPHERIC STATUS:
            </span>
            <span
              className="text-xs font-mono font-extrabold uppercase px-2 py-0.5 rounded-full"
              style={{ backgroundColor: category.bgTint, color: category.textColor }}
            >
              {category.label} (AQI {aqiVal ?? '—'})
            </span>
          </div>

          <span className="hidden md:inline text-white/20">•</span>

          <div className="hidden md:flex items-center gap-2 text-xs font-mono text-[#bbcabf]">
            <span>COORDINATES: <strong className="text-white">{data.city.latitude.toFixed(4)}° N, {data.city.longitude.toFixed(4)}° E</strong></span>
            {data.city.elevation && (
              <>
                <span className="text-white/20">•</span>
                <span>ELEV: <strong className="text-white">{data.city.elevation}m MSL</strong></span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[#86948a]">
          <span>Observed: <strong className="text-white">{data.observedAt || 'Unavailable'}</strong></span>
          <ProvenanceBadge
            kind={isStationReading ? 'station' : 'modeled'}
            stale={data.isStale}
            sourceNote={isStationReading ? data.stationData?.aqi.source : 'Open-Meteo CAMS'}
          />
        </div>
        {data.stationData && data.stationData.attributions.length > 0 && (
          <div className="w-full text-[10px] font-mono text-[#86948a]">
            WAQI station attribution: {data.stationData.attributions.join(', ')}
          </div>
        )}
      </div>

      {/* Two Column Signature Row: Biosphere Eco-Mood + 3D Telemetry Cube */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Left Column (Span 6): Biosphere Eco-Mood Converter */}
        <div className="xl:col-span-6 flex flex-col justify-between">
          <BiosphereMoodConverter
            currentAqi={aqiVal}
            pm25={data.current.pm2_5.value}
            cityName={data.city.name}
            observedAt={data.observedAt}
            diwaliSmogMode={diwaliSmogMode}
          />
        </div>

        {/* Right Column (Span 6): 3D Telemetry Cube */}
        <div className="xl:col-span-6 flex flex-col justify-between">
          <TelemetryCube data={data} />
        </div>
      </div>

      {/* 6-Pollutant Speciation Grid with WHO Multiples and Badges */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-300 text-[20px]">
                blur_on
              </span>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#bbcabf]">
                Chemical Speciation &amp; WHO Guideline Ratios
              </span>
              <ProvenanceBadge kind="modeled" />
            </div>
            <p className="text-xs text-[#86948a] mt-0.5">
              Ground-level and tropospheric concentrations calibrated against World Health Organization 2021 air quality targets.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[#86948a]">
            <span>Primary Toxicity Driver: <strong className="text-rose-400">PM2.5 Core</strong></span>
          </div>
        </div>

        {/* 6 Tiles Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. PM2.5 */}
          <div className="p-3.5 rounded-xl bg-[#131b2e] border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#86948a] uppercase font-semibold">PM2.5</span>
              <ProvenanceBadge kind="modeled" />
            </div>
            <div className="my-2">
              <span className="font-mono text-2xl font-bold text-rose-300 tabular-nums">
                {data.current.pm2_5.value ?? '—'}
              </span>
              <span className="text-xs font-mono text-[#86948a] ml-1">µg/m³</span>
            </div>
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono">
              <span className="text-[#bbcabf]">WHO Multiple:</span>
              <span className="text-rose-400 font-bold">
                {data.current.whoRatioPm25.value !== null ? `${data.current.whoRatioPm25.value}x` : '—'}
              </span>
            </div>
          </div>

          {/* 2. PM10 */}
          <div className="p-3.5 rounded-xl bg-[#131b2e] border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#86948a] uppercase font-semibold">PM10</span>
              <ProvenanceBadge kind="modeled" />
            </div>
            <div className="my-2">
              <span className="font-mono text-2xl font-bold text-purple-300 tabular-nums">
                {data.current.pm10.value ?? '—'}
              </span>
              <span className="text-xs font-mono text-[#86948a] ml-1">µg/m³</span>
            </div>
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono">
              <span className="text-[#bbcabf]">WHO Multiple:</span>
              <span className="text-purple-300 font-bold">
                {data.current.whoRatioPm10.value !== null ? `${data.current.whoRatioPm10.value}x` : '—'}
              </span>
            </div>
          </div>

          {/* 3. NO2 */}
          <div className="p-3.5 rounded-xl bg-[#131b2e] border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#86948a] uppercase font-semibold">NO₂</span>
              <ProvenanceBadge kind="modeled" />
            </div>
            <div className="my-2">
              <span className="font-mono text-2xl font-bold text-emerald-300 tabular-nums">
                {data.current.nitrogen_dioxide.value ?? '—'}
              </span>
              <span className="text-xs font-mono text-[#86948a] ml-1">µg/m³</span>
            </div>
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono">
              <span className="text-[#bbcabf]">WHO Target:</span>
              <span className="text-emerald-400 font-bold">25 µg/m³ (24h)</span>
            </div>
          </div>

          {/* 4. SO2 */}
          <div className="p-3.5 rounded-xl bg-[#131b2e] border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#86948a] uppercase font-semibold">SO₂</span>
              <ProvenanceBadge kind="modeled" />
            </div>
            <div className="my-2">
              <span className="font-mono text-2xl font-bold text-emerald-300 tabular-nums">
                {data.current.sulphur_dioxide.value ?? '—'}
              </span>
              <span className="text-xs font-mono text-[#86948a] ml-1">µg/m³</span>
            </div>
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono">
              <span className="text-[#bbcabf]">WHO Target:</span>
              <span className="text-emerald-400 font-bold">40 µg/m³ (24h)</span>
            </div>
          </div>

          {/* 5. Ozone O3 */}
          <div className="p-3.5 rounded-xl bg-[#131b2e] border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#86948a] uppercase font-semibold">Ozone O₃</span>
              <ProvenanceBadge kind="modeled" />
            </div>
            <div className="my-2">
              <span className="font-mono text-2xl font-bold text-amber-300 tabular-nums">
                {data.current.ozone.value ?? '—'}
              </span>
              <span className="text-xs font-mono text-[#86948a] ml-1">µg/m³</span>
            </div>
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono">
              <span className="text-[#bbcabf]">WHO 8h Target:</span>
              <span className="text-amber-400 font-bold">100 µg/m³</span>
            </div>
          </div>

          {/* 6. CO */}
          <div className="p-3.5 rounded-xl bg-[#131b2e] border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#86948a] uppercase font-semibold">Carbon CO</span>
              <ProvenanceBadge kind="modeled" />
            </div>
            <div className="my-2">
              <span className="font-mono text-2xl font-bold text-cyan-300 tabular-nums">
                {data.current.carbon_monoxide.value ?? '—'}
              </span>
              <span className="text-xs font-mono text-[#86948a] ml-1">mg/m³</span>
            </div>
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono">
              <span className="text-[#bbcabf]">Converted from:</span>
              <span className="text-cyan-400 font-bold">µg ÷ 1000</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
