import React, { useState, useRef, useEffect } from 'react';
import { SchematicComponent, Wire, Point } from '../../types';
import {
  Zap,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Compass,
  Sparkles,
  Layers,
  Box,
  Cpu,
  Move,
  Grid,
  CheckCircle,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import {
  computePcbCoordinatesFromSchematic,
  syncAllFromSchematic,
  autoArrangeBestFit,
} from '../../utils/pcbPlacement';

interface PcbCanvasProps {
  components: SchematicComponent[];
  wires: Wire[];
  onUpdateComponentPlacement?: (id: string, x: number, y: number, rotation?: number) => void;
  onBatchUpdatePlacements?: (updatedComponents: SchematicComponent[]) => void;
  onSelectComponent?: (id: string) => void;
}

interface FootprintLayout {
  id: string;
  componentId: string;
  designator: string;
  value: string;
  type: string;
  footprint: string;
  x: number;
  y: number;
  rotation: number;
  width: number;
  height: number;
  pads: {
    id: string;
    number: string;
    x: number;
    y: number;
    type: 'tht' | 'smd';
    net?: string;
  }[];
}

function buildFootprint(
  c: SchematicComponent,
  x: number,
  y: number,
  rotation: number
): FootprintLayout {
  let pads: FootprintLayout['pads'] = [];
  let width = 60;
  let height = 40;

  if (
    c.type.startsWith('sensor_') ||
    c.type.startsWith('ext_') ||
    c.category === 'sensors' ||
    c.category === 'modules'
  ) {
    // Sensor & Module breakout footprint
    const pinCount = Math.max(3, c.pins?.length || 4);
    width = Math.max(75, pinCount * 14 + 20);
    height = 55;

    // Single or dual in-line header pins
    const spacing = 14;
    const startX = -((pinCount - 1) * spacing) / 2;
    for (let p = 0; p < pinCount; p++) {
      pads.push({
        id: c.pins[p]?.id || String(p + 1),
        number: String(p + 1),
        x: Math.round(startX + p * spacing),
        y: 18,
        type: 'tht',
        net: c.pins[p]?.net,
      });
    }
  } else if (c.type === 'ic_ne555' || c.footprint?.includes('DIP-8')) {
    width = 80;
    height = 60;
    for (let p = 1; p <= 4; p++) {
      pads.push({
        id: String(p),
        number: String(p),
        x: -30 + (p - 1) * 20,
        y: 20,
        type: 'tht',
        net: c.pins.find((pin) => pin.id === String(p))?.net,
      });
    }
    for (let p = 5; p <= 8; p++) {
      pads.push({
        id: String(p),
        number: String(p),
        x: 30 - (p - 5) * 20,
        y: -20,
        type: 'tht',
        net: c.pins.find((pin) => pin.id === String(p))?.net,
      });
    }
  } else if (c.type === 'ic_regulator' || c.footprint?.includes('TO-220')) {
    width = 70;
    height = 40;
    pads = [
      { id: '1', number: '1', x: -20, y: 0, type: 'tht', net: c.pins[0]?.net },
      { id: '2', number: '2', x: 0, y: 0, type: 'tht', net: c.pins[1]?.net },
      { id: '3', number: '3', x: 20, y: 0, type: 'tht', net: c.pins[2]?.net },
    ];
  } else if (c.type === 'npn_bjt' || c.type === 'pnp_bjt' || c.footprint?.includes('TO-92')) {
    width = 50;
    height = 40;
    pads = [
      { id: '1', number: '1', x: -14, y: 8, type: 'tht', net: c.pins[0]?.net },
      { id: '2', number: '2', x: 0, y: -8, type: 'tht', net: c.pins[1]?.net },
      { id: '3', number: '3', x: 14, y: 8, type: 'tht', net: c.pins[2]?.net },
    ];
  } else if (c.type === 'ic_mcu' || c.footprint?.includes('DIP-28')) {
    width = 130;
    height = 80;
    for (let p = 1; p <= 14; p++) {
      pads.push({
        id: String(p),
        number: String(p),
        x: -55 + (p - 1) * 8.5,
        y: 28,
        type: 'tht',
        net: c.pins.find((pin) => pin.id === String(p))?.net,
      });
    }
    for (let p = 15; p <= 28; p++) {
      pads.push({
        id: String(p),
        number: String(p),
        x: 55 - (p - 15) * 8.5,
        y: -28,
        type: 'tht',
        net: c.pins.find((pin) => pin.id === String(p))?.net,
      });
    }
  } else {
    // Standard 2-terminal passive (Resistors, Capacitors, LEDs, Diodes)
    width = 50;
    height = 30;
    pads = [
      { id: '1', number: '1', x: -16, y: 0, type: 'smd', net: c.pins[0]?.net },
      { id: '2', number: '2', x: 16, y: 0, type: 'smd', net: c.pins[1]?.net },
    ];
  }

  return {
    id: `fp_${c.id}`,
    componentId: c.id,
    designator: c.designator,
    value: c.value,
    type: c.type,
    footprint: c.footprint,
    x,
    y,
    rotation,
    width,
    height,
    pads,
  };
}

export const PcbCanvas: React.FC<PcbCanvasProps> = ({
  components,
  wires,
  onUpdateComponentPlacement,
  onBatchUpdatePlacements,
  onSelectComponent,
}) => {
  const [boardWidth, setBoardWidth] = useState(620);
  const [boardHeight, setBoardHeight] = useState(420);
  const [activeLayer, setActiveLayer] = useState<'both' | 'top' | 'bottom'>('both');
  const [selectedFootprintId, setSelectedFootprintId] = useState<string | null>(null);

  // 2D PCB Board Full-Circuit Rotation in all directions & Flip check
  const [boardRotation, setBoardRotation] = useState<0 | 90 | 180 | 270>(0);
  const [isBoardFlipped, setIsBoardFlipped] = useState(false);

  // Dragging state
  const [draggingFpId, setDraggingFpId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const boardRef = useRef<HTMLDivElement>(null);

  // Derive PCB footprint placement from schematic components
  const [footprints, setFootprints] = useState<FootprintLayout[]>(() => {
    const coordMap = computePcbCoordinatesFromSchematic(components, boardWidth, boardHeight);
    return components.map((c, i) => {
      const pos = coordMap.get(c.id) || {
        x: 75 + (i % 5) * 115,
        y: 80 + Math.floor(i / 5) * 105,
        rotation: c.pcbRotation ?? 0,
      };
      return buildFootprint(c, pos.x, pos.y, pos.rotation);
    });
  });

  // Re-synchronize footprints whenever schematic components change or are updated
  useEffect(() => {
    const coordMap = computePcbCoordinatesFromSchematic(components, boardWidth, boardHeight);
    setFootprints(
      components.map((c, i) => {
        const pos = coordMap.get(c.id) || {
          x: 75 + (i % 5) * 115,
          y: 80 + Math.floor(i / 5) * 105,
          rotation: c.pcbRotation ?? 0,
        };
        return buildFootprint(c, pos.x, pos.y, pos.rotation);
      })
    );
  }, [components, boardWidth, boardHeight]);

  // Calculate unrouted rat's nest lines and connected nets
  const ratsnestLines: { x1: number; y1: number; x2: number; y2: number; net: string }[] = [];
  const netPadMap = new Map<string, { x: number; y: number }[]>();

  for (const fp of footprints) {
    for (const pad of fp.pads) {
      if (pad.net && pad.net !== 'NC') {
        const rad = (fp.rotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const rotatedPadX = pad.x * cos - pad.y * sin;
        const rotatedPadY = pad.x * sin + pad.y * cos;

        const absX = fp.x + rotatedPadX;
        const absY = fp.y + rotatedPadY;
        const list = netPadMap.get(pad.net) || [];
        list.push({ x: absX, y: absY });
        netPadMap.set(pad.net, list);
      }
    }
  }

  for (const [netName, padsList] of netPadMap.entries()) {
    if (padsList.length > 1) {
      for (let i = 0; i < padsList.length - 1; i++) {
        ratsnestLines.push({
          x1: padsList[i].x,
          y1: padsList[i].y,
          x2: padsList[i + 1].x,
          y2: padsList[i + 1].y,
          net: netName,
        });
      }
    }
  }

  // Handle Dragging Footprints on 2D PCB Canvas
  const handleMouseDownFootprint = (e: React.MouseEvent, fp: FootprintLayout) => {
    e.stopPropagation();
    setSelectedFootprintId(fp.id);
    setDraggingFpId(fp.id);
    if (onSelectComponent) {
      onSelectComponent(fp.componentId);
    }

    if (boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      setDragOffset({
        x: mouseX - fp.x,
        y: mouseY - fp.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingFpId || !boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // 10px snap-to-grid
    const newX = Math.round((mouseX - dragOffset.x) / 10) * 10;
    const newY = Math.round((mouseY - dragOffset.y) / 10) * 10;

    // Clamp inside board boundaries
    const clampedX = Math.max(40, Math.min(boardWidth - 40, newX));
    const clampedY = Math.max(40, Math.min(boardHeight - 40, newY));

    setFootprints((prev) =>
      prev.map((fp) => (fp.id === draggingFpId ? { ...fp, x: clampedX, y: clampedY } : fp))
    );
  };

  const handleMouseUp = () => {
    if (draggingFpId) {
      const movedFp = footprints.find((fp) => fp.id === draggingFpId);
      if (movedFp && onUpdateComponentPlacement) {
        onUpdateComponentPlacement(movedFp.componentId, movedFp.x, movedFp.y, movedFp.rotation);
      }
    }
    setDraggingFpId(null);
  };

  // Rotate selected footprint in specific direction (CW 90, CCW 90, 180)
  const handleRotateSelected = (step: number = 90) => {
    if (!selectedFootprintId) return;
    const fp = footprints.find((f) => f.id === selectedFootprintId);
    if (!fp) return;

    const newRot = ((fp.rotation + step) % 360 + 360) % 360;
    setFootprints((prev) =>
      prev.map((f) => (f.id === selectedFootprintId ? { ...f, rotation: newRot } : f))
    );

    if (onUpdateComponentPlacement) {
      onUpdateComponentPlacement(fp.componentId, fp.x, fp.y, newRot);
    }
  };

  // Rotate Entire 2D PCB Board in all directions (0°, 90°, 180°, 270°)
  const handleRotateBoard = (direction: 'cw90' | 'ccw90' | '180' | 'reset') => {
    setBoardRotation((prev) => {
      if (direction === 'reset') return 0;
      if (direction === 'cw90') return ((prev + 90) % 360) as 0 | 90 | 180 | 270;
      if (direction === 'ccw90') return (((prev - 90) % 360 + 360) % 360) as 0 | 90 | 180 | 270;
      if (direction === '180') return ((prev + 180) % 360) as 0 | 90 | 180 | 270;
      return prev;
    });
  };

  // Flip Board Top / Bottom Solder Check
  const handleToggleBoardFlip = () => {
    setIsBoardFlipped((prev) => !prev);
  };

  // Rotate all components on PCB 90° CW
  const handleRotateAllFootprints = () => {
    setFootprints((prev) =>
      prev.map((f) => {
        const nextRot = (f.rotation + 90) % 360;
        if (onUpdateComponentPlacement) {
          onUpdateComponentPlacement(f.componentId, f.x, f.y, nextRot);
        }
        return { ...f, rotation: nextRot };
      })
    );
  };

  // Keyboard shortcuts: 'r' for CW 90°, 'Shift+R' for CCW 90°
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        if (selectedFootprintId) {
          e.preventDefault();
          handleRotateSelected(e.shiftKey ? -90 : 90);
        } else {
          // If nothing selected, rotate board orientation
          e.preventDefault();
          handleRotateBoard(e.shiftKey ? 'ccw90' : 'cw90');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFootprintId, footprints]);

  // Sync / Re-plot PCB directly from Schematic diagram layout
  const handleSyncFromSchematic = () => {
    const updated = syncAllFromSchematic(components, boardWidth, boardHeight);
    if (onBatchUpdatePlacements) {
      onBatchUpdatePlacements(updated);
    }
  };

  // Auto-Arrange (Best Space Utilization Optimizer)
  const handleAutoArrangeBestFit = () => {
    const updated = autoArrangeBestFit(components, boardWidth, boardHeight);
    if (onBatchUpdatePlacements) {
      onBatchUpdatePlacements(updated);
    }
  };

  const selectedFp = footprints.find((fp) => fp.id === selectedFootprintId);

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="relative w-full h-full flex flex-col bg-[#0b1322] text-slate-100 overflow-hidden select-none"
    >
      {/* PCB Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
        <div className="flex items-center space-x-3">
          <div className="flex items-center gap-1.5 font-semibold text-slate-200">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span>2D PCB Layout &amp; Copper Routing</span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          {/* Layer toggles */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setActiveLayer('both')}
              className={`px-2 py-1 rounded font-medium cursor-pointer transition-colors ${
                activeLayer === 'both' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              All Layers
            </button>
            <button
              onClick={() => setActiveLayer('top')}
              className={`px-2 py-1 rounded font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                activeLayer === 'top'
                  ? 'bg-red-950 text-red-300 border border-red-800'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-500" /> Top Copper
            </button>
            <button
              onClick={() => setActiveLayer('bottom')}
              className={`px-2 py-1 rounded font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                activeLayer === 'bottom'
                  ? 'bg-blue-950 text-blue-300 border border-blue-800'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-500" /> Bottom Copper
            </button>
          </div>
        </div>

        {/* Action Controls: Drag, Rotate & Best-Fit Auto-Arrange */}
        <div className="flex items-center space-x-2">
          {/* Selected Component Position Chip */}
          {selectedFp && (
            <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/90 border border-slate-700 rounded-md text-[11px] font-mono text-sky-300">
              <Move className="w-3 h-3 text-sky-400" />
              <span>{selectedFp.designator}:</span>
              <span>X: {selectedFp.x}mm</span>
              <span>Y: {selectedFp.y}mm</span>
              <span>• {selectedFp.rotation}°</span>
            </div>
          )}

          {/* 2D PCB Directional Orientation & Inspection Toolbar */}
          <div className="flex items-center space-x-1 bg-slate-800/80 px-2 py-1 rounded-md border border-slate-700">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-sky-400 border-r border-slate-700 pr-1.5 mr-0.5">
              <Compass className="w-3.5 h-3.5" />
              <span>Board: {boardRotation}°</span>
            </div>

            <button
              onClick={() => handleRotateBoard('cw90')}
              className="p-1 text-slate-300 hover:text-sky-300 hover:bg-slate-700 rounded transition-colors"
              title="Rotate Entire Board 90° Clockwise (Shortcut: R with no part selected)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleRotateBoard('ccw90')}
              className="p-1 text-slate-300 hover:text-sky-300 hover:bg-slate-700 rounded transition-colors"
              title="Rotate Entire Board 90° Counter-Clockwise (Shift+R)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleRotateBoard('180')}
              className="px-1.5 py-0.5 text-[10px] font-mono text-slate-300 hover:text-sky-300 hover:bg-slate-700 rounded transition-colors"
              title="Rotate Board 180°"
            >
              180°
            </button>
            <button
              onClick={handleToggleBoardFlip}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 transition-colors ${
                isBoardFlipped
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
              title="Flip Board: Inspect Bottom Solder Traces & Through-Hole Pins"
            >
              <FlipHorizontal className="w-3 h-3" />
              <span>{isBoardFlipped ? 'Flipped' : 'Flip'}</span>
            </button>
            {boardRotation !== 0 && (
              <button
                onClick={() => handleRotateBoard('reset')}
                className="px-1 py-0.5 text-[10px] text-slate-400 hover:text-slate-200"
                title="Reset Board Orientation to 0°"
              >
                Reset
              </button>
            )}
          </div>

          {selectedFootprintId && (
            <div className="flex items-center space-x-1 bg-slate-800/80 px-1.5 py-1 rounded-md border border-slate-700">
              <button
                onClick={() => handleRotateSelected(90)}
                className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 rounded text-[11px] font-semibold flex items-center gap-1 text-sky-400 cursor-pointer transition-colors"
                title="Rotate Selected Footprint 90° CW (R)"
              >
                <RotateCw className="w-3 h-3" />
                <span>+90°</span>
              </button>
              <button
                onClick={() => handleRotateSelected(-90)}
                className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 rounded text-[11px] font-semibold flex items-center gap-1 text-sky-400 cursor-pointer transition-colors"
                title="Rotate Selected Footprint -90° CCW (Shift+R)"
              >
                <RotateCcw className="w-3 h-3" />
                <span>-90°</span>
              </button>
              <button
                onClick={() => handleRotateSelected(180)}
                className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 rounded text-[10px] font-mono text-slate-300 hover:text-sky-300 cursor-pointer transition-colors"
                title="Invert Selected Footprint 180°"
              >
                180°
              </button>
            </div>
          )}

          {/* Sync from Schematic Diagram */}
          <button
            onClick={handleSyncFromSchematic}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-sky-500/40 hover:border-sky-400 text-sky-200 rounded-md font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
            title="Re-plot all PCB component placements directly according to the schematic editor diagram"
          >
            <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
            <span>Sync from Schematic</span>
          </button>

          {/* Auto-Arrange Space Optimizer */}
          <button
            onClick={handleAutoArrangeBestFit}
            className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-md font-semibold flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
            title="Automatically arrange components to best optimize PCB board space and clearance"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Auto-Arrange Space</span>
          </button>
        </div>
      </div>

      {/* PCB Board Canvas Area */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
        <div
          ref={boardRef}
          className="relative rounded-xl border-2 bg-[#0e3b2e] border-[#145a45] shadow-2xl overflow-hidden cursor-crosshair"
          style={{
            width: boardWidth,
            height: boardHeight,
            transform: `rotate(${boardRotation}deg) ${isBoardFlipped ? 'scaleX(-1)' : ''}`,
            transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onClick={() => setSelectedFootprintId(null)}
        >
          {/* Subtle Fiber-glass texture */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(#ffffff 1px, transparent 1px), radial-gradient(#ffffff 1px, transparent 1px)',
              backgroundSize: '16px 16px',
              backgroundPosition: '0 0, 8px 8px',
            }}
          />

          {/* Board Orientation & Layer Badge */}
          <div className="absolute bottom-3 left-12 text-[10px] font-mono text-emerald-200/90 bg-slate-950/85 px-2 py-0.5 rounded border border-emerald-500/40 pointer-events-none z-30 flex items-center gap-1.5 shadow-md">
            <Compass className="w-3 h-3 text-emerald-400" />
            <span>Orientation: {boardRotation}°</span>
            <span className="text-slate-400">•</span>
            <span>{isBoardFlipped ? 'Solder Side (Mirrored)' : 'Top Component Side'}</span>
          </div>

          {/* Board Mounting Holes at 4 Corners */}
          <div className="absolute top-4 left-4 w-6 h-6 rounded-full bg-[#0b1322] border-2 border-[#d97706] shadow-inner pointer-events-none" />
          <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[#0b1322] border-2 border-[#d97706] shadow-inner pointer-events-none" />
          <div className="absolute bottom-4 left-4 w-6 h-6 rounded-full bg-[#0b1322] border-2 border-[#d97706] shadow-inner pointer-events-none" />
          <div className="absolute bottom-4 right-4 w-6 h-6 rounded-full bg-[#0b1322] border-2 border-[#d97706] shadow-inner pointer-events-none" />

          {/* Board Silkscreen Branding Title */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[11px] font-mono tracking-widest text-slate-100/70 select-none uppercase font-bold pointer-events-none">
            EASYEDA PRO • DRAG &amp; ARRANGE 2D PCB • PLOTTED FROM SCHEMATIC
          </div>

          {/* SVG Overlays for Copper Traces, Pads, and Rat's Nest */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {/* Rat's Nest Lines (Unrouted gold dashed lines) */}
            {ratsnestLines.map((line, idx) => (
              <line
                key={`ratsnest-${idx}`}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="#fbbf24"
                strokeWidth="1.2"
                strokeDasharray="4 3"
                opacity="0.75"
              />
            ))}

            {/* Top Copper Traces */}
            {(activeLayer === 'both' || activeLayer === 'top') &&
              ratsnestLines.slice(0, Math.floor(ratsnestLines.length / 2)).map((line, idx) => (
                <path
                  key={`trace-top-${idx}`}
                  d={`M ${line.x1} ${line.y1} L ${line.x2} ${line.y1} L ${line.x2} ${line.y2}`}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.85"
                />
              ))}

            {/* Bottom Copper Traces */}
            {(activeLayer === 'both' || activeLayer === 'bottom') &&
              ratsnestLines.slice(Math.floor(ratsnestLines.length / 2)).map((line, idx) => (
                <path
                  key={`trace-bot-${idx}`}
                  d={`M ${line.x1} ${line.y1} L ${line.x1} ${line.y2} L ${line.x2} ${line.y2}`}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.8"
                />
              ))}
          </svg>

          {/* Interactive Component Footprints (Drag-and-Drop) */}
          {footprints.map((fp) => {
            const isSelected = selectedFootprintId === fp.id;
            const isDragging = draggingFpId === fp.id;

            return (
              <div
                key={fp.id}
                onMouseDown={(e) => handleMouseDownFootprint(e, fp)}
                style={{
                  left: fp.x,
                  top: fp.y,
                  width: fp.width,
                  height: fp.height,
                  transform: `translate(-50%, -50%) rotate(${fp.rotation}deg)`,
                  zIndex: isDragging ? 30 : isSelected ? 20 : 10,
                }}
                className={`absolute cursor-move select-none transition-shadow ${
                  isDragging
                    ? 'ring-2 ring-amber-400 shadow-2xl opacity-95 scale-105'
                    : isSelected
                    ? 'ring-2 ring-sky-400 shadow-lg'
                    : 'hover:ring-1 hover:ring-slate-300'
                }`}
              >
                {/* Footprint Silkscreen Box */}
                <div className="relative w-full h-full border-2 border-white/90 bg-slate-900/70 rounded-xs flex items-center justify-center p-1">
                  {/* Pin 1 Notch indicator */}
                  <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-amber-400" />

                  {/* Silkscreen text */}
                  <div className="text-center pointer-events-none">
                    <div className="text-[9px] font-mono font-bold text-white tracking-tighter truncate max-w-[75px]">
                      {fp.designator}
                    </div>
                    <div className="text-[7px] font-mono text-slate-300 truncate max-w-[75px]">
                      {fp.value}
                    </div>
                  </div>

                  {/* Copper Pads */}
                  {fp.pads.map((pad) => (
                    <div
                      key={pad.id}
                      style={{
                        left: `calc(50% + ${pad.x}px)`,
                        top: `calc(50% + ${pad.y}px)`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      className={`absolute w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
                        pad.net?.startsWith('GND')
                          ? 'bg-blue-600 border-blue-300'
                          : pad.net?.startsWith('VCC') || pad.net?.includes('5V')
                          ? 'bg-red-600 border-red-300'
                          : 'bg-amber-500 border-amber-300'
                      }`}
                    >
                      <span className="text-[6px] font-mono font-bold text-black">{pad.number}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
