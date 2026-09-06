import React, { useState } from 'react';
import {
  SchematicComponent,
  Wire,
  SchematicDocument,
  ComponentSimResult,
  ComponentTestSettings,
  CircuitRotationDirection,
} from '../../types';
import { getComponentDef } from '../../data/components';
import { ProductSelectorModal } from './ProductSelectorModal';
import { getAllDataSheetSearchUrl } from '../../data/allDataSheetCatalog';
import { RealProductImage } from '../../utils/componentImages';
import {
  Sliders,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Trash2,
  Tag,
  Hash,
  Box,
  MapPin,
  Cpu,
  Zap,
  BookOpen,
  Activity,
  Flame,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  Gauge,
  ShoppingBag,
  FileText,
  ExternalLink,
  Search,
  Globe,
} from 'lucide-react';
import { formatVoltage, formatCurrent, formatPower, parseUnitValue } from '../../utils/simulation';

interface PropertiesPanelProps {
  selectedComponents?: SchematicComponent[];
  selectedWires?: Wire[];
  document?: SchematicDocument;
  onUpdateComponent: (updated: SchematicComponent) => void;
  onDeleteSelected: () => void;
  onUpdateDocumentMeta: (meta: Partial<SchematicDocument>) => void;
  simulationResult?: ComponentSimResult;
  isSimulating?: boolean;
  onOpenAllDataSheetModal?: (initialQuery?: string) => void;
  onRotateCircuit?: (direction: CircuitRotationDirection) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedComponents = [],
  selectedWires = [],
  document,
  onUpdateComponent,
  onDeleteSelected,
  onUpdateDocumentMeta,
  simulationResult,
  isSimulating = false,
  onOpenAllDataSheetModal,
  onRotateCircuit,
}) => {
  const safeDoc = document || {
    title: 'Circuit Schematic',
    summary: '',
    components: [],
    wires: [],
  };
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
  const selectedComp = selectedComponents.length === 1 ? selectedComponents[0] : null;
  const selectedWire = selectedWires.length === 1 ? selectedWires[0] : null;

  // Handle rotating selected component
  const handleRotate = () => {
    if (!selectedComp) return;
    const nextRot = ((selectedComp.rotation + 90) % 360) as 0 | 90 | 180 | 270;
    onUpdateComponent({ ...selectedComp, rotation: nextRot });
  };

  // Helper to update component testSettings
  const updateTestSetting = (settings: Partial<ComponentTestSettings>) => {
    if (!selectedComp) return;
    const existing = selectedComp.testSettings || {};
    onUpdateComponent({
      ...selectedComp,
      testSettings: { ...existing, ...settings },
    });
  };

  return (
    <div className="w-72 h-full flex flex-col bg-slate-900 border-l border-slate-800 select-none text-slate-200 text-xs">
      {/* Panel Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <span className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-sky-400" />
          Inspector
        </span>
        {(selectedComponents.length > 0 || selectedWires.length > 0) && (
          <button
            onClick={onDeleteSelected}
            className="p-1 hover:bg-red-950 text-red-400 hover:text-red-300 rounded transition-colors"
            title="Delete Selected (Del)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* COMPONENT INSPECTOR */}
        {selectedComp && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-sky-400" />
                {selectedComp.designator}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onDeleteSelected}
                  className="px-2 py-1 bg-red-950/60 hover:bg-red-900 border border-red-800/80 text-red-300 rounded flex items-center gap-1 font-mono text-[11px]"
                  title="Delete Component (Del)"
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                  Delete
                </button>
              </div>
            </div>

            {/* Real Physical Product Photo & Hardware Information */}
            <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 shadow-md space-y-2">
              <div className="flex items-center gap-3">
                <RealProductImage
                  partNumberOrType={selectedComp.partNumber || selectedComp.value || selectedComp.type}
                  category={selectedComp.realPart?.category}
                  footprint={selectedComp.footprint}
                  customUrl={selectedComp.imageUrl}
                  className="w-16 h-16 rounded-xl border border-slate-700 shadow-md shrink-0"
                  badge={selectedComp.footprint.split(' ')[0]}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-sky-400 font-mono font-bold uppercase tracking-wider">
                    {selectedComp.realPart?.manufacturer || selectedComp.manufacturer || 'Hardware Product'}
                  </div>
                  <div className="text-sm font-black text-white truncate">
                    {selectedComp.partNumber || selectedComp.value}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                    Package: <span className="text-slate-200">{selectedComp.footprint}</span>
                  </div>
                  {selectedComp.realPart?.pinCount && (
                    <div className="text-[10px] text-emerald-400 font-mono">
                      {selectedComp.realPart.pinCount} Pins • Verified Datasheet
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Component Orientation & Directional Alignment */}
            <div className="space-y-1.5 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-semibold text-slate-300">Orientation & Rotation</span>
                <span className="font-mono text-sky-400 font-bold">{selectedComp.rotation}°</span>
              </div>
              <div className="grid grid-cols-4 gap-1 font-mono text-[10px]">
                {([0, 90, 180, 270] as const).map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => onUpdateComponent({ ...selectedComp, rotation: deg })}
                    className={`py-1 rounded border transition-colors ${
                      selectedComp.rotation === deg
                        ? 'bg-sky-600 text-white border-sky-500 font-bold'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
              <div className="flex gap-1 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    const next = ((selectedComp.rotation + 270) % 360) as 0 | 90 | 180 | 270;
                    onUpdateComponent({ ...selectedComp, rotation: next });
                  }}
                  className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 flex items-center justify-center gap-1 text-[10px]"
                  title="Rotate -90° Counter-Clockwise"
                >
                  <RotateCcw className="w-3 h-3 text-sky-400" />
                  <span>-90° CCW</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = ((selectedComp.rotation + 90) % 360) as 0 | 90 | 180 | 270;
                    onUpdateComponent({ ...selectedComp, rotation: next });
                  }}
                  className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 flex items-center justify-center gap-1 text-[10px]"
                  title="Rotate +90° Clockwise (R)"
                >
                  <RotateCw className="w-3 h-3 text-sky-400" />
                  <span>+90° CW</span>
                </button>
              </div>
            </div>

            {/* AllDataSheet.com Component Verification & Datasheet Section */}
            <div className="p-2.5 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 rounded-lg border border-indigo-900/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-300">
                  <Globe className="w-3.5 h-3.5 text-indigo-400" />
                  <span>AllDataSheet.com</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-900/60 text-indigo-200 border border-indigo-700/50 font-mono">
                  Datasheet
                </span>
              </div>

              <p className="text-[10px] text-slate-400 leading-tight">
                Inspect official manufacturer specifications, pinouts, and PDF datasheets from AllDataSheet.
              </p>

              <div className="flex flex-col gap-1.5 pt-0.5">
                {onOpenAllDataSheetModal && (
                  <button
                    type="button"
                    onClick={() => onOpenAllDataSheetModal(selectedComp.value || selectedComp.designator)}
                    className="w-full py-1.5 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Search Datasheet for "{selectedComp.value || selectedComp.designator}"</span>
                  </button>
                )}
                <a
                  href={getAllDataSheetSearchUrl(selectedComp.value || selectedComp.designator)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] flex items-center justify-center gap-1 border border-slate-700 transition-colors"
                  title="Open live search on https://www.alldatasheet.com/"
                >
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                  <span>View on AllDataSheet.com (Web)</span>
                </a>
              </div>
            </div>

            {/* Designator & Value Fields */}
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mb-1">
                  <Tag className="w-3 h-3 text-slate-500" />
                  Reference Designator
                </label>
                <input
                  type="text"
                  value={selectedComp.designator}
                  onChange={(e) =>
                    onUpdateComponent({ ...selectedComp, designator: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200 font-mono text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mb-1">
                  <Hash className="w-3 h-3 text-slate-500" />
                  Value / Model
                </label>
                <input
                  type="text"
                  value={selectedComp.value}
                  onChange={(e) =>
                    onUpdateComponent({ ...selectedComp, value: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200 font-mono text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                    <Box className="w-3 h-3 text-slate-500" />
                    PCB Footprint
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsProductSelectorOpen(true)}
                    className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-sans bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-800/80 cursor-pointer"
                    title="Select verified manufacturer part from DigiKey, Mouser, LCSC catalog"
                  >
                    <ShoppingBag className="w-3 h-3 text-sky-400" />
                    <span>Real Part Catalog</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={selectedComp.footprint}
                  onChange={(e) =>
                    onUpdateComponent({ ...selectedComp, footprint: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200 font-mono text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 font-mono">X POS</label>
                  <input
                    type="number"
                    value={Math.round(selectedComp.x)}
                    onChange={(e) =>
                      onUpdateComponent({ ...selectedComp, x: Number(e.target.value) })
                    }
                    className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-200 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-mono">Y POS</label>
                  <input
                    type="number"
                    value={Math.round(selectedComp.y)}
                    onChange={(e) =>
                      onUpdateComponent({ ...selectedComp, y: Number(e.target.value) })
                    }
                    className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-200 font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Pins and Nets Table */}
            <div className="pt-2 border-t border-slate-800 space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Pin &amp; Net Connections
              </span>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {selectedComp.pins.map((pin) => (
                  <div
                    key={pin.id}
                    className="flex items-center justify-between p-1.5 bg-slate-950/60 rounded border border-slate-800 text-[11px] font-mono"
                  >
                    <span className="text-slate-300">
                      Pin {pin.id} ({pin.name})
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        pin.net === 'VCC' || pin.net === '+5V'
                          ? 'bg-rose-950 text-rose-300'
                          : pin.net === 'GND'
                          ? 'bg-sky-950 text-sky-300'
                          : pin.net
                          ? 'bg-emerald-950 text-emerald-300'
                          : 'bg-slate-900 text-slate-500'
                      }`}
                    >
                      {pin.net || 'NC'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* LIVE SIMULATION TELEMETRY (When sim is running or results exist) */}
            {simulationResult && (
              <div className="p-2.5 bg-slate-950/90 rounded-lg border border-emerald-900/60 space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 animate-pulse" />
                    Live Test Telemetry
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 bg-emerald-950 text-emerald-300 rounded font-mono">
                    {simulationResult.state || 'ACTIVE'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">CURRENT (I)</span>
                    <span className="font-bold text-emerald-300">
                      {formatCurrent(simulationResult.current)}
                    </span>
                  </div>
                  <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">VOLT DROP (V)</span>
                    <span className="font-bold text-sky-300">
                      {formatVoltage(simulationResult.voltageDrop)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono px-1">
                  <span className="text-slate-400">Power Dissipation:</span>
                  <span
                    className={`font-bold ${
                      simulationResult.isOverloaded ? 'text-red-400' : 'text-slate-200'
                    }`}
                  >
                    {formatPower(simulationResult.power)}
                  </span>
                </div>

                {simulationResult.frequency && (
                  <div className="flex items-center justify-between text-[11px] font-mono px-1">
                    <span className="text-slate-400">Oscillation Freq:</span>
                    <span className="font-bold text-amber-300">
                      {simulationResult.frequency.toFixed(2)} Hz
                    </span>
                  </div>
                )}

                {simulationResult.isOverloaded && (
                  <div className="p-1.5 bg-red-950/80 border border-red-800 rounded flex items-center gap-1 text-[10px] text-red-300">
                    <Flame className="w-3.5 h-3.5 shrink-0" />
                    <span>Warning: Dissipated power exceeds component limit!</span>
                  </div>
                )}
              </div>
            )}

            {/* COMPONENT TEST SETTINGS & DESIRED TEST PARAMETERS */}
            <div className="pt-2 border-t border-slate-800 space-y-2.5">
              <span className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5" />
                Test Parameter Settings
              </span>

              {/* Power Source Settings (VCC / Battery) */}
              {(selectedComp.type === 'vcc' || selectedComp.type === 'battery') && (
                <div className="space-y-2 p-2.5 bg-slate-950/70 rounded-lg border border-slate-800">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400 font-medium">Supply Voltage:</span>
                    <span className="font-mono font-bold text-rose-400">
                      {selectedComp.testSettings?.voltage ?? parseUnitValue(selectedComp.value, 5.0)}V
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1.2"
                    max="24"
                    step="0.1"
                    value={selectedComp.testSettings?.voltage ?? parseUnitValue(selectedComp.value, 5.0)}
                    onChange={(e) => updateTestSetting({ voltage: parseFloat(e.target.value) })}
                    className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                  />
                  <div className="flex gap-1 pt-1">
                    {[3.3, 5.0, 9.0, 12.0].map((v) => (
                      <button
                        key={v}
                        onClick={() => updateTestSetting({ voltage: v })}
                        className="flex-1 py-1 text-[10px] font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      >
                        {v}V
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Resistor Test Settings */}
              {selectedComp.type === 'resistor' && (
                <div className="space-y-2 p-2.5 bg-slate-950/70 rounded-lg border border-slate-800">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400 font-medium">Test Resistance:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {selectedComp.testSettings?.resistance ?? parseUnitValue(selectedComp.value, 1000)} Ω
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { label: '100Ω', val: 100 },
                      { label: '330Ω', val: 330 },
                      { label: '1kΩ', val: 1000 },
                      { label: '4.7kΩ', val: 4700 },
                      { label: '10kΩ', val: 10000 },
                      { label: '100kΩ', val: 100000 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => updateTestSetting({ resistance: preset.val })}
                        className="py-1 text-[10px] font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="pt-1">
                    <label className="text-[10px] text-slate-500 block mb-1">
                      Max Rated Power:
                    </label>
                    <div className="flex gap-1">
                      {[0.125, 0.25, 0.5, 1.0].map((w) => (
                        <button
                          key={w}
                          onClick={() => updateTestSetting({ maxPowerRating: w })}
                          className={`flex-1 py-1 text-[10px] font-mono rounded transition-colors ${
                            (selectedComp.testSettings?.maxPowerRating ?? 0.25) === w
                              ? 'bg-sky-600 text-white font-bold'
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                        >
                          {w}W
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Potentiometer Wiper Setting */}
              {(selectedComp.type === 'pot' || selectedComp.type === 'potentiometer') && (
                <div className="space-y-2 p-2.5 bg-slate-950/70 rounded-lg border border-slate-800">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400 font-medium">Wiper Position:</span>
                    <span className="font-mono font-bold text-amber-400">
                      {Math.round((selectedComp.testSettings?.wiper ?? 0.5) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={selectedComp.testSettings?.wiper ?? 0.5}
                    onChange={(e) => updateTestSetting({ wiper: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                  />
                </div>
              )}

              {/* Switch / Pushbutton Setting */}
              {(selectedComp.type === 'switch' || selectedComp.type === 'pushbutton') && (
                <div className="p-2.5 bg-slate-950/70 rounded-lg border border-slate-800 space-y-2">
                  <div className="text-[11px] text-slate-400 font-medium">Switch Contact State:</div>
                  <button
                    onClick={() =>
                      updateTestSetting({
                        isClosed: !(selectedComp.testSettings?.isClosed ?? true),
                      })
                    }
                    className={`w-full py-2 px-3 rounded flex items-center justify-center gap-2 font-mono font-bold text-xs transition-colors ${
                      (selectedComp.testSettings?.isClosed ?? true)
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-amber-300'
                    }`}
                  >
                    {(selectedComp.testSettings?.isClosed ?? true) ? (
                      <>
                        <ToggleRight className="w-4 h-4" />
                        CLOSED / CONDUCTING (ON)
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4" />
                        OPEN / DISCONNECTED (OFF)
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Capacitor Test Settings */}
              {(selectedComp.type === 'capacitor' ||
                selectedComp.type === 'polarized_capacitor') && (
                <div className="space-y-2 p-2.5 bg-slate-950/70 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-medium">Test Capacitance:</div>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { label: '100nF', val: 100e-9 },
                      { label: '1µF', val: 1e-6 },
                      { label: '10µF', val: 10e-6 },
                      { label: '47µF', val: 47e-6 },
                      { label: '100µF', val: 100e-6 },
                      { label: '470µF', val: 470e-6 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => updateTestSetting({ capacitance: preset.val })}
                        className="py-1 text-[10px] font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* LED / Diode Test Settings */}
              {(selectedComp.type === 'led' || selectedComp.type === 'diode') && (
                <div className="space-y-2 p-2.5 bg-slate-950/70 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-medium">Forward Drop (Vf):</div>
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      { label: 'Red (1.8V)', val: 1.8 },
                      { label: 'Green (2.2V)', val: 2.2 },
                      { label: 'Blue (3.2V)', val: 3.2 },
                      { label: 'Diode (0.7V)', val: 0.7 },
                    ].map((d) => (
                      <button
                        key={d.label}
                        onClick={() => updateTestSetting({ forwardVoltage: d.val })}
                        className="py-1 text-[10px] font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* WIRE INSPECTOR */}
        {selectedWire && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-400" />
                Wire Segment
              </div>
              <button
                onClick={onDeleteSelected}
                className="px-2 py-1 bg-red-950/60 hover:bg-red-900 border border-red-800/80 text-red-300 rounded flex items-center gap-1 font-mono text-[11px]"
                title="Delete Wire (Del)"
              >
                <Trash2 className="w-3 h-3 text-red-400" />
                Delete
              </button>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 font-medium mb-1 block">
                Net Name
              </label>
              <div className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded font-mono text-emerald-400 font-semibold">
                {selectedWire.net}
              </div>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Points: {selectedWire.points.length} vertices
            </div>
            <button
              onClick={onDeleteSelected}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-red-950/40 hover:bg-red-900/60 border border-red-800/80 text-red-300 font-semibold rounded-lg text-xs transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              Delete Wire (Del)
            </button>
          </div>
        )}

        {/* DOCUMENT / CIRCUIT OVERVIEW (when nothing or multiple selected) */}
        {!selectedComp && !selectedWire && (
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Schematic Title
              </label>
              <input
                type="text"
                value={safeDoc.title || ''}
                onChange={(e) => onUpdateDocumentMeta({ title: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100 font-semibold text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            {safeDoc.summary && (
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Circuit Summary
                </label>
                <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
                  {safeDoc.summary}
                </p>
              </div>
            )}

            {safeDoc.formula && (
              <div>
                <label className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block mb-1">
                  Design Formula
                </label>
                <div className="text-[11px] text-amber-200 font-mono bg-amber-950/30 p-2.5 rounded border border-amber-800/40">
                  {safeDoc.formula}
                </div>
              </div>
            )}

            {safeDoc.specifications && safeDoc.specifications.length > 0 && (
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Key Specifications
                </label>
                <ul className="space-y-1 text-[11px] text-slate-300 bg-slate-950/60 p-2.5 rounded border border-slate-800/80 list-disc list-inside">
                  {safeDoc.specifications.map((spec, i) => (
                    <li key={i}>{spec}</li>
                  ))}
                </ul>
              </div>
            )}

            {safeDoc.tips && safeDoc.tips.length > 0 && (
              <div>
                <label className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider block mb-1">
                  Prototyping Tips
                </label>
                <ul className="space-y-1 text-[11px] text-slate-300 bg-slate-950/60 p-2.5 rounded border border-slate-800/80 list-disc list-inside">
                  {safeDoc.tips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Circuit-wide Rotation & Directional Verification */}
            {onRotateCircuit && (
              <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider">
                    Circuit Rotation & Check
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">All Components</span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => onRotateCircuit('cw90')}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 flex flex-col items-center gap-0.5"
                    title="Rotate entire schematic +90° Clockwise"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-sky-400" />
                    <span>+90° CW</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRotateCircuit('ccw90')}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 flex flex-col items-center gap-0.5"
                    title="Rotate entire schematic -90° Counter-Clockwise"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                    <span>-90° CCW</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRotateCircuit('180')}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 flex flex-col items-center gap-0.5"
                    title="Rotate entire schematic 180° Invert"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                    <span>180° Invert</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRotateCircuit('flipH')}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 flex flex-col items-center gap-0.5 col-span-1"
                    title="Mirror / Flip Horizontally"
                  >
                    <FlipHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Flip H</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRotateCircuit('flipV')}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 flex flex-col items-center gap-0.5 col-span-2"
                    title="Mirror / Flip Vertically"
                  >
                    <FlipVertical className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Flip V (Invert Altitude)</span>
                  </button>
                </div>
              </div>
            )}

            {/* AllDataSheet Catalog Search Hub */}
            {onOpenAllDataSheetModal && (
              <div className="p-3 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 rounded-lg border border-indigo-900/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-300">
                    <Globe className="w-3.5 h-3.5 text-indigo-400" />
                    <span>AllDataSheet.com</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-900/60 text-indigo-200 border border-indigo-700/50 font-mono">
                    Catalog
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Search ICs, diodes, transistors, microcontrollers, and pinouts from AllDataSheet and place them into your circuit.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenAllDataSheetModal()}
                  className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Open AllDataSheet Catalog</span>
                </button>
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 font-mono space-y-1">
              <div>Total Components: {(safeDoc.components || []).length}</div>
              <div>Total Wires: {(safeDoc.wires || []).length}</div>
            </div>
          </div>
        )}
      </div>

      {/* Real Hardware Product Selector Modal */}
      {selectedComp && (
        <ProductSelectorModal
          isOpen={isProductSelectorOpen}
          onClose={() => setIsProductSelectorOpen(false)}
          component={selectedComp}
          onSelectProduct={(part) => {
            onUpdateComponent({
              ...selectedComp,
              value: part.manufacturerPartNumber,
              footprint: part.packageFootprint,
            });
            setIsProductSelectorOpen(false);
          }}
        />
      )}
    </div>
  );
};
