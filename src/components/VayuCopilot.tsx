/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Bot, Mic, MicOff, Send, Volume2, VolumeX, Sparkles, RefreshCw, X, MessageSquareQuote } from 'lucide-react';
import { ProvenanceBadge } from './ProvenanceBadge.tsx';
import { askVayuCopilot, fetchAiInsights, LiveContextPayload } from '../lib/api/gemini.ts';
import { getAqiCategory, calculateCigaretteEquivalence } from '../lib/aqi.ts';

interface VayuCopilotProps {
  currentCity: string;
  country: string;
  coordinates: { lat: number; lon: number };
  aqi: number | null;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  so2: number | null;
  co: number | null;
  o3: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  humidity: number | null;
  observedAt: string | null;
  isStale: boolean;
  source: string;
  safeWindow: string | null;
  isOpen?: boolean;
  onClose?: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export function VayuCopilot({
  currentCity,
  country,
  coordinates,
  aqi,
  pm25,
  pm10,
  no2,
  so2,
  co,
  o3,
  windSpeed,
  windDirection,
  humidity,
  observedAt,
  isStale,
  source,
  safeWindow,
  isOpen = true,
  onClose,
}: VayuCopilotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      sender: 'assistant',
      text: `Greetings. I am VayuAI Atmospheric Copilot. Current reported AQI in ${currentCity}: ${aqi ?? 'unavailable'}; PM2.5: ${pm25 === null ? 'unavailable' : `${pm25.toFixed(1)} µg/m³`}. ${source}. Ask me about the available readings or general air-quality guidance.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const getLiveContext = (): LiveContextPayload => {
    const category = getAqiCategory(aqi);
    return {
      city: currentCity,
      country,
      coordinates,
      aqi,
      category: category.label,
      pm2_5: pm25,
      pm10,
      no2,
      so2,
      o3,
      co,
      cigaretteEquiv: calculateCigaretteEquivalence(pm25),
      whoPm25Multiple: pm25 === null ? null : Math.round((pm25 / 15) * 10) / 10,
      windSpeed,
      windDirection,
      humidity,
      observedAt,
      isStale,
      source,
      forecastSummary: safeWindow,
      safeWindow,
    };
  };

  // Initialize Speech Recognition if supported
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        handleSend(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [currentCity, aqi, pm25]);

  // Fetch initial 3 AI Insights
  useEffect(() => {
    let mounted = true;
    const fetchInsights = async () => {
      setInsightsLoading(true);
      try {
        const ctx = getLiveContext();
        const insights = await fetchAiInsights(ctx);
        if (mounted && insights.length > 0) {
          setAiInsights(insights);
        }
      } catch (err) {
        console.warn('AI insights non-critical error:', err);
      } finally {
        if (mounted) setInsightsLoading(false);
      }
    };
    fetchInsights();
    return () => {
      mounted = false;
    };
  }, [currentCity, aqi]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const speakText = (text: string) => {
    if (!ttsEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleToggleMic = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please type your query.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error('Speech recognition error:', e);
      }
    }
  };

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const ctx = getLiveContext();
      const history = messages.map((m) => ({ sender: m.sender, text: m.text }));
      const reply = await askVayuCopilot(textToSend, ctx, history);

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      speakText(reply);
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: `Telemetry Copilot connection interrupted: ${err?.message || 'Unable to connect to AI engine'}. Please try again.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickChips = [
    `Can I jog in ${currentCity} at 6 PM?`,
    'Why is PM2.5 spiking so high?',
    'When is the safest time to ventilate?',
    'N95 vs surgical mask recommendation',
  ];

  if (!isOpen) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-surface-container-lowest/90 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col h-[580px]">
      {/* Copilot Header */}
      <div className="p-4 border-b border-white/10 bg-surface-container/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <Bot className="w-5 h-5 animate-pulse" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-surface-container-lowest"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-semibold text-sm text-high-contrast">VayuAI Copilot</h3>
              <ProvenanceBadge kind="ai" size="sm" />
            </div>
            <p className="text-[11px] font-mono text-muted">ECMWF Atmospheric Dispersion & Gemini 2.5 Flash</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            title={ttsEnabled ? 'Mute Voice Synth' : 'Enable Voice Synth'}
            className={`p-1.5 rounded-md text-xs border transition-colors ${
              ttsEnabled
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-surface-container-high text-muted border-white/5 hover:text-high-contrast'
            }`}
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-muted hover:text-high-contrast hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* AI Automated Insights Bar */}
      {aiInsights.length > 0 && (
        <div className="px-4 py-2.5 bg-secondary/5 border-b border-secondary/15 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
          <div className="flex-1 overflow-hidden">
            <div className="text-[10px] font-mono tracking-wider uppercase text-secondary font-semibold mb-0.5">
              AI-Generated Insights
            </div>
            <div className="space-y-1">
              {aiInsights.slice(0, 3).map((insight, idx) => (
                <div key={idx} className="text-xs text-high-contrast/90 flex items-center gap-1.5 truncate">
                  <span className="w-1 h-1 rounded-full bg-secondary shrink-0"></span>
                  <span className="truncate">{insight}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Audio Waveform Status indicator when mic active */}
      {isListening && (
        <div className="px-4 py-2 bg-primary/10 border-b border-primary/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            <span className="text-xs font-mono text-primary font-semibold">MICROPHONE ACTIVE • SPEECH RECOGNITION</span>
          </div>
          <div className="flex items-center gap-1">
            {[14, 24, 18, 28, 20, 16, 26, 12].map((height, i) => (
              <span
                key={i}
                className="w-1 bg-primary rounded-full animate-bounce"
                style={{ height: `${height}px`, animationDelay: `${i * 80}ms` }}
              ></span>
            ))}
          </div>
          <span className="text-[11px] font-mono text-muted">Listening for atmospheric query...</span>
        </div>
      )}

      {/* Chat Messages Body */}
      <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-3.5 scrollbar-thin">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-primary/20 text-high-contrast border border-primary/30 rounded-tr-none'
                  : 'bg-surface-container-high/70 text-high-contrast border border-white/10 rounded-tl-none'
              }`}
            >
              {msg.sender === 'assistant' && (
                <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-mono text-primary">
                  <Sparkles className="w-3 h-3" />
                  <span>VAYU PULSE COGNITION</span>
                </div>
              )}
              <div className="whitespace-pre-line">{msg.text}</div>
            </div>
            <span className="text-[10px] font-mono text-slate-500 mt-1 px-1">{msg.timestamp}</span>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs font-mono text-primary bg-primary/5 p-3 rounded-lg border border-primary/20 w-fit">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Consulting atmospheric dispersion tensors...</span>
          </div>
        )}
      </div>

      {/* Suggested Prompt Chips */}
      <div className="px-3 py-2 border-t border-white/5 bg-surface-container-lowest/50 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip)}
            className="text-[11px] font-mono whitespace-nowrap px-2.5 py-1 rounded-md bg-surface-container border border-white/10 text-muted hover:text-high-contrast hover:border-primary/40 hover:bg-primary/10 transition-colors shrink-0"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Field & Voice Controls */}
      <div className="p-3 border-t border-white/10 bg-surface-container/70 flex items-center gap-2">
        <button
          onClick={handleToggleMic}
          className={`p-2.5 rounded-lg border transition-all ${
            isListening
              ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-lg shadow-rose-500/20'
              : 'bg-surface-container-high text-muted border-white/10 hover:text-primary hover:border-primary/30'
          }`}
          title={isListening ? 'Stop listening' : 'Speak to Copilot (Web Speech)'}
        >
          {isListening ? <MicOff className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={`Ask VayuAI: "Should I open windows in ${currentCity}?"...`}
          className="flex-1 bg-surface-container-lowest border border-white/10 rounded-lg px-3 py-2 text-xs text-high-contrast placeholder:text-slate-500 focus:outline-none focus:border-primary/60"
        />

        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading}
          className="p-2.5 rounded-lg bg-primary text-surface-container-lowest font-bold hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Send Query"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
