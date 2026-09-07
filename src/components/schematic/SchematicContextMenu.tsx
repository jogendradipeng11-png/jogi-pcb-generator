import React, { useEffect, useRef } from 'react';
import {
  Trash2,
  Copy,
  Scissors,
  Files,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  Edit3,
  Cpu,
  Zap,
  Activity,
  Sparkles,
  Upload,
  Maximize2,
  CheckCircle2,
  Wrench,
} from 'lucide-react';
import { SchematicComponent, Wire } from '../../types';

export interface ContextMenuTarget {
  type: 'component' | 'wire' | 'canvas';
  component?: SchematicComponent;
  wire?: Wire;
  selectedComponentIds?: string[];
  selectedWireIds?: string[];
  x: number; // Screen X
  y: number; // Screen Y
  worldX: number; // Canvas World X
  worldY: number; // Canvas World Y
}

interface SchematicContextMenuProps {
  target: ContextMenuTarget | null;
  onClose: () => void;
  onDeleteSelected: () => void;
  onCopySelected: () => void;
  onCutSelected: () => void;
  onPasteAtPos: (x: number, y: number) => void;
  onDuplicateSelected: () => void;
  onRotateSelected: (direction: 'cw90' | 'ccw90') => void;
  onFlipSelected: () => void;
  onEditComponentValue: (comp: SchematicComponent) => void;
  onOpenPinoutMap?: (comp: SchematicComponent) => void;
  onInspectTestSettings?: (comp: SchematicComponent) => void;
  onProbeTarget?: (netOrPin: string) => void;
  onOpenLoadDiagram?: () => void;
  onOpenChatDrawer?: () => void;
  onOpenAutoCorrect?: () => void;
  onFitView?: () => void;
  onClearAll?: () => void;
  canPaste?: boolean;
}

