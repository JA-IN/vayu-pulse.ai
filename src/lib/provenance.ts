/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DataKind =
  | 'station'
  | 'modeled'
  | 'forecast'
  | 'historical'
  | 'derived'
  | 'guidance'
  | 'ai';

export interface Reading<T> {
  value: T | null;
  unit: string;
  kind: DataKind;
  source: string;
  observedAt: string | null;
  stale?: boolean;
}

export interface ProvenanceBadgeConfig {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  borderDashed?: boolean;
  icon?: string;
  description: string;
}

export const PROVENANCE_BADGES: Record<DataKind, ProvenanceBadgeConfig> = {
  station: {
    label: 'LIVE STATION',
    bgColor: 'bg-emerald-500/15',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    description: 'Ground-station physical sensor measurement (WAQI / CPCB)',
  },
  modeled: {
    label: 'MODELED',
    bgColor: 'bg-cyan-500/15',
    textColor: 'text-cyan-300',
    borderColor: 'border-cyan-500/30',
    description: 'Open-Meteo & Copernicus Atmospheric Service (CAMS) model output',
  },
  forecast: {
    label: 'FORECAST',
    bgColor: 'bg-amber-500/15',
    textColor: 'text-amber-300',
    borderColor: 'border-amber-400/50',
    borderDashed: true,
    description: 'Predictive atmospheric dispersion forecast',
  },
  historical: {
    label: 'HISTORICAL',
    bgColor: 'bg-violet-500/15',
    textColor: 'text-violet-300',
    borderColor: 'border-violet-500/30',
    description: 'Archived past atmospheric observation records',
  },
  derived: {
    label: 'DERIVED',
    bgColor: 'bg-slate-500/15',
    textColor: 'text-slate-300',
    borderColor: 'border-slate-500/30',
    description: 'Mathematical computation (Berkeley Earth cigarette equiv, Z-score, % change)',
  },
  guidance: {
    label: 'GUIDANCE',
    bgColor: 'bg-blue-500/15',
    textColor: 'text-blue-300',
    borderColor: 'border-blue-500/30',
    description: 'Public health advisory based on WHO / EPA guidelines',
  },
  ai: {
    label: 'AI-GENERATED',
    bgColor: 'bg-pink-500/15',
    textColor: 'text-pink-300',
    borderColor: 'border-pink-500/30',
    description: 'Synthesized via Google Gemini 2.5 Flash from verified telemetry',
  },
};
