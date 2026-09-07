import { SchematicDocument, SchematicComponent, Wire } from '../types';
import { getComponentDef } from '../data/components';
import { autoRouteSchematicNets } from './autorouter';

export interface AutoCorrectionIssue {
  id: string;
  severity: 'critical' | 'warning' | 'optimization';
  title: string;
  description: string;
  category: 'Safety & Protection' | 'Stability & Decoupling' | 'Grid & Layout' | 'Signal Integrity';
  componentId?: string;
  componentDesignator?: string;
  fixActionName: string;
  rationale: string;
}

export interface AutoCorrectionResult {
  issues: AutoCorrectionIssue[];
  correctedDoc: SchematicDocument;
  appliedFixesCount: number;
  fixedDescriptions: string[];
}

/**
 * Scans a schematic document for electrical design rule violations and optimization opportunities.
 */
export function analyzeCircuitForCorrections(doc: SchematicDocument): AutoCorrectionIssue[] {
  const issues: AutoCorrectionIssue[] = [];
  const components = doc.components || [];
  const wires = doc.wires || [];

  // Helper: check if a net connects two component pins
  const getComponentConnectedNets = (comp: SchematicComponent): string[] => {
    const nets: string[] = [];
    comp.pins?.forEach((p) => {
      if (p.net) nets.push(p.net);
    });
    // also check wires
    wires.forEach((w) => {
      if (w.net) nets.push(w.net);
    });
    return Array.from(new Set(nets));
  };

  // 1. Check LEDs for missing current-limiting resistors
  const leds = components.filter((c) => c.type === 'led');
  const resistors = components.filter((c) => c.type === 'resistor' || c.type === 'pot');

  leds.forEach((led) => {
    // Check if an existing resistor shares a net with this LED
    const ledNets = (led.pins || []).map((p) => p.net).filter(Boolean);
    let hasDirectResistor = false;

    resistors.forEach((r) => {
      const rNets = (r.pins || []).map((p) => p.net).filter(Boolean);
      const sharesNet = ledNets.some((n) => rNets.includes(n));
      if (sharesNet) {
        hasDirectResistor = true;
      }
    });

    // If LED has no resistor sharing a net, flag critical burnout risk
    if (!hasDirectResistor) {
      issues.push({
        id: `fix_led_resistor_${led.id}`,
        severity: 'critical',
        title: `LED (${led.designator}) missing series current-limiting resistor`,
        description: `LED "${led.designator}" (${led.value}) is connected directly without a current-limiting resistor. Applying power will cause immediate thermal runaway and burnout.`,
        category: 'Safety & Protection',
        componentId: led.id,
        componentDesignator: led.designator,
        fixActionName: 'Insert 330Ω 1/4W Current-Limiting Resistor in series',
        rationale:
          'LEDs have exponential I-V forward diode curves. A 330Ω resistor limits forward current to ~12mA at 5V, ensuring safe operation and long lifespan.',
      });
    }
  });

  // 2. Check inductive coils (relays, motors, solenoids) for missing flyback clamp diodes
  const inductiveComps = components.filter(
    (c) =>
      c.type === 'relay_5v' ||
      c.type === 'relay_spdt' ||
      c.type === 'industrial_contactor' ||
      c.type === 'motor_dc' ||
      c.type === 'buzzer'
  );
  const diodes = components.filter(
    (c) => c.type === 'diode' || c.type === 'diode_1n4007' || c.type === 'zener_diode'
  );

  inductiveComps.forEach((ind) => {
    const indNets = (ind.pins || []).map((p) => p.net).filter(Boolean);
    let hasFlybackDiode = false;

    diodes.forEach((d) => {
      const dNets = (d.pins || []).map((p) => p.net).filter(Boolean);
      // Diode shares at least one net with the coil
      const matches = indNets.filter((n) => dNets.includes(n));
      if (matches.length >= 1) {
        hasFlybackDiode = true;
      }
    });

    if (!hasFlybackDiode) {
      issues.push({
        id: `fix_flyback_${ind.id}`,
        severity: 'critical',
        title: `Inductive Load (${ind.designator}) missing flyback clamp diode`,
        description: `Relay coil or inductive motor "${ind.designator}" lacks a reverse-biased flyback (freewheeling) diode across its coil terminals.`,
        category: 'Safety & Protection',
        componentId: ind.id,
        componentDesignator: ind.designator,
        fixActionName: 'Add 1N4007 Flyback Clamp Diode across coil',
        rationale:
          'When inductive coils are de-energized, magnetic field collapse produces high back-EMF voltage spikes (-L * di/dt up to 300V) that destroy switching transistors or microcontrollers.',
      });
    }
  });

  // 3. Check NE555 Timers for floating RESET (Pin 4) and missing CTRL bypass (Pin 5)
  const timers555 = components.filter((c) => c.type === 'ic_ne555');
  timers555.forEach((t) => {
    const pinReset = t.pins?.find((p) => p.id === '4' || p.name === 'RESET');
    const pinCtrl = t.pins?.find((p) => p.id === '5' || p.name === 'CTRL');

    if (!pinReset?.net || pinReset.net === '' || pinReset.net === 'NC') {
      issues.push({
        id: `fix_555_reset_${t.id}`,
        severity: 'warning',
        title: `NE555 Timer (${t.designator}) Pin 4 (RESET) is floating`,
        description: `Pin 4 (RESET) of "${t.designator}" is currently unconnected. A floating reset pin can trigger erratic resets from ambient electromagnetic noise.`,
        category: 'Stability & Decoupling',
        componentId: t.id,
        componentDesignator: t.designator,
        fixActionName: 'Tie Pin 4 (RESET) to VCC supply rail',
        rationale: 'NE555 reset is active-low. Connecting Pin 4 to VCC prevents false triggering.',
      });
    }

    if (!pinCtrl?.net || pinCtrl.net === '' || pinCtrl.net === 'NC') {
      issues.push({
        id: `fix_555_ctrl_${t.id}`,
        severity: 'optimization',
        title: `NE555 Timer (${t.designator}) Pin 5 (CTRL) lacks high-frequency bypass`,
        description: `Pin 5 (Control Voltage) is floating without a 10nF bypass capacitor to ground.`,
        category: 'Stability & Decoupling',
        componentId: t.id,
        componentDesignator: t.designator,
        fixActionName: 'Add 10nF Ceramic Bypass Capacitor to GND on Pin 5',
        rationale:
          'Bypassing the control voltage terminal eliminates 2/3 Vcc internal voltage divider noise, ensuring stable frequency and duty cycle.',
      });
    }
  });

  // 4. Check ICs for missing VCC supply decoupling capacitors
  const sensitiveIcs = components.filter(
    (c) =>
      c.type === 'ic_ne555' ||
      c.type === 'ic_opamp' ||
      c.type === 'arduino_nano' ||
      c.type === 'esp32_dev' ||
      c.type === 'ic_mcu' ||
      c.type === 'reg_lm7805'
  );
  const ceramicCaps = components.filter(
    (c) =>
      c.type === 'capacitor' &&
      (c.value.includes('100n') || c.value.includes('0.1u') || c.value.includes('100nF'))
  );

  if (sensitiveIcs.length > 0 && ceramicCaps.length < sensitiveIcs.length) {
    issues.push({
      id: `fix_ic_decoupling`,
      severity: 'warning',
      title: `Microcontroller / IC stages missing 100nF VCC decoupling capacitors`,
      description: `Circuit contains ${sensitiveIcs.length} active IC stage(s) but only ${ceramicCaps.length} high-frequency decoupling capacitor(s) were found on power rails.`,
      category: 'Stability & Decoupling',
      fixActionName: 'Add 100nF Ceramic Decoupling Capacitors between VCC and GND',
      rationale:
        'Fast switching logic draws sudden current surges. 100nF ceramic capacitors provide instantaneous charge and suppress supply rail bounce.',
    });
  }

  // 5. Check TRIACs for missing RC snubber networks
  const triacs = components.filter((c) => c.type === 'triac');
  triacs.forEach((triac) => {
    issues.push({
      id: `fix_triac_snubber_${triac.id}`,
      severity: 'optimization',
      title: `AC TRIAC (${triac.designator}) recommended RC Snubber protection`,
      description: `TRIAC "${triac.designator}" switches AC mains loads. Inductive loads (fans, motors, transformers) generate high dv/dt that can falsely re-trigger the TRIAC.`,
      category: 'Safety & Protection',
      componentId: triac.id,
      componentDesignator: triac.designator,
      fixActionName: 'Add 39Ω 1W Resistor + 10nF 400V Snubber Network across MT1 & MT2',
      rationale:
        'An RC snubber clamps the rate of rise of off-state voltage (dv/dt) to safe limits (< 10V/µs), preventing accidental conduction.',
    });
  });

  // 6. Check Grid Alignment & Overlapping Coordinates
  let unalignedCount = 0;
  let overlappingCount = 0;

  for (let i = 0; i < components.length; i++) {
    const c1 = components[i];
    if (c1.x % 20 !== 0 || c1.y % 20 !== 0) {
      unalignedCount++;
    }
    for (let j = i + 1; j < components.length; j++) {
      const c2 = components[j];
      const dist = Math.hypot(c1.x - c2.x, c1.y - c2.y);
      if (dist < 40) {
        overlappingCount++;
      }
    }
  }

  if (unalignedCount > 0 || overlappingCount > 0) {
    issues.push({
      id: `fix_grid_alignment`,
      severity: 'optimization',
      title: `Canvas Layout: ${unalignedCount} unaligned parts and ${overlappingCount} close component overlap(s)`,
      description: `Several components are not aligned to the standard 20px orthogonal EDA grid or overlap closely on the canvas.`,
      category: 'Grid & Layout',
      fixActionName: 'Snap all components to 20px grid and detangle positions',
      rationale:
        'Strict grid alignment guarantees clean 90-degree orthogonal wiring tracks and ensures legibility for manufacturing review.',
    });
  }

  return issues;
}

