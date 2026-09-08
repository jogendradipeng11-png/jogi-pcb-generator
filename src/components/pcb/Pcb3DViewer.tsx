import React, { useState, useRef, useEffect } from 'react';
import { SchematicComponent, Wire } from '../../types';
import { REAL_PRODUCT_CATALOG, RealProductPart } from '../../data/realComponents';
import {
  Rotate3d,
  Maximize2,
  Box,
  Layers,
  Sparkles,
  Download,
  Info,
  CheckCircle,
  ExternalLink,
  Sliders,
  Move,
  RefreshCw,
  Compass,
  Play,
  Pause,
  RotateCw,
  RotateCcw,
  FlipVertical,
  Eye,
  Activity,
  Zap,
} from 'lucide-react';
import { generateGerberZip } from '../../utils/gerber';
import {
  computePcbCoordinatesFromSchematic,
  syncAllFromSchematic,
  autoArrangeBestFit,
} from '../../utils/pcbPlacement';
import {
  RealProductImage,
  getRealProductDetails,
  RealisticComponentSvg,
  getComponentRealImageUrl,
} from '../../utils/componentImages';

interface Pcb3DViewerProps {
  components: SchematicComponent[];
  wires: Wire[];
  projectName?: string;
  onSelectComponent?: (id: string) => void;
  onOpenProductSelector?: (comp: SchematicComponent) => void;
  onUpdateComponentPlacement?: (id: string, x: number, y: number) => void;
  onBatchUpdatePlacements?: (updatedComponents: SchematicComponent[]) => void;
}

