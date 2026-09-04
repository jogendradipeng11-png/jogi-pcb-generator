import React, { useState } from 'react';
import {
  COMPONENT_CATALOG,
  getComponentDef,
} from '../../data/components';
import {
  ComponentCategory,
  ComponentDefinition,
} from '../../types';
import {
  Search,
  Zap,
  Layers,
  Cpu,
  Radio,
  ToggleLeft,
  Sliders,
  Maximize2,
} from 'lucide-react';

interface ComponentLibraryPanelProps {
  onSelectComponentToPlace: (def: ComponentDefinition) => void;
  selectedDef: ComponentDefinition | null;
}

const CATEGORIES: { id: ComponentCategory | 'all'; label: string; icon: any }[] = [
  { id: 'all', label: 'All', icon: Layers },
  { id: 'power', label: 'Power/GND', icon: Zap },
  { id: 'passive', label: 'Passives', icon: Sliders },
  { id: 'semiconductors', label: 'Discrete', icon: Radio },
  { id: 'ics', label: 'ICs & MCUs', icon: Cpu },
  { id: 'switches', label: 'Switches', icon: ToggleLeft },
  { id: 'connectors', label: 'Connectors', icon: Maximize2 },
];

export const ComponentLibraryPanel: React.FC<ComponentLibraryPanelProps> = ({
  onSelectComponentToPlace,
  selectedDef,
}) => {
  const [activeCategory, setActiveCategory] = useState<ComponentCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredComponents = COMPONENT_CATALOG.filter((comp) => {
    const matchesCat = activeCategory === 'all' || comp.category === activeCategory;
    const matchesSearch =
      comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.defaultVal.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.prefix.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="w-64 h-full flex flex-col bg-slate-900 border-r border-slate-800 select-none text-slate-200">
      {/* Search Header */}
      <div className="p-3 border-b border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-sky-400" />
            Component Catalog
          </span>
          <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded font-mono">
            {filteredComponents.length} parts
          </span>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search R, C, 555, LM358, MCU..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono transition-colors"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="px-2 py-2 border-b border-slate-800 flex flex-wrap gap-1 bg-slate-950/40">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                isActive
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3 h-3" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Components List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filteredComponents.map((comp) => {
          const isSelected = selectedDef?.type === comp.type;
          return (
            <div
              key={comp.type}
              onClick={() => onSelectComponentToPlace(comp)}
              className={`p-2.5 rounded-lg border transition-all cursor-pointer group ${
                isSelected
                  ? 'bg-sky-950/70 border-sky-500 shadow-sm'
                  : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-sky-300 transition-colors">
                    {comp.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Def: <span className="text-sky-400">{comp.defaultVal}</span> • {comp.defaultFootprint}
                  </div>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-900 text-slate-400 rounded border border-slate-800">
                  {comp.prefix}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                {comp.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Bottom Placement Helper Hint */}
      {selectedDef && (
        <div className="p-2.5 bg-sky-950 border-t border-sky-800/60 text-[11px] text-sky-200 flex items-center justify-between font-mono">
          <span>Click on canvas to place {selectedDef.prefix}</span>
          <button
            onClick={() => onSelectComponentToPlace(null as any)}
            className="text-sky-400 hover:text-sky-200 underline text-[10px]"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
