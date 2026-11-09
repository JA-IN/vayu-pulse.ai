/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AqiCategory {
  min: number;
  max: number;
  label: string;
  color: string;
  bgTint: string;
  textColor: string;
  severity: 'good' | 'moderate' | 'sensitive' | 'unhealthy' | 'very_unhealthy' | 'hazardous' | 'unavailable';
  summary: string;
  generalPrecautions: string;
  outdoorAdvice: string;
}

export const US_AQI_CATEGORIES: AqiCategory[] = [
  {
    min: 0,
    max: 50,
    label: 'Good',
    color: '#10B981',
    bgTint: 'rgba(16, 185, 129, 0.15)',
    textColor: '#10B981',
    severity: 'good',
    summary: 'Air quality is satisfactory and poses little or no risk.',
    generalPrecautions: 'Ideal conditions for all outdoor activities. No special action needed.',
    outdoorAdvice: 'Enjoy outdoor workouts, sports, and ventilation without restrictions.',
  },
  {
    min: 51,
    max: 100,
    label: 'Moderate',
    color: '#F59E0B',
    bgTint: 'rgba(245, 158, 11, 0.15)',
    textColor: '#F59E0B',
    severity: 'moderate',
    summary: 'Acceptable air quality; moderate health concern for a very small number of individuals.',
    generalPrecautions: 'Unusually sensitive people should consider reducing prolonged outdoor exertion.',
    outdoorAdvice: 'Generally safe. If prone to respiratory irritation, take regular rest breaks.',
  },
  {
    min: 101,
    max: 150,
    label: 'Unhealthy for Sensitive Groups',
    color: '#F97316',
    bgTint: 'rgba(249, 115, 22, 0.15)',
    textColor: '#F97316',
    severity: 'sensitive',
    summary: 'Members of sensitive groups may experience health effects; general public unlikely to be affected.',
    generalPrecautions: 'Children, older adults, and people with heart or lung disease should limit outdoor exertion.',
    outdoorAdvice: 'Athletes should reduce workout duration and move intense workouts indoors.',
  },
  {
    min: 151,
    max: 200,
    label: 'Unhealthy',
    color: '#F43F5E',
    bgTint: 'rgba(244, 63, 94, 0.15)',
    textColor: '#F43F5E',
    severity: 'unhealthy',
    summary: 'Everyone may begin to experience health effects; sensitive groups may experience more serious effects.',
    generalPrecautions: 'Active children and adults, and people with respiratory illness, should avoid prolonged outdoor exertion.',
    outdoorAdvice: 'Wear N95/FFP2 respirators if venturing outdoors. Switch gym sessions to filtered indoor spaces.',
  },
  {
    min: 201,
    max: 300,
    label: 'Very Unhealthy',
    color: '#A855F7',
    bgTint: 'rgba(168, 85, 247, 0.18)',
    textColor: '#A855F7',
    severity: 'very_unhealthy',
    summary: 'Health alert: risk of health effects increased for everyone.',
    generalPrecautions: 'Strictly avoid outdoor exertion. Keep windows sealed and run HEPA air filtration at home.',
    outdoorAdvice: 'Cancel all outdoor sports. High risk of bronchial inflammation and cardiovascular stress.',
  },
  {
    min: 301,
    max: 500,
    label: 'Hazardous',
    color: '#8B5CF6',
    bgTint: 'rgba(139, 92, 246, 0.25)',
    textColor: '#C084FC',
    severity: 'hazardous',
    summary: 'Health warning of emergency conditions. The entire population is more likely to be affected.',
    generalPrecautions: 'Emergency smog lock. Remain indoors in filtered spaces. Seek immediate medical attention if experiencing chest tightness.',
    outdoorAdvice: 'Absolute prohibition on outdoor activities. High particulate density causes acute cellular injury.',
  },
];

