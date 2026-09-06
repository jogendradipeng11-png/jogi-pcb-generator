import React, { useState } from 'react';
import {
  SimulationState,
  SchematicComponent,
  Wire,
} from '../../types';
import {
  Activity,
  Zap,
  Gauge,
  Sliders,
  X,
  Play,
  Pause,
  Plus,
  Trash2,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { formatVoltage, formatCurrent } from '../../utils/simulation';

interface OscilloscopePanelProps {
  simulationState: SimulationState;
  components: SchematicComponent[];
  wires: Wire[];
  isOpen: boolean;
  onClose: () => void;
  onToggleProbeNet: (net: string) => void;
}

const TRACE_COLORS = ['#38bdf8', '#fbbf24', '#34d399', '#f43f5e', '#a855f7'];

export const OscilloscopePanel: React.FC<OscilloscopePanelProps> = ({
  simulationState,
  components,
  wires,
  isOpen,
  onClose,
  onToggleProbeNet,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [voltageScale, setVoltageScale] = useState<number>(2.0); // 2V per division

  if (!isOpen) return null;

  // Gather all unique nets in the circuit for probe selection
  const allNets = Array.from(
    new Set([
      ...components.flatMap((c) => c.pins.map((p) => p.net).filter(Boolean) as string[]),
      ...wires.map((w) => w.net).filter(Boolean),
    ])
  );

  const probedNets = simulationState.probedNets;

  return (
    <div
      className={`fixed bottom-4 right-4 z-40 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl overflow-hidden font-sans text-slate-100 transition-all duration-300 ${
        isMinimized ? 'w-80 h-12' : 'w-[620px] max-w-[95vw] h-84'
      }`}
    >
      {/* Scope Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-sky-500/20 text-sky-400 rounded-md border border-sky-500/30">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              Virtual Oscilloscope &amp; Signal Analyzer
              <span className="text-[10px] px-1.5 py-0.2 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded font-mono">
                {simulationState.isRunning ? 'LIVE 60FPS' : 'PAUSED'}
              </span>
              {simulationState.activeScenarioName && (
                <span
                  className="text-[10px] px-2 py-0.2 bg-sky-950 text-sky-300 border border-sky-800 rounded font-medium flex items-center gap-1 max-w-[220px] truncate"
                  title={`Active Scenario: ${simulationState.activeScenarioName} (${simulationState.operatingConditions?.supplyVoltage ?? 5}V, ${simulationState.operatingConditions?.temperature ?? 25}°C)`}
                >
                  <span className="text-slate-400">Scenario:</span>
                  <span className="font-semibold truncate">{simulationState.activeScenarioName}</span>
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title={isMinimized ? 'Expand Scope' : 'Minimize Scope'}
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="flex flex-col h-[calc(100%-42px)] p-3 space-y-3">
          {/* Main Scope Screen & Readout Grid */}
          <div className="flex-1 flex gap-3 min-h-0">
            {/* CRT Screen Display */}
            <div className="flex-1 bg-[#05111b] rounded-lg border border-sky-900/60 relative overflow-hidden flex flex-col">
              {/* Scope Grid Lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25">
                <defs>
                  <pattern id="scope-grid" width="30" height="25" patternUnits="userSpaceOnUse">
                    <path
                      d="M 30 0 L 0 0 0 25"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="0.5"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#scope-grid)" />
                {/* Center Graticules */}
                <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#38bdf8" strokeWidth="1" opacity="0.6" strokeDasharray="3 3" />
                <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#38bdf8" strokeWidth="1" opacity="0.6" strokeDasharray="3 3" />
              </svg>

              {/* Waveform Traces SVG */}
              <svg className="absolute inset-0 w-full h-full">
                {probedNets.map((net, traceIdx) => {
                  const samples = simulationState.probedWaveforms[net] || [];
                  if (samples.length < 2) return null;

                  const color = TRACE_COLORS[traceIdx % TRACE_COLORS.length];
                  // Map sample voltages (0 to 10V) to SVG coordinates
                  const width = 360;
                  const height = 150;
                  const maxV = 10.0;

                  const pathData = samples
                    .map((s, idx) => {
                      const x = (idx / (samples.length - 1)) * width;
                      // Invert Y so high voltage is top
                      const y = height - (Math.max(0, Math.min(maxV, s.voltage)) / maxV) * (height - 20) - 10;
                      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                    })
                    .join(' ');

                  return (
                    <g key={net}>
                      <path
                        d={pathData}
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {/* Glow halo */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke={color}
                        strokeWidth="6"
                        strokeOpacity="0.25"
                        strokeLinecap="round"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Watermark in corner */}
              <div className="absolute top-2 left-2 flex items-center gap-2 text-[10px] font-mono text-sky-400/80 bg-slate-950/60 px-2 py-0.5 rounded border border-sky-950">
                <span>CH1: 2.0V/DIV</span>
                <span>•</span>
                <span>TIME: 50ms/DIV</span>
              </div>
            </div>

            {/* Live Measurements Digital Panel */}
            <div className="w-52 flex flex-col justify-between bg-slate-950/60 rounded-lg border border-slate-800 p-2.5 text-xs font-mono">
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center justify-between">
                  <span>Channel Probes</span>
                  <span>Instant V</span>
                </div>

                {probedNets.length === 0 && (
                  <div className="text-[11px] text-slate-500 py-3 text-center">
                    Select a net below to probe
                  </div>
                )}

                {probedNets.map((net, idx) => {
                  const color = TRACE_COLORS[idx % TRACE_COLORS.length];
                  const currentV = simulationState.netVoltages[net] ?? 0.0;
                  return (
                    <div
                      key={net}
                      className="flex items-center justify-between p-1 rounded bg-slate-900/80 border border-slate-800"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-semibold truncate text-slate-200" title={net}>
                          {net}
                        </span>
                      </div>
                      <span className="font-bold shrink-0" style={{ color }}>
                        {formatVoltage(currentV)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Active Circuit Metrics */}
              <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Sim Time:</span>
                  <span className="text-slate-200 font-bold">
                    {simulationState.time.toFixed(2)}s
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Active Nets:</span>
                  <span className="text-slate-200 font-bold">
                    {Object.keys(simulationState.netVoltages).length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Controls: Probe Channel Toggles */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
            <div className="flex items-center space-x-1.5 overflow-x-auto max-w-[420px] py-0.5">
              <span className="text-[10px] font-semibold text-slate-400 font-mono uppercase mr-1">
                Probe Net:
              </span>
              {allNets.slice(0, 8).map((net) => {
                const isProbed = probedNets.includes(net);
                return (
                  <button
                    key={net}
                    onClick={() => onToggleProbeNet(net)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors flex items-center gap-1 ${
                      isProbed
                        ? 'bg-sky-600 text-white font-bold'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    <span>{net}</span>
                    {isProbed && <X className="w-2.5 h-2.5" />}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-slate-400 font-mono">
                Click net/pin on schematic to inspect
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
