import {
  SchematicComponent,
  Wire,
  SimulationState,
  ComponentSimResult,
  SimulationSample,
} from '../types';

/**
 * Parse string electrical values (e.g. "10kΩ", "470uF", "5V", "100") into numeric values
 */
export function parseUnitValue(valueStr: string, defaultVal: number = 1000): number {
  if (!valueStr) return defaultVal;
  const clean = valueStr.trim().replace(/Ω|ohm|v|f|h|hz/gi, '');
  const match = clean.match(/^([\d.]+)\s*([pnumkMGT])?$/i);
  if (!match) {
    const num = parseFloat(clean);
    return isNaN(num) ? defaultVal : num;
  }

  const base = parseFloat(match[1]);
  if (isNaN(base)) return defaultVal;

  const prefix = match[2]?.toLowerCase();
  switch (prefix) {
    case 'p':
      return base * 1e-12;
    case 'n':
      return base * 1e-9;
    case 'u':
      return base * 1e-6;
    case 'm':
      return base * 1e-3;
    case 'k':
      return base * 1e3;
    case 'M':
      return base * 1e6;
    case 'G':
      return base * 1e9;
    default:
      return base;
  }
}

/**
 * Format voltage for display
 */
export function formatVoltage(volts: number): string {
  if (Math.abs(volts) >= 1) {
    return `${volts.toFixed(2)}V`;
  }
  return `${(volts * 1000).toFixed(1)}mV`;
}

/**
 * Format current for display
 */
export function formatCurrent(amps: number): string {
  const abs = Math.abs(amps);
  if (abs >= 1) {
    return `${amps.toFixed(2)}A`;
  }
  if (abs >= 0.001) {
    return `${(amps * 1000).toFixed(2)}mA`;
  }
  if (abs >= 0.000001) {
    return `${(amps * 1e6).toFixed(1)}µA`;
  }
  return '0.0mA';
}

/**
 * Format power for display
 */
export function formatPower(watts: number): string {
  if (watts >= 1) {
    return `${watts.toFixed(2)}W`;
  }
  return `${(watts * 1000).toFixed(1)}mW`;
}

/**
 * Step the circuit simulation forward by dt seconds and compute all node voltages and branch currents
 */
