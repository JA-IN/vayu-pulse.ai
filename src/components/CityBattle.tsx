/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CityLocation, PRESET_CITIES, fetchAirQualityData, AirQualityDataset } from '../lib/api/openMeteo.ts';
import { getAqiCategory } from '../lib/aqi.ts';
import { ProvenanceBadge } from './ProvenanceBadge.tsx';

interface CityBattleProps {
  initialCity: CityLocation;
  onSelectActiveCity: (city: CityLocation) => void;
}

export const CityBattle: React.FC<CityBattleProps> = ({
  initialCity,
  onSelectActiveCity,
}) => {
  const [selectedCities, setSelectedCities] = useState<CityLocation[]>([
    initialCity,
    PRESET_CITIES[1], // Mumbai
    PRESET_CITIES[3], // Bengaluru
  ]);

  const [cityDataMap, setCityDataMap] = useState<Record<string, AirQualityDataset>>({});
  const [loading, setLoading] = useState(false);
  const [leaderboardMode, setLeaderboardMode] = useState<'polluted' | 'cleanest'>('polluted');

  // Fetch comparison data for selected cities
  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      const results: Record<string, AirQualityDataset> = {};
      await Promise.all(
        selectedCities.map(async (c) => {
          try {
            const data = await fetchAirQualityData(c);
            results[c.name] = data;
          } catch {
            // Handled
          }
        })
      );
      if (isMounted) {
        setCityDataMap(results);
        setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [selectedCities]);

  // Compute lowest 7-day average for "Relatively better air"
  const bestCity = React.useMemo(() => {
    const list = Object.values(cityDataMap).filter((data) =>
      data.historicalHours.some((point) => point.us_aqi !== null)
    );
    if (list.length === 0) return null;

    let best = list[0];
    let lowestAvg = Infinity;

    list.forEach((d) => {
      const recent = d.historicalHours.slice(-168); // 7 days
      const valid = recent.map((r) => r.us_aqi).filter((v): v is number => v !== null);
      const avg = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : Infinity;
      if (avg < lowestAvg) {
        lowestAvg = avg;
        best = d;
      }
    });

    return { city: best.city, avg: Math.round(lowestAvg) };
  }, [cityDataMap]);

  // Dynamic Leaderboard of Preset Cities
  const sortedLeaderboard = React.useMemo(() => {
    const list = Object.values(cityDataMap);
    if (list.length === 0) return [];

    const items = list.flatMap((d) => {
      const aqi = d.current.us_aqi.value;
      return aqi === null
        ? []
        : [{
            city: d.city,
            aqi,
            pm25: d.current.pm2_5.value,
            category: getAqiCategory(aqi),
            kind: d.current.us_aqi.kind,
            source: d.current.us_aqi.source,
          }];
    });

    return items.sort((a, b) =>
      leaderboardMode === 'polluted' ? b.aqi - a.aqi : a.aqi - b.aqi
    );
  }, [cityDataMap, leaderboardMode]);

  // Toggle city selection (2-4 cities)
  const toggleCity = (city: CityLocation) => {
    const exists = selectedCities.some((c) => c.name === city.name);
    if (exists) {
      if (selectedCities.length > 2) {
        setSelectedCities(selectedCities.filter((c) => c.name !== city.name));
      }
    } else {
      if (selectedCities.length < 4) {
        setSelectedCities([...selectedCities, city]);
      } else {
        setSelectedCities([...selectedCities.slice(1), city]);
      }
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-5 relative overflow-hidden">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400 text-[20px]">
              swords
            </span>
            <h3 className="font-display font-bold text-lg sm:text-xl text-white">
              City Battle &amp; Pollution Leaderboard
            </h3>
            <ProvenanceBadge kind="station" size="sm" sourceNote="WAQI when nearby station data is available" />
            <ProvenanceBadge kind="modeled" size="sm" sourceNote="Open-Meteo CAMS fallback and pollutant values" />
          </div>
          <p className="text-xs text-[#bbcabf] mt-0.5">
            AQI uses WAQI station readings where available, otherwise CAMS estimates; pollutant concentrations and 7-day comparisons are modeled.
          </p>
        </div>

        {/* Leaderboard mode buttons */}
        <div className="flex items-center gap-1.5 bg-[#131b2e] p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setLeaderboardMode('polluted')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
              leaderboardMode === 'polluted'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'text-[#bbcabf] hover:text-white'
            }`}
          >
            🔴 Most Polluted
          </button>
          <button
            onClick={() => setLeaderboardMode('cleanest')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
              leaderboardMode === 'cleanest'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-[#bbcabf] hover:text-white'
            }`}
          >
            🟢 Cleanest Air
          </button>
        </div>
      </div>

      {/* City Pickers Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-mono">
        <span className="text-[#86948a] shrink-0 uppercase">Select 2–4 Cities:</span>
        {PRESET_CITIES.map((c) => {
          const isSelected = selectedCities.some((sc) => sc.name === c.name);
          return (
            <button
              key={c.name}
              onClick={() => toggleCity(c)}
              className={`px-2.5 py-1 rounded-full shrink-0 border transition-all ${
                isSelected
                  ? 'bg-emerald-500 text-[#003824] font-bold border-emerald-400 shadow-[0_0_12px_rgba(78,222,163,0.3)]'
                  : 'bg-[#171f33] text-[#bbcabf] border-white/5 hover:text-white'
              }`}
            >
              {isSelected ? `✓ ${c.name}` : `+ ${c.name}`}
            </button>
          );
        })}
      </div>

      {/* Highlight Recommendation Banner */}
      {bestCity && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <div>
              <span className="text-emerald-400 font-bold uppercase tracking-wider">
                Relatively Better Air: {bestCity.city.name}
              </span>
              <span className="text-[#dae2fd] ml-2">
                Lowest 7-day average AQI of <strong className="text-emerald-400">{bestCity.avg}</strong>.
              </span>
            </div>
          </div>
          <button
            onClick={() => onSelectActiveCity(bestCity.city)}
            className="px-2.5 py-1 rounded bg-emerald-500 text-[#003824] font-bold hover:bg-emerald-400 transition-colors"
          >
            Inspect
          </button>
        </div>
      )}

      {/* Head-to-Head Comparison Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#060e20]">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#131b2e] text-[#86948a] uppercase text-[10px] tracking-wider border-b border-white/10">
            <tr>
              <th className="p-3">Location</th>
              <th className="p-3">US AQI</th>
              <th className="p-3">PM2.5 (24h)</th>
              <th className="p-3">PM10 (24h)</th>
              <th className="p-3">NO₂</th>
              <th className="p-3">Ozone O₃</th>
              <th className="p-3">Cigarette-Equivalent Estimate</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {selectedCities.map((city) => {
              const d = cityDataMap[city.name];
              if (!d) {
                return (
                  <tr key={city.name} className="hover:bg-[#131b2e]/50">
                    <td className="p-3 font-bold text-white">{city.name}</td>
                    <td colSpan={7} className="p-3 text-[#86948a]">
                      Loading telemetry...
                    </td>
                  </tr>
                );
              }

              const aqi = d.current.us_aqi.value;
              const cat = getAqiCategory(aqi);

              return (
                <tr key={city.name} className="hover:bg-[#131b2e]/60 transition-colors">
                  <td className="p-3 font-bold text-white flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    ></span>
                    <span>{city.name}</span>
                  </td>
                  <td className="p-3 font-bold text-sm" style={{ color: cat.color }}>
                    {aqi ?? '—'} <span className="text-[10px] text-[#86948a]">({cat.label})</span>
                    <ProvenanceBadge
                      kind={d.current.us_aqi.kind}
                      size="sm"
                      sourceNote={d.current.us_aqi.source}
                    />
                  </td>
                  <td className="p-3 text-rose-300 font-bold">
                    {d.current.pm2_5.value ?? '—'} µg
                  </td>
                  <td className="p-3 text-purple-300">
                    {d.current.pm10.value ?? '—'} µg
                  </td>
                  <td className="p-3 text-emerald-300">
                    {d.current.nitrogen_dioxide.value ?? '—'} µg
                  </td>
                  <td className="p-3 text-amber-300">
                    {d.current.ozone.value ?? '—'} µg
                  </td>
                  <td className="p-3 text-rose-400 font-bold">
                    {d.current.cigaretteEquiv.value ?? '—'}
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => onSelectActiveCity(city)}
                      className="px-2 py-1 rounded bg-[#222a3d] hover:bg-[#2d3449] text-emerald-400 font-bold text-[10px] transition-colors"
                    >
                      Make Primary
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pollution Leaderboard Stream */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between text-xs font-mono text-[#86948a] uppercase">
          <span>Current AQI Leaderboard ({leaderboardMode}):</span>
          <span>WAQI station when available; otherwise Open-Meteo CAMS</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {sortedLeaderboard.slice(0, 4).map((item, idx) => (
            <div
              key={item.city.name}
              onClick={() => onSelectActiveCity(item.city)}
              className="p-3 rounded-xl bg-[#131b2e] border border-white/10 flex items-center justify-between cursor-pointer hover:border-white/20 transition-all text-xs font-mono"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-400 text-sm">#{idx + 1}</span>
                <div>
                  <span className="font-bold text-white block">{item.city.name}</span>
                  <span className="text-[10px] text-[#86948a]">{item.city.country}</span>
                  <ProvenanceBadge kind={item.kind} size="sm" sourceNote={item.source} />
                </div>
              </div>
              <span className="font-bold text-sm" style={{ color: item.category.color }}>
                {item.aqi} AQI
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
