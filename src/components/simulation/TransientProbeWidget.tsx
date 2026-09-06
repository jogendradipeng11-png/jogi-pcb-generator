import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ProbeTarget,
  SimulationState,
  SchematicComponent,
  Wire,
  SimulationSample,
  ComponentTestSettings,
} from '../../types';
import {
  Activity,
  Zap,
  X,
  Pause,
  Play,
  Maximize2,
  Minimize2,
  ExternalLink,
  Sliders,
  Move,
  Radio,
  Eye,
  EyeOff,
  Gauge,
  TrendingUp,
} from 'lucide-react';
import { formatVoltage, formatCurrent, formatPower } from '../../utils/simulation';

interface TransientProbeWidgetProps {
  probeTarget: ProbeTarget | null;
  simulationState: SimulationState;
  components: SchematicComponent[];
  wires: Wire[];
  onClose: () => void;
  onOpenFullScope?: () => void;
  onToggleSwitch?: (comp: SchematicComponent) => void;
  onUpdateComponentSettings?: (compId: string, settings: Partial<ComponentTestSettings>) => void;
}

export const TransientProbeWidget: React.FC<TransientProbeWidgetProps> = ({
  probeTarget,
  simulationState,
  components,
  wires,
  onClose,
  onOpenFullScope,
  onToggleSwitch,
  onUpdateComponentSettings,
}) => {
  // Minimize / Expand state
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  // Freeze / Hold live capture state
  const [isFrozen, setIsFrozen] = useState<boolean>(false);
  const [frozenSamples, setFrozenSamples] = useState<SimulationSample[]>([]);

  // Channel toggles
  const [showVoltage, setShowVoltage] = useState<boolean>(true);
  const [showCurrent, setShowCurrent] = useState<boolean>(true);

  // Hover cursor for waveform scrubbing
  const [hoverSampleIndex, setHoverSampleIndex] = useState<number | null>(null);

  // Widget dragging state (cursor position left & top)
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (probeTarget?.screenPosition) {
      const cursorX = probeTarget.screenPosition.x;
      const cursorY = probeTarget.screenPosition.y;
      const width = 370;
      const height = 360;
      let posX = cursorX + 24;
      let posY = cursorY - 24;
      if (typeof window !== 'undefined') {
        if (posX + width > window.innerWidth - 20) {
          posX = Math.max(16, cursorX - width - 24);
        }
        if (posY + height > window.innerHeight - 20) {
          posY = Math.max(60, window.innerHeight - height - 20);
        }
        if (posY < 60) posY = 60;
        if (posX < 16) posX = 16;
      }
      return { x: Math.round(posX), y: Math.round(posY) };
    }
    return { x: 120, y: 100 };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startMouseX: number; startMouseY: number; startPosX: number; startPosY: number }>({
    startMouseX: 0,
    startMouseY: 0,
    startPosX: 120,
    startPosY: 100,
  });

  // Whenever probe target changes or cursor click updates, relocate widget directly at the cursor position
  useEffect(() => {
    if (probeTarget?.screenPosition) {
      const cursorX = probeTarget.screenPosition.x;
      const cursorY = probeTarget.screenPosition.y;
      const width = isMinimized ? 320 : 370;
      const height = isMinimized ? 56 : 360;

      // Smart positioning around the clicked cursor
      let posX = cursorX + 24;
      let posY = cursorY - 24;

      if (typeof window !== 'undefined') {
        if (posX + width > window.innerWidth - 20) {
          posX = Math.max(16, cursorX - width - 24);
        }
        if (posY + height > window.innerHeight - 20) {
          posY = Math.max(60, window.innerHeight - height - 20);
        }
        if (posY < 60) posY = 60;
        if (posX < 16) posX = 16;
      }

      setPosition({ x: Math.round(posX), y: Math.round(posY) });
    }
  }, [probeTarget?.id, probeTarget?.screenPosition, isMinimized]);

  // Find associated component or wire for quick adjustments
  const associatedComp = useMemo(() => {
    if (!probeTarget) return null;
    if (probeTarget.componentId) {
      return components.find((c) => c.id === probeTarget.componentId) || null;
    }
    if (probeTarget.netName) {
      // Find component connected to this net
      return (
        components.find(
          (c) =>
            (c.type === 'switch' || c.type === 'pushbutton' || c.type === 'pot' || c.type === 'potentiometer') &&
            c.pins.some((p) => p.net === probeTarget.netName)
        ) || null
      );
    }
    return null;
  }, [probeTarget, components]);

  // Derive live samples for the probed target
  const liveSamples = useMemo(() => {
    if (!probeTarget) return [];

    // Check specific probe key formats
    const keyCandidates = [
      probeTarget.id,
      probeTarget.netName || '',
      probeTarget.wireId ? `wire:${probeTarget.wireId}` : '',
      probeTarget.componentId && probeTarget.pinId ? `pin:${probeTarget.componentId}:${probeTarget.pinId}` : '',
    ].filter(Boolean);

    for (const key of keyCandidates) {
      if (simulationState.probedWaveforms[key] && simulationState.probedWaveforms[key].length > 0) {
        return simulationState.probedWaveforms[key];
      }
    }

    // Fallback: If no waveform history found yet, synthesize sample from current state
    let v = 0.0;
    let i = 0.0;
    if (probeTarget.netName && simulationState.netVoltages[probeTarget.netName] !== undefined) {
      v = simulationState.netVoltages[probeTarget.netName];
    } else if (probeTarget.componentId && probeTarget.pinId) {
      v = simulationState.pinVoltages[`${probeTarget.componentId}:${probeTarget.pinId}`] ?? 0.0;
      const comp = components.find((c) => c.id === probeTarget.componentId);
      if (comp && simulationState.componentResults[comp.id]) {
        i = simulationState.componentResults[comp.id].current;
      }
    } else if (probeTarget.wireId) {
      const wire = wires.find((w) => w.id === probeTarget.wireId);
      if (wire && wire.net) v = simulationState.netVoltages[wire.net] ?? 0.0;
      i = simulationState.wireCurrents[probeTarget.wireId] ?? 0.0;
    }

    return [{ time: simulationState.time, voltage: v, current: i }];
  }, [probeTarget, simulationState, components, wires]);

  // Keep frozen buffer updated when toggling freeze
  const activeSamples = isFrozen ? frozenSamples : liveSamples;

  const handleToggleFreeze = () => {
    if (!isFrozen) {
      setFrozenSamples(liveSamples);
      setIsFrozen(true);
    } else {
      setIsFrozen(false);
    }
  };

  // Instantaneous and statistical metrics
  const stats = useMemo(() => {
    if (activeSamples.length === 0) {
      return {
        instV: 0,
        instI: 0,
        maxV: 0,
        minV: 0,
        vpp: 0,
        avgV: 0,
        maxI: 0,
        minI: 0,
        power: 0,
        frequency: null as number | null,
      };
    }

    const latest = activeSamples[activeSamples.length - 1];
    const voltages = activeSamples.map((s) => s.voltage);
    const currents = activeSamples.map((s) => s.current ?? 0);

    const maxV = Math.max(...voltages);
    const minV = Math.min(...voltages);
    const vpp = maxV - minV;
    const avgV = voltages.reduce((a, b) => a + b, 0) / voltages.length;

    const maxI = Math.max(...currents);
    const minI = Math.min(...currents);

    const instV = latest.voltage;
    const instI = latest.current ?? 0;
    const power = instV * instI;

    // Detect periodic oscillation / frequency from zero-crossings or threshold
    let freq: number | null = null;
    if (vpp > 0.4 && activeSamples.length > 30) {
      const midThreshold = (maxV + minV) / 2;
      let crossings = 0;
      let firstTime = 0;
      let lastTime = 0;

      for (let idx = 1; idx < activeSamples.length; idx++) {
        const prev = activeSamples[idx - 1];
        const curr = activeSamples[idx];
        if (prev.voltage < midThreshold && curr.voltage >= midThreshold) {
          if (crossings === 0) firstTime = curr.time;
          lastTime = curr.time;
          crossings++;
        }
      }

      if (crossings >= 2 && lastTime > firstTime) {
        const measuredPeriod = (lastTime - firstTime) / (crossings - 1);
        if (measuredPeriod > 0.001 && measuredPeriod < 10) {
          freq = 1 / measuredPeriod;
        }
      }
    }

    // Also check if component has known frequency (e.g. NE555)
    if (!freq && associatedComp && simulationState.componentResults[associatedComp.id]?.frequency) {
      freq = simulationState.componentResults[associatedComp.id].frequency || null;
    }

    return {
      instV,
      instI,
      maxV,
      minV,
      vpp,
      avgV,
      maxI,
      minI,
      power,
      frequency: freq,
    };
  }, [activeSamples, associatedComp, simulationState]);

  // Handle header dragging
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.startMouseX;
      const dy = e.clientY - dragStartRef.current.startMouseY;
      setPosition({
        x: Math.max(10, Math.min(window.innerWidth - 380, dragStartRef.current.startPosX + dx)),
        y: Math.max(50, Math.min(window.innerHeight - 150, dragStartRef.current.startPosY + dy)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (!probeTarget) return null;

  // Chart dimensions & scaling
  const chartWidth = 340;
  const chartHeight = 130;
  const padding = { top: 12, right: 12, bottom: 20, left: 34 };
  const plotW = chartWidth - padding.left - padding.right;
  const plotH = chartHeight - padding.top - padding.bottom;

  // Voltage scaling: dynamic with nice headroom
  const maxPlotV = Math.max(1.0, Math.ceil(Math.max(stats.maxV, 5.0) * 1.1));
  const minPlotV = Math.min(0, Math.floor(stats.minV));
  const spanV = Math.max(0.1, maxPlotV - minPlotV);

  // Current scaling (in Amps)
  const maxPlotI = Math.max(0.005, stats.maxI * 1.25);
  const minPlotI = 0.0;
  const spanI = Math.max(0.0001, maxPlotI - minPlotI);

  // Build SVG Paths for Voltage and Current traces
  const sampleCount = activeSamples.length;

  const voltagePath = useMemo(() => {
    if (sampleCount < 2) return '';
    return activeSamples
      .map((s, idx) => {
        const x = padding.left + (idx / (sampleCount - 1)) * plotW;
        const normY = (s.voltage - minPlotV) / spanV;
        const y = padding.top + plotH - Math.max(0, Math.min(1, normY)) * plotH;
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [activeSamples, sampleCount, minPlotV, spanV, plotW, plotH, padding]);

  // Area fill under voltage sparkline curve
  const voltageAreaPath = useMemo(() => {
    if (sampleCount < 2) return '';
    const points = activeSamples.map((s, idx) => {
      const x = padding.left + (idx / (sampleCount - 1)) * plotW;
      const normY = (s.voltage - minPlotV) / spanV;
      const y = padding.top + plotH - Math.max(0, Math.min(1, normY)) * plotH;
      return `${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    const baselineY = padding.top + plotH;
    return `M ${padding.left} ${baselineY} L ${points.join(' L ')} L ${padding.left + plotW} ${baselineY} Z`;
  }, [activeSamples, sampleCount, minPlotV, spanV, plotW, plotH, padding]);

  // Latest sample point coordinate on sparkline
  const latestVoltagePt = useMemo(() => {
    if (sampleCount === 0) return null;
    const latest = activeSamples[sampleCount - 1];
    const x = padding.left + plotW;
    const normY = (latest.voltage - minPlotV) / spanV;
    const y = padding.top + plotH - Math.max(0, Math.min(1, normY)) * plotH;
    return { x, y };
  }, [activeSamples, sampleCount, minPlotV, spanV, plotW, plotH, padding]);

  // Mini sparkline path for compact minimized view
  const miniSparklinePath = useMemo(() => {
    if (sampleCount < 2) return '';
    const w = 70;
    const h = 20;
    return activeSamples
      .map((s, idx) => {
        const x = (idx / (sampleCount - 1)) * w;
        const normY = (s.voltage - minPlotV) / spanV;
        const y = h - Math.max(0, Math.min(1, normY)) * h;
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [activeSamples, sampleCount, minPlotV, spanV]);

  const currentPath = useMemo(() => {
    if (sampleCount < 2) return '';
    return activeSamples
      .map((s, idx) => {
        const x = padding.left + (idx / (sampleCount - 1)) * plotW;
        const normY = ((s.current ?? 0) - minPlotI) / spanI;
        const y = padding.top + plotH - Math.max(0, Math.min(1, normY)) * plotH;
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [activeSamples, sampleCount, minPlotI, spanI, plotW, plotH, padding]);

  // Inspected sample at hover index
  const inspectedSample = hoverSampleIndex !== null && activeSamples[hoverSampleIndex]
    ? activeSamples[hoverSampleIndex]
    : null;

  return (
    <div
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      className={`fixed z-40 transition-shadow duration-200 select-none shadow-2xl rounded-xl border border-sky-500/40 bg-slate-950/95 backdrop-blur-md text-slate-100 font-sans ${
        isMinimized ? 'w-84' : 'w-[370px]'
      }`}
    >
      {/* Widget Header & Drag Handle */}
      <div
        onMouseDown={handleDragStart}
        className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border-b border-slate-800 rounded-t-xl cursor-move"
      >
        <div className="flex items-center space-x-2 truncate">
          <div className="p-1 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 shrink-0">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-200 truncate">
                {probeTarget.label}
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase font-semibold ${
                  isFrozen
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}
              >
                {isFrozen ? 'HOLD' : 'LIVE'}
              </span>
            </div>
            {probeTarget.subLabel && (
              <div className="text-[10px] text-slate-400 font-mono truncate">
                {probeTarget.subLabel}
              </div>
            )}
          </div>
        </div>

        {/* Header Action Icons */}
        <div className="flex items-center space-x-1 shrink-0 ml-2" onMouseDown={(e) => e.stopPropagation()}>
          <button
            onClick={handleToggleFreeze}
            className={`p-1 rounded transition-colors ${
              isFrozen
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title={isFrozen ? 'Resume live capture' : 'Freeze capture (Hold)'}
          >
            {isFrozen ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          {onOpenFullScope && (
            <button
              onClick={onOpenFullScope}
              className="p-1 text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded transition-colors"
              title="Open in Virtual Oscilloscope & Signal Analyzer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title={isMinimized ? 'Expand Transient Plot' : 'Minimize Widget'}
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
            title="Close Probe"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Minimized Compact View */}
      {isMinimized ? (
        <div className="px-3 py-1.5 flex items-center justify-between font-mono text-xs gap-2">
          <div className="flex items-center gap-2.5">
            <div>
              <span className="text-[10px] text-sky-400 mr-1">V:</span>
              <span className="font-bold text-sky-300">{formatVoltage(stats.instV)}</span>
            </div>
            {/* Mini Sparkline in Compact View */}
            {miniSparklinePath && (
              <div className="w-[70px] h-[20px] bg-slate-900/80 rounded px-0.5 border border-sky-950 flex items-center overflow-hidden">
                <svg width="70" height="20" className="overflow-visible">
                  <path d={miniSparklinePath} fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            )}
            <div>
              <span className="text-[10px] text-emerald-400 mr-1">I:</span>
              <span className="font-bold text-emerald-300">{formatCurrent(stats.instI)}</span>
            </div>
          </div>
          <button
            onClick={() => setIsMinimized(false)}
            className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <span>Expand</span>
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="p-3 space-y-2.5">
          {/* Main Digital Readout Cards */}
          <div className="grid grid-cols-2 gap-2">
            {/* Voltage Card */}
            <div className="p-2 rounded-lg bg-sky-950/40 border border-sky-800/50 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] font-mono text-sky-400">
                <span className="font-bold uppercase tracking-wider flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
                  CH1 • Voltage
                </span>
                <button
                  onClick={() => setShowVoltage(!showVoltage)}
                  className="hover:text-sky-200"
                  title="Toggle Voltage Plot Visibility"
                >
                  {showVoltage ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-slate-500" />}
                </button>
              </div>
              <div className="my-1">
                <div className="text-xl font-mono font-extrabold text-sky-300 tracking-tight">
                  {formatVoltage(stats.instV)}
                </div>
              </div>
              <div className="text-[9px] font-mono text-slate-400 flex justify-between border-t border-sky-900/60 pt-1">
                <span>Vpp: {stats.vpp.toFixed(2)}V</span>
                <span>Max: {stats.maxV.toFixed(2)}V</span>
              </div>
            </div>

            {/* Current Card */}
            <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/50 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400">
                <span className="font-bold uppercase tracking-wider flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  CH2 • Current
                </span>
                <button
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="hover:text-emerald-200"
                  title="Toggle Current Plot Visibility"
                >
                  {showCurrent ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-slate-500" />}
                </button>
              </div>
              <div className="my-1">
                <div className="text-xl font-mono font-extrabold text-emerald-300 tracking-tight">
                  {formatCurrent(stats.instI)}
                </div>
              </div>
              <div className="text-[9px] font-mono text-slate-400 flex justify-between border-t border-emerald-900/60 pt-1">
                <span>P: {formatPower(stats.power)}</span>
                <span>Max: {formatCurrent(stats.maxI)}</span>
              </div>
            </div>
          </div>

          {/* Real-Time Waveform Trend Screen */}
          <div className="relative rounded-lg bg-[#040b14] border border-sky-900/60 p-1.5 overflow-hidden">
            {/* Screen Watermark & Scale Tags */}
            <div className="flex items-center justify-between px-1.5 pb-1 text-[9px] font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <span className="text-sky-400">CH1: {(spanV / 4).toFixed(1)}V/div</span>
                <span>•</span>
                <span className="text-emerald-400">CH2: {formatCurrent(spanI / 4)}/div</span>
              </div>
              <div>
                {stats.frequency ? (
                  <span className="text-amber-300 font-bold">
                    ƒ: {stats.frequency.toFixed(1)}Hz
                  </span>
                ) : (
                  <span className="text-slate-500">DC Steady State</span>
                )}
              </div>
            </div>

            {/* Oscilloscope SVG Display */}
            <div
              className="relative w-full h-[130px] cursor-crosshair"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const mouseX = e.clientX - rect.left - padding.left;
                if (mouseX >= 0 && mouseX <= plotW && sampleCount > 0) {
                  const idx = Math.min(
                    sampleCount - 1,
                    Math.max(0, Math.round((mouseX / plotW) * (sampleCount - 1)))
                  );
                  setHoverSampleIndex(idx);
                }
              }}
              onMouseLeave={() => setHoverSampleIndex(null)}
            >
              <svg className="w-full h-full">
                <defs>
                  {/* Grid Pattern */}
                  <pattern id="probe-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" opacity="0.6" />
                  </pattern>
                  {/* Voltage Area Gradient */}
                  <linearGradient id="voltage-area-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                <rect x={padding.left} y={padding.top} width={plotW} height={plotH} fill="url(#probe-grid)" />

                {/* Center / Zero Axis reference lines */}
                <line
                  x1={padding.left}
                  y1={padding.top + plotH / 2}
                  x2={padding.left + plotW}
                  y2={padding.top + plotH / 2}
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <line
                  x1={padding.left + plotW / 2}
                  y1={padding.top}
                  x2={padding.left + plotW / 2}
                  y2={padding.top + plotH}
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />

                {/* Y-Axis Labels */}
                <text x={padding.left - 4} y={padding.top + 8} textAnchor="end" fill="#38bdf8" fontSize="8" fontFamily="monospace">
                  {maxPlotV.toFixed(1)}V
                </text>
                <text x={padding.left - 4} y={padding.top + plotH} textAnchor="end" fill="#38bdf8" fontSize="8" fontFamily="monospace">
                  {minPlotV.toFixed(1)}V
                </text>

                {/* Voltage Area Fill */}
                {showVoltage && voltageAreaPath && (
                  <path d={voltageAreaPath} fill="url(#voltage-area-gradient)" />
                )}

                {/* Voltage Trace (Sky Blue) */}
                {showVoltage && voltagePath && (
                  <g>
                    {/* Subtle Glow */}
                    <path
                      d={voltagePath}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="4"
                      strokeOpacity="0.25"
                      strokeLinecap="round"
                    />
                    {/* Crisp Core Trace */}
                    <path
                      d={voltagePath}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Live Leading Edge Spark Indicator */}
                    {latestVoltagePt && !isFrozen && (
                      <g transform={`translate(${latestVoltagePt.x}, ${latestVoltagePt.y})`}>
                        <circle cx="0" cy="0" r="5" fill="none" stroke="#38bdf8" strokeWidth="1.5" className="animate-ping" opacity="0.8" />
                        <circle cx="0" cy="0" r="3" fill="#38bdf8" stroke="#ffffff" strokeWidth="1" />
                      </g>
                    )}
                  </g>
                )}

                {/* Current Trace (Emerald) */}
                {showCurrent && currentPath && (
                  <g>
                    {/* Subtle Glow */}
                    <path
                      d={currentPath}
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="3.5"
                      strokeOpacity="0.2"
                      strokeLinecap="round"
                    />
                    {/* Crisp Core Trace */}
                    <path
                      d={currentPath}
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                )}

                {/* Hover Cursor Vertical Line */}
                {hoverSampleIndex !== null && (
                  <line
                    x1={padding.left + (hoverSampleIndex / (sampleCount - 1)) * plotW}
                    y1={padding.top}
                    x2={padding.left + (hoverSampleIndex / (sampleCount - 1)) * plotW}
                    y2={padding.top + plotH}
                    stroke="#ffffff"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    opacity="0.8"
                  />
                )}
              </svg>

              {/* Hover Floating Pill */}
              {inspectedSample && hoverSampleIndex !== null && (
                <div
                  style={{
                    left: `${Math.max(10, Math.min(plotW - 60, padding.left + (hoverSampleIndex / (sampleCount - 1)) * plotW - 40))}px`,
                    top: '6px',
                  }}
                  className="absolute pointer-events-none bg-slate-900/95 border border-sky-500 px-2 py-0.5 rounded shadow text-[9px] font-mono text-slate-200 z-10 whitespace-nowrap"
                >
                  <span className="text-sky-300 font-bold">{formatVoltage(inspectedSample.voltage)}</span>
                  <span className="text-slate-500 mx-1">|</span>
                  <span className="text-emerald-300 font-bold">{formatCurrent(inspectedSample.current ?? 0)}</span>
                </div>
              )}
            </div>

            {/* Time Window Footer */}
            <div className="flex items-center justify-between px-1.5 pt-1 text-[9px] font-mono text-slate-500 border-t border-slate-900">
              <span>Window: ~2.5s</span>
              <span>Samples: {activeSamples.length} pts</span>
              <span>Rate: 60 FPS</span>
            </div>
          </div>

          {/* Quick Circuit Interaction Strip (If connected to switch / potentiometer) */}
          {associatedComp && (
            <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
                <span className="flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-sky-400" />
                  <span>Interactive Test Control: {associatedComp.designator}</span>
                </span>
                <span className="text-slate-500">{associatedComp.value}</span>
              </div>

              {/* Switch quick toggle */}
              {(associatedComp.type === 'switch' || associatedComp.type === 'pushbutton') && (
                <button
                  onClick={() => onToggleSwitch && onToggleSwitch(associatedComp)}
                  className={`w-full py-1 text-xs font-mono font-bold rounded flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    (associatedComp.testSettings?.isClosed ?? true)
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>
                    {(associatedComp.testSettings?.isClosed ?? true)
                      ? 'Switch is CLOSED (Click to Open)'
                      : 'Switch is OPEN (Click to Close)'}
                  </span>
                </button>
              )}

              {/* Potentiometer Wiper Slider */}
              {(associatedComp.type === 'pot' || associatedComp.type === 'potentiometer') && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>Wiper Position</span>
                    <span className="text-sky-400 font-bold">
                      {Math.round((associatedComp.testSettings?.wiper ?? 0.5) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={associatedComp.testSettings?.wiper ?? 0.5}
                    onChange={(e) => {
                      if (onUpdateComponentSettings) {
                        onUpdateComponentSettings(associatedComp.id, {
                          wiper: parseFloat(e.target.value),
                        });
                      }
                    }}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* Quick Instructions Hint */}
          <div className="text-[10px] text-slate-400 font-mono text-center pt-0.5">
            Tip: Click any other wire or pin on the schematic to probe it instantly.
          </div>
        </div>
      )}
    </div>
  );
};
