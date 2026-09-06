import React from 'react';
import { RotateCw, RotateCcw, FlipHorizontal, FlipVertical, RefreshCw, Compass } from 'lucide-react';
import { CircuitRotationDirection } from '../../types';

interface CircuitRotationToolbarProps {
  onRotate: (direction: CircuitRotationDirection) => void;
  selectedCount?: number;
  totalComponentsCount?: number;
  className?: string;
  isCompact?: boolean;
}

export const CircuitRotationToolbar: React.FC<CircuitRotationToolbarProps> = ({
  onRotate,
  selectedCount = 0,
  totalComponentsCount = 0,
  className = '',
  isCompact = false,
}) => {
  const isSelected = selectedCount > 0;
  const targetLabel = isSelected
    ? `${selectedCount} selected`
    : `All (${totalComponentsCount} comps)`;

  return (
    <div
      id="circuit-rotation-toolbar"
      className={`flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 rounded-lg p-1 shadow-lg backdrop-blur-xs text-xs text-slate-200 select-none ${className}`}
    >
      <div className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] text-slate-400 font-medium border-r border-slate-700/70">
        <Compass className="w-3.5 h-3.5 text-sky-400 shrink-0" />
        {!isCompact && (
          <span className="hidden sm:inline text-slate-300 font-semibold">Rotate:</span>
        )}
        <span className="text-[10px] text-sky-300 font-mono">{targetLabel}</span>
      </div>

      {/* 90° Clockwise */}
      <button
        id="rotate-cw-90-btn"
        onClick={() => onRotate('cw90')}
        className="p-1.5 rounded hover:bg-slate-800 text-slate-200 hover:text-sky-400 transition-colors flex items-center gap-1"
        title={`Rotate 90° Clockwise (Shortcut: R) — ${targetLabel}`}
      >
        <RotateCw className="w-3.5 h-3.5" />
        <span className="text-[10px] font-mono">90°</span>
      </button>

      {/* 90° Counter-Clockwise */}
      <button
        id="rotate-ccw-90-btn"
        onClick={() => onRotate('ccw90')}
        className="p-1.5 rounded hover:bg-slate-800 text-slate-200 hover:text-sky-400 transition-colors flex items-center gap-1"
        title={`Rotate 90° Counter-Clockwise (Shortcut: Shift+R) — ${targetLabel}`}
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span className="text-[10px] font-mono">-90°</span>
      </button>

      {/* 180° Invert */}
      <button
        id="rotate-180-btn"
        onClick={() => onRotate('180')}
        className="p-1.5 rounded hover:bg-slate-800 text-slate-200 hover:text-sky-400 transition-colors flex items-center gap-1"
        title={`Rotate 180° (Invert) — ${targetLabel}`}
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span className="text-[10px] font-mono">180°</span>
      </button>

      {/* Flip Horizontal */}
      <button
        id="flip-horizontal-btn"
        onClick={() => onRotate('flipH')}
        className="p-1.5 rounded hover:bg-slate-800 text-slate-200 hover:text-amber-400 transition-colors flex items-center gap-1"
        title={`Flip Horizontally (Mirror X) — ${targetLabel}`}
      >
        <FlipHorizontal className="w-3.5 h-3.5" />
        <span className="text-[10px]">Flip H</span>
      </button>

      {/* Flip Vertical */}
      <button
        id="flip-vertical-btn"
        onClick={() => onRotate('flipV')}
        className="p-1.5 rounded hover:bg-slate-800 text-slate-200 hover:text-amber-400 transition-colors flex items-center gap-1"
        title={`Flip Vertically (Mirror Y) — ${targetLabel}`}
      >
        <FlipVertical className="w-3.5 h-3.5" />
        <span className="text-[10px]">Flip V</span>
      </button>
    </div>
  );
};
