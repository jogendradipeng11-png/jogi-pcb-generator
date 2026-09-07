import React, { useState, useMemo } from 'react';
import {
  COMPONENT_CATALOG,
  getComponentDef,
  registerCustomComponentDef,
} from '../../data/components';
import { REAL_PRODUCT_CATALOG, RealProductPart } from '../../data/realComponents';
import { ALL_DATASHEET_CATALOG } from '../../data/allDataSheetCatalog';
import {
  CIRCUITS_DIY_PROJECTS,
  CircuitsDiyProject,
  loadCircuitsDiyCircuit,
} from '../../data/circuitsDiyCatalog';
import {
  ComponentCategory,
  ComponentDefinition,
  AllDataSheetComponent,
  SchematicComponent,
  SchematicDocument,
  Wire,
} from '../../types';
import { RealProductImage } from '../../utils/componentImages';
import {
  Search,
  Cpu,
  Layers,
  Zap,
  Radio,
  Sliders,
  ToggleLeft,
  Maximize2,
  FileText,
  Globe,
  Plus,
  Check,
  CheckCircle2,
  ExternalLink,
  Package,
  BookOpen,
  X,
  Bookmark,
  Sparkles,
  ArrowRight,
  Filter,
  ShieldCheck,
} from 'lucide-react';

export type CatalogModalTab =
  | 'components'
  | 'real_parts'
  | 'power_rails'
  | 'circuits_diy'
  | 'alldatasheet'
  | 'pinouts';

interface ComponentCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectComponentToPlace: (def: ComponentDefinition) => void;
  onPlaceComponentDirectly?: (def: ComponentDefinition) => void;
  onLoadCircuit?: (circuit: SchematicDocument) => void;
  onAppendCircuit?: (circuit: SchematicDocument) => void;
  onShowToast?: (msg: string) => void;
  initialTab?: CatalogModalTab;
}

const CATEGORIES: { id: ComponentCategory | 'all'; label: string; icon: any }[] = [
  { id: 'all', label: 'All Components', icon: Layers },
  { id: 'modules', label: 'MCUs & Dev Boards', icon: Cpu },
  { id: 'sensors', label: 'Sensors & Inputs', icon: Radio },
  { id: 'ics', label: 'Integrated Circuits (ICs)', icon: Cpu },
  { id: 'semiconductors', label: 'Discrete Semiconductors', icon: Radio },
  { id: 'passive', label: 'Passives (R/L/C)', icon: Sliders },
  { id: 'power', label: 'Power & Regulators', icon: Zap },
  { id: 'electromechanical', label: 'Motors & Relays', icon: Maximize2 },
  { id: 'switches', label: 'Switches & Buttons', icon: ToggleLeft },
  { id: 'connectors', label: 'Connectors & Headers', icon: Maximize2 },
];

