import React, { useRef } from 'react';
import { SchematicDocument } from '../../types';
import { Printer, Download, X, FileText, CheckCircle } from 'lucide-react';
import { pointsToSvgPath, calculateJunctions } from '../../utils/geometry';
import { ComponentGlyph } from '../schematic/ComponentGlyph';

interface PrintPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: SchematicDocument;
}

export const PrintPdfModal: React.FC<PrintPdfModalProps> = ({
  isOpen,
  onClose,
  document: doc,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

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
    downloadLink.download = `${doc.title.toLowerCase().replace(/\s+/g, '_')}_schematic_print.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    URL.revokeObjectURL(svgUrl);
  };

  // Calculate bounding box of components and wires
  let minX = 100, minY = 100, maxX = 800, maxY = 500;
  if (doc.components.length > 0) {
    minX = Math.min(...doc.components.map((c) => c.x)) - 100;
    minY = Math.min(...doc.components.map((c) => c.y)) - 80;
    maxX = Math.max(...doc.components.map((c) => c.x)) + 140;
    maxY = Math.max(...doc.components.map((c) => c.y)) + 100;
  }
  const viewBoxWidth = Math.max(800, maxX - minX);
  const viewBoxHeight = Math.max(550, maxY - minY);

  const junctions = calculateJunctions(doc.wires, doc.components);
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
                Print &amp; Export Schematic PDF
              </h2>
              <p className="text-xs text-slate-400">
                Standard ANSI / ISO Engineering Sheet with Title Block &amp; Bill of Materials
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

        {/* Printable Sheet Viewport */}
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-slate-950 print:p-0 print:bg-white">
          <div
            ref={printAreaRef}
            className="w-full max-w-4xl bg-white text-black p-6 rounded-sm shadow-xl border border-slate-300 print:border-none print:shadow-none print:p-4 print:max-w-none print:w-full"
            style={{ aspectRatio: '1.414/1' }} // Standard A4 / Letter engineering aspect ratio
          >
            {/* Outer Border with Reference Grids (Zones 1, 2, 3, 4 & A, B, C, D) */}
            <div className="relative w-full h-full border-2 border-black p-4 flex flex-col justify-between">
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

              {/* Inner Schematic Drawing SVG */}
              <div className="flex-1 relative w-full h-full overflow-hidden my-2">
                <svg
                  className="w-full h-full"
                  viewBox={`${minX} ${minY} ${viewBoxWidth} ${viewBoxHeight}`}
                  preserveAspectRatio="xMidYMid meet"
                >
                  {/* Subtle Grid Points */}
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

                  {/* Wires (Crisp Black in print) */}
                  {doc.wires.map((wire) => {
                    const pathStr = pointsToSvgPath(wire.points);
                    return (
                      <g key={wire.id}>
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

                  {/* Solder Junctions */}
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
                  {doc.components.map((comp) => (
                    <ComponentGlyph
                      key={comp.id}
                      component={comp}
                      isSelected={false}
                      hoveredPinId={null}
                      isSimulating={false}
                    />
                  ))}
                </svg>
              </div>

              {/* Bottom Engineering Title Block */}
              <div className="border-t-2 border-black pt-2 flex items-end justify-between text-xs">
                {/* Left: Summary and Specs */}
                <div className="max-w-md text-[10px] text-slate-700 leading-snug">
                  <div className="font-bold text-black uppercase tracking-wider text-[11px] mb-0.5">
                    {doc.title}
                  </div>
                  <p>{doc.summary}</p>
                  {doc.formula && (
                    <div className="mt-1 font-mono font-semibold text-black">
                      Formula: {doc.formula}
                    </div>
                  )}
                </div>

                {/* Right: Formal ANSI Title Block Table */}
                <div className="border border-black text-[10px] font-mono divide-y divide-black w-72">
                  <div className="flex divide-x divide-black bg-slate-100">
                    <div className="px-2 py-0.5 flex-1 font-bold">PROJECT:</div>
                    <div className="px-2 py-0.5 flex-2 font-semibold truncate">{doc.title}</div>
                  </div>
                  <div className="flex divide-x divide-black">
                    <div className="px-2 py-0.5 flex-1">DATE:</div>
                    <div className="px-2 py-0.5 flex-2">{currentDate}</div>
                  </div>
                  <div className="flex divide-x divide-black">
                    <div className="px-2 py-0.5 flex-1">ENGINEER:</div>
                    <div className="px-2 py-0.5 flex-2">CircuitForge EDA Suite</div>
                  </div>
                  <div className="flex divide-x divide-black bg-slate-50">
                    <div className="px-2 py-0.5 flex-1">REV / SHEET:</div>
                    <div className="px-2 py-0.5 flex-2 font-bold">REV 1.0 • SHEET 1 OF 1</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
