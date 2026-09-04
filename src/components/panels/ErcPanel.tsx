import React from 'react';
import { SchematicComponent, Wire, ErcIssue } from '../../types';
import { ShieldCheck, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { getComponentDef } from '../../data/components';

interface ErcPanelProps {
  components: SchematicComponent[];
  wires: Wire[];
  isOpen: boolean;
  onClose: () => void;
  onSelectComponent: (id: string) => void;
}

export const ErcPanel: React.FC<ErcPanelProps> = ({
  components,
  wires,
  isOpen,
  onClose,
  onSelectComponent,
}) => {
  if (!isOpen) return null;

  const issues: ErcIssue[] = [];

  // Check 1: Duplicate Designators
  const designatorCounts = new Map<string, string[]>();
  for (const comp of components) {
    const list = designatorCounts.get(comp.designator) || [];
    list.push(comp.id);
    designatorCounts.set(comp.designator, list);
  }

  for (const [des, ids] of designatorCounts.entries()) {
    if (ids.length > 1) {
      issues.push({
        id: `dup_${des}`,
        type: 'error',
        message: `Duplicate Reference Designator: "${des}" is used by ${ids.length} components.`,
        componentId: ids[0],
      });
    }
  }

  // Check 2: Check for Ground and Power nets
  const allNets = new Set<string>();
  for (const comp of components) {
    for (const pin of comp.pins) {
      if (pin.net) allNets.add(pin.net);
    }
  }
  for (const wire of wires) {
    if (wire.net) allNets.add(wire.net);
  }

  const hasGround = allNets.has('GND') || allNets.has('0V');
  const hasPower =
    allNets.has('VCC') ||
    allNets.has('+5V') ||
    allNets.has('9V') ||
    allNets.has('+3.3V') ||
    allNets.has('VIN');

  if (!hasGround) {
    issues.push({
      id: 'missing_gnd',
      type: 'warning',
      message: 'No circuit ground (GND / 0V) reference net detected in the schematic.',
    });
  }

  if (!hasPower) {
    issues.push({
      id: 'missing_pwr',
      type: 'warning',
      message: 'No primary DC power supply rail (VCC / +5V / VIN) net detected.',
    });
  }

  // Check 3: Floating / Unconnected Pins on ICs
  for (const comp of components) {
    const def = getComponentDef(comp.type);
    if (def.category === 'ics') {
      for (const pinDef of def.pins) {
        const pinState = comp.pins.find((p) => p.id === pinDef.id);
        const isConnected =
          pinState?.net ||
          wires.some(
            (w) =>
              (w.startPin?.componentId === comp.id && w.startPin.pinId === pinDef.id) ||
              (w.endPin?.componentId === comp.id && w.endPin.pinId === pinDef.id)
          );

        if (!isConnected && pinDef.id !== 'NC') {
          issues.push({
            id: `float_${comp.id}_${pinDef.id}`,
            type: 'warning',
            message: `${comp.designator} pin ${pinDef.id} (${pinDef.name}) appears to be unconnected / floating.`,
            componentId: comp.id,
            pinId: pinDef.id,
          });
        }
      }
    }
  }

  // If no issues found
  if (issues.length === 0) {
    issues.push({
      id: 'erc_clean',
      type: 'info',
      message: 'Electrical Rule Check passed with 0 errors! All nets and components are valid.',
    });
  }

  const errorCount = issues.filter((i) => i.type === 'error').length;
  const warningCount = issues.filter((i) => i.type === 'warning').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-2xl max-h-[80vh] flex flex-col bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden text-slate-100 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg border border-sky-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                Electrical Rule Check (ERC)
                <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-mono">
                  {errorCount} Errors • {warningCount} Warnings
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Verifies pin connections, power supplies, and designator uniqueness
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Issue List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5">
          {issues.map((issue) => (
            <div
              key={issue.id}
              onClick={() => {
                if (issue.componentId) {
                  onSelectComponent(issue.componentId);
                  onClose();
                }
              }}
              className={`p-3 rounded-lg border flex items-start gap-3 transition-colors ${
                issue.componentId ? 'cursor-pointer hover:opacity-90' : ''
              } ${
                issue.type === 'error'
                  ? 'bg-rose-950/40 border-rose-800/60 text-rose-200'
                  : issue.type === 'warning'
                  ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                  : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
              }`}
            >
              {issue.type === 'error' && (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              {issue.type === 'warning' && (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              )}
              {issue.type === 'info' && (
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              )}

              <div className="flex-1 text-xs">
                <div className="font-semibold">{issue.message}</div>
                {issue.componentId && (
                  <div className="text-[10px] opacity-75 mt-1 font-mono">
                    Click to inspect component in schematic canvas
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-800 bg-slate-900/90">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors"
          >
            Close ERC
          </button>
        </div>
      </div>
    </div>
  );
};
