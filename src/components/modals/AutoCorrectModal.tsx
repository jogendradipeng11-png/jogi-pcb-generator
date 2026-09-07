import React, { useState, useMemo } from 'react';
import {
  Wand2,
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle2,
  Sparkles,
  Zap,
  Grid,
  ShieldCheck,
  X,
  ArrowRight,
} from 'lucide-react';
import { SchematicDocument } from '../../types';
import {
  analyzeCircuitForCorrections,
  applyCircuitAutoCorrections,
  AutoCorrectionIssue,
} from '../../utils/circuitAutoCorrector';

interface AutoCorrectModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: SchematicDocument;
  onApplyCorrection: (correctedDoc: SchematicDocument, summaryMsg: string) => void;
}

export const AutoCorrectModal: React.FC<AutoCorrectModalProps> = ({
  isOpen,
  onClose,
  document,
  onApplyCorrection,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);
  const [lastFixSummary, setLastFixSummary] = useState<string[]>([]);

  // Analyze active schematic for issues
  const issues = useMemo(() => {
    return analyzeCircuitForCorrections(document);
  }, [document]);

  // Calculate circuit health score: 100 - (critical * 25 + warning * 12 + opt * 5)
  const healthScore = useMemo(() => {
    const criticalCount = issues.filter((i) => i.severity === 'critical').length;
    const warningCount = issues.filter((i) => i.severity === 'warning').length;
    const optCount = issues.filter((i) => i.severity === 'optimization').length;
    const penalty = criticalCount * 25 + warningCount * 12 + optCount * 5;
    return Math.max(10, 100 - penalty);
  }, [issues]);

  const filteredIssues = useMemo(() => {
    if (selectedCategory === 'all') return issues;
    return issues.filter((i) => i.category === selectedCategory);
  }, [issues, selectedCategory]);

  if (!isOpen) return null;

  const handleFixAll = () => {
    const result = applyCircuitAutoCorrections(document);
    onApplyCorrection(
      result.correctedDoc,
      `Auto-corrected ${result.appliedFixesCount} circuit issue(s) successfully!`
    );
    setLastFixSummary(result.fixedDescriptions);
  };

  const handleFixSingle = (issueId: string) => {
    const result = applyCircuitAutoCorrections(document, [issueId]);
    onApplyCorrection(
      result.correctedDoc,
      result.fixedDescriptions[0] || 'Auto-correction applied.'
    );
    setLastFixSummary(result.fixedDescriptions);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-xs">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">
                  Circuit Auto-Correction & Electrical Rule Engine
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-700 text-indigo-300 font-mono">
                  Autonomous EDA
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Detects component burnout hazards, missing clamp diodes, floating pins, and auto-aligns layout.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Health Score & Stats Banner */}
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {/* Circular / Pill Health Score */}
            <div className="flex items-center gap-2">
              <div
                className={`text-xl font-black font-mono px-3 py-1 rounded-lg border ${
                  healthScore >= 90
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                    : healthScore >= 60
                    ? 'bg-amber-950/60 text-amber-400 border-amber-500/40'
                    : 'bg-rose-950/60 text-rose-400 border-rose-500/40'
                }`}
              >
                {healthScore}%
              </div>
              <div className="text-xs">
                <div className="font-semibold text-slate-300">Circuit Health Score</div>
                <div className="text-[10px] text-slate-400">
                  {issues.length === 0
                    ? 'Pristine electrical state'
                    : `${issues.length} issue(s) detected`}
                </div>
              </div>
            </div>

            {/* Severity Counters */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/50 flex items-center gap-1">
                <AlertOctagon className="w-3 h-3" />
                {issues.filter((i) => i.severity === 'critical').length} Critical
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/50 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {issues.filter((i) => i.severity === 'warning').length} Warnings
              </span>
              <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800/50 flex items-center gap-1">
                <Info className="w-3 h-3" />
                {issues.filter((i) => i.severity === 'optimization').length} Optimizations
              </span>
            </div>
          </div>

          {/* Fix All Action */}
          {issues.length > 0 && (
            <button
              onClick={handleFixAll}
              className="py-2 px-4 rounded-lg bg-gradient-to-r from-indigo-600 via-sky-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Auto-Correct All ({issues.length}) Issues</span>
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {lastFixSummary.length > 0 && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-emerald-300">
                <CheckCircle2 className="w-4 h-4" />
                Applied Fixes:
              </div>
              <ul className="list-disc pl-5 space-y-0.5 font-mono text-[11px] text-emerald-300/90">
                {lastFixSummary.map((fix, idx) => (
                  <li key={idx}>{fix}</li>
                ))}
              </ul>
            </div>
          )}

          {issues.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-100">
                Circuit Perfectly Verified!
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No component burnout risks, missing series resistors, flyback diodes, or floating pins were found. Your schematic adheres to standard electrical engineering rules.
              </p>
            </div>
          ) : (
            filteredIssues.map((issue) => {
              const isCritical = issue.severity === 'critical';
              const isWarning = issue.severity === 'warning';

              return (
                <div
                  key={issue.id}
                  className={`p-3.5 rounded-lg border transition-all ${
                    isCritical
                      ? 'bg-rose-950/20 border-rose-800/60 hover:border-rose-600'
                      : isWarning
                      ? 'bg-amber-950/20 border-amber-800/60 hover:border-amber-600'
                      : 'bg-slate-800/40 border-slate-700/60 hover:border-sky-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                          isCritical
                            ? 'bg-rose-900/40 text-rose-400 border border-rose-700/60'
                            : isWarning
                            ? 'bg-amber-900/40 text-amber-400 border border-amber-700/60'
                            : 'bg-sky-900/40 text-sky-400 border border-sky-700/60'
                        }`}
                      >
                        {isCritical ? (
                          <AlertOctagon className="w-4 h-4" />
                        ) : isWarning ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : (
                          <Info className="w-4 h-4" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-200">
                            {issue.title}
                          </span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded uppercase ${
                              isCritical
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : isWarning
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-sky-950 text-sky-300 border border-sky-800'
                            }`}
                          >
                            {issue.severity}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {issue.category}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          {issue.description}
                        </p>

                        <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded border border-slate-800/80 font-mono space-y-1">
                          <div className="text-sky-300 font-semibold flex items-center gap-1">
                            <ArrowRight className="w-3 h-3 text-sky-400" />
                            Action: {issue.fixActionName}
                          </div>
                          <div className="text-slate-400 text-[10px]">
                            {issue.rationale}
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleFixSingle(issue.id)}
                      className="py-1.5 px-3 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>Auto-Fix</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono text-[11px]">
            Active Schematic: {document.title || 'Untitled Circuit'} ({document.components?.length || 0} parts)
          </span>
          <button
            onClick={onClose}
            className="py-1.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
