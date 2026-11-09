/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { CityLocation, PRESET_CITIES, searchCities } from '../lib/api/openMeteo.ts';
import { ProvenanceBadge } from './ProvenanceBadge.tsx';

interface TopBarProps {
  currentCity: CityLocation;
  onSelectCity: (city: CityLocation) => void;
  observedAt: string | null;
  isStale: boolean;
  hasStationData: boolean;
  diwaliSmogMode: boolean;
  onToggleDiwaliMode: () => void;
  onOpenAlerts: () => void;
  onOpenShareCard: () => void;
  onOpenAuditReport: () => void;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentCity,
  onSelectCity,
  observedAt,
  isStale,
  hasStationData,
  diwaliSmogMode,
  onToggleDiwaliMode,
  onOpenAlerts,
  onOpenShareCard,
  onOpenAuditReport,
  isRefreshing,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CityLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [geoLocating, setGeoLocating] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Cmd+K or Ctrl+K to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const input = document.getElementById('city-search-input');
        if (input) input.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced search query
  useEffect(() => {
    let isCurrentSearch = true;
    setSearchResults([]);
    setSearchError(null);
    setIsSearching(false);

    if (!searchQuery.trim() || searchQuery.length < 2) {
      setIsSearching(false);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setShowDropdown(true);
      try {
        const results = await searchCities(searchQuery);
        if (isCurrentSearch) setSearchResults(results);
      } catch {
        if (isCurrentSearch) {
          setSearchError('City search is unavailable. Check your connection and try again.');
        }
      } finally {
        if (isCurrentSearch) setIsSearching(false);
      }
    }, 280);

    return () => {
      isCurrentSearch = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // Geolocation detector
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLocating(false);
        onSelectCity({
          name: 'My Exact Location',
          country: 'Local Coordinates',
          latitude: Number(pos.coords.latitude.toFixed(4)),
          longitude: Number(pos.coords.longitude.toFixed(4)),
          elevation: pos.coords.altitude === null ? undefined : Math.round(pos.coords.altitude),
        });
      },
      () => {
        setGeoLocating(false);
        alert('Could not acquire your location. Using current city.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Format observation time safely
  const formatObservedTime = (iso: string | null): string => {
    if (!iso) return 'Pending update';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return iso;
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#060e20]/85 backdrop-blur-2xl border-b border-white/10 shadow-lg no-print">
      <div className="max-w-[1720px] mx-auto min-h-20 px-4 py-3 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Identity */}
        <div className="order-1 flex items-center gap-3 shrink-0">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500/20 via-emerald-400/10 to-transparent border border-emerald-500/30 shadow-[0_0_15px_rgba(78,222,163,0.25)]">
            <span className="material-symbols-outlined text-emerald-400 text-[22px]">air</span>
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-lg sm:text-xl text-white tracking-tight">
                VayuPulse AI
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-widest uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                BREATHE BETTER
              </span>
            </div>
            <span className="text-[11px] font-mono text-[#bbcabf] hidden md:inline">
              Atmospheric Intelligence • Lets Code Diwali 2026
            </span>
          </div>

          {/* Diwali Smog Mode Toggle */}
          <div className="hidden xl:flex items-center ml-2">
            <button
              onClick={onToggleDiwaliMode}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-semibold transition-all border ${
                diwaliSmogMode
                  ? 'bg-rose-950/40 border-rose-500/50 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                  : 'bg-[#171f33] border-white/10 text-[#bbcabf] hover:text-white'
              }`}
              title="Add a Diwali-themed label to exported story cards"
            >
              <span className="text-sm">🪔</span>
              <span className="uppercase tracking-wider">Diwali Card Theme</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                  diwaliSmogMode ? 'bg-rose-500 text-white' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {diwaliSmogMode ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        </div>

        {/* Center Search Bar with Geocoding */}
        <div ref={searchContainerRef} className="relative order-3 w-full md:order-2 md:w-auto md:flex-1 md:max-w-xl md:mx-2">
          <div className="relative flex items-center w-full bg-[#131b2e] border border-white/10 rounded-xl px-3 py-2 text-sm text-[#dae2fd] focus-within:border-emerald-400 focus-within:shadow-[0_0_16px_rgba(78,222,163,0.2)] transition-all">
            <span className="material-symbols-outlined text-[#86948a] text-[18px] mr-2">search</span>
            <input
              id="city-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim().length >= 2) setShowDropdown(true);
              }}
              placeholder="Search global cities or monitoring zones..."
              className="w-full bg-transparent focus:outline-none placeholder:text-[#86948a] text-sm font-sans"
            />
            {isSearching && (
              <span className="material-symbols-outlined text-emerald-400 text-[18px] animate-spin mr-2">
                progress_activity
              </span>
            )}
            <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono text-[#86948a] bg-[#222a3d] border border-white/10 rounded">
              ⌘K
            </kbd>
          </div>

          {/* Autocomplete Search Dropdown */}
          {showDropdown && (isSearching || searchError || searchResults.length > 0 || searchQuery.trim().length >= 2) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#0f172a]/95 backdrop-blur-2xl border border-white/15 rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="p-2 border-b border-white/10 text-[10px] font-mono uppercase text-[#86948a]">
                Open-Meteo Geocoding Results
              </div>
              <div className="max-h-60 overflow-y-auto">
                {searchError ? (
                  <p role="status" className="px-3 py-3 text-xs text-rose-300">{searchError}</p>
                ) : isSearching ? (
                  <p role="status" className="px-3 py-3 text-xs text-[#bbcabf]">Searching cities...</p>
                ) : searchResults.length === 0 ? (
                  <p role="status" className="px-3 py-3 text-xs text-[#bbcabf]">No matching cities found.</p>
                ) : null}
                {searchResults.map((city, idx) => (
                  <button
                    key={`${city.name}-${city.latitude}-${idx}`}
                    onClick={() => {
                      onSelectCity(city);
                      setSearchQuery('');
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-[#222a3d] flex items-center justify-between text-sm transition-colors border-b border-white/5 last:border-b-0"
                  >
                    <div>
                      <span className="font-semibold text-white">{city.name}</span>
                      <span className="text-xs text-[#86948a] ml-2">
                        {city.admin1 ? `${city.admin1}, ` : ''}
                        {city.country}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-emerald-400">
                      {city.latitude.toFixed(2)}°, {city.longitude.toFixed(2)}°
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Action Tools & Status */}
        <div className="order-2 ml-auto flex items-center gap-2 sm:gap-3 shrink-0 md:order-3">
          {/* Detect Location button */}
          <button
            onClick={handleDetectLocation}
            disabled={geoLocating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#171f33] hover:bg-[#222a3d] border border-white/10 text-emerald-400 text-xs font-mono font-medium transition-colors"
            title="Locate via device GPS"
          >
            <span
              className={`material-symbols-outlined text-[16px] ${
                geoLocating ? 'animate-spin' : ''
              }`}
            >
              near_me
            </span>
            <span className="hidden sm:inline">Detect Air</span>
          </button>

          {/* Data Status Pill */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#131b2e] border border-white/10 text-xs font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                !observedAt ? 'bg-slate-500' : isStale ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
            ></span>
            <ProvenanceBadge kind={hasStationData ? 'station' : 'modeled'} stale={isStale} />
            <span className="text-[#86948a] border-l border-white/10 pl-2">
              {formatObservedTime(observedAt)}
            </span>
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="hover:text-emerald-400 text-[#86948a] transition-colors ml-1"
              title="Refresh telemetry"
            >
              <span
                className={`material-symbols-outlined text-[15px] ${
                  isRefreshing ? 'animate-spin' : ''
                }`}
              >
                refresh
              </span>
            </button>
          </div>

          {/* Smart Alerts Trigger */}
          <button
            onClick={onOpenAlerts}
            className="relative p-2 rounded-lg bg-[#171f33] hover:bg-[#222a3d] border border-white/10 text-[#dae2fd] transition-colors"
            title="Configure Smart AQI Threshold Alerts"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          </button>

          {/* Story Card Modal Trigger */}
          <button
            onClick={onOpenShareCard}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#171f33] hover:bg-[#222a3d] border border-white/10 text-[#dae2fd] text-xs font-medium transition-colors"
            title="Export Social Media Story Cards (9:16 / 1:1 / 16:9)"
          >
            <span className="material-symbols-outlined text-[16px] text-purple-300">ios_share</span>
            <span className="hidden sm:inline">Share Card</span>
          </button>

          {/* Audit Report Trigger */}
          <button
            onClick={onOpenAuditReport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-semibold transition-all"
            title="View & Print Official Environmental Audit Report"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            <span className="hidden md:inline">Audit Report</span>
          </button>
        </div>
      </div>

      {/* Quick City Presets Strip */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-2 border-t border-white/5 flex items-center justify-between text-xs overflow-x-auto scrollbar-none gap-3">
        <div className="flex items-center gap-2 shrink-0 text-[#86948a] font-mono text-[11px] uppercase">
          <span className="material-symbols-outlined text-[14px] text-emerald-400">explore</span>
          <span>Quick Monitoring Zones:</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {PRESET_CITIES.slice(0, 8).map((city) => {
            const isSelected =
              currentCity.name.toLowerCase() === city.name.toLowerCase() ||
              (Math.abs(currentCity.latitude - city.latitude) < 0.1 &&
                Math.abs(currentCity.longitude - city.longitude) < 0.1);
            return (
              <button
                key={city.name}
                onClick={() => onSelectCity(city)}
                className={`px-2.5 py-1 rounded-full text-xs font-mono transition-all shrink-0 ${
                  isSelected
                    ? 'bg-emerald-500 text-[#003824] font-bold shadow-[0_0_12px_rgba(78,222,163,0.3)]'
                    : 'bg-[#131b2e] hover:bg-[#222a3d] text-[#bbcabf] border border-white/5'
                }`}
              >
                {city.name}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
