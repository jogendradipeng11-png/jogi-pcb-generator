import {
  SchematicComponent,
  Wire,
  SimulationState,
  ComponentSimResult,
  SimulationSample,
  CircuitDiagnosticFault,
  OperatingConditions,
} from '../types';

/**
 * Disjoint Set Union (Union-Find) for electrical net connectivity
 */
class ElectricalNetGraph {
  parent: Map<string, string> = new Map();

  find(item: string): string {
    if (!this.parent.has(item)) {
      this.parent.set(item, item);
      return item;
    }
    const root = this.parent.get(item)!;
    if (root === item) return item;
    const resolved = this.find(root);
    this.parent.set(item, resolved);
    return resolved;
  }

  union(a: string, b: string) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) {
      this.parent.set(rootB, rootA);
    }
  }

  connected(a: string, b: string): boolean {
    return this.find(a) === this.find(b);
  }
}

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
    EARTH: 0.0,
    PE: 0.0,
  };
  const pinVoltages: Record<string, number> = {};
  const wireCurrents: Record<string, number> = {};
  const componentResults: Record<string, ComponentSimResult> = {};
  const warnings: string[] = [];

  const opCond = prevState.operatingConditions;
  const tempC = opCond?.temperature ?? 25;

  // Build Electrical Net Connectivity Graph
  const graph = new ElectricalNetGraph();

  // Register all pins in the graph
  for (const comp of components) {
    for (const pin of comp.pins) {
      const pinKey = `${comp.id}:${pin.id}`;
      if (pin.net && pin.net.trim() !== '' && pin.net !== 'NC') {
        graph.union(pinKey, `NET:${pin.net.toUpperCase()}`);
      }
    }
  }

  // Connect pins through wires
  for (const wire of wires) {
    const startKey = wire.startPin ? `${wire.startPin.componentId}:${wire.startPin.pinId}` : null;
    const endKey = wire.endPin ? `${wire.endPin.componentId}:${wire.endPin.pinId}` : null;

    if (startKey && endKey) {
      graph.union(startKey, endKey);
    }
    if (wire.net && wire.net.trim() !== '') {
      const wireNetKey = `NET:${wire.net.toUpperCase()}`;
      if (startKey) graph.union(startKey, wireNetKey);
      if (endKey) graph.union(endKey, wireNetKey);
    }
  }

  // 1. Identify primary DC power rails and sources
  let primaryVcc = opCond?.supplyVoltage ?? 5.0;

  for (const c of components) {
    const cType = c.type.toLowerCase();
    const cName = (c.name || '').toLowerCase();

    if (
      cType === 'dc_source' ||
      cType === 'battery' ||
      cType === 'battery_18650_pack' ||
      cType === 'battery_holder_2x_18650' ||
      cType === 'battery_li_ion' ||
      cType === 'power_hilink_5m05' ||
      cName.includes('battery') ||
      cName.includes('power supply')
    ) {
      const defaultVoltage =
        cType === 'battery' ? 9.0 :
        cType.includes('18650') ? 7.4 :
        cType.includes('hilink') ? 5.0 :
        12.0;

      const v = c.testSettings?.voltage ?? (opCond?.supplyVoltage ?? parseUnitValue(c.value, defaultVoltage));
      primaryVcc = v;

      const posPin = c.pins.find((p) => p.id === '1' || p.name === '+' || p.name?.toLowerCase().includes('pos') || p.name === 'VCC') || c.pins[0];
      const negPin = c.pins.find((p) => p.id === '2' || p.name === '-' || p.name?.toLowerCase().includes('neg') || p.name === 'GND') || c.pins[1];

      const posNet = posPin?.net || 'VCC';
      const negNet = negPin?.net || 'GND';

      netVoltages[posNet] = v;
      netVoltages[negNet] = 0.0;
      netVoltages['VCC'] = v;

      if (posPin) {
        graph.union(`${c.id}:${posPin.id}`, 'NET:VCC');
      }
      if (negPin) {
        graph.union(`${c.id}:${negPin.id}`, 'NET:GND');
      }

      componentResults[c.id] = {
        current: 0.08,
        power: v * 0.08,
        voltageDrop: v,
        state: `SOURCE ${formatVoltage(v)} (+ / -)`,
      };
    } else if (cType === 'source_pos_point') {
      const v = c.testSettings?.voltage ?? (opCond?.supplyVoltage ?? parseUnitValue(c.value, 12.0));
      primaryVcc = v;
      const posNet = c.pins[0]?.net || 'VCC';
      netVoltages[posNet] = v;
      netVoltages['VCC'] = v;
      if (c.pins[0]) graph.union(`${c.id}:${c.pins[0].id}`, 'NET:VCC');
    } else if (cType === 'source_neg_point' || cType === 'earth_ground' || cType === 'gnd') {
      const negNet = c.pins[0]?.net || 'GND';
      netVoltages[negNet] = 0.0;
      netVoltages['GND'] = 0.0;
      netVoltages['EARTH'] = 0.0;
      netVoltages['PE'] = 0.0;
      if (c.pins[0]) graph.union(`${c.id}:${c.pins[0].id}`, 'NET:GND');
    } else if (cType === 'vcc' || cType === 'vcc_3v3' || cType === 'vcc_5v' || cType === 'vcc_12v') {
      const defaultVal = cType === 'vcc_3v3' ? 3.3 : cType === 'vcc_12v' ? 12.0 : 5.0;
      const v = c.testSettings?.voltage ?? (opCond?.supplyVoltage ?? parseUnitValue(c.value, defaultVal));
      netVoltages['VCC'] = v;
      netVoltages[cType === 'vcc_3v3' ? '+3.3V' : cType === 'vcc_12v' ? '+12V' : '+5V'] = v;
      primaryVcc = v;
      if (c.pins[0]) graph.union(`${c.id}:${c.pins[0].id}`, 'NET:VCC');
    }
  }

  // Propagate VCC and GND roots through the graph
  const rootVcc = graph.find('NET:VCC');
  const rootGnd = graph.find('NET:GND');

  // Check for DEAD SHORT CIRCUIT between VCC and GND
  if (rootVcc && rootGnd && rootVcc === rootGnd) {
    warnings.push('🚨 DEAD SHORT CIRCUIT: Direct connection detected between VCC (+Power) and GND (Ground)! Extreme current will melt traces and burn power supply.');
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

    let vout = 5.0;
    let state = 'NORMAL';
    if (vin < 7.0) {
      vout = Math.max(0, vin - 2.0);
      state = 'DROPOUT';
    }

    netVoltages[outNet] = vout;
    if (outPin) {
      graph.union(`${reg.id}:${outPin.id}`, 'NET:+5V');
    }
    const loadCurrent = opCond?.loadCondition === 'heavy' ? 0.15 : opCond?.loadCondition === 'no_load' ? 0.005 : 0.05;
    const power = Math.max(0, vin - vout) * loadCurrent;

    componentResults[reg.id] = {
      current: loadCurrent,
      power,
      voltageDrop: vin - vout,
      state,
      isOverloaded: power > 1.5,
    };
  }

  // 3. Identify NE555 Timer Astable Oscillators
  const ne555 = components.find((c) => c.type === 'ic_ne555');
  if (ne555) {
    const dischPin = ne555.pins.find((p) => p.name === 'DISCH' || p.id === '7');
    const resetPin = ne555.pins.find((p) => p.name === 'RESET' || p.id === '4');
    const gndPin = ne555.pins.find((p) => p.name === 'GND' || p.id === '1');
    const vccPinNet = ne555.pins.find((p) => p.id === '8' || p.name === 'VCC')?.net;
    const vcc = vccPinNet ? (netVoltages[vccPinNet] ?? primaryVcc) : primaryVcc;

    const isDischConnected = Boolean(dischPin?.net && dischPin.net.trim() !== '');
    const resetNetV = resetPin?.net ? (netVoltages[resetPin.net] ?? primaryVcc) : primaryVcc;
    const isResetAsserted = resetPin?.net ? resetNetV < 0.8 : false;
    const gndNetV = gndPin?.net ? (netVoltages[gndPin.net] ?? 0) : 0;
    const isGndMiswired = gndPin?.net ? gndNetV > 1.5 : false;

    if (!isDischConnected) {
      warnings.push(
        '⚠️ NE555 Error: Pin 7 (DISCH) is disconnected! The timing capacitor cannot discharge, halting oscillation (0.0Hz). Connect Pin 7 between R1 and R2.'
      );
    }
    if (isResetAsserted) {
      warnings.push(
        '⚠️ NE555 Error: Pin 4 (RESET) is LOW or connected to the timing node! Connect RESET (Pin 4) directly to VCC (+V) for astable operation.'
      );
    }
    if (isGndMiswired) {
      warnings.push(
        `⚠️ NE555 Error: Pin 1 (GND) is at ${gndNetV.toFixed(1)}V! Connect Pin 1 directly to 0V ground.`
      );
    }

    const canOscillate = isDischConnected && !isResetAsserted && !isGndMiswired;

    const r1Comp = components.find((c) => c.designator === 'R1') || components.find((c) => c.type === 'resistor');
    const r2Comp = components.find((c) => c.designator === 'R2');
    const c1Comp = components.find((c) => c.designator === 'C1') || components.find((c) => c.type === 'capacitor');

    const r1Val = r1Comp?.testSettings?.resistance ?? (r1Comp ? parseUnitValue(r1Comp.value, 10000) : 10000);
    const r2Val = r2Comp?.testSettings?.resistance ?? (r2Comp ? parseUnitValue(r2Comp.value, 47000) : 47000);
    const c1Val = c1Comp?.testSettings?.capacitance ?? (c1Comp ? parseUnitValue(c1Comp.value, 10e-6) : 10e-6);

    const tHigh = 0.693 * (r1Val + r2Val) * c1Val;
    const tLow = 0.693 * r2Val * c1Val;
    const period = Math.max(0.0001, tHigh + tLow);
    const realFreq = canOscillate ? (1 / period) : 0.0;
    const dutyCycle = canOscillate ? ((tHigh / period) * 100) : 0.0;

    const visualPeriod = Math.max(0.4, Math.min(3.0, period));
    const phase = (time % visualPeriod) / visualPeriod;
    const isHigh = canOscillate ? (phase < (tHigh / period)) : false;

    const vOut = isHigh ? Math.max(0, vcc - 1.35) : 0.08;
    const outNet = ne555.pins.find((p) => p.id === '3' || p.name === 'OUT')?.net || 'OUT_555';
    netVoltages[outNet] = vOut;

    const vCapMin = vcc / 3;
    const vCapMax = (2 * vcc) / 3;
    let vCap = vCapMin;
    if (canOscillate) {
      if (isHigh) {
        const chargeRatio = phase / (tHigh / period);
        vCap = vCapMin + (vCapMax - vCapMin) * (1 - Math.exp(-3 * chargeRatio));
      } else {
        const dischargeRatio = (phase - (tHigh / period)) / (1 - (tHigh / period));
        vCap = vCapMax - (vCapMax - vCapMin) * (1 - Math.exp(-3 * dischargeRatio));
      }
    } else {
      vCap = !isDischConnected ? vCapMax : 0.0;
    }

    const trigNet = ne555.pins.find((p) => p.id === '2' || p.name === 'TRIG')?.net;
    if (trigNet) netVoltages[trigNet] = vCap;
    const threshNet = ne555.pins.find((p) => p.id === '6' || p.name === 'THRES')?.net;
    if (threshNet) netVoltages[threshNet] = vCap;

    componentResults[ne555.id] = {
      current: 0.015,
      power: vcc * 0.015,
      voltageDrop: vcc,
      frequency: realFreq,
      dutyCycle,
      state: !canOscillate
        ? 'STALLED (0.0Hz - Wiring Error)'
        : isHigh
        ? 'OUTPUT HIGH'
        : 'OUTPUT LOW',
      isOverloaded: !canOscillate,
      warning: !canOscillate ? 'Oscillation halted due to wiring fault' : undefined,
    };
  }

  // Helper to resolve voltage for any pin
  const getPinVoltage = (compId: string, pinId: string): number => {
    const pinKey = `${compId}:${pinId}`;
    const comp = components.find((c) => c.id === compId);
    const pin = comp?.pins.find((p) => p.id === pinId);

    // Direct net lookup
    if (pin?.net && netVoltages[pin.net] !== undefined) {
      return netVoltages[pin.net];
    }
    // Graph connectivity lookup
    const root = graph.find(pinKey);
    if (root === rootVcc) return primaryVcc;
    if (root === rootGnd) return 0.0;

    // Check if connected to any known net
    for (const [netName, v] of Object.entries(netVoltages)) {
      if (graph.find(`NET:${netName.toUpperCase()}`) === root) {
        return v;
      }
    }
    return 0.0;
  };

  // 4. Switches and Pushbuttons
  const switches = components.filter((c) => c.type === 'switch' || c.type === 'pushbutton' || c.type === 'switch_spst');
  for (const sw of switches) {
    const isClosed = opCond?.switchStates?.[sw.id] ?? (sw.testSettings?.isClosed ?? true);
    const p1 = sw.pins[0];
    const p2 = sw.pins[1];

    if (p1 && p2 && isClosed) {
      graph.union(`${sw.id}:${p1.id}`, `${sw.id}:${p2.id}`);
    }

    componentResults[sw.id] = {
      current: isClosed ? 0.02 : 0.0,
      power: 0.0,
      voltageDrop: 0.0,
      state: isClosed ? 'CLOSED (ON)' : 'OPEN (OFF)',
    };
  }

  // 5. Simulate Resistors
  for (const comp of components) {
    if (comp.type === 'resistor' || comp.type === 'potentiometer' || comp.type === 'pot') {
      const p1 = comp.pins[0];
      const p2 = comp.pins[1];
      const v1 = p1 ? getPinVoltage(comp.id, p1.id) : 0;
      const v2 = p2 ? getPinVoltage(comp.id, p2.id) : 0;

      const vDrop = Math.abs(v1 - v2);
      let rVal = comp.testSettings?.resistance ?? parseUnitValue(comp.value, 1000);
      if (comp.type === 'potentiometer' || comp.type === 'pot') {
        const wiper = comp.testSettings?.wiper ?? 0.5;
        rVal = Math.max(10, rVal * wiper);
      }

      const current = rVal > 0 ? vDrop / rVal : 0;
      const power = vDrop * current;
      const maxPower = comp.testSettings?.maxPowerRating ?? 0.25;

      let isOverloaded = false;
      let isBurnedOut = false;
      let faultType: ComponentSimResult['faultType'] = undefined;
      let faultMessage: string | undefined = undefined;
      let remedy: string | undefined = undefined;

      if (power > 2 * maxPower && vDrop > 2.0) {
        isBurnedOut = true;
        isOverloaded = true;
        faultType = 'resistor_burnout';
        faultMessage = `🔥 RESISTOR BURNT OUT: ${comp.designator || comp.name} dissipating ${power.toFixed(2)}W (exceeds ${maxPower}W rating)! Carbon film burned.`;
        remedy = `Replace ${comp.designator || comp.name} with a higher wattage power resistor (0.5W, 1W) or increase resistance.`;
        warnings.push(faultMessage);
      } else if (power > maxPower) {
        isOverloaded = true;
        faultType = 'overcurrent';
        faultMessage = `⚠️ RESISTOR OVERHEATING: ${comp.designator || comp.name} dissipating ${power.toFixed(2)}W (> ${maxPower}W rating). Running dangerously hot!`;
        remedy = `Use a 0.5W or 1W rated resistor or reduce current.`;
        warnings.push(faultMessage);
      }

      componentResults[comp.id] = {
        current,
        power,
        voltageDrop: vDrop,
        state: isBurnedOut ? `🔥 BURNT (${power.toFixed(2)}W)` : isOverloaded ? `⚠️ HOT (${power.toFixed(2)}W)` : `${formatCurrent(current)} (${formatPower(power)})`,
        isOverloaded,
        isBurnedOut,
        faultType,
        faultMessage,
        remedy,
      };
    }
  }

  // 6. Simulate Polarized Capacitors
  for (const comp of components) {
    if (comp.type === 'polarized_capacitor' || comp.type === 'capacitor_electrolytic') {
      const posPin = comp.pins.find((p) => p.name === '+' || p.id === '1') || comp.pins[0];
      const negPin = comp.pins.find((p) => p.name === '-' || p.id === '2') || comp.pins[1];

      const vPos = posPin ? getPinVoltage(comp.id, posPin.id) : 0;
      const vNeg = negPin ? getPinVoltage(comp.id, negPin.id) : 0;
      const reverseBias = vNeg - vPos;

      let isBurnedOut = false;
      let faultType: ComponentSimResult['faultType'] = undefined;
      let faultMessage: string | undefined = undefined;
      let remedy: string | undefined = undefined;

      if (reverseBias > 0.8) {
        isBurnedOut = true;
        faultType = 'capacitor_explosion';
        faultMessage = `💥 CAPACITOR EXPLOSION RISK: Polarized capacitor ${comp.designator || comp.name} connected backwards (${reverseBias.toFixed(1)}V reverse bias)! Boiling electrolyte will rupture can.`;
        remedy = `Reverse capacitor pins: connect positive (+) lead to higher DC voltage and negative (-) lead to 0V ground.`;
        warnings.push(faultMessage);
      }

      componentResults[comp.id] = {
        current: 0.0001,
        power: 0.0,
        voltageDrop: Math.abs(vPos - vNeg),
        state: isBurnedOut ? '💥 REVERSE BURST' : 'CHARGED',
        isOverloaded: isBurnedOut,
        isBurnedOut,
        faultType,
        faultMessage,
        remedy,
      };
    }
  }

  // 7. Simulate LEDs (ALL LED variants, colors, indicators)
  for (const comp of components) {
    const isLed =
      comp.type === 'led' ||
      comp.type.startsWith('led_') ||
      comp.type.includes('led') ||
      (comp.name && comp.name.toLowerCase().includes('led'));

    const isDiode = comp.type === 'diode' || comp.type === 'zener_diode';

    if (isLed || isDiode) {
      const anodePin =
        comp.pins.find(
          (p) =>
            p.name === 'A' ||
            p.name === '+' ||
            p.id === '1' ||
            p.name?.toLowerCase().includes('anode')
        ) || comp.pins[0];

      const cathodePin =
        comp.pins.find(
          (p) =>
            p.name === 'K' ||
            p.name === '-' ||
            p.id === '2' ||
            p.name?.toLowerCase().includes('cathode')
        ) || comp.pins[1];

      const vA = anodePin ? getPinVoltage(comp.id, anodePin.id) : 0;
      const vK = cathodePin ? getPinVoltage(comp.id, cathodePin.id) : 0;

      const thermalShift = (tempC - 25) * -0.002;
      const baseVf = comp.testSettings?.forwardVoltage ?? (isLed ? 1.85 : 0.65);
      const vf = Math.max(0.15, baseVf + thermalShift);
      const forwardBias = vA - vK;
      const reverseBias = vK - vA;

      // Find series resistor connected in branch
      let seriesR = 0;
      let hasSeriesResistor = false;

      const anodeRoot = anodePin ? graph.find(`${comp.id}:${anodePin.id}`) : null;
      const cathodeRoot = cathodePin ? graph.find(`${comp.id}:${cathodePin.id}`) : null;

      const seriesResistor = components.find((c) => {
        if (c.id === comp.id) return false;
        if (c.type !== 'resistor' && c.type !== 'potentiometer' && c.type !== 'pot') return false;
        return c.pins.some((p) => {
          const rPinKey = `${c.id}:${p.id}`;
          const rRoot = graph.find(rPinKey);
          return rRoot === anodeRoot || rRoot === cathodeRoot;
        });
      });

      if (seriesResistor) {
        hasSeriesResistor = true;
        seriesR = parseUnitValue(seriesResistor.value, 470);
        if (seriesResistor.type === 'potentiometer' || seriesResistor.type === 'pot') {
          seriesR = Math.max(10, seriesR * (seriesResistor.testSettings?.wiper ?? 0.5));
        }
      } else {
        // Direct connection without limiting resistor (only internal forward resistance ~15-20 ohms)
        seriesR = 18;
      }

      let current = 0.0;
      let isLit = false;
      let isOverloaded = false;
      let isBurnedOut = false;
      let faultType: ComponentSimResult['faultType'] = undefined;
      let faultMessage: string | undefined = undefined;
      let remedy: string | undefined = undefined;

      if (forwardBias > vf) {
        current = (forwardBias - vf) / seriesR;
        isLit = current > 0.0005;

        if (isLed) {
          // Check for BURNOUT: > 25mA OR direct connection to >= 2.5V without series resistor
          if (current > 0.025 || (!hasSeriesResistor && forwardBias >= 2.4)) {
            isOverloaded = true;
            isBurnedOut = true;
            faultType = 'led_burnout';
            const currentmA = (current * 1000).toFixed(0);
            faultMessage = `🔥 CRITICAL BURNOUT: LED ${comp.designator || comp.name} BURST! Current (${currentmA}mA > 25mA rating) melted the internal bond wire. Missing series current-limiting resistor!`;
            remedy = `Add a 220Ω to 1kΩ resistor in series with the LED (between VCC and Anode) to safely limit current to ~10-15mA.`;
            warnings.push(faultMessage);
          } else if (current > 0.020) {
            isOverloaded = true;
            faultType = 'overcurrent';
            const currentmA = (current * 1000).toFixed(1);
            faultMessage = `⚠️ OVERCURRENT: LED ${comp.designator || comp.name} current (${currentmA}mA) exceeds 20mA rating. High risk of thermal degradation!`;
            remedy = `Increase series resistor value (e.g. to 330Ω or 470Ω) to keep current below 20mA.`;
            warnings.push(faultMessage);
          }
        }
      } else if (reverseBias > 5.0 && isLed) {
        // Reverse breakdown on LED (> 5V destroys standard PN diode junction)
        isOverloaded = true;
        isBurnedOut = true;
        faultType = 'reverse_breakdown';
        faultMessage = `⚡ REVERSE BREAKDOWN: LED ${comp.designator || comp.name} destroyed! Reverse voltage (${reverseBias.toFixed(1)}V > 5.0V max) caused junction breakdown!`;
        remedy = `Reverse LED orientation: connect Anode (A / +) to positive voltage and Cathode (K / -) to 0V ground.`;
        warnings.push(faultMessage);
      }

      let stateText = 'OFF';
      if (isBurnedOut) {
        stateText = faultType === 'reverse_breakdown' ? `💥 REVERSE BURST (${reverseBias.toFixed(1)}V)` : `🔥 BURST (${(current * 1000).toFixed(0)}mA)`;
      } else if (isOverloaded) {
        stateText = `⚠️ OVERLOAD (${(current * 1000).toFixed(1)}mA)`;
      } else if (isLit) {
        stateText = `LIT (${(current * 1000).toFixed(1)}mA)`;
      }

      componentResults[comp.id] = {
        current,
        power: Math.max(0, forwardBias * current),
        voltageDrop: Math.max(0, forwardBias),
        state: stateText,
        isOverloaded,
        isBurnedOut,
        faultType,
        faultMessage,
        remedy,
        warning: faultMessage,
      };
    }
  }

  // 8. Compute Pin Voltages mapping for every component pin
  for (const comp of components) {
    for (const pin of comp.pins) {
      const pinKey = `${comp.id}:${pin.id}`;
      pinVoltages[pinKey] = getPinVoltage(comp.id, pin.id);
    }
  }

  // 9. Compute Wire Branch Currents
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

  // 10. Record samples for Probed Nets, Wires, and Pins
  const probedWaveforms = { ...prevState.probedWaveforms };
  const maxSamples = 160;

  for (const probeKey of prevState.probedNets) {
    let v = 0.0;
    let i = 0.0;

    if (probeKey.startsWith('wire:')) {
      const wireId = probeKey.slice(5);
      const wire = wires.find((w) => w.id === wireId);
      v = wire && wire.net ? (netVoltages[wire.net] ?? 0.0) : 0.0;
      i = wire ? (wireCurrents[wire.id] ?? 0.0) : 0.0;
    } else if (probeKey.startsWith('pin:')) {
      const pinKey = probeKey.slice(4);
      v = pinVoltages[pinKey] ?? 0.0;
      const colonIdx = pinKey.indexOf(':');
      const compId = colonIdx !== -1 ? pinKey.slice(0, colonIdx) : pinKey;
      const comp = components.find((c) => c.id === compId);
      i = comp && componentResults[comp.id] ? componentResults[comp.id].current : 0.0;
    } else {
      v = netVoltages[probeKey] ?? 0.0;
      for (const wire of wires) {
        if (wire.net === probeKey && wireCurrents[wire.id]) {
          i = Math.max(i, wireCurrents[wire.id]);
        }
      }
      if (i === 0.0) {
        for (const comp of components) {
          if (comp.pins.some((p) => p.net === probeKey) && componentResults[comp.id]) {
            i = Math.max(i, componentResults[comp.id].current);
          }
        }
      }
    }

    const history = probedWaveforms[probeKey] ? [...probedWaveforms[probeKey]] : [];
    history.push({ time, voltage: v, current: i });
    if (history.length > maxSamples) {
      history.shift();
    }
    probedWaveforms[probeKey] = history;
  }

  return {
    ...prevState,
    time,
    netVoltages,
    pinVoltages,
    wireCurrents,
    componentResults,
    probedWaveforms,
    warnings,
    activeScenarioId: prevState.activeScenarioId,
    activeScenarioName: prevState.activeScenarioName,
    operatingConditions: prevState.operatingConditions,
  };
}

