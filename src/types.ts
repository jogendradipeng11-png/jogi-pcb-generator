// Type definitions for Electronic Schematic & Circuit Board Designer

export type ComponentCategory =
  | 'power'
  | 'passive'
  | 'semiconductors'
  | 'ics'
  | 'switches'
  | 'electromechanical'
  | 'connectors'
  | 'sensors'
  | 'modules';

export interface PinDefinition {
  id: string; // "1", "2", "VCC", "GND", etc.
  name: string; // Display label
  number?: string;
  x: number; // Relative to component center
  y: number;
  direction: 'left' | 'right' | 'top' | 'bottom';
  type?: 'input' | 'output' | 'passive' | 'power' | 'ground' | 'bidirectional';
}

export interface ComponentDefinition {
  type: string;
  name: string;
  prefix: string; // 'R', 'C', 'U', 'D', 'Q', 'SW', etc.
  category: ComponentCategory;
  defaultVal: string;
  defaultFootprint: string;
  width: number;
  height: number;
  pins: PinDefinition[];
  description: string;
  symbol: string; // SVG path or shape identifier
  imageUrl?: string;
}

export interface ComponentPinState {
  id: string;
  name: string;
  net?: string; // Connected net name e.g. "VCC", "GND", "NET_1"
}

export interface ComponentTestSettings {
  voltage?: number; // For power sources / VCC (V)
  sourceType?: 'dc' | 'sine' | 'pulse';
  frequency?: number; // Hz
  resistance?: number; // Ohms
  capacitance?: number; // Farads
  wiper?: number; // 0.0 to 1.0 for potentiometers
  isClosed?: boolean; // for switches / pushbuttons
  forwardVoltage?: number; // Volts for diodes / LEDs
  maxPowerRating?: number; // Watts
  loadCurrent?: number; // Amps for test load
}

export interface SchematicComponent {
  id: string;
  type: string;
  category?: ComponentCategory;
  designator: string; // e.g. "R1", "U1"
  value: string; // e.g. "10kΩ", "100nF", "NE555"
  footprint: string; // e.g. "R0805", "DIP-8"
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
  flipped?: boolean;
  pins: ComponentPinState[];
  selected?: boolean;
  testSettings?: ComponentTestSettings;
  pcbX?: number; // Physical PCB placement X (px/mm)
  pcbY?: number; // Physical PCB placement Y (px/mm)
  pcbRotation?: number; // Physical PCB rotation (0, 90, 180, 270)
  alldatasheetUrl?: string; // Reference link to https://www.alldatasheet.com/
  manufacturer?: string;
  partNumber?: string;
  datasheetDescription?: string;
  datasheetSpecs?: Record<string, string>;
  realPart?: any;
  imageUrl?: string;
}

export type CircuitRotationDirection = 'cw90' | 'ccw90' | '180' | 'flipH' | 'flipV';

export interface AllDataSheetPin {
  pin: number | string;
  name: string;
  description: string;
  type: 'power' | 'ground' | 'input' | 'output' | 'passive' | 'bidirectional';
}

export interface AllDataSheetComponent {
  id: string;
  partNumber: string;
  manufacturer: string;
  category: string;
  description: string;
  package: string;
  pinCount: number;
  alldatasheetUrl: string; // e.g. https://www.alldatasheet.com/view.jsp?Searchword=...
  pdfUrl?: string;
  specs: Record<string, string>;
  pinout: AllDataSheetPin[];
  applicationNotes?: string;
  replacementEquivalents?: string[];
  schematicSymbolType?: string;
  imageUrl?: string;
}

export interface SimulationSample {
  time: number;
  voltage: number;
  current?: number;
}

export interface ComponentSimResult {
  current: number; // in Amperes
  power: number; // in Watts
  voltageDrop: number; // in Volts
  state?: string; // e.g. "ON", "OFF", "ACTIVE", "SATURATED", "DROPOUT"
  isOverloaded?: boolean;
  isBurnedOut?: boolean;
  warning?: string;
  frequency?: number; // for oscillators
  dutyCycle?: number;
}

export interface OperatingConditions {
  supplyVoltage: number; // Volts (e.g. 3.3, 5.0, 9.0, 12.0)
  temperature: number; // Ambient temp in °C (e.g. 25, 70, 85, -20)
  simSpeed: number; // Speed multiplier (e.g. 0.5, 1, 2, 5)
  loadCondition?: 'nominal' | 'heavy' | 'no_load' | 'stress';
  tolerance?: number; // Component tolerance ±%
  frequency?: number; // Test signal generator frequency (Hz)
  switchStates?: Record<string, boolean>; // Component ID -> isClosed
  notes?: string;
}

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  badge?: string;
  category?: 'standard' | 'power' | 'stress' | 'speed' | 'audio' | 'custom';
  probedNets: string[]; // Monitored net names, pin keys or wire keys
  operatingConditions: OperatingConditions;
  componentOverrides?: Record<string, Partial<ComponentTestSettings>>;
  isBuiltIn?: boolean;
  createdAt?: string;
}

