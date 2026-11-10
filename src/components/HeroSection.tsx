/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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

  return (
    <section className="relative space-y-4">
      <div className="pointer-events-none absolute -top-16 left-0 h-56 w-full rounded-full bg-indigo-400/10 blur-3xl" />

      <div className="data-card relative grid gap-5 overflow-hidden rounded-3xl p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-28 h-64 w-64 rounded-full blur-3xl opacity-15" style={{ backgroundColor: category.color }} />
        <div className="relative">
          <p className="section-eyebrow">Current air quality</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
            {data.city.name}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {data.city.country} <span className="mx-1.5 text-slate-600">·</span>
            {data.city.latitude.toFixed(3)}, {data.city.longitude.toFixed(3)}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ProvenanceBadge
              kind={isStationReading ? 'station' : 'modeled'}
              stale={data.isStale}
              sourceNote={isStationReading ? data.stationData?.aqi.source : 'Open-Meteo CAMS'}
            />
            <span className="text-xs text-slate-400">
              Observed {data.observedAt ? new Date(data.observedAt).toLocaleString() : 'time unavailable'}
            </span>
          </div>
          {data.stationData && data.stationData.attributions.length > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              WAQI attribution: {data.stationData.attributions.join(', ')}
            </p>
          )}
        </div>

        <div className="relative flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-slate-950/25 p-4 sm:min-w-56">
          <span className="font-display text-5xl font-semibold leading-none tabular-nums text-slate-50 sm:text-6xl">
            {aqiVal ?? '—'}
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">AQI</p>
            <p className="mt-1 text-sm font-semibold" style={{ color: category.color }}>
              {aqiVal === null ? 'Unavailable' : category.label}
            </p>
          </div>
        </div>
      </div>

      <details className="disclosure-card group">
        <summary>
          <span>
            <span className="section-eyebrow">Visualizations</span>
            <span className="mt-1 block text-base font-semibold text-slate-100">3D cube &amp; air-quality illustrations</span>
            <span className="mt-1 block text-sm font-normal text-slate-400">Optional interactive views based on the displayed AQI.</span>
          </span>
          <span className="disclosure-icon" aria-hidden="true">+</span>
        </summary>
        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
          <BiosphereMoodConverter
            currentAqi={aqiVal}
            pm25={data.current.pm2_5.value}
            cityName={data.city.name}
            observedAt={data.observedAt}
            diwaliSmogMode={diwaliSmogMode}
          />
          <TelemetryCube data={data} />
        </div>
      </details>

      <details className="disclosure-card group">
        <summary>
          <span>
            <span className="section-eyebrow">Modeled data</span>
            <span className="mt-1 block text-base font-semibold text-slate-100">Pollutant estimates &amp; health references</span>
            <span className="mt-1 block text-sm font-normal text-slate-400">Open-Meteo CAMS concentrations and guideline comparisons.</span>
          </span>
          <span className="disclosure-icon" aria-hidden="true">+</span>
        </summary>
        <div className="mt-5 rounded-2xl border border-indigo-300/15 bg-indigo-400/[0.06] p-4 text-xs leading-5 text-indigo-100/80">
          These values are CAMS model estimates, not CPCB station measurements. CPCB measurements, when available, are shown separately below.
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {/* 1. PM2.5 */}
          <div className="rounded-xl border border-white/[0.07] bg-slate-950/25 p-3.5 transition hover:border-indigo-300/20">
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
          <div className="rounded-xl border border-white/[0.07] bg-slate-950/25 p-3.5 transition hover:border-indigo-300/20">
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
          <div className="rounded-xl border border-white/[0.07] bg-slate-950/25 p-3.5 transition hover:border-indigo-300/20">
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
          <div className="rounded-xl border border-white/[0.07] bg-slate-950/25 p-3.5 transition hover:border-indigo-300/20">
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
          <div className="rounded-xl border border-white/[0.07] bg-slate-950/25 p-3.5 transition hover:border-indigo-300/20">
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
          <div className="rounded-xl border border-white/[0.07] bg-slate-950/25 p-3.5 transition hover:border-indigo-300/20">
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
      </details>
    </section>
  );
};
