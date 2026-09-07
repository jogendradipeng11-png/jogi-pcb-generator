import React, { useState, useMemo } from 'react';
import {
  Cpu,
  Search,
  Plus,
  Zap,
  Info,
  Layers,
  ArrowRight,
  Sparkles,
  X,
  CheckCircle2,
  BookOpen,
  Sliders,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { ComponentDefinition, PinDefinition, SchematicComponent } from '../../types';
import { COMPONENT_CATALOG, registerCustomComponentDef } from '../../data/components';
import { RealProductImage } from '../../utils/componentImages';

interface ComponentPinoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectComponentToPlace: (def: ComponentDefinition) => void;
  onAddComponentDirectlyToCanvas: (def: ComponentDefinition) => void;
  onShowToast: (msg: string) => void;
}

export const ComponentPinoutModal: React.FC<ComponentPinoutModalProps> = ({
  isOpen,
  onClose,
  onSelectComponentToPlace,
  onAddComponentDirectlyToCanvas,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'explorer' | 'create'>('explorer');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedComponent, setSelectedComponent] = useState<ComponentDefinition>(
    COMPONENT_CATALOG.find((c) => c.type === 'optocoupler') || COMPONENT_CATALOG[0]
  );

  // Form state for creating custom component
  const [newCompName, setNewCompName] = useState('');
  const [newCompPrefix, setNewCompPrefix] = useState('U');
  const [newCompCategory, setNewCompCategory] = useState<string>('ics');
  const [newCompFootprint, setNewCompFootprint] = useState('DIP-8_W7.62mm');
  const [newCompDefaultVal, setNewCompDefaultVal] = useState('');
  const [newCompDescription, setNewCompDescription] = useState('');
  const [newCompUses, setNewCompUses] = useState('');
  const [newCompPinsText, setNewCompPinsText] = useState(
    '1: VCC (power)\n2: IN+ (input)\n3: IN- (input)\n4: GND (ground)\n5: OUT (output)'
  );

  const categories = useMemo(() => {
    const cats = new Set<string>();
    COMPONENT_CATALOG.forEach((c) => cats.add(c.category));
    return ['all', ...Array.from(cats)];
  }, []);

  const filteredComponents = useMemo(() => {
    return COMPONENT_CATALOG.filter((comp) => {
      const matchesCat = selectedCategory === 'all' || comp.category === selectedCategory;
      const matchesSearch =
        comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comp.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comp.defaultVal.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (comp.uses && comp.uses.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  if (!isOpen) return null;

  const handleCreateCustomComponent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName.trim()) {
      onShowToast('Please provide a component name.');
      return;
    }

    const typeSlug = `custom_${newCompName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`;

    // Parse pins from text lines
    const parsedPins: PinDefinition[] = [];
    const lines = newCompPinsText.split('\n').filter(Boolean);
    const halfCount = Math.ceil(lines.length / 2);

    lines.forEach((line, idx) => {
      const match = line.match(/^(\d+|[A-Za-z0-9_]+)\s*[:\-]?\s*([^(]+)(?:\(([^)]+)\))?/);
      const pinId = match ? match[1].trim() : String(idx + 1);
      const pinName = match ? match[2].trim() : `PIN_${idx + 1}`;
      const pinTypeRaw = match && match[3] ? match[3].toLowerCase().trim() : 'passive';
      const pinType = ['input', 'output', 'power', 'ground', 'bidirectional'].includes(pinTypeRaw)
        ? (pinTypeRaw as any)
        : 'passive';

      const isLeft = idx < halfCount;
      const yPos = (idx % halfCount) * 20 - ((halfCount - 1) * 20) / 2;

      parsedPins.push({
        id: pinId,
        number: pinId,
        name: pinName,
        x: isLeft ? -45 : 45,
        y: Math.round(yPos),
        direction: isLeft ? 'left' : 'right',
        type: pinType,
      });
    });

    const newDef: ComponentDefinition = {
      type: typeSlug,
      name: newCompName.trim(),
      prefix: newCompPrefix.trim() || 'U',
      category: newCompCategory as any,
      defaultVal: newCompDefaultVal.trim() || newCompName.trim(),
      defaultFootprint: newCompFootprint.trim() || 'DIP-8',
      width: 90,
      height: Math.max(60, halfCount * 24 + 20),
      pins: parsedPins,
      description: newCompDescription.trim() || 'Custom user component with configured pinouts',
      symbol: 'generic_ic',
      uses: newCompUses.trim() || 'General electronic prototyping and schematic design',
      pinoutDetails: parsedPins.map((p) => ({
        pin: p.number || p.id,
        name: p.name,
        description: `${p.type?.toUpperCase()} terminal`,
        type: p.type,
      })),
    };

    registerCustomComponentDef(newDef);
    onAddComponentDirectlyToCanvas(newDef);
    onShowToast(`Created & added "${newDef.name}" to canvas and library!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-5xl w-full h-[88vh] flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-xs">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">
                  Electronic Component Pinouts, Uses & Library
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
                  {COMPONENT_CATALOG.length} verified parts
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Detailed pinout maps, electrical ratings, circuit applications, and custom component creator.
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-slate-950 border border-slate-800 p-1">
              <button
                onClick={() => setActiveTab('explorer')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === 'explorer'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Pinouts & Uses
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 ${
                  activeTab === 'create'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Part</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {activeTab === 'explorer' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search & Category Pills */}
            <div className="p-3 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between gap-3 flex-wrap">
              <div className="relative w-80">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search MOC3021, TRIAC, Relay, LM386, 7805..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors ${
                      selectedCategory === cat
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Split View */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Column: Component List */}
              <div className="w-72 border-r border-slate-800 overflow-y-auto p-2 space-y-1 bg-slate-950/30">
                {filteredComponents.map((comp) => {
                  const isSelected = selectedComponent?.type === comp.type;
                  return (
                    <div
                      key={comp.type}
                      onClick={() => setSelectedComponent(comp)}
                      className={`p-2 rounded-lg border transition-all cursor-pointer group ${
                        isSelected
                          ? 'bg-indigo-950/70 border-indigo-500 shadow-sm'
                          : 'bg-slate-800/30 border-slate-800 hover:border-slate-700 hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 transition-colors truncate">
                          {comp.name}
                        </span>
                        <span className="text-[9px] font-mono px-1 py-0.2 bg-slate-900 text-slate-400 rounded shrink-0">
                          {comp.prefix}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                        <span className="text-indigo-400">{comp.defaultVal}</span> • {comp.pins.length} pins
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Selected Component Details */}
              {selectedComponent ? (
                <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-900">
                  {/* Top Details & Action */}
                  <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                          {selectedComponent.category}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          Footprint: {selectedComponent.defaultFootprint}
                        </span>
                      </div>
                      <h1 className="text-xl font-black text-slate-100">
                        {selectedComponent.name} ({selectedComponent.defaultVal})
                      </h1>
                      <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                        {selectedComponent.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          onSelectComponentToPlace(selectedComponent);
                          onClose();
                        }}
                        className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-750 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-indigo-800/60 cursor-pointer"
                        title="Select and click on schematic canvas to place"
                      >
                        <span>Select to Place</span>
                      </button>

                      <button
                        onClick={() => {
                          onAddComponentDirectlyToCanvas(selectedComponent);
                          onClose();
                        }}
                        className="py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>➕ Add to Schematic Canvas</span>
                      </button>
                    </div>
                  </div>

                  {/* Typical Uses & Applications */}
                  <div className="p-4 rounded-lg bg-indigo-950/30 border border-indigo-800/40 space-y-1.5">
                    <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                      Typical Uses & Practical Applications
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed font-sans">
                      {selectedComponent.uses ||
                        'Standard electronic block for analog/digital circuit design, interface isolation, filtering, and switching applications.'}
                    </p>
                  </div>

                  {/* Pinout Table */}
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                        Pinout Breakdown ({selectedComponent.pins.length} Terminals)
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Pin layout orientation: Left/Right/Top/Bottom
                      </span>
                    </h3>

                    <div className="rounded-lg border border-slate-800 overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950/80 text-[11px] text-slate-400 font-mono border-b border-slate-800">
                          <tr>
                            <th className="p-2.5 w-16">Pin #</th>
                            <th className="p-2.5 w-32">Signal / Name</th>
                            <th className="p-2.5 w-24">Type</th>
                            <th className="p-2.5 w-24">Direction</th>
                            <th className="p-2.5">Function & Typical Net Connection</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                          {selectedComponent.pins.map((pin, idx) => {
                            const isPower = pin.type === 'power' || pin.name.includes('VCC') || pin.name === '+';
                            const isGround = pin.type === 'ground' || pin.name.includes('GND') || pin.name === '-';
                            const isInput = pin.type === 'input';
                            const isOutput = pin.type === 'output';

                            return (
                              <tr key={pin.id} className="hover:bg-slate-800/30">
                                <td className="p-2.5 font-bold text-slate-300">
                                  {pin.number || pin.id}
                                </td>
                                <td className="p-2.5 font-bold text-indigo-300">
                                  {pin.name}
                                </td>
                                <td className="p-2.5">
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[10px] ${
                                      isPower
                                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                        : isGround
                                        ? 'bg-sky-950 text-sky-300 border border-sky-800'
                                        : isInput
                                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                        : isOutput
                                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                        : 'bg-slate-800 text-slate-400'
                                    }`}
                                  >
                                    {pin.type || 'passive'}
                                  </span>
                                </td>
                                <td className="p-2.5 text-slate-400 capitalize">
                                  {pin.direction}
                                </td>
                                <td className="p-2.5 text-slate-300 font-sans text-xs">
                                  {selectedComponent.pinoutDetails?.find(
                                    (d) => String(d.pin) === String(pin.number || pin.id)
                                  )?.description ||
                                    (isPower
                                      ? 'Positive power rail connection'
                                      : isGround
                                      ? 'Ground reference or return connection'
                                      : isInput
                                      ? 'Control signal or analog input'
                                      : isOutput
                                      ? 'Drive output pin'
                                      : 'General passive circuit connection')}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Electrical Ratings if available */}
                  {selectedComponent.ratings && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        Operating Ratings & Limits
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {Object.entries(selectedComponent.ratings).map(([key, val]) => (
                          <div
                            key={key}
                            className="p-2.5 rounded bg-slate-950/60 border border-slate-800 font-mono text-xs"
                          >
                            <div className="text-[10px] text-slate-500 uppercase">{key}</div>
                            <div className="font-bold text-emerald-400 mt-0.5">{val}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          /* Create Custom Component Form */
          <div className="flex-1 overflow-y-auto p-6 bg-slate-900">
            <form onSubmit={handleCreateCustomComponent} className="max-w-2xl mx-auto space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Define & Add Custom Component
                </h3>
                <p className="text-xs text-slate-400">
                  If your required IC or component is not on the web page, configure its pinout here to immediately add it to your schematic canvas.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Component Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCompName}
                    onChange={(e) => setNewCompName(e.target.value)}
                    placeholder="e.g. AD620 Instrumentation Amp"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-md text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Default Part / Value
                  </label>
                  <input
                    type="text"
                    value={newCompDefaultVal}
                    onChange={(e) => setNewCompDefaultVal(e.target.value)}
                    placeholder="e.g. AD620AN"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-md text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    IEEE Designator Prefix
                  </label>
                  <input
                    type="text"
                    value={newCompPrefix}
                    onChange={(e) => setNewCompPrefix(e.target.value)}
                    placeholder="U, Q, IC, D, T..."
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-md text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={newCompCategory}
                    onChange={(e) => setNewCompCategory(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-md text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ics">Integrated Circuits (ICs)</option>
                    <option value="semiconductors">Semiconductors</option>
                    <option value="power">Power & Regulators</option>
                    <option value="sensors">Sensors</option>
                    <option value="modules">MCUs & Modules</option>
                    <option value="electromechanical">Relays & Motors</option>
                    <option value="connectors">Connectors</option>
                    <option value="passive">Passives</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Footprint
                  </label>
                  <input
                    type="text"
                    value={newCompFootprint}
                    onChange={(e) => setNewCompFootprint(e.target.value)}
                    placeholder="DIP-8, TO-220, SOIC-16..."
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-md text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newCompDescription}
                  onChange={(e) => setNewCompDescription(e.target.value)}
                  placeholder="e.g. Low cost, low power instrumentation amplifier"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-md text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Typical Uses & Applications
                </label>
                <input
                  type="text"
                  value={newCompUses}
                  onChange={(e) => setNewCompUses(e.target.value)}
                  placeholder="e.g. Bridge amplifiers, thermocouple indicators, medical ECG monitoring"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-md text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">
                    Pins Specification (One pin per line) *
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Format: &quot;[Pin#]: [Name] ([Type])&quot;
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={newCompPinsText}
                  onChange={(e) => setNewCompPinsText(e.target.value)}
                  placeholder="1: RG1&#10;2: -IN (input)&#10;3: +IN (input)&#10;4: -VS (ground)&#10;5: REF (passive)&#10;6: VOUT (output)&#10;7: +VS (power)&#10;8: RG2"
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-md text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('explorer')}
                  className="py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Register & Place on Canvas</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono text-[11px]">
            Component Catalog • Pinout maps are mapped to standard EDA netlists.
          </span>
          <button
            onClick={onClose}
            className="py-1.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
