/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { US_AQI_CATEGORIES, getAqiCategory } from '../lib/aqi.ts';
import { ProvenanceBadge } from './ProvenanceBadge.tsx';

interface HealthSafetySectionProps {
  currentAqi: number | null;
}

export type PersonaType = 'athlete' | 'vulnerable' | 'asthma' | 'public';
export type AqiSeverity = 'good' | 'moderate' | 'sensitive' | 'unhealthy' | 'very_unhealthy' | 'hazardous';

export interface PersonaProtocol {
  title: string;
  badge: string;
  c1Icon: string;
  c1Title: string;
  c1Desc: string;
  c2Icon: string;
  c2Title: string;
  c2Desc: string;
  c3Icon: string;
  c3Title: string;
  c3Desc: string;
}

// Complete 4 personas x 6 US AQI categories (24 distinct clinical & behavioral protocols)
export const PERSONA_CATEGORY_PROTOCOLS: Record<PersonaType, Record<AqiSeverity, PersonaProtocol>> = {
  athlete: {
    good: {
      title: 'Protocol: High-Ventilation Athletes & Runners • Good Air Tier',
      badge: 'Tidal Volume: 1.0x (Peak Aerobic Condition)',
      c1Icon: 'fitness_center',
      c1Title: 'Full Aerobic & Interval Training Permitted',
      c1Desc: 'Optimal ambient air. Minute ventilation up to 120 L/min causes zero particulate strain; ideal for long-distance marathon and tempo runs.',
      c2Icon: 'directions_run',
      c2Title: 'Road & Trail Running Unrestricted',
      c2Desc: 'No particulate deposition in lower terminal alveoli. Hydrate normally and monitor standard post-workout recovery metrics.',
      c3Icon: 'air',
      c3Title: 'Natural Open-Air Breathing',
      c3Desc: 'Zero respiratory airway resistance. Deep diaphragmatic hyperventilation poses zero inflammatory or microvascular risk.',
    },
    moderate: {
      title: 'Protocol: High-Ventilation Athletes & Runners • Moderate Tier',
      badge: 'Tidal Volume: 1.5x (Minor Bronchial Load)',
      c1Icon: 'timer',
      c1Title: 'Full Workouts with Paced Rest Intervals',
      c1Desc: 'Acceptable for conditioned endurance runners. Take adequate rest intervals to prevent acute airway desiccation and mucosal drying.',
      c2Icon: 'nature_people',
      c2Title: 'Prioritize Green & Vegetated Corridors',
      c2Desc: 'Route workouts through tree-canopied parks away from primary traffic corridors to minimize roadside combustion soot.',
      c3Icon: 'water_drop',
      c3Title: 'Intensify Mucosal Hydration',
      c3Desc: 'Hydrate with electrolyte fluids before and after sessions to maintain optimal ciliary mucus clearance efficiency.',
    },
    sensitive: {
      title: 'Protocol: High-Ventilation Athletes & Runners • Sensitive Tier',
      badge: 'Tidal Volume Risk: 2.5x (Sensitive Warning)',
      c1Icon: 'speed',
      c1Title: 'Curtail Outdoor Exertion to < 45 Mins',
      c1Desc: 'Cap outdoor duration. Elevated ambient particles trigger early airway resistance and reduce VO2 max efficiency.',
      c2Icon: 'schedule',
      c2Title: 'Avoid Traffic Rush Hours (07:00–10:00 & 17:00–20:00)',
      c2Desc: 'Do not train near arterial roads when photochemical nitrogen dioxide (NO2) and vehicle exhaust peak.',
      c3Icon: 'fitness_center',
      c3Title: 'Introduce Indoor Treadmill / Turbo Sessions',
      c3Desc: 'Split high-intensity interval training into sealed gym spaces with certified HEPA air purification.',
    },
    unhealthy: {
      title: 'Protocol: High-Ventilation Athletes & Runners • Unhealthy Tier',
      badge: 'Tidal Volume Risk: 4.8x (Severe Alveolar Influx)',
      c1Icon: 'cancel',
      c1Title: 'Cancel Outdoor Cardio & Tempo Running',
      c1Desc: 'Deep hyperventilation (100+ L/min) bypasses nasal filtration, driving 4.8x particulate mass directly into alveolar capillary membranes.',
      c2Icon: 'fitness_center',
      c2Title: 'Pivot to Sealed HEPA Gym',
      c2Desc: 'Train exclusively in sealed environments equipped with certified H13/H14 HEPA scrubbers maintaining indoor PM2.5 < 10 µg/m³.',
      c3Icon: 'masks',
      c3Title: 'N95 / FFP2 Required if Commuting',
      c3Desc: 'Surgical or cloth masks offer zero electrostatic trapping for fine sub-2.5µm photochemical soot. Use tight-fitting NIOSH N95.',
    },
    very_unhealthy: {
      title: 'Protocol: High-Ventilation Athletes & Runners • Very Unhealthy Tier',
      badge: 'Tidal Volume Risk: 6.5x (Critical Lung Strain)',
      c1Icon: 'block',
      c1Title: 'Strict Outdoor Exercise Prohibition',
      c1Desc: 'Strenuous cardio in this zone causes acute endothelial oxidative stress, arterial stiffness, and microvascular coronary spasms.',
      c2Icon: 'air_purifier_gen',
      c2Title: 'Zone-1 Indoor Active Recovery Only',
      c2Desc: 'Limit physical effort to low-intensity mobility, stretching, or light indoor yoga under continuous dual-stage HEPA filtration.',
      c3Icon: 'monitor_heart',
      c3Title: 'Monitor Heart Rate & HRV Autonomic Recovery',
      c3Desc: 'Watch for elevated resting pulse or suppressed Heart Rate Variability (HRV), signaling systemic inflammatory autonomic load.',
    },
    hazardous: {
      title: 'Protocol: High-Ventilation Athletes & Runners • Hazardous Tier',
      badge: 'Tidal Volume Risk: 8.5x (Extreme Toxic Threat)',
      c1Icon: 'emergency',
      c1Title: 'Absolute Athletic Lockdown',
      c1Desc: 'Immediate cessation of all athletic exertion. Inhaling 300+ AQI soot induces acute alveolar macrophage necrosis and systemic crisis.',
      c2Icon: 'home',
      c2Title: 'Sealed Indoor Confinement & High-CADR Air Scrubbing',
      c2Desc: 'Stay inside sealed rooms. Tape drafty perimeter gaps and operate active multi-stage filtration at maximum clean air delivery rate.',
      c3Icon: 'local_pharmacy',
      c3Title: 'Prophylactic Antioxidant Support',
      c3Desc: 'Increase intake of polyphenol-rich foods, N-acetylcysteine (NAC), and abundant water to counter acute lipid peroxidation.',
    },
  },
  vulnerable: {
    good: {
      title: 'Protocol: Children (<12) & Seniors (>65) • Good Air Tier',
      badge: 'Physiological Vulnerability: Baseline (Optimal)',
      c1Icon: 'sports_soccer',
      c1Title: 'Unrestricted Outdoor Play & School Recess',
      c1Desc: 'Clean ambient air fosters healthy pulmonary alveolar development in growing children and safe walking for elderly citizens.',
      c2Icon: 'window',
      c2Title: 'Full Home Cross-Ventilation',
      c2Desc: 'Open all windows to exhaust stale indoor VOCs, carbon dioxide, and radon, restoring indoor oxygen equilibrium.',
      c3Icon: 'directions_walk',
      c3Title: 'Encourage Gentle Senior Mobility',
      c3Desc: 'Ideal conditions for outdoor cardiovascular strolls, joint flexibility routines, and natural vitamin D sunlight synthesis.',
    },
    moderate: {
      title: 'Protocol: Children (<12) & Seniors (>65) • Moderate Tier',
      badge: 'Physiological Vulnerability: Low-to-Moderate',
      c1Icon: 'schedule',
      c1Title: 'Standard Recess with Hydration Breaks',
      c1Desc: 'Outdoor school play is safe, but ensure children take frequent water breaks to lubricate sensitive tracheal membranes.',
      c2Icon: 'elder',
      c2Title: 'Seniors with Cardiovascular History Pace Walks',
      c2Desc: 'Take leisurely strides during morning walks and monitor for mild breathlessness, wheezing, or ocular irritation.',
      c3Icon: 'air_purifier_gen',
      c3Title: 'Run Bedroom HEPA Purifier at Night',
      c3Desc: 'Maintain nocturnal bedroom air cleanliness to ensure restful, restorative cardiopulmonary sleep cycles.',
    },
    sensitive: {
      title: 'Protocol: Children (<12) & Seniors (>65) • Sensitive Tier',
      badge: 'Physiological Vulnerability: Moderate-High Risk',
      c1Icon: 'timer',
      c1Title: 'Limit School Outdoor Play to 30 Mins',
      c1Desc: 'Children breathe 50% more air per pound of body weight than adults; replace prolonged sports with indoor creative play.',
      c2Icon: 'elder',
      c2Title: 'Seniors Move Cardio Indoors',
      c2Desc: 'Older adults with hypertension, arrhythmia, or COPD should avoid strenuous outdoor gardening or long street walks.',
      c3Icon: 'air_purifier_gen',
      c3Title: 'Target Indoor PM2.5 Below 20 µg/m³',
      c3Desc: 'Operate true HEPA air purifiers in children’s study rooms and senior living areas to prevent micro-airway inflammation.',
    },
    unhealthy: {
      title: 'Protocol: Children (<12) & Seniors (>65) • Unhealthy Tier',
      badge: 'Cardiovascular Vulnerability: High Risk',
      c1Icon: 'door_front',
      c1Title: 'Strict Home Confinement for Children & Elderly',
      c1Desc: 'Developing pulmonary tissue and stiffened elder vascular walls suffer acute microvascular injury from 2.5µm carbon particles.',
      c2Icon: 'air_purifier_gen',
      c2Title: 'Operate Continuous Indoor HEPA Scrubbers',
      c2Desc: 'Target indoor PM2.5 levels strictly below 10 µg/m³ in pediatric nurseries, family rooms, and senior bedrooms.',
      c3Icon: 'monitor_heart',
      c3Title: 'Twice-Daily Fingertip Pulse Oximetry (SpO2)',
      c3Desc: 'Monitor fingertip oximeter readings; consult a physician promptly if oxygen saturation dips below 94% or pulse spikes.',
    },
    very_unhealthy: {
      title: 'Protocol: Children (<12) & Seniors (>65) • Very Unhealthy Tier',
      badge: 'Cardiovascular Vulnerability: Severe Alert',
      c1Icon: 'meeting_room',
      c1Title: 'Establish a Central Clean-Air Safe Room',
      c1Desc: 'Consolidate vulnerable family members into a single central room with sealed windows and continuously running HEPA filtration.',
      c2Icon: 'masks',
      c2Title: 'Small-Fit Pediatric / Senior N95 for Transit',
      c2Desc: 'Avoid adult-sized masks on children. Ensure an airtight edge seal if brief emergency transit outside is required.',
      c3Icon: 'medical_information',
      c3Title: 'Emergency Pediatric / Geriatric Doctor on Standby',
      c3Desc: 'Have contact details of the nearest hospital pulmonary ward readily accessible; monitor for lethargy and persistent dry cough.',
    },
    hazardous: {
      title: 'Protocol: Children (<12) & Seniors (>65) • Hazardous Tier',
      badge: 'Cardiovascular Vulnerability: Critical Emergency',
      c1Icon: 'warning',
      c1Title: 'Emergency Lockdown / Relocation Precaution',
      c1Desc: 'If indoor filtration is inadequate to bring PM2.5 below 25 µg/m³, temporarily relocate vulnerable loved ones to cleaner zones.',
      c2Icon: 'air_purifier_gen',
      c2Title: 'Multi-Stage HEPA + Activated Carbon Filtration',
      c2Desc: 'Activated carbon is essential to capture toxic volatile gases (NO2, SO2, benzene) that accompany extreme particle spikes.',
      c3Icon: 'call',
      c3Title: 'Immediate ER Care for Hypoxia Symptoms',
      c3Desc: 'Seek immediate emergency care if child or senior exhibits blueish lips (cyanosis), confusion, or severe chest retractions.',
    },
  },
  asthma: {
    good: {
      title: 'Protocol: Bronchial, COPD & Asthma Patients • Good Air Tier',
      badge: 'Bronchial Reactivity: Calm / Nominal',
      c1Icon: 'check_circle',
      c1Title: 'Maintain Daily Inhaled Preventer Regimen',
      c1Desc: 'Continue prescribed inhaled corticosteroid (ICS) controllers regularly to maintain baseline bronchial desensitization.',
      c2Icon: 'fitness_center',
      c2Title: 'Safe for Normal Daily Physical Activity',
      c2Desc: 'Minimal airborne bronchoconstrictive triggers. Bronchial airways remain relaxed with optimal peak expiratory flow (PEFR).',
      c3Icon: 'healing',
      c3Title: 'Routine Nasal Saline Hygiene',
      c3Desc: 'Periodic isotonic saline rinse removes background allergens and supports normal mucociliary escalator motility.',
    },
    moderate: {
      title: 'Protocol: Bronchial, COPD & Asthma Patients • Moderate Tier',
      badge: 'Bronchial Reactivity: Mild Sensitivity',
      c1Icon: 'medication',
      c1Title: 'Keep Fast-Acting Rescue Inhaler Accessible',
      c1Desc: 'Keep short-acting beta-agonist (albuterol/salbutamol) within arm’s reach during daily errands and morning commutes.',
      c2Icon: 'speed',
      c2Title: 'Check Peak Expiratory Flow Rate (PEFR)',
      c2Desc: 'Take morning and evening peak flow readings to detect early silent airway narrowing before wheezing develops.',
      c3Icon: 'block',
      c3Title: 'Avoid Vehicle Exhaust Queues & Bus Depots',
      c3Desc: 'Nitrogen dioxide and diesel exhaust fumes trigger sudden bronchial twitching in hyper-reactive airways.',
    },
    sensitive: {
      title: 'Protocol: Bronchial, COPD & Asthma Patients • Sensitive Tier',
      badge: 'Bronchospasm Risk: Moderate Warning',
      c1Icon: 'medication',
      c1Title: 'Carry Fast-Acting Rescue Inhaler Everywhere',
      c1Desc: 'Ozone and sulfur dioxide oxidants trigger hyper-reactive airway constriction within 15 minutes of atmospheric exposure.',
      c2Icon: 'block',
      c2Title: 'Avoid Morning Inversion (05:00–09:00 AM)',
      c2Desc: 'Cold nocturnal thermal inversion concentrates heavy particulate soot and acid gases closest to street grade.',
      c3Icon: 'healing',
      c3Title: 'Twice-Daily Isotonic Saline Nasal Rinse',
      c3Desc: 'Cleanse mucosal passages with sterile isotonic saline to clear trapped coarse particulate deposits before they reach bronchi.',
    },
    unhealthy: {
      title: 'Protocol: Bronchial, COPD & Asthma Patients • Unhealthy Tier',
      badge: 'Bronchospasm Risk: Extreme Alert',
      c1Icon: 'warning',
      c1Title: 'Step-Up Controller Plan with Doctor Approval',
      c1Desc: 'Initiate physician-agreed step-up asthma action plan (e.g. temporary increase in ICS or dual controller doses).',
      c2Icon: 'masks',
      c2Title: 'Exhalation-Valved N95 for Essential Transit',
      c2Desc: 'Valved respirators reduce exhalation resistance while capturing >95% of fine particulate soot triggers.',
      c3Icon: 'air_purifier_gen',
      c3Title: 'Continuous Bedroom HEPA Air Filtration',
      c3Desc: 'Maintain nocturnal sanctuary with zero ambient soot infiltration to prevent debilitating 3:00 AM asthma attacks.',
    },
    very_unhealthy: {
      title: 'Protocol: Bronchial, COPD & Asthma Patients • Very Unhealthy Tier',
      badge: 'Bronchospasm Risk: Life-Threatening Threat',
      c1Icon: 'emergency',
      c1Title: 'Total Outdoor Evacuation / Confinement',
      c1Desc: 'Sub-2.5µm carbon particles trigger massive neutrophil and eosinophil infiltration, inducing acute severe airway remodeling.',
      c2Icon: 'medical_services',
      c2Title: 'Electric Nebulizer on Instant Standby',
      c2Desc: 'Check power cords, test compressor pressure, and verify unexpired stock of ipratropium and salbutamol respules.',
      c3Icon: 'local_hospital',
      c3Title: 'Activate Red Zone Action Protocol',
      c3Desc: 'If rescue inhaler effect lasts < 3 hours or PEFR drops below 50% of personal best, proceed immediately to an emergency center.',
    },
    hazardous: {
      title: 'Protocol: Bronchial, COPD & Asthma Patients • Hazardous Tier',
      badge: 'Bronchospasm Risk: Critical Respiratory Emergency',
      c1Icon: 'local_hospital',
      c1Title: 'Hospital Emergency Protocol on 5-Min Notice',
      c1Desc: 'Severe smog concentration induces acute status asthmaticus and refractory respiratory muscular exhaustion.',
      c2Icon: 'medical_information',
      c2Title: 'Medical Supplemental Oxygen Verified',
      c2Desc: 'Ensure oxygen concentrator or medical cylinder is verified and fully charged if prescribed for chronic hypoxemia.',
      c3Icon: 'shield',
      c3Title: 'Total Barrier Containment & Zero Combustion',
      c3Desc: 'Prohibit all indoor cooking with oil, frying, or heating elements. Maintain continuous sealed filtration.',
    },
  },
  public: {
    good: {
      title: 'Protocol: General Public Daily Routine • Good Air Tier',
      badge: 'Urban Smog Advisory: Clean / Optimal',
      c1Icon: 'window',
      c1Title: 'Open Windows for Complete Air Refresh',
      c1Desc: 'Flush stale indoor carbon dioxide, volatile organics, and moisture; bring indoor air into equilibrium with clean outdoors.',
      c2Icon: 'directions_walk',
      c2Title: 'Commute, Walk & Cycle Freely',
      c2Desc: 'No respiratory masks or restrictions needed. Excellent conditions for cycling to work, outdoor lunches, and balcony leisure.',
      c3Icon: 'water_drop',
      c3Title: 'Standard Hydration & General Wellbeing',
      c3Desc: 'Maintain regular healthy hydration habits to support natural respiratory mucosal defenses.',
    },
    moderate: {
      title: 'Protocol: General Public Daily Routine • Moderate Tier',
      badge: 'Urban Smog Advisory: Nominal Caution',
      c1Icon: 'window',
      c1Title: 'Ventilate During Afternoon Wind Window',
      c1Desc: 'Open windows between 12:00 PM and 16:00 PM when solar heating breaks thermal ground inversions and dilutes urban haze.',
      c2Icon: 'directions_car',
      c2Title: 'Switch Vehicle AC to Recirculation in Jams',
      c2Desc: 'Prevent direct intake of heavy particulate exhaust from trucks and buses when idling in dense bottleneck traffic.',
      c3Icon: 'visibility',
      c3Title: 'Check Daily 72-Hour Air Trends',
      c3Desc: 'Review multi-day air quality forecast before scheduling major weekend outdoor gatherings, picnics, or sports matches.',
    },
    sensitive: {
      title: 'Protocol: General Public Daily Routine • Sensitive Tier',
      badge: 'Urban Smog Advisory: Elevated Alert',
      c1Icon: 'directions_car',
      c1Title: 'Keep Vehicle AC Permanently on Recirculation',
      c1Desc: 'Automotive cabin filters fail to block ultrafine combustion aerosols unless recirculated cabin air mode is active.',
      c2Icon: 'schedule',
      c2Title: 'Shift Heavy Outdoor Chores to Cleaner Days',
      c2Desc: 'Postpone prolonged leaf blowing, garden maintenance, or outdoor home renovations until atmospheric venting clears.',
      c3Icon: 'masks',
      c3Title: 'Wear Commuter Mask on Two-Wheelers',
      c3Desc: 'Motorcycle, scooter, and cycle commuters face direct exhaust plume exposure; use well-fitted particulate filtration masks.',
    },
    unhealthy: {
      title: 'Protocol: General Public Daily Routine • Unhealthy Tier',
      badge: 'Urban Smog Advisory: Tier-4 Smog Lock',
      c1Icon: 'directions_car',
      c1Title: 'Lock Vehicle AC to Recirculation Mode',
      c1Desc: 'Prevent exhaust gases and roadside soot from being drawn directly through automotive cabin air intakes.',
      c2Icon: 'window',
      c2Title: 'Keep Windows Closed & Weather-Stripped',
      c2Desc: 'Prevent heavy nocturnal smog and industrial boundary layer emissions from infiltrating domestic living quarters.',
      c3Icon: 'water_drop',
      c3Title: 'Intensify Hydration & Saline Eye Comfort',
      c3Desc: 'Adequate hydration supports ciliary mucus escalator movement; use lubricating eye drops to relieve photochemical stinging.',
    },
    very_unhealthy: {
      title: 'Protocol: General Public Daily Routine • Very Unhealthy Tier',
      badge: 'Urban Smog Advisory: Tier-5 Severe Smog',
      c1Icon: 'work',
      c1Title: 'Transition to Work-From-Home (WFH)',
      c1Desc: 'Avoid non-essential transit across toxic smog corridors; cancel outdoor public gatherings, sports tournaments, and ceremonies.',
      c2Icon: 'masks',
      c2Title: 'Certified N95 / FFP2 Respirator Mandatory Outdoors',
      c2Desc: 'Surgical and cloth masks are strictly ineffective. Tight facial fit is required to eliminate peripheral micro-air leaks.',
      c3Icon: 'air_purifier_gen',
      c3Title: 'Run Domestic Air Purifiers Continuously',
      c3Desc: 'Keep indoor PM2.5 below 15 µg/m³. Refrain from frying, vacuuming with non-HEPA units, or burning candles and incense.',
    },
    hazardous: {
      title: 'Protocol: General Public Daily Routine • Hazardous Tier',
      badge: 'Urban Smog Advisory: Emergency Red Zone',
      c1Icon: 'emergency',
      c1Title: 'Shelter Indoors Under Emergency Conditions',
      c1Desc: 'Severe toxic air catastrophe. Minimize all exterior door openings and eliminate outdoor pedestrian movement entirely.',
      c2Icon: 'home',
      c2Title: 'Damp Towel Sealing & Air Barrier Setup',
      c2Desc: 'Place damp towels along exterior door bottoms and seal drafty window frames to stop toxic particulate ingress.',
      c3Icon: 'cleaning_services',
      c3Title: 'Post-Transit Shower & Immediate Laundry',
      c3Desc: 'Fine black carbon deposits heavily on hair and outerwear; shower and change garments immediately after any unavoidable transit.',
    },
  },
};