export const Pcb3DViewer: React.FC<Pcb3DViewerProps> = ({
  components,
  wires,
  projectName = 'CircuitForge_Board',
  onSelectComponent,
  onOpenProductSelector,
  onUpdateComponentPlacement,
  onBatchUpdatePlacements,
}) => {
  // 3D View Angles & Orbit State
  const [rotX, setRotX] = useState(38); // Pitch
  const [rotZ, setRotZ] = useState(-25); // Yaw/Roll
  const [zoom, setZoom] = useState(1.0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Board Aesthetics & Real Electronics Mode
  const [solderMaskColor, setSolderMaskColor] = useState<'green' | 'black' | 'blue' | 'purple' | 'red'>('green');
  const [showEnclosure, setShowEnclosure] = useState(false);
  const [enclosureType, setEnclosureType] = useState<'acrylic' | 'aluminum'>('acrylic');
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  const [isExportingGerber, setIsExportingGerber] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Real Electronics Products & Animated Working Simulation
  const [showReal3DTextures, setShowReal3DTextures] = useState(true);
  const [showWorkingSimulation, setShowWorkingSimulation] = useState(true);
  const [hovered3DComp, setHovered3DComp] = useState<any | null>(null);

  // 3D Drag & Arrange state
  const [isArrangeMode, setIsArrangeMode] = useState(false);
  const [customPositions, setCustomPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingCompId, setDraggingCompId] = useState<string | null>(null);
  const [compDragStart, setCompDragStart] = useState<{
    mouseX: number;
    mouseY: number;
    initX: number;
    initY: number;
  } | null>(null);

  // 360° Continuous Auto-Turntable Rotation
  const [isAutoRotating, setIsAutoRotating] = useState(false);

  useEffect(() => {
    if (!isAutoRotating) return;
    let animId: number;
    const animate = () => {
      setRotZ((prev) => (prev + 0.6) % 360);
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [isAutoRotating]);

  // Mouse orbit & 3D arrange controls
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (isArrangeMode) return; // Orbit is paused when in arrange mode
    setIsAutoRotating(false);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // 3D Component dragging
    if (draggingCompId && compDragStart) {
      const dx = (e.clientX - compDragStart.mouseX) / zoom;
      const dy = (e.clientY - compDragStart.mouseY) / zoom;
      const newX = Math.max(50, Math.min(boardWidth - 50, compDragStart.initX + dx));
      const newY = Math.max(50, Math.min(boardHeight - 50, compDragStart.initY + dy));
      setCustomPositions((prev) => ({
        ...prev,
        [draggingCompId]: { x: Math.round(newX / 10) * 10, y: Math.round(newY / 10) * 10 },
      }));
      return;
    }

    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    // Allow continuous 360 degree rotation in all directions for complete solder and clearance checks
    setRotZ((prev) => (prev + dx * 0.4) % 360);
    setRotX((prev) => (prev - dy * 0.4) % 360);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    if (draggingCompId && customPositions[draggingCompId]) {
      const pos = customPositions[draggingCompId];
      if (onUpdateComponentPlacement) {
        onUpdateComponentPlacement(draggingCompId, pos.x, pos.y);
      }
    }
    setIsDragging(false);
    setDraggingCompId(null);
    setCompDragStart(null);
  };

  // Directional Preset Views for Engineering & Manufacturing Checks
  const handleSetViewOrientation = (preset: 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right' | 'iso') => {
    setIsAutoRotating(false);
    switch (preset) {
      case 'top':
        setRotX(0);
        setRotZ(0);
        break;
      case 'bottom': // 180° Inverted for bottom solder inspection
        setRotX(180);
        setRotZ(0);
        break;
      case 'front':
        setRotX(90);
        setRotZ(0);
        break;
      case 'back':
        setRotX(-90);
        setRotZ(0);
        break;
      case 'left':
        setRotX(0);
        setRotZ(90);
        break;
      case 'right':
        setRotX(0);
        setRotZ(-90);
        break;
      case 'iso':
      default:
        setRotX(38);
        setRotZ(-25);
        break;
    }
  };

  // Step Rotate
  const handleStepRotate = (axis: 'z' | 'x', delta: number) => {
    setIsAutoRotating(false);
    if (axis === 'z') {
      setRotZ((prev) => ((prev + delta) % 360 + 360) % 360);
    } else {
      setRotX((prev) => ((prev + delta) % 360 + 360) % 360);
    }
  };

  // Auto-Arrange 3D Space (Best Fit clearance optimizer)
  const handleAutoArrange3D = () => {
    const updated = autoArrangeBestFit(components, boardWidth, boardHeight);
    if (onBatchUpdatePlacements) {
      onBatchUpdatePlacements(updated);
    }
    setCustomPositions({});
  };

  // Sync / Re-plot 3D layout directly from schematic diagram
  const handleSyncFromSchematic3D = () => {
    const updated = syncAllFromSchematic(components, boardWidth, boardHeight);
    if (onBatchUpdatePlacements) {
      onBatchUpdatePlacements(updated);
    }
    setCustomPositions({});
  };

  // Zoom on wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((z) => Math.max(0.6, Math.min(2.2, z * factor)));
  };

  const handleResetView = () => {
    setRotX(38);
    setRotZ(-25);
    setZoom(1.0);
  };

  // Handle Gerber Export
  const handleDownloadGerber = async () => {
    setIsExportingGerber(true);
    try {
      const blob = await generateGerberZip(components, wires, {
        projectName,
        solderMaskColor,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName}_Gerber_RS274X.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err) {
      console.error('Gerber export failed', err);
    } finally {
      setIsExportingGerber(false);
    }
  };

  // Solder mask color palettes
  const colorThemes = {
    green: {
      boardBg: 'linear-gradient(135deg, #094030 0%, #062b20 50%, #041f17 100%)',
      copperTrace: '#d97706',
      silkscreen: '#ffffff',
      padColor: '#facc15',
      edgeBorder: '#0b523e',
    },
    black: {
      boardBg: 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #020617 100%)',
      copperTrace: '#e2e8f0',
      silkscreen: '#ffffff',
      padColor: '#facc15',
      edgeBorder: '#334155',
    },
    blue: {
      boardBg: 'linear-gradient(135deg, #1e3a8a 0%, #172554 50%, #0f172a 100%)',
      copperTrace: '#38bdf8',
      silkscreen: '#ffffff',
      padColor: '#facc15',
      edgeBorder: '#1d4ed8',
    },
    purple: {
      boardBg: 'linear-gradient(135deg, #4c1d95 0%, #311042 50%, #1e092b 100%)',
      copperTrace: '#c084fc',
      silkscreen: '#ffffff',
      padColor: '#facc15',
      edgeBorder: '#6b21a8',
    },
    red: {
      boardBg: 'linear-gradient(135deg, #7f1d1d 0%, #450a0a 50%, #2a0404 100%)',
      copperTrace: '#f87171',
      silkscreen: '#ffffff',
      padColor: '#facc15',
      edgeBorder: '#991b1b',
    },
  };

  const theme = colorThemes[solderMaskColor];

  // Map components to 3D board grid (Board dimensions: 620px x 420px matching 2D PCB 1:1)
  const boardWidth = 620;
  const boardHeight = 420;

  const schematicPlacementMap = computePcbCoordinatesFromSchematic(components, boardWidth, boardHeight);

  const pcbItems = components.map((c) => {
    const custom = customPositions[c.id];
    const schemPos = schematicPlacementMap.get(c.id);
    const x = custom ? custom.x : typeof c.pcbX === 'number' ? c.pcbX : schemPos?.x ?? 100;
    const y = custom ? custom.y : typeof c.pcbY === 'number' ? c.pcbY : schemPos?.y ?? 100;

    // Find matched real part in catalog
    const realPart = REAL_PRODUCT_CATALOG.find(
      (p) => p.typeMatch.includes(c.type) || p.manufacturerPartNumber.toLowerCase() === c.value.toLowerCase()
    );

    return {
      ...c,
      posX: x,
      posY: y,
      realPart,
    };
  });

  // Calculate 3D copper traces from schematic netlist and wires
  const compPosMap = new Map<string, { x: number; y: number }>();
  pcbItems.forEach((c) => compPosMap.set(c.id, { x: c.posX, y: c.posY }));

  const pcbTraces: { x1: number; y1: number; x2: number; y2: number; net?: string }[] = [];

  for (const w of wires) {
    if (w.startPin && w.endPin) {
      const p1 = compPosMap.get(w.startPin.componentId);
      const p2 = compPosMap.get(w.endPin.componentId);
      if (p1 && p2 && (p1.x !== p2.x || p1.y !== p2.y)) {
        pcbTraces.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, net: w.net });
      }
    }
  }

  // If no wire connections exist yet, link components sharing standard nets (VCC, GND, signals)
  if (pcbTraces.length === 0) {
    const netGroups = new Map<string, { x: number; y: number }[]>();
    for (const c of pcbItems) {
      for (const pin of c.pins) {
        if (pin.net && pin.net !== 'NC') {
          const list = netGroups.get(pin.net) || [];
          list.push({ x: c.posX, y: c.posY });
          netGroups.set(pin.net, list);
        }
      }
    }
    for (const [net, pts] of netGroups.entries()) {
      for (let i = 0; i < pts.length - 1; i++) {
        pcbTraces.push({ x1: pts[i].x, y1: pts[i].y, x2: pts[i + 1].x, y2: pts[i + 1].y, net });
      }
    }
  }

  const activeSelectedComp = pcbItems.find((c) => c.id === selectedCompId);

  return (
    <div
      className="relative w-full h-full flex flex-col bg-[#050914] text-slate-100 overflow-hidden select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* 3D Viewport Controls Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 backdrop-blur-xs border-b border-slate-800 text-xs z-20">
        <div className="flex items-center space-x-3">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
            <Rotate3d className="w-4 h-4 text-emerald-400 animate-spin-slow" />
            <span>Interactive 3D Product &amp; PCB Viewer</span>
          </div>
          <span className="text-[11px] text-slate-500">• Click &amp; drag to orbit, scroll to zoom</span>
        </div>

        {/* Color / Finish & Enclosure Selection */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2 py-1 rounded-md border border-slate-700">
            <span className="text-[11px] text-slate-400 font-medium">Solder Mask:</span>
            {(['green', 'black', 'blue', 'purple', 'red'] as const).map((color) => (
              <button
                key={color}
                onClick={() => setSolderMaskColor(color)}
                title={`FR4 ${color.toUpperCase()}`}
                className={`w-4 h-4 rounded-full border transition-all ${
                  solderMaskColor === color ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor:
                    color === 'green'
                      ? '#0d5941'
                      : color === 'black'
                      ? '#0f172a'
                      : color === 'blue'
                      ? '#1d4ed8'
                      : color === 'purple'
                      ? '#6b21a8'
                      : '#991b1b',
                  borderColor: solderMaskColor === color ? '#ffffff' : '#475569',
                }}
              />
            ))}
          </div>

          {/* Real 3D Electronic Products & Live Working Animation Toggles */}
          <div className="flex items-center space-x-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-700/80 text-xs">
            <button
              onClick={() => setShowReal3DTextures(!showReal3DTextures)}
              className={`px-2.5 py-1 rounded font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
                showReal3DTextures
                  ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 shadow-xs'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
              title="Toggle between Real Physical Electronic Product Views and Abstract 3D Shapes"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span>{showReal3DTextures ? 'Real 3D Products' : 'Abstract 3D'}</span>
            </button>
            <button
              onClick={() => setShowWorkingSimulation(!showWorkingSimulation)}
              className={`px-2.5 py-1 rounded font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
                showWorkingSimulation
                  ? 'bg-amber-950/90 text-amber-300 border border-amber-500/50 shadow-xs'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
              title="Toggle Animated Real Working Electrical Current Along 3D Board Traces & Active Indicators"
            >
              <Activity className={`w-3.5 h-3.5 ${showWorkingSimulation ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
              <span>{showWorkingSimulation ? '3D Working Flow: Active' : 'Flow: Off'}</span>
            </button>
          </div>

          {/* Mode Switch: 3D Orbit vs 3D Drag & Arrange */}
          <div className="flex items-center bg-slate-800 rounded-md p-0.5 border border-slate-700">
            <button
              onClick={() => setIsArrangeMode(false)}
              className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                !isArrangeMode ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Orbit & Rotate 3D Camera"
            >
              <Rotate3d className="w-3.5 h-3.5" />
              <span>Orbit</span>
            </button>
            <button
              onClick={() => setIsArrangeMode(true)}
              className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                isArrangeMode ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Drag & Reposition 3D Components on the Board"
            >
              <Move className="w-3.5 h-3.5" />
              <span>Drag 3D Parts</span>
            </button>
          </div>

          {/* Active 3D Component Position Readout */}
          {activeSelectedComp && (
            <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/90 border border-slate-700 rounded-md text-[11px] font-mono text-sky-300">
              <Move className="w-3 h-3 text-sky-400" />
              <span>{activeSelectedComp.designator}:</span>
              <span>X: {activeSelectedComp.posX}mm</span>
              <span>Y: {activeSelectedComp.posY}mm</span>
            </div>
          )}

          {/* Sync from Schematic Diagram */}
          <button
            onClick={handleSyncFromSchematic3D}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-sky-500/40 hover:border-sky-400 text-sky-200 rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
            title="Re-plot 3D PCB layout directly according to the schematic editor diagram"
          >
            <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
            <span>Sync Schematic</span>
          </button>

          {/* 3D Auto-Arrange Button */}
          <button
            onClick={handleAutoArrange3D}
            className="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all"
            title="Auto-Arrange 3D components with optimal spatial clearance"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Auto-Arrange 3D</span>
          </button>

          {/* Enclosure Toggle */}
          <button
            onClick={() => setShowEnclosure(!showEnclosure)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-all ${
              showEnclosure
                ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
            }`}
          >
            <Box className="w-3.5 h-3.5 text-amber-400" />
            {showEnclosure ? 'Hide Enclosure' : 'Enclosure'}
          </button>

          {/* Reset Angle */}
          <button
            onClick={handleResetView}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-xs text-slate-300 flex items-center gap-1"
          >
            <Rotate3d className="w-3.5 h-3.5" />
            Reset Camera
          </button>

          {/* Download Gerber Package */}
          <button
            onClick={handleDownloadGerber}
            disabled={isExportingGerber}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-950 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExportingGerber ? 'Generating...' : 'Download Gerber ZIP'}</span>
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Stage */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden cursor-grab active:cursor-grabbing">
        {/* 3D Perspective Container */}
        <div
          style={{
            perspective: '1200px',
            transform: `scale(${zoom})`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
          className="flex items-center justify-center"
        >
          {/* 3D Rotated Board */}
          <div
            style={{
              width: boardWidth,
              height: boardHeight,
              transform: `rotateX(${rotX}deg) rotateZ(${rotZ}deg)`,
              transformStyle: 'preserve-3d',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            }}
            className="relative"
          >
            {/* PCB FR4 Core Layer Thickness (Simulated 3D Side Edges) */}
            <div
              style={{
                transform: 'translateZ(-14px)',
                width: boardWidth,
                height: boardHeight,
                backgroundColor: theme.edgeBorder,
                borderRadius: '16px',
                boxShadow: '0 35px 80px -15px rgba(0, 0, 0, 0.95), 0 0 20px rgba(0, 0, 0, 0.6)',
              }}
              className="absolute inset-0 border border-slate-900"
            />

            {/* Main Top PCB Surface */}
            <div
              style={{
                width: boardWidth,
                height: boardHeight,
                background: theme.boardBg,
                borderRadius: '16px',
                border: `2px solid ${theme.edgeBorder}`,
                transform: 'translateZ(0px)',
                transformStyle: 'preserve-3d',
              }}
              className="absolute inset-0 overflow-hidden shadow-2xl"
            >
              {/* Subtle Fiber-glass texture & specular shine */}
              <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage:
                    'radial-gradient(#ffffff 1px, transparent 1px), radial-gradient(#ffffff 1px, transparent 1px)',
                  backgroundSize: '14px 14px',
                  backgroundPosition: '0 0, 7px 7px',
                }}
              />

              {/* 4 Corner Gold Mounting Holes with ENIG Annular Rings */}
              <div className="absolute top-4 left-4 w-7 h-7 rounded-full bg-[#050914] border-3 border-[#eab308] shadow-inner" />
              <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[#050914] border-3 border-[#eab308] shadow-inner" />
              <div className="absolute bottom-4 left-4 w-7 h-7 rounded-full bg-[#050914] border-3 border-[#eab308] shadow-inner" />
              <div className="absolute bottom-4 right-4 w-7 h-7 rounded-full bg-[#050914] border-3 border-[#eab308] shadow-inner" />

              {/* Silkscreen Brand & Version */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] font-mono tracking-wider text-white/80 font-bold uppercase select-none">
                {projectName} • REV 1.0 • 2-LAYER FR4
              </div>

              {/* Copper Traces Layer (Under solder mask, faithfully routed between connected components) */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-85">
                {pcbTraces.map((tr, i) => {
                  const midX = (tr.x1 + tr.x2) / 2;
                  const isPower = tr.net?.toUpperCase().includes('VCC') || tr.net?.includes('5V');
                  const isGnd = tr.net?.toUpperCase().includes('GND');
                  const traceColor = isPower ? '#ef4444' : isGnd ? '#3b82f6' : theme.copperTrace;

                  return (
                    <g key={`pcb-trace-${i}`}>
                      <path
                        d={`M ${tr.x1} ${tr.y1} L ${midX} ${tr.y1} L ${midX} ${tr.y2} L ${tr.x2} ${tr.y2}`}
                        fill="none"
                        stroke={traceColor}
                        strokeWidth="3.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.9"
                      />
                      {/* Solder Via */}
                      <circle cx={midX} cy={(tr.y1 + tr.y2) / 2} r="2.8" fill="#eab308" stroke="#050914" strokeWidth="1" />
                    </g>
                  );
                })}

                {/* Animated Working Current Flow Along 3D Board Traces */}
                {showWorkingSimulation && (
                  <g className="pointer-events-none">
                    {traces.map((tr, i) => {
                      const midX = (tr.x1 + tr.x2) / 2;
                      return (
                        <path
                          key={`3d-flow-${i}`}
                          d={`M ${tr.x1} ${tr.y1} L ${midX} ${tr.y1} L ${midX} ${tr.y2} L ${tr.x2} ${tr.y2}`}
                          fill="none"
                          stroke="#fef08a"
                          strokeWidth="2.4"
                          strokeDasharray="4 8"
                          className="animate-current-flow"
                          opacity="0.95"
                        />
                      );
                    })}
                  </g>
                )}
              </svg>

              {/* 3D Components on the Board */}
              {pcbItems.map((comp, compIdx) => {
                const isSelected = selectedCompId === comp.id;
                const norm = (comp.type + ' ' + (comp.value || '') + ' ' + (comp.footprint || '')).toLowerCase();
                const realDetails = getRealProductDetails(comp);
                const realPhotoUrl = getComponentRealImageUrl(comp);

                return (
                  <div
                    key={`${comp.id}-${compIdx}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCompId(comp.id);
                      if (onSelectComponent) onSelectComponent(comp.id);
                    }}
                    onMouseEnter={() => setHovered3DComp(comp)}
                    onMouseLeave={() => setHovered3DComp((c: any) => (c?.id === comp.id ? null : c))}
                    onMouseDown={(e) => {
                      if (isArrangeMode) {
                        e.stopPropagation();
                        setSelectedCompId(comp.id);
                        if (onSelectComponent) onSelectComponent(comp.id);
                        setDraggingCompId(comp.id);
                        setCompDragStart({
                          mouseX: e.clientX,
                          mouseY: e.clientY,
                          initX: comp.posX,
                          initY: comp.posY,
                        });
                      }
                    }}
                    style={{
                      left: comp.posX,
                      top: comp.posY,
                      transform: 'translate(-50%, -50%) translateZ(8px)',
                      transformStyle: 'preserve-3d',
                    }}
                    className={`absolute ${
                      isArrangeMode ? 'cursor-move' : 'cursor-pointer'
                    } group transition-all ${
                      isSelected
                        ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-900 rounded-lg'
                        : isArrangeMode
                        ? 'hover:ring-1 hover:ring-amber-400'
                        : ''
                    }`}
                  >
                    {/* Render Real Electronic 3D Products vs CAD Shapes */}
                    {norm.includes('lm2596') || norm.includes('buck') || norm.includes('stepdown') ? (
                      /* 3D Real LM2596 DC-DC Step-Down Buck Converter Module */
                      <div
                        style={{ width: 100, height: 64, transformStyle: 'preserve-3d' }}
                        className="relative flex items-center justify-center rounded bg-gradient-to-br from-[#0284c7] to-[#0369a1] border border-sky-300/80 p-1 shadow-2xl"
                      >
                        {/* Real Product Photo Texture Overlay when enabled */}
                        {showReal3DTextures && realPhotoUrl && (
                          <img
                            src={realPhotoUrl}
                            alt="LM2596"
                            className="absolute inset-0 w-full h-full object-cover rounded opacity-85 mix-blend-luminosity"
                          />
                        )}
                        {/* 3D Toroidal Wire-Wound Inductor Coil */}
                        <div
                          style={{ transform: 'translateZ(14px)' }}
                          className="absolute left-2.5 top-2 w-8 h-8 rounded-full bg-gradient-to-br from-amber-700 via-amber-600 to-amber-900 border border-amber-500 shadow-md flex items-center justify-center"
                        >
                          <div className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-amber-800" />
                          <div className="w-6 h-0.5 bg-amber-300 absolute rotate-45" />
                          <div className="w-6 h-0.5 bg-amber-300 absolute -rotate-45" />
                        </div>
                        {/* 3D Blue Multiturn Trimmer Potentiometer */}
                        <div
                          style={{ transform: 'translateZ(12px)' }}
                          className="absolute right-2.5 top-2 w-6 h-6 bg-blue-600 rounded-xs border border-blue-400 shadow-md flex items-center justify-center"
                        >
                          <div className="w-2 h-2 rounded-full bg-amber-400 border border-amber-600 flex items-center justify-center">
                            <div className="w-1.5 h-0.5 bg-amber-800" />
                          </div>
                        </div>
                        {/* 3D LM2596 IC with Metal Heat Sink Tab */}
                        <div
                          style={{ transform: 'translateZ(9px)' }}
                          className="absolute bottom-2 left-6 w-8 h-6 bg-[#1a1a1c] border border-slate-600 rounded-xs flex flex-col items-center justify-center"
                        >
                          <div className="w-6 h-1.5 bg-gradient-to-r from-slate-300 to-slate-400 rounded-t-xs" />
                          <span className="text-[5.5px] font-mono text-slate-200 font-bold">LM2596S</span>
                        </div>
                        {/* Power LED */}
                        <div
                          style={{ transform: 'translateZ(8px)' }}
                          className={`absolute bottom-2.5 right-3 w-2 h-2 rounded-full ${
                            showWorkingSimulation ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)] animate-pulse' : 'bg-red-900'
                          }`}
                        />
                        {/* Terminal Labels */}
                        <span className="absolute -top-3.5 left-1 text-[7px] font-mono font-bold text-sky-300">IN+</span>
                        <span className="absolute -bottom-3.5 left-1 text-[7px] font-mono font-bold text-slate-400">IN-</span>
                        <span className="absolute -top-3.5 right-1 text-[7px] font-mono font-bold text-emerald-300">OUT+</span>
                        <span className="absolute -bottom-3.5 right-1 text-[7px] font-mono font-bold text-slate-400">OUT-</span>
                      </div>
                    ) : norm.includes('relay') || norm.includes('songle') || norm.includes('srd') ? (
                      /* 3D Real Songle 5V Blue Relay Module */
                      <div
                        style={{ width: 80, height: 60, transformStyle: 'preserve-3d' }}
                        className="relative flex items-center justify-center rounded bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-slate-700 p-1 shadow-2xl"
                      >
                        {/* Real Photo Texture Overlay */}
                        {showReal3DTextures && realPhotoUrl && (
                          <img
                            src={realPhotoUrl}
                            alt="Relay"
                            className="absolute inset-0 w-full h-full object-cover rounded opacity-80 mix-blend-screen"
                          />
                        )}
                        {/* Blue Songle Relay Plastic Cube */}
                        <div
                          style={{
                            transform: 'translateZ(16px)',
                            boxShadow: '0 12px 24px rgba(0,0,0,0.85)',
                          }}
                          className="w-11 h-9 rounded-xs bg-gradient-to-b from-[#0284c7] to-[#0369a1] border border-sky-400/80 flex flex-col items-center justify-center p-1 text-center"
                        >
                          <span className="text-[6.5px] font-mono font-black text-white leading-tight tracking-tight">
                            SONGLE
                          </span>
                          <span className="text-[5.5px] font-mono text-sky-100 leading-tight">
                            10A 250VAC
                          </span>
                          <span className="text-[5px] font-mono text-sky-200 leading-tight">
                            SRD-05VDC
                          </span>
                        </div>
                        {/* Green 3-Pin Screw Terminal Block */}
                        <div
                          style={{ transform: 'translateZ(10px)' }}
                          className="absolute right-1 w-4 h-10 bg-emerald-700 border border-emerald-500 rounded-xs flex flex-col justify-around items-center py-0.5"
                        >
                          {[1, 2, 3].map((p) => (
                            <div key={p} className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-600 flex items-center justify-center">
                              <div className="w-1.5 h-0.5 bg-amber-400" />
                            </div>
                          ))}
                        </div>
                        {/* Active Relay Coil Indicator LED */}
                        <div
                          style={{ transform: 'translateZ(10px)' }}
                          className={`absolute left-2 bottom-2 w-2 h-2 rounded-full ${
                            showWorkingSimulation ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,1)] animate-ping' : 'bg-emerald-950'
                          }`}
                        />
                      </div>
                    ) : norm.includes('esp8266') || norm.includes('nodemcu') || norm.includes('esp32') ? (
                      /* 3D Real NodeMCU / ESP8266 Wi-Fi Microcontroller */
                      <div
                        style={{ width: 100, height: 60, transformStyle: 'preserve-3d' }}
                        className="relative flex items-center justify-center rounded bg-gradient-to-br from-[#18181b] to-[#09090b] border border-slate-700 p-1 shadow-2xl"
                      >
                        {/* Real Photo Texture Overlay */}
                        {showReal3DTextures && realPhotoUrl && (
                          <img
                            src={realPhotoUrl}
                            alt="NodeMCU"
                            className="absolute inset-0 w-full h-full object-cover rounded opacity-85 mix-blend-lighten"
                          />
                        )}
                        {/* Silver Metal RF Shielding Can */}
                        <div
                          style={{ transform: 'translateZ(8px)', boxShadow: '0 4px 10px rgba(0,0,0,0.8)' }}
                          className="w-10 h-9 rounded-xs bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 border border-slate-100 flex flex-col items-center justify-center p-0.5"
                        >
                          <span className="text-[6px] font-mono font-black text-slate-800 tracking-tighter">ESP8266</span>
                          <span className="text-[5px] font-mono text-slate-600">FCC ID AI</span>
                        </div>
                        {/* Gold Meander PCB Antenna */}
                        <div
                          style={{ transform: 'translateZ(3px)' }}
                          className="absolute left-1.5 top-1.5 bottom-1.5 w-3 border-r-2 border-dashed border-amber-400"
                        />
                        {/* Silver Micro USB Port */}
                        <div
                          style={{ transform: 'translateZ(7px)' }}
                          className="absolute right-1 w-3.5 h-6 bg-gradient-to-r from-slate-300 to-slate-400 rounded-xs border border-slate-500"
                        />
                        {/* Wi-Fi Blue Activity LED */}
                        <div
                          style={{ transform: 'translateZ(9px)' }}
                          className={`absolute top-2 right-6 w-2 h-2 rounded-full ${
                            showWorkingSimulation ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)] animate-pulse' : 'bg-cyan-950'
                          }`}
                        />
                      </div>
                    ) : norm.includes('water') || norm.includes('liquid') || norm.includes('probe') ? (
                      /* 3D Real Water Immersion Probe Module */
                      <div
                        style={{ width: 70, height: 50, transformStyle: 'preserve-3d' }}
                        className="relative flex items-center justify-center rounded bg-gradient-to-br from-[#0284c7] to-[#0369a1] border border-sky-400/80 p-1 shadow-2xl"
                      >
                        {/* Parallel Gold Immersion Sensing Tracks */}
                        <div className="w-10 h-7 flex justify-between items-center px-1 bg-[#0284c7]/60 rounded border border-amber-400/40">
                          {[1, 2, 3, 4, 5].map((t) => (
                            <div key={t} className="w-1 h-full bg-gradient-to-b from-amber-300 to-amber-500 rounded-full" />
                          ))}
                        </div>
                        {/* 3-pin connector header */}
                        <div className="absolute right-1 flex flex-col justify-around h-6">
                          {[1, 2, 3].map((p) => (
                            <div key={p} className="w-2 h-1 bg-amber-400 rounded-xs shadow-xs" />
                          ))}
                        </div>
                      </div>
                    ) : norm.includes('buzzer') || norm.includes('beeper') || norm.includes('piezo') ? (
                      /* 3D Real Piezo Buzzer */
                      <div
                        style={{ width: 44, height: 44, transformStyle: 'preserve-3d' }}
                        className="relative flex items-center justify-center"
                      >
                        <div
                          style={{ transform: 'translateZ(14px)', boxShadow: '0 8px 16px rgba(0,0,0,0.85)' }}
                          className="w-10 h-10 rounded-full bg-gradient-to-b from-[#27272a] to-[#09090b] border-2 border-slate-600 flex items-center justify-center relative"
                        >
                          {/* Central sound hole */}
                          <div className="w-3.5 h-3.5 rounded-full bg-black border border-slate-800" />
                          {/* Polarity (+) mark */}
                          <span className="absolute top-1 left-2 text-[7px] font-bold font-mono text-red-500">+</span>
                          {/* Sound waves animation */}
                          {showWorkingSimulation && (
                            <div className="absolute -inset-1 rounded-full border border-sky-400/60 animate-ping pointer-events-none" />
                          )}
                        </div>
                      </div>
                    ) : norm.includes('terminal') || norm.includes('screw') ? (
                      /* 3D Real Screw Terminal Block */
                      <div
                        style={{ width: 48, height: 36, transformStyle: 'preserve-3d' }}
                        className="relative flex items-center justify-center"
                      >
                        <div
                          style={{ transform: 'translateZ(12px)' }}
                          className="w-11 h-8 rounded-xs bg-gradient-to-b from-[#15803d] to-[#166534] border border-emerald-400 flex items-center justify-around px-1 shadow-xl"
                        >
                          {[1, 2].map((p) => (
                            <div key={p} className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
                              <div className="w-2 h-0.5 bg-amber-300" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : comp.type.startsWith('ic_') || norm.includes('555') || norm.includes('358') ? (
                      // 3D Real DIP IC Chip (NE555, LM358, ATmega328P)
                      <div
                        style={{
                          width: comp.type === 'ic_mcu' ? 120 : 66,
                          height: 38,
                          transformStyle: 'preserve-3d',
                        }}
                        className="relative flex items-center justify-center"
                      >
                        {/* IC Epoxy Black Body */}
                        <div
                          style={{
                            transform: 'translateZ(10px)',
                            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.8), inset 0 1px 2px rgba(255, 255, 255, 0.2)',
                          }}
                          className="w-full h-full bg-gradient-to-b from-[#2a2a2e] to-[#121214] rounded-xs border border-slate-700/80 flex flex-col items-center justify-center p-1"
                        >
                          {/* Pin 1 orientation notch & dot */}
                          <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-900 border border-slate-600" />
                          <span className="text-[8px] font-mono font-bold text-slate-200 tracking-tight text-center truncate w-full">
                            {realDetails.partNumber || comp.value || comp.designator}
                          </span>
                          <span className="text-[6px] font-mono text-slate-400 text-center uppercase">
                            {realDetails.manufacturer || 'TI USA'}
                          </span>
                        </div>

                        {/* Silver Bent Metal Pins (DIP legs) */}
                        <div className="absolute -left-1.5 top-1 flex flex-col justify-between h-7">
                          {[1, 2, 3, 4].map((p) => (
                            <div key={p} className="w-2.5 h-1 bg-gradient-to-r from-slate-200 to-slate-400 rounded-xs shadow-xs" />
                          ))}
                        </div>
                        <div className="absolute -right-1.5 top-1 flex flex-col justify-between h-7">
                          {[5, 6, 7, 8].map((p) => (
                            <div key={p} className="w-2.5 h-1 bg-gradient-to-l from-slate-200 to-slate-400 rounded-xs shadow-xs" />
                          ))}
                        </div>
                      </div>
                    ) : comp.type === 'polarized_capacitor' ? (
                      // 3D Aluminum Electrolytic Can Capacitor
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          transformStyle: 'preserve-3d',
                        }}
                        className="relative flex items-center justify-center"
                      >
                        {/* Cylinder Top (Metallic Vent) */}
                        <div
                          style={{
                            transform: 'translateZ(18px)',
                            boxShadow: '0 10px 20px rgba(0, 0, 0, 0.85)',
                          }}
                          className="w-8 h-8 rounded-full bg-gradient-to-br from-[#e2e8f0] via-[#94a3b8] to-[#475569] border-2 border-slate-400 flex items-center justify-center shadow-lg"
                        >
                          {/* Vent score (X shape) */}
                          <div className="w-5 h-0.5 bg-slate-500 rotate-45 absolute" />
                          <div className="w-5 h-0.5 bg-slate-500 -rotate-45 absolute" />
                        </div>
                        {/* Negative stripe */}
                        <div className="absolute -left-2 top-1 text-[7px] font-bold text-white font-mono">
                          -
                        </div>
                      </div>
                    ) : comp.type === 'led' ? (
                      // 3D 5mm Colored Acrylic LED Dome
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          transformStyle: 'preserve-3d',
                        }}
                        className="relative flex items-center justify-center"
                      >
                        <div
                          style={{
                            transform: 'translateZ(14px)',
                            boxShadow: showWorkingSimulation
                              ? '0 0 24px rgba(239, 68, 68, 1), 0 8px 16px rgba(0, 0, 0, 0.8)'
                              : '0 0 12px rgba(239, 68, 68, 0.5), 0 6px 10px rgba(0, 0, 0, 0.6)',
                          }}
                          className="w-6 h-6 rounded-full bg-gradient-to-br from-red-400 via-red-600 to-red-800 border border-red-300/80 flex items-center justify-center"
                        >
                          <div className="w-2 h-2 rounded-full bg-white/80 blur-2xs" />
                        </div>
                      </div>
                    ) : comp.type === 'ic_regulator' ? (
                      // 3D TO-220 Voltage Regulator with Metal Heatsink Tab
                      <div
                        style={{
                          width: 38,
                          height: 34,
                          transformStyle: 'preserve-3d',
                        }}
                        className="relative flex flex-col items-center justify-center"
                      >
                        {/* Silver Aluminum Heatsink Tab with mounting hole */}
                        <div
                          style={{ transform: 'translateZ(14px)' }}
                          className="w-7 h-4 bg-gradient-to-b from-slate-200 to-slate-400 rounded-t-xs border border-slate-300 flex items-center justify-center shadow-md"
                        >
                          <div className="w-2 h-2 rounded-full bg-slate-800 border border-slate-500" />
                        </div>
                        {/* Black Molded Body */}
                        <div
                          style={{ transform: 'translateZ(10px)' }}
                          className="w-8 h-4 bg-gradient-to-b from-[#252528] to-[#121214] rounded-b-xs border border-slate-700 flex items-center justify-center"
                        >
                          <span className="text-[6px] font-mono text-slate-200 font-bold">7805</span>
                        </div>
                      </div>
                    ) : comp.type === 'resistor' ? (
                      // 3D Axial Resistor with Color Bands
                      <div
                        style={{
                          width: 44,
                          height: 16,
                          transformStyle: 'preserve-3d',
                        }}
                        className="relative flex items-center justify-center"
                      >
                        {/* Ceramic Body */}
                        <div
                          style={{
                            transform: 'translateZ(6px)',
                            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.6)',
                          }}
                          className="w-7 h-3 rounded-full bg-[#fde047] border border-amber-600 flex items-center justify-around px-0.5"
                        >
                          {/* 4 Color Bands */}
                          <div className="w-0.5 h-full bg-[#78350f]" />
                          <div className="w-0.5 h-full bg-[#0f172a]" />
                          <div className="w-0.5 h-full bg-[#ea580c]" />
                          <div className="w-0.5 h-full bg-[#eab308]" />
                        </div>
                        {/* Axial Wire Leads */}
                        <div className="w-full h-0.5 bg-slate-300 absolute -z-1" />
                      </div>
                    ) : (
                      // Default 3D SMD Chip Component (Resistor / Cap / Diode)
                      <div
                        style={{
                          width: 32,
                          height: 18,
                          transformStyle: 'preserve-3d',
                        }}
                        className="relative flex items-center justify-between"
                      >
                        <div
                          style={{ transform: 'translateZ(5px)' }}
                          className="w-full h-full bg-gradient-to-b from-[#334155] to-[#1e293b] rounded-xs border border-slate-600 flex items-center justify-between px-1 shadow-sm"
                        >
                          <div className="w-1.5 h-full bg-slate-300 rounded-xs" />
                          <span className="text-[7px] font-mono text-slate-100 font-bold">
                            {comp.designator}
                          </span>
                          <div className="w-1.5 h-full bg-slate-300 rounded-xs" />
                        </div>
                      </div>
                    )}

                    {/* Silkscreen Reference Designator Label */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] font-mono font-bold text-white whitespace-nowrap drop-shadow">
                      {comp.designator}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 3D Finished Product Enclosure Casing (When Enabled) */}
            {showEnclosure && (
              <div
                style={{
                  width: boardWidth + 40,
                  height: boardHeight + 40,
                  left: -20,
                  top: -20,
                  transform: 'translateZ(26px)',
                  transformStyle: 'preserve-3d',
                }}
                className="absolute pointer-events-none rounded-2xl border-2 border-slate-400/40 bg-slate-900/30 backdrop-blur-[2px] shadow-[0_25px_60px_rgba(0,0,0,0.8)]"
              >
                {/* 4 Case Corner Hex Standoff Screws */}
                <div className="absolute top-2 left-2 w-4 h-4 rounded-full bg-gradient-to-br from-slate-200 to-slate-400 border border-slate-500 shadow-sm flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-slate-600 rotate-45" />
                </div>
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-gradient-to-br from-slate-200 to-slate-400 border border-slate-500 shadow-sm flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-slate-600 rotate-45" />
                </div>
                <div className="absolute bottom-2 left-2 w-4 h-4 rounded-full bg-gradient-to-br from-slate-200 to-slate-400 border border-slate-500 shadow-sm flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-slate-600 rotate-45" />
                </div>
                <div className="absolute bottom-2 right-2 w-4 h-4 rounded-full bg-gradient-to-br from-slate-200 to-slate-400 border border-slate-500 shadow-sm flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-slate-600 rotate-45" />
                </div>

                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded bg-black/60 text-[9px] font-mono text-emerald-400 uppercase tracking-widest border border-emerald-500/30">
                  Enclosure: Smoked Acrylic Prototyping Case
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Selected Component Floating Inspector & Real Product Part Details */}
        {activeSelectedComp && (
          <div className="absolute bottom-4 right-4 max-w-sm bg-slate-900/95 backdrop-blur-md border border-sky-500/40 p-4 rounded-xl shadow-2xl text-xs z-30 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="flex items-start justify-between border-b border-slate-800 pb-2 mb-2.5">
              <div className="flex items-center gap-3">
                <RealProductImage component={activeSelectedComp} className="w-12 h-12 rounded-lg border border-slate-700 bg-slate-950 p-1 flex-shrink-0 object-contain shadow-inner" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sky-400 font-mono text-sm">
                      {activeSelectedComp.designator}
                    </span>
                    <span className="text-slate-300 font-medium">
                      {activeSelectedComp.value}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Footprint: <span className="text-slate-200 font-mono">{activeSelectedComp.footprint}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCompId(null)}
                className="text-slate-500 hover:text-slate-300 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Real Project Manufacturer Part Information */}
            {(() => {
              const details = getRealProductDetails(activeSelectedComp);
              return (
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                    <span>Authentic Product Specs</span>
                    <span className="text-slate-400 font-mono text-[9px]">{details.package}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                    <span className="text-slate-400">Manufacturer:</span>
                    <span className="text-slate-200 font-medium">
                      {details.manufacturer}
                    </span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                    <span className="text-slate-400">Part Number (MPN):</span>
                    <span className="text-amber-300 font-mono font-semibold">
                      {details.partNumber}
                    </span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                    <span className="text-slate-400">Supplier &amp; SKU:</span>
                    <span className="text-sky-300 font-mono">
                      {details.supplier} ({details.supplierPartNumber})
                    </span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-400">Estimated Unit Cost:</span>
                    <span className="text-emerald-400 font-semibold font-mono">
                      {details.unitPrice}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Action Buttons */}
            <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center gap-2">
              {onOpenProductSelector && (
                <button
                  onClick={() => onOpenProductSelector(activeSelectedComp)}
                  className="flex-1 px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Select / Change Product...
                </button>
              )}
              {activeSelectedComp.realPart?.datasheetUrl && (
                <a
                  href={activeSelectedComp.realPart.datasheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                  title="Open Manufacturer Datasheet"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Gerber Export Success Toast */}
        {exportSuccess && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-emerald-950/95 border border-emerald-600 text-emerald-200 text-xs rounded-lg shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Gerber ZIP package exported! Ready for upload to JLCPCB / PCBWay.</span>
          </div>
        )}

        {/* Floating 3D Directional Controls & Quick Orientation Presets for Checks */}
        <div className="absolute bottom-4 left-4 z-30 flex flex-col gap-2 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 p-2.5 rounded-xl shadow-2xl text-xs text-slate-200 w-64 select-none">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 font-mono">
              <Compass className="w-3.5 h-3.5" />
              <span>Pitch: {Math.round(rotX)}° • Yaw: {Math.round(rotZ)}°</span>
            </div>
            <button
              onClick={() => setIsAutoRotating(!isAutoRotating)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 transition-all ${
                isAutoRotating
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle 360° Continuous Turntable Rotation in all directions"
            >
              {isAutoRotating ? <Pause className="w-3 h-3 text-emerald-400" /> : <Play className="w-3 h-3 text-slate-400" />}
              <span>360° Spin</span>
            </button>
          </div>

          {/* Preset Buttons Grid */}
          <div className="grid grid-cols-4 gap-1 text-[10px] font-medium">
            <button
              onClick={() => handleSetViewOrientation('top')}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700/60 flex items-center justify-center gap-1"
              title="Top View (Component Silkscreen, 0°)"
            >
              <span>Top</span>
            </button>
            <button
              onClick={() => handleSetViewOrientation('bottom')}
              className="px-2 py-1 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 rounded border border-amber-700/60 flex items-center justify-center gap-1"
              title="Bottom View (180° Inverted - Solder Side & Traces)"
            >
              <FlipVertical className="w-2.5 h-2.5" />
              <span>Solder</span>
            </button>
            <button
              onClick={() => handleSetViewOrientation('front')}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700/60 flex items-center justify-center"
              title="Front Edge (90° Pitch)"
            >
              <span>Front</span>
            </button>
            <button
              onClick={() => handleSetViewOrientation('back')}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700/60 flex items-center justify-center"
              title="Back Edge (-90° Pitch)"
            >
              <span>Back</span>
            </button>
            <button
              onClick={() => handleSetViewOrientation('left')}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700/60 flex items-center justify-center"
              title="Left Profile"
            >
              <span>Left</span>
            </button>
            <button
              onClick={() => handleSetViewOrientation('right')}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700/60 flex items-center justify-center"
              title="Right Profile"
            >
              <span>Right</span>
            </button>
            <button
              onClick={() => handleSetViewOrientation('iso')}
              className="px-2 py-1 bg-sky-950/50 hover:bg-sky-900 text-sky-300 rounded border border-sky-700/60 flex items-center justify-center"
              title="Isometric 3D Perspective"
            >
              <span>Iso 3D</span>
            </button>
            <button
              onClick={handleResetView}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded border border-slate-700/60 flex items-center justify-center"
              title="Reset to Default Perspective"
            >
              <RefreshCw className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* Incremental Directional Rotation Buttons */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px]">
            <span className="text-slate-500 font-mono">Rotate:</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleStepRotate('z', -90)}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-0.5"
                title="Rotate -90° CCW"
              >
                <RotateCcw className="w-3 h-3 text-sky-400" />
                <span>-90°</span>
              </button>
              <button
                onClick={() => handleStepRotate('z', 90)}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-0.5"
                title="Rotate +90° CW"
              >
                <RotateCw className="w-3 h-3 text-sky-400" />
                <span>+90°</span>
              </button>
              <button
                onClick={() => handleStepRotate('x', 180)}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded flex items-center gap-0.5"
                title="Invert 180°"
              >
                <span>Flip 180°</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3D Viewer Bottom HUD */}
      <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono z-10">
        <div className="flex items-center space-x-4">
          <span>Pitch: {Math.round(rotX)}°</span>
          <span>Yaw: {Math.round(rotZ)}°</span>
          <span>Zoom: {Math.round(zoom * 100)}%</span>
        </div>
        <div className="flex items-center space-x-3">
          <span>Dimensions: 100mm × 68mm</span>
          <span>Thickness: 1.6mm</span>
          <span>Copper: 1oz (35µm)</span>
        </div>
      </div>
    </div>
  );
};
