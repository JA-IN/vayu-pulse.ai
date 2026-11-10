import React from 'react';
import { AlertTriangle, MapPin, Radio } from 'lucide-react';
import type { CpcbStationData } from '../lib/api/cpcb.ts';

interface CpcbStationCardProps {
  station: CpcbStationData | null;
  error: string | null;
}

const POLLUTANT_NAMES: Record<string, string> = {
  'PM2.5': 'PM2.5',
  PM10: 'PM10',
  NO2: 'Nitrogen dioxide',
  OZONE: 'Ozone',
  SO2: 'Sulphur dioxide',
  CO: 'Carbon monoxide',
  NH3: 'Ammonia',
};

function formatValue(value: number | null): string {
  return value === null ? '—' : new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
}

function formatTime(value: string | null): string {
  if (!value) return 'Timestamp unavailable';
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getHourlyEstimateCategory(value: number): { label: string; className: string } {
  if (value <= 50) return { label: 'Good', className: 'text-emerald-700' };
  if (value <= 100) return { label: 'Satisfactory', className: 'text-lime-800' };
  if (value <= 200) return { label: 'Moderately polluted', className: 'text-amber-800' };
  if (value <= 300) return { label: 'Poor', className: 'text-orange-800' };
  if (value <= 400) return { label: 'Very poor', className: 'text-rose-700' };
  return { label: 'Severe', className: 'text-red-700' };
}

export function CpcbStationCard({ station, error }: CpcbStationCardProps) {
  if (!station && !error) {
    return (
      <section className="data-card rounded-2xl p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100">CPCB station readings</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              No nearby CPCB station reading was found for this location. Some cities may not have a matching published station. The AQI above continues to use its separately identified source.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="data-card rounded-2xl p-5 sm:p-6" role="status">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-amber-50 p-2.5 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100">CPCB station data unavailable</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">{error}</p>
            <p className="mt-2 text-xs text-slate-500">
              The AQI above remains identified by its own source; it is not calculated from these CPCB records.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!station) return null;

  const ageMs = station.observedAt === null
    ? null
    : Date.now() - new Date(station.observedAt).getTime();
  const isRecent = ageMs !== null && ageMs >= 0 && ageMs <= 90 * 60 * 1000;

  return (
    <section className="data-card rounded-2xl p-5 sm:p-6" aria-labelledby="cpcb-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="cpcb-heading" className="text-base font-semibold text-slate-100">
                Nearby CPCB station
              </h2>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                station.observedAt === null
                  ? 'bg-slate-100 text-slate-700'
                  : isRecent
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'bg-amber-50 text-amber-800'
              }`}>
                {station.observedAt === null ? 'Timestamp unavailable' : isRecent ? 'Recent report' : 'Older report'}
              </span>
            </div>
            <p className="mt-1 font-medium text-slate-200">{station.station}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
              <span>{station.city}, {station.state}</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                About {station.distanceKm} km from selected location
              </span>
            </p>
            <p className="mt-1 text-xs text-slate-500">Reported {formatTime(station.observedAt)}</p>
          </div>
        </div>
        <a
          href="https://www.data.gov.in/resource/real-time-air-quality-index-various-locations"
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium text-blue-700 underline decoration-blue-300 underline-offset-4 hover:text-blue-900"
        >
          CPCB data via data.gov.in
        </a>
      </div>

      {station.hourlyPmEstimate && (() => {
        const category = getHourlyEstimateCategory(station.hourlyPmEstimate.value);
        return (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="text-sm font-semibold text-slate-100">Experimental hourly PM estimate</p>
              <span className={`text-sm font-semibold ${category.className}`}>
                {station.hourlyPmEstimate.value} · {category.label}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Higher available PM sub-index: {station.hourlyPmEstimate.dominantPollutant}
              {station.hourlyPmEstimate.pm25SubIndex !== null && ` · PM2.5 ${station.hourlyPmEstimate.pm25SubIndex}`}
              {station.hourlyPmEstimate.pm10SubIndex !== null && ` · PM10 ${station.hourlyPmEstimate.pm10SubIndex}`}
            </p>
            <p className="mt-2 text-xs leading-5 text-amber-900/80">
              This is an unofficial PM-only estimate from the reported hourly averages, not a CPCB AQI. The open-ended top-range interpolation uses app assumptions (PM2.5 250–500 and PM10 430–600 µg/m³). Official CPCB AQI needs the prescribed averaging periods and at least three eligible pollutants. The main AQI above remains separately sourced and is not replaced by this estimate.
            </p>
          </div>
        );
      })()}

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {station.pollutants.map((pollutant) => {
          const unit = pollutant.id === 'CO' ? 'mg/m³' : 'µg/m³';
          return (
            <div key={pollutant.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-400">
                {POLLUTANT_NAMES[pollutant.id] ?? pollutant.id}
              </p>
              <p className="mt-2 text-xl font-semibold tabular-nums text-slate-100">
                {formatValue(pollutant.average)}
              </p>
              <p className="text-[11px] text-slate-500">{unit} · hourly average</p>
            </div>
          );
        })}
      </div>

      <p className="mt-4 border-t border-white/[0.07] pt-3 text-xs leading-5 text-slate-500">
        CPCB pollutant concentrations are shown as reported and are not AQI values. The AQI above comes from its separately identified source. CPCB notes that live instrument data can contain abnormal values.
      </p>
    </section>
  );
}
