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
  Globe,
  Search,
  User,
  LogIn,
  LogOut,
  MessageSquare,
  CheckCircle,
  Radio,
  Keyboard,
  HelpCircle,
  Github,
  ClipboardPaste,
} from 'lucide-react';
import { EditorTool, CanvasViewMode, SchematicDocument, UserProfile, SimulationState, SchematicComponent, Wire, SimulationScenario, OperatingConditions } from '../../types';
import { STARTER_CIRCUITS } from '../../data/examples';
import { SimulationScenarioDropdown } from '../simulation/SimulationScenarioDropdown';

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
  onOpenUniversalModal?: () => void;
  onOpenGoogleModal?: () => void;
  onPasteFromClipboard?: () => void;
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
  simulationState?: SimulationState;
  components?: SchematicComponent[];
  wires?: Wire[];
  onApplyScenario?: (scenario: SimulationScenario) => void;
  onUpdateConditions?: (conditions: Partial<OperatingConditions>, newProbes?: string[]) => void;
  currentUser?: UserProfile | null;
  onOpenAuthModal?: (mode?: 'signin' | 'signup' | 'whatsapp_otp' | 'forgot_password') => void;
  onLogout?: () => void;
  onSearchGoogle?: (query: string) => void;
  onOpenShortcutsModal?: () => void;
  onOpenAllDataSheetModal?: () => void;
  onInsertPowerReferences?: () => void;
  onOpenGitHubModal?: () => void;
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
  onOpenUniversalModal,
  onOpenGoogleModal,
  onPasteFromClipboard,
  onOpenAllDataSheetModal,
  onInsertPowerReferences,
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
  simulationState,
  components = [],
  wires = [],
  onApplyScenario,
  onUpdateConditions,
  currentUser = null,
  onOpenAuthModal,
  onLogout,
  onSearchGoogle,
  onOpenShortcutsModal,
  onOpenGitHubModal,
}) => {
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [headerGoogleQuery, setHeaderGoogleQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

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
            <button
              onClick={() => onViewModeChange('panel')}
              className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all ${
                viewMode === 'panel'
                  ? 'bg-gradient-to-r from-amber-600 to-rose-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              Panel Diagram (220V/440V)
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

              {/* Simulation Scenarios Dropdown (Save & Load Scenarios, Probes, Conditions) */}
              {simulationState && onApplyScenario && (
                <SimulationScenarioDropdown
                  simulationState={simulationState}
                  components={components}
                  wires={wires}
                  onApplyScenario={onApplyScenario}
                  onUpdateConditions={onUpdateConditions}
                />
              )}

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

          {/* Google Reference Component Search & Add */}
          {onOpenGoogleModal && (
            <button
              onClick={onOpenGoogleModal}
              className="px-2.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-sky-300 rounded-lg text-xs font-medium border border-sky-500/40 hover:border-sky-400 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Search and Add Google Electronic Components or Synthesize Custom Parts"
            >
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span>Google Parts</span>
            </button>
          )}

          {/* Paste Copied Web Circuit or Image Button */}
          {onPasteFromClipboard && (
            <button
              onClick={onPasteFromClipboard}
              className="px-2.5 py-1.5 bg-gradient-to-r from-amber-600/30 to-orange-600/30 hover:from-amber-600/50 hover:to-orange-600/50 text-amber-300 rounded-lg text-xs font-semibold border border-amber-500/40 hover:border-amber-400 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Auto-generate circuit on schematic from copied Google image, URL, or link address (Ctrl+V)"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-amber-400" />
              <span>Paste Web Circuit</span>
            </button>
          )}

          {/* Universal File Hub: BOM, Gerber, 3D, PDF, DOC & Import */}
          {onOpenUniversalModal && (
            <button
              onClick={onOpenUniversalModal}
              className="px-2.5 py-1.5 bg-gradient-to-r from-teal-700/80 to-emerald-700/80 hover:from-teal-600 hover:to-emerald-600 text-white rounded-lg text-xs font-semibold border border-emerald-500/40 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Universal Manufacturing & Documentation: BOM, Gerber, 3D OBJ, PDF, DOC, and File Import"
            >
              <FileArchive className="w-3.5 h-3.5 text-emerald-300" />
              <span>Files &amp; Export Hub</span>
            </button>
          )}

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
                      {circ.category} • {circ?.components?.length || 0} parts
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

          {/* AllDataSheet.com Component Search & Reference Button */}
          {onOpenAllDataSheetModal && (
            <button
              onClick={onOpenAllDataSheetModal}
              className="px-2.5 py-1.5 bg-indigo-950/70 hover:bg-indigo-900 text-indigo-200 hover:text-indigo-100 rounded-lg text-xs font-medium border border-indigo-700/60 hover:border-indigo-600 flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="Search AllDataSheet.com Components, Pinouts & PDF Datasheets"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span>AllDataSheet</span>
            </button>
          )}

          {/* Export JSON */}
          <button
            onClick={onExportJson}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Export Schematic JSON"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* GitHub Deploy & Export Button */}
          {onOpenGitHubModal && (
            <button
              onClick={onOpenGitHubModal}
              className="px-2.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-700/80 hover:border-slate-600 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="Deploy circuit designer via GitHub & invite users to sign up"
            >
              <Github className="w-3.5 h-3.5 text-sky-400" />
              <span>Deploy</span>
            </button>
          )}

          {/* Keyboard Shortcuts Help Button */}
          {onOpenShortcutsModal && (
            <button
              onClick={onOpenShortcutsModal}
              className="px-2 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-sky-300 rounded-lg text-xs font-medium border border-slate-700/70 hover:border-slate-600 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Keyboard Shortcuts Reference Guide (Press ?)"
            >
              <Keyboard className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Shortcuts</span>
              <kbd className="px-1 py-0.2 bg-slate-900 border border-slate-700 rounded text-[9px] font-mono text-slate-400">
                ?
              </kbd>
            </button>
          )}

          {/* User Account / WhatsApp OTP Verification */}
          <div className="h-5 w-px bg-slate-800" />

          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg transition-colors cursor-pointer text-xs"
              >
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-5 h-5 rounded-full object-cover border border-slate-600"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-sky-600 flex items-center justify-center text-[10px] font-bold text-white">
                    {currentUser.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span className="font-medium text-slate-200 max-w-[100px] truncate">
                  {currentUser.name}
                </span>

                {/* WhatsApp Verified Badge */}
                {currentUser.isWhatsappVerified && (
                  <span
                    className="flex items-center gap-1 text-[9px] px-1.5 py-0.2 bg-emerald-950 text-emerald-300 border border-emerald-700/60 rounded-full font-mono"
                    title={`WhatsApp OTP Verified: ${currentUser.whatsappNumber}`}
                  >
                    <MessageSquare className="w-2.5 h-2.5 text-emerald-400" />
                    <span>WhatsApp</span>
                  </span>
                )}

                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-1 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-xs animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 border-b border-slate-800 space-y-1">
                    <div className="font-bold text-white truncate">{currentUser.name}</div>
                    <div className="text-[11px] text-slate-400 truncate">{currentUser.email}</div>
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono mt-1">
                      <MessageSquare className="w-3 h-3 text-emerald-400" />
                      <span>{currentUser.whatsappNumber} (Verified OTP)</span>
                    </div>
                  </div>

                  <div className="py-1">
                    {onOpenGoogleModal && (
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onOpenGoogleModal();
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-300 flex items-center gap-2 cursor-pointer"
                      >
                        <Globe className="w-3.5 h-3.5 text-sky-400" />
                        <span>Saved Components &amp; Circuits</span>
                      </button>
                    )}
                    {onOpenAuthModal && (
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onOpenAuthModal('whatsapp_otp');
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-emerald-300 flex items-center gap-2 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Verify / Change WhatsApp OTP</span>
                      </button>
                    )}
                    {onOpenGitHubModal && (
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onOpenGitHubModal();
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-sky-300 flex items-center gap-2 cursor-pointer"
                      >
                        <Github className="w-3.5 h-3.5 text-sky-400" />
                        <span>Deploy via GitHub / Git URL</span>
                      </button>
                    )}
                  </div>

                  {onLogout && (
                    <div className="pt-1 border-t border-slate-800">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-red-950/40 text-rose-400 flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => onOpenAuthModal && onOpenAuthModal('signin')}
                className="px-2.5 py-1.5 hover:bg-slate-800 text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-slate-400" />
                <span>Sign In</span>
              </button>

              <button
                onClick={() => onOpenAuthModal && onOpenAuthModal('signup')}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-sky-400" />
                <span>Sign Up</span>
              </button>

              <button
                onClick={() => onOpenAuthModal && onOpenAuthModal('whatsapp_otp')}
                className="px-2.5 py-1.5 bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 rounded-lg text-xs font-semibold border border-emerald-700/60 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                title="Sign In with WhatsApp OTP verification"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp OTP</span>
              </button>
            </div>
          )}
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
            onClick={() => onToolChange('probe')}
            className={`px-2.5 py-1 rounded flex items-center gap-1.5 font-medium transition-colors cursor-pointer ${
              activeTool === 'probe'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Transient Probe Tool (P) - Click any wire or pin to inspect live trends in floating widget"
          >
            <Radio className="w-3.5 h-3.5 text-sky-400" />
            <span>Probe</span>
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

          {/* Quick Insert Power & Earth Reference Rails */}
          {onInsertPowerReferences && (
            <button
              onClick={onInsertPowerReferences}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-sky-600/40 hover:border-sky-400 text-sky-200 rounded flex items-center gap-1.5 transition-colors cursor-pointer text-xs font-medium shadow-xs"
              title="Add Source Voltage (+ / -) and Protective Earthing (⏚ PE) reference points to the canvas"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>+ / - &amp; Earth Ref</span>
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

        {/* Center Space: Direct Google Electronics Search Space */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 w-72 max-w-sm focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500/30 transition-all shadow-inner">
          <div className="flex items-center font-bold text-[11px] leading-none select-none tracking-tight shrink-0">
            <span className="text-[#4285F4]">G</span>
            <span className="text-[#EA4335]">o</span>
            <span className="text-[#FBBC05]">o</span>
            <span className="text-[#4285F4]">g</span>
            <span className="text-[#34A853]">l</span>
            <span className="text-[#EA4335]">e</span>
          </div>
          <input
            type="text"
            value={headerGoogleQuery}
            onChange={(e) => setHeaderGoogleQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && headerGoogleQuery.trim()) {
                if (onSearchGoogle) onSearchGoogle(headerGoogleQuery.trim());
                else if (onOpenGoogleModal) onOpenGoogleModal();
              }
            }}
            placeholder="Search Google parts & circuits (e.g. INA219, ESP32)..."
            className="flex-1 bg-transparent text-[11px] text-white placeholder-slate-500 focus:outline-none min-w-0"
          />
          <button
            onClick={() => {
              if (onSearchGoogle) onSearchGoogle(headerGoogleQuery.trim());
              else if (onOpenGoogleModal) onOpenGoogleModal();
            }}
            className="text-slate-400 hover:text-sky-300 transition-colors p-0.5 rounded cursor-pointer shrink-0"
            title="Search Google directly to find and select components or circuits"
          >
            <Search className="w-3 h-3 text-sky-400" />
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

          {onOpenShortcutsModal && (
            <>
              <div className="h-3 w-px bg-slate-800 mx-0.5" />
              <button
                onClick={onOpenShortcutsModal}
                className="px-1.5 py-0.5 hover:bg-slate-800 text-slate-400 hover:text-sky-300 rounded flex items-center gap-1 cursor-pointer transition-colors"
                title="Keyboard Shortcuts Guide (Press ?)"
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono font-bold text-sky-400">?</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
