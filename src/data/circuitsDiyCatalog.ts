import { SchematicDocument, SchematicComponent, Wire } from '../types';
import { synthesizeClientCircuit } from '../utils/clientEdaSynthesizer';

export interface CircuitsDiyProject {
  id: string;
  title: string;
  slug: string;
  directUrl: string;
  category:
    | 'Power & Switching'
    | 'Timers & Multivibrators'
    | 'Sensors & Detectors'
    | 'Battery & Chargers'
    | 'Audio & Amplifiers'
    | 'Inverters & Converters'
    | 'Regulators & Supplies';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  tags: string[];
  summary: string;
  formula?: string;
  specifications: string[];
  tips: string[];
  keyComponents: {
    name: string;
    designator: string;
    package: string;
    pinoutSummary: string;
    uses: string;
  }[];
  promptQuery: string;
}

export const CIRCUITS_DIY_PROJECTS: CircuitsDiyProject[] = [
  {
    id: 'cdiy-moc3021-ssr',
    title: 'Solid State Relay using MOC3021 Optoisolator & TRIAC',
    slug: 'solid-state-relay-moc3021-optoisolator',
    directUrl:
      'https://www.circuits-diy.com/wp-content/uploads/2020/12/Solid-State-Relay-MOC3021-Optoisolator.png',
    category: 'Power & Switching',
    difficulty: 'Intermediate',
    tags: ['MOC3021', 'Optoisolator', 'TRIAC', 'BT136', 'SSR', '230VAC', 'AC Switching', 'Snubber'],
    summary:
      'Optically isolated solid state relay (SSR) using MOC3021 random-phase phototriac optoisolator and BT136/BTA16 TRIAC. Provides 7,500V galvanic isolation between low-voltage 3.3V/5V DC microcontrollers and high-voltage 230V AC mains loads.',
    formula:
      'I_LED = (V_ctrl - V_f) / R1 = (5V - 1.2V) / 330Ω ≈ 11.5mA | dv/dt = V_peak / (R_snub * C_snub)',
    specifications: [
      'Input Control: 3.3V - 5V DC logic level (Arduino, ESP32, Raspberry Pi compatible)',
      'Galvanic Isolation: 7,500V Peak optical barrier',
      'AC Mains Output: 110V - 240V AC, 50/60Hz',
      'Load Switching Capacity: Up to 4A (BT136) or 16A (BTA16) resistive/inductive',
      'Transient Protection: 39Ω 1W + 10nF 400V RC snubber suppresses inductive flyback',
    ],
    tips: [
      'Always maintain physical creepage distance (minimum 6mm) between DC control tracks and 230V AC traces on the PCB.',
      'For inductive loads like AC motors or fans, the RC snubber network across TRIAC MT1 and MT2 is mandatory to avoid false dv/dt triggering.',
      'Mount an aluminum heatsink to the TO-220 tab if switching loads greater than 200W.',
    ],
    keyComponents: [
      {
        name: 'MOC3021 Optoisolator',
        designator: 'U1',
        package: 'DIP-6',
        pinoutSummary: 'Pin 1: Anode, Pin 2: Cathode, Pin 4: Main Terminal, Pin 6: Triac Trigger',
        uses: 'Safe optical coupling between low-voltage DC logic and 230V AC mains trigger circuits.',
      },
      {
        name: 'BT136-600E TRIAC',
        designator: 'Q1',
        package: 'TO-220',
        pinoutSummary: 'Pin 1: MT1 (Main Terminal 1), Pin 2: MT2 (Main Terminal 2), Pin 3: Gate (G)',
        uses: 'Bidirectional AC mains load switching for lights, heaters, and AC motors.',
      },
      {
        name: 'RC Snubber (39Ω + 10nF 400V)',
        designator: 'R3 / C1',
        package: 'R2512 / Film 400V',
        pinoutSummary: 'Connected in series across TRIAC MT1 and MT2',
        uses: 'Clamps high dv/dt transient voltage spikes caused by inductive load switching.',
      },
    ],
    promptQuery:
      'https://www.circuits-diy.com/wp-content/uploads/2020/12/Solid-State-Relay-MOC3021-Optoisolator.png solid state relay moc3021 optoisolator triac',
  },
  {
    id: 'cdiy-555-astable-flasher',
    title: 'NE555 Astable Multivibrator 1Hz LED Flasher',
    slug: '555-timer-flasher-circuit',
    directUrl: 'https://www.circuits-diy.com/555-timer-flasher-circuit/',
    category: 'Timers & Multivibrators',
    difficulty: 'Beginner',
    tags: ['NE555', 'Timer', 'Astable', 'LED Flasher', 'Pulse Generator', 'Oscillator'],
    summary:
      'Classic NE555 timer configured in astable multivibrator mode generating clean continuous square waves at ~1Hz to flash indicator LEDs with adjustable duty cycle.',
    formula:
      'f = 1.44 / ((R1 + 2*R2) * C1) | High Time t1 = 0.693 * (R1 + R2) * C1 | Low Time t2 = 0.693 * R2 * C1',
    specifications: [
      'Operating Voltage: 4.5V - 15V DC',
      'Flash Frequency: ~1.0 Hz (approx 1 flash per second)',
      'Output Drive Current: up to 200mA sink/source (can drive relays or buzzer directly)',
      'Duty Cycle: ~55% with R1=10kΩ, R2=47kΩ, C1=10µF',
    ],
    tips: [
      'Connect Pin 4 (RESET) to VCC to prevent unintended resets caused by stray electromagnetic noise.',
      'Bypass Pin 5 (Control Voltage) to GND with a 10nF ceramic capacitor for optimal timing stability.',
      'Ensure a 100nF decoupling capacitor is placed between Pin 8 (VCC) and Pin 1 (GND).',
    ],
    keyComponents: [
      {
        name: 'NE555P Precision Timer',
        designator: 'U1',
        package: 'DIP-8',
        pinoutSummary: 'Pin 1: GND, Pin 2: TRIG, Pin 3: OUT, Pin 4: RESET, Pin 5: CTRL, Pin 6: THRES, Pin 7: DISCH, Pin 8: VCC',
        uses: 'Timing pulse generation, oscillator, and waveform generation.',
      },
      {
        name: 'Electrolytic Timing Cap 10µF',
        designator: 'C1',
        package: 'Radial 5mm',
        pinoutSummary: 'Pin 1: + (Threshold/Trigger), Pin 2: - (GND)',
        uses: 'Charges and discharges via R1 and R2 to set the oscillation frequency.',
      },
    ],
    promptQuery: 'ne555 astable 1hz led flasher timer circuit',
  },
  {
    id: 'cdiy-ldr-dark-detector',
    title: 'Light-Activated Relay Switch (LDR Dark Sensor)',
    slug: 'automatic-street-light-control-circuit',
    directUrl: 'https://www.circuits-diy.com/automatic-street-light-control-circuit/',
    category: 'Sensors & Detectors',
    difficulty: 'Beginner',
    tags: ['LDR', 'Photoresistor', 'Dark Sensor', '2N2222', 'Relay', 'Night Light'],
    summary:
      'Automatic dark detection and night-light trigger circuit utilizing a photoresistor (LDR), potentiometer threshold adjustment, 2N2222 NPN transistor driver, and 12V electromechanical relay with flyback diode protection.',
    formula:
      'V_base = Vcc * [R_ldr / (R_ldr + R_pot)]. In darkness, R_ldr increases -> V_base > 0.7V -> Transistor saturates -> Relay triggers.',
    specifications: [
      'Operating Voltage: 9V - 12V DC',
      'Trigger Threshold: Tunable via 50kΩ multi-turn potentiometer',
      'Relay Contacts: 10A / 250VAC SPDT',
      'Protection: 1N4007 flyback diode clamps coil inductive kickback',
    ],
    tips: [
      'Shield the LDR sensor from the controlled lamp/LED to prevent optical feedback oscillation (flickering).',
      'Always install a 1N4007 clamp diode across the relay coil to protect the 2N2222 transistor from back-EMF spikes.',
    ],
    keyComponents: [
      {
        name: 'LDR Photoresistor',
        designator: 'LDR1',
        package: '5mm LDR',
        pinoutSummary: 'Pin 1 & Pin 2 (Non-polarized passive resistor)',
        uses: 'Light-to-resistance transducer; drops to ~500Ω in daylight and rises to >1MΩ in complete dark.',
      },
      {
        name: '2N2222A NPN Transistor',
        designator: 'Q1',
        package: 'TO-92',
        pinoutSummary: 'Pin 1: Emitter (GND), Pin 2: Base (Input), Pin 3: Collector (Relay Coil -)',
        uses: 'Switches the 12V relay coil on and off using small base current.',
      },
      {
        name: '12V SPDT Relay',
        designator: 'RLY1',
        package: 'RELAY-SPDT',
        pinoutSummary: 'Coil 1, Coil 2, Common (COM), Normally Open (NO), Normally Closed (NC)',
        uses: 'Galvanically switches high-power 230V AC streetlights or DC lamps.',
      },
    ],
    promptQuery: 'ldr dark sensor light activated relay switch 2n2222',
  },
  {
    id: 'cdiy-lm358-battery-charger',
    title: '12V Lead-Acid / Li-Ion Battery Auto Cut-Off Charger (LM358)',
    slug: 'automatic-battery-charger-circuit',
    directUrl: 'https://www.circuits-diy.com/automatic-battery-charger-circuit/',
    category: 'Battery & Chargers',
    difficulty: 'Intermediate',
    tags: ['LM358', 'Battery Charger', 'Auto Cutoff', 'Comparator', 'Zener', 'Relay'],
    summary:
      'Intelligent automatic battery charger controller based on the LM358 dual operational amplifier configured as a voltage comparator with a precise 5.1V Zener voltage reference, auto-disconnecting charging when 14.4V full charge is reached.',
    formula:
      'V_ref = 5.1V (Zener) | V_sense = V_batt * [R2 / (R1 + R2)]. Cut-off triggers when V_sense > V_ref.',
    specifications: [
      'Input Voltage: 15V - 18V DC charging adapter',
      'Battery Voltage: 12V nominal (cut-off tunable at 13.8V - 14.4V)',
      'Hysteresis: Built-in positive feedback prevents rapid relay chattering near threshold',
      'Dual Color Status: Green LED = Fully Charged / Standby, Red LED = Fast Charging',
    ],
    tips: [
      'Use 1% metal film resistors for the voltage divider to ensure temperature-stable threshold accuracy.',
      'Add a 100kΩ feedback resistor between output and non-inverting input to add 0.5V hysteresis.',
    ],
    keyComponents: [
      {
        name: 'LM358 Operational Amplifier',
        designator: 'U1',
        package: 'DIP-8',
        pinoutSummary: 'Pin 2: Inverting Input (V_ref), Pin 3: Non-inverting Input (V_sense), Pin 1: Output',
        uses: 'High-precision analog voltage comparator.',
      },
      {
        name: '5.1V Zener Diode 1N4733A',
        designator: 'D1',
        package: 'DO-35',
        pinoutSummary: 'Pin 1: Cathode (to Inverting Input), Pin 2: Anode (to GND)',
        uses: 'Provides an unwavering 5.1V reference voltage.',
      },
    ],
    promptQuery: 'lm358 automatic battery charger cut-off circuit comparator',
  },
  {
    id: 'cdiy-7805-power-supply',
    title: 'Regulated 5V 1.5A DC Power Supply (LM7805 + Bridge Rectifier)',
    slug: '5v-power-supply-circuit-using-7805',
    directUrl: 'https://www.circuits-diy.com/5v-power-supply-circuit-using-7805/',
    category: 'Regulators & Supplies',
    difficulty: 'Beginner',
    tags: ['LM7805', 'Linear Regulator', '5V', 'Bridge Rectifier', 'Filter Cap', 'DC Supply'],
    summary:
      'Step-down linear regulated DC power supply converting 12V AC/DC to rock-solid 5.0V DC at up to 1.5A using an onboard full-wave bridge rectifier, electrolytic bulk filter capacitors, and high-frequency noise decoupling.',
    formula:
      'V_out = 5.0V ± 2% | Ripple V_pp ≈ I_load / (2 * f * C_filter) = 1A / (2 * 50Hz * 1000µF) = 10V / 1000 = 10mV ripple post-regulation',
    specifications: [
      'Input Voltage Range: 8V - 25V AC/DC',
      'Output Voltage: 5.0V DC fixed (up to 1.5A with heatsink)',
      'Bridge Rectifier: 1N4007 diode bridge (reverse polarity immune)',
      'Output Ripple: < 10mV Peak-to-Peak with 1000µF reservoir capacitor',
    ],
    tips: [
      'Power dissipation in the LM7805 is P = (V_in - 5V) * I_load. Always mount a heatsink when dropping more than 5V at >0.5A.',
      'Keep the 100nF output capacitor within 15mm of the regulator pins to prevent parasitic high-frequency oscillations.',
    ],
    keyComponents: [
      {
        name: 'LM7805 5V Linear Regulator',
        designator: 'U1',
        package: 'TO-220',
        pinoutSummary: 'Pin 1: Input (8-25V), Pin 2: GND, Pin 3: Output (+5V)',
        uses: 'Fixed positive linear voltage regulation.',
      },
      {
        name: '1N4007 Bridge Rectifier',
        designator: 'BR1',
        package: 'DIP-4 / Discrete',
        pinoutSummary: 'AC1 (~), AC2 (~), +DC out, -DC out',
        uses: 'Converts alternating current or protects against reverse polarity DC input.',
      },
      {
        name: 'Electrolytic Reservoir Cap 1000µF 25V',
        designator: 'C1',
        package: 'Radial 10mm',
        pinoutSummary: 'Pin 1: Positive (+), Pin 2: Negative (-)',
        uses: 'Smooths rectified AC ripple into smooth DC.',
      },
    ],
    promptQuery: 'lm7805 5v regulated power supply bridge rectifier circuit',
  },
  {
    id: 'cdiy-lm386-audio-amplifier',
    title: 'LM386 Low Voltage Audio Power Amplifier (Gain 20-200)',
    slug: 'lm386-audio-amplifier-circuit',
    directUrl: 'https://www.circuits-diy.com/lm386-audio-amplifier-circuit/',
    category: 'Audio & Amplifiers',
    difficulty: 'Beginner',
    tags: ['LM386', 'Audio Amp', 'Speaker Driver', 'Gain Boost', 'Low Voltage', 'Preamplifier'],
    summary:
      'High-efficiency low voltage audio amplifier delivering up to 1W into an 8Ω speaker. Features internal biasing, low quiescent current drain, and bass-boost / 200x gain configuration using an external 10µF bypass capacitor.',
    formula:
      'Gain = 20 (Pins 1 & 8 open) or Gain = 200 (10µF capacitor between Pin 1 and Pin 8) | P_out = V_supply² / (8 * R_load)',
    specifications: [
      'Operating Voltage: 4V - 12V DC (ideal for 9V battery)',
      'Output Power: Up to 1.0W RMS into 8Ω speaker at 9V',
      'Frequency Response: 20Hz - 20kHz',
      'Distortion: 0.2% THD at 9V Vcc',
    ],
    tips: [
      'Include a Zobel network (10Ω resistor in series with 47nF cap) across the speaker output to prevent high-frequency RF oscillations.',
      'Use a 10kΩ audio-taper (logarithmic) potentiometer at the audio input for smooth volume control.',
    ],
    keyComponents: [
      {
        name: 'LM386 Audio Power Amp',
        designator: 'U1',
        package: 'DIP-8',
        pinoutSummary: 'Pin 1: Gain, Pin 2: -IN, Pin 3: +IN, Pin 4: GND, Pin 5: VOUT, Pin 6: VS, Pin 7: BYPASS, Pin 8: Gain',
        uses: 'Amplifies weak line or microphone audio signals to drive speakers or headphones.',
      },
      {
        name: 'Output Coupling Cap 220µF 16V',
        designator: 'C4',
        package: 'Radial 6.3mm',
        pinoutSummary: 'Pin 1: Positive (+), Pin 2: Negative (-)',
        uses: 'Blocks DC bias voltage from reaching the speaker voice coil while passing AC audio.',
      },
    ],
    promptQuery: 'lm386 low voltage audio power amplifier speaker driver circuit',
  },
  {
    id: 'cdiy-12v-inverter',
    title: '12V DC to 220V AC Mini Inverter (Power MOSFET Stage)',
    slug: 'simple-12v-to-220v-inverter-circuit',
    directUrl: 'https://www.circuits-diy.com/simple-12v-to-220v-inverter-circuit/',
    category: 'Inverters & Converters',
    difficulty: 'Advanced',
    tags: ['Inverter', '12V to 220V', 'MOSFET', 'IRF540N', '555', 'Transformer', 'Push Pull'],
    summary:
      'Push-pull inverter circuit utilizing a 50Hz astable multivibrator driver stage and dual IRF540N power N-MOSFETs driving a center-tapped 12-0-12V to 220V step-up transformer.',
    formula:
      'f_inv = 1.44 / ((R1 + 2*R2) * C1) = 50Hz (mains frequency) | V_sec = V_pri * (N_sec / N_pri)',
    specifications: [
      'Input Voltage: 12V DC Lead-Acid / Li-ion battery (minimum 7Ah recommended)',
      'Output Voltage: 220V - 240V AC 50Hz modified sine / square wave',
      'Power Output: 60W - 100W continuous (scaleable with heatsinks and transformer VA)',
      'Switching Device: Dual IRF540N N-Channel MOSFETs (33A, 100V, R_ds(on) = 44mΩ)',
    ],
    tips: [
      'Mount IRF540N MOSFETs on generously sized extruded aluminum heatsinks with mica insulating pads.',
      'Keep thick 12V battery cables as short as possible to minimize I²R conduction losses.',
    ],
    keyComponents: [
      {
        name: 'IRF540N Power MOSFET',
        designator: 'Q1 / Q2',
        package: 'TO-220',
        pinoutSummary: 'Pin 1: Gate (Drive), Pin 2: Drain (Transformer Primary), Pin 3: Source (GND)',
        uses: 'High-speed high-current power switching of transformer primaries.',
      },
      {
        name: 'Step-Up Transformer 12-0-12V to 220V',
        designator: 'T1',
        package: 'CHASSIS-MOUNT',
        pinoutSummary: 'Primary: 12V, Center Tap (+12V), 12V | Secondary: 0V, 220V AC Out',
        uses: 'Steps up 12V AC switched pulses to 220V mains level voltage.',
      },
    ],
    promptQuery: '12v to 220v inverter circuit 50hz mosfet transformer',
  },
];