/**
 * Diagnostic Health & Fault Checker:
 * Tests any circuit instantly and returns all detected burnouts, overcurrents, shorts, and solutions.
 */
export function runCircuitDiagnosticTest(
  components: SchematicComponent[],
  wires: Wire[],
  operatingConditions?: OperatingConditions
): {
  isHealthy: boolean;
  faults: CircuitDiagnosticFault[];
  summary: string;
  componentResults: Record<string, ComponentSimResult>;
  warnings: string[];
} {
  const dummyState: SimulationState = {
    isRunning: true,
    time: 0.1,
    speed: 1,
    netVoltages: {},
    pinVoltages: {},
    wireCurrents: {},
    componentResults: {},
    probedNets: [],
    probedWaveforms: {},
    warnings: [],
    operatingConditions,
  };

  const simResult = stepCircuitSimulation(components, wires, dummyState, 0.05);
  const faults: CircuitDiagnosticFault[] = [];

  for (const comp of components) {
    const res = simResult.componentResults[comp.id];
    if (!res) continue;

    if (res.isBurnedOut || res.isOverloaded) {
      const isCritical = Boolean(res.isBurnedOut);
      let title = isCritical ? `💥 Component Damaged: ${comp.designator || comp.name}` : `⚠️ Overload Warning: ${comp.designator || comp.name}`;
      let measured = `${formatCurrent(res.current)}, ${res.voltageDrop.toFixed(2)}V`;
      let limit = '25mA max';

      if (res.faultType === 'led_burnout') {
        title = `🔥 LED ${comp.designator || comp.name} BURST / BURNT OUT`;
        measured = `${(res.current * 1000).toFixed(0)}mA`;
        limit = '25mA max continuous';
      } else if (res.faultType === 'reverse_breakdown') {
        title = `⚡ LED ${comp.designator || comp.name} REVERSE BREAKDOWN`;
        measured = `${res.voltageDrop.toFixed(1)}V reverse bias`;
        limit = '5.0V max reverse';
      } else if (res.faultType === 'resistor_burnout') {
        title = `🔥 RESISTOR ${comp.designator || comp.name} BURNT OUT`;
        measured = `${res.power.toFixed(2)}W`;
        limit = '0.25W max rating';
      } else if (res.faultType === 'capacitor_explosion') {
        title = `💥 CAPACITOR ${comp.designator || comp.name} EXPLOSION RISK`;
        measured = 'Reverse Polarity';
        limit = '0.0V reverse';
      }

      faults.push({
        componentId: comp.id,
        designator: comp.designator || comp.name,
        componentType: comp.type,
        faultType: res.faultType || (isCritical ? 'led_burnout' : 'overcurrent'),
        severity: isCritical ? 'critical' : 'warning',
        title,
        description: res.faultMessage || res.warning || `${comp.designator || comp.name} operating beyond safe electrical thresholds.`,
        measured,
        limit,
        remedy: res.remedy || 'Check wiring and ratings.',
      });
    }
  }

  // Check for short circuits in warnings
  const shortWarning = simResult.warnings?.find((w) => w.includes('DEAD SHORT CIRCUIT'));
  if (shortWarning) {
    faults.unshift({
      componentId: 'circuit_short',
      designator: 'VCC-GND',
      componentType: 'wire',
      faultType: 'short_circuit',
      severity: 'critical',
      title: '🚨 DEAD SHORT CIRCUIT DETECTED',
      description: shortWarning,
      measured: '0.00 Ω direct path',
      limit: 'Must have load resistance',
      remedy: 'Remove direct short wire between positive power rail and 0V ground.',
    });
  }

  const isHealthy = faults.length === 0;
  const summary = isHealthy
    ? `✅ Circuit test passed! All ${components.length} components and ${wires.length} connections are operating safely within electrical limits.`
    : `🔥 Found ${faults.length} electrical fault${faults.length > 1 ? 's' : ''} in the circuit! Inspect damaged components highlighted in red on canvas.`;

  return {
    isHealthy,
    faults,
    summary,
    componentResults: simResult.componentResults,
    warnings: simResult.warnings || [],
  };
}
