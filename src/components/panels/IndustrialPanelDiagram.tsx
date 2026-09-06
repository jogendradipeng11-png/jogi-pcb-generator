import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  Power,
  Play,
  Square,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Layers,
  Activity,
  Gauge,
  Info,
  Sliders,
  Cpu,
  Download,
  Flame,
  ArrowLeftRight
} from 'lucide-react';
import { SchematicComponent, Wire, SchematicDocument } from '../../types';

interface IndustrialPanelDiagramProps {
  onLoadCircuitToCanvas: (doc: Partial<SchematicDocument>) => void;
  onClose?: () => void;
}

export type PanelVoltageMode = '440V' | '220V';
export type PanelPhaseMode = '3phase' | '1phase';
export type StarterType = 'dol' | 'star_delta' | 'forward_reverse';
export type DiagramTab = 'enclosure' | 'main_circuit' | 'control_circuit';

export const IndustrialPanelDiagram: React.FC<IndustrialPanelDiagramProps> = ({
  onLoadCircuitToCanvas,
}) => {
  // Voltage & Circuit Configuration
  const [voltage, setVoltage] = useState<PanelVoltageMode>('440V');
  const [phase, setPhase] = useState<PanelPhaseMode>('3phase');
  const [starterType, setStarterType] = useState<StarterType>('dol');
  const [activeTab, setActiveTab] = useState<DiagramTab>('enclosure');

  // Simulation State of Panel
  const [mcbClosed, setMcbClosed] = useState<boolean>(true);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isTripped, setIsTripped] = useState<boolean>(false);
  const [isEStopActive, setIsEStopActive] = useState<boolean>(false);
  const [motorDirection, setMotorDirection] = useState<'fwd' | 'rev' | 'stopped'>('stopped');
  const [starDeltaMode, setStarDeltaMode] = useState<'idle' | 'star' | 'delta'>('idle');
  const [motorRpm, setMotorRpm] = useState<number>(0);
  const [currentAmps, setCurrentAmps] = useState<number>(0);

  // Sync phase with voltage default (440V -> 3phase, 220V can be 1phase or 3phase)
  const handleVoltageChange = (v: PanelVoltageMode) => {
    setVoltage(v);
    if (v === '440V') {
      setPhase('3phase');
    }
    // Stop motor on config change
    stopMotor();
  };

  const handlePhaseChange = (p: PanelPhaseMode) => {
    setPhase(p);
    if (p === '1phase') {
      setVoltage('220V');
      setStarterType('dol');
    }
    stopMotor();
  };

  // Motor start/stop logic
  const startMotor = (dir: 'fwd' | 'rev' = 'fwd') => {
    if (!mcbClosed || isTripped || isEStopActive) return;

    if (starterType === 'star_delta') {
      setIsRunning(true);
      setMotorDirection(dir);
      setStarDeltaMode('star');
      setCurrentAmps(18.5); // reduced inrush in star
      setMotorRpm(1100);

      // Star to Delta transition after 2.5s
      setTimeout(() => {
        setStarDeltaMode('delta');
        setCurrentAmps(voltage === '440V' ? 8.6 : 14.8);
        setMotorRpm(voltage === '440V' ? 1440 : 2880);
      }, 2500);
    } else {
      setIsRunning(true);
      setMotorDirection(dir);
      setCurrentAmps(voltage === '440V' ? 9.2 : 15.6);
      setMotorRpm(1440);
    }
  };

  const stopMotor = () => {
    setIsRunning(false);
    setMotorDirection('stopped');
    setStarDeltaMode('idle');
    setMotorRpm(0);
    setCurrentAmps(0);
  };

  const triggerOverloadTrip = () => {
    setIsTripped(true);
    stopMotor();
  };

  const resetOverloadTrip = () => {
    setIsTripped(false);
  };

  const toggleEStop = () => {
    if (isEStopActive) {
      setIsEStopActive(false);
    } else {
      setIsEStopActive(true);
      stopMotor();
    }
  };

  // Generate Schematic Document for Canvas injection
  const handleExportToCanvas = () => {
    const is3Ph = phase === '3phase';
    const is440 = voltage === '440V';

    const components: SchematicComponent[] = [];
    const wires: Wire[] = [];

    if (is3Ph) {
      // 3-Phase 440V / 220V System
      // 1. Source Terminals
      components.push({
        id: 'p_src_tb',
        type: 'three_phase_source_terminal',
        designator: 'TB_SOURCE',
        value: `${voltage} 3Φ 50Hz`,
        footprint: 'CONN-TB-5P_10.16',
        x: 180,
        y: 200,
        rotation: 0,
        pins: [
          { id: '1', name: 'L1 (R)', net: 'NET_L1' },
          { id: '2', name: 'L2 (Y)', net: 'NET_L2' },
          { id: '3', name: 'L3 (B)', net: 'NET_L3' },
          { id: '4', name: 'N', net: 'NET_N' },
          { id: '5', name: 'PE', net: 'EARTH' },
        ],
      });

      // 2. Main Contactor KM1
      components.push({
        id: 'p_km1',
        type: 'industrial_contactor',
        designator: 'KM1',
        value: `${voltage} 25A Contactor`,
        footprint: 'DIN_CONTACTOR_3P',
        x: 420,
        y: 200,
        rotation: 0,
        pins: [
          { id: '1', name: '1/L1', net: 'NET_L1' },
          { id: '2', name: '2/T1', net: 'NET_KM1_T1' },
          { id: '3', name: '3/L2', net: 'NET_L2' },
          { id: '4', name: '4/T2', net: 'NET_KM1_T2' },
          { id: '5', name: '5/L3', net: 'NET_L3' },
          { id: '6', name: '6/T3', net: 'NET_KM1_T3' },
          { id: '7', name: '13 NO', net: 'NET_CTRL_LINE' },
          { id: '8', name: '14 NO', net: 'NET_COIL_A1' },
          { id: '9', name: 'A1 (Coil)', net: 'NET_COIL_A1' },
          { id: '10', name: 'A2 (Coil)', net: 'NET_N' },
        ],
      });

      // 3. Thermal Overload Relay
      components.push({
        id: 'p_olr1',
        type: 'overload_relay',
        designator: 'OLR1',
        value: '7-11A Range',
        footprint: 'DIN_OVERLOAD_RELAY',
        x: 640,
        y: 200,
        rotation: 0,
        pins: [
          { id: '1', name: '1/L1 In', net: 'NET_KM1_T1' },
          { id: '2', name: '2/T1 Out', net: 'NET_MOTOR_U' },
          { id: '3', name: '3/L2 In', net: 'NET_KM1_T2' },
          { id: '4', name: '4/T2 Out', net: 'NET_MOTOR_V' },
          { id: '5', name: '5/L3 In', net: 'NET_KM1_T3' },
          { id: '6', name: '6/T3 Out', net: 'NET_MOTOR_W' },
          { id: '7', name: '95 NC', net: 'NET_CTRL_PWR' },
          { id: '8', name: '96 NC', net: 'NET_CTRL_LINE' },
          { id: '9', name: '97 NO', net: 'NET_CTRL_PWR' },
          { id: '10', name: '98 NO', net: 'NET_TRIP_LAMP' },
        ],
      });

      // 4. 3-Phase Load Terminal Block
      components.push({
        id: 'p_load_tb',
        type: 'three_phase_load_terminal',
        designator: 'TB_LOAD',
        value: 'MOTOR OUT',
        footprint: 'CONN-TB-4P_10.16',
        x: 840,
        y: 200,
        rotation: 0,
        pins: [
          { id: '1', name: 'U (T1)', net: 'NET_MOTOR_U' },
          { id: '2', name: 'V (T2)', net: 'NET_MOTOR_V' },
          { id: '3', name: 'W (T3)', net: 'NET_MOTOR_W' },
          { id: '4', name: 'PE', net: 'EARTH' },
        ],
      });

      // 5. 3-Phase Motor
      components.push({
        id: 'p_motor1',
        type: 'three_phase_motor',
        designator: 'M1',
        value: `5HP ${voltage} 3Φ`,
        footprint: 'MOTOR_3PH_FOOT',
        x: 1040,
        y: 200,
        rotation: 0,
        pins: [
          { id: '1', name: 'U1', net: 'NET_MOTOR_U' },
          { id: '2', name: 'V1', net: 'NET_MOTOR_V' },
          { id: '3', name: 'W1', net: 'NET_MOTOR_W' },
          { id: '4', name: 'PE', net: 'EARTH' },
        ],
      });

      // 6. Control Start/Stop Buttons
      components.push({
        id: 'p_btn_stop',
        type: 'push_button',
        designator: 'PB_STOP',
        value: 'STOP (NC)',
        footprint: 'SW-PB-6x6mm',
        x: 320,
        y: 420,
        rotation: 0,
        pins: [
          { id: '1', name: '1', net: 'NET_CTRL_LINE' },
          { id: '2', name: '2', net: 'NET_STOP_OUT' },
        ],
      });

      components.push({
        id: 'p_btn_start',
        type: 'push_button',
        designator: 'PB_START',
        value: 'START (NO)',
        footprint: 'SW-PB-6x6mm',
        x: 460,
        y: 420,
        rotation: 0,
        pins: [
          { id: '1', name: '1', net: 'NET_STOP_OUT' },
          { id: '2', name: '2', net: 'NET_COIL_A1' },
        ],
      });

      // Power Wires (L1, L2, L3)
      wires.push(
        {
          id: 'w_l1_km',
          points: [{ x: 215, y: 160 }, { x: 375, y: 155 }],
          net: 'NET_L1',
          startPin: { componentId: 'p_src_tb', pinId: '1' },
          endPin: { componentId: 'p_km1', pinId: '1' },
        },
        {
          id: 'w_l2_km',
          points: [{ x: 215, y: 180 }, { x: 375, y: 180 }],
          net: 'NET_L2',
          startPin: { componentId: 'p_src_tb', pinId: '2' },
          endPin: { componentId: 'p_km1', pinId: '3' },
        },
        {
          id: 'w_l3_km',
          points: [{ x: 215, y: 200 }, { x: 375, y: 205 }],
          net: 'NET_L3',
          startPin: { componentId: 'p_src_tb', pinId: '3' },
          endPin: { componentId: 'p_km1', pinId: '5' },
        },
        {
          id: 'w_km_olr_t1',
          points: [{ x: 465, y: 155 }, { x: 600, y: 165 }],
          net: 'NET_KM1_T1',
          startPin: { componentId: 'p_km1', pinId: '2' },
          endPin: { componentId: 'p_olr1', pinId: '1' },
        },
        {
          id: 'w_km_olr_t2',
          points: [{ x: 465, y: 180 }, { x: 600, y: 185 }],
          net: 'NET_KM1_T2',
          startPin: { componentId: 'p_km1', pinId: '4' },
          endPin: { componentId: 'p_olr1', pinId: '3' },
        },
        {
          id: 'w_km_olr_t3',
          points: [{ x: 465, y: 205 }, { x: 600, y: 205 }],
          net: 'NET_KM1_T3',
          startPin: { componentId: 'p_km1', pinId: '6' },
          endPin: { componentId: 'p_olr1', pinId: '5' },
        },
        {
          id: 'w_olr_tb_u',
          points: [{ x: 680, y: 165 }, { x: 805, y: 170 }],
          net: 'NET_MOTOR_U',
          startPin: { componentId: 'p_olr1', pinId: '2' },
          endPin: { componentId: 'p_load_tb', pinId: '1' },
        },
        {
          id: 'w_olr_tb_v',
          points: [{ x: 680, y: 185 }, { x: 805, y: 190 }],
          net: 'NET_MOTOR_V',
          startPin: { componentId: 'p_olr1', pinId: '4' },
          endPin: { componentId: 'p_load_tb', pinId: '2' },
        },
        {
          id: 'w_olr_tb_w',
          points: [{ x: 680, y: 205 }, { x: 805, y: 210 }],
          net: 'NET_MOTOR_W',
          startPin: { componentId: 'p_olr1', pinId: '6' },
          endPin: { componentId: 'p_load_tb', pinId: '3' },
        },
        {
          id: 'w_tb_m_u',
          points: [{ x: 875, y: 170 }, { x: 1000, y: 175 }],
          net: 'NET_MOTOR_U',
          startPin: { componentId: 'p_load_tb', pinId: '1' },
          endPin: { componentId: 'p_motor1', pinId: '1' },
        },
        {
          id: 'w_tb_m_v',
          points: [{ x: 875, y: 190 }, { x: 1000, y: 200 }],
          net: 'NET_MOTOR_V',
          startPin: { componentId: 'p_load_tb', pinId: '2' },
          endPin: { componentId: 'p_motor1', pinId: '2' },
        },
        {
          id: 'w_tb_m_w',
          points: [{ x: 875, y: 210 }, { x: 1000, y: 225 }],
          net: 'NET_MOTOR_W',
          startPin: { componentId: 'p_load_tb', pinId: '3' },
          endPin: { componentId: 'p_motor1', pinId: '3' },
        }
      );
    } else {
      // 220V Single-Phase System
      components.push(
        {
          id: 'p_src_tb_1p',
          type: 'source_terminal_block',
          designator: 'TB_SOURCE_220V',
          value: '220V 1Φ (L/N/PE)',
          footprint: 'CONN-TB-3P_7.62',
          x: 200,
          y: 220,
          rotation: 0,
          pins: [
            { id: '1', name: '+ / L', net: 'NET_LINE_220V' },
            { id: '2', name: '- / N', net: 'NET_NEUTRAL' },
            { id: '3', name: 'PE', net: 'EARTH' },
          ],
        },
        {
          id: 'p_km1_1p',
          type: 'industrial_contactor',
          designator: 'KM1',
          value: '220V 16A Contactor',
          footprint: 'DIN_CONTACTOR_3P',
          x: 460,
          y: 220,
          rotation: 0,
          pins: [
            { id: '1', name: '1/L1', net: 'NET_LINE_220V' },
            { id: '2', name: '2/T1', net: 'NET_LOAD_L' },
            { id: '3', name: '3/L2', net: 'NET_NEUTRAL' },
            { id: '4', name: '4/T2', net: 'NET_LOAD_N' },
            { id: '7', name: '13 NO', net: 'NET_LINE_220V' },
            { id: '8', name: '14 NO', net: 'NET_COIL_A1' },
            { id: '9', name: 'A1 (Coil)', net: 'NET_COIL_A1' },
            { id: '10', name: 'A2 (Coil)', net: 'NET_NEUTRAL' },
          ],
        },
        {
          id: 'p_load_tb_1p',
          type: 'load_terminal_block',
          designator: 'TB_LOAD_220V',
          value: '220V LOAD OUT',
          footprint: 'CONN-TB-3P_7.62',
          x: 740,
          y: 220,
          rotation: 0,
          pins: [
            { id: '1', name: 'IN+', net: 'NET_LOAD_L' },
            { id: '2', name: 'IN-', net: 'NET_LOAD_N' },
            { id: '3', name: 'PE', net: 'EARTH' },
          ],
        },
        {
          id: 'p_btn_start_1p',
          type: 'push_button',
          designator: 'PB_START',
          value: 'START (NO)',
          footprint: 'SW-PB-6x6mm',
          x: 360,
          y: 400,
          rotation: 0,
          pins: [
            { id: '1', name: '1', net: 'NET_LINE_220V' },
            { id: '2', name: '2', net: 'NET_COIL_A1' },
          ],
        }
      );

      wires.push(
        {
          id: 'w_1p_line',
          points: [{ x: 230, y: 198 }, { x: 415, y: 175 }],
          net: 'NET_LINE_220V',
          startPin: { componentId: 'p_src_tb_1p', pinId: '1' },
          endPin: { componentId: 'p_km1_1p', pinId: '1' },
        },
        {
          id: 'w_1p_neu',
          points: [{ x: 230, y: 220 }, { x: 415, y: 200 }],
          net: 'NET_NEUTRAL',
          startPin: { componentId: 'p_src_tb_1p', pinId: '2' },
          endPin: { componentId: 'p_km1_1p', pinId: '3' },
        },
        {
          id: 'w_1p_out_l',
          points: [{ x: 505, y: 175 }, { x: 710, y: 198 }],
          net: 'NET_LOAD_L',
          startPin: { componentId: 'p_km1_1p', pinId: '2' },
          endPin: { componentId: 'p_load_tb_1p', pinId: '1' },
        },
        {
          id: 'w_1p_out_n',
          points: [{ x: 505, y: 200 }, { x: 710, y: 220 }],
          net: 'NET_LOAD_N',
          startPin: { componentId: 'p_km1_1p', pinId: '4' },
          endPin: { componentId: 'p_load_tb_1p', pinId: '2' },
        }
      );
    }

    const doc: Partial<SchematicDocument> = {
      title: `${voltage} ${phase === '3phase' ? '3-Phase' : 'Single-Phase'} Control & Main Power Circuit`,
      category: 'Industrial Control Panel',
      summary: `Complete ${voltage} ${phase} main power circuit & panel control diagram with identified Source and Load connection points, contactor, OLR, and pushbuttons.`,
      components,
      wires,
    };

    onLoadCircuitToCanvas(doc);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 select-none overflow-y-auto">
      {/* Top Banner & Control Bar */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 shrink-0 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4 max-w-7xl mx-auto">
          {/* Title & Badge */}
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Industrial Control Panel &amp; Main Circuit Studio
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-sky-500/20 text-sky-400 border border-sky-500/40 rounded-full">
                  220V / 440V 1Φ &amp; 3Φ
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Complete main power circuits, 24V/220V control circuits, DIN rail enclosure layout, and live interactive testing.
              </p>
            </div>
          </div>

          {/* Configuration Pickers */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Voltage Toggle */}
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 px-2">Voltage:</span>
              <button
                onClick={() => handleVoltageChange('440V')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                  voltage === '440V'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                440V (3-Phase)
              </button>
              <button
                onClick={() => handleVoltageChange('220V')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                  voltage === '220V'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                220V (1Φ / 3Φ)
              </button>
            </div>

            {/* Phase Toggle */}
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 px-2">Phase:</span>
              <button
                onClick={() => handlePhaseChange('3phase')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                  phase === '3phase'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                3-Phase (3Φ)
              </button>
              <button
                onClick={() => handlePhaseChange('1phase')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                  phase === '1phase'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Single-Phase (1Φ)
              </button>
            </div>

            {/* Starter Architecture (for 3-Phase) */}
            {phase === '3phase' && (
              <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 px-2">Starter:</span>
                <button
                  onClick={() => { setStarterType('dol'); stopMotor(); }}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                    starterType === 'dol'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  DOL Starter
                </button>
                <button
                  onClick={() => { setStarterType('star_delta'); stopMotor(); }}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                    starterType === 'star_delta'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Star-Delta (Y-Δ)
                </button>
                <button
                  onClick={() => { setStarterType('forward_reverse'); stopMotor(); }}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                    starterType === 'forward_reverse'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Fwd / Rev
                </button>
              </div>
            )}

            {/* Load into Main Schematic Canvas Button */}
            <button
              onClick={handleExportToCanvas}
              className="px-3.5 py-1.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              title="Export this complete main & control circuit onto the Schematic Canvas"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Load into Schematic Canvas</span>
            </button>
          </div>
        </div>

        {/* View Mode Tabs: Enclosure Layout, Main Power Circuit, Control Circuit */}
        <div className="flex items-center space-x-2 mt-4 pt-3 border-t border-slate-800 max-w-7xl mx-auto">
          <button
            onClick={() => setActiveTab('enclosure')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg flex items-center gap-2 transition-all ${
              activeTab === 'enclosure'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Panel Cabinet Layout (Physical DIN Rail)</span>
          </button>
          <button
            onClick={() => setActiveTab('main_circuit')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg flex items-center gap-2 transition-all ${
              activeTab === 'main_circuit'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Complete Main Power Circuit ({voltage} {phase})</span>
          </button>
          <button
            onClick={() => setActiveTab('control_circuit')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg flex items-center gap-2 transition-all ${
              activeTab === 'control_circuit'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Complete Panel Control Circuit (Ladder Logic)</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Studio Canvas */}
      <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Identified Connection Points Reference Header */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Source Connection Point Callout */}
          <div className="p-3.5 bg-blue-950/40 border-2 border-blue-500/60 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 text-white rounded-lg animate-pulse">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold uppercase text-blue-400 tracking-wider">
                    [IDENTIFIED SOURCE CONNECTION POINT]
                  </span>
                  <span className="px-1.5 py-0.2 text-[9px] font-bold bg-blue-500/20 text-blue-300 rounded">
                    Mains In
                  </span>
                </div>
                <div className="text-sm font-bold text-white mt-0.5">
                  {voltage === '440V'
                    ? '3-Phase 440V (L1 / Red • L2 / Yellow • L3 / Blue • N • ⏚ PE)'
                    : 'Single-Phase 220V (Line L • Neutral N • ⏚ PE Earth)'}
                </div>
                <div className="text-[11px] text-blue-300/80">
                  Connect incoming plant utility supply wires to terminal block <strong>TB-SOURCE</strong>.
                </div>
              </div>
            </div>
            <div className="text-right pl-2 hidden sm:block">
              <span className="text-[10px] font-mono text-emerald-400 font-bold block">
                V_IN: {mcbClosed ? voltage : '0V'}
              </span>
              <span className="text-[9px] text-slate-400">Status: {mcbClosed ? 'ENERGIZED' : 'ISOLATED'}</span>
            </div>
          </div>

          {/* Load Connection Point Callout */}
          <div className="p-3.5 bg-emerald-950/40 border-2 border-emerald-500/60 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-600 text-white rounded-lg">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold uppercase text-emerald-400 tracking-wider">
                    [IDENTIFIED LOAD CONNECTION POINT]
                  </span>
                  <span className="px-1.5 py-0.2 text-[9px] font-bold bg-emerald-500/20 text-emerald-300 rounded">
                    Motor / Equipment
                  </span>
                </div>
                <div className="text-sm font-bold text-white mt-0.5">
                  {phase === '3phase'
                    ? '3-Phase Induction Motor (U / T1 • V / T2 • W / T3 • ⏚ PE)'
                    : '220V Motor / Heating Load (L+ Load • N- Return • ⏚ PE)'}
                </div>
                <div className="text-[11px] text-emerald-300/80">
                  Connect your target product, heater, or motor wires to <strong>TB-LOAD</strong>.
                </div>
              </div>
            </div>
            <div className="text-right pl-2 hidden sm:block">
              <span className="text-[10px] font-mono text-emerald-400 font-bold block">
                CURRENT: {currentAmps.toFixed(1)} A
              </span>
              <span className="text-[9px] text-slate-400">RPM: {motorRpm}</span>
            </div>
          </div>
        </div>

        {/* Live Interactive Telemetry & Pushbutton Door Station */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Panel Fascia Pushbuttons & Pilot Lamps */}
            <div className="flex items-center flex-wrap gap-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-sky-400" />
                Panel Door Pushbuttons &amp; Lamps:
              </span>

              {/* Start Button (Green) */}
              <button
                onClick={() => startMotor('fwd')}
                disabled={!mcbClosed || isTripped || isEStopActive}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
                  isRunning
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                    : 'bg-emerald-700 hover:bg-emerald-600 text-white active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>START (NO)</span>
              </button>

              {/* Reverse Button (if Forward/Reverse) */}
              {starterType === 'forward_reverse' && (
                <button
                  onClick={() => startMotor('rev')}
                  disabled={!mcbClosed || isTripped || isEStopActive}
                  className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
                    isRunning && motorDirection === 'rev'
                      ? 'bg-amber-600 text-white ring-2 ring-amber-400'
                      : 'bg-amber-700 hover:bg-amber-600 text-white active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>REV START</span>
                </button>
              )}

              {/* Stop Button (Red) */}
              <button
                onClick={stopMotor}
                className="px-4 py-2 bg-red-700 hover:bg-red-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all cursor-pointer"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>STOP (NC)</span>
              </button>

              {/* Emergency Stop Mushroom Button */}
              <button
                onClick={toggleEStop}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
                  isEStopActive
                    ? 'bg-red-600 text-white ring-4 ring-yellow-400 animate-pulse'
                    : 'bg-red-800 hover:bg-red-700 text-white'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span>{isEStopActive ? 'E-STOP LOCKED (TWIST RESET)' : 'EMERGENCY STOP'}</span>
              </button>

              {/* Test Overload Trip Button */}
              <button
                onClick={isTripped ? resetOverloadTrip : triggerOverloadTrip}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  isTripped
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <Flame className="w-3.5 h-3.5 inline mr-1 text-amber-400" />
                {isTripped ? 'Reset OLR 95-96 Trip' : 'Test Overload Trip'}
              </button>
            </div>

            {/* Pilot Lamps Display */}
            <div className="flex items-center space-x-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
              {/* Power On White */}
              <div className="flex items-center gap-1.5">
                <div className={`w-3.5 h-3.5 rounded-full ${mcbClosed ? 'bg-white shadow-[0_0_8px_white]' : 'bg-slate-700'}`} />
                <span className="text-[10px] font-bold text-slate-300">MAINS</span>
              </div>
              {/* Run Green */}
              <div className="flex items-center gap-1.5">
                <div className={`w-3.5 h-3.5 rounded-full ${isRunning ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-slate-700'}`} />
                <span className="text-[10px] font-bold text-slate-300">RUN</span>
              </div>
              {/* Stop Red */}
              <div className="flex items-center gap-1.5">
                <div className={`w-3.5 h-3.5 rounded-full ${!isRunning && mcbClosed && !isTripped ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-slate-700'}`} />
                <span className="text-[10px] font-bold text-slate-300">STOP</span>
              </div>
              {/* Trip Amber */}
              <div className="flex items-center gap-1.5">
                <div className={`w-3.5 h-3.5 rounded-full ${isTripped ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-ping' : 'bg-slate-700'}`} />
                <span className="text-[10px] font-bold text-slate-300">TRIP</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab 1: Physical Panel Cabinet Layout (Interior & DIN Rail) */}
        {activeTab === 'enclosure' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                Physical Enclosure Interior (TS-35 DIN Rails &amp; Wire Duct)
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                Enclosure: IP65 Heavy Steel • Standard Industrial Starter Panel
              </span>
            </div>

            {/* Industrial Cabinet SVG Diagram */}
            <div className="w-full overflow-x-auto bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex justify-center">
              <svg width="860" height="520" viewBox="0 0 860 520" className="select-none">
                {/* Cabinet Outline Outer Enclosure */}
                <rect x="20" y="20" width="820" height="480" rx="16" fill="#1e2433" stroke="#475569" strokeWidth="4" />
                <rect x="35" y="35" width="790" height="450" rx="10" fill="#0f172a" stroke="#334155" strokeWidth="2" />

                {/* Vertical Cable Ducts (Slotted Wire Trunking) */}
                <rect x="45" y="50" width="30" height="420" fill="#334155" stroke="#475569" strokeWidth="1" />
                <rect x="785" y="50" width="30" height="420" fill="#334155" stroke="#475569" strokeWidth="1" />
                <text x="60" y="260" fill="#94a3b8" fontSize="8" fontFamily="monospace" transform="rotate(-90 60 260)">
                  WIRING TRUNKING DUCT
                </text>

                {/* Horizontal Slotted Wire Duct Middle */}
                <rect x="45" y="250" width="770" height="24" fill="#334155" stroke="#475569" strokeWidth="1" />

                {/* TOP DIN RAIL (Power Distribution) */}
                <rect x="85" y="110" width="690" height="12" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
                <line x1="85" y1="116" x2="775" y2="116" stroke="#64748b" strokeWidth="1.5" strokeDasharray="6 3" />
                <text x="90" y="102" fill="#94a3b8" fontSize="9" fontWeight="bold" fontFamily="monospace">
                  TOP DIN RAIL: MAIN POWER SWITCHGEAR (L1 / L2 / L3)
                </text>

                {/* BOTTOM DIN RAIL (Control & Terminals) */}
                <rect x="85" y="370" width="690" height="12" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
                <line x1="85" y1="376" x2="775" y2="376" stroke="#64748b" strokeWidth="1.5" strokeDasharray="6 3" />
                <text x="90" y="362" fill="#94a3b8" fontSize="9" fontWeight="bold" fontFamily="monospace">
                  BOTTOM DIN RAIL: CONTROL TRANSFORMER &amp; TERMINAL BLOCKS
                </text>

                {/* --- COMPONENT 1: Main Incoming MCCB / Isolator --- */}
                <g transform="translate(110, 60)">
                  <rect x="0" y="0" width="85" height="115" rx="5" fill="#1e293b" stroke="#f43f5e" strokeWidth="2" />
                  <rect x="0" y="0" width="85" height="16" rx="4" fill="#881337" />
                  <text x="42" y="11" textAnchor="middle" fill="#ffe4e6" fontSize="8" fontWeight="bold">
                    MAIN MCCB
                  </text>
                  <text x="42" y="26" textAnchor="middle" fill="#cbd5e1" fontSize="7.5" fontWeight="bold">
                    {voltage} {phase === '3phase' ? '3P 32A' : '2P 20A'}
                  </text>
                  {/* Breaker Switch Handle */}
                  <rect
                    x="30"
                    y={mcbClosed ? 40 : 65}
                    width="25"
                    height="20"
                    rx="3"
                    fill={mcbClosed ? '#10b981' : '#ef4444'}
                    stroke="#ffffff"
                    strokeWidth="1"
                    className="cursor-pointer"
                    onClick={() => setMcbClosed(!mcbClosed)}
                  />
                  <text x="42" y={mcbClosed ? 53 : 78} textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">
                    {mcbClosed ? 'ON' : 'OFF'}
                  </text>
                  {/* Terminals */}
                  <circle cx="15" cy="-4" r="3.5" fill="#ef4444" />
                  <circle cx="42" cy="-4" r="3.5" fill="#eab308" />
                  <circle cx="70" cy="-4" r="3.5" fill="#3b82f6" />
                  <text x="42" y="105" textAnchor="middle" fill="#94a3b8" fontSize="7">
                    Click handle to trip
                  </text>
                </g>

                {/* --- COMPONENT 2: Main Contactor KM1 --- */}
                <g transform="translate(230, 50)">
                  <rect
                    x="0"
                    y="0"
                    width="115"
                    height="135"
                    rx="6"
                    fill={isRunning ? '#1e2d42' : '#1e293b'}
                    stroke={isRunning ? '#38bdf8' : '#64748b'}
                    strokeWidth="2"
                    className={isRunning ? 'drop-shadow-lg' : undefined}
                  />
                  <rect x="0" y="0" width="115" height="18" rx="5" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                  <text x="57" y="13" textAnchor="middle" fill="#f8fafc" fontSize="9" fontWeight="bold">
                    CONTACTOR KM1
                  </text>
                  {/* Contactor Active Window Indicator */}
                  <rect x="35" y="28" width="45" height="24" rx="3" fill="#090d16" stroke="#475569" strokeWidth="1" />
                  <rect
                    x="40"
                    y="32"
                    width="35"
                    height="16"
                    rx="2"
                    fill={isRunning ? '#22c55e' : '#dc2626'}
                  />
                  <text x="57" y="43" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">
                    {isRunning ? 'PULLED IN' : 'RELEASED'}
                  </text>
                  {/* Terminal Labels */}
                  <text x="18" y="70" fill="#fca5a5" fontSize="7.5" fontWeight="bold">1/L1</text>
                  <text x="52" y="70" fill="#fde047" fontSize="7.5" fontWeight="bold">3/L2</text>
                  <text x="85" y="70" fill="#93c5fd" fontSize="7.5" fontWeight="bold">5/L3</text>

                  <text x="18" y="115" fill="#fca5a5" fontSize="7.5" fontWeight="bold">2/T1</text>
                  <text x="52" y="115" fill="#fde047" fontSize="7.5" fontWeight="bold">4/T2</text>
                  <text x="85" y="115" fill="#93c5fd" fontSize="7.5" fontWeight="bold">6/T3</text>

                  <text x="57" y="128" textAnchor="middle" fill="#38bdf8" fontSize="7" fontWeight="bold">
                    Coil: A1 - A2 (220V)
                  </text>
                </g>

                {/* --- COMPONENT 3: Thermal Overload Relay (OLR) --- */}
                <g transform="translate(380, 55)">
                  <rect x="0" y="0" width="105" height="130" rx="6" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
                  <rect x="0" y="0" width="105" height="18" rx="5" fill="#78350f" />
                  <text x="52" y="13" textAnchor="middle" fill="#fef3c7" fontSize="8.5" fontWeight="bold">
                    OVERLOAD RELAY
                  </text>
                  {/* Current Dial */}
                  <circle cx="52" cy="45" r="16" fill="#0f172a" stroke="#f59e0b" strokeWidth="1.5" />
                  <line x1="52" y1="45" x2="62" y2="38" stroke="#f59e0b" strokeWidth="2" />
                  <text x="52" y="70" textAnchor="middle" fill="#fde047" fontSize="7.5" fontWeight="bold">
                    SET: 8.5A
                  </text>
                  {/* Reset & Test Buttons */}
                  <rect x="18" y="80" width="30" height="16" rx="3" fill="#3b82f6" />
                  <text x="33" y="91" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">
                    RESET
                  </text>
                  <rect
                    x="56"
                    y="80"
                    width="30"
                    height="16"
                    rx="3"
                    fill="#ef4444"
                    className="cursor-pointer"
                    onClick={triggerOverloadTrip}
                  />
                  <text x="71" y="91" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">
                    TEST
                  </text>
                  <text x="52" y="116" textAnchor="middle" fill={isTripped ? '#ef4444' : '#22c55e'} fontSize="8" fontWeight="bold">
                    {isTripped ? '⚠️ TRIPPED (95-96 OPEN)' : '✓ NORMAL (CLOSED)'}
                  </text>
                </g>

                {/* --- COMPONENT 4: Control Step-Down Transformer (440V -> 220V/24V) --- */}
                <g transform="translate(520, 65)">
                  <rect x="0" y="0" width="95" height="105" rx="5" fill="#1e293b" stroke="#818cf8" strokeWidth="1.5" />
                  <rect x="0" y="0" width="95" height="16" rx="4" fill="#312e81" />
                  <text x="47" y="11" textAnchor="middle" fill="#e0e7ff" fontSize="7.5" fontWeight="bold">
                    CTRL TRANSFORMER
                  </text>
                  <text x="47" y="32" textAnchor="middle" fill="#a5b4fc" fontSize="7.5">
                    PRI: {voltage}
                  </text>
                  <text x="47" y="46" textAnchor="middle" fill="#34d399" fontSize="7.5" fontWeight="bold">
                    SEC: 24V / 220V
                  </text>
                  <circle cx="20" cy="85" r="8" fill="#0f172a" stroke="#818cf8" strokeWidth="1" />
                  <circle cx="75" cy="85" r="8" fill="#0f172a" stroke="#818cf8" strokeWidth="1" />
                  <path d="M 28 85 Q 47 70 67 85" fill="none" stroke="#818cf8" strokeWidth="1.5" />
                </g>

                {/* --- TERMINAL BLOCKS ON BOTTOM DIN RAIL --- */}
                {/* 1. TB-SOURCE: INCOMING SOURCE CONNECTION TERMINALS */}
                <g transform="translate(110, 315)">
                  <rect x="0" y="0" width="180" height="90" rx="6" fill="#0f172a" stroke="#3b82f6" strokeWidth="2" />
                  {/* Identified Header Badge */}
                  <rect x="0" y="0" width="180" height="20" rx="5" fill="#1d4ed8" />
                  <text x="90" y="14" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold" letterSpacing="0.05em">
                    ⚡ TB-SOURCE (INPUT CONNECTION)
                  </text>
                  {/* Screw terminals */}
                  {['L1 (R)', 'L2 (Y)', 'L3 (B)', 'N', 'PE ⏚'].map((lbl, idx) => {
                    const colors = ['#ef4444', '#eab308', '#3b82f6', '#64748b', '#10b981'];
                    const xPos = 20 + idx * 35;
                    return (
                      <g key={idx} transform={`translate(${xPos}, 45)`}>
                        <rect x="-14" y="-14" width="28" height="35" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1" />
                        <circle cx="0" cy="-4" r="5" fill="#334155" stroke={colors[idx]} strokeWidth="1.5" />
                        <line x1="-3" y1="-4" x2="3" y2="-4" stroke="#ffffff" strokeWidth="1" />
                        <text x="0" y="15" textAnchor="middle" fill={colors[idx]} fontSize="7" fontWeight="bold">
                          {lbl}
                        </text>
                      </g>
                    );
                  })}
                  <text x="90" y="80" textAnchor="middle" fill="#93c5fd" fontSize="7.5" fontWeight="bold">
                    Connect Plant Supply Cables Here
                  </text>
                </g>

                {/* 2. TB-LOAD: OUTGOING MOTOR / LOAD CONNECTION TERMINALS */}
                <g transform="translate(360, 315)">
                  <rect x="0" y="0" width="160" height="90" rx="6" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
                  <rect x="0" y="0" width="160" height="20" rx="5" fill="#047857" />
                  <text x="80" y="14" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold" letterSpacing="0.05em">
                    🔌 TB-LOAD (OUTPUT CONNECTION)
                  </text>
                  {/* Terminal posts */}
                  {['U (T1)', 'V (T2)', 'W (T3)', 'PE ⏚'].map((lbl, idx) => {
                    const colors = ['#ef4444', '#eab308', '#3b82f6', '#10b981'];
                    const xPos = 22 + idx * 38;
                    return (
                      <g key={idx} transform={`translate(${xPos}, 45)`}>
                        <rect x="-14" y="-14" width="28" height="35" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1" />
                        <circle cx="0" cy="-4" r="5" fill="#334155" stroke={colors[idx]} strokeWidth="1.5" />
                        <line x1="-3" y1="-4" x2="3" y2="-4" stroke="#ffffff" strokeWidth="1" />
                        <text x="0" y="15" textAnchor="middle" fill={colors[idx]} fontSize="7" fontWeight="bold">
                          {lbl}
                        </text>
                      </g>
                    );
                  })}
                  <text x="80" y="80" textAnchor="middle" fill="#6ee7b7" fontSize="7.5" fontWeight="bold">
                    Connect Motor Wires (U, V, W, PE)
                  </text>
                </g>

                {/* 3. PHYSICAL 3-PHASE MOTOR ON THE RIGHT */}
                <g transform="translate(640, 315)">
                  <rect x="-10" y="-15" width="160" height="150" rx="8" fill="#111827" stroke="#38bdf8" strokeWidth="2" />
                  <rect x="-10" y="-15" width="160" height="22" rx="6" fill="#0369a1" />
                  <text x="70" y="0" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">
                    CONNECTED 3Φ MOTOR
                  </text>

                  {/* Motor Frame Cylinder */}
                  <rect x="25" y="30" width="70" height="60" rx="6" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
                  {/* Stator Cooling Fins */}
                  <line x1="35" y1="30" x2="35" y2="90" stroke="#475569" strokeWidth="1" />
                  <line x1="45" y1="30" x2="45" y2="90" stroke="#475569" strokeWidth="1" />
                  <line x1="55" y1="30" x2="55" y2="90" stroke="#475569" strokeWidth="1" />
                  <line x1="65" y1="30" x2="65" y2="90" stroke="#475569" strokeWidth="1" />
                  <line x1="75" y1="30" x2="75" y2="90" stroke="#475569" strokeWidth="1" />

                  {/* Motor Shaft with spinning animation */}
                  <g transform="translate(105, 60)">
                    <rect x="0" y="-5" width="28" height="10" fill="#cbd5e1" stroke="#475569" strokeWidth="1" />
                    {/* Spinning blade */}
                    <circle
                      cx="25"
                      cy="0"
                      r="16"
                      fill={isRunning ? '#38bdf8' : '#64748b'}
                      fillOpacity="0.4"
                      stroke={isRunning ? '#38bdf8' : '#94a3b8'}
                      strokeWidth="1.5"
                      className={isRunning ? 'animate-spin' : undefined}
                    />
                    <line x1="12" y1="0" x2="38" y2="0" stroke="#ffffff" strokeWidth="2" />
                    <line x1="25" y1="-13" x2="25" y2="13" stroke="#ffffff" strokeWidth="2" />
                  </g>

                  {/* Motor Running Telemetry Badge */}
                  <text x="70" y="110" textAnchor="middle" fill={isRunning ? '#34d399' : '#94a3b8'} fontSize="8" fontWeight="bold">
                    {isRunning ? `ROTATING @ ${motorRpm} RPM` : 'MOTOR AT REST (0 RPM)'}
                  </text>
                  <text x="70" y="122" textAnchor="middle" fill="#cbd5e1" fontSize="7" fontFamily="monospace">
                    {voltage} • 5.0 HP • 50Hz
                  </text>
                </g>

                {/* Wiring Cables from Contactor to Overload and Terminals */}
                {/* L1 Red Line */}
                <path
                  d="M 195 110 L 230 110"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2.5"
                  strokeDasharray={isRunning ? '4 2' : undefined}
                />
                {/* L2 Yellow Line */}
                <path
                  d="M 195 125 L 230 125"
                  fill="none"
                  stroke="#eab308"
                  strokeWidth="2.5"
                  strokeDasharray={isRunning ? '4 2' : undefined}
                />
                {/* L3 Blue Line */}
                <path
                  d="M 195 140 L 230 140"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2.5"
                  strokeDasharray={isRunning ? '4 2' : undefined}
                />
              </svg>
            </div>
          </div>
        )}

        {/* Tab 2: Complete Main Power Circuit (High Current Schematic) */}
        {activeTab === 'main_circuit' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Complete Main Power Circuit Diagram ({voltage} {phase === '3phase' ? 'Three Phase AC' : 'Single Phase AC'})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  High-current path from utility mains source to the induction motor / load with isolated connection terminals.
                </p>
              </div>
              <span className="px-2.5 py-1 text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg">
                CURRENT RATING: {currentAmps > 0 ? `${currentAmps.toFixed(1)} A (LOAD)` : '0.0 A (IDLE)'}
              </span>
            </div>

            {/* Complete Main Circuit Schematic Drawing */}
            <div className="w-full overflow-x-auto bg-slate-950 p-6 rounded-xl border border-slate-800/80 flex justify-center">
              <svg width="880" height="380" viewBox="0 0 880 380" className="select-none font-mono">
                {/* 1. SOURCE SECTION WITH CALLOUT */}
                <g transform="translate(30, 40)">
                  {/* Container Outline */}
                  <rect x="0" y="0" width="160" height="300" rx="10" fill="#1e3a8a" fillOpacity="0.1" stroke="#3b82f6" strokeWidth="2" strokeDasharray="6 3" />
                  <rect x="10" y="-12" width="140" height="22" rx="4" fill="#1d4ed8" />
                  <text x="80" y="3" textAnchor="middle" fill="#ffffff" fontSize="8.5" fontWeight="bold">
                    ⚡ SOURCE CONNECTION
                  </text>

                  {/* 3-Phase Rails L1, L2, L3, N, PE */}
                  <text x="20" y="55" fill="#ef4444" fontSize="11" fontWeight="bold">L1 (Red)</text>
                  <text x="20" y="105" fill="#eab308" fontSize="11" fontWeight="bold">L2 (Yellow)</text>
                  <text x="20" y="155" fill="#3b82f6" fontSize="11" fontWeight="bold">L3 (Blue)</text>
                  <text x="20" y="205" fill="#94a3b8" fontSize="11" fontWeight="bold">N (Neutral)</text>
                  <text x="20" y="255" fill="#34d399" fontSize="11" fontWeight="bold">PE ⏚ (Earth)</text>

                  {/* Terminal Studs */}
                  <circle cx="140" cy="50" r="5" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
                  <circle cx="140" cy="100" r="5" fill="#eab308" stroke="#ffffff" strokeWidth="1" />
                  <circle cx="140" cy="150" r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="1" />
                  <circle cx="140" cy="200" r="5" fill="#64748b" stroke="#ffffff" strokeWidth="1" />
                  <circle cx="140" cy="250" r="5" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
                </g>

                {/* 2. MAIN CIRCUIT BREAKER Q1 */}
                <g transform="translate(230, 40)">
                  <text x="35" y="20" textAnchor="middle" fill="#f43f5e" fontSize="9" fontWeight="bold">
                    BREAKER Q1
                  </text>
                  {/* Contacts */}
                  <g stroke="#f43f5e" strokeWidth="2.5" fill="none">
                    {/* Pole 1 */}
                    <line x1="0" y1="50" x2="20" y2="50" />
                    <line x1="20" y1="50" x2="45" y2={mcbClosed ? 50 : 35} strokeWidth="3" />
                    <line x1="45" y1="50" x2="70" y2="50" />
                    {/* Pole 2 */}
                    <line x1="0" y1="100" x2="20" y2="100" />
                    <line x1="20" y1="100" x2="45" y2={mcbClosed ? 100 : 85} strokeWidth="3" />
                    <line x1="45" y1="100" x2="70" y2="100" />
                    {/* Pole 3 */}
                    <line x1="0" y1="150" x2="20" y2="150" />
                    <line x1="20" y1="150" x2="45" y2={mcbClosed ? 150 : 135} strokeWidth="3" />
                    <line x1="45" y1="150" x2="70" y2="150" />
                  </g>
                  {/* Mechanical tie bar */}
                  <line x1="35" y1="35" x2="35" y2="155" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
                </g>

                {/* 3. MAIN CONTACTOR KM1 POWER POLES */}
                <g transform="translate(340, 40)">
                  <text x="35" y="20" textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="bold">
                    CONTACTOR KM1
                  </text>
                  <g stroke="#f59e0b" strokeWidth="2.5" fill="none">
                    {/* 1/L1 - 2/T1 */}
                    <line x1="0" y1="50" x2="20" y2="50" />
                    <line x1="20" y1="50" x2="45" y2={isRunning ? 50 : 35} strokeWidth="3" />
                    <line x1="45" y1="50" x2="70" y2="50" />
                    {/* 3/L2 - 4/T2 */}
                    <line x1="0" y1="100" x2="20" y2="100" />
                    <line x1="20" y1="100" x2="45" y2={isRunning ? 100 : 85} strokeWidth="3" />
                    <line x1="45" y1="100" x2="70" y2="100" />
                    {/* 5/L3 - 6/T3 */}
                    <line x1="0" y1="150" x2="20" y2="150" />
                    <line x1="20" y1="150" x2="45" y2={isRunning ? 150 : 135} strokeWidth="3" />
                    <line x1="45" y1="150" x2="70" y2="150" />
                  </g>
                  {/* Mechanical tie bar */}
                  <line x1="35" y1="35" x2="35" y2="155" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
                </g>

                {/* 4. OVERLOAD RELAY (OLR) THERMAL HEATERS */}
                <g transform="translate(450, 40)">
                  <text x="35" y="20" textAnchor="middle" fill="#ef4444" fontSize="9" fontWeight="bold">
                    OLR HEATERS
                  </text>
                  <g stroke="#ef4444" strokeWidth="2" fill="none">
                    {/* Heater 1 */}
                    <path d="M 0 50 L 20 50 Q 35 35 50 50 L 70 50" />
                    {/* Heater 2 */}
                    <path d="M 0 100 L 20 100 Q 35 85 50 100 L 70 100" />
                    {/* Heater 3 */}
                    <path d="M 0 150 L 20 150 Q 35 135 50 150 L 70 150" />
                  </g>
                </g>

                {/* 5. LOAD SECTION WITH CALLOUT & MOTOR */}
                <g transform="translate(570, 40)">
                  <rect x="0" y="0" width="280" height="300" rx="10" fill="#065f46" fillOpacity="0.1" stroke="#10b981" strokeWidth="2" strokeDasharray="6 3" />
                  <rect x="10" y="-12" width="160" height="22" rx="4" fill="#047857" />
                  <text x="90" y="3" textAnchor="middle" fill="#ffffff" fontSize="8.5" fontWeight="bold">
                    🔌 LOAD CONNECTION (MOTOR)
                  </text>

                  {/* Motor Terminal Studs U1, V1, W1 */}
                  <circle cx="40" cy="50" r="5" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
                  <text x="52" y="54" fill="#fca5a5" fontSize="9" fontWeight="bold">U1 (T1)</text>

                  <circle cx="40" cy="100" r="5" fill="#eab308" stroke="#ffffff" strokeWidth="1" />
                  <text x="52" y="104" fill="#fde047" fontSize="9" fontWeight="bold">V1 (T2)</text>

                  <circle cx="40" cy="150" r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="1" />
                  <text x="52" y="154" fill="#93c5fd" fontSize="9" fontWeight="bold">W1 (T3)</text>

                  <circle cx="40" cy="250" r="5" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
                  <text x="52" y="254" fill="#6ee7b7" fontSize="9" fontWeight="bold">PE ⏚ Earth</text>

                  {/* Motor Circle Symbol */}
                  <g transform="translate(190, 100)">
                    <circle cx="0" cy="0" r="45" fill="#0f172a" stroke="#38bdf8" strokeWidth="3" />
                    <text x="0" y="-8" textAnchor="middle" fill="#ffffff" fontSize="20" fontWeight="bold">
                      M
                    </text>
                    <text x="0" y="14" textAnchor="middle" fill="#38bdf8" fontSize="13" fontWeight="bold">
                      3 ~
                    </text>
                    <text x="0" y="28" textAnchor="middle" fill="#94a3b8" fontSize="8">
                      {voltage} 5HP
                    </text>
                  </g>

                  {/* Wires to Motor */}
                  <line x1="45" y1="50" x2="145" y2="70" stroke="#ef4444" strokeWidth="2" />
                  <line x1="45" y1="100" x2="145" y2="100" stroke="#eab308" strokeWidth="2" />
                  <line x1="45" y1="150" x2="145" y2="130" stroke="#3b82f6" strokeWidth="2" />
                </g>

                {/* Inter-component connecting wires */}
                {/* L1 Wire */}
                <line x1="170" y1="90" x2="230" y2="90" stroke="#ef4444" strokeWidth="3" />
                <line x1="300" y1="90" x2="340" y2="90" stroke="#ef4444" strokeWidth="3" />
                <line x1="410" y1="90" x2="450" y2="90" stroke="#ef4444" strokeWidth="3" />
                <line x1="520" y1="90" x2="610" y2="90" stroke="#ef4444" strokeWidth="3" />

                {/* L2 Wire */}
                <line x1="170" y1="140" x2="230" y2="140" stroke="#eab308" strokeWidth="3" />
                <line x1="300" y1="140" x2="340" y2="140" stroke="#eab308" strokeWidth="3" />
                <line x1="410" y1="140" x2="450" y2="140" stroke="#eab308" strokeWidth="3" />
                <line x1="520" y1="140" x2="610" y2="140" stroke="#eab308" strokeWidth="3" />

                {/* L3 Wire */}
                <line x1="170" y1="190" x2="230" y2="190" stroke="#3b82f6" strokeWidth="3" />
                <line x1="300" y1="190" x2="340" y2="190" stroke="#3b82f6" strokeWidth="3" />
                <line x1="410" y1="190" x2="450" y2="190" stroke="#3b82f6" strokeWidth="3" />
                <line x1="520" y1="190" x2="610" y2="190" stroke="#3b82f6" strokeWidth="3" />

                {/* Protective Earth PE Green Line */}
                <line x1="170" y1="290" x2="610" y2="290" stroke="#10b981" strokeWidth="2.5" strokeDasharray="6 3" />
              </svg>
            </div>
          </div>
        )}

        {/* Tab 3: Complete Panel Control Circuit (Ladder Logic Diagram) */}
        {activeTab === 'control_circuit' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  Complete Panel Control Circuit (220V / 24V Ladder Logic)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Full control wiring with Stop pushbutton, Start pushbutton, OLR 95-96 safety contact, 13-14 holding seal-in contact, and pilot lamps.
                </p>
              </div>
              <span className="px-2.5 py-1 text-xs font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 rounded-lg">
                COIL STATE: {isRunning ? 'ENERGIZED (220V)' : 'DE-ENERGIZED (0V)'}
              </span>
            </div>

            {/* Ladder Logic Control Schematic */}
            <div className="w-full overflow-x-auto bg-slate-950 p-6 rounded-xl border border-slate-800/80 flex justify-center">
              <svg width="860" height="360" viewBox="0 0 860 360" className="select-none font-mono">
                {/* Top Power Rail (Control Phase L1 / 220V AC) */}
                <line x1="40" y1="40" x2="820" y2="40" stroke="#ef4444" strokeWidth="3" />
                <text x="45" y="30" fill="#fca5a5" fontSize="10" fontWeight="bold">
                  CONTROL SUPPLY LINE (+220V / HOT)
                </text>

                {/* Bottom Neutral Rail (Neutral N / 0V) */}
                <line x1="40" y1="320" x2="820" y2="320" stroke="#3b82f6" strokeWidth="3" />
                <text x="45" y="340" fill="#93c5fd" fontSize="10" fontWeight="bold">
                  CONTROL RETURN (NEUTRAL / 0V)
                </text>

                {/* RUNG 1: MAIN CONTACTOR COIL KM1 RUNG */}
                {/* 1. Control Fuse / MCB */}
                <g transform="translate(60, 40)">
                  <line x1="0" y1="0" x2="0" y2="30" stroke="#ef4444" strokeWidth="2" />
                  <rect x="-10" y="30" width="20" height="30" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1.5" />
                  <line x1="0" y1="30" x2="0" y2="60" stroke="#cbd5e1" strokeWidth="1" />
                  <text x="16" y="50" fill="#94a3b8" fontSize="8" fontWeight="bold">FU1 (6A)</text>
                  <line x1="0" y1="60" x2="0" y2="80" stroke="#ef4444" strokeWidth="2" />
                </g>

                {/* 2. OLR Trip Contact 95-96 (NC) */}
                <g transform="translate(60, 120)">
                  <line x1="0" y1="0" x2="0" y2="15" stroke="#ef4444" strokeWidth="2" />
                  {/* NC Contact Symbol */}
                  <line x1="-12" y1="15" x2="12" y2="15" stroke="#ef4444" strokeWidth="2" />
                  <line x1="-12" y1="30" x2="12" y2="30" stroke="#ef4444" strokeWidth="2" />
                  <line x1="12" y1="10" x2="-8" y2="35" stroke="#ef4444" strokeWidth={isTripped ? '0' : '2'} />
                  {isTripped && <line x1="15" y1="5" x2="-2" y2="25" stroke="#ef4444" strokeWidth="2" />}
                  <text x="18" y="24" fill="#fca5a5" fontSize="8" fontWeight="bold">OLR (95-96 NC)</text>
                  <line x1="0" y1="30" x2="0" y2="50" stroke="#ef4444" strokeWidth="2" />
                </g>

                {/* 3. Emergency Stop Push Button (NC) */}
                <g transform="translate(60, 170)">
                  <line x1="0" y1="0" x2="0" y2="15" stroke="#ef4444" strokeWidth="2" />
                  <line x1="-12" y1="15" x2="12" y2="15" stroke="#ef4444" strokeWidth="2" />
                  <line x1="-12" y1="30" x2="12" y2="30" stroke="#ef4444" strokeWidth="2" />
                  {/* Mushroom E-stop symbol */}
                  <path d="M -6 10 C -6 6 6 6 6 10 Z" fill="#ef4444" />
                  <line x1="0" y1="10" x2="0" y2="15" stroke="#ef4444" strokeWidth="1.5" />
                  <text x="18" y="24" fill="#f87171" fontSize="8" fontWeight="bold">E-STOP (NC)</text>
                  <line x1="0" y1="30" x2="0" y2="60" stroke="#ef4444" strokeWidth="2" />
                </g>

                {/* 4. Stop Push Button (NC) */}
                <g transform="translate(180, 100)">
                  <line x1="-120" y1="130" x2="0" y2="130" stroke="#ef4444" strokeWidth="2" />
                  <line x1="0" y1="130" x2="20" y2="130" stroke="#ef4444" strokeWidth="2" />
                  {/* NC Push Button */}
                  <line x1="20" y1="120" x2="20" y2="140" stroke="#ef4444" strokeWidth="2" />
                  <line x1="40" y1="120" x2="40" y2="140" stroke="#ef4444" strokeWidth="2" />
                  <line x1="16" y1="125" x2="44" y2="125" stroke="#ef4444" strokeWidth="2.5" />
                  <line x1="30" y1="115" x2="30" y2="125" stroke="#ef4444" strokeWidth="1.5" />
                  <text x="30" y="108" textAnchor="middle" fill="#fca5a5" fontSize="8" fontWeight="bold">STOP PB (NC)</text>
                  <line x1="40" y1="130" x2="70" y2="130" stroke="#ef4444" strokeWidth="2" />
                </g>

                {/* 5. Parallel Branch: Start PB (NO) + KM1 Holding Contact (13-14 NO) */}
                <g transform="translate(250, 100)">
                  {/* Top Branch: START PUSH BUTTON */}
                  <line x1="0" y1="130" x2="20" y2="100" stroke="#22c55e" strokeWidth="2" />
                  <line x1="20" y1="100" x2="40" y2="100" stroke="#22c55e" strokeWidth="2" />
                  {/* NO Pushbutton symbol */}
                  <line x1="40" y1="90" x2="40" y2="110" stroke="#22c55e" strokeWidth="2" />
                  <line x1="60" y1="90" x2="60" y2="110" stroke="#22c55e" strokeWidth="2" />
                  <line x1="36" y1="95" x2="64" y2="95" stroke="#22c55e" strokeWidth="2" strokeDasharray="3 2" />
                  <line x1="50" y1="85" x2="50" y2="95" stroke="#22c55e" strokeWidth="1.5" />
                  <text x="50" y="80" textAnchor="middle" fill="#86efac" fontSize="8" fontWeight="bold">START PB (NO)</text>
                  <line x1="60" y1="100" x2="80" y2="100" stroke="#22c55e" strokeWidth="2" />
                  <line x1="80" y1="100" x2="100" y2="130" stroke="#22c55e" strokeWidth="2" />

                  {/* Bottom Branch: KM1 13-14 NO Auxiliary Holding Contact */}
                  <line x1="0" y1="130" x2="20" y2="160" stroke="#f59e0b" strokeWidth="2" />
                  <line x1="20" y1="160" x2="40" y2="160" stroke="#f59e0b" strokeWidth="2" />
                  {/* Contact NO */}
                  <line x1="40" y1="150" x2="40" y2="170" stroke="#f59e0b" strokeWidth="2" />
                  <line x1="60" y1="150" x2="60" y2="170" stroke="#f59e0b" strokeWidth="2" />
                  <line x1="40" y1="160" x2="56" y2={isRunning ? 160 : 148} stroke="#f59e0b" strokeWidth="2.5" />
                  <text x="50" y="184" textAnchor="middle" fill="#fde047" fontSize="8" fontWeight="bold">KM1 (13-14 NO)</text>
                  <line x1="60" y1="160" x2="80" y2="160" stroke="#f59e0b" strokeWidth="2" />
                  <line x1="80" y1="160" x2="100" y2="130" stroke="#f59e0b" strokeWidth="2" />
                </g>

                {/* 6. Contactor Coil KM1 (A1 - A2) */}
                <g transform="translate(420, 230)">
                  <line x1="-70" y1="0" x2="0" y2="0" stroke="#38bdf8" strokeWidth="2" />
                  {/* Coil Circle */}
                  <circle cx="25" cy="0" r="18" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                  <text x="25" y="-4" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">KM1</text>
                  <text x="25" y="8" textAnchor="middle" fill="#38bdf8" fontSize="8">COIL</text>
                  <text x="3" y="-12" fill="#7dd3fc" fontSize="7" fontWeight="bold">A1</text>
                  <text x="40" y="-12" fill="#7dd3fc" fontSize="7" fontWeight="bold">A2</text>
                  {/* Wire to Neutral */}
                  <line x1="43" y1="0" x2="100" y2="0" stroke="#3b82f6" strokeWidth="2" />
                  <line x1="100" y1="0" x2="100" y2="90" stroke="#3b82f6" strokeWidth="2" />
                </g>

                {/* RUNG 2: RUN PILOT LAMP (GREEN) */}
                <g transform="translate(560, 80)">
                  <line x1="0" y1="-40" x2="0" y2="30" stroke="#22c55e" strokeWidth="1.5" />
                  {/* Auxiliary contact KM1 NO */}
                  <line x1="-8" y1="30" x2="8" y2="30" stroke="#22c55e" strokeWidth="1.5" />
                  <line x1="-8" y1="45" x2="8" y2="45" stroke="#22c55e" strokeWidth="1.5" />
                  <line x1="-8" y1="30" x2="6" y2={isRunning ? 45 : 35} stroke="#22c55e" strokeWidth="2" />
                  <text x="14" y="40" fill="#86efac" fontSize="7.5">KM1 (43-44)</text>
                  <line x1="0" y1="45" x2="0" y2="70" stroke="#22c55e" strokeWidth="1.5" />
                  {/* Green Pilot Lamp Symbol */}
                  <circle cx="0" cy="85" r="14" fill={isRunning ? '#22c55e' : '#0f172a'} stroke="#22c55e" strokeWidth="2" />
                  <line x1="-8" y1="77" x2="8" y2="93" stroke="#ffffff" strokeWidth="1.5" />
                  <line x1="8" y1="77" x2="-8" y2="93" stroke="#ffffff" strokeWidth="1.5" />
                  <text x="20" y="88" fill="#86efac" fontSize="8" fontWeight="bold">GREEN (RUN)</text>
                  <line x1="0" y1="99" x2="0" y2="240" stroke="#3b82f6" strokeWidth="1.5" />
                </g>

                {/* RUNG 3: TRIP PILOT LAMP (AMBER) */}
                <g transform="translate(700, 80)">
                  <line x1="0" y1="-40" x2="0" y2="30" stroke="#f59e0b" strokeWidth="1.5" />
                  {/* OLR NO contact 97-98 */}
                  <line x1="-8" y1="30" x2="8" y2="30" stroke="#f59e0b" strokeWidth="1.5" />
                  <line x1="-8" y1="45" x2="8" y2="45" stroke="#f59e0b" strokeWidth="1.5" />
                  <line x1="-8" y1="30" x2="6" y2={isTripped ? 45 : 35} stroke="#f59e0b" strokeWidth="2" />
                  <text x="14" y="40" fill="#fde047" fontSize="7.5">OLR (97-98 NO)</text>
                  <line x1="0" y1="45" x2="0" y2="70" stroke="#f59e0b" strokeWidth="1.5" />
                  {/* Amber Pilot Lamp Symbol */}
                  <circle cx="0" cy="85" r="14" fill={isTripped ? '#f59e0b' : '#0f172a'} stroke="#f59e0b" strokeWidth="2" />
                  <line x1="-8" y1="77" x2="8" y2="93" stroke="#ffffff" strokeWidth="1.5" />
                  <line x1="8" y1="77" x2="-8" y2="93" stroke="#ffffff" strokeWidth="1.5" />
                  <text x="20" y="88" fill="#fde047" fontSize="8" fontWeight="bold">AMBER (TRIP)</text>
                  <line x1="0" y1="99" x2="0" y2="240" stroke="#3b82f6" strokeWidth="1.5" />
                </g>
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
