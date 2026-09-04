import React, { useState } from 'react';
import {
  SchematicComponent,
  Wire,
  SchematicDocument,
  ComponentSimResult,
  ComponentTestSettings,
} from '../../types';
import { getComponentDef } from '../../data/components';
import { ProductSelectorModal } from './ProductSelectorModal';
import {
  Sliders,
  RotateCw,
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
} from 'lucide-react';
import { formatVoltage, formatCurrent, formatPower, parseUnitValue } from '../../utils/simulation';

interface PropertiesPanelProps {
  selectedComponents: SchematicComponent[];
  selectedWires: Wire[];
  document: SchematicDocument;
  onUpdateComponent: (updated: SchematicComponent) => void;
  onDeleteSelected: () => void;
  onUpdateDocumentMeta: (meta: Partial<SchematicDocument>) => void;
  simulationResult?: ComponentSimResult;
  isSimulating?: boolean;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedComponents,
  selectedWires,
  document,
  onUpdateComponent,
  onDeleteSelected,
  onUpdateDocumentMeta,
  simulationResult,
  isSimulating = false,
}) => {
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
              <button
                onClick={handleRotate}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 flex items-center gap-1 font-mono text-[11px]"
              >
                <RotateCw className="w-3 h-3" />
                {selectedComp.rotation}°
              </button>
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
          <div className="space-y-3">
            <div className="font-semibold text-slate-100 flex items-center gap-1.5 pb-2 border-b border-slate-800">
              <Zap className="w-4 h-4 text-emerald-400" />
              Wire Segment
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
                value={document.title}
                onChange={(e) => onUpdateDocumentMeta({ title: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100 font-semibold text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            {document.summary && (
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Circuit Summary
                </label>
                <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
                  {document.summary}
                </p>
              </div>
            )}

            {document.formula && (
              <div>
                <label className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block mb-1">
                  Design Formula
                </label>
                <div className="text-[11px] text-amber-200 font-mono bg-amber-950/30 p-2.5 rounded border border-amber-800/40">
                  {document.formula}
                </div>
              </div>
            )}

            {document.specifications && document.specifications.length > 0 && (
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Key Specifications
                </label>
                <ul className="space-y-1 text-[11px] text-slate-300 bg-slate-950/60 p-2.5 rounded border border-slate-800/80 list-disc list-inside">
                  {document.specifications.map((spec, i) => (
                    <li key={i}>{spec}</li>
                  ))}
                </ul>
              </div>
            )}

            {document.tips && document.tips.length > 0 && (
              <div>
                <label className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider block mb-1">
                  Prototyping Tips
                </label>
                <ul className="space-y-1 text-[11px] text-slate-300 bg-slate-950/60 p-2.5 rounded border border-slate-800/80 list-disc list-inside">
                  {document.tips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 font-mono space-y-1">
              <div>Total Components: {document.components.length}</div>
              <div>Total Wires: {document.wires.length}</div>
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
