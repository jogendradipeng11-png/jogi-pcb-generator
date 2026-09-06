import React, { useState, useMemo } from 'react';
import { AllDataSheetComponent, SchematicComponent, AllDataSheetPin, Wire } from '../../types';
import {
  ALL_DATASHEET_CATALOG,
  searchAllDataSheet,
  getAllDataSheetSearchUrl,
  getAllDataSheetPdfUrl,
} from '../../data/allDataSheetCatalog';
import { RealProductImage } from '../../utils/componentImages';
import { synthesizeClientCircuit } from '../../utils/clientEdaSynthesizer';
import {
  Search,
  FileText,
  ExternalLink,
  Check,
  Plus,
  Copy,
  Layers,
  Zap,
  SlidersHorizontal,
  X,
  Cpu,
  BookmarkPlus,
  Radio,
  Eye,
  CheckCircle2,
  Globe,
  Sparkles,
} from 'lucide-react';

interface AllDataSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedComponent?: SchematicComponent | null;
  onApplySpecsToComponent?: (
    componentId: string,
    datasheetData: {
      partNumber: string;
      manufacturer: string;
      alldatasheetUrl: string;
      footprint: string;
      description: string;
      specs: Record<string, string>;
    }
  ) => void;
  onPlaceComponent?: (datasheetPart: AllDataSheetComponent) => void;
  onSelectComponent?: (datasheetPart: AllDataSheetComponent) => void;
  onAddCircuitToCanvas?: (components: SchematicComponent[], wires?: Wire[]) => void;
  initialQuery?: string;
}

const CATEGORIES = [
  'All',
  'Timers & Oscillators',
  'Operational Amplifiers',
  'Voltage Regulators',
  'Transistors & Diodes',
  'Logic & Digital',
  'Microcontrollers',
  'Sensors & Transducers',
];

/**
 * Visual Pin Layout Diagram representing standard physical packages (DIP, TO-220, TO-92, etc.)
 */
