import React, { useState, useMemo } from 'react';
import {
  COMPONENT_CATALOG,
  getComponentDef,
} from '../../data/components';
import { REAL_PRODUCT_CATALOG, RealProductPart } from '../../data/realComponents';
import {
  CIRCUITS_DIY_PROJECTS,
  loadCircuitsDiyCircuit,
} from '../../data/circuitsDiyCatalog';
import {
  ALL_DATASHEET_CATALOG,
} from '../../data/allDataSheetCatalog';
import {
  ComponentCategory,
  ComponentDefinition,
  SchematicDocument,
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
  Plus,
  Package,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Maximize,
  X,
  ExternalLink,
} from 'lucide-react';

export type SidebarCatalogTab =
  | 'components'
  | 'power_rails'
  | 'real_parts'
  | 'circuits_diy'
  | 'datasheets';

interface ComponentLibraryPanelProps {
  onSelectComponentToPlace: (def: ComponentDefinition) => void;
  selectedDef: ComponentDefinition | null;
  onOpenGoogleRefModal?: () => void;
  onOpenAllDataSheetModal?: () => void;
  onOpenCircuitsDiyModal?: () => void;
  onOpenPinoutModal?: () => void;
  onOpenFullCatalogModal?: (tab?: any) => void;
  onLoadCircuit?: (circuit: SchematicDocument) => void;
  onAppendCircuit?: (circuit: SchematicDocument) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const CATEGORIES: { id: ComponentCategory | 'all'; label: string; icon: any }[] = [
  { id: 'all', label: 'All', icon: Layers },
  { id: 'modules', label: 'MCUs & Dev', icon: Cpu },
  { id: 'sensors', label: 'Sensors', icon: Radio },
  { id: 'ics', label: 'ICs', icon: Cpu },
  { id: 'semiconductors', label: 'Discrete', icon: Radio },
  { id: 'passive', label: 'Passives', icon: Sliders },
  { id: 'power', label: 'Power/Reg', icon: Zap },
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
  onOpenFullCatalogModal,
  onLoadCircuit,
  onAppendCircuit,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [activeTab, setActiveTab] = useState<SidebarCatalogTab>('components');
  const [panelWidth, setPanelWidth] = useState<'normal' | 'wide'>('normal'); // normal = 320px, wide = 420px
  const [activeCategory, setActiveCategory] = useState<ComponentCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter components catalog
  const filteredComponents = useMemo(() => {
    return COMPONENT_CATALOG.filter((comp) => {
      const matchesCat = activeCategory === 'all' || comp.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        comp.name.toLowerCase().includes(q) ||
        comp.defaultVal.toLowerCase().includes(q) ||
        comp.prefix.toLowerCase().includes(q) ||
        comp.defaultFootprint.toLowerCase().includes(q) ||
        comp.description.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  // Filter real parts
  const filteredRealParts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return REAL_PRODUCT_CATALOG.slice(0, 30);
    return REAL_PRODUCT_CATALOG.filter(
      (p) =>
        p.manufacturerPartNumber.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.manufacturer.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Filter Circuits-DIY projects
  const filteredDiyProjects = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return CIRCUITS_DIY_PROJECTS;
    return CIRCUITS_DIY_PROJECTS.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.summary && p.summary.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Filter AllDataSheet
  const filteredDataSheets = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return ALL_DATASHEET_CATALOG.slice(0, 30);
    return ALL_DATASHEET_CATALOG.filter(
      (item) =>
        item.partNumber.toLowerCase().includes(q) ||
        item.manufacturer.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Collapsed View - slim rail
  if (isCollapsed) {
    return (
      <div className="w-12 h-full flex flex-col items-center py-3 bg-slate-900 border-r border-slate-800 select-none text-slate-200 z-10 shrink-0">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-2 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer mb-3"
          title="Expand Component Catalog Panel"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="flex flex-col gap-2 w-full px-1.5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('components');
              if (onToggleCollapse) onToggleCollapse();
            }}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            title="Standard EDA Components"
          >
            <Cpu className="w-4 h-4 text-sky-400" />
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('power_rails');
              if (onToggleCollapse) onToggleCollapse();
            }}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            title="Power Rails (+V, GND, PE)"
          >
            <Zap className="w-4 h-4 text-amber-400" />
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('real_parts');
              if (onToggleCollapse) onToggleCollapse();
            }}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            title="Real Hardware Parts"
          >
            <Package className="w-4 h-4 text-emerald-400" />
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('circuits_diy');
              if (onToggleCollapse) onToggleCollapse();
            }}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            title="Circuits-DIY Schematics"
          >
            <Globe className="w-4 h-4 text-teal-400" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (onOpenFullCatalogModal) {
                onOpenFullCatalogModal('components');
              } else if (onToggleCollapse) {
                onToggleCollapse();
              }
            }}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer mt-auto"
            title="Open Fullscreen Component Catalog Hub"
          >
            <Maximize className="w-4 h-4 text-sky-300" />
          </button>
        </div>
      </div>
    );
  }

  const widthClass = panelWidth === 'wide' ? 'w-[420px]' : 'w-80';

  return (
    <div
      className={`${widthClass} h-full flex flex-col bg-slate-900 border-r border-slate-800 select-none text-slate-200 shrink-0 z-10`}
    >
      {/* Top Header: Title, Controls, & Fullscreen Trigger */}
      <div className="p-3 border-b border-slate-800 bg-slate-950 space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Cpu className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-xs font-bold text-slate-100 uppercase tracking-wider truncate">
              Component Catalog
            </span>
            <span className="text-[10px] px-1.5 py-0.2 bg-sky-950 text-sky-400 border border-sky-800 rounded font-mono shrink-0">
              {COMPONENT_CATALOG.length}+
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Toggle Width */}
            <button
              type="button"
              onClick={() => setPanelWidth((prev) => (prev === 'normal' ? 'wide' : 'normal'))}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-850 rounded text-xs transition-colors cursor-pointer"
              title={panelWidth === 'normal' ? 'Expand Width (420px)' : 'Normal Width (320px)'}
            >
              {panelWidth === 'normal' ? '⤢ Wide' : '⤡ Normal'}
            </button>

            {/* Launch Fullscreen Catalog Modal */}
            <button
              type="button"
              onClick={() => {
                if (onOpenFullCatalogModal) {
                  onOpenFullCatalogModal(activeTab);
                } else if (onOpenGoogleRefModal) {
                  onOpenGoogleRefModal();
                }
              }}
              className="p-1 text-sky-400 hover:text-sky-200 hover:bg-sky-950 rounded transition-colors cursor-pointer"
              title="Open Complete Fullscreen Component Catalog Hub"
            >
              <Maximize className="w-3.5 h-3.5" />
            </button>

            {/* Collapse Sidebar Button */}
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-850 rounded transition-colors cursor-pointer"
                title="Collapse Sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search Bar with Instant Clear */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'components'
                ? 'Search 310+ parts (ESP32, Relay, 555...)'
                : activeTab === 'power_rails'
                ? 'Filter power rails & references...'
                : activeTab === 'real_parts'
                ? 'Search DigiKey / Mouser parts...'
                : 'Search catalog...'
            }
            className="w-full pl-8 pr-7 py-1.5 bg-slate-900 border border-slate-750 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Navigation Tabs Bar - Clearly Visible & Clickable */}
      <div className="flex items-center px-2 py-1.5 border-b border-slate-800 bg-slate-950/70 gap-1 overflow-x-auto text-[11px] shrink-0 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('components')}
          className={`px-2.5 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'components'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="All Standard Schematic Components"
        >
          <Layers className="w-3 h-3" />
          <span>Parts</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('power_rails')}
          className={`px-2.5 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'power_rails'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="Power Supplies, Sources, VCC, and Earth Ground Rails"
        >
          <Zap className="w-3 h-3 text-amber-300" />
          <span>Power</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('real_parts')}
          className={`px-2.5 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'real_parts'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="Real DigiKey & Mouser Hardware Components"
        >
          <Package className="w-3 h-3 text-emerald-300" />
          <span>Real</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('circuits_diy')}
          className={`px-2.5 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'circuits_diy'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="Circuits-DIY Verified Schematic Modules"
        >
          <Globe className="w-3 h-3 text-teal-300" />
          <span>Modules</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('datasheets')}
          className={`px-2.5 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'datasheets'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="AllDataSheet.com Manufacturer ICs & Pinouts"
        >
          <FileText className="w-3 h-3 text-indigo-300" />
          <span>Datasheets</span>
        </button>
      </div>

      {/* TAB 1: STANDARD EDA COMPONENTS */}
      {activeTab === 'components' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Category Horizontal Filter Row */}
          <div className="px-2 py-1.5 border-b border-slate-800 bg-slate-950/40 flex items-center gap-1 overflow-x-auto shrink-0 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className="w-3 h-3 opacity-80" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Sub-Actions Bar */}
          <div className="px-2.5 py-1.5 border-b border-slate-800 bg-slate-950/20 flex items-center justify-between text-[10px] shrink-0">
            <span className="text-slate-400 font-mono">
              {filteredComponents.length} components available
            </span>
            {onOpenPinoutModal && (
              <button
                type="button"
                onClick={onOpenPinoutModal}
                className="text-sky-400 hover:text-sky-200 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>+ Custom Part</span>
              </button>
            )}
          </div>

          {/* Component Items List - Takes all remaining height with smooth scrolling */}
          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
            {filteredComponents.map((comp, idx) => {
              const isSelected = selectedDef?.type === comp.type;
              return (
                <div
                  key={`${comp.type}_${idx}`}
                  onClick={() => onSelectComponentToPlace(comp)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer group ${
                    isSelected
                      ? 'bg-sky-950/80 border-sky-500 shadow-md ring-1 ring-sky-500/50'
                      : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <RealProductImage
                      partNumberOrType={comp.defaultVal || comp.type}
                      category={comp.category}
                      footprint={comp.defaultFootprint}
                      customUrl={comp.imageUrl}
                      className="w-10 h-10 rounded-md border border-slate-700 bg-slate-900 shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-slate-100 group-hover:text-sky-300 transition-colors truncate">
                          {comp.name}
                        </span>
                        <span className="text-[9px] font-mono px-1 py-0.2 bg-slate-900 text-slate-400 rounded border border-slate-800 shrink-0">
                          {comp.prefix}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                        <span className="text-sky-400">{comp.defaultVal}</span> • {comp.defaultFootprint}
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-500 truncate mt-0.5">
                        <span className="text-emerald-400 font-mono">{comp.pins.length} pins</span>
                        <span>•</span>
                        <span className="truncate">{comp.description}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectComponentToPlace(comp);
                      }}
                      className="px-2 py-1 bg-sky-700 group-hover:bg-sky-600 text-white rounded text-[10px] font-semibold transition-colors shrink-0"
                    >
                      Place
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: POWER & NET RAILS */}
      {activeTab === 'power_rails' && (
        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
          <div className="p-2 bg-amber-950/30 border border-amber-800/40 rounded-lg text-xs text-amber-200">
            <span className="font-bold flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              1-Click Power &amp; Net Reference Rails
            </span>
            <p className="text-[11px] text-amber-300/80 mt-0.5">
              Click any power source, rail, or earthing ground to place directly on canvas.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            {[
              {
                type: 'dc_source',
                name: 'DC Voltage Source (±)',
                val: '±12V / 5V Source',
                badge: '± DC',
                color: 'sky',
              },
              {
                type: 'ac_source',
                name: 'AC Voltage Source (~)',
                val: '230V / 110V AC',
                badge: '~ AC',
                color: 'amber',
              },
              {
                type: 'source_pos_point',
                name: '+ Source Voltage Point (+Vcc)',
                val: '+5V / +3.3V Rail',
                badge: '+ Rail',
                color: 'red',
              },
              {
                type: 'source_neg_point',
                name: '- Negative Point (-Ve)',
                val: '0V / Return Lead',
                badge: '- Lead',
                color: 'blue',
              },
              {
                type: 'ground',
                name: 'Signal Ground (GND ⏚)',
                val: '0V Circuit Common',
                badge: 'GND',
                color: 'emerald',
              },
              {
                type: 'earth_ground',
                name: 'Protective Earth Ground (PE)',
                val: 'Chassis Safety Earth',
                badge: 'PE Earth',
                color: 'emerald',
              },
              {
                type: 'battery',
                name: '18650 Li-ion Battery',
                val: '3.7V / 4.2V Cell',
                badge: 'Battery',
                color: 'violet',
              },
              {
                type: 'regulator_lm7805',
                name: 'LM7805 Linear Regulator',
                val: '5V 1.5A Linear',
                badge: 'Regulator',
                color: 'teal',
              },
              {
                type: 'regulator_ams1117',
                name: 'AMS1117-3.3V LDO',
                val: '3.3V 800mA',
                badge: 'LDO',
                color: 'teal',
              },
            ].map((item) => {
              const def = getComponentDef(item.type);
              return (
                <div
                  key={item.type}
                  onClick={() => onSelectComponentToPlace(def)}
                  className="p-2 bg-slate-950/60 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/50 rounded-lg flex items-center justify-between cursor-pointer transition-all group"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                      {item.name}
                    </div>
                    <div className="text-[10px] text-amber-400 font-mono mt-0.5">{item.val}</div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectComponentToPlace(def);
                    }}
                    className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-semibold transition-colors"
                  >
                    Place
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: REAL HARDWARE PARTS */}
      {activeTab === 'real_parts' && (
        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
          <div className="p-2 bg-emerald-950/30 border border-emerald-800/40 rounded-lg text-xs text-emerald-200">
            <span className="font-bold flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-emerald-400" />
              DigiKey / Mouser Real Hardware Catalog
            </span>
            <p className="text-[10px] text-emerald-300/80 mt-0.5">
              Select verified manufacturer parts with physical footprints for PCB manufacturing.
            </p>
          </div>

          {filteredRealParts.map((part) => (
            <div
              key={part.manufacturerPartNumber}
              onClick={() => {
                const genericDef =
                  COMPONENT_CATALOG.find((c) =>
                    part.manufacturerPartNumber.toLowerCase().includes(c.type)
                  ) || COMPONENT_CATALOG.find((c) => c.category === part.category) || COMPONENT_CATALOG[0];

                const customDef: ComponentDefinition = {
                  ...genericDef,
                  name: part.manufacturerPartNumber,
                  defaultVal: part.manufacturerPartNumber,
                  defaultFootprint: part.packageFootprint,
                  description: part.description,
                };
                onSelectComponentToPlace(customDef);
              }}
              className="p-2.5 bg-slate-950/50 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 rounded-lg flex items-center gap-2.5 cursor-pointer transition-all group"
            >
              <RealProductImage
                partNumberOrType={part.manufacturerPartNumber}
                category={part.category}
                footprint={part.packageFootprint}
                customUrl={part.imageUrl}
                className="w-10 h-10 rounded-md border border-slate-700 bg-slate-900 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white truncate font-mono group-hover:text-emerald-300">
                  {part.manufacturerPartNumber}
                </div>
                <div className="text-[10px] text-emerald-400 truncate">
                  {part.manufacturer} • ${part.typicalUnitPrice.toFixed(2)}
                </div>
                <div className="text-[9px] text-slate-500 truncate">
                  {part.packageFootprint}
                </div>
              </div>
              <button
                type="button"
                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-semibold shrink-0"
              >
                Place
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: CIRCUITS-DIY SCHEMATICS */}
      {activeTab === 'circuits_diy' && (
        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
          <div className="p-2 bg-teal-950/30 border border-teal-800/40 rounded-lg text-xs text-teal-200">
            <span className="font-bold flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-teal-400" />
              Circuits-DIY Verified Schematic Modules
            </span>
            <p className="text-[10px] text-teal-300/80 mt-0.5">
              Click to load complete tested circuit modules into your workspace.
            </p>
          </div>

          {filteredDiyProjects.map((proj) => (
            <div
              key={proj.id}
              className="p-3 bg-slate-950/50 hover:bg-slate-850 border border-slate-800 hover:border-teal-500/50 rounded-lg space-y-1.5 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-teal-300 uppercase">
                  {proj.category}
                </span>
                <span className="text-[10px] text-slate-400">
                  {proj.keyComponents.length} parts
                </span>
              </div>
              <h4 className="text-xs font-bold text-white line-clamp-1">{proj.title}</h4>
              <p className="text-[10px] text-slate-400 line-clamp-2">{proj.summary}</p>

              <div className="flex gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const loaded = loadCircuitsDiyCircuit(proj.id);
                    if (loaded && onLoadCircuit) {
                      onLoadCircuit(loaded);
                    }
                  }}
                  className="flex-1 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded text-[10px] font-semibold transition-colors cursor-pointer text-center"
                >
                  Load Circuit
                </button>
                {onAppendCircuit && (
                  <button
                    type="button"
                    onClick={() => {
                      const loaded = loadCircuitsDiyCircuit(proj.id);
                      if (loaded && onAppendCircuit) {
                        onAppendCircuit(loaded);
                      }
                    }}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-medium transition-colors cursor-pointer"
                  >
                    Append
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 5: ALLDATASHEET ICS */}
      {activeTab === 'datasheets' && (
        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
          <div className="p-2 bg-indigo-950/30 border border-indigo-800/40 rounded-lg text-xs text-indigo-200">
            <span className="font-bold flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              AllDataSheet.com Manufacturer ICs
            </span>
            <p className="text-[10px] text-indigo-300/80 mt-0.5">
              Verified pinout assignments and official manufacturer specs.
            </p>
          </div>

          {filteredDataSheets.map((item) => (
            <div
              key={item.partNumber}
              onClick={() => {
                const genericDef =
                  COMPONENT_CATALOG.find((c) =>
                    item.partNumber.toLowerCase().includes(c.type)
                  ) || COMPONENT_CATALOG.find((c) => c.category === 'ics') || COMPONENT_CATALOG[0];

                const customDef: ComponentDefinition = {
                  ...genericDef,
                  name: item.partNumber,
                  defaultVal: item.partNumber,
                  defaultFootprint: item.package,
                  description: item.description,
                };
                onSelectComponentToPlace(customDef);
              }}
              className="p-2.5 bg-slate-950/50 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 rounded-lg flex items-center justify-between cursor-pointer transition-all group"
            >
              <div className="min-w-0 flex-1 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white font-mono group-hover:text-indigo-300">
                    {item.partNumber}
                  </span>
                  <span className="text-[9px] px-1 py-0.2 bg-slate-800 text-indigo-300 rounded font-mono">
                    {item.package}
                  </span>
                </div>
                <div className="text-[10px] text-indigo-400 truncate mt-0.5">{item.manufacturer}</div>
                <p className="text-[9px] text-slate-500 truncate mt-0.5">{item.description}</p>
              </div>
              <button
                type="button"
                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-semibold shrink-0"
              >
                Place
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Placement Helper Hint */}
      {selectedDef && (
        <div className="p-2.5 bg-sky-950 border-t border-sky-800/60 text-xs text-sky-200 flex items-center justify-between font-mono shrink-0">
          <span className="truncate">Click canvas to place {selectedDef.prefix}</span>
          <button
            type="button"
            onClick={() => onSelectComponentToPlace(null as any)}
            className="text-sky-400 hover:text-sky-200 underline text-[11px] ml-2 shrink-0 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