export const HealthSafetySection: React.FC<HealthSafetySectionProps> = ({ currentAqi }) => {
  const [activePersona, setActivePersona] = useState<PersonaType>('athlete');
  const aqiVal = currentAqi;
  const liveCategory = getAqiCategory(aqiVal);

  // Allow inspecting any of the 6 US AQI categories or viewing live
  const [selectedSeverity, setSelectedSeverity] = useState<AqiSeverity | null>(null);

  const activeCategory = selectedSeverity
    ? US_AQI_CATEGORIES.find((c) => c.severity === selectedSeverity) || liveCategory
    : liveCategory;

  const currentProtocol =
    activeCategory.severity === 'unavailable'
      ? null
      : PERSONA_CATEGORY_PROTOCOLS[activePersona][activeCategory.severity];
  const isInspectingCustomTier = selectedSeverity !== null && selectedSeverity !== liveCategory.severity;

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-6 relative overflow-hidden">
      {/* Header and Guidelines Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400 text-[20px]">
              medical_services
            </span>
            <h3 className="font-display font-bold text-lg sm:text-xl text-white">
              Health &amp; Safety Dashboard: Physiological Impact
            </h3>
            <ProvenanceBadge kind="guidance" />
          </div>
          <p className="text-xs text-[#bbcabf] mt-0.5">
            ICMR and World Health Organization evidentiary medical guidelines for air pollution exposure.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            WHO 2021 &amp; EPA Standards
          </span>
        </div>
      </div>

      {/* Persona Health Protocol Engine */}
      <div className="p-4 rounded-xl bg-[#131b2e] border border-white/10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase font-bold text-emerald-400 tracking-wider">
              Persona Health Protocol Engine
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
              4 PERSONAS × 6 CATEGORIES MATRIX
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#bbcabf]">
              {isInspectingCustomTier ? 'Selected Tier:' : 'Current AQI:'}{' '}
              <strong style={{ color: activeCategory.color }}>
                {isInspectingCustomTier
                  ? `${activeCategory.label} (${activeCategory.min}–${activeCategory.max})`
                  : aqiVal === null
                    ? 'Unavailable'
                    : `${aqiVal} (${liveCategory.label})`}
              </strong>
            </span>
            {isInspectingCustomTier && (
              <button
                onClick={() => setSelectedSeverity(null)}
                className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/10 hover:bg-emerald-500/20 text-emerald-300 border border-white/10 hover:border-emerald-500/30 transition-colors"
                title="Reset to the current city AQI reading"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* 4 Persona Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => setActivePersona('athlete')}
            className={`py-2 px-3 rounded-lg text-xs font-mono font-semibold transition-all text-center flex items-center justify-center gap-1.5 ${
              activePersona === 'athlete'
                ? 'bg-emerald-500 text-[#003824] shadow-[0_0_12px_rgba(78,222,163,0.3)]'
                : 'bg-[#171f33] text-[#bbcabf] hover:text-white'
            }`}
          >
            <span>🏃</span>
            <span>Outdoor Athlete</span>
          </button>

          <button
            onClick={() => setActivePersona('vulnerable')}
            className={`py-2 px-3 rounded-lg text-xs font-mono font-semibold transition-all text-center flex items-center justify-center gap-1.5 ${
              activePersona === 'vulnerable'
                ? 'bg-emerald-500 text-[#003824] shadow-[0_0_12px_rgba(78,222,163,0.3)]'
                : 'bg-[#171f33] text-[#bbcabf] hover:text-white'
            }`}
          >
            <span>👶</span>
            <span>Children &amp; Seniors</span>
          </button>

          <button
            onClick={() => setActivePersona('asthma')}
            className={`py-2 px-3 rounded-lg text-xs font-mono font-semibold transition-all text-center flex items-center justify-center gap-1.5 ${
              activePersona === 'asthma'
                ? 'bg-emerald-500 text-[#003824] shadow-[0_0_12px_rgba(78,222,163,0.3)]'
                : 'bg-[#171f33] text-[#bbcabf] hover:text-white'
            }`}
          >
            <span>🫁</span>
            <span>Asthma / Chronic</span>
          </button>

          <button
            onClick={() => setActivePersona('public')}
            className={`py-2 px-3 rounded-lg text-xs font-mono font-semibold transition-all text-center flex items-center justify-center gap-1.5 ${
              activePersona === 'public'
                ? 'bg-emerald-500 text-[#003824] shadow-[0_0_12px_rgba(78,222,163,0.3)]'
                : 'bg-[#171f33] text-[#bbcabf] hover:text-white'
            }`}
          >
            <span>🏠</span>
            <span>General Public</span>
          </button>
        </div>

        {/* 6-Category Severity Scrubber / Selector */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-[#86948a]">
            <span>Category Protocol Inspector (Click to test protocols at any severity tier):</span>
            <span className="hidden sm:inline">Active: <span style={{ color: activeCategory.color }} className="font-bold">{activeCategory.label}</span></span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {US_AQI_CATEGORIES.map((cat) => {
              const isSelected = activeCategory.severity === cat.severity;
              const isCurrent = aqiVal !== null && liveCategory.severity === cat.severity;
              return (
                <button
                  key={cat.severity}
                  onClick={() => {
                    if (cat.severity !== 'unavailable') setSelectedSeverity(cat.severity);
                  }}
                  className={`p-1.5 rounded-lg text-[10px] font-mono text-left transition-all border relative ${
                    isSelected
                      ? 'border-white/40 bg-white/10 shadow-sm'
                      : 'border-white/5 bg-[#171f33]/60 hover:bg-[#171f33] hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: cat.color }}
                    ></span>
                    {isCurrent && (
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/20 px-1 rounded">
                        CURRENT
                      </span>
                    )}
                  </div>
                  <div className="font-bold truncate" style={{ color: cat.color }}>
                    {cat.label}
                  </div>
                  <div className="text-[9px] text-[#86948a] truncate">
                    AQI {cat.min}–{cat.max}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Prescription Content Card */}
        <div className="p-4 rounded-xl bg-[#060e20] border border-white/5 space-y-3">
          {currentProtocol ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  {currentProtocol.title}
                </span>
                <span
                  className="text-[11px] font-mono px-2.5 py-0.5 rounded-full font-bold border"
                  style={{
                    backgroundColor: activeCategory.bgTint,
                    color: activeCategory.color,
                    borderColor: `${activeCategory.color}40`,
                  }}
                >
                  {currentProtocol.badge}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-lg bg-[#171f33] border border-white/5 space-y-1.5 hover:border-white/15 transition-colors">
                  <span className="material-symbols-outlined text-rose-400 text-[22px] block">
                    {currentProtocol.c1Icon}
                  </span>
                  <span className="font-mono text-xs font-bold text-white block">
                    {currentProtocol.c1Title}
                  </span>
                  <p className="text-[11px] text-[#bbcabf] leading-relaxed">
                    {currentProtocol.c1Desc}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[#171f33] border border-white/5 space-y-1.5 hover:border-white/15 transition-colors">
                  <span className="material-symbols-outlined text-emerald-400 text-[22px] block">
                    {currentProtocol.c2Icon}
                  </span>
                  <span className="font-mono text-xs font-bold text-white block">
                    {currentProtocol.c2Title}
                  </span>
                  <p className="text-[11px] text-[#bbcabf] leading-relaxed">
                    {currentProtocol.c2Desc}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[#171f33] border border-white/5 space-y-1.5 hover:border-white/15 transition-colors">
                  <span className="material-symbols-outlined text-purple-300 text-[22px] block">
                    {currentProtocol.c3Icon}
                  </span>
                  <span className="font-mono text-xs font-bold text-white block">
                    {currentProtocol.c3Title}
                  </span>
                  <p className="text-[11px] text-[#bbcabf] leading-relaxed">
                    {currentProtocol.c3Desc}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#bbcabf]">
              AQI is unavailable, so no current exposure protocol can be selected. Choose a category above to inspect its general guidance.
            </p>
          )}
        </div>
      </div>

      {/* PM2.5 vs PM10 Biological Mechanism Explainer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PM2.5 Card */}
        <div className="p-4 rounded-xl bg-[#131b2e] border border-rose-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-300 text-xs font-mono font-bold flex items-center justify-center">
                2.5
              </span>
              <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                PM2.5: Fine Particulate Matter (&lt; 2.5 µm)
              </span>
            </div>
            <span className="text-[10px] font-mono text-rose-300 font-semibold">Deep Alveolar Penetration</span>
          </div>
          <p className="text-xs text-[#bbcabf] leading-relaxed">
            Particles smaller than 2.5 micrometers bypass upper airway ciliary defense, reaching deep terminal alveoli. From there, they cross directly into arterial blood circulation, causing systemic endothelial inflammation, plaque destabilization, and elevated thrombotic risks.
          </p>
        </div>

        {/* PM10 Card */}
        <div className="p-4 rounded-xl bg-[#131b2e] border border-purple-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 text-xs font-mono font-bold flex items-center justify-center">
                10
              </span>
              <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                PM10: Inhalable Coarse Particles (&lt; 10 µm)
              </span>
            </div>
            <span className="text-[10px] font-mono text-purple-300 font-semibold">Upper Respiratory Irritant</span>
          </div>
          <p className="text-xs text-[#bbcabf] leading-relaxed">
            Coarse particles such as dust, pollen, and fly ash predominantly deposit within the nasopharynx, trachea, and primary bronchi. They induce acute ocular irritation, coughing, throat dryness, and bronchoconstrictive exacerbations in sensitive populations.
          </p>
        </div>
      </div>

      {/* 6 US AQI Category Explainer Strip */}
      <div className="space-y-2">
        <span className="text-xs font-mono uppercase font-bold text-[#86948a] tracking-wider block">
          US EPA Air Quality Index Categories &amp; Benchmarks
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs font-mono">
          {US_AQI_CATEGORIES.map((cat) => (
            <div
              key={cat.min}
              className="p-3 rounded-xl bg-[#131b2e] border border-white/5 space-y-1 hover:border-white/15 transition-colors cursor-pointer"
              onClick={() => {
                if (cat.severity !== 'unavailable') setSelectedSeverity(cat.severity);
              }}
              title={`Click to inspect ${cat.label} protocol`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm" style={{ color: cat.color }}>
                  {cat.min}–{cat.max} {cat.label}
                </span>
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: cat.color }}
                ></span>
              </div>
              <p className="text-[11px] text-[#bbcabf] leading-tight">
                {cat.summary}
              </p>
              <span className="text-[10px] text-[#86948a] block pt-1">
                Advice: {cat.outdoorAdvice}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Mandatory Disclaimer Footer */}
      <div className="text-center text-xs font-mono text-[#86948a] pt-1 border-t border-white/5">
        <span>General guidance, not medical advice. Consult medical professionals for clinical treatment plans.</span>
      </div>
    </div>
  );
};
