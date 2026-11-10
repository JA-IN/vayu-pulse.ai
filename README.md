# 🪔 VayuPulse AI — Modeled Air Quality Intelligence Platform

> **Built for Lets Code Diwali Challenge 2026** • **Theme:** BREATHE BETTER • **License:** MIT

**VayuPulse AI** displays nearby WAQI station AQI readings when available, with clearly labeled Open-Meteo CAMS modeled AQI as a fallback. For Indian cities, it also shows nearby CPCB station pollutant concentrations and a separately labeled experimental hourly PM-only estimate when the readings are available. The estimate is not an official CPCB AQI: the feed's latest hourly values do not provide the prescribed averaging periods or the minimum three eligible pollutant sub-indices. WAQI remains the primary station AQI when available; the experimental estimate is never substituted for or combined with it. History and forecasts use modeled data, and each reading identifies its source and timestamp.

---

## 🌟 Key Highlights & Architecture

- **Visual design**: A bright sky-and-mint palette with coral accents, clear solid cards, and collapsible sections to keep the dashboard readable while preserving optional detail.
- **Air-quality data**: Current, historical, and forecast values from the Open-Meteo Air Quality API (CAMS model output); weather from Open-Meteo Forecast API.
- **AI assistance**: Optional server-side Google Gemini integration receives the selected location's available modeled context.
- **Provenance**: Modeled data, forecasts, historical values, derived calculations, and guidance are labeled separately. Staleness is determined from the provider's observation timestamp.

---

## 📋 Comprehensive Feature Checklist

### Core Deliverables (Requirements A – F)

1. **[Requirement A] Current Modeled AQI Dashboard**
   - Displays the provider's current modeled US AQI and timestamp; AQI is not calculated from a local sensor.
   - Comprehensive 6-chemical pollutant matrix: **PM2.5**, **PM10**, **NO₂**, **SO₂**, **CO** (converted from µg/m³ to mg/m³), and **O₃**.
   - WHO guideline comparisons and derived values, shown only when their input readings are available.

2. **[Requirement B] Interactive Geospatial Air Quality Radar**
   - Interactive Leaflet vector map with CARTO Dark Matter styling.
   - 12 pre-configured global and Indian city locations with color-coded modeled AQI values.
   - Highlights the three highest available AQI values among locations that returned data.
   - **Clean Air Finder**: Identifies a nearby location with AQI at or below 100 when one is present in the selected city set. Comparisons are model-based, not sensor readings.

3. **[Requirement C] Historical Pollution & Anomaly Tracker**
   - Dual-area SVG temporal graph with timeframes (24h, 7d, 30d, Diwali Week).
   - **Two-Date Comparison Selector**: Calculates absolute and percentage deltas between arbitrary historical observation dates.
   - **Z-Score Anomaly Detection**: Highlights severe inversion spikes with $Z \ge 2.0$ against rolling baselines.

4. **[Requirement D] Comparative City Battle & Global Leaderboard**
   - Side-by-side comparison of 2–4 selected cities using available AQI and pollutant values.
   - Calculates the lowest available recent 7-day average among selected cities.
   - Ranks selected cities by their available current AQI.

5. **[Requirement E] Physiological Health & Persona Protocol Engine**
   - 4 tailored operational profiles: **Outdoor Athlete**, **Children & Elderly**, **Asthma & Chronic**, and **General Public**.
   - Actionable behavioral countermeasures (ventilation timing, HEPA purifier schedules, N95 respirator mandates).
   - Illustrative biological explainer; animations are not measurements of biological response.

6. **[Requirement F] 72-Hour Prognostics & Safe Outdoor Window**
   - Up to 72-hour hourly forecast timeline from Open-Meteo CAMS model output.
   - Predictive trend line with moving average slope (improving vs stagnating vs deteriorating).
   - **Best Safe Outdoor Activity Window Finder**: Automatically scans the 72h curve to highlight optimal intervals for ventilation or exercise.

---

### Section 5 & 6 Signature Innovations

