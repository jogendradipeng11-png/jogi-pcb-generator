import React, { useState, useEffect } from 'react';
import {
  Keyboard,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Zap,
  MousePointer,
  Activity,
  RotateCw,
  Trash2,
  Undo2,
  Redo2,
  Play,
  Pause,
} from 'lucide-react';
import { EditorTool } from '../../types';

interface KeyboardShortcutsOverlayProps {
  activeTool: EditorTool;
  onSelectTool: (tool: EditorTool) => void;
  onOpenModal: () => void;
  onRotateSelected?: () => void;
  onDeleteSelected?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  isSimulating?: boolean;
  onToggleSimulation?: () => void;
  hasSelection?: boolean;
  className?: string;
}

const STORAGE_KEY = 'eda_shortcuts_overlay_collapsed';

export const KeyboardShortcutsOverlay: React.FC<KeyboardShortcutsOverlayProps> = ({
  activeTool,
  onSelectTool,
  onOpenModal,
  onRotateSelected,
  onDeleteSelected,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  isSimulating = false,
  onToggleSimulation,
  hasSelection = false,
  className = '',
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  };

  return (
    <div
      className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-20 transition-all duration-200 select-none ${className}`}
    >
      {isCollapsed ? (
        /* Collapsed Minimal Pill */
        <div className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-850/95 backdrop-blur-md border border-slate-700/80 rounded-full px-3 py-1.5 shadow-xl text-slate-300 text-xs transition-all">
          <button
            onClick={toggleCollapsed}
            className="flex items-center gap-1.5 hover:text-white cursor-pointer"
            title="Expand Keyboard Shortcuts Bar"
          >
            <Keyboard className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-semibold text-[11px]">Shortcuts</span>
            <div className="flex items-center gap-0.5 font-mono text-[10px] text-slate-400">
              <span className="px-1 py-0.2 bg-slate-800 rounded">W</span>
              <span className="px-1 py-0.2 bg-slate-800 rounded">S</span>
              <span className="px-1 py-0.2 bg-slate-800 rounded">Z</span>
            </div>
            <ChevronUp className="w-3 h-3 text-slate-400" />
          </button>

          <span className="w-px h-3 bg-slate-700 mx-0.5" />

          <button
            onClick={onOpenModal}
            className="p-1 hover:text-white rounded hover:bg-slate-800 text-slate-400 transition-colors cursor-pointer"
            title="View All Keyboard Shortcuts (Press ?)"
          >
            <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
          </button>
        </div>
      ) : (
        /* Expanded Interactive Hotkey Dock */
        <div className="flex items-center bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl px-2 py-1.5 shadow-2xl text-slate-200 text-xs gap-1.5 transition-all">
          {/* Collapse Toggle Icon */}
          <button
            onClick={toggleCollapsed}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-md transition-colors cursor-pointer"
            title="Minimize Shortcuts Bar"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-1 text-slate-400 pr-1 border-r border-slate-800">
            <Keyboard className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-slate-400 hidden sm:inline">
              Hotkeys
            </span>
          </div>

          {/* Tool: Wire (W) */}
          <button
            onClick={() => onSelectTool(activeTool === 'wire' ? 'select' : 'wire')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all cursor-pointer ${
              activeTool === 'wire'
                ? 'bg-amber-500/20 border-amber-500/80 text-amber-300 font-bold shadow-sm'
                : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-300'
            }`}
            title="Press W to toggle Wire Tool"
          >
            <kbd className="px-1.5 py-0.2 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono font-bold text-amber-400">
              W
            </kbd>
            <Zap className="w-3 h-3 text-amber-400" />
            <span className="text-[11px] hidden md:inline">Wire</span>
          </button>

          {/* Tool: Select (S) */}
          <button
            onClick={() => onSelectTool('select')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all cursor-pointer ${
              activeTool === 'select'
                ? 'bg-sky-500/20 border-sky-500/80 text-sky-300 font-bold shadow-sm'
                : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-300'
            }`}
            title="Press S for Select / Move Tool"
          >
            <kbd className="px-1.5 py-0.2 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono font-bold text-sky-400">
              S
            </kbd>
            <MousePointer className="w-3 h-3 text-sky-400" />
            <span className="text-[11px] hidden md:inline">Select</span>
          </button>

          {/* Tool: Probe (P) */}
          <button
            onClick={() => onSelectTool(activeTool === 'probe' ? 'select' : 'probe')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all cursor-pointer ${
              activeTool === 'probe'
                ? 'bg-emerald-500/20 border-emerald-500/80 text-emerald-300 font-bold shadow-sm'
                : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-300'
            }`}
            title="Press P for Signal Probe Tool"
          >
            <kbd className="px-1.5 py-0.2 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono font-bold text-emerald-400">
              P
            </kbd>
            <Activity className="w-3 h-3 text-emerald-400" />
            <span className="text-[11px] hidden md:inline">Probe</span>
          </button>

          {/* Action: Rotate (R) */}
          {onRotateSelected && (
            <button
              onClick={onRotateSelected}
              disabled={!hasSelection}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                hasSelection
                  ? 'bg-slate-900 hover:bg-slate-850 border-slate-700 text-slate-200'
                  : 'bg-slate-900/50 border-slate-800/60 text-slate-500 cursor-not-allowed'
              }`}
              title="Press R to rotate selected component 90°"
            >
              <kbd className="px-1.5 py-0.2 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono font-bold text-cyan-400">
                R
              </kbd>
              <RotateCw className="w-3 h-3 text-cyan-400" />
              <span className="text-[11px] hidden lg:inline">Rotate</span>
            </button>
          )}

          {/* Action: Delete (Del) */}
          {onDeleteSelected && (
            <button
              onClick={onDeleteSelected}
              disabled={!hasSelection}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                hasSelection
                  ? 'bg-slate-900 hover:bg-slate-850 border-slate-700 text-rose-300'
                  : 'bg-slate-900/50 border-slate-800/60 text-slate-500 cursor-not-allowed'
              }`}
              title="Press Delete or Backspace to remove selection"
            >
              <kbd className="px-1.5 py-0.2 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono font-bold text-rose-400">
                Del
              </kbd>
              <Trash2 className="w-3 h-3 text-rose-400" />
            </button>
          )}

          {/* History: Undo / Redo (Ctrl+Z / Ctrl+Y) */}
          <div className="hidden sm:flex items-center gap-1 pl-1 border-l border-slate-800">
            {onUndo && (
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className={`flex items-center gap-1 px-1.5 py-1 rounded-lg border transition-all cursor-pointer ${
                  canUndo
                    ? 'bg-slate-900 hover:bg-slate-850 border-slate-700 text-slate-300'
                    : 'bg-slate-900/50 border-slate-800/60 text-slate-500 cursor-not-allowed'
                }`}
                title="Ctrl + Z: Undo"
              >
                <kbd className="px-1 py-0.2 bg-slate-800 border border-slate-700 rounded text-[9px] font-mono font-bold text-slate-300">
                  ^Z
                </kbd>
                <Undo2 className="w-3 h-3" />
              </button>
            )}

            {onRedo && (
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className={`flex items-center gap-1 px-1.5 py-1 rounded-lg border transition-all cursor-pointer ${
                  canRedo
                    ? 'bg-slate-900 hover:bg-slate-850 border-slate-700 text-slate-300'
                    : 'bg-slate-900/50 border-slate-800/60 text-slate-500 cursor-not-allowed'
                }`}
                title="Ctrl + Y: Redo"
              >
                <kbd className="px-1 py-0.2 bg-slate-800 border border-slate-700 rounded text-[9px] font-mono font-bold text-slate-300">
                  ^Y
                </kbd>
                <Redo2 className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Simulation Toggle: Space */}
          {onToggleSimulation && (
            <button
              onClick={onToggleSimulation}
              className="hidden sm:flex items-center gap-1 px-2 py-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-slate-300 cursor-pointer"
              title="Spacebar: Play / Pause Simulation"
            >
              <kbd className="px-1.5 py-0.2 bg-slate-800 border border-slate-700 rounded text-[9px] font-mono font-bold text-emerald-400">
                Space
              </kbd>
              {isSimulating ? (
                <Pause className="w-3 h-3 text-emerald-400" />
              ) : (
                <Play className="w-3 h-3 text-emerald-400" />
              )}
            </button>
          )}

          <div className="w-px h-4 bg-slate-800 mx-0.5" />

          {/* Help / View All Shortcuts Dialog */}
          <button
            onClick={onOpenModal}
            className="flex items-center gap-1 px-2 py-1 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 hover:text-white border border-sky-500/40 hover:border-sky-400 rounded-lg transition-all cursor-pointer"
            title="View full keyboard shortcuts guide (or press ?)"
          >
            <kbd className="px-1.5 py-0.2 bg-sky-950 border border-sky-800 rounded text-[10px] font-mono font-bold text-sky-300">
              ?
            </kbd>
            <span className="text-[11px] font-medium hidden sm:inline">All Keys</span>
          </button>
        </div>
      )}
    </div>
  );
};