/**
 * Live search across Circuits-DIY project catalog
 */
export function searchCircuitsDiy(query: string): CircuitsDiyProject[] {
  const q = (query || '').trim().toLowerCase();
  if (!q) return CIRCUITS_DIY_PROJECTS;

  return CIRCUITS_DIY_PROJECTS.filter((proj) => {
    return (
      proj.title.toLowerCase().includes(q) ||
      proj.slug.toLowerCase().includes(q) ||
      proj.category.toLowerCase().includes(q) ||
      proj.summary.toLowerCase().includes(q) ||
      proj.tags.some((t) => t.toLowerCase().includes(q)) ||
      proj.keyComponents.some(
        (kc) =>
          kc.name.toLowerCase().includes(q) ||
          kc.designator.toLowerCase().includes(q) ||
          kc.uses.toLowerCase().includes(q)
      )
    );
  });
}

/**
 * Resolves or synthesizes a circuit from ANY direct Circuits-DIY URL or prompt
 */
export function loadCircuitsDiyCircuit(projectOrUrl: string | CircuitsDiyProject): SchematicDocument {
  if (typeof projectOrUrl === 'object' && projectOrUrl.promptQuery) {
    const doc = synthesizeClientCircuit(projectOrUrl.promptQuery, projectOrUrl.title);
    return {
      ...doc,
      title: projectOrUrl.title,
      category: projectOrUrl.category,
      summary: projectOrUrl.summary,
      formula: projectOrUrl.formula || doc.formula,
      specifications: projectOrUrl.specifications || doc.specifications,
      tips: projectOrUrl.tips || doc.tips,
    };
  }

  const urlStr = String(projectOrUrl).trim();
  // Check if matches an existing project id or slug
  const matchedProject = CIRCUITS_DIY_PROJECTS.find(
    (p) =>
      p.id === urlStr ||
      p.slug === urlStr ||
      p.directUrl.toLowerCase() === urlStr.toLowerCase() ||
      urlStr.toLowerCase().includes(p.slug)
  );

  if (matchedProject) {
    return loadCircuitsDiyCircuit(matchedProject);
  }

  // Otherwise synthesize dynamically using our robust client synthesizer
  return synthesizeClientCircuit(urlStr);
}
