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
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 shadow-[0_8px_24px_-20px_rgba(23,32,51,0.5)] backdrop-blur-2xl no-print">
      <div className="max-w-[1720px] mx-auto min-h-20 px-4 py-3 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Identity */}
        <div className="order-1 flex items-center gap-3 shrink-0">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500/15 via-teal-400/10 to-white border border-blue-500/20 shadow-[0_8px_18px_-12px_rgba(37,99,235,0.6)]">
            <span className="material-symbols-outlined text-blue-600 text-[22px]">air</span>
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-500 opacity-50"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-600"></span>
            </span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-lg sm:text-xl text-slate-900 tracking-tight">
                VayuPulse AI
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-widest uppercase bg-teal-50 text-teal-800 border border-teal-200">
                BREATHE BETTER
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-500 hidden md:inline">
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
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
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
          <div className="relative flex items-center w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 shadow-sm focus-within:border-blue-400 focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.12)] transition-all">
            <span className="material-symbols-outlined text-slate-400 text-[18px] mr-2">search</span>
            <input
              id="city-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim().length >= 2) setShowDropdown(true);
              }}
              placeholder="Search global cities or monitoring zones..."
              className="w-full bg-transparent focus:outline-none placeholder:text-slate-400 text-sm font-sans"
            />
            {isSearching && (
              <span className="material-symbols-outlined text-blue-600 text-[18px] animate-spin mr-2">
                progress_activity
              </span>
            )}
            <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-200 rounded">
              ⌘K
            </kbd>
          </div>

          {/* Autocomplete Search Dropdown */}
          {showDropdown && (isSearching || searchError || searchResults.length > 0 || searchQuery.trim().length >= 2) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-2xl border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
              <div className="p-2 border-b border-slate-100 text-[10px] font-mono uppercase text-slate-500">
                Open-Meteo Geocoding Results
              </div>
              <div className="max-h-60 overflow-y-auto">
                {searchError ? (
                  <p role="status" className="px-3 py-3 text-xs text-rose-300">{searchError}</p>
                ) : isSearching ? (
                  <p role="status" className="px-3 py-3 text-xs text-slate-600">Searching cities...</p>
                ) : searchResults.length === 0 ? (
                  <p role="status" className="px-3 py-3 text-xs text-slate-600">No matching cities found.</p>
                ) : null}
                {searchResults.map((city, idx) => (
                  <button
                    key={`${city.name}-${city.latitude}-${idx}`}
                    onClick={() => {
                      onSelectCity(city);
                      setSearchQuery('');
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-blue-50 flex items-center justify-between text-sm transition-colors border-b border-slate-100 last:border-b-0"
                  >
                    <div>
                      <span className="font-semibold text-slate-900">{city.name}</span>
                      <span className="text-xs text-slate-500 ml-2">
                        {city.admin1 ? `${city.admin1}, ` : ''}
                        {city.country}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-teal-700">
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
            className="flex min-h-10 items-center gap-2 px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 text-[10px] sm:text-xs font-mono font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            title="Check current location using your device GPS"
            aria-label="Check current location using your device GPS"
          >
            <span className="relative flex shrink-0">
              <span
                className={`material-symbols-outlined text-[18px] ${
                  geoLocating ? 'animate-spin' : ''
                }`}
              >
                near_me
              </span>
              {!geoLocating && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-teal-500 ring-2 ring-white" />
              )}
            </span>
            <span className="max-w-[76px] text-left leading-tight">
              {geoLocating
                ? 'Finding location…'
                : currentCity.name === 'My Exact Location'
                  ? 'Location active'
                  : 'Check current location'}
            </span>
          </button>

          {/* Data Status Pill */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono shadow-sm">
            <span
              className={`w-2 h-2 rounded-full ${
                !observedAt ? 'bg-slate-500' : isStale ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
            ></span>
            <ProvenanceBadge kind={hasStationData ? 'station' : 'modeled'} stale={isStale} />
            <span className="text-slate-500 border-l border-slate-200 pl-2">
              {formatObservedTime(observedAt)}
            </span>
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="hover:text-blue-600 text-slate-500 transition-colors ml-1"
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
            className="relative p-2 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 text-slate-700 transition-colors"
            title="Configure Smart AQI Threshold Alerts"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          </button>

          {/* Story Card Modal Trigger */}
          <button
            onClick={onOpenShareCard}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 text-slate-700 text-xs font-medium transition-colors"
            title="Export Social Media Story Cards (9:16 / 1:1 / 16:9)"
          >
            <span className="material-symbols-outlined text-[16px] text-blue-600">ios_share</span>
            <span className="hidden sm:inline">Share Card</span>
          </button>

          {/* Audit Report Trigger */}
          <button
            onClick={onOpenAuditReport}
            className="button-gradient flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-semibold transition-all shadow-sm"
            title="View & Print Official Environmental Audit Report"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            <span className="hidden md:inline">Audit Report</span>
          </button>
        </div>
      </div>

      {/* Quick City Presets Strip */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-2 border-t border-slate-100 flex items-center justify-between text-xs overflow-x-auto scrollbar-none gap-3">
        <div className="flex items-center gap-2 shrink-0 text-slate-500 font-mono text-[11px] uppercase">
          <span className="material-symbols-outlined text-[14px] text-teal-700">explore</span>
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
                    ? 'bg-gradient-to-r from-blue-600 to-teal-700 text-white font-bold shadow-[0_6px_14px_-8px_rgba(37,99,235,0.7)]'
                    : 'bg-slate-50 hover:bg-blue-50 text-slate-600 border border-slate-200'
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
