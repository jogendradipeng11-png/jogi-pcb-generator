import { SimulationScenario, OperatingConditions } from '../types';

export const DEFAULT_OPERATING_CONDITIONS: OperatingConditions = {
  supplyVoltage: 5.0,
  temperature: 25,
  simSpeed: 1,
  loadCondition: 'nominal',
  tolerance: 0,
};

export const BUILTIN_SIMULATION_SCENARIOS: SimulationScenario[] = [
  {
    id: 'scenario_nominal_5v',
    name: 'Nominal 5.0V Baseline (25°C)',
    description: 'Standard room-temperature lab benchmark with regulated 5.0V rail, 1x speed, and nominal test load.',
    badge: '⚡ Standard',
    category: 'standard',
    probedNets: ['VCC', '+5V', 'OUT_555', 'AMP_OUT'],
    operatingConditions: {
      supplyVoltage: 5.0,
      temperature: 25,
      simSpeed: 1,
      loadCondition: 'nominal',
      tolerance: 0,
      notes: 'Lab standard 25°C operating environment',
    },
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'scenario_brownout_3v3',
    name: 'Low-Battery / Brownout (3.3V)',
    description: 'Simulates depleted battery or low-voltage rail (3.3V). Tests regulator dropout and logic gate thresholds.',
    badge: '🔋 Low V',
    category: 'power',
    probedNets: ['VCC', '+5V', 'OUT_555', 'TRIG', 'THRES'],
    operatingConditions: {
      supplyVoltage: 3.3,
      temperature: 25,
      simSpeed: 1,
      loadCondition: 'nominal',
      tolerance: 5,
      notes: 'Checks behavior under depleted battery condition (3.3V)',
    },
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'scenario_stress_12v',
    name: 'High-Rail Stress & Thermals (12.0V, 70°C)',
    description: 'Industrial / automotive worst-case test: 12.0V supply at 70°C ambient to verify component power ratings and dissipation.',
    badge: '🔥 Stress',
    category: 'stress',
    probedNets: ['VCC', 'OUT_555', 'DISCH', 'AMP_OUT'],
    operatingConditions: {
      supplyVoltage: 12.0,
      temperature: 70,
      simSpeed: 1,
      loadCondition: 'heavy',
      tolerance: 10,
      notes: 'High voltage + elevated thermal junction test (12V @ 70°C)',
    },
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'scenario_cold_minus20',
    name: 'Sub-Zero Cold Start (-20°C)',
    description: 'Extreme low-temperature start (-20°C): diode forward voltages increase (+90mV) and LED turn-on thresholds shift.',
    badge: '❄️ Cold',
    category: 'stress',
    probedNets: ['VCC', '+5V', 'OUT_555', 'AMP_OUT'],
    operatingConditions: {
      supplyVoltage: 5.0,
      temperature: -20,
      simSpeed: 1,
      loadCondition: 'nominal',
      tolerance: 5,
      notes: 'Cold environment testing with diode Vf shift (+2mV/°C cold offset)',
    },
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'scenario_speed_capture',
    name: 'Fast Waveform Capture (5x Speed)',
    description: 'Accelerated 5.0x simulation rate to inspect full RC charging cycles, pulse trains, and oscillator periods.',
    badge: '⏱️ 5x Fast',
    category: 'speed',
    probedNets: ['OUT_555', 'TRIG', 'THRES', 'DISCH'],
    operatingConditions: {
      supplyVoltage: 5.0,
      temperature: 25,
      simSpeed: 5,
      loadCondition: 'nominal',
      tolerance: 0,
      notes: 'Fast-forward 5x speed for observing long timing cycles',
    },
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'scenario_audio_ac',
    name: 'Audio AC Small-Signal (9.0V, 1kHz)',
    description: 'Preamplifier and analog filter benchmark: monitors input signal generator, bias reference, and amplified output.',
    badge: '🎵 Audio AC',
    category: 'audio',
    probedNets: ['VCC', 'SIG_IN', 'AMP_OUT', 'BIAS_VREF'],
    operatingConditions: {
      supplyVoltage: 9.0,
      temperature: 25,
      simSpeed: 2,
      loadCondition: 'nominal',
      frequency: 1000,
      tolerance: 1,
      notes: '9V battery operation for audio op-amp and filter evaluation',
    },
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'scenario_heavy_load',
    name: 'Heavy Load & Ripple Margin (5.0V)',
    description: 'Simulates high-current load sink condition to audit regulator dropout, power trace heating, and voltage sags.',
    badge: '⚡ Heavy Sink',
    category: 'power',
    probedNets: ['VCC', '+5V', '5V_REG', 'PWR_LED_A'],
    operatingConditions: {
      supplyVoltage: 5.0,
      temperature: 45,
      simSpeed: 1,
      loadCondition: 'heavy',
      tolerance: 5,
      notes: 'High-current sink load audit for voltage sag and ripple',
    },
    isBuiltIn: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
];

const SCENARIOS_STORAGE_KEY = 'eda_simulation_scenarios_v1';

/**
 * Load all scenarios (built-in + user-saved from localStorage)
 */
export function loadAllSimulationScenarios(): SimulationScenario[] {
  try {
    const raw = localStorage.getItem(SCENARIOS_STORAGE_KEY);
    if (!raw) {
      return BUILTIN_SIMULATION_SCENARIOS;
    }
    const userScenarios: SimulationScenario[] = JSON.parse(raw);
    if (!Array.isArray(userScenarios)) {
      return BUILTIN_SIMULATION_SCENARIOS;
    }

    // Merge built-in scenarios with user custom scenarios
    const userMap = new Map(userScenarios.map((s) => [s.id, s]));
    const merged: SimulationScenario[] = [...BUILTIN_SIMULATION_SCENARIOS];

    // Add or override with user scenarios
    for (const u of userScenarios) {
      const existingIdx = merged.findIndex((b) => b.id === u.id);
      if (existingIdx !== -1) {
        merged[existingIdx] = u;
      } else {
        merged.push(u);
      }
    }
    return merged;
  } catch (err) {
    console.error('Failed to load simulation scenarios from localStorage:', err);
    return BUILTIN_SIMULATION_SCENARIOS;
  }
}

/**
 * Save or update a user custom scenario to localStorage
 */
export function saveUserSimulationScenario(scenario: SimulationScenario): SimulationScenario[] {
  try {
    const all = loadAllSimulationScenarios();
    const existingIdx = all.findIndex((s) => s.id === scenario.id);
    let updated: SimulationScenario[];

    if (existingIdx !== -1) {
      updated = all.map((s, idx) => (idx === existingIdx ? scenario : s));
    } else {
      updated = [scenario, ...all];
    }

    // Only persist custom scenarios or overrides to storage
    const toPersist = updated.filter((s) => !s.isBuiltIn || s.id === scenario.id);
    localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(toPersist));
    return updated;
  } catch (err) {
    console.error('Failed to save simulation scenario:', err);
    return loadAllSimulationScenarios();
  }
}

