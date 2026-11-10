/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Shield, Sparkles, ExternalLink, Heart, Globe, Activity } from 'lucide-react';
import { ProvenanceBadge } from './ProvenanceBadge.tsx';

interface FooterProps {
  onOpenAuditReport: () => void;
  onOpenStoryCard: () => void;
  onOpenSmartAlerts: () => void;
}

export function Footer({
  onOpenAuditReport,
  onOpenStoryCard,
  onOpenSmartAlerts,
}: FooterProps) {
  return (
    <footer className="border-t border-white/10 bg-surface-container-lowest/90 backdrop-blur-xl mt-16 text-muted font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Top Section: Brand + Mission */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-white/5">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
              <span className="font-display font-extrabold text-lg text-high-contrast tracking-tight">
                VayuPulse AI
              </span>
            </div>
            <p className="text-xs text-muted leading-relaxed max-w-md">
              WAQI station AQI where available, plus modeled air-quality estimates and forecasts. Built for the <strong className="text-primary font-medium">Lets Code Diwali Challenge 2026</strong> under the theme <span className="text-high-contrast font-semibold">BREATHE BETTER</span>.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <ProvenanceBadge kind="modeled" size="sm" />
              <ProvenanceBadge kind="ai" size="sm" />
            </div>
          </div>

          {/* Quick Tools */}
          <div>
            <div className="text-xs font-mono font-semibold uppercase tracking-wider text-high-contrast mb-3">
              Telemetry Tools
            </div>
            <ul className="space-y-2 text-xs font-mono">
              <li>
                <button
                  onClick={onOpenStoryCard}
                  className="hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <span>Story Card Studio (PNG)</span>
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenSmartAlerts}
                  className="hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <span>Smart AQI Alert Engine</span>
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenAuditReport}
                  className="hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <span>Compliance Audit Statement</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Methodology & Credits */}
          <div>
            <div className="text-xs font-mono font-semibold uppercase tracking-wider text-high-contrast mb-3">
              Scientific Foundation
            </div>
            <div className="text-xs space-y-1.5 text-slate-400">
              <p>• <strong className="text-slate-300">Air quality:</strong> <a className="underline" href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noreferrer">Open-Meteo Air Quality API</a> (CAMS model)</p>
              <p>• <strong className="text-slate-300">Station AQI:</strong> <a className="underline" href="https://aqicn.org/api/" target="_blank" rel="noreferrer">World Air Quality Index (WAQI) API</a> (where a nearby station is available)</p>
              <p>• <strong className="text-slate-300">India station pollutants:</strong> <a className="underline" href="https://www.data.gov.in/resource/real-time-air-quality-index-various-locations" target="_blank" rel="noreferrer">CPCB via data.gov.in</a> (concentrations, not AQI)</p>
              <p>• <strong className="text-slate-300">Weather:</strong> <a className="underline" href="https://open-meteo.com/en/docs" target="_blank" rel="noreferrer">Open-Meteo Forecast API</a></p>
              <p>• <strong className="text-slate-300">AI:</strong> <a className="underline" href="https://ai.google.dev/gemini-api/docs" target="_blank" rel="noreferrer">Google Gemini API</a></p>
              <p>• <strong className="text-slate-300">Health references:</strong> <a className="underline" href="https://www.who.int/publications/i/item/9789240034228" target="_blank" rel="noreferrer">WHO 2021 guidelines</a></p>
              <p>• <strong className="text-slate-300">Cigarette-equivalent method:</strong> <a className="underline" href="https://berkeleyearth.org/air-pollution-and-cigarette-equivalence/" target="_blank" rel="noreferrer">Berkeley Earth</a></p>
            </div>
          </div>
        </div>

        {/* Methodology explainer card */}
        <div className="my-8 p-4 rounded-xl bg-surface-container/40 border border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
          <div>
            <h4 className="font-display font-bold text-slate-200 mb-1 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span>Modeled Air Quality Data</span>
            </h4>
            <p className="text-slate-400">
              The current AQI uses a nearby WAQI station reading when available and otherwise falls back to Open-Meteo CAMS modeled output. For Indian cities, CPCB station pollutant concentrations are presented separately and are not AQI scores. History and forecasts use modeled estimates. Each AQI display identifies its source; station readings include their provider and time.
            </p>
          </div>
          <div>
            <h4 className="font-display font-bold text-slate-200 mb-1 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-secondary" />
              <span>Public Health Notice &amp; Disclaimer</span>
            </h4>
            <p className="text-slate-400">
              VayuPulse AI provides environmental information for situational awareness. It is not a replacement for official local advisories or medical advice.
            </p>
          </div>
        </div>

        {/* Bottom Bar with Telemetry line */}
        <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-3">
            <span>MODELED DATA: OPEN-METEO CAMS</span>
          </div>

          <div className="flex items-center gap-4">
            <span>MIT LICENSE</span>
            <span className="text-high-contrast">🪔 Diwali 2026</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
