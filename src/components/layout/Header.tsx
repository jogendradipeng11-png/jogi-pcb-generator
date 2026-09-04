import React, { useState } from 'react';
import {
  Sparkles,
  Cpu,
  Layers,
  FileSpreadsheet,
  ShieldCheck,
  Network,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize,
  MousePointer,
  Zap,
  Hand,
  Download,
  FolderOpen,
  Plus,
  Trash2,
  Undo2,
  Redo2,
  ChevronDown,
  Play,
  Pause,
  RotateCcw,
  Activity,
  Sliders,
  Box,
  Printer,
  FileArchive,
  Wand2,
  Tag,
} from 'lucide-react';
import { EditorTool, CanvasViewMode, SchematicDocument } from '../../types';
import { STARTER_CIRCUITS } from '../../data/examples';

interface HeaderProps {
  viewMode: CanvasViewMode;
  onViewModeChange: (mode: CanvasViewMode) => void;
  activeTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  onOpenAiModal: () => void;
  onOpenBom: () => void;
  onOpenErc: () => void;
  onOpenNetlist: () => void;
  onOpenPrintPdf?: () => void;
  onExportGerber?: () => void;
  onAutoRoute?: () => void;
  onAnnotate?: () => void;
  onRotateSelected: () => void;
  onDeleteSelected: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  onLoadExample: (example: SchematicDocument) => void;
  onNewCircuit: () => void;
  onExportJson: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  isSimulating?: boolean;
  onToggleSimulation?: () => void;
  onResetSimulation?: () => void;
  isScopeOpen?: boolean;
  onToggleScope?: () => void;
  simSpeed?: number;
  onChangeSimSpeed?: (speed: number) => void;
}

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  onViewModeChange,
  activeTool,
  onToolChange,
  onOpenAiModal,
  onOpenBom,
  onOpenErc,
  onOpenNetlist,
  onOpenPrintPdf,
  onExportGerber,
  onAutoRoute,
  onAnnotate,
  onRotateSelected,
  onDeleteSelected,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  onLoadExample,
  onNewCircuit,
  onExportJson,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  isSimulating = false,
  onToggleSimulation,
  onResetSimulation,
  isScopeOpen = false,
  onToggleScope,
  simSpeed = 1,
  onChangeSimSpeed,
}) => {
  const [examplesOpen, setExamplesOpen] = useState(false);

  return (
    <header className="flex flex-col bg-slate-900 border-b border-slate-800 select-none text-slate-100 z-30">
      {/* Top Bar: Brand, Mode Switcher, Actions */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
        {/* Brand & Document Name */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-md">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-bold text-sm text-slate-100 tracking-tight">
                  CircuitEDA
                </span>
                <span className="text-[10px] px-1.5 py-0.2 bg-sky-950 text-sky-400 border border-sky-800 rounded font-mono">
                  Pro
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                EasyEDA-Style AI Schematic &amp; PCB
              </span>
            </div>
          </div>

          <div className="h-5 w-px bg-slate-800" />

          {/* View Mode Toggle (Schematic vs PCB 2D vs 3D Product) */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => onViewModeChange('schematic')}
              className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all ${
                viewMode === 'schematic'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Schematic Editor
            </button>
            <button
              onClick={() => onViewModeChange('pcb')}
              className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all ${
                viewMode === 'pcb'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              PCB 2D Layout
            </button>
            <button
              onClick={() => onViewModeChange('3d')}
              className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all ${
                viewMode === '3d'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              3D Product View
            </button>
          </div>
        </div>

        {/* Center/Right Actions */}
        <div className="flex items-center space-x-2">
          {/* SIMULATION ENGINE CONTROLS */}
          {viewMode === 'schematic' && onToggleSimulation && (
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 space-x-1.5">
              {/* Play / Pause Toggle */}
              <button
                onClick={onToggleSimulation}
                className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                  isSimulating
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse'
                    : 'bg-emerald-700 hover:bg-emerald-600 text-white'
                }`}
                title={isSimulating ? 'Pause Circuit Simulation' : 'Run Real-Time Circuit Simulation'}
              >
                {isSimulating ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause Sim</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Simulation</span>
                  </>
                )}
              </button>

              {/* Oscilloscope Panel Toggle */}
              {onToggleScope && (
                <button
                  onClick={onToggleScope}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors border cursor-pointer ${
                    isScopeOpen
                      ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                      : 'bg-slate-900 hover:bg-slate-800 text-sky-400 border-slate-800'
                  }`}
                  title="Open Virtual Oscilloscope & Waveform Analyzer"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Scope</span>
                </button>
              )}

              {/* Reset Sim Time */}
              {onResetSimulation && (
                <button
                  onClick={onResetSimulation}
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  title="Reset Simulation Time (t=0s)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Speed Multiplier */}
              {onChangeSimSpeed && (
                <div className="flex items-center pl-1 border-l border-slate-800 space-x-1">
                  {[1, 2, 5].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => onChangeSimSpeed(spd)}
                      className={`px-1.5 py-0.5 text-[10px] font-mono rounded cursor-pointer ${
                        simSpeed === spd
                          ? 'bg-slate-700 text-white font-bold'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="h-5 w-px bg-slate-800" />

          {/* AI CIRCUIT GENERATOR BUTTON - Prominent CTA */}
          <button
            onClick={onOpenAiModal}
            className="px-3.5 py-1.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-lg shadow-md shadow-sky-950 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>AI Schematic Prompt &amp; Image</span>
          </button>

          <div className="h-5 w-px bg-slate-800" />

          {/* Print PDF Button */}
          {onOpenPrintPdf && (
            <button
              onClick={onOpenPrintPdf}
              className="px-2.5 py-1.5 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium border border-slate-800 hover:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Print Schematic Sheet / Export PDF"
            >
              <Printer className="w-3.5 h-3.5 text-sky-400" />
              <span>Print PDF</span>
            </button>
          )}

          {/* Gerber Export Button */}
          {onExportGerber && (
            <button
              onClick={onExportGerber}
              className="px-2.5 py-1.5 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium border border-slate-800 hover:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Export RS-274X Gerber & Excellon Drill ZIP for PCB Manufacturing"
            >
              <FileArchive className="w-3.5 h-3.5 text-emerald-400" />
              <span>Gerber ZIP</span>
            </button>
          )}

          {/* Examples Dropdown */}
          <div className="relative">
            <button
              onClick={() => setExamplesOpen(!examplesOpen)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
              <span>Examples</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {examplesOpen && (
              <div className="absolute right-0 mt-1 w-60 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 z-50 text-xs font-sans">
                <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-slate-500 font-mono">
                  Starter Circuits
                </div>
                {STARTER_CIRCUITS.map((circ) => (
                  <button
                    key={circ.id}
                    onClick={() => {
                      onLoadExample(circ);
                      setExamplesOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-800 text-slate-200 flex flex-col transition-colors cursor-pointer"
                  >
                    <span className="font-semibold text-slate-100">{circ.title}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {circ.category} • {circ.components.length} parts
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* New Sheet Button */}
          <button
            onClick={onNewCircuit}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
            title="New Blank Schematic Sheet"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* ERC Button */}
          <button
            onClick={onOpenErc}
            className="px-2.5 py-1.5 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium border border-slate-800 hover:border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
            title="Electrical Rule Check"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>ERC</span>
          </button>

          {/* BOM Button */}
          <button
            onClick={onOpenBom}
            className="px-2.5 py-1.5 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium border border-slate-800 hover:border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
            title="Bill of Materials"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-sky-400" />
            <span>BOM</span>
          </button>

          {/* Netlist Button */}
          <button
            onClick={onOpenNetlist}
            className="px-2.5 py-1.5 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium border border-slate-800 hover:border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
            title="Netlist & SPICE"
          >
            <Network className="w-3.5 h-3.5 text-purple-400" />
            <span>Netlist</span>
          </button>

          {/* Export JSON */}
          <button
            onClick={onExportJson}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Export Schematic JSON"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sub-Toolbar: Editor Tools & Canvas Controls */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-950/60 text-xs">
        {/* Primary Schematic Tools */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onToolChange('select')}
            className={`px-2.5 py-1 rounded flex items-center gap-1.5 font-medium transition-colors cursor-pointer ${
              activeTool === 'select'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Select & Move Tool (S or Esc)"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>Select</span>
          </button>

          <button
            onClick={() => onToolChange('wire')}
            className={`px-2.5 py-1 rounded flex items-center gap-1.5 font-medium transition-colors cursor-pointer ${
              activeTool === 'wire'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Orthogonal Wire Routing Tool (W)"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Wire</span>
          </button>

          <button
            onClick={() => onToolChange('pan')}
            className={`px-2.5 py-1 rounded flex items-center gap-1.5 font-medium transition-colors cursor-pointer ${
              activeTool === 'pan'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Pan Canvas (Space + Drag or Middle Click)"
          >
            <Hand className="w-3.5 h-3.5" />
            <span>Pan</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* Autoroute Wires Button */}
          {onAutoRoute && (
            <button
              onClick={onAutoRoute}
              className="px-2.5 py-1 text-slate-300 hover:text-emerald-300 hover:bg-slate-800 rounded flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Automatically connect all schematic pins sharing net names"
            >
              <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Auto-Route Nets</span>
            </button>
          )}

          {/* Renumber/Annotate Components Button */}
          {onAnnotate && (
            <button
              onClick={onAnnotate}
              className="px-2.5 py-1 text-slate-300 hover:text-sky-300 hover:bg-slate-800 rounded flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Renumber all components with standard sequential designators (R1, R2, C1, U1...)"
            >
              <Tag className="w-3.5 h-3.5 text-sky-400" />
              <span>Annotate Parts</span>
            </button>
          )}

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* Rotate Selected */}
          <button
            onClick={onRotateSelected}
            className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded flex items-center gap-1 transition-colors cursor-pointer"
            title="Rotate Selected 90° (R)"
          >
            <RotateCw className="w-3.5 h-3.5 text-sky-400" />
            <span>Rotate (R)</span>
          </button>

          {/* Delete Selected */}
          <button
            onClick={onDeleteSelected}
            className="px-2 py-1 text-slate-300 hover:text-red-300 hover:bg-slate-800 rounded flex items-center gap-1 transition-colors cursor-pointer"
            title="Delete Selected (Del)"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Delete</span>
          </button>
        </div>

        {/* Canvas Zoom Controls */}
        <div className="flex items-center space-x-1 font-mono text-slate-400">
          {onUndo && (
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1 hover:bg-slate-800 disabled:opacity-30 rounded text-slate-300 cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onRedo && (
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1 hover:bg-slate-800 disabled:opacity-30 rounded text-slate-300 cursor-pointer"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="h-3 w-px bg-slate-800 mx-1" />

          <button
            onClick={onZoomOut}
            className="p-1 hover:bg-slate-800 rounded text-slate-300 cursor-pointer"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onZoomIn}
            className="p-1 hover:bg-slate-800 rounded text-slate-300 cursor-pointer"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onZoomFit}
            className="p-1 hover:bg-slate-800 rounded text-slate-300 cursor-pointer"
            title="Zoom to Fit (0)"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