export const UNKNOWN_AQI_CATEGORY: AqiCategory = {
  min: 0,
  max: 0,
  label: 'Unavailable',
  color: '#86948a',
  bgTint: 'rgba(134, 148, 138, 0.15)',
  textColor: '#bbcabf',
  severity: 'unavailable',
  summary: 'An AQI reading is not available.',
  generalPrecautions: 'Check again when a current AQI reading is available.',
  outdoorAdvice: 'No activity advice can be based on a missing AQI reading.',
};

/**
 * Get category by US AQI index (0-500+)
 */
export function getAqiCategory(aqi: number | null): AqiCategory {
  if (aqi === null || isNaN(aqi)) {
    return UNKNOWN_AQI_CATEGORY;
  }
  const clamped = Math.max(0, Math.round(aqi));
  if (clamped >= 301) return US_AQI_CATEGORIES[5];
  for (const cat of US_AQI_CATEGORIES) {
    if (clamped >= cat.min && clamped <= cat.max) {
      return cat;
    }
  }
  return US_AQI_CATEGORIES[5];
}

/**
 * Health Math: Cigarette Equivalence (Berkeley Earth standard)
 * 1 cigarette per day ≈ 22 µg/m³ PM2.5 in 24 hours.
 * Rounded to 1 decimal place.
 */
export function calculateCigaretteEquivalence(pm25: number | null): number | null {
  if (pm25 === null || isNaN(pm25)) return null;
  if (pm25 <= 0) return 0;
  const cigs = pm25 / 22;
  return Math.round(cigs * 10) / 10;
}

/**
 * WHO 2021 24-hour guidelines:
 * PM2.5 = 15 µg/m³
 * PM10 = 45 µg/m³
 * NO2 = 25 µg/m³
 * SO2 = 40 µg/m³
 * O3 = 100 µg/m³ (8h)
 * CO = 4 mg/m³
 */
export const WHO_GUIDELINES: Record<string, { value: number; unit: string }> = {
  pm2_5: { value: 15, unit: 'µg/m³' },
  pm10: { value: 45, unit: 'µg/m³' },
  nitrogen_dioxide: { value: 25, unit: 'µg/m³' },
  sulphur_dioxide: { value: 40, unit: 'µg/m³' },
  ozone: { value: 100, unit: 'µg/m³' },
  carbon_monoxide: { value: 4.0, unit: 'mg/m³' },
};

/**
 * Calculate ratio against WHO guideline (e.g. 6.1x WHO guideline)
 */
export function calculateWhoMultiple(pollutantKey: string, value: number | null): number | null {
  if (value === null || isNaN(value)) return null;
  const guide = WHO_GUIDELINES[pollutantKey];
  if (!guide || guide.value <= 0) return null;
  const multiple = value / guide.value;
  return Math.round(multiple * 10) / 10;
}

/**
 * Convert Open-Meteo carbon monoxide in µg/m³ to mg/m³
 */
export function convertCoToMg(ugVal: number | null): number | null {
  if (ugVal === null || isNaN(ugVal)) return null;
  return Math.round((ugVal / 1000) * 100) / 100;
}

/**
 * Calculate percentage increase or decrease: (B - A) / A * 100
 */
export function calculatePercentageChange(a: number | null, b: number | null): number | null {
  if (a === null || b === null || isNaN(a) || isNaN(b) || a === 0) return null;
  const pct = ((b - a) / Math.abs(a)) * 100;
  return Math.round(pct * 10) / 10;
}

/**
 * Compute Z-Score for an observation against a baseline array.
 * Spike threshold: zScore >= 2.0
 */
export interface AnomalyResult {
  isSpike: boolean;
  zScore: number;
  mean: number;
  stdDev: number;
}

