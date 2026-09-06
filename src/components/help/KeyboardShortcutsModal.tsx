import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Keyboard,
  Search,
  MousePointer,
  Zap,
  Activity,
  RotateCw,
  Trash2,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Hand,
  Play,
  HelpCircle,
  Command,
} from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTool?: (tool: any) => void;
}

interface ShortcutItem {
  keys: string[];
  label: string;
  description: string;
  category: 'tools' | 'components' | 'canvas' | 'simulation';
  icon?: React.ReactNode;
}

const SHORTCUTS_DATA: ShortcutItem[] = [
  // Tools
  {
    keys: ['W'],
    label: 'Wire Tool',
    description: 'Toggle orthogonal wire placement mode between component pins',
    category: 'tools',
    icon: <Zap className="w-3.5 h-3.5 text-amber-400" />,
  },
  {
    keys: ['S'],
    label: 'Select Tool',
    description: 'Return to default selection cursor for moving and inspecting items',
    category: 'tools',
    icon: <MousePointer className="w-3.5 h-3.5 text-sky-400" />,
  },
  {
    keys: ['P'],
    label: 'Virtual Probe',
    description: 'Toggle signal probe cursor to attach oscilloscope channel to nets',
    category: 'tools',
    icon: <Activity className="w-3.5 h-3.5 text-emerald-400" />,
  },
  {
    keys: ['H'],
    label: 'Hand / Pan Tool',
    description: 'Pan around the schematic canvas without moving components',
    category: 'tools',
    icon: <Hand className="w-3.5 h-3.5 text-slate-400" />,
  },
  {
    keys: ['E'],
    label: 'Erase Tool',
    description: 'Click on wires or components to quickly delete them',
    category: 'tools',
    icon: <Trash2 className="w-3.5 h-3.5 text-rose-400" />,
  },
  {
    keys: ['N'],
    label: 'Net Label Tool',
    description: 'Place named net tags (e.g. VCC, GND, RESET) to create logical links',
    category: 'tools',
    icon: <Command className="w-3.5 h-3.5 text-indigo-400" />,
  },

  // Component manipulation
  {
    keys: ['R'],
    label: 'Rotate 90°',
    description: 'Rotate selected components 90 degrees clockwise',
    category: 'components',
    icon: <RotateCw className="w-3.5 h-3.5 text-cyan-400" />,
  },
  {
    keys: ['Del', 'Backspace'],
    label: 'Delete Selection',
    description: 'Remove selected components, wire branches, or net labels',
    category: 'components',
    icon: <Trash2 className="w-3.5 h-3.5 text-rose-400" />,
  },
  {
    keys: ['Esc'],
    label: 'Cancel / Clear',
    description: 'Cancel in-progress wire drawing, unselect components, or dismiss probe',
    category: 'components',
    icon: <X className="w-3.5 h-3.5 text-slate-400" />,
  },

  // History & Canvas
  {
    keys: ['Ctrl', 'Z'],
    label: 'Undo Action',
    description: 'Revert the most recent schematic edit or component placement',
    category: 'canvas',
    icon: <Undo2 className="w-3.5 h-3.5 text-slate-300" />,
  },
  {
    keys: ['Ctrl', 'Y'],
    label: 'Redo Action',
    description: 'Re-apply previously undone edits (or Ctrl + Shift + Z)',
    category: 'canvas',
    icon: <Redo2 className="w-3.5 h-3.5 text-slate-300" />,
  },
  {
    keys: ['+'],
    label: 'Zoom In',
    description: 'Magnify canvas view centered on current cursor position',
    category: 'canvas',
    icon: <ZoomIn className="w-3.5 h-3.5 text-slate-300" />,
  },
  {
    keys: ['-'],
    label: 'Zoom Out',
    description: 'Reduce canvas magnification to see broader circuit topology',
    category: 'canvas',
    icon: <ZoomOut className="w-3.5 h-3.5 text-slate-300" />,
  },
  {
    keys: ['0'],
    label: 'Zoom to Fit',
    description: 'Reset magnification and center schematic in viewport',
    category: 'canvas',
    icon: <Maximize className="w-3.5 h-3.5 text-slate-300" />,
  },

  // Simulation
  {
    keys: ['Space'],
    label: 'Play / Pause Sim',
    description: 'Toggle real-time SPICE physics simulation loop on or off',
    category: 'simulation',
    icon: <Play className="w-3.5 h-3.5 text-emerald-400" />,
  },
  {
    keys: ['?'],
    label: 'Help Shortcuts',
    description: 'Toggle this keyboard shortcuts reference dialog',
    category: 'simulation',
    icon: <HelpCircle className="w-3.5 h-3.5 text-sky-400" />,
  },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  onSelectTool,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredShortcuts = useMemo(() => {
    return SHORTCUTS_DATA.filter((item) => {
      const matchesCategory =
        activeCategory === 'all' || item.category === activeCategory;
      const matchesQuery =
        searchQuery.trim() === '' ||
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.keys.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesQuery;
    });
  }, [searchQuery, activeCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn font-sans">
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg border border-sky-500/30">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Keyboard Shortcuts
                <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-mono border border-slate-700">
                  Quick Reference
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Speed up schematic capture, wiring, and simulation testing
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="px-6 py-3 bg-slate-900 border-b border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shortcuts (e.g., wire, rotate, undo)..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-sky-500"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            {[
              { id: 'all', label: 'All' },
              { id: 'tools', label: 'Tools' },
              { id: 'components', label: 'Actions' },
              { id: 'canvas', label: 'Canvas' },
              { id: 'simulation', label: 'Simulation' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  activeCategory === tab.id
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredShortcuts.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-950/60 hover:bg-slate-850/60 border border-slate-800 hover:border-slate-700 rounded-xl transition-all flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg group-hover:border-slate-700 transition-colors flex-shrink-0">
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-200 truncate">
                      {item.label}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {item.description}
                    </div>
                  </div>
                </div>

                {/* Keycaps */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {item.keys.map((k, kIdx) => (
                    <React.Fragment key={k}>
                      {kIdx > 0 && <span className="text-slate-500 text-[10px]">+</span>}
                      <kbd className="px-2 py-0.5 min-w-[24px] text-center bg-slate-900 border border-slate-700 rounded-md font-mono text-xs font-bold text-sky-300 shadow-xs">
                        {k}
                      </kbd>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {filteredShortcuts.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-xs">
              No shortcuts found matching "{searchQuery}".
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-mono text-slate-500">Tip:</span>
            <span>Press <kbd className="px-1.5 py-0.2 bg-slate-900 border border-slate-700 rounded text-sky-400 font-mono">?</kbd> at any time to open this dialog</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