export interface SimulationState {
  isRunning: boolean;
  time: number; // Current simulation timestamp in seconds
  speed: number; // 0.2x to 5.0x
  netVoltages: Record<string, number>; // netName -> voltage (V)
  pinVoltages: Record<string, number>; // "compId:pinId" -> voltage (V)
  wireCurrents: Record<string, number>; // wireId -> current (A)
  componentResults: Record<string, ComponentSimResult>;
  probedNets: string[]; // nets currently monitored on the oscilloscope
  probedWaveforms: Record<string, SimulationSample[]>;
  warnings?: string[];
  activeScenarioId?: string;
  activeScenarioName?: string;
  operatingConditions?: OperatingConditions;
}

export interface Point {
  x: number;
  y: number;
}

export interface Wire {
  id: string;
  points: Point[]; // Sequence of orthogonal corners
  net: string; // Net identifier e.g. "VCC", "GND", "NET_U1_3"
  startPin?: {
    componentId: string;
    pinId: string;
  };
  endPin?: {
    componentId: string;
    pinId: string;
  };
  color?: string;
  selected?: boolean;
}

export interface NetDefinition {
  name: string;
  color?: string;
  isPower?: boolean;
  isGround?: boolean;
}

export interface NetLabel {
  id: string;
  net: string;
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
  type: 'vcc' | 'gnd' | 'flag' | 'text';
}

export interface SchematicDocument {
  id: string;
  title: string;
  category?: string;
  summary?: string;
  explanation?: string;
  formula?: string;
  specifications?: string[];
  tips?: string[];
  components: SchematicComponent[];
  wires: Wire[];
  netLabels?: NetLabel[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProbeTarget {
  id: string; // e.g. "wire:wire_1" or "pin:comp_1:pin_2"
  type: 'wire' | 'pin';
  label: string; // e.g. "Wire (OUT_555)" or "U1 Pin 3 (OUT)"
  subLabel?: string; // e.g. "Net: OUT_555" or "NE555 Timer • Pin 3"
  netName?: string;
  componentId?: string;
  pinId?: string;
  wireId?: string;
  worldPosition?: Point;
  screenPosition?: Point;
  color?: string;
}

export type EditorTool = 'select' | 'wire' | 'pan' | 'erase' | 'netlabel' | 'probe';

export type CanvasViewMode = 'schematic' | 'pcb' | '3d' | 'panel' | 'bom' | 'erc' | 'netlist';

export interface ErcIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  componentId?: string;
  pinId?: string;
  netName?: string;
}

export interface PcbPad {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'tht' | 'smd';
  shape: 'rect' | 'circle' | 'oval';
  drill?: number;
  net?: string;
  pinNumber: string;
}

export interface PcbComponent {
  id: string;
  componentId: string;
  designator: string;
  value: string;
  footprint: string;
  x: number;
  y: number;
  rotation: number;
  width: number;
  height: number;
  pads: PcbPad[];
}

export interface PcbTrace {
  id: string;
  net: string;
  layer: 'top' | 'bottom';
  width: number;
  points: Point[];
}

// User Profile & Authentication
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  whatsappNumber?: string;
  isWhatsappVerified?: boolean;
  avatar?: string;
  role?: 'student' | 'engineer' | 'maker' | 'pro';
  createdAt: string;
  savedCircuitsCount?: number;
  customComponentsCount?: number;
}

export interface GoogleSearchResultItem {
  id: string;
  title: string;
  type: 'component' | 'circuit';
  category?: string;
  description: string;
  manufacturer?: string;
  partNumber?: string;
  datasheetUrl?: string;
  googleSearchUrl?: string;
  supplyVoltage?: string;
  footprint?: string;
  pins?: {
    id: string;
    name: string;
    direction?: 'left' | 'right' | 'top' | 'bottom';
    type?: 'input' | 'output' | 'passive' | 'power' | 'ground' | 'bidirectional';
  }[];
  // Subcircuit payload if type === 'circuit'
  circuitData?: {
    title: string;
    summary: string;
    components: SchematicComponent[];
    wires?: Wire[];
  };
}