7. **[Section 5] 3D Rubik's Telemetry Core**
   - Full CSS 3D matrix (`transform-style: preserve-3d`) with interactive telemetry panels:
     1. *Face 1 (Front)*: Primary Pollutant Matrix (AQI, PM2.5, PM10, NO₂, SO₂, CO, O₃, Berkeley Earth burden).
     2. *Face 2 (Back)*: Bio-Health Matrix (Alveolar deposition, WHO multiple caps, biological strain).
     3. *Face 3 (Right)*: 72h Prognostics & Inversion ceiling height.
     4. *Face 4 (Left)*: Thermal Anomaly Spikes & Z-score signatures.
     5. *Face 5 (Top)*: Wind Dispersion & Surface ventilation vectors.
     6. *Face 6 (Bottom)*: Data Provenance Mesh & Sensor freshness.
   - Interactive mouse drag with rotational inertia, keyboard arrow key controls, explode layer toggle (`translateZ(+70px)`), and quick perspective docking buttons.

8. **[Section 6] The Biosphere Eco-Mood Converter**
   - Illustrative anthropomorphic vector characters change appearance with selected AQI values; this is a visualization, not biological telemetry:
     - ☀️ **Solar Sun**: Radiance dims and dons an N95 respirator as photochemical smog thickens.
     - 🌍 **Planetary Earth**: Shifts from vibrant green to fevered amber, crimson distress, and toxic ultraviolet.
     - 🌿 **Botanical Plant (Tulsi)**: Demonstrates stomata deposition clogging and transpiration loss.
     - 🫁 **Human Lungs**: Visualizes alveolar inflammation and tissue soot saturation.
   - Interactive mood scrubber slider (0 – 500 AQI).
   - **Berkeley Earth Cigarette Inhalation Standard**: Mathematical equivalence ($1 \text{ cig} \approx 22 \ \mu\text{g/m}^3 \ \text{PM2.5} / 24\text{h}$).

---

### 10+ Bonus Features

9. **AI AQI Copilot**: Optional server-side Gemini integration using the provided modeled context; fallback guidance does not invent unavailable readings.
10. **Voice Assistant**: Integrated Web Speech API recognition (speech-to-text) and speech synthesis (audio readout).
11. **Smart AQI Alert Preferences**: Saves a threshold and notification preferences and can send a user-triggered test notification. It does not monitor AQI in the background or automatically dispatch threshold alerts.
12. **Pollution Heatmap Layer**: Toggleable ambient chromatic gradient layer across geospatial radar.
13. **Geolocation Detection ("Detect My Air")**: Instant coordinate lock using the HTML5 Geolocation API with reverse geocoding.
14. **Story Card Studio**: High-resolution image exporter generating customized **9:16 Instagram Stories**, **1:1 Feed Posts**, and **16:9 Banners** as PNGs via `html-to-image`.
15. **Environmental Compliance Audit Report**: Print-ready environmental impact statement supporting direct PDF export via `window.print()`.
16. **Multi-API integrations**: WAQI supplies station AQI where a nearby station is available; Open-Meteo CAMS supplies modeled pollutant values, history, forecasts, and fallback AQI. Gemini is optional for AI features.
17. **Diwali Card Theme**: Adds a Diwali-themed label to exported story cards; it does not simulate pollution conditions.
18. **Pure Unit Testing Suite**: Decoupled Node.js test harness verifying AQI categories, cigarette math, WHO caps, and Z-score anomaly calculations.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | React 19, TypeScript, Vite |
| **Styling & Theme** | Tailwind CSS v4, Living Glassmorphism, Obsidian Dark Canvas |
| **Icons & Animation** | Lucide React, Motion (Framer Motion) |
| **Mapping & Geospatial** | Leaflet, CARTO Dark Matter Tiles |
| **Social Card Export** | `html-to-image` (Canvas PNG rendering) |
| **Hosting** | Static Vite single-page app plus same-project Vercel API functions; no server-side rendering |
| **Local API development** | Node.js, Express, `tsx` |
| **AI Cognition** | `@google/genai` (model configured in `server.ts`) |
| **Unit Testing** | `node:test`, `node:assert/strict` |

---

## 🌐 Public APIs & Data Sources

1. **Open-Meteo Air Quality & CAMS API**
   - Endpoint: `https://air-quality-api.open-meteo.com/v1/air_quality`
   - Data: PM2.5, PM10, Carbon Monoxide, Nitrogen Dioxide, Sulphur Dioxide, Ozone, US AQI (current, hourly, 72h forecast).
