import React, { useState, useEffect } from 'react';
import {
  Brain,
  Sparkles,
  Zap,
  CheckCircle2,
  Cpu,
  Layers,
  FileArchive,
  Printer,
  Save,
  Eye,
  RefreshCw,
  Lightbulb,
  ArrowRight,
  ShieldCheck,
  X,
  Plus,
} from 'lucide-react';
import { SchematicDocument } from '../../types';
import {
  getCircuitBrainMemory,
  thinkAutonomousCircuit,
  CircuitBrainMemory,
} from '../../utils/circuitBrainLearner';
import { generateGerberZip } from '../../utils/gerber';
import { exportCircuitToPdf } from '../../utils/pdfExport';

interface CircuitBrainModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCircuit: (circuit: SchematicDocument) => void;
  onSwitchViewMode: (mode: 'schematic' | 'pcb' | '3d') => void;
  onShowToast?: (msg: string) => void;
}

export const CircuitBrainModal: React.FC<CircuitBrainModalProps> = ({
  isOpen,
  onClose,
  onApplyCircuit,
  onSwitchViewMode,
  onShowToast,
}) => {
  const [brainMem, setBrainMem] = useState<CircuitBrainMemory>(getCircuitBrainMemory());
  const [isThinking, setIsThinking] = useState(false);
  const [thoughtGoal, setThoughtGoal] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('IoT & Home Automation');
  const [inventedCircuit, setInventedCircuit] = useState<SchematicDocument | null>(null);

  useEffect(() => {
    if (isOpen) {
      setBrainMem(getCircuitBrainMemory());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleThinkCircuit = async (categoryOverride?: string, customGoal?: string) => {
    setIsThinking(true);
    const cat = categoryOverride || activeCategory;
    const goal = customGoal !== undefined ? customGoal : thoughtGoal;

    try {
      const doc = await thinkAutonomousCircuit(cat, goal);
      setInventedCircuit(doc);
      setBrainMem(getCircuitBrainMemory());
      if (onShowToast) {
        onShowToast(`🧠 Circuit Brain invented "${doc.title}"!`);
      }
    } catch (e) {
      console.error('Brain thinking error:', e);
      if (onShowToast) onShowToast('Circuit Brain generated fallback topology.');
    } finally {
      setIsThinking(false);
    }
  };

  const handleApplyToSchematic = () => {
    if (!inventedCircuit) return;
    onApplyCircuit(inventedCircuit);
    onSwitchViewMode('schematic');
    onClose();
    if (onShowToast) {
      onShowToast(`⚡ Placed "${inventedCircuit.title}" on schematic editor!`);
    }
  };

  const handleViewInPcb = () => {
    if (!inventedCircuit) return;
    onApplyCircuit(inventedCircuit);
    onSwitchViewMode('pcb');
    onClose();
    if (onShowToast) {
      onShowToast(`📐 Opened 2D PCB layout for "${inventedCircuit.title}"!`);
    }
  };

  const handleViewIn3D = () => {
    if (!inventedCircuit) return;
    onApplyCircuit(inventedCircuit);
    onSwitchViewMode('3d');
    onClose();
    if (onShowToast) {
      onShowToast(`📦 Opened 3D Photorealistic View for "${inventedCircuit.title}"!`);
    }
  };

  const handleExportGerber = async () => {
    if (!inventedCircuit) return;
    try {
      const zipBlob = await generateGerberZip(
        inventedCircuit.components || [],
        inventedCircuit.wires || [],
        { projectName: inventedCircuit.title || 'Brain_Invention' }
      );
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(inventedCircuit.title || 'Circuit').toLowerCase().replace(/[^a-z0-9]/g, '_')}_gerber.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (onShowToast) onShowToast('📦 Downloaded RS-274X Gerber manufacturing package!');
    } catch (err) {
      console.error('Gerber export error:', err);
      if (onShowToast) onShowToast('Failed to package Gerber ZIP.');
    }
  };

  const handleExportPdf = () => {
    if (!inventedCircuit) return;
    exportCircuitToPdf(inventedCircuit);
    if (onShowToast) onShowToast('📄 Generated engineering schematic PDF sheet.');
  };

  const handleSaveJson = () => {
    if (!inventedCircuit) return;
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(inventedCircuit, null, 2));
      const a = document.createElement('a');
      a.href = dataStr;
      a.download = `${(inventedCircuit.title || 'circuit').toLowerCase().replace(/[^a-z0-9]/g, '_')}.cirkit`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (onShowToast) onShowToast(`💾 Saved circuit file: ${a.download}`);
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-750 w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-sky-500 flex items-center justify-center shadow-lg shadow-violet-950/50">
              <Brain className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Autonomous AI Circuit Brain
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-300 font-semibold uppercase tracking-wider">
                  Self-Learning &amp; Unlimited Innovator
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Continuously analyzes every diagram &amp; schematic, learns functional blocks, and autonomously invents new hardware circuits.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Live Learning Statistics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col">
              <span className="text-[10px] uppercase font-semibold text-slate-400 font-mono flex items-center gap-1">
                <Layers className="w-3 h-3 text-sky-400" />
                Circuits Ingested
              </span>
              <span className="text-xl font-black text-sky-400 font-mono mt-0.5">
                {brainMem.totalCircuitsLearned}
              </span>
              <span className="text-[10px] text-slate-500 mt-1">
                Ingested from uploads &amp; links
              </span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col">
              <span className="text-[10px] uppercase font-semibold text-slate-400 font-mono flex items-center gap-1">
                <Cpu className="w-3 h-3 text-emerald-400" />
                Mastered Modules
              </span>
              <span className="text-xl font-black text-emerald-400 font-mono mt-0.5">
                {brainMem.learnedBlocks.length}
              </span>
              <span className="text-[10px] text-slate-500 mt-1">
                MCU, Relays, Sensors, Power
              </span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col">
              <span className="text-[10px] uppercase font-semibold text-slate-400 font-mono flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                Verified Rules
              </span>
              <span className="text-xl font-black text-amber-400 font-mono mt-0.5">
                {brainMem.verifiedRulesCount}
              </span>
              <span className="text-[10px] text-slate-500 mt-1">
                IEEE / Flyback &amp; Pull-ups
              </span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col">
              <span className="text-[10px] uppercase font-semibold text-slate-400 font-mono flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-400" />
                Inventions Created
              </span>
              <span className="text-xl font-black text-purple-400 font-mono mt-0.5">
                {brainMem.autonomousInventionsCount}
              </span>
              <span className="text-[10px] text-slate-500 mt-1">
                Unlimited generative engine
              </span>
            </div>
          </div>

          {/* 2. Autonomous Thinking Engine Controller */}
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 border border-indigo-900/40 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  Think New Circuit (Autonomous Generative Brain)
                </h3>
                <p className="text-xs text-slate-400">
                  Select a category or enter any custom challenge; the brain synthesizes complementary hardware stages automatically.
                </p>
              </div>

              <button
                onClick={() => handleThinkCircuit()}
                disabled={isThinking}
                className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-violet-950 flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap"
              >
                {isThinking ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                    <span>Synthesizing Circuit...</span>
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 text-amber-300" />
                    <span>🧠 Think Novel Circuit</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Inspiration Categories */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400">Quick Innovation Domains:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'IoT & Home Automation', hint: 'ESP8266 NodeMCU 4-Channel Relay Home Automation with DHT11, IR Receiver, 2 Push Buttons, and 18650 Battery (Cirkit Designer)' },
                  { label: 'Smart Renewable Solar', hint: 'Autonomous Smart Solar Battery Backup & Relay Actuator with DHT11' },
                  { label: 'Audio & Acoustic Preamp', hint: 'Precision Dual-Stage Acoustic Preamp & Sound-Activated Relay Switch' },
                  { label: 'PWM DC Motor Control', hint: '555 Timer PWM Motor Speed Controller with Flyback Diode Snubber' },
                  { label: 'Industrial Safety Interlock', hint: 'Industrial Emergency Interlock with Dual Tactile Pushbuttons & Relay Latch' },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      setActiveCategory(item.label);
                      setThoughtGoal(item.hint);
                      handleThinkCircuit(item.label, item.hint);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      activeCategory === item.label
                        ? 'bg-violet-900/60 border-violet-500 text-violet-200'
                        : 'bg-slate-900 border-slate-750 text-slate-300 hover:border-slate-600 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Circuit Goal Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={thoughtGoal}
                onChange={(e) => setThoughtGoal(e.target.value)}
                placeholder="Or instruct the brain: e.g. 'Automated greenhouse mister with soil sensor, ESP8266, and 12V solenoid relay'"
                className="flex-1 bg-slate-950 border border-slate-750 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-violet-500 font-mono"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleThinkCircuit();
                }}
              />
              <button
                onClick={() => handleThinkCircuit()}
                disabled={isThinking}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Invent</span>
              </button>
            </div>
          </div>

          {/* 3. Thought Circuit Result Card (if invented) */}
          {inventedCircuit && (
            <div className="bg-slate-950 border-2 border-emerald-500/50 rounded-xl p-5 space-y-4 shadow-xl shadow-emerald-950/20 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                      ✨ Autonomously Synthesized
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {inventedCircuit.category}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white mt-1">
                    {inventedCircuit.title}
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {inventedCircuit.summary}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-slate-900 border border-slate-750 rounded-lg text-xs font-mono text-slate-300">
                    {inventedCircuit.components?.length || 0} Parts
                  </span>
                  <span className="px-2.5 py-1 bg-slate-900 border border-slate-750 rounded-lg text-xs font-mono text-slate-300">
                    {inventedCircuit.wires?.length || 0} Wires
                  </span>
                </div>
              </div>

              {/* Component breakdown chips */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                  Plotted Hardware Components:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(inventedCircuit.components || []).map((c) => (
                    <span
                      key={c.id}
                      className="px-2 py-1 bg-slate-900 border border-slate-800 rounded-md text-[11px] text-slate-200 font-mono flex items-center gap-1"
                    >
                      <strong className="text-sky-400">{c.designator}:</strong>
                      <span>{c.value}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons: 2D, 3D, Gerber, PDF, Save */}
              <div className="pt-2 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-6 gap-2">
                <button
                  onClick={handleApplyToSchematic}
                  className="col-span-2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-950"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>Plot to Schematic Editor</span>
                </button>

                <button
                  onClick={handleViewInPcb}
                  className="py-2 bg-slate-850 hover:bg-slate-800 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Open in 2D PCB Layout Editor"
                >
                  <Eye className="w-3.5 h-3.5 text-sky-400" />
                  <span>2D PCB</span>
                </button>

                <button
                  onClick={handleViewIn3D}
                  className="py-2 bg-slate-850 hover:bg-slate-800 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Open in 3D Real-Time Visualizer"
                >
                  <Cpu className="w-3.5 h-3.5 text-purple-400" />
                  <span>3D View</span>
                </button>

                <button
                  onClick={handleExportGerber}
                  className="py-2 bg-slate-850 hover:bg-slate-800 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Export RS-274X Gerber & Excellon Drill ZIP"
                >
                  <FileArchive className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Gerber ZIP</span>
                </button>

                <button
                  onClick={handleExportPdf}
                  className="py-2 bg-slate-850 hover:bg-slate-800 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Print / Save PDF Engineering Sheet"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span>PDF Sheet</span>
                </button>

                <button
                  onClick={handleSaveJson}
                  className="col-span-2 sm:col-span-1 py-2 bg-slate-850 hover:bg-slate-800 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Save Circuit File (.cirkit / .json)"
                >
                  <Save className="w-3.5 h-3.5 text-sky-400" />
                  <span>Save File</span>
                </button>
              </div>
            </div>
          )}

          {/* 4. Mastered Subcircuit Blocks Matrix */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              Subcircuit Blocks Mastered in Memory ({brainMem.learnedBlocks.length}):
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {brainMem.learnedBlocks.map((blk) => (
                <div
                  key={blk.id}
                  className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col justify-between hover:border-slate-700 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-100">{blk.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-850 border border-slate-750 text-slate-400 font-mono">
                        {blk.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {blk.description}
                    </p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-850/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>Key: {blk.keyParts.slice(0, 2).join(', ')}</span>
                    <span className="text-emerald-400">Ready</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Design Invariants & IEEE Rules */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              Learned Electrical Design Rules ({brainMem.designRules.length}):
            </h3>
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1 text-xs text-slate-400 font-mono">
              {brainMem.designRules.slice(0, 6).map((r, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Storage: Persistent Local &amp; Generative Context</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