const VisualPinLayoutDiagram: React.FC<{
  part: AllDataSheetComponent;
  activePinHover: number | string | null;
  onHoverPin: (pin: number | string | null) => void;
}> = ({ part, activePinHover, onHoverPin }) => {
  const pinCount = part.pinCount || part.pinout.length;
  const isDip = part.package.toLowerCase().includes('dip') || part.package.toLowerCase().includes('soic') || pinCount >= 6;
  const is3Pin = pinCount === 3;
  const is2Pin = pinCount === 2;

  // Render Dual-In-Line (DIP) IC pin layout
  if (isDip) {
    const half = Math.ceil(pinCount / 2);
    const leftPins = part.pinout.slice(0, half);
    const rightPins = part.pinout.slice(half).reverse(); // DIP pins wrap counter-clockwise

    return (
      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col items-center">
        <div className="flex items-center justify-between w-full mb-2 text-[11px] text-slate-400 font-mono">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span>Pin Layout ({part.package})</span>
          </span>
          <span className="text-[10px] text-slate-500">Top View (Notch Up)</span>
        </div>

        {/* Physical IC Body */}
        <div className="relative w-64 bg-slate-900 rounded-lg border-2 border-slate-700 shadow-2xl py-3 px-2">
          {/* Top Alignment Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-3 bg-slate-950 rounded-b-full border-b border-x border-slate-700" />
          {/* Pin 1 Index Dot */}
          <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-slate-700" />

          {/* Part Marking Laser Silkscreen */}
          <div className="text-center py-2 select-none pointer-events-none">
            <div className="text-xs font-mono font-bold text-slate-200 tracking-wider">
              {part.partNumber}
            </div>
            <div className="text-[9px] font-mono text-slate-500 uppercase">
              {part.manufacturer.split(' ')[0]} • ALLDATASHEET
            </div>
          </div>

          {/* Pins Array */}
          <div className="grid grid-cols-2 gap-4 mt-2">
            {/* Left Row (Pins 1 to N/2) */}
            <div className="space-y-1.5">
              {leftPins.map((pin) => {
                const isHovered = activePinHover === pin.pin;
                return (
                  <div
                    key={String(pin.pin)}
                    onMouseEnter={() => onHoverPin(pin.pin)}
                    onMouseLeave={() => onHoverPin(null)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all cursor-pointer border ${
                      isHovered
                        ? 'bg-sky-500/20 border-sky-400 shadow-xs'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span className="w-4 h-4 rounded bg-slate-800 text-sky-400 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                      {pin.pin}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-slate-200 truncate">
                      {pin.name}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Right Row (Pins N down to N/2 + 1) */}
            <div className="space-y-1.5">
              {rightPins.map((pin) => {
                const isHovered = activePinHover === pin.pin;
                return (
                  <div
                    key={String(pin.pin)}
                    onMouseEnter={() => onHoverPin(pin.pin)}
                    onMouseLeave={() => onHoverPin(null)}
                    className={`flex items-center justify-between gap-1.5 px-2 py-1 rounded transition-all cursor-pointer border ${
                      isHovered
                        ? 'bg-sky-500/20 border-sky-400 shadow-xs'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-[11px] font-mono font-bold text-slate-200 truncate">
                      {pin.name}
                    </span>
                    <span className="w-4 h-4 rounded bg-slate-800 text-sky-400 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                      {pin.pin}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3-Pin or other Package
  return (
    <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col items-center">
      <div className="flex items-center justify-between w-full mb-2 text-[11px] text-slate-400 font-mono">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-sky-400" />
          <span>Pinout Terminal Layout ({part.package})</span>
        </span>
        <span className="text-[10px] text-slate-500">{pinCount} Terminals</span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 py-2">
        {part.pinout.map((pin) => {
          const isHovered = activePinHover === pin.pin;
          return (
            <div
              key={String(pin.pin)}
              onMouseEnter={() => onHoverPin(pin.pin)}
              onMouseLeave={() => onHoverPin(null)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer border ${
                isHovered
                  ? 'bg-sky-500/20 border-sky-400'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-sky-950 border border-sky-600 text-sky-400 font-mono font-bold text-[11px] flex items-center justify-center">
                {pin.pin}
              </span>
              <div>
                <div className="font-mono font-bold text-xs text-slate-200">{pin.name}</div>
                <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{pin.description}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const AllDataSheetModal: React.FC<AllDataSheetModalProps> = ({
  isOpen,
  onClose,
  selectedComponent,
  onApplySpecsToComponent,
  onPlaceComponent,
  onSelectComponent,
  onAddCircuitToCanvas,
  initialQuery = '',
}) => {
  const [searchQuery, setSearchQuery] = useState(
    initialQuery || selectedComponent?.value || selectedComponent?.partNumber || ''
  );
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedPartId, setSelectedPartId] = useState<string>('ads_ne555');
  const [activePinHover, setActivePinHover] = useState<number | string | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [appliedNotification, setAppliedNotification] = useState(false);

  // Search filtered results
  const filteredParts = useMemo(() => {
    return searchAllDataSheet(searchQuery, activeCategory === 'All' ? undefined : activeCategory);
  }, [searchQuery, activeCategory]);

  const activePart = useMemo(() => {
    const found = filteredParts.find((p) => p.id === selectedPartId);
    return found || filteredParts[0] || ALL_DATASHEET_CATALOG[0];
  }, [filteredParts, selectedPartId]);

  if (!isOpen) return null;

  // Unified Handler: Add directly to circuit diagram
  const handleAddDirectlyToCircuit = (partToAdd: AllDataSheetComponent) => {
    if (onSelectComponent) {
      onSelectComponent(partToAdd);
    } else if (onPlaceComponent) {
      onPlaceComponent(partToAdd);
    }
    onClose();
  };

  // Action: Apply specs to currently selected component
  const handleApplyToComponent = () => {
    if (!selectedComponent || !onApplySpecsToComponent || !activePart) return;
    onApplySpecsToComponent(selectedComponent.id, {
      partNumber: activePart.partNumber,
      manufacturer: activePart.manufacturer,
      alldatasheetUrl: activePart.alldatasheetUrl,
      footprint: activePart.package,
      description: activePart.description,
      specs: activePart.specs,
    });
    setAppliedNotification(true);
    setTimeout(() => setAppliedNotification(false), 2400);
  };

  // Action: Copy specifications
  const handleCopySpecs = () => {
    if (!activePart) return;
    const text = `Component: ${activePart.partNumber} (${activePart.manufacturer})\nCategory: ${activePart.category}\nPackage: ${activePart.package}\nAllDataSheet: ${activePart.alldatasheetUrl}\n\nKey Specifications:\n${Object.entries(
      activePart.specs
    )
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n')}\n\nPinout Configuration:\n${activePart.pinout
      .map((p) => `Pin ${p.pin} (${p.name}): ${p.description} [${p.type}]`)
      .join('\n')}`;

    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  return (
    <div
      id="alldatasheet-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 select-none"
    >
      <div
        id="alldatasheet-modal-container"
        className="w-full max-w-6xl h-[92vh] max-h-[850px] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
      >
        {/* Modal Top Header Bar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  AllDataSheet.com Component Search & Pinout
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-full font-bold">
                  Official Reference
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Search verified electronics datasheets, inspect real product photos & pinouts, and directly add to circuit diagram.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://www.alldatasheet.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-xs text-sky-400 hover:text-sky-300 hover:bg-slate-800 rounded-lg border border-slate-700/60 transition-colors"
            >
              <span>alldatasheet.com</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close Dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Input and Category Filter Bar */}
        <div className="p-3 sm:px-4 bg-slate-900/90 border-b border-slate-800 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by part number, IC name, manufacturer, package (e.g. NE555, LM358, 2N2222, LM7805, ESP32, DIP-8)..."
              className="w-full pl-10 pr-24 py-2 bg-slate-950 border border-slate-700/90 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono transition-all"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded hover:bg-slate-800"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs scrollbar-thin">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors border text-[11px] cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 font-semibold'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Detected URL / Circuit Synthesizer Banner */}
          {searchQuery && (searchQuery.toLowerCase().includes('circuit') || searchQuery.toLowerCase().includes('http') || searchQuery.toLowerCase().includes('diy') || searchQuery.toLowerCase().includes('charger') || searchQuery.toLowerCase().includes('relay')) && onAddCircuitToCanvas && (
            <div className="p-2.5 rounded-lg bg-emerald-950/70 border border-emerald-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2 text-emerald-300">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Synthesize & add complete working circuit from <strong>"{searchQuery.slice(0, 42)}{searchQuery.length > 42 ? '...' : ''}"</strong> directly into schematic!
                </span>
              </div>
              <button
                onClick={() => {
                  const syn = synthesizeClientCircuit(searchQuery);
                  onAddCircuitToCanvas(syn.components, syn.wires);
                  onClose();
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-semibold text-xs shrink-0 flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>⚡ Add Circuit to Canvas</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Main Content: Split Pane */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* Left Column: Component List with Real Product Thumbnails */}
          <div className="w-full md:w-88 border-r border-slate-800 flex flex-col bg-slate-950/50 overflow-hidden">
            <div className="px-3.5 py-2 bg-slate-900/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Matching Components ({filteredParts.length})</span>
              <span className="text-[10px] text-sky-400 font-mono">Real Product Photos</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
              {filteredParts.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs space-y-3">
                  <p>No matching components found in local cache for '{searchQuery}'.</p>
                  <div className="pt-2">
                    <a
                      href={getAllDataSheetSearchUrl(searchQuery)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <span>Search '{searchQuery}' on AllDataSheet.com</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ) : (
                filteredParts.map((item) => {
                  const isSelected = activePart?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedPartId(item.id)}
                      className={`w-full p-2.5 transition-all flex items-center gap-3 cursor-pointer group ${
                        isSelected
                          ? 'bg-sky-950/70 border-l-4 border-l-sky-500 shadow-inner'
                          : 'hover:bg-slate-900/60'
                      }`}
                    >
                      {/* Real Product Image Thumbnail */}
                      <RealProductImage
                        partNumberOrType={item.partNumber}
                        category={item.category}
                        footprint={item.package}
                        customUrl={item.imageUrl}
                        className="w-13 h-13 shrink-0"
                        badge={item.package.split(' ')[0]}
                      />

                      {/* Info & Direct Add Button */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-100 text-xs truncate group-hover:text-sky-300 transition-colors">
                            {item.partNumber}
                          </span>
                          <span className="text-[9px] font-mono text-slate-400 px-1 py-0.2 rounded bg-slate-800 border border-slate-700 shrink-0">
                            {item.pinCount}P
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">{item.manufacturer}</div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">{item.description}</div>

                        {/* Direct Quick-Add Button */}
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddDirectlyToCircuit(item);
                            }}
                            className="px-2 py-0.8 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                            title="Directly place this product into schematic diagram"
                          >
                            <Plus className="w-2.8 h-2.8" />
                            <span>Add to Circuit</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Active Part Real Photo, Visual Pin Layout & Technical Specs */}
          {activePart ? (
            <div className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-900/70">
              {/* Hero Header: Real Product Photography Showcase + Key Actions */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-lg">
                <div className="flex items-center gap-4">
                  {/* High-Resolution Real Product Photo Card */}
                  <div className="relative group">
                    <RealProductImage
                      partNumberOrType={activePart.partNumber}
                      category={activePart.category}
                      footprint={activePart.package}
                      customUrl={activePart.imageUrl}
                      className="w-20 h-20 sm:w-24 sm:h-24 shadow-xl ring-2 ring-sky-500/40 rounded-xl"
                    />
                    <div className="absolute -bottom-2 -right-2 px-1.5 py-0.5 bg-emerald-500/90 text-white font-mono text-[9px] font-bold rounded shadow">
                      PHOTO
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        {activePart.partNumber}
                      </h3>
                      <span className="px-2 py-0.5 text-xs font-semibold bg-sky-500/20 text-sky-300 rounded-md border border-sky-500/40">
                        {activePart.package}
                      </span>
                    </div>
                    <p className="text-xs text-sky-400 font-semibold mt-0.5">{activePart.manufacturer}</p>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">{activePart.description}</p>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="w-full md:w-auto flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
                  {/* DIRECT ADD TO CIRCUIT DIAGRAM BUTTON */}
                  <button
                    id="add-to-circuit-schematic-btn"
                    onClick={() => handleAddDirectlyToCircuit(activePart)}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer transform active:scale-98 border border-emerald-400/40"
                    title="Directly add this component into the circuit diagram schematic"
                  >
                    <Plus className="w-4 h-4" />
                    <span>⚡ Add Component to Canvas</span>
                  </button>

                  {/* SYNTHESIZE & ADD COMPLETE CIRCUIT POWERED BY THIS PART */}
                  {onAddCircuitToCanvas && (
                    <button
                      onClick={() => {
                        const syn = synthesizeClientCircuit(`${activePart.partNumber} ${activePart.description} ${activePart.category}`);
                        onAddCircuitToCanvas(syn.components, syn.wires);
                        onClose();
                      }}
                      className="w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-sky-500/30"
                      title={`Synthesize and place complete working circuit using ${activePart.partNumber}`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                      <span>⚡ Add Complete Circuit ({activePart.partNumber})</span>
                    </button>
                  )}

                  {/* Enrich / Apply to currently selected component */}
                  {selectedComponent && (
                    <button
                      onClick={handleApplyToComponent}
                      className="w-full px-3 py-1.5 bg-sky-600/80 hover:bg-sky-600 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-sky-500/50"
                      title="Update the currently selected component with this datasheet's parameters"
                    >
                      {appliedNotification ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Updated {selectedComponent.designator}!</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5" />
                          <span>Apply to {selectedComponent.designator}</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Links to AllDataSheet.com */}
                  <div className="flex items-center gap-2">
                    <a
                      href={activePart.alldatasheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-lg text-xs font-medium border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                      title="View official datasheet page on alldatasheet.com"
                    >
                      <span>AllDataSheet</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    {activePart.pdfUrl && (
                      <a
                        href={activePart.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-red-950/70 hover:bg-red-900/80 text-red-300 rounded-lg text-xs font-medium border border-red-800/80 flex items-center gap-1.5 transition-colors"
                        title="Open direct manufacturer PDF datasheet"
                      >
                        <FileText className="w-3 h-3" />
                        <span>PDF</span>
                      </a>
                    )}
                    <button
                      onClick={handleCopySpecs}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs border border-slate-700 transition-colors"
                      title="Copy specifications to clipboard"
                    >
                      {copiedNotification ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Pin Layout & Terminal Configuration Diagram */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-sky-400" />
                    Visual Pin Layout & Terminal Diagram
                  </h4>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {activePart.pinCount} Pins • {activePart.package}
                  </span>
                </div>

                <VisualPinLayoutDiagram
                  part={activePart}
                  activePinHover={activePinHover}
                  onHoverPin={setActivePinHover}
                />
              </div>

              {/* Pinout Table with Interactive Highlighting */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-sky-400" />
                    Pinout Terminal Specifications
                  </h4>
                  <span className="text-[11px] text-slate-500">Source: AllDataSheet Archive</span>
                </div>

                <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/60 shadow-md">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-800/80 border-b border-slate-700 text-slate-400 font-semibold text-[11px]">
                        <th className="py-2.5 px-3 w-16 text-center">Pin #</th>
                        <th className="py-2.5 px-3 w-28">Name</th>
                        <th className="py-2.5 px-3">Description & Circuit Role</th>
                        <th className="py-2.5 px-3 w-28 text-center">Electrical Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {activePart.pinout.map((pin) => {
                        const isHovered = activePinHover === pin.pin;
                        return (
                          <tr
                            key={String(pin.pin)}
                            onMouseEnter={() => setActivePinHover(pin.pin)}
                            onMouseLeave={() => setActivePinHover(null)}
                            className={`transition-colors ${
                              isHovered ? 'bg-sky-500/15 text-white' : 'hover:bg-slate-800/40'
                            }`}
                          >
                            <td className="py-2 px-3 font-mono font-bold text-center text-sky-400">
                              {pin.pin}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-100">
                              {pin.name}
                            </td>
                            <td className="py-2 px-3 text-slate-300 text-[11px]">{pin.description}</td>
                            <td className="py-2 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${
                                  pin.type === 'power'
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                    : pin.type === 'ground'
                                    ? 'bg-slate-700/60 text-slate-300 border-slate-600'
                                    : pin.type === 'output'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                    : pin.type === 'input'
                                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                }`}
                              >
                                {pin.type}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Key Specifications & Maximum Ratings */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
                  Key Electrical Specifications & Ratings
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {Object.entries(activePart.specs).map(([specKey, specVal]) => (
                    <div
                      key={specKey}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors"
                    >
                      <span className="text-[11px] text-slate-400">{specKey}</span>
                      <span className="text-xs font-bold text-slate-100 mt-1 font-mono">{specVal}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Application Notes */}
              {activePart.applicationNotes && (
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                  <div className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-amber-400" />
                    <span>Typical Circuit Applications</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">{activePart.applicationNotes}</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
