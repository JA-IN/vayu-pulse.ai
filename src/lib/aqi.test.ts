import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAqiCategory,
  calculateCigaretteEquivalence,
  calculateWhoMultiple,
  convertCoToMg,
  calculatePercentageChange,
  detectAnomalySpike,
  findSafeOutdoorWindow,
  calculateAqiTrend,
} from './aqi.ts';

test('getAqiCategory returns correct categories and colors', () => {
  const good = getAqiCategory(35);
  assert.equal(good.label, 'Good');
  assert.equal(good.color, '#047857');

  const mod = getAqiCategory(80);
  assert.equal(mod.label, 'Moderate');

  const sensitive = getAqiCategory(120);
  assert.equal(sensitive.label, 'Unhealthy for Sensitive Groups');

  const unhealthy = getAqiCategory(184);
  assert.equal(unhealthy.label, 'Unhealthy');
  assert.equal(unhealthy.color, '#BE123C');

  const veryUnhealthy = getAqiCategory(240);
  assert.equal(veryUnhealthy.label, 'Very Unhealthy');

  const hazardous = getAqiCategory(380);
  assert.equal(hazardous.label, 'Hazardous');
});

test('AQI category text colors meet WCAG AA contrast on white', () => {
  const luminance = (hex: string) => {
    const channels = hex.match(/[0-9a-f]{2}/gi)!.map((channel) => {
      const value = Number.parseInt(channel, 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };

  for (const aqi of [25, 75, 125, 175, 250, 400, null]) {
    const category = getAqiCategory(aqi);
    for (const color of [category.color, category.textColor]) {
      const contrast = 1.05 / (luminance(color) + 0.05);
      assert.ok(contrast >= 4.5, `${category.label} text contrast is ${contrast.toFixed(2)}:1`);
    }
  }
});

test('calculateCigaretteEquivalence matches Berkeley Earth formula PM2.5 / 22', () => {
  assert.equal(calculateCigaretteEquivalence(22), 1.0);
  assert.equal(calculateCigaretteEquivalence(44), 2.0);
  assert.equal(calculateCigaretteEquivalence(92.4), 4.2);
  assert.equal(calculateCigaretteEquivalence(0), 0);
  assert.equal(calculateCigaretteEquivalence(null), null);
});

test('calculateWhoMultiple computes correct ratio for PM2.5 (15 ug) and PM10 (45 ug)', () => {
  assert.equal(calculateWhoMultiple('pm2_5', 90), 6.0);
  assert.equal(calculateWhoMultiple('pm2_5', 92.4), 6.2);
  assert.equal(calculateWhoMultiple('pm10', 168), 3.7);
  assert.equal(calculateWhoMultiple('unknown_pollutant', 100), null);
});

test('convertCoToMg converts ug/m3 to mg/m3', () => {
  assert.equal(convertCoToMg(1240), 1.24);
  assert.equal(convertCoToMg(500), 0.5);
  assert.equal(convertCoToMg(null), null);
});

test('calculatePercentageChange calculates relative differences correctly', () => {
  // (120 - 100) / 100 * 100 = +20%
  assert.equal(calculatePercentageChange(100, 120), 20.0);
  // (80 - 100) / 100 * 100 = -20%
  assert.equal(calculatePercentageChange(100, 80), -20.0);
});

test('detectAnomalySpike flags Z-Score >= 2.0 as an anomaly spike', () => {
  // Baseline mean = 100, stdDev ≈ 1.79
  const baseline = [100, 102, 98, 101, 99, 100, 103, 97, 101];
  const normalResult = detectAnomalySpike(102, baseline);
  assert.equal(normalResult.isSpike, false);

  // A spike value far above 2 standard deviations
  const spikeResult = detectAnomalySpike(260, baseline);
  assert.equal(spikeResult.isSpike, true);
  assert.ok(spikeResult.zScore >= 2.0);
});

test('findSafeOutdoorWindow identifies the longest consecutive run below threshold', () => {
  const forecast = [
    { time: '2026-11-08T10:00', aqi: 180 },
    { time: '2026-11-08T11:00', aqi: 160 },
    { time: '2026-11-08T12:00', aqi: 90 }, // Start safe run 1 (2 hrs)
    { time: '2026-11-08T13:00', aqi: 85 },
    { time: '2026-11-08T14:00', aqi: 170 },
    { time: '2026-11-08T15:00', aqi: 75 }, // Start safe run 2 (4 hrs)
    { time: '2026-11-08T16:00', aqi: 72 },
    { time: '2026-11-08T17:00', aqi: 68 },
    { time: '2026-11-08T18:00', aqi: 80 },
    { time: '2026-11-08T19:00', aqi: 210 },
  ];

  const result = findSafeOutdoorWindow(forecast, 100);
  assert.equal(result.found, true);
  assert.equal(result.durationHours, 4);
  assert.equal(result.startTime, '2026-11-08T15:00');
  assert.equal(result.endTime, '2026-11-08T18:00');
  assert.equal(result.minAqi, 68);
});

test('calculateAqiTrend calculates directional slope from recent values', () => {
  const improving = calculateAqiTrend([200, 180, 160, 130, 95]);
  assert.equal(improving.direction, 'improving');

  const deteriorating = calculateAqiTrend([60, 90, 120, 160, 210]);
  assert.equal(deteriorating.direction, 'deteriorating');
});