2. **Open-Meteo Forecast & Weather API**
   - Endpoint: `https://api.open-meteo.com/v1/forecast`
   - Data: Surface temperature, relative humidity, wind speed, wind direction, surface pressure, elevation.
3. **Open-Meteo Geocoding API**
   - Endpoint: `https://geocoding-api.open-meteo.com/v1/search`
   - Data: Fast city and coordinate resolution.
4. **World Air Quality Index (WAQI)**
   - Station AQI for nearby monitors when available. Accessed via a same-project function so the token stays server-side.
5. **Google Gemini API**
   - Model: configured in `server.ts`
   - Role: Fast, nuanced atmospheric cognition and conversational guidance.
6. **CPCB real-time station data via data.gov.in**
   - Resource: [Real time Air Quality Index from various locations](https://www.data.gov.in/resource/real-time-air-quality-index-various-locations)
   - Data: Hourly station pollutant concentrations for Indian cities. The dashboard may show an experimental PM2.5/PM10-only estimate using breakpoint interpolation, clearly separated from the primary AQI. It is not an official CPCB AQI: the single-hour values, app-assumed endpoints for open-ended severe ranges, and two-pollutant subset do not satisfy the official averaging and pollutant requirements.
   - Caching: successful station responses are cached for 30 minutes, with a stale-while-revalidate window on Vercel to reduce upstream requests and rate-limit pressure.

---

## 📐 Scientific Methodology & Mathematical Formulations

### 1. Cigarette Inhalation Equivalence
Based on the landmark Berkeley Earth methodology published by Richard & Elizabeth Muller (2015):
$$\text{Cigarettes / 24h} = \frac{\text{PM2.5 concentration in } \mu\text{g/m}^3}{22}$$
*One cigarette per day roughly corresponds to ambient PM2.5 exposure of $22 \ \mu\text{g/m}^3$ over a 24-hour window.*

### 2. WHO 2021 Global Air Quality Guidelines
- **PM2.5**: 24-hour average limit = $15 \ \mu\text{g/m}^3$
- **PM10**: 24-hour average limit = $45 \ \mu\text{g/m}^3$
- **NO₂**: 24-hour average limit = $25 \ \mu\text{g/m}^3$
- **SO₂**: 24-hour average limit = $40 \ \mu\text{g/m}^3$
- **CO**: 24-hour average limit = $4.0 \ \text{mg/m}^3$ *(Open-Meteo returns $\mu\text{g/m}^3$, converted by dividing by 1,000)*
- **O₃**: 8-hour peak limit = $100 \ \mu\text{g/m}^3$

### 3. Z-Score Statistical Anomaly Detection
To detect abnormal thermal inversions and sudden firecracker smoke surges without false positives:
$$Z = \frac{x_i - \mu_{7\text{d}}}{\sigma_{7\text{d}}}$$
An anomaly flag is triggered whenever $Z \ge 2.0$, signifying an event in the top 2.5% of statistical variance over the trailing window.

---

## 🚀 Local Development Setup

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`. Open-Meteo requires no API key; credentials are needed only for optional station and AI features:
```bash
GEMINI_API_KEY="your-gemini-key"
WAQI_TOKEN="your-waqi-token"
DATA_GOV_IN_API_KEY="your-data-gov-in-key"
```

### Deploying to Vercel
Deploy this repository as a single Vercel project. The frontend is a static Vite single-page application rendered in the browser; this project does not use server-side rendering. Vercel also deploys the `api/` handlers as same-project serverless functions, which keep WAQI, CPCB, and Gemini credentials off the client. No second service or separate deployment is required. Set `WAQI_TOKEN`, `DATA_GOV_IN_API_KEY`, and (if using AI features) `GEMINI_API_KEY` in Vercel Project Settings for the required environments. Never use a `VITE_` prefix for secrets: those values are embedded in public assets. If a station API is unavailable, the AQI remains clearly attributed to the fallback source when available.

### 3. Run Unit Tests
```bash
npx --yes tsx --test src/lib/aqi.test.ts
```

### 4. Start Full-Stack Development Server
```bash
npm run dev
```
The application will launch on `http://localhost:3000`.

---

## 📄 License
This project is open-source under the [MIT License](LICENSE). Built with dedication for the **Lets Code Diwali Challenge 2026** 🪔 to help every citizen **Breathe Better**.
