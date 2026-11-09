/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Bell, ShieldAlert, CheckCircle2, Volume2, Sparkles, Clock, AlertTriangle, Send } from 'lucide-react';
import { getAqiCategory } from '../lib/aqi.ts';

interface SmartAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAqi: number | null;
  currentCity: string;
}

export function SmartAlertsModal({
  isOpen,
  onClose,
  currentAqi,
  currentCity,
}: SmartAlertsModalProps) {
  const [threshold, setThreshold] = useState<number>(() => {
    const saved = localStorage.getItem('vayupulse_alert_threshold');
    return saved ? parseInt(saved, 10) : 150;
  });
  const [browserPushEnabled, setBrowserPushEnabled] = useState<boolean>(() => {
    return localStorage.getItem('vayupulse_browser_push') === 'true';
  });
  const [morningBriefing, setMorningBriefing] = useState<boolean>(() => {
    return localStorage.getItem('vayupulse_morning_briefing') !== 'false';
  });
  const [anomalySpikeTrigger, setAnomalySpikeTrigger] = useState<boolean>(() => {
    return localStorage.getItem('vayupulse_anomaly_spikes') !== 'false';
  });
  const [personaProtocol, setPersonaProtocol] = useState<boolean>(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [testAlertSent, setTestAlertSent] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const targetCategory = getAqiCategory(threshold);

  const requestBrowserPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      setBrowserPushEnabled(true);
    }
  };

  const handleSendTestAlert = () => {
    setTestAlertSent(true);
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🚨 VayuPulse Smart Alert Simulator', {
        body: `This is a test notification for ${currentCity}. Current reported AQI: ${currentAqi ?? 'unavailable'}; configured threshold: ${threshold}.`,
        icon: '/favicon.ico',
      });
    }
    setTimeout(() => setTestAlertSent(false), 3000);
  };

  const handleSave = () => {
    localStorage.setItem('vayupulse_alert_threshold', threshold.toString());
    localStorage.setItem('vayupulse_browser_push', browserPushEnabled.toString());
    localStorage.setItem('vayupulse_morning_briefing', morningBriefing.toString());
    localStorage.setItem('vayupulse_anomaly_spikes', anomalySpikeTrigger.toString());

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-surface-container-low border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-white/10 bg-surface-container/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-base text-high-contrast">
                  Smart Threshold Engine
                </h3>
              </div>
              <p className="text-xs text-muted">
                Configure notification preferences and test browser notifications
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-high-contrast hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Threshold Slider */}
          <div className="p-4 rounded-xl bg-surface-container-lowest border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase text-muted tracking-wider">
                Configured Threshold
              </span>
              <span
                className="text-xs font-mono font-bold px-2 py-0.5 rounded border"
                style={{
                  color: targetCategory.color,
                  backgroundColor: `${targetCategory.color}15`,
                  borderColor: `${targetCategory.color}35`,
                }}
              >
                AQI &gt; {threshold} ({targetCategory.label})
              </span>
            </div>

            <input
              type="range"
              min="30"
              max="350"
              step="10"
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value, 10))}
              className="w-full accent-primary h-2 bg-surface-container-high rounded-lg cursor-pointer"
            />

            <div className="flex justify-between text-[10px] font-mono text-muted mt-2">
              <span>50 Good</span>
              <span>100 Mod</span>
              <span>150 Unhealthy</span>
              <span>200 Very Unhealthy</span>
              <span>300+ Hazardous</span>
            </div>
          </div>

          {/* Dispatch Channels & Heuristics */}
          <div className="space-y-3">
            <div className="text-[11px] font-mono uppercase tracking-wider text-muted font-semibold">
              Notification Preferences
            </div>

            {/* Browser push */}
            <div className="p-3.5 rounded-xl bg-surface-container border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-primary" />
                <div>
                  <div className="text-xs font-semibold text-high-contrast">
                    Browser Push Notifications
                  </div>
                  <div className="text-[11px] text-muted">
                    Permission and preference only; no background AQI monitoring is active
                  </div>
                </div>
              </div>
              {notificationPermission !== 'granted' ? (
                <button
                  onClick={requestBrowserPermission}
                  className="px-2.5 py-1 text-xs font-mono rounded bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30"
                >
                  Enable
                </button>
              ) : (
                <input
                  type="checkbox"
                  checked={browserPushEnabled}
                  onChange={(e) => setBrowserPushEnabled(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
              )}
            </div>

            {/* Morning Briefing */}
            <div className="p-3.5 rounded-xl bg-surface-container border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-xs font-semibold text-high-contrast">
                    7:00 AM Morning Air Briefing
                  </div>
                  <div className="text-[11px] text-muted">
                    Predictive 12-hour dispersion forecast before commute
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={morningBriefing}
                onChange={(e) => setMorningBriefing(e.target.checked)}
                className="w-4 h-4 accent-primary rounded cursor-pointer"
              />
            </div>

            {/* Z-score Anomaly Trigger */}
            <div className="p-3.5 rounded-xl bg-surface-container border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <div>
                  <div className="text-xs font-semibold text-high-contrast">
                    Z-Score Anomaly Spike Trigger
                  </div>
                  <div className="text-[11px] text-muted">
                    Alert when sudden thermal inversion causes rapid +40 AQI jumps
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={anomalySpikeTrigger}
                onChange={(e) => setAnomalySpikeTrigger(e.target.checked)}
                className="w-4 h-4 accent-primary rounded cursor-pointer"
              />
            </div>

            {/* Persona Warnings */}
            <div className="p-3.5 rounded-xl bg-surface-container border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-4 h-4 text-secondary" />
                <div>
                  <div className="text-xs font-semibold text-high-contrast">
                    Persona-Specific Warning Protocol
                  </div>
                  <div className="text-[11px] text-muted">
                    Active profile: Outdoor Runner &amp; Asthmatic Care
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={personaProtocol}
                onChange={(e) => setPersonaProtocol(e.target.checked)}
                className="w-4 h-4 accent-primary rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Test Alert Simulator */}
          {testAlertSent && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 flex items-center gap-2 text-xs font-mono text-primary animate-fadeIn">
              <CheckCircle2 className="w-4 h-4" />
              <span>Simulated push alert broadcasted to notifications engine!</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-white/10 bg-surface-container/80 flex items-center justify-between gap-3">
          <button
            onClick={handleSendTestAlert}
            className="px-3 py-2 rounded-xl bg-surface-container-high border border-white/10 text-high-contrast hover:border-white/20 text-xs font-mono flex items-center gap-1.5 transition-colors"
          >
            <Send className="w-3.5 h-3.5 text-muted" />
            <span>Send Test Alert</span>
          </button>

          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-surface-container-lowest font-display font-bold text-xs flex items-center gap-2 shadow-lg shadow-primary/20 transition-all"
          >
            {saveSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Saved!</span>
              </>
            ) : (
              <span>Save Protocols</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
