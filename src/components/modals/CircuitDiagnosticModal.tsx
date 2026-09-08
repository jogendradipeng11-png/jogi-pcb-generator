import React from 'react';
import {
  SchematicComponent,
  Wire,
  CircuitDiagnosticFault,
  OperatingConditions,
} from '../../types';
import { runCircuitDiagnosticTest } from '../../utils/simulation';
import {
  AlertTriangle,
  Flame,
  CheckCircle2,
  Zap,
  X,
  ShieldAlert,
  ArrowRight,
  Eye,
  Wand2,
  Activity,
  AlertOctagon,
} from 'lucide-react';

interface CircuitDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  components: SchematicComponent[];
  wires: Wire[];
  operatingConditions?: OperatingConditions;
  onSelectComponent?: (id: string) => void;
  onAutoFixComponent?: (fault: CircuitDiagnosticFault) => void;
}

export const CircuitDiagnosticModal: React.FC<CircuitDiagnosticModalProps> = ({
  isOpen,
  onClose,
  components,
  wires,
  operatingConditions,
  onSelectComponent,
  onAutoFixComponent,
}) => {
  if (!isOpen) return null;

  const testReport = runCircuitDiagnosticTest(components, wires, operatingConditions);
  const { isHealthy, faults, summary } = testReport;

  const criticalCount = faults.filter((f) => f.severity === 'critical').length;
  const warningCount = faults.filter((f) => f.severity === 'warning').length;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isHealthy
            ? 'bg-emerald-950/40 border-emerald-800/60'
            : 'bg-rose-950/50 border-rose-800/60'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${
              isHealthy
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
            }`}>
              {isHealthy ? <CheckCircle2 className="w-6 h-6" /> : <Flame className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Circuit Health &amp; Fault Diagnostics</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold ${
                  isHealthy
                    ? 'bg-emerald-900/80 text-emerald-200 border border-emerald-700'
                    : 'bg-rose-900/80 text-rose-200 border border-rose-700'
                }`}>
                  {isHealthy ? 'PASSED (0 FAULTS)' : `${faults.length} ISSUES DETECTED`}
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Automated electrical rule checks, overcurrent, LED burnout, reverse bias, and short circuit analysis.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Summary Banner */}
          <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
            isHealthy
              ? 'bg-emerald-950/30 border-emerald-700/50 text-emerald-200'
              : 'bg-rose-950/40 border-rose-700/50 text-rose-200'
          }`}>
            <Activity className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed flex-1">
              <p className="font-semibold text-sm mb-1 text-white">{summary}</p>
              <div className="flex items-center gap-4 text-[11px] text-slate-300 font-mono mt-2">
                <span>Components Tested: <strong>{components.length}</strong></span>
                <span>Wire Nets: <strong>{wires.length}</strong></span>
                {criticalCount > 0 && (
                  <span className="text-rose-400 font-bold">💥 Critical Burnouts: {criticalCount}</span>
                )}
                {warningCount > 0 && (
                  <span className="text-amber-400 font-bold">⚠️ Overloads: {warningCount}</span>
                )}
              </div>
            </div>
          </div>

          {/* Faults List */}
          {faults.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                Detected Electrical Faults &amp; Remedies ({faults.length})
              </h3>

              {faults.map((fault, idx) => {
                const isCritical = fault.severity === 'critical';
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition-all ${
                      isCritical
                        ? 'bg-slate-900/90 border-rose-600/70 shadow-lg shadow-rose-950/20'
                        : 'bg-slate-900/90 border-amber-600/70 shadow-lg shadow-amber-950/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                          isCritical ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {isCritical ? <AlertOctagon className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">
                              {fault.title}
                            </span>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                              isCritical ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}>
                              {fault.severity}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                            {fault.description}
                          </p>
                        </div>
                      </div>

                      {/* Action to Focus on Canvas */}
                      {onSelectComponent && fault.componentId !== 'circuit_short' && (
                        <button
                          onClick={() => {
                            onSelectComponent(fault.componentId);
                            onClose();
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-sky-200 text-xs font-semibold flex items-center gap-1.5 shrink-0 border border-slate-700 transition-colors cursor-pointer"
                          title="Highlight and focus this component on the schematic canvas"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Locate</span>
                        </button>
                      )}
                    </div>

                    {/* Electrical Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800 text-xs">
                      <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                        <span className="text-slate-400 text-[10px] uppercase font-mono block">Measured Condition</span>
                        <strong className="text-rose-400 font-mono text-xs">{fault.measured}</strong>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                        <span className="text-slate-400 text-[10px] uppercase font-mono block">Safe Maximum Threshold</span>
                        <strong className="text-slate-200 font-mono text-xs">{fault.limit}</strong>
                      </div>
                    </div>

                    {/* Prescribed Remedy */}
                    <div className="mt-3 p-3 rounded-lg bg-sky-950/30 border border-sky-800/40 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-sky-300 mb-1">
                        <Wand2 className="w-3.5 h-3.5 text-sky-400" />
                        <span>Recommended Solution:</span>
                      </div>
                      <p className="text-slate-200 leading-relaxed text-[11.5px]">
                        {fault.remedy}
                      </p>

                      {onAutoFixComponent && (
                        <div className="mt-2.5 flex items-center justify-end">
                          <button
                            onClick={() => onAutoFixComponent(fault)}
                            className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                          >
                            <span>Apply Fix</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400">
              <ShieldAlert className="w-12 h-12 text-emerald-400/60 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-200">Zero Faults Detected in Circuit</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                All components are operating within safe voltage, current, and thermal limits. LEDs have proper current limiting and all polarities are correct.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Interactive Diagnostic Engine Ready</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