export function stepCircuitSimulation(
  components: SchematicComponent[],
  wires: Wire[],
  prevState: SimulationState,
  dt: number = 0.016
): SimulationState {
  const time = prevState.time + dt * prevState.speed;
  const netVoltages: Record<string, number> = {
    GND: 0.0,
    '0V': 0.0,
  };
  const pinVoltages: Record<string, number> = {};
  const wireCurrents: Record<string, number> = {};
  const componentResults: Record<string, ComponentSimResult> = {};

  // 1. Identify primary DC power rails
  let primaryVcc = 5.0; // default baseline
  for (const c of components) {
    if (c.type === 'vcc') {
      const v = c.testSettings?.voltage ?? parseUnitValue(c.value, 5.0);
      netVoltages['VCC'] = v;
      netVoltages['+5V'] = v;
      primaryVcc = v;
    } else if (c.type === 'battery') {
      const v = c.testSettings?.voltage ?? parseUnitValue(c.value, 9.0);
      primaryVcc = v;
      const posNet = c.pins.find((p) => p.id === '1' || p.name === '+')?.net || '9V';
      const negNet = c.pins.find((p) => p.id === '2' || p.name === '-')?.net || 'GND';
      netVoltages[posNet] = v;
      netVoltages[negNet] = 0.0;
    }
  }

  // 2. Identify 7805 Voltage Regulators
  const regulators = components.filter((c) => c.type === 'ic_regulator');
  for (const reg of regulators) {
    const inPin = reg.pins[0];
    const gndPin = reg.pins[1];
    const outPin = reg.pins[2];

    const inNet = inPin?.net || '9V';
    const outNet = outPin?.net || '+5V';
    const vin = netVoltages[inNet] ?? primaryVcc;

    // LM7805 behavior: dropout voltage is ~2.0V
    let vout = 5.0;
    let state = 'NORMAL';
    if (vin < 7.0) {
      vout = Math.max(0, vin - 2.0);
      state = 'DROPOUT';
    }

    netVoltages[outNet] = vout;
    const loadCurrent = 0.05; // 50mA nominal test load
    const power = Math.max(0, vin - vout) * loadCurrent;

    componentResults[reg.id] = {
      current: loadCurrent,
      power,
      voltageDrop: vin - vout,
      state,
      isOverloaded: power > 1.5, // TO-220 without heatsink limit
    };
  }

  // 3. Identify NE555 Timer Astable Oscillators
  const ne555 = components.find((c) => c.type === 'ic_ne555');
  if (ne555) {
    // Find timing resistors R1, R2, C1
    const r1Comp = components.find((c) => c.designator === 'R1') || components.find((c) => c.type === 'resistor');
    const r2Comp = components.find((c) => c.designator === 'R2');
    const c1Comp = components.find((c) => c.designator === 'C1') || components.find((c) => c.type === 'capacitor');

    const r1Val = r1Comp?.testSettings?.resistance ?? (r1Comp ? parseUnitValue(r1Comp.value, 10000) : 10000);
    const r2Val = r2Comp?.testSettings?.resistance ?? (r2Comp ? parseUnitValue(r2Comp.value, 47000) : 47000);
    const c1Val = c1Comp?.testSettings?.capacitance ?? (c1Comp ? parseUnitValue(c1Comp.value, 10e-6) : 10e-6);

    // 555 Astable formulas
    const tHigh = 0.693 * (r1Val + r2Val) * c1Val;
    const tLow = 0.693 * r2Val * c1Val;
    const period = Math.max(0.0001, tHigh + tLow);
    const realFreq = 1 / period;
    const dutyCycle = ((tHigh / period) * 100);

    // Visual simulation period (scaled between 0.3s and 3.0s for clear visibility on screen)
    const visualPeriod = Math.max(0.4, Math.min(3.0, period));
    const phase = (time % visualPeriod) / visualPeriod;
    const isHigh = phase < (tHigh / period);

    const vccPinNet = ne555.pins.find((p) => p.id === '8')?.net;
    const vcc = vccPinNet ? (netVoltages[vccPinNet] ?? primaryVcc) : primaryVcc;

    // Pin 3 (Output): Alternates between (Vcc - 1.4V) and 0.1V
    const vOut = isHigh ? Math.max(0, vcc - 1.35) : 0.08;
    const outNet = ne555.pins.find((p) => p.id === '3')?.net || 'OUT_555';
    netVoltages[outNet] = vOut;

    // Pin 2 & 6 (Threshold / Trigger): Exponential RC waveform between 1/3 Vcc and 2/3 Vcc
    const vCapMin = vcc / 3;
    const vCapMax = (2 * vcc) / 3;
    let vCap = vCapMin;
    if (isHigh) {
      // Charging
      const chargeRatio = phase / (tHigh / period);
      vCap = vCapMin + (vCapMax - vCapMin) * (1 - Math.exp(-3 * chargeRatio));
    } else {
      // Discharging
      const dischargeRatio = (phase - (tHigh / period)) / (1 - (tHigh / period));
      vCap = vCapMax - (vCapMax - vCapMin) * (1 - Math.exp(-3 * dischargeRatio));
    }

    const trigNet = ne555.pins.find((p) => p.id === '2')?.net;
    if (trigNet) netVoltages[trigNet] = vCap;
    const threshNet = ne555.pins.find((p) => p.id === '6')?.net;
    if (threshNet) netVoltages[threshNet] = vCap;

    componentResults[ne555.id] = {
      current: 0.015, // 15mA quiescent
      power: vcc * 0.015,
      voltageDrop: vcc,
      frequency: realFreq,
      dutyCycle,
      state: isHigh ? 'OUTPUT HIGH' : 'OUTPUT LOW',
    };
  }

  // 4. Identify LM358 Operational Amplifiers
  const opAmps = components.filter((c) => c.type === 'ic_opamp');
  for (const op of opAmps) {
    const vccNet = op.pins.find((p) => p.name.includes('+') || p.id === '8')?.net;
    const vcc = vccNet ? (netVoltages[vccNet] ?? primaryVcc) : primaryVcc;

    // Simulate preamplifier audio wave
    const inWave = 0.2 * Math.sin(2 * Math.PI * 2.0 * time) + 0.3; // 2Hz test tone
    const gain = 10.0;
    const outVoltage = Math.min(vcc - 1.2, Math.max(0.1, inWave * gain));

    const outNet = op.pins.find((p) => p.id === '1' || p.name === 'OUT1')?.net || 'AMP_OUT';
    netVoltages[outNet] = outVoltage;

    componentResults[op.id] = {
      current: 0.002,
      power: vcc * 0.002,
      voltageDrop: vcc,
      state: `GAIN 10x (${outVoltage.toFixed(2)}V)`,
    };
  }

  // 5. Switches and Push buttons
  const switches = components.filter((c) => c.type === 'switch' || c.type === 'pushbutton');
  for (const sw of switches) {
    const isClosed = sw.testSettings?.isClosed ?? true; // Default closed
    const p1Net = sw.pins[0]?.net;
    const p2Net = sw.pins[1]?.net;

    if (p1Net && p2Net) {
      if (isClosed) {
        const higherV = Math.max(netVoltages[p1Net] ?? 0, netVoltages[p2Net] ?? 0);
        netVoltages[p1Net] = higherV;
        netVoltages[p2Net] = higherV;
      }
    }

    componentResults[sw.id] = {
      current: isClosed ? 0.02 : 0.0,
      power: 0.0,
      voltageDrop: 0.0,
      state: isClosed ? 'CLOSED (ON)' : 'OPEN (OFF)',
    };
  }

  // 6. Resistors and LEDs
  for (const comp of components) {
    if (comp.type === 'resistor' || comp.type === 'potentiometer') {
      const p1Net = comp.pins[0]?.net;
      const p2Net = comp.pins[1]?.net;
      const v1 = p1Net ? (netVoltages[p1Net] ?? 0) : 0;
      const v2 = p2Net ? (netVoltages[p2Net] ?? 0) : 0;

      const vDrop = Math.abs(v1 - v2);
      let rVal = comp.testSettings?.resistance ?? parseUnitValue(comp.value, 1000);
      if (comp.type === 'potentiometer') {
        const wiper = comp.testSettings?.wiper ?? 0.5;
        rVal = Math.max(10, rVal * wiper);
      }

      const current = rVal > 0 ? vDrop / rVal : 0;
      const power = vDrop * current;

      componentResults[comp.id] = {
        current,
        power,
        voltageDrop: vDrop,
        state: `${formatCurrent(current)}`,
        isOverloaded: power > (comp.testSettings?.maxPowerRating ?? 0.25),
      };
    } else if (comp.type === 'led' || comp.type === 'diode') {
      const anodeNet = comp.pins[0]?.net;
      const cathodeNet = comp.pins[1]?.net;
      const vA = anodeNet ? (netVoltages[anodeNet] ?? 0) : 0;
      const vK = cathodeNet ? (netVoltages[cathodeNet] ?? 0) : 0;

      const vf = comp.testSettings?.forwardVoltage ?? (comp.type === 'led' ? 1.85 : 0.65);
      const forwardBias = vA - vK;

      let current = 0.0;
      let isLit = false;

      if (forwardBias > vf) {
        // Nominal current limited by series loop resistance ~330-1000 ohms
        current = Math.min(0.03, (forwardBias - vf) / 330);
        isLit = current > 0.001;
      }

      componentResults[comp.id] = {
        current,
        power: forwardBias * current,
        voltageDrop: Math.max(0, forwardBias),
        state: isLit ? `LIT (${(current * 1000).toFixed(1)}mA)` : 'OFF',
      };
    } else if (comp.type === 'npn_bjt') {
      const baseNet = comp.pins[0]?.net;
      const collNet = comp.pins[1]?.net;
      const emitNet = comp.pins[2]?.net;

      const vb = baseNet ? (netVoltages[baseNet] ?? 0) : 0;
      const vc = collNet ? (netVoltages[collNet] ?? 0) : 0;
      const ve = emitNet ? (netVoltages[emitNet] ?? 0) : 0;

      const isConducting = vb - ve >= 0.65;
      const ic = isConducting ? 0.025 : 0.0; // 25mA collector current

      componentResults[comp.id] = {
        current: ic,
        power: vc * ic,
        voltageDrop: isConducting ? 0.2 : vc,
        state: isConducting ? 'SATURATED (ON)' : 'CUTOFF (OFF)',
      };
    }
  }

  // 7. Compute Pin Voltages mapping for every component pin
  for (const comp of components) {
    for (const pin of comp.pins) {
      const pinKey = `${comp.id}:${pin.id}`;
      const v = pin.net ? (netVoltages[pin.net] ?? 0.0) : 0.0;
      pinVoltages[pinKey] = v;
    }
  }

  // 8. Compute Wire Branch Currents
  for (const wire of wires) {
    let i = 0.0;
    if (wire.startPin) {
      const startComp = components.find((c) => c.id === wire.startPin!.componentId);
      if (startComp && componentResults[startComp.id]) {
        i = componentResults[startComp.id].current;
      }
    }
    if (wire.endPin && i === 0) {
      const endComp = components.find((c) => c.id === wire.endPin!.componentId);
      if (endComp && componentResults[endComp.id]) {
        i = componentResults[endComp.id].current;
      }
    }
    wireCurrents[wire.id] = i;
  }

  // 9. Record samples for Probed Nets (for the Virtual Oscilloscope)
  const probedWaveforms = { ...prevState.probedWaveforms };
  const maxSamples = 120; // 120 historic points for waveform buffer

  for (const net of prevState.probedNets) {
    const v = netVoltages[net] ?? 0.0;
    const history = probedWaveforms[net] ? [...probedWaveforms[net]] : [];
    history.push({ time, voltage: v });
    if (history.length > maxSamples) {
      history.shift();
    }
    probedWaveforms[net] = history;
  }

  return {
    ...prevState,
    time,
    netVoltages,
    pinVoltages,
    wireCurrents,
    componentResults,
    probedWaveforms,
  };
}
