import React, { useState, useRef } from 'react';
import { SchematicDocument } from '../../types';
import { Printer, Download, X, Layers, Cpu } from 'lucide-react';
import { pointsToSvgPath, calculateJunctions } from '../../utils/geometry';
import { ComponentGlyph } from '../schematic/ComponentGlyph';

interface PrintPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: SchematicDocument;
}

type PrintLayerType =
  | 'schematic'
  | 'pcb_all'
  | 'pcb_top_copper'
  | 'pcb_bottom_copper'
  | 'pcb_silkscreen'
  | 'pcb_mask'
  | 'pcb_drill'
  | 'pcb_etch_mask';

export const PrintPdfModal: React.FC<PrintPdfModalProps> = ({
  isOpen,
  onClose,
  document: doc,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [selectedLayer, setSelectedLayer] = useState<PrintLayerType>('schematic');

  const safeDoc = doc || {
    title: 'Circuit Schematic',
    components: [],
    wires: [],
  };

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadSvg = () => {
    if (!printAreaRef.current) return;
    const svgElement = printAreaRef.current.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `${(safeDoc.title || 'circuit').toLowerCase().replace(/\s+/g, '_')}_${selectedLayer}_print.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    URL.revokeObjectURL(svgUrl);
  };

  // Calculate bounding box of components and wires
  let minX = 100, minY = 100, maxX = 800, maxY = 500;
  const docComponents = safeDoc.components || [];
  const docWires = safeDoc.wires || [];

  if (docComponents.length > 0) {
    minX = Math.min(...docComponents.map((c) => c.x)) - 100;
    minY = Math.min(...docComponents.map((c) => c.y)) - 80;
    maxX = Math.max(...docComponents.map((c) => c.x)) + 140;
    maxY = Math.max(...docComponents.map((c) => c.y)) + 100;
  }
  const viewBoxWidth = Math.max(800, maxX - minX);
  const viewBoxHeight = Math.max(550, maxY - minY);

  const junctions = calculateJunctions(docWires, docComponents);
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      {/* Modal Card */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden text-slate-100 print:border-none print:shadow-none print:w-full print:max-w-none print:max-h-none print:bg-white print:text-black">
        {/* Modal Header (Hidden during print) */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-850 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-sky-950 text-sky-400 rounded-lg border border-sky-800">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Print &amp; Export Layer-Wise PDF
              </h2>
              <p className="text-xs text-slate-400">
                Choose ANSI Schematic or Layer-Wise PCB (Top Copper, Bottom Copper, Silkscreen, Solder Mask, DIY Etch)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadSvg}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4 text-sky-400" />
              <span>Export High-Res SVG</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print to PDF...</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg text-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Layer Selection Pills (Print-hidden) */}
        <div className="px-6 py-2 border-b border-slate-800 bg-slate-950/60 flex items-center gap-1.5 overflow-x-auto text-xs print:hidden">
          <span className="text-slate-400 font-semibold text-[11px] mr-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-sky-400" /> Layer:
          </span>
          {[
            { id: 'schematic', label: 'Schematic Complete' },
            { id: 'pcb_all', label: 'PCB Full Layout' },
            { id: 'pcb_top_copper', label: 'Top Copper Layer' },
            { id: 'pcb_bottom_copper', label: 'Bottom Copper Layer' },
            { id: 'pcb_silkscreen', label: 'Top Silkscreen' },
            { id: 'pcb_mask', label: 'Solder Mask Layer' },
            { id: 'pcb_drill', label: 'Drill Hole Layer' },
            { id: 'pcb_etch_mask', label: 'DIY Toner Etch Mask (B&W)' },
          ].map((l) => (
            <button
              key={l.id}
              onClick={() => setSelectedLayer(l.id as PrintLayerType)}
              className={`px-3 py-1 rounded-md whitespace-nowrap transition-all ${
                selectedLayer === l.id
                  ? 'bg-sky-600 text-white font-medium shadow-xs'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Printable Sheet Viewport */}
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-slate-950 print:p-0 print:bg-white">
          <div
            ref={printAreaRef}
            className={`w-full max-w-4xl p-6 rounded-sm shadow-xl border border-slate-300 print:border-none print:shadow-none print:p-4 print:max-w-none print:w-full ${
              selectedLayer === 'pcb_etch_mask' ? 'bg-black text-white' : 'bg-white text-black'
            }`}
            style={{ aspectRatio: '1.414/1' }} // Standard A4 / Letter engineering aspect ratio
          >
            {/* Outer Border with Reference Grids */}
            <div
              className={`relative w-full h-full border-2 ${
                selectedLayer === 'pcb_etch_mask' ? 'border-white' : 'border-black'
              } p-4 flex flex-col justify-between`}
            >
              {/* Reference Grid Markers */}
              <div className="absolute top-0 inset-x-0 flex justify-between px-16 text-[9px] font-mono font-bold select-none">
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
              </div>
              <div className="absolute left-0 inset-y-0 flex flex-col justify-between py-16 text-[9px] font-mono font-bold select-none">
                <span>A</span>
                <span>B</span>
                <span>C</span>
                <span>D</span>
              </div>

              {/* Inner Drawing SVG */}
              <div className="flex-1 relative w-full h-full overflow-hidden my-2">
                {selectedLayer === 'schematic' ? (
                  /* Standard Schematic Drawing */
                  <svg
                    className="w-full h-full"
                    viewBox={`${minX} ${minY} ${viewBoxWidth} ${viewBoxHeight}`}
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <pattern id="print-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <circle cx="10" cy="10" r="0.5" fill="#94a3b8" />
                    </pattern>
                    <rect
                      x={minX}
                      y={minY}
                      width={viewBoxWidth}
                      height={viewBoxHeight}
                      fill="url(#print-grid)"
                    />

                    {/* Wires */}
                    {doc.wires.map((wire, wireIdx) => {
                      const pathStr = pointsToSvgPath(wire.points);
                      return (
                        <g key={`${wire.id}-${wireIdx}`}>
                          <path
                            d={pathStr}
                            fill="none"
                            stroke="#0f172a"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="miter"
                          />
                        </g>
                      );
                    })}

                    {/* Junctions */}
                    {junctions.map((pt, idx) => (
                      <circle
                        key={`junct-${idx}`}
                        cx={pt.x}
                        cy={pt.y}
                        r="3.5"
                        fill="#0f172a"
                      />
                    ))}

                    {/* Components */}
                    {docComponents.map((comp, compIdx) => (
                      <ComponentGlyph
                        key={`${comp.id}-${compIdx}`}
                        component={comp}
                        isSelected={false}
                        isHovered={false}
                      />
                    ))}
                  </svg>
                ) : (
                  /* Layer-Wise PCB Output Rendering */
                  <svg
                    className="w-full h-full"
                    viewBox="0 0 650 420"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    {/* PCB Board Outline */}
                    <rect
                      x="20"
                      y="20"
                      width="610"
                      height="380"
                      rx="12"
                      fill={
                        selectedLayer === 'pcb_etch_mask'
                          ? '#ffffff'
                          : selectedLayer === 'pcb_all'
                          ? '#0b3d2e'
                          : '#ffffff'
                      }
                      stroke={selectedLayer === 'pcb_etch_mask' ? '#000000' : '#0f172a'}
                      strokeWidth="2"
                    />

                    {/* Mounting Holes */}
                    {[
                      { x: 38, y: 38 },
                      { x: 612, y: 38 },
                      { x: 38, y: 382 },
                      { x: 612, y: 382 },
                    ].map((h, i) => (
                      <circle
                        key={i}
                        cx={h.x}
                        cy={h.y}
                        r="8"
                        fill={selectedLayer === 'pcb_etch_mask' ? '#000000' : '#e2e8f0'}
                        stroke="#000000"
                        strokeWidth="1.5"
                      />
                    ))}

                    {/* Layer-Specific Copper Traces & Pads */}
                    {docComponents.map((c, idx) => {
                      const posX = 70 + (idx % 5) * 115;
                      const posY = 75 + Math.floor(idx / 5) * 105;

                      return (
                        <g key={c.id} transform={`translate(${posX}, ${posY})`}>
                          {/* Silkscreen */}
                          {(selectedLayer === 'pcb_all' || selectedLayer === 'pcb_silkscreen') && (
                            <g>
                              <rect
                                x="-35"
                                y="-25"
                                width="70"
                                height="50"
                                rx="2"
                                fill="none"
                                stroke={selectedLayer === 'pcb_all' ? '#ffffff' : '#000000'}
                                strokeWidth="1.2"
                              />
                              <text
                                x="0"
                                y="-30"
                                textAnchor="middle"
                                fontSize="9"
                                fontFamily="monospace"
                                fontWeight="bold"
                                fill={selectedLayer === 'pcb_all' ? '#ffffff' : '#000000'}
                              >
                                {c.designator} ({c.value})
                              </text>
                            </g>
                          )}

                          {/* Pads & Copper */}
                          {(selectedLayer === 'pcb_all' ||
                            selectedLayer === 'pcb_top_copper' ||
                            selectedLayer === 'pcb_bottom_copper' ||
                            selectedLayer === 'pcb_mask' ||
                            selectedLayer === 'pcb_etch_mask') && (
                            <g>
                              {c.pins.slice(0, 6).map((pin, pIdx) => {
                                const padX = -24 + (pIdx % 3) * 24;
                                const padY = pIdx < 3 ? -12 : 12;
                                return (
                                  <circle
                                    key={pin.id}
                                    cx={padX}
                                    cy={padY}
                                    r={selectedLayer === 'pcb_mask' ? '6' : '4.5'}
                                    fill={
                                      selectedLayer === 'pcb_etch_mask'
                                        ? '#000000'
                                        : selectedLayer === 'pcb_top_copper'
                                        ? '#dc2626'
                                        : selectedLayer === 'pcb_bottom_copper'
                                        ? '#2563eb'
                                        : '#d97706'
                                    }
                                    stroke="#000000"
                                    strokeWidth="0.8"
                                  />
                                );
                              })}
                            </g>
                          )}

                          {/* Drill Layer */}
                          {(selectedLayer === 'pcb_all' || selectedLayer === 'pcb_drill') && (
                            <g>
                              {c.pins.slice(0, 6).map((pin, pIdx) => {
                                const padX = -24 + (pIdx % 3) * 24;
                                const padY = pIdx < 3 ? -12 : 12;
                                return (
                                  <circle
                                    key={`hole-${pin.id}`}
                                    cx={padX}
                                    cy={padY}
                                    r="1.8"
                                    fill="#ffffff"
                                    stroke="#000000"
                                    strokeWidth="0.5"
                                  />
                                );
                              })}
                            </g>
                          )}
                        </g>
                      );
                    })}

                    {/* Routing Traces */}
                    {(selectedLayer === 'pcb_all' ||
                      selectedLayer === 'pcb_top_copper' ||
                      selectedLayer === 'pcb_bottom_copper' ||
                      selectedLayer === 'pcb_etch_mask') &&
                      docWires.map((w, idx) => {
                        const startX = 70 + (idx % 5) * 115;
                        const startY = 75 + Math.floor(idx / 5) * 105;
                        const endX = 70 + ((idx + 1) % 5) * 115;
                        const endY = 75 + Math.floor((idx + 1) / 5) * 105;

                        return (
                          <path
                            key={w.id}
                            d={`M ${startX} ${startY} L ${endX} ${startY} L ${endX} ${endY}`}
                            fill="none"
                            stroke={
                              selectedLayer === 'pcb_etch_mask'
                                ? '#000000'
                                : selectedLayer === 'pcb_top_copper'
                                ? '#dc2626'
                                : '#2563eb'
                            }
                            strokeWidth={selectedLayer === 'pcb_etch_mask' ? '3' : '2.5'}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        );
                      })}
                  </svg>
                )}
              </div>

              {/* Title Block */}
              <div
                className={`border-t-2 ${
                  selectedLayer === 'pcb_etch_mask' ? 'border-white text-white' : 'border-black text-black'
                } pt-2 mt-1 flex items-end justify-between text-xs`}
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-sm uppercase tracking-wide">{safeDoc.title}</div>
                  <div className="text-[10px]">
                    LAYER: <span className="font-mono font-bold uppercase">{selectedLayer}</span> |
                    PARTS: {docComponents.length} | WIRES: {docWires.length}
                  </div>
                </div>

                <div className="text-right text-[10px] font-mono">
                  <div>REV: 1.0.0 &nbsp;|&nbsp; DATE: {currentDate}</div>
                  <div className="font-bold">SHEET 1 OF 1</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
