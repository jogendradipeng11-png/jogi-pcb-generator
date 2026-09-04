import React, { useState, useRef } from 'react';
import { SchematicComponent, Wire, Point } from '../../types';
import { Zap, RotateCw, Sparkles, Layers, Box, Cpu } from 'lucide-react';

interface PcbCanvasProps {
  components: SchematicComponent[];
  wires: Wire[];
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

export const PcbCanvas: React.FC<PcbCanvasProps> = ({ components, wires }) => {
  const [boardWidth, setBoardWidth] = useState(600);
  const [boardHeight, setBoardHeight] = useState(400);
  const [is3DMode, setIs3DMode] = useState(false);
  const [activeLayer, setActiveLayer] = useState<'both' | 'top' | 'bottom'>('both');
  const [selectedFootprintId, setSelectedFootprintId] = useState<string | null>(null);

  // Derive PCB footprint placement from schematic components
  const [footprints, setFootprints] = useState<FootprintLayout[]>(() => {
    return components.map((c, i) => {
      // Map schematic coordinates onto PCB board area
      const x = 70 + (i % 5) * 110;
      const y = 70 + Math.floor(i / 5) * 100;

      // Define pads based on component type
      let pads: FootprintLayout['pads'] = [];
      let width = 60;
      let height = 40;

      if (c.type === 'ic_ne555') {
        width = 80;
        height = 60;
        // DIP-8 footprint: 4 pads on top, 4 on bottom
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
      } else if (c.type === 'ic_regulator') {
        width = 70;
        height = 40;
        // TO-220 3-pin
        pads = [
          { id: '1', number: '1', x: -20, y: 0, type: 'tht', net: c.pins[0]?.net },
          { id: '2', number: '2', x: 0, y: 0, type: 'tht', net: c.pins[1]?.net },
          { id: '3', number: '3', x: 20, y: 0, type: 'tht', net: c.pins[2]?.net },
        ];
      } else if (c.type === 'npn_bjt' || c.type === 'pnp_bjt') {
        width = 50;
        height = 40;
        // TO-92 triangular 3-pin
        pads = [
          { id: '1', number: '1', x: -14, y: 8, type: 'tht', net: c.pins[0]?.net },
          { id: '2', number: '2', x: 0, y: -8, type: 'tht', net: c.pins[1]?.net },
          { id: '3', number: '3', x: 14, y: 8, type: 'tht', net: c.pins[2]?.net },
        ];
      } else if (c.type === 'ic_mcu') {
        width = 130;
        height = 80;
        // DIP-28 MCU
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
        // Standard 2-pad SMD 0805 or axial
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
        rotation: 0,
        width,
        height,
        pads,
      };
    });
  });

  // Calculate unrouted rat's nest lines (connecting pads with matching net names)
  const ratsnestLines: { x1: number; y1: number; x2: number; y2: number; net: string }[] = [];
  const netPadMap = new Map<string, { x: number; y: number }[]>();

  for (const fp of footprints) {
    for (const pad of fp.pads) {
      if (pad.net && pad.net !== 'NC') {
        const absX = fp.x + pad.x;
        const absY = fp.y + pad.y;
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

  // Auto-arrange footprints on the PCB
  const handleAutoPlace = () => {
    const margin = 60;
    const spacingX = 95;
    const spacingY = 85;
    const cols = 5;

    setFootprints((prev) =>
      prev.map((fp, idx) => ({
        ...fp,
        x: margin + (idx % cols) * spacingX,
        y: margin + Math.floor(idx / cols) * spacingY,
      }))
    );
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#0b1322] text-slate-100 overflow-hidden select-none">
      {/* PCB Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
        <div className="flex items-center space-x-3">
          <div className="flex items-center gap-1.5 font-semibold text-slate-200">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span>2D PCB Layout &amp; Copper Routing</span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setActiveLayer('both')}
              className={`px-2 py-1 rounded font-medium ${
                activeLayer === 'both' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              All Layers
            </button>
            <button
              onClick={() => setActiveLayer('top')}
              className={`px-2 py-1 rounded font-medium flex items-center gap-1 ${
                activeLayer === 'top' ? 'bg-red-950 text-red-300 border border-red-800' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-500" /> Top Copper
            </button>
            <button
              onClick={() => setActiveLayer('bottom')}
              className={`px-2 py-1 rounded font-medium flex items-center gap-1 ${
                activeLayer === 'bottom' ? 'bg-blue-950 text-blue-300 border border-blue-800' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-500" /> Bottom Copper
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleAutoPlace}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Auto-Place Components
          </button>
          <button
            onClick={() => setIs3DMode(!is3DMode)}
            className={`px-3 py-1 rounded border transition-colors flex items-center gap-1.5 ${
              is3DMode
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            {is3DMode ? '2D CAD Mode' : '3D Realistic Preview'}
          </button>
        </div>
      </div>

      {/* PCB Board Canvas */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
        <div
          className={`relative transition-all duration-500 ${
            is3DMode ? 'perspective-1000 rotate-x-15 rotate-z-2 shadow-2xl scale-105' : ''
          }`}
          style={{
            width: boardWidth,
            height: boardHeight,
          }}
        >
          {/* FR4 Circuit Board Base */}
          <div
            className={`absolute inset-0 rounded-xl border-2 ${
              is3DMode
                ? 'bg-gradient-to-br from-[#0c3b2e] via-[#092f25] to-[#06241c] border-[#1d735a] shadow-[0_20px_50px_rgba(0,0,0,0.8)]'
                : 'bg-[#0e3b2e] border-[#145a45] shadow-2xl'
            } overflow-hidden`}
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

            {/* Board Mounting Holes at 4 Corners */}
            <div className="absolute top-4 left-4 w-6 h-6 rounded-full bg-[#0b1322] border-2 border-[#d97706] shadow-inner" />
            <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[#0b1322] border-2 border-[#d97706] shadow-inner" />
            <div className="absolute bottom-4 left-4 w-6 h-6 rounded-full bg-[#0b1322] border-2 border-[#d97706] shadow-inner" />
            <div className="absolute bottom-4 right-4 w-6 h-6 rounded-full bg-[#0b1322] border-2 border-[#d97706] shadow-inner" />

            {/* Board Silkscreen Branding Title */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[11px] font-mono tracking-widest text-slate-100/70 select-none uppercase font-bold">
              EASYEDA PRO • PCB REV 1.0 • FR4 1.6MM
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

              {/* Sample Copper Traces (Top layer: Red, Bottom layer: Blue) */}
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

            {/* Component Footprints on Board */}
            {footprints.map((fp) => {
              const isSelected = selectedFootprintId === fp.id;
              return (
                <div
                  key={fp.id}
                  onClick={() => setSelectedFootprintId(fp.id)}
                  style={{
                    left: fp.x,
                    top: fp.y,
                    width: fp.width,
                    height: fp.height,
                    transform: `translate(-50%, -50%) rotate(${fp.rotation}deg)`,
                  }}
                  className={`absolute cursor-pointer rounded transition-all ${
                    isSelected ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-emerald-950' : ''
                  }`}
                >
                  {/* Silkscreen Box outline */}
                  <div className="absolute inset-0 border border-slate-100/70 rounded-xs pointer-events-none" />

                  {/* DIP Notch for ICs */}
                  {fp.type.startsWith('ic_') && (
                    <div className="absolute left-1/2 -top-1 w-3 h-2 -translate-x-1/2 rounded-b-full border border-slate-100/70 bg-[#0e3b2e]" />
                  )}

                  {/* Silkscreen Labels */}
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-slate-100 whitespace-nowrap">
                    {fp.designator}
                  </div>
                  <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[8px] font-mono text-slate-300/80 whitespace-nowrap">
                    {fp.value}
                  </div>

                  {/* Solder Pads */}
                  {fp.pads.map((pad) => (
                    <div
                      key={pad.id}
                      style={{
                        left: `calc(50% + ${pad.x}px)`,
                        top: `calc(50% + ${pad.y}px)`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      className={`absolute flex items-center justify-center ${
                        pad.type === 'tht'
                          ? 'w-4 h-4 rounded-full bg-[#d97706] border border-[#fef08a] shadow-sm'
                          : 'w-4 h-3 rounded-xs bg-[#e2e8f0] border border-amber-300'
                      }`}
                    >
                      {/* Drill hole for through-hole */}
                      {pad.type === 'tht' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[#0b1322]" />
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* PCB Status Bar */}
      <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
        <div>
          Board Size: <span className="text-slate-200">100mm × 68mm</span> (2-Layer FR4)
        </div>
        <div>
          Components: <span className="text-slate-200">{footprints.length} Placed</span> • Ratsnest:{' '}
          <span className="text-amber-400 font-semibold">{ratsnestLines.length} connections</span>
        </div>
      </div>
    </div>
  );
};
