// Type definitions for Electronic Schematic & Circuit Board Designer

export type ComponentCategory =
  | 'power'
  | 'passive'
  | 'semiconductors'
  | 'ics'
  | 'switches'
  | 'electromechanical'
  | 'connectors';

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
  frequency?: number; // for oscillators
  dutyCycle?: number;
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

export type EditorTool = 'select' | 'wire' | 'pan' | 'erase' | 'netlabel';

export type CanvasViewMode = 'schematic' | 'pcb' | '3d' | 'bom' | 'erc' | 'netlist';

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