export const SchematicContextMenu: React.FC<SchematicContextMenuProps> = ({
  target,
  onClose,
  onDeleteSelected,
  onCopySelected,
  onCutSelected,
  onPasteAtPos,
  onDuplicateSelected,
  onRotateSelected,
  onFlipSelected,
  onEditComponentValue,
  onOpenPinoutMap,
  onInspectTestSettings,
  onProbeTarget,
  onOpenLoadDiagram,
  onOpenChatDrawer,
  onOpenAutoCorrect,
  onFitView,
  onClearAll,
  canPaste = true,
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!target) return null;

  // Keep menu within viewport bounds
  const menuWidth = 230;
  const menuHeight = 310;
  const adjustedX = Math.min(target.x, window.innerWidth - menuWidth - 10);
  const adjustedY = Math.min(target.y, window.innerHeight - menuHeight - 10);

  const isComp = target.type === 'component';
  const isWire = target.type === 'wire';
  const isCanvas = target.type === 'canvas';

  const selectedCount = (target.selectedComponentIds?.length || 0) + (target.selectedWireIds?.length || 0);

  return (
    <div
      ref={menuRef}
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      className="fixed z-50 w-56 bg-slate-900/95 backdrop-blur-md border border-slate-750 shadow-2xl rounded-xl py-1.5 text-xs text-slate-200 select-none animate-in fade-in zoom-in-95 duration-100"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header Info */}
      <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] font-medium text-slate-400 flex items-center justify-between">
        {isComp && (
          <span className="text-sky-400 font-mono">
            {target.component?.designator}: {target.component?.value}
          </span>
        )}
        {isWire && (
          <span className="text-emerald-400 font-mono">
            Net: {target.wire?.net || 'Wire'}
          </span>
        )}
        {isCanvas && <span>Schematic Canvas</span>}
        {selectedCount > 1 && (
          <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded font-mono">
            {selectedCount} selected
          </span>
        )}
      </div>

      {/* COMPONENT ACTIONS */}
      {isComp && target.component && (
        <>
          <button
            onClick={() => {
              onDeleteSelected();
              onClose();
            }}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-rose-950/60 text-rose-300 hover:text-rose-200 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span className="font-semibold">
              Delete {selectedCount > 1 ? `(${selectedCount})` : target.component.designator}
            </span>
            <span className="ml-auto text-[10px] text-slate-500 font-mono">Del</span>
          </button>

          <button
            onClick={() => {
              onCopySelected();
              onClose();
            }}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 text-slate-200 transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-sky-400" />
            <span>Copy</span>
            <span className="ml-auto text-[10px] text-slate-500 font-mono">Ctrl+C</span>
          </button>

          <button
            onClick={() => {
              onCutSelected();
              onClose();
            }}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 text-slate-200 transition-colors cursor-pointer"
          >
            <Scissors className="w-3.5 h-3.5 text-amber-400" />
            <span>Cut</span>
            <span className="ml-auto text-[10px] text-slate-500 font-mono">Ctrl+X</span>
          </button>

          <button
            onClick={() => {
              onDuplicateSelected();
              onClose();
            }}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 text-slate-200 transition-colors cursor-pointer"
          >
            <Files className="w-3.5 h-3.5 text-indigo-400" />
            <span>Duplicate</span>
            <span className="ml-auto text-[10px] text-slate-500 font-mono">Ctrl+D</span>
          </button>

          <div className="my-1 border-t border-slate-800" />

          <button
            onClick={() => {
              onRotateSelected('cw90');
              onClose();
            }}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 text-slate-200 transition-colors cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5 text-sky-400" />
            <span>Rotate 90° CW</span>
            <span className="ml-auto text-[10px] text-slate-500 font-mono">R</span>
          </button>

          <button
            onClick={() => {
              onRotateSelected('ccw90');
              onClose();
            }}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 text-slate-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
            <span>Rotate 90° CCW</span>
            <span className="ml-auto text-[10px] text-slate-500 font-mono">Shift+R</span>
          </button>

          <button
            onClick={() => {
              onFlipSelected();
              onClose();
            }}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 text-slate-200 transition-colors cursor-pointer"
          >
            <FlipHorizontal className="w-3.5 h-3.5 text-purple-400" />
            <span>Flip Horizontal</span>
          </button>

          <div className="my-1 border-t border-slate-800" />

          <button
            onClick={() => {
              onEditComponentValue(target.component!);
              onClose();
            }}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 text-slate-200 transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Edit Value &amp; Ref</span>
          </button>

          {onOpenPinoutMap && (
            <button
              onClick={() => {
                onOpenPinoutMap(target.component!);
                onClose();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 text-sky-300 transition-colors cursor-pointer"
            >
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              <span>View Pinout &amp; Uses</span>
            </button>
          )}

          {onInspectTestSettings && (
            <button
              onClick={() => {
                onInspectTestSettings(target.component!);
                onClose();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 text-amber-300 transition-colors cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulation Settings</span>
            </button>
          )}
        </>
      )}

      {/* WIRE ACTIONS */}
      {isWire && target.wire && (
        <>
          <button
            onClick={() => {
              onDeleteSelected();
              onClose();
            }}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-rose-950/60 text-rose-300 hover:text-rose-200 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span className="font-semibold">Delete Wire</span>
            <span className="ml-auto text-[10px] text-slate-500 font-mono">Del</span>
          </button>

          {onProbeTarget && target.wire.net && (
            <button
              onClick={() => {
                onProbeTarget(target.wire!.net);
                onClose();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 text-sky-300 transition-colors cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              <span>Probe Net Voltage</span>
            </button>
          )}
        </>
      )}

      {/* CANVAS BACKGROUND ACTIONS */}
      {isCanvas && (
        <>
          <button
            onClick={() => {
              onPasteAtPos(target.worldX, target.worldY);
              onClose();
            }}
            disabled={!canPaste}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 disabled:opacity-40 text-slate-200 transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-sky-400" />
            <span>Paste Here</span>
            <span className="ml-auto text-[10px] text-slate-500 font-mono">Ctrl+V</span>
          </button>

          <div className="my-1 border-t border-slate-800" />

          {onOpenLoadDiagram && (
            <button
              onClick={() => {
                onOpenLoadDiagram();
                onClose();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 text-emerald-300 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Load Diagram / Rough Sketch</span>
            </button>
          )}

          {onOpenChatDrawer && (
            <button
              onClick={() => {
                onOpenChatDrawer();
                onClose();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 text-indigo-300 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>AI Assistant &amp; Suggestions</span>
            </button>
          )}

          {onOpenAutoCorrect && (
            <button
              onClick={() => {
                onOpenAutoCorrect();
                onClose();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 text-amber-300 transition-colors cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
              <span>Auto-Correct Circuit Rules</span>
            </button>
          )}

          {onFitView && (
            <button
              onClick={() => {
                onFitView();
                onClose();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 text-slate-200 transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Fit Entire Circuit</span>
            </button>
          )}

          <div className="my-1 border-t border-slate-800" />

          {onClearAll && (
            <button
              onClick={() => {
                onClearAll();
                onClose();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-rose-950/60 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Clear Canvas / Delete All</span>
            </button>
          )}
        </>
      )}
    </div>
  );
};
