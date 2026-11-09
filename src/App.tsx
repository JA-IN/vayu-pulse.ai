/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertTriangle, Compass, Bot } from 'lucide-react';
import { TopBar } from './components/TopBar.tsx';
import { HeroSection } from './components/HeroSection.tsx';
import { AirQualityMap } from './components/AirQualityMap.tsx';
import { HistoricalTracker } from './components/HistoricalTracker.tsx';
import { ForecastSection } from './components/ForecastSection.tsx';
import { CityBattle } from './components/CityBattle.tsx';
import { HealthSafetySection } from './components/HealthSafetySection.tsx';
import { VayuCopilot } from './components/VayuCopilot.tsx';
import { StoryCardModal } from './components/StoryCardModal.tsx';
import { SmartAlertsModal } from './components/SmartAlertsModal.tsx';
import { AuditReportModal } from './components/AuditReportModal.tsx';
import { Footer } from './components/Footer.tsx';
import {
  CityLocation,
  PRESET_CITIES,
  fetchAirQualityData,
  AirQualityDataset,
} from './lib/api/openMeteo.ts';

export default function App() {
  const [currentCity, setCurrentCity] = useState<CityLocation>(PRESET_CITIES[0]); // New Delhi
  const [diwaliSmogMode, setDiwaliSmogMode] = useState<boolean>(true); // default engaged for Diwali Challenge

  // Telemetry data
  const [dataset, setDataset] = useState<AirQualityDataset | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [storyModalOpen, setStoryModalOpen] = useState<boolean>(false);
  const [alertsModalOpen, setAlertsModalOpen] = useState<boolean>(false);
  const [auditModalOpen, setAuditModalOpen] = useState<boolean>(false);
  const [copilotOpen, setCopilotOpen] = useState<boolean>(true);

  // User detected coordinates (if geolocation active)
  const [userCoords, setUserCoords] = useState<{ lat?: number; lon?: number }>({});

  const loadCityData = useCallback(async (city: CityLocation, isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const data = await fetchAirQualityData(city, isManualRefresh);
      setDataset(data);
    } catch (err: any) {
      console.error('Failed to load air quality dataset:', err);
      setError(err?.message || 'Atmospheric telemetry mesh currently unavailable. Please retry.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCityData(currentCity);
  }, [currentCity, loadCityData]);

  const handleSelectCity = (city: CityLocation) => {
    setCurrentCity(city);
  };

  const handleRefresh = () => {
    loadCityData(currentCity, true);
  };

  // Safe window formatting
  const safeWindowLabel = dataset?.safeWindow?.found
    ? `${dataset.safeWindow.startTime.slice(11, 16)} - ${dataset.safeWindow.endTime.slice(11, 16)} (AQI ~${dataset.safeWindow.avgAqi})`
    : dataset?.forecastHours.some((point) => point.us_aqi !== null)
      ? 'No forecast window below AQI 150 in the next 72 hours'
      : 'Forecast AQI unavailable';

  const rawAqi = dataset?.current.us_aqi.value ?? null;
  const pm25 = dataset?.current.pm2_5.value ?? null;
  const pm10 = dataset?.current.pm10.value ?? null;
  const no2 = dataset?.current.nitrogen_dioxide.value ?? null;
  const so2 = dataset?.current.sulphur_dioxide.value ?? null;
  const co = dataset?.current.carbon_monoxide.value ?? null;
  const o3 = dataset?.current.ozone.value ?? null;

  return (
    <div className="min-h-screen bg-surface-container-lowest text-slate-100 font-sans selection:bg-primary/30 selection:text-primary">
      {/* Sticky Top Navigation & Search */}
      <TopBar
        currentCity={currentCity}
        onSelectCity={handleSelectCity}
        observedAt={dataset?.observedAt || null}
        isStale={dataset?.isStale || false}
        hasStationData={Boolean(dataset?.stationData)}
        diwaliSmogMode={diwaliSmogMode}
        onToggleDiwaliMode={() => setDiwaliSmogMode(!diwaliSmogMode)}
        onOpenAlerts={() => setAlertsModalOpen(true)}
        onOpenShareCard={() => setStoryModalOpen(true)}
        onOpenAuditReport={() => setAuditModalOpen(true)}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12 space-y-10">
        {dataset?.stationError && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-mono">
            WAQI station data is unavailable ({dataset.stationError}). Showing the Open-Meteo CAMS modeled AQI instead.
          </div>
        )}
        {/* Error Notification Bar with Retry */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-rose-300">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <div className="text-xs font-mono">
                <span className="font-bold">Data Request Warning: </span>
                <span>{error}</span>
              </div>
            </div>
            <button
              onClick={() => loadCityData(currentCity, true)}
              className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Connection</span>
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && !dataset ? (
          <div className="py-28 flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
              <Compass className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-sm font-mono text-muted animate-pulse">
              Calibrating ECMWF &amp; CAMS Atmospheric Telemetry for {currentCity.name}...
            </p>
          </div>
        ) : dataset && (
          <>
            {/* SECTION 1: HERO OVERVIEW COMMAND (Requirement A, Section 5 Cube, Section 6 Biosphere) */}
            <HeroSection
              data={dataset}
              diwaliSmogMode={diwaliSmogMode}
            />

            {/* SECTION 2: INTERACTIVE GEOSPATIAL RADAR & CLEAN AIR VECTOR (Requirement B) */}
            <AirQualityMap
              currentCity={currentCity}
              onSelectCity={handleSelectCity}
              userLat={userCoords.lat}
              userLon={userCoords.lon}
            />

            {/* SECTION 3: 2-COLUMN GRID (Historical Dispersion + 72-Hour Prognostics) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Requirement C: Historical Pollution Tracker & 2-Date Comparison */}
              <HistoricalTracker
                historicalData={dataset.historicalHours}
                cityName={currentCity.name}
              />

              {/* Requirement F: 72-Hour Prognostics & Safe Outdoor Window */}
              <ForecastSection
                data={dataset}
                alertThreshold={150}
              />
            </div>

            {/* SECTION 4: 2-COLUMN GRID (Multi-City Battle + Persona Protocol Engine) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Requirement D: Comparative City Analytics & Global Leaderboard */}
              <CityBattle
                initialCity={currentCity}
                onSelectActiveCity={handleSelectCity}
              />

              {/* Requirement E: Physiological Countermeasures & Persona Health Engine */}
              <HealthSafetySection
                currentAqi={rawAqi}
              />
            </div>

            {/* SECTION 5: AI AQI COPILOT (Bonus feature) */}
            <div id="vayu-copilot-section" className="pt-4">
              <VayuCopilot
                currentCity={currentCity.name}
                country={currentCity.country}
                coordinates={{ lat: currentCity.latitude, lon: currentCity.longitude }}
                aqi={rawAqi}
                pm25={pm25}
                pm10={pm10}
                no2={no2}
                so2={so2}
                co={co}
                o3={o3}
                windSpeed={dataset.wind.speed}
                windDirection={dataset.wind.direction}
                humidity={dataset.wind.humidity}
                observedAt={dataset.observedAt}
                isStale={dataset.isStale}
                source={dataset.source}
                safeWindow={safeWindowLabel}
                isOpen={copilotOpen}
                onClose={() => setCopilotOpen(false)}
              />
            </div>
          </>
        )}
      </main>

      {/* Floating Action Pill if Copilot is minimized */}
      {!copilotOpen && (
        <button
          onClick={() => setCopilotOpen(true)}
          className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-full bg-primary text-surface-container-lowest font-display font-bold text-xs flex items-center gap-2 shadow-2xl hover:scale-105 transition-transform"
        >
          <Bot className="w-4 h-4 animate-bounce" />
          <span>Ask VayuAI Copilot</span>
        </button>
      )}

      {/* FOOTER */}
      <Footer
        onOpenAuditReport={() => setAuditModalOpen(true)}
        onOpenStoryCard={() => setStoryModalOpen(true)}
        onOpenSmartAlerts={() => setAlertsModalOpen(true)}
      />

      {/* MODALS */}
      {dataset && (
        <>
          <StoryCardModal
            isOpen={storyModalOpen}
            onClose={() => setStoryModalOpen(false)}
            city={currentCity.name}
            aqi={rawAqi}
            pm25={pm25}
            pm10={pm10}
            diwaliMode={diwaliSmogMode}
          />

          <SmartAlertsModal
            isOpen={alertsModalOpen}
            onClose={() => setAlertsModalOpen(false)}
            currentAqi={rawAqi}
            currentCity={currentCity.name}
          />

          <AuditReportModal
            isOpen={auditModalOpen}
            onClose={() => setAuditModalOpen(false)}
            city={currentCity.name}
            coords={{ lat: currentCity.latitude, lng: currentCity.longitude }}
            aqi={rawAqi}
            pm25={pm25}
            pm10={pm10}
            no2={no2}
            so2={so2}
            co={co}
            o3={o3}
            observedAt={dataset.observedAt}
          />
        </>
      )}
    </div>
  );
}