/**
 * Applies automated corrections to the schematic document.
 */
export function applyCircuitAutoCorrections(
  doc: SchematicDocument,
  selectedIssueIds?: string[]
): AutoCorrectionResult {
  const issues = analyzeCircuitForCorrections(doc);
  const issuesToFix = selectedIssueIds
    ? issues.filter((i) => selectedIssueIds.includes(i.id))
    : issues;

  if (issuesToFix.length === 0) {
    return {
      issues,
      correctedDoc: doc,
      appliedFixesCount: 0,
      fixedDescriptions: [],
    };
  }

  let updatedComponents = [...(doc.components || [])];
  let updatedWires = [...(doc.wires || [])];
  const fixedDescriptions: string[] = [];

  // Helper to generate unique IDs
  const genId = (prefix: string) =>
    `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  // Find maximum coordinate bounds to place new parts neatly
  const maxX =
    updatedComponents.length > 0 ? Math.max(...updatedComponents.map((c) => c.x)) : 300;
  const maxY =
    updatedComponents.length > 0 ? Math.max(...updatedComponents.map((c) => c.y)) : 200;

  issuesToFix.forEach((issue) => {
    // 1. Fix LED missing resistor
    if (issue.id.startsWith('fix_led_resistor_') && issue.componentId) {
      const led = updatedComponents.find((c) => c.id === issue.componentId);
      if (led) {
        const resDef = getComponentDef('resistor');
        const resDesignator = `R${updatedComponents.filter((c) => c.designator.startsWith('R')).length + 1}`;
        const newResNet = `NET_${led.designator}_ANODE`;

        // Position resistor directly 80px to the left of the LED
        const newRes: SchematicComponent = {
          id: genId('comp_res'),
          type: 'resistor',
          designator: resDesignator,
          value: '330Ω',
          footprint: 'R0805',
          x: Math.round((led.x - 80) / 20) * 20,
          y: Math.round(led.y / 20) * 20,
          rotation: 0,
          pins: [
            { id: '1', name: '1', net: 'VCC' },
            { id: '2', name: '2', net: newResNet },
          ],
        };

        // Update LED pin A net to connect to the resistor's output
        const updatedLedPins = (led.pins || []).map((p) =>
          p.id === '1' || p.name === 'A' ? { ...p, net: newResNet } : p
        );

        updatedComponents = updatedComponents.map((c) =>
          c.id === led.id ? { ...c, pins: updatedLedPins } : c
        );
        updatedComponents.push(newRes);

        // Add connecting wire between Resistor Pin 2 and LED Pin 1
        updatedWires.push({
          id: genId('wire'),
          startPin: {
            componentId: newRes.id,
            pinId: '2',
          },
          endPin: {
            componentId: led.id,
            pinId: '1',
          },
          net: newResNet,
          points: [
            { x: newRes.x + 25, y: newRes.y },
            { x: led.x - 25, y: led.y },
          ],
        });

        fixedDescriptions.push(
          `Added series 330Ω resistor (${resDesignator}) to protect ${led.designator} from burnout.`
        );
      }
    }

    // 2. Fix Relay / Inductive Load missing flyback diode
    else if (issue.id.startsWith('fix_flyback_') && issue.componentId) {
      const ind = updatedComponents.find((c) => c.id === issue.componentId);
      if (ind) {
        const diodeDesignator = `D${updatedComponents.filter((c) => c.designator.startsWith('D')).length + 1}`;
        const coilPlusNet = ind.pins?.find((p) => p.name === 'COIL+' || p.id === '1')?.net || 'VCC';
        const coilMinusNet =
          ind.pins?.find((p) => p.name === 'COIL-' || p.id === '2')?.net || 'NET_RELAY_DRV';

        // Place diode 60px below the relay coil
        const newDiode: SchematicComponent = {
          id: genId('comp_diode'),
          type: 'diode_1n4007',
          designator: diodeDesignator,
          value: '1N4007 (Flyback)',
          footprint: 'DO-41',
          x: Math.round(ind.x / 20) * 20,
          y: Math.round((ind.y + 70) / 20) * 20,
          rotation: 180, // Reverse-biased clamping orientation
          pins: [
            { id: '1', name: 'A', net: coilMinusNet },
            { id: '2', name: 'K', net: coilPlusNet },
          ],
        };

        updatedComponents.push(newDiode);
        fixedDescriptions.push(
          `Added 1N4007 flyback diode (${diodeDesignator}) anti-parallel across ${ind.designator} coil.`
        );
      }
    }

    // 3. Fix 555 Timer Pin 4 (RESET) floating
    else if (issue.id.startsWith('fix_555_reset_') && issue.componentId) {
      const timer = updatedComponents.find((c) => c.id === issue.componentId);
      if (timer) {
        const vccNet = timer.pins?.find((p) => p.name === 'VCC' || p.id === '8')?.net || 'VCC';
        const updatedPins = (timer.pins || []).map((p) =>
          p.id === '4' || p.name === 'RESET' ? { ...p, net: vccNet } : p
        );
        updatedComponents = updatedComponents.map((c) =>
          c.id === timer.id ? { ...c, pins: updatedPins } : c
        );
        fixedDescriptions.push(`Connected ${timer.designator} Pin 4 (RESET) to ${vccNet} rail.`);
      }
    }

    // 4. Fix 555 Timer Pin 5 (CTRL) missing bypass cap
    else if (issue.id.startsWith('fix_555_ctrl_') && issue.componentId) {
      const timer = updatedComponents.find((c) => c.id === issue.componentId);
      if (timer) {
        const capDesignator = `C${updatedComponents.filter((c) => c.designator.startsWith('C')).length + 1}`;
        const ctrlNet = `NET_${timer.designator}_CTRL`;

        const newCap: SchematicComponent = {
          id: genId('comp_cap'),
          type: 'capacitor',
          designator: capDesignator,
          value: '10nF',
          footprint: 'C0805',
          x: Math.round((timer.x + 80) / 20) * 20,
          y: Math.round((timer.y + 20) / 20) * 20,
          rotation: 90,
          pins: [
            { id: '1', name: '1', net: ctrlNet },
            { id: '2', name: '2', net: 'GND' },
          ],
        };

        const updatedPins = (timer.pins || []).map((p) =>
          p.id === '5' || p.name === 'CTRL' ? { ...p, net: ctrlNet } : p
        );

        updatedComponents = updatedComponents.map((c) =>
          c.id === timer.id ? { ...c, pins: updatedPins } : c
        );
        updatedComponents.push(newCap);
        fixedDescriptions.push(
          `Added 10nF ceramic bypass capacitor (${capDesignator}) to Pin 5 on ${timer.designator}.`
        );
      }
    }

    // 5. Fix IC decoupling capacitors
    else if (issue.id === 'fix_ic_decoupling') {
      const capDesignator = `C${updatedComponents.filter((c) => c.designator.startsWith('C')).length + 1}`;
      const newCap: SchematicComponent = {
        id: genId('comp_decouple'),
        type: 'capacitor',
        designator: capDesignator,
        value: '100nF Ceramic',
        footprint: 'C0805',
        x: Math.round((maxX + 60) / 20) * 20,
        y: Math.round((maxY - 40) / 20) * 20,
        rotation: 90,
        pins: [
          { id: '1', name: '1', net: 'VCC' },
          { id: '2', name: '2', net: 'GND' },
        ],
      };
      updatedComponents.push(newCap);
      fixedDescriptions.push(`Added 100nF VCC-to-GND decoupling capacitor (${capDesignator}).`);
    }

    // 6. Fix TRIAC Snubber network
    else if (issue.id.startsWith('fix_triac_snubber_') && issue.componentId) {
      const triac = updatedComponents.find((c) => c.id === issue.componentId);
      if (triac) {
        const rSnubDes = `R${updatedComponents.filter((c) => c.designator.startsWith('R')).length + 1}`;
        const cSnubDes = `C${updatedComponents.filter((c) => c.designator.startsWith('C')).length + 1}`;
        const midNet = `NET_${triac.designator}_SNUB_MID`;

        const rSnub: SchematicComponent = {
          id: genId('comp_rsnub'),
          type: 'resistor',
          designator: rSnubDes,
          value: '39Ω 1W',
          footprint: 'R2512',
          x: Math.round((triac.x + 80) / 20) * 20,
          y: Math.round((triac.y - 30) / 20) * 20,
          rotation: 0,
          pins: [
            { id: '1', name: '1', net: 'AC_MT2' },
            { id: '2', name: '2', net: midNet },
          ],
        };

        const cSnub: SchematicComponent = {
          id: genId('comp_csnub'),
          type: 'capacitor',
          designator: cSnubDes,
          value: '10nF 400V Film',
          footprint: 'CAP_FILM_10mm',
          x: Math.round((triac.x + 80) / 20) * 20,
          y: Math.round((triac.y + 30) / 20) * 20,
          rotation: 90,
          pins: [
            { id: '1', name: '1', net: midNet },
            { id: '2', name: '2', net: 'AC_MT1' },
          ],
        };

        updatedComponents.push(rSnub, cSnub);
        fixedDescriptions.push(
          `Added 39Ω + 10nF 400V RC Snubber (${rSnubDes}, ${cSnubDes}) across ${triac.designator} MT1 & MT2.`
        );
      }
    }

    // 7. Fix Grid Alignment & Overlap
    else if (issue.id === 'fix_grid_alignment') {
      const occupiedCoords = new Set<string>();

      updatedComponents = updatedComponents.map((c) => {
        let nx = Math.round(c.x / 20) * 20;
        let ny = Math.round(c.y / 20) * 20;
        let coordKey = `${nx},${ny}`;

        while (occupiedCoords.has(coordKey)) {
          nx += 40;
          ny += 20;
          coordKey = `${nx},${ny}`;
        }

        occupiedCoords.add(coordKey);
        return {
          ...c,
          x: nx,
          y: ny,
        };
      });

      fixedDescriptions.push('Snapped all components to 20px grid and eliminated overlaps.');
    }
  });

  // Re-run autorouter so all new connections and wire routes are neat orthogonal tracks
  const routeResult = autoRouteSchematicNets(updatedComponents, updatedWires);
  const reRoutedDoc: SchematicDocument = {
    ...doc,
    components: routeResult.updatedComponents,
    wires: routeResult.allWires,
    updatedAt: new Date().toISOString(),
  };

  return {
    issues: analyzeCircuitForCorrections(reRoutedDoc),
    correctedDoc: reRoutedDoc,
    appliedFixesCount: fixedDescriptions.length,
    fixedDescriptions,
  };
}
