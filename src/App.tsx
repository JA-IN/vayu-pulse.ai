/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertTriangle, Compass } from 'lucide-react';
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
import { CpcbStationCard } from './components/CpcbStationCard.tsx';
import { DisclosureAction } from './components/DisclosureAction.tsx';
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
  const [copilotOpen, setCopilotOpen] = useState<boolean>(false);

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
    <div className="min-h-screen bg-bg-base text-on-surface font-sans selection:bg-primary/20 selection:text-primary">
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
      <main className="mx-auto max-w-7xl space-y-6 px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        {dataset?.stationError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status">
            WAQI station AQI is unavailable: {dataset.stationError}. The dashboard labels the source of the AQI currently shown.
          </div>
        )}
        {/* Error Notification Bar with Retry */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-rose-800">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <div className="text-xs font-mono">
                <span className="font-bold">Data Request Warning: </span>
                <span>{error}</span>
              </div>
            </div>
            <button
              onClick={() => loadCityData(currentCity, true)}
              className="px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 border border-rose-300 text-rose-900 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
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
            <p className="animate-pulse text-sm text-slate-600">
              Loading air-quality data for {currentCity.name}…
            </p>
          </div>
        ) : dataset && (
          <>
            {/* SECTION 1: HERO OVERVIEW COMMAND (Requirement A, Section 5 Cube, Section 6 Biosphere) */}
            <HeroSection
              data={dataset}
              diwaliSmogMode={diwaliSmogMode}
            />

            {currentCity.country.toLowerCase() === 'india' && (
              <CpcbStationCard station={dataset.cpcbData} error={dataset.cpcbError} />
            )}

            <section className="data-card rounded-2xl p-4 sm:p-6">
              <div className="mb-4">
                <p className="section-eyebrow">Explore</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-100">Air quality map</h2>
                <p className="mt-1 text-sm text-slate-400">Browse modeled city points and nearby locations.</p>
              </div>
              <AirQualityMap
                currentCity={currentCity}
                onSelectCity={handleSelectCity}
                userLat={userCoords.lat}
                userLon={userCoords.lon}
              />
            </section>

            <details className="disclosure-card group">
              <summary>
                <span>
                  <span className="section-eyebrow">Trends</span>
                  <span className="mt-1 block text-base font-semibold text-slate-100">History &amp; forecast</span>
                  <span className="mt-1 block text-sm font-normal text-slate-400">Explore past readings, model projections, and outdoor windows.</span>
                </span>
                <DisclosureAction />
              </summary>
              <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
                <HistoricalTracker
                  historicalData={dataset.historicalHours}
                  cityName={currentCity.name}
                />
                <ForecastSection data={dataset} alertThreshold={150} />
              </div>
            </details>

            <details className="disclosure-card group">
              <summary>
                <span>
                  <span className="section-eyebrow">Compare</span>
                  <span className="mt-1 block text-base font-semibold text-slate-100">Compare cities</span>
                  <span className="mt-1 block text-sm font-normal text-slate-400">Compare available AQI and modeled pollutant values.</span>
                </span>
                <DisclosureAction />
              </summary>
              <CityBattle
                initialCity={currentCity}
                onSelectActiveCity={handleSelectCity}
              />
            </details>

            <details
              className="disclosure-card group"
              onToggle={(event) => setCopilotOpen(event.currentTarget.open)}
            >
              <summary>
                <span>
                  <span className="section-eyebrow">Guidance</span>
                  <span className="mt-1 block text-base font-semibold text-slate-100">Health guidance &amp; AI assistant</span>
                  <span className="mt-1 block text-sm font-normal text-slate-400">Personalized precautions and answers based on available data.</span>
                </span>
                <DisclosureAction />
              </summary>
              <div className="mt-5 space-y-5">
                <HealthSafetySection currentAqi={rawAqi} />
                {copilotOpen ? (
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
                    isOpen
                    onClose={() => setCopilotOpen(false)}
                  />
                ) : (
                  <button
                    onClick={() => setCopilotOpen(true)}
                    className="rounded-xl border border-indigo-300/20 bg-indigo-400/[0.08] px-4 py-3 text-sm font-medium text-indigo-200 transition hover:bg-indigo-400/[0.14]"
                  >
                    Open VayuAI assistant
                  </button>
                )}
              </div>
            </details>
          </>
        )}
      </main>

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