/**
 * Delete a user scenario
 */
export function deleteUserSimulationScenario(id: string): SimulationScenario[] {
  try {
    const all = loadAllSimulationScenarios();
    const updated = all.filter((s) => s.id !== id);
    const toPersist = updated.filter((s) => !s.isBuiltIn);
    localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(toPersist));
    return updated;
  } catch (err) {
    console.error('Failed to delete simulation scenario:', err);
    return loadAllSimulationScenarios();
  }
}

/**
 * Export scenarios as formatted JSON string
 */
export function exportScenariosAsJson(scenarios: SimulationScenario[]): string {
  return JSON.stringify(scenarios, null, 2);
}

/**
 * Import scenarios from JSON string
 */
export function importScenariosFromJson(jsonStr: string): SimulationScenario[] {
  const parsed = JSON.parse(jsonStr);
  if (!Array.isArray(parsed)) {
    throw new Error('Invalid scenarios file: expected array of scenarios.');
  }
  const current = loadAllSimulationScenarios();
  const merged = [...current];

  for (const s of parsed) {
    if (!s.id || !s.name || !s.operatingConditions) continue;
    const exists = merged.findIndex((m) => m.id === s.id);
    if (exists !== -1) {
      merged[exists] = s;
    } else {
      merged.push({ ...s, isBuiltIn: false });
    }
  }

  const toPersist = merged.filter((s) => !s.isBuiltIn);
  localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(toPersist));
  return merged;
}
