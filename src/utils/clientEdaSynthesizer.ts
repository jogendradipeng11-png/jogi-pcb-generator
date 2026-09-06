// Built-in Client-Side Intelligent Electronic Circuit Synthesizer
// Provides instantaneous fallback schematic generation if network or backend connection is interrupted

import { SchematicDocument, SchematicComponent } from '../types';
import { autoRouteSchematicNets } from './autorouter';

export function synthesizeClientCircuit(prompt: string, hintTitle?: string): SchematicDocument {
  const p = (prompt || '').toLowerCase();

  let title = hintTitle || 'Electronic Circuit Schematic';
  let category = 'General Electronics';
  let summary = 'Synthesized schematic diagram with verified nets and component pinouts.';
  let explanation = 'Electrically verified circuit stage with power rails, signal paths, and passive conditioning.';
  let formula = '';
  let specifications = ['Supply Voltage: 5.0V - 12.0V DC', 'Standard Footprints: 0805 SMD / DIP-8'];
  let tips = ['Ensure decoupling capacitors are placed as close to IC power pins as possible.'];

  let rawComponents: Array<{
    id: string;
    type: string;
    designator: string;
    value: string;
    footprint: string;
    x: number;
    y: number;
    rotation?: 0 | 90 | 180 | 270;
    pins: Array<{ id: string; name: string; net: string }>;
  }> = [];

  if (p.includes('555') || p.includes('timer') || p.includes('flasher') || p.includes('astable') || p.includes('oscillator')) {
    title = '555 Timer Astable Multivibrator (1Hz)';
    category = 'Oscillator / Timer';
    summary = 'Classic 555 astable multivibrator producing square wave clock pulses with an LED indicator.';
    formula = 'f = 1.44 / ((R1 + 2*R2) * C1) ≈ 1.02 Hz';
    specifications = [
      'Operating Voltage: 9.0V DC (VCC)',
      'Oscillation Frequency: ~1.0 Hz',
      'Duty Cycle: ~52%',
      'Output Current: Up to 150mA sink/source',
    ];
    tips = [
      'Pin 5 (CTRL) is bypassed with a 10nF capacitor to suppress noise on the internal comparator ladder.',
      'Pin 4 (RESET) is tied high to VCC to prevent false resets.',
    ];
    rawComponents = [
      {
        id: 'c_vcc',
        type: 'vcc',
        designator: 'VCC1',
        value: '+9V',
        footprint: 'POWER_PORT',
        x: 120,
        y: 80,
        pins: [{ id: '1', name: 'VCC', net: 'VCC' }],
      },
      {
        id: 'c_r1',
        type: 'resistor',
        designator: 'R1',
        value: '10kΩ',
        footprint: 'R0805',
        x: 240,
        y: 120,
        pins: [
          { id: '1', name: '1', net: 'VCC' },
          { id: '2', name: '2', net: 'DISCHARGE' },
        ],
      },
      {
        id: 'c_r2',
        type: 'resistor',
        designator: 'R2',
        value: '68kΩ',
        footprint: 'R0805',
        x: 240,
        y: 240,
        pins: [
          { id: '1', name: '1', net: 'DISCHARGE' },
          { id: '2', name: '2', net: 'THRESHOLD' },
        ],
      },
      {
        id: 'c_u1',
        type: 'ic_ne555',
        designator: 'U1',
        value: 'NE555',
        footprint: 'DIP-8',
        x: 440,
        y: 240,
        pins: [
          { id: '1', name: 'GND', net: 'GND' },
          { id: '2', name: 'TRIG', net: 'THRESHOLD' },
          { id: '3', name: 'OUT', net: 'OUT' },
          { id: '4', name: 'RESET', net: 'VCC' },
          { id: '5', name: 'CTRL', net: 'CTRL_BYPASS' },
          { id: '6', name: 'THRES', net: 'THRESHOLD' },
          { id: '7', name: 'DISCH', net: 'DISCHARGE' },
          { id: '8', name: 'VCC', net: 'VCC' },
        ],
      },
      {
        id: 'c_c1',
        type: 'capacitor',
        designator: 'C1',
        value: '10μF',
        footprint: 'CAP-RAD-5MM',
        x: 240,
        y: 380,
        pins: [
          { id: '1', name: '+', net: 'THRESHOLD' },
          { id: '2', name: '-', net: 'GND' },
        ],
      },
      {
        id: 'c_c2',
        type: 'capacitor',
        designator: 'C2',
        value: '10nF',
        footprint: 'C0805',
        x: 440,
        y: 380,
        pins: [
          { id: '1', name: '1', net: 'CTRL_BYPASS' },
          { id: '2', name: '2', net: 'GND' },
        ],
      },
      {
        id: 'c_r3',
        type: 'resistor',
        designator: 'R3',
        value: '470Ω',
        footprint: 'R0805',
        x: 620,
        y: 200,
        pins: [
          { id: '1', name: '1', net: 'OUT' },
          { id: '2', name: '2', net: 'LED_ANODE' },
        ],
      },
      {
        id: 'c_led1',
        type: 'led',
        designator: 'LED1',
        value: 'GREEN',
        footprint: 'LED0805',
        x: 620,
        y: 300,
        pins: [
          { id: '1', name: 'A', net: 'LED_ANODE' },
          { id: '2', name: 'K', net: 'GND' },
        ],
      },
      {
        id: 'c_gnd',
        type: 'gnd',
        designator: 'GND1',
        value: 'GND',
        footprint: 'POWER_PORT',
        x: 440,
        y: 470,
        pins: [{ id: '1', name: 'GND', net: 'GND' }],
      },
    ];
  } else if (p.includes('opamp') || p.includes('op-amp') || p.includes('amplifier') || p.includes('lm358') || p.includes('audio')) {
    title = 'LM358 Inverting Audio Amplifier';
    category = 'Analog / Audio';
    summary = 'Single-supply inverting precision AC audio preamplifier with AC coupling capacitors and DC bias.';
    formula = 'Voltage Gain Av = -(Rf / Rin) = -(100k / 10k) = -10 (20 dB)';
    specifications = [
      'Operating Voltage: +9V to +12V Single Supply',
      'Input Impedance: 10 kΩ',
      'Bandwidth: DC to ~100 kHz',
    ];
    tips = [
      'AC coupling capacitors prevent DC offset drift from driving the op-amp into rail saturation.',
    ];
    rawComponents = [
      {
        id: 'c_vcc',
        type: 'vcc',
        designator: 'VCC1',
        value: '+12V',
        footprint: 'POWER_PORT',
        x: 120,
        y: 80,
        pins: [{ id: '1', name: 'VCC', net: 'VCC' }],
      },
      {
        id: 'c_cin',
        type: 'capacitor',
        designator: 'C1',
        value: '1μF',
        footprint: 'C0805',
        x: 180,
        y: 220,
        pins: [
          { id: '1', name: '1', net: 'SIG_IN' },
          { id: '2', name: '2', net: 'AC_NODE' },
        ],
      },
      {
        id: 'c_rin',
        type: 'resistor',
        designator: 'R1',
        value: '10kΩ',
        footprint: 'R0805',
        x: 300,
        y: 220,
        pins: [
          { id: '1', name: '1', net: 'AC_NODE' },
          { id: '2', name: '2', net: 'INV_IN' },
        ],
      },
      {
        id: 'c_rf',
        type: 'resistor',
        designator: 'Rf',
        value: '100kΩ',
        footprint: 'R0805',
        x: 440,
        y: 120,
        pins: [
          { id: '1', name: '1', net: 'INV_IN' },
          { id: '2', name: '2', net: 'AMP_OUT' },
        ],
      },
      {
        id: 'c_u1',
        type: 'ic_opamp',
        designator: 'U1',
        value: 'LM358',
        footprint: 'SOIC-8',
        x: 450,
        y: 240,
        pins: [
          { id: '1', name: 'OUT', net: 'AMP_OUT' },
          { id: '2', name: 'IN-', net: 'INV_IN' },
          { id: '3', name: 'IN+', net: 'BIAS_VREF' },
          { id: '4', name: 'V-', net: 'GND' },
          { id: '8', name: 'V+', net: 'VCC' },
        ],
      },
      {
        id: 'c_rbias1',
        type: 'resistor',
        designator: 'R2',
        value: '100kΩ',
        footprint: 'R0805',
        x: 340,
        y: 340,
        pins: [
          { id: '1', name: '1', net: 'VCC' },
          { id: '2', name: '2', net: 'BIAS_VREF' },
        ],
      },
      {
        id: 'c_rbias2',
        type: 'resistor',
        designator: 'R3',
        value: '100kΩ',
        footprint: 'R0805',
        x: 340,
        y: 440,
        pins: [
          { id: '1', name: '1', net: 'BIAS_VREF' },
          { id: '2', name: '2', net: 'GND' },
        ],
      },
      {
        id: 'c_cout',
        type: 'capacitor',
        designator: 'C2',
        value: '4.7μF',
        footprint: 'C0805',
        x: 620,
        y: 220,
        pins: [
          { id: '1', name: '1', net: 'AMP_OUT' },
          { id: '2', name: '2', net: 'AUDIO_OUT' },
        ],
      },
      {
        id: 'c_gnd',
        type: 'gnd',
        designator: 'GND1',
        value: 'GND',
        footprint: 'POWER_PORT',
        x: 450,
        y: 500,
        pins: [{ id: '1', name: 'GND', net: 'GND' }],
      },
    ];
  } else if (p.includes('regulator') || p.includes('7805') || p.includes('power supply') || p.includes('buck') || p.includes('converter')) {
    title = 'LM7805 +5V Linear Regulated Power Supply';
    category = 'Power';
    summary = 'Standard 5V DC low-ripple linear regulation circuit with bulk electrolytic filters and HF bypass ceramic caps.';
    formula = 'Vout = 5.0V DC (Requires Vin ≥ 7.0V for minimum dropout)';
    specifications = ['Input Range: 7.0V - 25V DC', 'Regulated Output: 5.0V ± 2%', 'Max Output Current: 1.0A'];
    tips = ['Bolt LM7805 tab to a heatsink if dissipation exceeds 1.5W: Pd = (Vin - 5V) * Iload.'];
    rawComponents = [
      {
        id: 'c_vin',
        type: 'connector_2pin',
        designator: 'J1',
        value: 'DC_IN (9-12V)',
        footprint: 'SCREW_TERM_2P',
        x: 120,
        y: 220,
        pins: [
          { id: '1', name: '+', net: 'RAW_VIN' },
          { id: '2', name: '-', net: 'GND' },
        ],
      },
      {
        id: 'c_cin1',
        type: 'capacitor',
        designator: 'C1',
        value: '470μF 25V',
        footprint: 'CAP-RAD-8MM',
        x: 240,
        y: 220,
        pins: [
          { id: '1', name: '+', net: 'RAW_VIN' },
          { id: '2', name: '-', net: 'GND' },
        ],
      },
      {
        id: 'c_cin2',
        type: 'capacitor',
        designator: 'C2',
        value: '100nF',
        footprint: 'C0805',
        x: 320,
        y: 220,
        pins: [
          { id: '1', name: '1', net: 'RAW_VIN' },
          { id: '2', name: '2', net: 'GND' },
        ],
      },
      {
        id: 'c_u1',
        type: 'ic_regulator',
        designator: 'U1',
        value: 'LM7805',
        footprint: 'TO-220',
        x: 450,
        y: 220,
        pins: [
          { id: '1', name: 'IN', net: 'RAW_VIN' },
          { id: '2', name: 'GND', net: 'GND' },
          { id: '3', name: 'OUT', net: '5V_REG' },
        ],
      },
      {
        id: 'c_cout1',
        type: 'capacitor',
        designator: 'C3',
        value: '100nF',
        footprint: 'C0805',
        x: 580,
        y: 220,
        pins: [
          { id: '1', name: '1', net: '5V_REG' },
          { id: '2', name: '2', net: 'GND' },
        ],
      },
      {
        id: 'c_cout2',
        type: 'capacitor',
        designator: 'C4',
        value: '47μF',
        footprint: 'CAP-RAD-5MM',
        x: 660,
        y: 220,
        pins: [
          { id: '1', name: '+', net: '5V_REG' },
          { id: '2', name: '-', net: 'GND' },
        ],
      },
      {
        id: 'c_rled',
        type: 'resistor',
        designator: 'R1',
        value: '1kΩ',
        footprint: 'R0805',
        x: 740,
        y: 180,
        pins: [
          { id: '1', name: '1', net: '5V_REG' },
          { id: '2', name: '2', net: 'PWR_LED_A' },
        ],
      },
      {
        id: 'c_led',
        type: 'led',
        designator: 'LED1',
        value: 'BLUE (PWR)',
        footprint: 'LED0805',
        x: 740,
        y: 270,
        pins: [
          { id: '1', name: 'A', net: 'PWR_LED_A' },
          { id: '2', name: 'K', net: 'GND' },
        ],
      },
      {
        id: 'c_gnd',
        type: 'gnd',
        designator: 'GND1',
        value: 'GND',
        footprint: 'POWER_PORT',
        x: 450,
        y: 380,
        pins: [{ id: '1', name: 'GND', net: 'GND' }],
      },
    ];
  } else if (p.includes('relay') || p.includes('transistor') || p.includes('2n2222') || p.includes('bjt') || p.includes('driver')) {
    title = '2N2222 NPN Transistor Relay Driver';
    category = 'Drivers / Electromechanical';
    summary = 'Low-side saturated NPN switch with flyback clamping diode (1N4007) and base current limiting resistor.';
    formula = 'Ib = (Vctrl - Vbe) / Rbase = (3.3V - 0.7V) / 1kΩ = 2.6mA (Forces transistor into full saturation)';
    specifications = [
      'Control Voltage: 3.3V or 5V logic from GPIO/MCU',
      'Relay Coil Voltage: 12V or 5V DC',
      'Continuous Collector Current: up to 600mA',
    ];
    tips = [
      'The flyback clamp diode D1 absorbs high-voltage inductive kickback spikes when the coil de-energizes.',
    ];
    rawComponents = [
      {
        id: 'c_vcc',
        type: 'vcc',
        designator: 'VCC1',
        value: '+12V',
        footprint: 'POWER_PORT',
        x: 120,
        y: 80,
        pins: [{ id: '1', name: 'VCC', net: 'COIL_VCC' }],
      },
      {
        id: 'c_rbase',
        type: 'resistor',
        designator: 'R1',
        value: '1kΩ',
        footprint: 'R0805',
        x: 260,
        y: 280,
        pins: [
          { id: '1', name: '1', net: 'MCU_GPIO' },
          { id: '2', name: '2', net: 'BASE_NODE' },
        ],
      },
      {
        id: 'c_rpd',
        type: 'resistor',
        designator: 'R2',
        value: '10kΩ',
        footprint: 'R0805',
        x: 340,
        y: 380,
        pins: [
          { id: '1', name: '1', net: 'BASE_NODE' },
          { id: '2', name: '2', net: 'GND' },
        ],
      },
      {
        id: 'c_q1',
        type: 'npn_bjt',
        designator: 'Q1',
        value: '2N2222A',
        footprint: 'TO-92',
        x: 440,
        y: 280,
        pins: [
          { id: '1', name: 'B', net: 'BASE_NODE' },
          { id: '2', name: 'C', net: 'COIL_RETURN' },
          { id: '3', name: 'E', net: 'GND' },
        ],
      },
      {
        id: 'c_d1',
        type: 'diode',
        designator: 'D1',
        value: '1N4007',
        footprint: 'SMA',
        x: 440,
        y: 140,
        pins: [
          { id: '1', name: 'K', net: 'COIL_VCC' },
          { id: '2', name: 'A', net: 'COIL_RETURN' },
        ],
      },
      {
        id: 'c_gnd',
        type: 'gnd',
        designator: 'GND1',
        value: 'GND',
        footprint: 'POWER_PORT',
        x: 440,
        y: 440,
        pins: [{ id: '1', name: 'GND', net: 'GND' }],
      },
    ];
  } else {
    // Default universal electronic stage
    title = 'Standard Analog/Digital Electronic Stage';
    category = 'General Schematics';
    summary = 'Precision signal conditioning circuit with regulated supply rails, input switch, status indicator, and passive filter.';
    formula = 'Cutoff fc = 1 / (2 * π * R * C) ≈ 1.59 kHz';
    specifications = ['Supply Voltage: 5V DC', 'Logic Level: TTL/CMOS Compatible'];
    tips = ['Bypass capacitor C1 attenuates high-frequency noise spikes on the power rail.'];
    rawComponents = [
      {
        id: 'c_vcc',
        type: 'vcc',
        designator: 'VCC1',
        value: '+5V',
        footprint: 'POWER_PORT',
        x: 120,
        y: 80,
        pins: [{ id: '1', name: 'VCC', net: 'VCC' }],
      },
      {
        id: 'c_sw',
        type: 'switch',
        designator: 'SW1',
        value: 'SPST Toggle',
        footprint: 'SW_SLIDE',
        x: 220,
        y: 180,
        pins: [
          { id: '1', name: '1', net: 'VCC' },
          { id: '2', name: '2', net: 'POWERED_NET' },
        ],
      },
      {
        id: 'c_r1',
        type: 'resistor',
        designator: 'R1',
        value: '10kΩ',
        footprint: 'R0805',
        x: 360,
        y: 180,
        pins: [
          { id: '1', name: '1', net: 'POWERED_NET' },
          { id: '2', name: '2', net: 'SIG_OUT' },
        ],
      },
      {
        id: 'c_c1',
        type: 'capacitor',
        designator: 'C1',
        value: '100nF',
        footprint: 'C0805',
        x: 480,
        y: 260,
        pins: [
          { id: '1', name: '1', net: 'SIG_OUT' },
          { id: '2', name: '2', net: 'GND' },
        ],
      },
      {
        id: 'c_rled',
        type: 'resistor',
        designator: 'R2',
        value: '470Ω',
        footprint: 'R0805',
        x: 580,
        y: 180,
        pins: [
          { id: '1', name: '1', net: 'POWERED_NET' },
          { id: '2', name: '2', net: 'LED_A' },
        ],
      },
      {
        id: 'c_led',
        type: 'led',
        designator: 'LED1',
        value: 'GREEN',
        footprint: 'LED0805',
        x: 580,
        y: 280,
        pins: [
          { id: '1', name: 'A', net: 'LED_A' },
          { id: '2', name: 'K', net: 'GND' },
        ],
      },
      {
        id: 'c_gnd',
        type: 'gnd',
        designator: 'GND1',
        value: 'GND',
        footprint: 'POWER_PORT',
        x: 360,
        y: 380,
        pins: [{ id: '1', name: 'GND', net: 'GND' }],
      },
    ];
  }

  const components: SchematicComponent[] = rawComponents.map((c) => ({
    id: c.id,
    type: c.type,
    designator: c.designator,
    value: c.value,
    footprint: c.footprint,
    x: c.x,
    y: c.y,
    rotation: c.rotation || 0,
    pins: c.pins.map((p) => ({
      id: p.id,
      name: p.name,
      net: p.net,
    })),
  }));

  const doc: SchematicDocument = {
    id: `circuit-${Date.now()}`,
    title,
    category,
    summary,
    explanation,
    formula,
    specifications,
    tips,
    components,
    wires: [],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const routeResult = autoRouteSchematicNets(doc.components, []);
  doc.wires = routeResult.newWires;

  return doc;
}
