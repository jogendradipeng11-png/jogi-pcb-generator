import React, { useState } from 'react';
import {
  COMPONENT_CATALOG,
  getComponentDef,
} from '../../data/components';
import {
  ComponentCategory,
  ComponentDefinition,
} from '../../types';
import { RealProductImage } from '../../utils/componentImages';
import {
  Search,
  Zap,
  Layers,
  Cpu,
  Radio,
  ToggleLeft,
  Sliders,
  Maximize2,
  FileText,
  Globe,
} from 'lucide-react';

interface ComponentLibraryPanelProps {
  onSelectComponentToPlace: (def: ComponentDefinition) => void;
  selectedDef: ComponentDefinition | null;
  onOpenGoogleRefModal?: () => void;
  onOpenAllDataSheetModal?: () => void;
  onOpenCircuitsDiyModal?: () => void;
  onOpenPinoutModal?: () => void;
}

const CATEGORIES: { id: ComponentCategory | 'all'; label: string; icon: any }[] = [
  { id: 'all', label: 'All', icon: Layers },
  { id: 'modules', label: 'MCUs & Dev', icon: Cpu },
  { id: 'sensors', label: 'Sensors', icon: Radio },
  { id: 'power', label: 'Power/GND', icon: Zap },
  { id: 'passive', label: 'Passives', icon: Sliders },
  { id: 'semiconductors', label: 'Discrete', icon: Radio },
  { id: 'ics', label: 'ICs', icon: Cpu },
  { id: 'electromechanical', label: 'Motors/Relays', icon: Maximize2 },
  { id: 'switches', label: 'Switches', icon: ToggleLeft },
  { id: 'connectors', label: 'Connectors', icon: Maximize2 },
];

export const ComponentLibraryPanel: React.FC<ComponentLibraryPanelProps> = ({
  onSelectComponentToPlace,
  selectedDef,
  onOpenGoogleRefModal,
  onOpenAllDataSheetModal,
  onOpenCircuitsDiyModal,
  onOpenPinoutModal,
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

        {/* Quick Access to Circuits-DIY, Pinouts, AllDataSheet and Web Reference */}
        <div className="grid grid-cols-1 gap-1.5">
          {onOpenCircuitsDiyModal && (
            <button
              onClick={onOpenCircuitsDiyModal}
              className="w-full py-1.5 px-2 bg-gradient-to-r from-emerald-800 via-teal-700 to-emerald-700 hover:from-emerald-700 hover:to-teal-600 text-white rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer border border-emerald-500/50"
              title="Browse and import circuits directly from https://www.circuits-diy.com/"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-300" />
              <span>Circuits-DIY Schematics</span>
            </button>
          )}

          {onOpenPinoutModal && (
            <button
              onClick={onOpenPinoutModal}
              className="w-full py-1 px-2 bg-slate-800 hover:bg-slate-750 text-sky-300 rounded-md text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-sky-600/40 hover:border-sky-500"
              title="View pinout diagrams, roles, uses, or register missing components"
            >
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              <span>Pinout Maps &amp; Add Part</span>
            </button>
          )}

          {onOpenAllDataSheetModal && (
            <button
              onClick={onOpenAllDataSheetModal}
              className="w-full py-1.5 px-2 bg-gradient-to-r from-blue-700 via-sky-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-500 text-white rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer border border-sky-400/40"
              title="Search official manufacturer datasheets, pinouts and photos from AllDataSheet.com"
            >
              <FileText className="w-3.5 h-3.5 text-sky-200" />
              <span>AllDataSheet.com Search</span>
            </button>
          )}

          {onOpenGoogleRefModal && (
            <button
              onClick={onOpenGoogleRefModal}
              className="w-full py-1 px-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-md text-[10px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-700"
            >
              <span className="text-amber-300">✨</span>
              <span>Add from Web Reference</span>
            </button>
          )}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Arduino, ESP32, 555..."
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

      {/* Quick Power, Source (+ / -), and Earthing Reference Bar */}
      <div className="p-2 border-b border-slate-800 bg-slate-950/70">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1 text-sky-300">
            <Zap className="w-3 h-3 text-amber-400" />
            Circuit References
          </span>
          <span className="text-[9px] text-slate-500 font-mono">1-Click Place</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onSelectComponentToPlace(getComponentDef('dc_source'))}
            className="p-1.5 rounded bg-slate-900 hover:bg-slate-850 border border-sky-600/40 hover:border-sky-400 text-left transition-all cursor-pointer group"
            title="Place DC Voltage Source with + terminal and - terminal"
          >
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-slate-800 border border-sky-400 flex items-center justify-center text-[10px] font-bold text-sky-300 shrink-0">
                ±
              </span>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-slate-200 truncate group-hover:text-sky-300">DC Source</div>
                <div className="text-[9px] text-sky-400 font-mono">+ / - 12V</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelectComponentToPlace(getComponentDef('source_pos_point'))}
            className="p-1.5 rounded bg-slate-900 hover:bg-slate-850 border border-red-500/40 hover:border-red-400 text-left transition-all cursor-pointer group"
            title="Place + Source Voltage Point (+V Reference)"
          >
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-xs">
                +
              </span>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-slate-200 truncate group-hover:text-red-300">+ Point</div>
                <div className="text-[9px] text-red-400 font-mono">+V Rail</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelectComponentToPlace(getComponentDef('source_neg_point'))}
            className="p-1.5 rounded bg-slate-900 hover:bg-slate-850 border border-sky-500/40 hover:border-sky-400 text-left transition-all cursor-pointer group"
            title="Place - Negative Point (-Ve / 0V Return Reference)"
          >
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-sky-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-xs">
                -
              </span>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-slate-200 truncate group-hover:text-sky-300">-ve Point</div>
                <div className="text-[9px] text-sky-400 font-mono">0V Return</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelectComponentToPlace(getComponentDef('earth_ground'))}
            className="p-1.5 rounded bg-slate-900 hover:bg-slate-850 border border-emerald-500/40 hover:border-emerald-400 text-left transition-all cursor-pointer group"
            title="Place Protective Earthing Point (⏚ PE)"
          >
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-xs">
                ⏚
              </span>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-slate-200 truncate group-hover:text-emerald-300">Earthing</div>
                <div className="text-[9px] text-emerald-400 font-mono">PE Ground</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Components List with Real Product Photography */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filteredComponents.map((comp, idx) => {
          const isSelected = selectedDef?.type === comp.type;
          return (
            <div
              key={`${comp.type}_${idx}`}
              onClick={() => onSelectComponentToPlace(comp)}
              className={`p-2 rounded-lg border transition-all cursor-pointer group ${
                isSelected
                  ? 'bg-sky-950/70 border-sky-500 shadow-sm'
                  : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {/* Real Product Image Preview Thumbnail */}
                <RealProductImage
                  partNumberOrType={comp.defaultVal || comp.type}
                  category={comp.category}
                  footprint={comp.defaultFootprint}
                  customUrl={comp.imageUrl}
                  className="w-10 h-10 rounded-md border border-slate-700 shadow-xs shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-sky-300 transition-colors truncate">
                      {comp.name}
                    </div>
                    <span className="text-[9px] font-mono px-1 py-0.2 bg-slate-900 text-slate-400 rounded border border-slate-800 shrink-0">
                      {comp.prefix}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">
                    <span className="text-sky-400">{comp.defaultVal}</span> • {comp.defaultFootprint}
                  </div>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                    {comp.description}
                  </p>
                </div>
              </div>
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
