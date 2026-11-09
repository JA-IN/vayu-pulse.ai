/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { CityLocation, PRESET_CITIES, fetchAirQualityData } from '../lib/api/openMeteo.ts';
import { getAqiCategory, calculateCigaretteEquivalence } from '../lib/aqi.ts';
import { ProvenanceBadge } from './ProvenanceBadge.tsx';

interface CityAqiMarker {
  city: CityLocation;
  aqi: number;
  category: ReturnType<typeof getAqiCategory>;
  pm25: number | null;
  pm10: number | null;
  observedAt: string | null;
  sourceKind: 'station' | 'modeled';
  source: string;
  coordinates: [number, number];
  isHotspot: boolean;
  hotspotRank: number | null; // 1, 2, 3 or null
  isCleanest: boolean;
  distanceKm?: number;
}

interface AirQualityMapProps {
  currentCity: CityLocation;
  onSelectCity: (city: CityLocation) => void;
  userLat?: number;
  userLon?: number;
}

// Haversine distance in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export const AirQualityMap: React.FC<AirQualityMapProps> = ({
  currentCity,
  onSelectCity,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const heatLayerRef = useRef<L.LayerGroup | null>(null);
  const vectorLayerRef = useRef<L.LayerGroup | null>(null);

  const [cityData, setCityData] = useState<CityAqiMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showCleanVector, setShowCleanVector] = useState(true);
  const [selectedMarker, setSelectedMarker] = useState<CityAqiMarker | null>(null);
  const [cleanestHaven, setCleanestHaven] = useState<CityAqiMarker | null>(null);
  const [top3Hotspots, setTop3Hotspots] = useState<CityAqiMarker[]>([]);

  // Fetch the best available AQI source for the selected location and preset cities.
  useEffect(() => {
    let isMounted = true;

    async function loadCities() {
      setLoading(true);
      try {
        const mapCities = Array.from(
          new Map(
            [currentCity, ...PRESET_CITIES].map((city) => [
              `${city.latitude.toFixed(3)},${city.longitude.toFixed(3)}`,
              city,
            ])
          ).values()
        );
        const results = await Promise.allSettled(
          mapCities.map(async (c) => {
            const res = await fetchAirQualityData(c);
            const aqi = res.current.us_aqi.value;
            if (aqi === null) return null;
            return {
              city: c,
              aqi,
              category: getAqiCategory(aqi),
              pm25: res.current.pm2_5.value,
              pm10: res.current.pm10.value,
              observedAt: res.current.us_aqi.observedAt,
              sourceKind: res.current.us_aqi.kind === 'station' ? 'station' as const : 'modeled' as const,
              source: res.current.us_aqi.source,
              coordinates: res.stationData?.coordinates ?? [c.latitude, c.longitude],
            };
          })
        );

        const markers: Array<Omit<CityAqiMarker, 'isHotspot' | 'hotspotRank' | 'isCleanest'>> = [];
        for (const r of results) {
          if (r.status === 'fulfilled' && r.value) {
            markers.push(r.value);
          }
        }

        if (!isMounted) return;

        // Rank by AQI to find top 3 hotspots and cleanest
        const sorted = [...markers].sort((a, b) => b.aqi - a.aqi);
        const top3 = sorted.slice(0, 3);
        const top3NamesMap = new Map<string, number>();
        top3.forEach((item, index) => {
          top3NamesMap.set(item.city.name, index + 1);
        });

        const currentPoint = markers.find(
          (m) => m.city.latitude === currentCity.latitude && m.city.longitude === currentCity.longitude
        );
        const cleanestItem = sorted.find(
          (m) => m.city.latitude !== currentCity.latitude || m.city.longitude !== currentCity.longitude
        );

        // Compute distance from current city
        const finalMarkers: CityAqiMarker[] = markers.map((m) => {
          const dist = calculateDistance(
            currentCity.latitude,
            currentCity.longitude,
            m.coordinates[0],
            m.coordinates[1]
          );
          const hotspotRank = top3NamesMap.get(m.city.name) ?? null;
          return {
            ...m,
            distanceKm: dist,
            isHotspot: hotspotRank !== null,
            hotspotRank,
            isCleanest: cleanestItem ? m.city.latitude === cleanestItem.city.latitude && m.city.longitude === cleanestItem.city.longitude : false,
          };
        });

        setCityData(finalMarkers);
        setTop3Hotspots(
          finalMarkers
            .filter((m) => m.hotspotRank !== null)
            .sort((a, b) => (a.hotspotRank ?? 0) - (b.hotspotRank ?? 0))
        );

        // Find nearest clean air sanctuary (<= 100 AQI, closest to user or absolute lowest)
        const nearbyClean = finalMarkers
          .filter((m) => m.distanceKm !== undefined && m.distanceKm <= 600 && m.aqi <= 100 && (m.city.latitude !== currentCity.latitude || m.city.longitude !== currentCity.longitude))
          .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))[0];

        setCleanestHaven(currentPoint && currentPoint.aqi > 100 ? nearbyClean ?? null : null);
      } catch {
        // Handled gracefully
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadCities();

    return () => {
      isMounted = false;
    };
  }, [currentCity.latitude, currentCity.longitude, currentCity.name]);

  // Initialize Leaflet Map instance
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center on current city
    const map = L.map(mapContainerRef.current, {
      center: [currentCity.latitude, currentCity.longitude],
      zoom: 4,
      minZoom: 2,
      maxZoom: 14,
      zoomControl: true,
      attributionControl: true,
    });

    // Dark Styled OpenStreetMap Tiles (100% reliable, no watermark/key required)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      className: 'map-tiles-dark',
    }).addTo(map);

    heatLayerRef.current = L.layerGroup().addTo(map);
    vectorLayerRef.current = L.layerGroup().addTo(map);
    markersGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update map view on currentCity change
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([currentCity.latitude, currentCity.longitude], 5, {
        duration: 1.2,
      });
    }
  }, [currentCity.latitude, currentCity.longitude]);

  // Render Markers, Hotspot Rings, Heatmap, and Clean Air Vector
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;

    markersGroupRef.current.clearLayers();
    if (heatLayerRef.current) heatLayerRef.current.clearLayers();
    if (vectorLayerRef.current) vectorLayerRef.current.clearLayers();
    if (cityData.length === 0) return;

    // 1. Render Interpolated Heatmap Layer (if enabled)
    if (showHeatmap && heatLayerRef.current) {
      cityData.forEach((item) => {
        // Multi-tier radial gradient diffusion to simulate continuous spatial interpolation
        const baseColor = item.category.color;

        // Outer soft halo
        const outerCircle = L.circle(item.coordinates, {
          radius: 360000, // 360km
          fillColor: baseColor,
          fillOpacity: 0.08,
          stroke: false,
        });

        // Mid intensity diffusion
        const midCircle = L.circle(item.coordinates, {
          radius: 200000, // 200km
          fillColor: baseColor,
          fillOpacity: 0.16,
          stroke: false,
        });

        // Core concentration
        const coreCircle = L.circle(item.coordinates, {
          radius: 90000, // 90km
          fillColor: baseColor,
          fillOpacity: 0.28,
          stroke: false,
        });

        heatLayerRef.current?.addLayer(outerCircle);
        heatLayerRef.current?.addLayer(midCircle);
        heatLayerRef.current?.addLayer(coreCircle);
      });
    }

    // 2. Render Clean Air Vector (Corridor line between currentCity and cleanestHaven)
    const currentPoint = cityData.find(
      (item) => item.city.latitude === currentCity.latitude && item.city.longitude === currentCity.longitude
    );
    if (showCleanVector && cleanestHaven && currentPoint && vectorLayerRef.current) {
      const lineCoords: [number, number][] = [
        currentPoint.coordinates,
        cleanestHaven.coordinates,
      ];

      const cleanVectorLine = L.polyline(lineCoords, {
        color: '#10B981',
        weight: 3,
        dashArray: '8, 8',
        opacity: 0.85,
        className: 'leaflet-clean-vector',
      });

      vectorLayerRef.current.addLayer(cleanVectorLine);

      // Add midpoint distance tag
      const midLat = (currentPoint.coordinates[0] + cleanestHaven.coordinates[0]) / 2;
      const midLon = (currentPoint.coordinates[1] + cleanestHaven.coordinates[1]) / 2;

      const deltaAqi = Math.max(0, currentPoint.aqi - cleanestHaven.aqi);
      const pctDrop = Math.round((deltaAqi / currentPoint.aqi) * 100);

      const vectorTagIcon = L.divIcon({
        html: `
          <div class="px-2 py-0.5 rounded-full bg-[#060e20]/90 border border-emerald-500/60 text-[10px] font-mono text-emerald-300 font-bold whitespace-nowrap shadow-xl" style="transform: translate(-50%, -50%);">
            ✈️ Cleaner Air Vector (${cleanestHaven.distanceKm} km • -${pctDrop}% AQI)
          </div>
        `,
        className: 'clean-vector-label',
        iconSize: [220, 24],
        iconAnchor: [110, 12],
      });

      const vectorTagMarker = L.marker([midLat, midLon], { icon: vectorTagIcon });
      vectorLayerRef.current.addLayer(vectorTagMarker);
    }

    // 3. Render Markers and Hotspot Rings
    cityData.forEach((item) => {
      const isSelected =
        item.city.name.toLowerCase() === currentCity.name.toLowerCase() ||
        (Math.abs(item.city.latitude - currentCity.latitude) < 0.1 &&
          Math.abs(item.city.longitude - currentCity.longitude) < 0.1);

      // Build Marker HTML with Hotspot Rings
      let ringsHtml = '';
      if (item.isHotspot && item.hotspotRank !== null) {
        // Distinctive pulsing radar rings for top 3 hotspots
        ringsHtml = `
          <div class="absolute -inset-4 rounded-full border-2 border-rose-500/80 hotspot-pulse-ring-1 pointer-events-none"></div>
          <div class="absolute -inset-8 rounded-full border border-rose-500/50 hotspot-pulse-ring-2 pointer-events-none"></div>
          <span class="absolute -top-3.5 -right-2 px-1 py-0.2 rounded text-[9px] font-mono font-black uppercase bg-rose-600 text-white shadow-lg border border-rose-300 z-10">
            🔥 #${item.hotspotRank} HOTSPOT
          </span>
        `;
      } else if (item.isCleanest) {
        ringsHtml = `
          <div class="absolute -inset-3 rounded-full border-2 border-emerald-400/80 animate-ping pointer-events-none"></div>
          <span class="absolute -top-3.5 -right-2 px-1.5 py-0.2 rounded text-[9px] font-mono font-black uppercase bg-emerald-500 text-black shadow-lg border border-emerald-300 z-10">
            🍃 CLEAN HAVEN
          </span>
        `;
      }

      const markerHtml = `
        <div class="relative group cursor-pointer" style="transform: translate(-50%, -50%);">
          ${ringsHtml}
          <div class="relative px-2.5 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 shadow-2xl transition-transform hover:scale-110 ${
            isSelected ? 'ring-2 ring-white scale-110' : ''
          }"
            style="background-color: ${item.category.color}; color: #000000;"
          >
            <span class="w-2 h-2 rounded-full ${item.isHotspot ? 'bg-rose-950 animate-pulse' : 'bg-black/40'}"></span>
            <span>${item.city.name}</span>
            <span class="px-1.5 py-0.2 bg-black/25 text-white rounded text-[10px] font-extrabold">${item.aqi}</span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-aqi-marker',
        iconSize: [140, 40],
        iconAnchor: [70, 20],
      });

      const marker = L.marker(item.coordinates, {
        icon: customIcon,
        zIndexOffset: item.isHotspot ? 500 : isSelected ? 400 : 100,
      });

      marker.on('click', () => {
        setSelectedMarker(item);
        onSelectCity(item.city);
      });

      markersGroupRef.current?.addLayer(marker);
    });
  }, [cityData, currentCity, showHeatmap, showCleanVector, cleanestHaven, onSelectCity]);

  // Handler to fly to and focus a hotspot
  const handleFlyToHotspot = (hotspot: CityAqiMarker) => {
    onSelectCity(hotspot.city);
    setSelectedMarker(hotspot);
    mapInstanceRef.current?.flyTo(hotspot.coordinates, 6, {
      duration: 1.2,
    });
  };

  // Handler to fit map bounds on clean air corridor
  const handleFitCorridor = () => {
    if (!mapInstanceRef.current || !cleanestHaven) return;
    const bounds = L.latLngBounds([
      [currentCity.latitude, currentCity.longitude],
      cleanestHaven.coordinates,
    ]);
    mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], duration: 1.2 });
  };

  // Calculate clean air delta
  const currentCityData = cityData.find(
    (c) => c.city.latitude === currentCity.latitude && c.city.longitude === currentCity.longitude
  );
  const currentCityAqi = currentCityData?.aqi ?? null;
  const currentCityPm25 = currentCityData?.pm25 ?? null;
  const pctCleaner =
    currentCityAqi !== null && cleanestHaven
      ? Math.max(0, Math.round(((currentCityAqi - cleanestHaven.aqi) / currentCityAqi) * 100))
      : null;
  const pm25Reduction =
    currentCityPm25 !== null && cleanestHaven?.pm25 !== null && cleanestHaven?.pm25 !== undefined
      ? Math.round((currentCityPm25 - cleanestHaven.pm25) * 10) / 10
      : null;
  const cigsEquivalent = pm25Reduction !== null && pm25Reduction > 0
    ? calculateCigaretteEquivalence(pm25Reduction)
    : null;

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-4 relative overflow-hidden">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400 text-[20px]">radar</span>
            <h3 className="font-display font-bold text-lg sm:text-xl text-white">
              Interactive Air Quality Map &amp; Geospatial Radar
            </h3>
            <ProvenanceBadge kind="station" size="sm" sourceNote="WAQI when nearby station data is available" />
            <ProvenanceBadge kind="modeled" size="sm" sourceNote="Open-Meteo CAMS fallback and pollutant values" />
          </div>
          <p className="text-xs text-[#bbcabf] mt-0.5">
            WAQI station AQI where available; otherwise Open-Meteo CAMS modeled AQI. Station markers use station coordinates; modeled markers use city coordinates. This is not a continuous neighborhood map.
          </p>
        </div>

        {/* Segmented Mode Controls (Pins, Heatmap, Clean Air Vector) */}
        <div className="flex items-center gap-1.5 bg-[#131b2e] p-1 rounded-xl border border-white/10">
          <button
            onClick={() => {
              setShowHeatmap(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
              !showHeatmap
                ? 'bg-emerald-500 text-[#003824] shadow-sm'
                : 'text-[#bbcabf] hover:text-white'
            }`}
          >
            🗺️ City AQI Points
          </button>
          <button
            onClick={() => {
              setShowHeatmap(true);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
              showHeatmap
                ? 'bg-emerald-500 text-[#003824] shadow-sm'
                : 'text-[#bbcabf] hover:text-white'
            }`}
          >
            <span>🔥 AQI Heatmap Display</span>
            {cityData.length > 0 && (
              <span className={`px-1 rounded text-[10px] ${showHeatmap ? 'bg-[#003824]/30 text-[#003824]' : 'bg-white/10 text-white'}`}>
                {cityData.length} pts
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setShowCleanVector(!showCleanVector);
              if (!showCleanVector) handleFitCorridor();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
              showCleanVector
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-[#bbcabf] hover:text-white'
            }`}
          >
            <span>🍃 Clean Air Vector</span>
          </button>
        </div>
      </div>

      {/* Top 3 Hotspot Quick Action Pills */}
      {top3Hotspots.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-[#060e20]/60 border border-white/5">
          <div className="flex items-center gap-1.5 text-xs font-mono text-[#dae2fd] mr-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            <span className="font-bold text-rose-400">Highest AQI Locations:</span>
          </div>
          {top3Hotspots.map((hotspot) => (
            <button
              key={hotspot.city.name}
              onClick={() => handleFlyToHotspot(hotspot)}
              className="px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 bg-[#171f33] border border-rose-500/30 text-rose-200 hover:bg-rose-500/20 hover:border-rose-400 transition-colors shadow-sm"
            >
              <span className="font-black text-rose-400">#{hotspot.hotspotRank}</span>
              <span className="font-semibold">{hotspot.city.name}</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-rose-500/30 text-rose-300">
                AQI {hotspot.aqi}
              </span>
            </button>
          ))}
          <span className="text-[11px] font-mono text-[#86948a] ml-auto hidden md:inline">
            Select a location to view its data
          </span>
        </div>
      )}

      {/* MANDATORY Heatmap Disclaimer & Interpolation Label */}
      {showHeatmap && (
        <div className="px-3.5 py-2 rounded-xl bg-[#171f33] border border-amber-500/40 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-amber-300 shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span>
              <strong>Illustrative AQI shading:</strong> Displayed around{' '}
              <strong className="text-white underline decoration-amber-400 underline-offset-2">
                {cityData.length} city points
              </strong>{' '}
              Illustrative radial shading around returned city points; it is not an IDW interpolation or a continuous sensor surface.
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-[#bbcabf]">Display radius: 360 km</span>
            <ProvenanceBadge kind="derived" size="sm" sourceNote="Illustrative radial shading from station and modeled points" />
          </div>
        </div>
      )}

      {/* Map Stage Container */}
      <div className="relative w-full h-[450px] rounded-xl overflow-hidden border border-white/10 bg-[#060e20]">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* On-Map Corner HUD Badge displaying city point count */}
        <div className="absolute top-3 left-14 z-20 pointer-events-none flex flex-col gap-1">
          <div className="px-2.5 py-1 rounded-md bg-[#060e20]/90 backdrop-blur-md border border-white/10 text-[10px] font-mono text-[#dae2fd] shadow-lg flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>MODELED CITY POINTS: <strong>{cityData.length}</strong></span>
          </div>
          {showHeatmap && (
            <div className="px-2.5 py-1 rounded-md bg-[#171f33]/90 backdrop-blur-md border border-amber-500/40 text-[10px] font-mono text-amber-300 shadow-lg flex items-center gap-1.5">
              <span>HEATMAP: <strong>RADIAL DISPLAY FROM {cityData.length} CITY POINTS</strong></span>
            </div>
          )}
        </div>

        {/* Chromatic AQI Legend on bottom-right of map */}
        <div className="absolute top-3 right-3 z-20 bg-[#060e20]/90 backdrop-blur-md border border-white/10 px-2.5 py-2 rounded-xl text-[10px] font-mono text-white shadow-xl hidden sm:flex flex-col gap-1.5">
          <div className="font-bold text-[#86948a] uppercase tracking-wider text-[9px]">AQI Severity Spectrum</div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
            <span>0–50 Good</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span>
            <span>51–100 Mod</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F97316]"></span>
            <span>101–150 Sens</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F43F5E]"></span>
            <span>151–200 Unhealthy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]"></span>
            <span>201+ Hazardous</span>
          </div>
        </div>

        {loading && (
          <div className="absolute inset-0 bg-[#060e20]/80 backdrop-blur-md flex items-center justify-center z-30">
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-sm">
              <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
              <span>Loading city AQI readings and modeled data...</span>
            </div>
          </div>
        )}

        {/* Clean Air Sanctuary Vector (Clean Air Finder Banner at bottom of map) */}
        {cleanestHaven && (
          <div className="absolute bottom-3 left-3 right-3 z-20 bg-[#0f172a]/95 backdrop-blur-xl border border-emerald-500/40 p-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40 shadow-lg shadow-emerald-500/10">
                <span className="material-symbols-outlined text-[24px]">explore</span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-mono uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1">
                    <span>Nearby Lower-AQI Location</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    {cleanestHaven.distanceKm} km away
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-400 text-black font-black">
                    {pctCleaner === null ? 'AQI COMPARISON UNAVAILABLE' : `${pctCleaner}% LOWER AQI`}
                  </span>
                </div>
                <p className="text-xs text-white mt-1 leading-relaxed">
                  Escaping from                   <strong>{currentCity.name}</strong> (AQI {currentCityAqi ?? '—'}) to{' '}
                  <strong className="text-emerald-300">{cleanestHaven.city.name}</strong> (AQI {cleanestHaven.aqi} • {cleanestHaven.category.label})
                  {pm25Reduction === null
                    ? '; PM2.5 comparison is unavailable.'
                    : pm25Reduction === 0
                      ? '; modeled PM2.5 is the same at both locations.'
                      : pm25Reduction > 0
                        ? <>; modeled PM2.5 is lower by <strong>{pm25Reduction} µg/m³</strong>, a concentration-based estimate of{' '}
                  <strong className="text-emerald-300">{cigsEquivalent} cigarette-equivalents/day</strong>.
                    </>
                        : <>; modeled PM2.5 is higher by <strong>{Math.abs(pm25Reduction)} µg/m³</strong> at the suggested location.</>
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
              <button
                onClick={handleFitCorridor}
                title="Fit map viewport to full escape corridor"
                className="px-3 py-1.5 rounded-lg bg-[#171f33] hover:bg-[#222a3d] border border-white/10 text-white font-mono text-xs transition-colors flex items-center gap-1"
              >
                <span>Corridor View 🔍</span>
              </button>
              <button
                onClick={() => onSelectCity(cleanestHaven.city)}
                className="flex-1 sm:flex-initial px-4 py-1.5 rounded-lg bg-emerald-500 text-[#003824] font-mono text-xs font-bold hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
              >
                Inspect {cleanestHaven.city.name} →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Selected City Detail Drawer / Inspector */}
      {selectedMarker && (
        <div className="p-4 rounded-xl bg-[#131b2e] border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span
              className="w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: selectedMarker.category.color }}
            ></span>
            <div>
              <span className="font-bold text-white text-sm">
                {selectedMarker.city.name}, {selectedMarker.city.country}
              </span>
              <span className="text-[#86948a] ml-2">
                AQI {selectedMarker.aqi} • {selectedMarker.category.label}
              </span>
              {selectedMarker.isHotspot && (
                <span className="ml-2 px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 text-[10px]">
                  🔥 #{selectedMarker.hotspotRank} HOTSPOT
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-[#bbcabf]">
            <span>PM2.5: <strong className="text-rose-300">{selectedMarker.pm25 ?? '—'} µg/m³</strong></span>
            <span>PM10: <strong className="text-purple-300">{selectedMarker.pm10 ?? '—'} µg/m³</strong></span>
            <ProvenanceBadge
              kind={selectedMarker.sourceKind}
              size="sm"
              sourceNote={selectedMarker.source}
            />
            <button
              onClick={() => setSelectedMarker(null)}
              className="text-[#86948a] hover:text-white px-2 py-1 rounded hover:bg-white/5"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