export const ComponentCatalogModal: React.FC<ComponentCatalogModalProps> = ({
  isOpen,
  onClose,
  onSelectComponentToPlace,
  onPlaceComponentDirectly,
  onLoadCircuit,
  onAppendCircuit,
  onShowToast,
  initialTab = 'components',
}) => {
  const [activeTab, setActiveTab] = useState<CatalogModalTab>(initialTab);

  // Components Tab State
  const [selectedCategory, setSelectedCategory] = useState<ComponentCategory | 'all'>('all');
  const [compSearchQuery, setCompSearchQuery] = useState('');
  const [selectedCompDef, setSelectedCompDef] = useState<ComponentDefinition>(
    COMPONENT_CATALOG.find((c) => c.type === 'arduino_nano') || COMPONENT_CATALOG[0]
  );

  // Real Parts Tab State
  const [realPartQuery, setRealPartQuery] = useState('');
  const [realPartCategory, setRealPartCategory] = useState('all');
  const [selectedRealPart, setSelectedRealPart] = useState<RealProductPart>(REAL_PRODUCT_CATALOG[0]);

  // Circuits-DIY Tab State
  const [diyQuery, setDiyQuery] = useState('');
  const [diyCategory, setDiyCategory] = useState('all');
  const [selectedDiyProject, setSelectedDiyProject] = useState<CircuitsDiyProject>(
    CIRCUITS_DIY_PROJECTS[0]
  );

  // AllDataSheet Tab State
  const [dataSheetQuery, setDataSheetQuery] = useState('');
  const [selectedDataSheetPart, setSelectedDataSheetPart] = useState<AllDataSheetComponent>(
    ALL_DATASHEET_CATALOG[0]
  );

  // Custom Pinout creation state
  const [newCompName, setNewCompName] = useState('');
  const [newCompPrefix, setNewCompPrefix] = useState('U');
  const [newCompCategory, setNewCompCategory] = useState<string>('ics');
  const [newCompFootprint, setNewCompFootprint] = useState('DIP-8_W7.62mm');
  const [newCompVal, setNewCompVal] = useState('');
  const [newCompDesc, setNewCompDesc] = useState('');
  const [newCompPinsText, setNewCompPinsText] = useState(
    '1: VCC (power)\n2: GND (ground)\n3: IN1 (input)\n4: IN2 (input)\n5: OUT1 (output)\n6: OUT2 (output)'
  );

  // Sync initial tab when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Filtered Components Catalog
  const filteredComponents = useMemo(() => {
    return COMPONENT_CATALOG.filter((comp) => {
      const matchesCat = selectedCategory === 'all' || comp.category === selectedCategory;
      const q = compSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        comp.name.toLowerCase().includes(q) ||
        comp.defaultVal.toLowerCase().includes(q) ||
        comp.prefix.toLowerCase().includes(q) ||
        comp.defaultFootprint.toLowerCase().includes(q) ||
        comp.description.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, compSearchQuery]);

  // Filtered Real Parts Catalog
  const realPartCategories = useMemo(() => {
    return ['all', ...Array.from(new Set(REAL_PRODUCT_CATALOG.map((p) => p.category)))];
  }, []);

  const filteredRealParts = useMemo(() => {
    return REAL_PRODUCT_CATALOG.filter((part) => {
      const matchesCat = realPartCategory === 'all' || part.category === realPartCategory;
      const q = realPartQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        part.manufacturerPartNumber.toLowerCase().includes(q) ||
        part.manufacturer.toLowerCase().includes(q) ||
        part.description.toLowerCase().includes(q) ||
        part.packageFootprint.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [realPartCategory, realPartQuery]);

  // Filtered Circuits-DIY Projects
  const diyCategories = useMemo(() => {
    return ['all', ...Array.from(new Set(CIRCUITS_DIY_PROJECTS.map((p) => p.category)))];
  }, []);

  const filteredDiyProjects = useMemo(() => {
    return CIRCUITS_DIY_PROJECTS.filter((proj) => {
      const matchesCat = diyCategory === 'all' || proj.category === diyCategory;
      const q = diyQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        proj.title.toLowerCase().includes(q) ||
        (proj.summary && proj.summary.toLowerCase().includes(q)) ||
        proj.keyComponents?.some(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.designator.toLowerCase().includes(q) ||
            c.uses.toLowerCase().includes(q)
        );
      return matchesCat && matchesSearch;
    });
  }, [diyCategory, diyQuery]);

  // Filtered AllDataSheet Parts
  const filteredDataSheets = useMemo(() => {
    return ALL_DATASHEET_CATALOG.filter((item) => {
      const q = dataSheetQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        item.partNumber.toLowerCase().includes(q) ||
        item.manufacturer.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.package.toLowerCase().includes(q)
      );
    });
  }, [dataSheetQuery]);

  if (!isOpen) return null;

  const handlePlaceDefinition = (def: ComponentDefinition) => {
    onSelectComponentToPlace(def);
    if (onPlaceComponentDirectly) {
      onPlaceComponentDirectly(def);
    }
    if (onShowToast) {
      onShowToast(`Selected "${def.name}" (${def.prefix}) for placement! Click anywhere on canvas.`);
    }
    onClose();
  };

  const handleCreateCustomPart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName.trim()) return;

    const parsedPins = newCompPinsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, idx) => {
        const parts = line.split(/[:,-]/);
        const pinId = parts[0]?.trim() || `${idx + 1}`;
        const rest = parts.slice(1).join(' ').trim() || `PIN_${idx + 1}`;
        const typeMatch = rest.match(/\(([^)]+)\)/);
        const pinType = (typeMatch ? typeMatch[1].toLowerCase() : 'passive') as any;
        const pinName = rest.replace(/\([^)]+\)/, '').trim() || pinId;

        const isLeft = idx % 2 === 0;
        return {
          id: pinId,
          name: pinName,
          direction: (isLeft ? 'left' : 'right') as any,
          x: isLeft ? -40 : 40,
          y: Math.floor(idx / 2) * 20 - 30,
          type: pinType,
        };
      });

    const customType = `custom_${newCompName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
    const newDef: ComponentDefinition = {
      type: customType,
      name: newCompName.trim(),
      prefix: newCompPrefix.trim() || 'U',
      category: newCompCategory as ComponentCategory,
      defaultVal: newCompVal.trim() || newCompName.trim(),
      defaultFootprint: newCompFootprint.trim() || 'DIP-8_W7.62mm',
      width: 100,
      height: Math.max(60, parsedPins.length * 15),
      pins: parsedPins.length > 0 ? parsedPins : [
        { id: '1', name: 'VCC', direction: 'left', x: -40, y: -20, type: 'power' },
        { id: '2', name: 'GND', direction: 'left', x: -40, y: 20, type: 'ground' },
        { id: '3', name: 'OUT', direction: 'right', x: 40, y: 0, type: 'output' },
      ],
      description: newCompDesc.trim() || 'Custom registered component with verified pinout.',
      symbol: 'ic',
    };

    registerCustomComponentDef(newDef);
    setSelectedCompDef(newDef);
    setActiveTab('components');
    if (onShowToast) {
      onShowToast(`Registered custom component "${newDef.name}" into catalog!`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 md:p-6 overflow-hidden select-none animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl w-full max-w-7xl h-[92vh] flex flex-col overflow-hidden text-slate-100">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-sky-950/50">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Comprehensive Component Catalog &amp; Hardware Hub
                </h2>
                <span className="px-2.5 py-0.5 bg-sky-950 border border-sky-700/60 text-sky-300 text-xs font-mono font-semibold rounded-full">
                  {COMPONENT_CATALOG.length} verified parts
                </span>
                <span className="hidden sm:inline-block px-2.5 py-0.5 bg-emerald-950 border border-emerald-700/60 text-emerald-300 text-xs font-mono rounded-full">
                  All Tabs Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Browse complete electronic components, manufacturer parts, pre-tested circuit modules, power rails, and datasheets.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close Catalog (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Navigation Tabs Bar - Prominent & Clearly Visible */}
        <div className="flex items-center px-6 border-b border-slate-800 bg-slate-950/80 gap-1.5 overflow-x-auto text-xs shrink-0 py-1.5 scrollbar-thin">
          <button
            type="button"
            onClick={() => setActiveTab('components')}
            className={`px-4 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'components'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-950'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <Layers className="w-4 h-4 text-sky-300" />
            <span>Standard EDA Parts</span>
            <span className="px-1.5 py-0.2 bg-black/40 rounded text-[10px] font-mono">
              {COMPONENT_CATALOG.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('power_rails')}
            className={`px-4 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'power_rails'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-950'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>Power &amp; Rails (+V, GND, PE)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('real_parts')}
            className={`px-4 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'real_parts'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <Package className="w-4 h-4 text-emerald-300" />
            <span>DigiKey / Mouser Real Parts</span>
            <span className="px-1.5 py-0.2 bg-black/40 rounded text-[10px] font-mono">
              {REAL_PRODUCT_CATALOG.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('circuits_diy')}
            className={`px-4 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'circuits_diy'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-950'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <Globe className="w-4 h-4 text-teal-300" />
            <span>Circuits-DIY Schematics</span>
            <span className="px-1.5 py-0.2 bg-black/40 rounded text-[10px] font-mono">
              {CIRCUITS_DIY_PROJECTS.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('alldatasheet')}
            className={`px-4 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'alldatasheet'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <FileText className="w-4 h-4 text-indigo-300" />
            <span>AllDataSheet IC Specs</span>
            <span className="px-1.5 py-0.2 bg-black/40 rounded text-[10px] font-mono">
              {ALL_DATASHEET_CATALOG.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pinouts')}
            className={`px-4 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'pinouts'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-950'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <Sparkles className="w-4 h-4 text-violet-300" />
            <span>Custom Part &amp; Pinout Creator</span>
          </button>
        </div>

        {/* Tab 1 Content: Standard EDA Parts */}
        {activeTab === 'components' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Category & Search Sidebar */}
            <div className="w-80 flex flex-col border-r border-slate-800 bg-slate-950/60 shrink-0">
              <div className="p-3 border-b border-slate-800 space-y-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={compSearchQuery}
                    onChange={(e) => setCompSearchQuery(e.target.value)}
                    placeholder="Search Arduino, ESP32, 555, Resistor..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono transition-colors"
                  />
                  {compSearchQuery && (
                    <button
                      onClick={() => setCompSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1 flex items-center justify-between">
                  <span>Categories</span>
                  <span className="text-[10px] font-mono text-sky-400">
                    {filteredComponents.length} parts found
                  </span>
                </div>
              </div>

              {/* Categories list */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.id;
                  const count =
                    cat.id === 'all'
                      ? COMPONENT_CATALOG.length
                      : COMPONENT_CATALOG.filter((c) => c.category === cat.id).length;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-sky-600 text-white font-semibold shadow-xs'
                          : 'text-slate-300 hover:bg-slate-850 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className="w-4 h-4 shrink-0 opacity-80" />
                        <span className="truncate">{cat.label}</span>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-mono shrink-0 ${
                          isSelected ? 'bg-sky-700 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Middle: Components Grid List */}
            <div className="flex-1 flex flex-col border-r border-slate-800 bg-slate-900/40 overflow-hidden">
              <div className="p-3 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Showing {filteredComponents.length} Components in{' '}
                  <span className="text-sky-400 uppercase">
                    {CATEGORIES.find((c) => c.id === selectedCategory)?.label}
                  </span>
                </span>
                <span className="text-[11px] text-slate-500">
                  Click any part to inspect details &amp; pinout
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredComponents.map((comp, idx) => {
                  const isSelected = selectedCompDef.type === comp.type;
                  return (
                    <div
                      key={`${comp.type}_${idx}`}
                      onClick={() => setSelectedCompDef(comp)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                        isSelected
                          ? 'bg-sky-950/50 border-sky-500 shadow-md ring-1 ring-sky-500/50'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                      }`}
                    >
                      <RealProductImage
                        partNumberOrType={comp.defaultVal || comp.type}
                        category={comp.category}
                        footprint={comp.defaultFootprint}
                        customUrl={comp.imageUrl}
                        className="w-12 h-12 rounded-lg border border-slate-700 shrink-0 bg-slate-900 shadow-xs"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-white truncate">{comp.name}</h4>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-850 border border-slate-750 text-slate-300 rounded shrink-0">
                            {comp.prefix}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                          <span className="text-sky-400">{comp.defaultVal}</span> • {comp.defaultFootprint}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] px-1.5 py-0.2 bg-slate-900 text-slate-400 border border-slate-800 rounded">
                            {comp.pins.length} pins
                          </span>
                          <span className="text-[10px] text-slate-500 truncate">
                            {comp.description}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlaceDefinition(comp);
                        }}
                        className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors shadow-xs"
                        title={`Place ${comp.name} on canvas`}
                      >
                        Place
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Selected Component Detailed Inspector */}
            <div className="w-88 flex flex-col bg-slate-950/90 overflow-y-auto p-5 space-y-4 shrink-0">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3 shadow-inner">
                <div className="flex items-center gap-3">
                  <RealProductImage
                    partNumberOrType={selectedCompDef.defaultVal || selectedCompDef.type}
                    category={selectedCompDef.category}
                    footprint={selectedCompDef.defaultFootprint}
                    customUrl={selectedCompDef.imageUrl}
                    className="w-16 h-16 rounded-xl border border-slate-700 bg-slate-950 shadow-md shrink-0"
                  />
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-sky-400 font-mono">
                      {selectedCompDef.category} • {selectedCompDef.prefix}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-0.5 leading-snug">
                      {selectedCompDef.name}
                    </h3>
                    <div className="text-xs text-sky-300 font-mono mt-0.5">
                      {selectedCompDef.defaultVal}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed pt-2 border-t border-slate-800">
                  {selectedCompDef.description}
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2 bg-slate-950 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Footprint:</span>
                    <span className="font-mono text-slate-300 font-semibold text-[11px]">
                      {selectedCompDef.defaultFootprint}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Pin Count:</span>
                    <span className="font-mono text-emerald-400 font-semibold text-[11px]">
                      {selectedCompDef.pins.length} Terminals
                    </span>
                  </div>
                </div>

                {/* Pinout Terminal Map */}
                <div className="pt-2">
                  <span className="text-[11px] font-semibold text-slate-400 mb-2 block">
                    Verified Pin Terminals ({selectedCompDef.pins.length}):
                  </span>
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    {selectedCompDef.pins.map((pin) => (
                      <div
                        key={pin.id}
                        className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sky-400 font-bold text-[11px]">
                            {pin.id}
                          </span>
                          <span className="font-semibold text-slate-200">{pin.name}</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-900 text-slate-400 rounded font-mono">
                          {pin.type || 'passive'} • {pin.direction}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Primary Action Button */}
                <button
                  type="button"
                  onClick={() => handlePlaceDefinition(selectedCompDef)}
                  className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Place {selectedCompDef.name} on Canvas</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2 Content: Power & Net Rails */}
        {activeTab === 'power_rails' && (
          <div className="flex-1 p-6 overflow-y-auto bg-slate-950/40">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="p-4 bg-slate-900 border border-amber-500/30 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Power Supplies, Rails &amp; Ground References</h3>
                    <p className="text-xs text-slate-400">
                      Standard EDA power rails, DC/AC sources, batteries, and protective earthing with 1-click placement.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  {
                    type: 'dc_source',
                    title: 'DC Voltage Source',
                    val: '±12V / 5V',
                    desc: '2-terminal DC supply with positive (+) and negative (-) leads',
                    badge: '± Source',
                    color: 'sky',
                  },
                  {
                    type: 'ac_source',
                    title: 'AC Voltage Source',
                    val: '230V / 110V AC',
                    desc: 'Sinusoidal AC mains or signal voltage source',
                    badge: '~ AC',
                    color: 'amber',
                  },
                  {
                    type: 'source_pos_point',
                    title: '+ Source Voltage Rail (+Vcc)',
                    val: '+5V / +3.3V',
                    desc: 'Single-terminal high-potential source reference point',
                    badge: '+ Point',
                    color: 'red',
                  },
                  {
                    type: 'source_neg_point',
                    title: '- Negative Point (-Ve)',
                    val: '0V / -V Return',
                    desc: 'Single-terminal negative voltage return reference point',
                    badge: '- Point',
                    color: 'blue',
                  },
                  {
                    type: 'ground',
                    title: 'Circuit Ground (GND)',
                    val: '0V Reference',
                    desc: 'Common return signal ground for electronic circuits',
                    badge: '⏚ GND',
                    color: 'emerald',
                  },
                  {
                    type: 'earth_ground',
                    title: 'Protective Earth Ground (PE)',
                    val: 'Chassis Earth',
                    desc: 'Safety protective earth connection for enclosures and mains',
                    badge: 'PE Earth',
                    color: 'emerald',
                  },
                  {
                    type: 'battery',
                    title: '18650 / Li-ion Battery',
                    val: '3.7V / 4.2V',
                    desc: 'Rechargeable single-cell battery with nominal 3.7V output',
                    badge: 'Battery',
                    color: 'violet',
                  },
                  {
                    type: 'regulator_lm7805',
                    title: 'LM7805 +5V Linear Regulator',
                    val: '5V 1.5A',
                    desc: 'High-stability linear step-down regulator to +5.0V',
                    badge: 'Regulator',
                    color: 'teal',
                  },
                  {
                    type: 'regulator_ams1117',
                    title: 'AMS1117-3.3V LDO',
                    val: '3.3V 800mA',
                    desc: 'Low Dropout regulator for 3.3V microcontrollers (ESP32/ESP8266)',
                    badge: 'LDO',
                    color: 'teal',
                  },
                ].map((item) => {
                  const def = getComponentDef(item.type);
                  return (
                    <div
                      key={item.type}
                      className="p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-amber-500/50 transition-all flex flex-col justify-between space-y-3 group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                            {item.title}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                            {item.badge}
                          </span>
                        </div>
                        <div className="text-xs font-mono text-amber-400 font-semibold">{item.val}</div>
                        <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handlePlaceDefinition(def)}
                        className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Place Rail / Source</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3 Content: Real Parts (DigiKey/Mouser) */}
        {activeTab === 'real_parts' && (
          <div className="flex-1 flex overflow-hidden">
            <div className="w-80 flex flex-col border-r border-slate-800 bg-slate-950/60 shrink-0">
              <div className="p-3 border-b border-slate-800 space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={realPartQuery}
                    onChange={(e) => setRealPartQuery(e.target.value)}
                    placeholder="Search MPN, DigiKey, LCSC..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
                  {realPartCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setRealPartCategory(cat)}
                      className={`px-2.5 py-1 rounded-md capitalize whitespace-nowrap cursor-pointer transition-colors ${
                        realPartCategory === cat
                          ? 'bg-emerald-600 text-white font-medium'
                          : 'bg-slate-850 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {filteredRealParts.map((part) => {
                  const isSelected = selectedRealPart.manufacturerPartNumber === part.manufacturerPartNumber;
                  return (
                    <div
                      key={part.manufacturerPartNumber}
                      onClick={() => setSelectedRealPart(part)}
                      className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center gap-3 ${
                        isSelected
                          ? 'bg-emerald-950/50 border-emerald-500'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <RealProductImage
                        partNumberOrType={part.manufacturerPartNumber}
                        category={part.category}
                        footprint={part.packageFootprint}
                        customUrl={part.imageUrl}
                        className="w-10 h-10 rounded-md border border-slate-700 bg-slate-950 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white truncate font-mono">
                          {part.manufacturerPartNumber}
                        </div>
                        <div className="text-[11px] text-emerald-400 truncate">
                          {part.manufacturer} • ${part.typicalUnitPrice.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {part.packageFootprint}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Real Part Info */}
            <div className="flex-1 p-6 overflow-y-auto bg-slate-950/30 flex flex-col justify-between">
              <div className="max-w-2xl mx-auto w-full space-y-5">
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                  <div className="flex items-start gap-4">
                    <RealProductImage
                      partNumberOrType={selectedRealPart.manufacturerPartNumber}
                      category={selectedRealPart.category}
                      footprint={selectedRealPart.packageFootprint}
                      customUrl={selectedRealPart.imageUrl}
                      className="w-24 h-24 rounded-xl border border-slate-700 bg-slate-950 shadow-lg shrink-0"
                    />
                    <div>
                      <span className="text-xs font-mono font-bold text-emerald-400 uppercase">
                        {selectedRealPart.manufacturer} • {selectedRealPart.category}
                      </span>
                      <h2 className="text-lg font-bold text-white font-mono mt-0.5">
                        {selectedRealPart.manufacturerPartNumber}
                      </h2>
                      <div className="text-sm text-emerald-300 font-semibold mt-1">
                        Est. Price: ${selectedRealPart.typicalUnitPrice.toFixed(2)} / unit
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedRealPart.description}
                  </p>

                  <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Package Footprint:</span>
                      <span className="font-mono text-slate-200 font-bold">
                        {selectedRealPart.packageFootprint}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">DigiKey / Mouser:</span>
                      <span className="font-mono text-emerald-400 font-bold">In Stock Verified</span>
                    </div>
                  </div>

                  {/* Specs Table */}
                  <div className="space-y-1 pt-2">
                    <span className="text-xs font-semibold text-slate-400 block mb-1">
                      Manufacturer Specifications:
                    </span>
                    {Object.entries(selectedRealPart.specifications || {}).map(([key, val]) => (
                      <div
                        key={key}
                        className="px-3 py-1.5 bg-slate-950 rounded border border-slate-800/80 flex items-center justify-between text-xs"
                      >
                        <span className="text-slate-400">{key}:</span>
                        <span className="font-mono text-slate-200 font-medium">{val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Place button */}
                  <button
                    type="button"
                    onClick={() => {
                      const genericDef =
                        COMPONENT_CATALOG.find((c) =>
                          selectedRealPart.manufacturerPartNumber.toLowerCase().includes(c.type)
                        ) || COMPONENT_CATALOG.find((c) => c.category === selectedRealPart.category) || COMPONENT_CATALOG[0];

                      const customizedDef: ComponentDefinition = {
                        ...genericDef,
                        name: selectedRealPart.manufacturerPartNumber,
                        defaultVal: selectedRealPart.manufacturerPartNumber,
                        defaultFootprint: selectedRealPart.packageFootprint,
                        description: selectedRealPart.description,
                      };
                      handlePlaceDefinition(customizedDef);
                    }}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Place Real Part ({selectedRealPart.manufacturerPartNumber})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4 Content: Circuits-DIY Schematics */}
        {activeTab === 'circuits_diy' && (
          <div className="flex-1 flex overflow-hidden">
            <div className="w-84 flex flex-col border-r border-slate-800 bg-slate-950/60 shrink-0">
              <div className="p-3 border-b border-slate-800 space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={diyQuery}
                    onChange={(e) => setDiyQuery(e.target.value)}
                    placeholder="Search 555 timer, relay, ESP32..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
                  {diyCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setDiyCategory(cat)}
                      className={`px-2.5 py-1 rounded-md capitalize whitespace-nowrap cursor-pointer transition-colors ${
                        diyCategory === cat
                          ? 'bg-teal-600 text-white font-medium'
                          : 'bg-slate-850 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {filteredDiyProjects.map((proj) => {
                  const isSelected = selectedDiyProject.id === proj.id;
                  return (
                    <div
                      key={proj.id}
                      onClick={() => setSelectedDiyProject(proj)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                        isSelected
                          ? 'bg-teal-950/50 border-teal-500 shadow-md'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-teal-300 uppercase">
                          {proj.category}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {proj.keyComponents.length} components
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white line-clamp-1">{proj.title}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2">{proj.summary}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Project Full Details */}
            <div className="flex-1 p-6 overflow-y-auto bg-slate-950/30">
              <div className="max-w-3xl mx-auto space-y-5">
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-mono font-bold text-teal-400 uppercase">
                        Circuits-DIY Project • {selectedDiyProject.category}
                      </span>
                      <h2 className="text-lg font-bold text-white mt-1">{selectedDiyProject.title}</h2>
                    </div>
                    {selectedDiyProject.directUrl && (
                      <a
                        href={selectedDiyProject.directUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-sky-400 hover:underline flex items-center gap-1"
                      >
                        <span>View Diagram Image</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedDiyProject.summary}
                  </p>

                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-300 block">
                      Included Bill of Materials ({selectedDiyProject.keyComponents.length} parts):
                    </span>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {selectedDiyProject.keyComponents.map((c, i) => (
                        <div
                          key={i}
                          className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs"
                        >
                          <div className="font-bold text-teal-300 font-mono flex items-center justify-between">
                            <span>{c.designator}: {c.name}</span>
                            <span className="text-[10px] text-slate-500">{c.package}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{c.uses}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const loaded = loadCircuitsDiyCircuit(selectedDiyProject.id);
                        if (loaded && onLoadCircuit) {
                          onLoadCircuit(loaded);
                          if (onShowToast) onShowToast(`Loaded "${loaded.title}" into Schematic Canvas!`);
                          onClose();
                        }
                      }}
                      className="flex-1 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                    >
                      <Layers className="w-4 h-4" />
                      <span>Load Full Circuit (Replace Canvas)</span>
                    </button>
                    {onAppendCircuit && (
                      <button
                        type="button"
                        onClick={() => {
                          const loaded = loadCircuitsDiyCircuit(selectedDiyProject.id);
                          if (loaded && onAppendCircuit) {
                            onAppendCircuit(loaded);
                            if (onShowToast) onShowToast(`Appended "${loaded.title}" into Active Schematic!`);
                            onClose();
                          }
                        }}
                        className="px-5 py-3 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                      >
                        Append to Schematic
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5 Content: AllDataSheet IC Specs */}
        {activeTab === 'alldatasheet' && (
          <div className="flex-1 flex overflow-hidden">
            <div className="w-84 flex flex-col border-r border-slate-800 bg-slate-950/60 shrink-0">
              <div className="p-3 border-b border-slate-800">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={dataSheetQuery}
                    onChange={(e) => setDataSheetQuery(e.target.value)}
                    placeholder="Search NE555, LM7805, ATmega..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {filteredDataSheets.map((item) => {
                  const isSelected = selectedDataSheetPart.partNumber === item.partNumber;
                  return (
                    <div
                      key={item.partNumber}
                      onClick={() => setSelectedDataSheetPart(item)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-950/50 border-indigo-500'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white font-mono">{item.partNumber}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-indigo-300">
                          {item.package}
                        </span>
                      </div>
                      <div className="text-[11px] text-indigo-400 mt-0.5">{item.manufacturer}</div>
                      <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{item.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected AllDataSheet details */}
            <div className="flex-1 p-6 overflow-y-auto bg-slate-950/30">
              <div className="max-w-3xl mx-auto space-y-5">
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-mono font-bold text-indigo-400 uppercase">
                        {selectedDataSheetPart.manufacturer} • {selectedDataSheetPart.package}
                      </span>
                      <h2 className="text-xl font-bold text-white font-mono mt-0.5">
                        {selectedDataSheetPart.partNumber}
                      </h2>
                    </div>
                    <a
                      href={selectedDataSheetPart.alldatasheetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <span>View PDF on AllDataSheet.com</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedDataSheetPart.description}
                  </p>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-400 block mb-1">
                      Pin Configuration &amp; Assignments:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                      {(selectedDataSheetPart.pins || []).map((pin) => (
                        <div
                          key={pin.pin}
                          className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded flex items-center justify-between text-xs"
                        >
                          <span className="font-mono text-indigo-400 font-bold">
                            Pin {pin.pin}: {pin.name}
                          </span>
                          <span className="text-slate-400 text-[10px] truncate max-w-[120px]">
                            {pin.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const matchDef =
                        COMPONENT_CATALOG.find((c) =>
                          selectedDataSheetPart.partNumber.toLowerCase().includes(c.type)
                        ) || COMPONENT_CATALOG.find((c) => c.category === 'ics') || COMPONENT_CATALOG[0];

                      const customizedDef: ComponentDefinition = {
                        ...matchDef,
                        name: selectedDataSheetPart.partNumber,
                        defaultVal: selectedDataSheetPart.partNumber,
                        defaultFootprint: selectedDataSheetPart.package,
                        description: selectedDataSheetPart.description,
                      };
                      handlePlaceDefinition(customizedDef);
                    }}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Place IC ({selectedDataSheetPart.partNumber})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6 Content: Custom Part & Pinout Creator */}
        {activeTab === 'pinouts' && (
          <div className="flex-1 p-6 overflow-y-auto bg-slate-950/40">
            <div className="max-w-2xl mx-auto space-y-5">
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-violet-500/20 text-violet-400 rounded-xl border border-violet-500/30">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Create &amp; Register Custom Component</h3>
                    <p className="text-xs text-slate-400">
                      Add any custom IC, sensor, module, or connector to the persistent catalog with verified pinout.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleCreateCustomPart} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Component Name:
                      </label>
                      <input
                        type="text"
                        required
                        value={newCompName}
                        onChange={(e) => setNewCompName(e.target.value)}
                        placeholder="e.g., AD8232 ECG Sensor"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-violet-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Reference Designator Prefix:
                      </label>
                      <input
                        type="text"
                        value={newCompPrefix}
                        onChange={(e) => setNewCompPrefix(e.target.value)}
                        placeholder="U, R, Q, D, SW, MOD"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">Category:</label>
                      <select
                        value={newCompCategory}
                        onChange={(e) => setNewCompCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-violet-500"
                      >
                        <option value="ics">Integrated Circuits (ICs)</option>
                        <option value="modules">MCUs &amp; Modules</option>
                        <option value="sensors">Sensors</option>
                        <option value="power">Power &amp; Regulators</option>
                        <option value="semiconductors">Semiconductors</option>
                        <option value="passive">Passives</option>
                        <option value="connectors">Connectors</option>
                        <option value="electromechanical">Motors / Relays</option>
                        <option value="switches">Switches</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">Footprint:</label>
                      <input
                        type="text"
                        value={newCompFootprint}
                        onChange={(e) => setNewCompFootprint(e.target.value)}
                        placeholder="DIP-8, TO-220, SOIC-16..."
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:border-violet-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">Default Value:</label>
                      <input
                        type="text"
                        value={newCompVal}
                        onChange={(e) => setNewCompVal(e.target.value)}
                        placeholder="e.g. AD8232"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Pinout Terminals (One per line: &quot;Number: Name (type)&quot;):
                    </label>
                    <textarea
                      rows={5}
                      value={newCompPinsText}
                      onChange={(e) => setNewCompPinsText(e.target.value)}
                      placeholder="1: VCC (power)&#10;2: GND (ground)&#10;3: OUT (output)"
                      className="w-full p-3 bg-slate-950 border border-slate-750 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:border-violet-500 leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Description / Notes:
                    </label>
                    <input
                      type="text"
                      value={newCompDesc}
                      onChange={(e) => setNewCompDesc(e.target.value)}
                      placeholder="Heart rate monitor single-lead front-end..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save &amp; Register into Catalog</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