export function detectAnomalySpike(current: number, baseline: number[]): AnomalyResult {
  const valid = baseline.filter((v) => typeof v === 'number' && !isNaN(v));
  if (valid.length < 5) {
    return { isSpike: false, zScore: 0, mean: current, stdDev: 0 };
  }
  const mean = valid.reduce((sum, v) => sum + v, 0) / valid.length;
  const variance =
    valid.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / valid.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    return { isSpike: false, zScore: 0, mean, stdDev: 0 };
  }

  const zScore = (current - mean) / stdDev;
  const roundedZ = Math.round(zScore * 100) / 100;
  return {
    isSpike: roundedZ >= 2.0,
    zScore: roundedZ,
    mean: Math.round(mean * 10) / 10,
    stdDev: Math.round(stdDev * 10) / 10,
  };
}

/**
 * Safe Outdoor Window:
 * Finds the longest consecutive run of forecast hours where AQI <= threshold.
 */
export interface SafeWindow {
  startIndex: number;
  endIndex: number;
  durationHours: number;
  startTime: string;
  endTime: string;
  minAqi: number;
  avgAqi: number;
  found: boolean;
}

export function findSafeOutdoorWindow(
  hourlyAqi: Array<{ time: string; aqi: number | null }>,
  threshold: number = 150
): SafeWindow {
  let bestStart = -1;
  let bestEnd = -1;
  let maxDuration = 0;

  let currentStart = -1;

  for (let i = 0; i < hourlyAqi.length; i++) {
    const val = hourlyAqi[i].aqi;
    const isSafe = val !== null && val <= threshold;

    if (isSafe) {
      if (currentStart === -1) {
        currentStart = i;
      }
      const dur = i - currentStart + 1;
      if (dur > maxDuration) {
        maxDuration = dur;
        bestStart = currentStart;
        bestEnd = i;
      }
    } else {
      currentStart = -1;
    }
  }

  if (maxDuration > 0 && bestStart !== -1 && bestEnd !== -1) {
    const windowSlice = hourlyAqi.slice(bestStart, bestEnd + 1);
    const validVals = windowSlice.map((s) => s.aqi).filter((v): v is number => v !== null);
    const minAqi = validVals.length ? Math.min(...validVals) : 0;
    const avgAqi = validVals.length
      ? Math.round(validVals.reduce((a, b) => a + b, 0) / validVals.length)
      : 0;

    return {
      startIndex: bestStart,
      endIndex: bestEnd,
      durationHours: maxDuration,
      startTime: hourlyAqi[bestStart].time,
      endTime: hourlyAqi[bestEnd].time,
      minAqi,
      avgAqi,
      found: true,
    };
  }

  return {
    startIndex: 0,
    endIndex: 0,
    durationHours: 0,
    startTime: '',
    endTime: '',
    minAqi: 0,
    avgAqi: 0,
    found: false,
  };
}

/**
 * Stale check: returns true if the ISO observation timestamp is > 30 minutes old
 */
export function isDataStale(observedAt: string | null): boolean {
  if (!observedAt) return true;
  const time = new Date(observedAt).getTime();
  if (isNaN(time)) return true;
  const diffMinutes = (Date.now() - time) / (1000 * 60);
  return diffMinutes > 30;
}

/**
 * Moving-average statistical trend
 */
export function calculateAqiTrend(recentValues: number[]): {
  direction: 'improving' | 'deteriorating' | 'stable';
  slope: number;
  label: string;
} {
  const vals = recentValues.filter((v) => typeof v === 'number' && !isNaN(v));
  if (vals.length < 3) {
    return { direction: 'stable', slope: 0, label: 'Stable' };
  }
  // Linear regression slope over indices 0..n-1
  const n = vals.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += vals[i];
    sumXY += i * vals[i];
    sumXX += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const roundedSlope = Math.round(slope * 100) / 100;

  if (roundedSlope < -1.5) {
    return { direction: 'improving', slope: roundedSlope, label: 'Improving (Clearing Trend)' };
  } else if (roundedSlope > 1.5) {
    return { direction: 'deteriorating', slope: roundedSlope, label: 'Deteriorating (Smog Accumulating)' };
  } else {
    return { direction: 'stable', slope: roundedSlope, label: 'Stable (Equilibrium)' };
  }
}
