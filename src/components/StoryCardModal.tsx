/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { X, Download, Share2, Check, Sparkles, Instagram, Twitter, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { toPng } from 'html-to-image';
import { getAqiCategory, calculateCigaretteEquivalence } from '../lib/aqi.ts';

interface StoryCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  city: string;
  aqi: number | null;
  pm25: number | null;
  pm10: number | null;
  diwaliMode: boolean;
}

type AspectRatio = '9:16' | '1:1' | '16:9';

export function StoryCardModal({
  isOpen,
  onClose,
  city,
  aqi,
  pm25,
  pm10,
  diwaliMode,
}: StoryCardModalProps) {
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [isExporting, setIsExporting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const category = getAqiCategory(aqi);
  const cigarettes = calculateCigaretteEquivalence(pm25);

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2, // 2x high-res
      });
      const link = document.createElement('a');
      link.download = `VayuPulse-${city.replace(/\s+/g, '_')}-AQI${aqi}-${aspectRatio.replace(':', 'x')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export card image:', err);
      alert('Could not export image. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const shareText = `Current modeled air quality in ${city}: AQI ${aqi ?? 'unavailable'} (${category.label}), PM2.5 ${pm25 === null ? 'unavailable' : `${pm25.toFixed(1)} µg/m³`}, cigarette-equivalent estimate ${cigarettes === null ? 'unavailable' : `${cigarettes} per day`}. Source: Open-Meteo CAMS. #BreatheBetter #DiwaliAirQuality #AQI`;

  const handleShareTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(shareText);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-surface-container-low border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[92vh]">
        {/* Left Side: Controls & Options */}
        <div className="w-full md:w-80 p-6 border-b md:border-b-0 md:border-r border-white/10 flex flex-col justify-between bg-surface-container/60">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-primary" />
                <h3 className="font-display font-bold text-base text-high-contrast">Story Card Studio</h3>
              </div>
              <button
                onClick={onClose}
                className="md:hidden p-1.5 rounded-lg text-muted hover:text-high-contrast"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-muted leading-relaxed mb-6">
              Generate pixel-perfect, exportable social media telemetry cards for Instagram, Twitter, and WhatsApp.
            </p>

            {/* Aspect Ratio Switcher */}
            <div className="mb-6">
              <label className="text-[11px] font-mono font-semibold tracking-wider text-muted uppercase block mb-2">
                Format Dimensions
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setAspectRatio('9:16')}
                  className={`px-3 py-2 rounded-lg text-xs font-mono font-semibold border transition-all ${
                    aspectRatio === '9:16'
                      ? 'bg-primary/20 text-primary border-primary shadow-lg shadow-primary/10'
                      : 'bg-surface-container border-white/10 text-muted hover:text-high-contrast'
                  }`}
                >
                  9:16 Story
                </button>
                <button
                  onClick={() => setAspectRatio('1:1')}
                  className={`px-3 py-2 rounded-lg text-xs font-mono font-semibold border transition-all ${
                    aspectRatio === '1:1'
                      ? 'bg-primary/20 text-primary border-primary shadow-lg shadow-primary/10'
                      : 'bg-surface-container border-white/10 text-muted hover:text-high-contrast'
                  }`}
                >
                  1:1 Feed
                </button>
                <button
                  onClick={() => setAspectRatio('16:9')}
                  className={`px-3 py-2 rounded-lg text-xs font-mono font-semibold border transition-all ${
                    aspectRatio === '16:9'
                      ? 'bg-primary/20 text-primary border-primary shadow-lg shadow-primary/10'
                      : 'bg-surface-container border-white/10 text-muted hover:text-high-contrast'
                  }`}
                >
                  16:9 Banner
                </button>
              </div>
            </div>

            {/* Info Metrics */}
            <div className="p-3 rounded-lg bg-surface-container-lowest/80 border border-white/5 space-y-2 mb-6">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted">City:</span>
                <span className="text-high-contrast font-bold">{city}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted">AQI Category:</span>
                <span className="font-bold" style={{ color: category.color }}>{category.label}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted">Cigarette Burden:</span>
                <span className="text-rose-400 font-bold">{cigarettes === null ? 'Unavailable' : `${cigarettes} cigs/day (estimated)`}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={handleDownloadImage}
              disabled={isExporting}
              className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-surface-container-lowest font-display font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Generating PNG...' : `Download High-Res PNG (${aspectRatio})`}</span>
            </button>

            <button
              onClick={handleShareTwitter}
              className="w-full py-2 px-3 rounded-xl bg-surface-container-high border border-white/10 text-high-contrast hover:border-sky-400 hover:text-sky-300 text-xs font-mono flex items-center justify-center gap-2 transition-colors"
            >
              <Twitter className="w-3.5 h-3.5 text-sky-400" />
              <span>Post to X / Twitter</span>
            </button>

            <button
              onClick={handleCopySnippet}
              className="w-full py-2 px-3 rounded-xl bg-surface-container-high border border-white/10 text-high-contrast hover:border-white/20 text-xs font-mono flex items-center justify-center gap-2 transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-primary" /> : <Share2 className="w-3.5 h-3.5 text-muted" />}
              <span>{copiedLink ? 'Copied Telemetry Card Link' : 'Copy Shareable Text'}</span>
            </button>
          </div>
        </div>

        {/* Right Side: Visual Canvas Preview */}
        <div className="flex-1 p-6 flex flex-col items-center justify-center overflow-y-auto bg-surface-container-lowest/90 relative">
          <button
            onClick={onClose}
            className="hidden md:flex absolute top-4 right-4 p-2 rounded-lg text-muted hover:text-high-contrast hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Exportable Element Container */}
          <div
            ref={cardRef}
            className={`transition-all duration-300 shadow-2xl overflow-hidden relative border border-white/20 flex flex-col justify-between ${
              aspectRatio === '9:16'
                ? 'w-[320px] h-[568px] p-6 rounded-2xl'
                : aspectRatio === '1:1'
                ? 'w-[380px] h-[380px] p-6 rounded-2xl'
                : 'w-[520px] h-[292px] p-5 rounded-2xl'
            }`}
            style={{
              background: `radial-gradient(circle at 50% 10%, ${category.color}33 0%, #060e20 60%, #020617 100%)`,
            }}
          >
            {/* Header Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: category.color }}></span>
                <span className="font-display font-extrabold text-xs tracking-wider uppercase text-high-contrast">
                  VayuPulse AI
                </span>
                {diwaliMode && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    DIWALI THEME
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono text-muted">OPEN-METEO CAMS MODEL</span>
            </div>

            {/* Core AQI & City Readout */}
            <div className="my-auto text-center py-2">
              <p className="text-xs font-mono text-muted uppercase tracking-wider mb-1">
                Atmospheric Health Index
              </p>
              <h2 className="font-display font-extrabold text-xl text-high-contrast mb-2">
                {city}
              </h2>

              <div
                className="font-mono font-black text-6xl tracking-tight leading-none mb-2"
                style={{ color: category.color }}
              >
                {aqi ?? '—'}
              </div>

              <div
                className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border mb-3"
                style={{
                  backgroundColor: `${category.color}20`,
                  color: category.color,
                  borderColor: `${category.color}40`,
                }}
              >
                {category.label}
              </div>

              {/* Anthropomorphic emoji & description */}
              <div className="text-3xl mb-1">
                {aqi === null ? '❔' : aqi <= 50 ? '🌿' : aqi <= 100 ? '⛅' : aqi <= 150 ? '😷' : aqi <= 200 ? '🔥' : '☣️'}
              </div>

              {/* Berkeley Earth Cigarette equivalence banner */}
              <div className="mx-auto max-w-xs mt-2 p-2 rounded-lg bg-surface-container-high/60 border border-white/10 text-center">
                <span className="text-[11px] font-mono text-muted">Passive Inhalation Equivalent:</span>
                <p className="text-xs font-mono font-bold text-rose-400 mt-0.5">
                  🚬 {cigarettes === null ? 'Unavailable' : `${cigarettes} estimated / 24h`}
                </p>
              </div>
            </div>

            {/* Footer with Pollutant Matrix & Timestamp */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-muted">
              <div>
                <span>PM2.5: </span>
                <span className="text-high-contrast font-bold">{pm25 === null ? '—' : `${pm25.toFixed(1)} µg/m³`}</span>
                <span className="ml-2">PM10: </span>
                <span className="text-high-contrast font-bold">{pm10 === null ? '—' : `${pm10.toFixed(1)} µg/m³`}</span>
              </div>
              <span>Open-Meteo & CAMS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
