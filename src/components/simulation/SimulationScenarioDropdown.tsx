import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  SimulationState,
  SchematicComponent,
  Wire,
  SimulationScenario,
  OperatingConditions,
} from '../../types';
import {
  loadAllSimulationScenarios,
  saveUserSimulationScenario,
  deleteUserSimulationScenario,
  exportScenariosAsJson,
  importScenariosFromJson,
  DEFAULT_OPERATING_CONDITIONS,
} from '../../data/simulationScenarios';
import {
  Sliders,
  SlidersHorizontal,
  Gauge,
  Thermometer,
  Zap,
  Check,
  ChevronDown,
  Plus,
  Trash2,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  Copy,
  X,
  Activity,
  Flame,
  Snowflake,
  BatteryCharging,
  Clock,
  Radio,
  Eye,
  CheckCircle2,
} from 'lucide-react';

interface SimulationScenarioDropdownProps {
  simulationState: SimulationState;
  components: SchematicComponent[];
  wires: Wire[];
  onApplyScenario: (scenario: SimulationScenario) => void;
  onUpdateConditions?: (conditions: Partial<OperatingConditions>, newProbes?: string[]) => void;
  className?: string;
}

export const SimulationScenarioDropdown: React.FC<SimulationScenarioDropdownProps> = ({
  simulationState,
  components,
  wires,
  onApplyScenario,
  onUpdateConditions,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scenarios, setScenarios] = useState<SimulationScenario[]>(() => loadAllSimulationScenarios());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState('');

  // Mode: 'list' | 'save_new' | 'custom_tweak'
  const [panelView, setPanelView] = useState<'list' | 'save_new' | 'custom_tweak'>('list');

  // Form State for saving a new scenario
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newScenarioDesc, setNewScenarioDesc] = useState('');
  const [newScenarioBadge, setNewScenarioBadge] = useState('Custom');
  const [newSupplyVoltage, setNewSupplyVoltage] = useState<number>(5.0);
  const [newTemperature, setNewTemperature] = useState<number>(25);
  const [newSimSpeed, setNewSimSpeed] = useState<number>(1);
  const [newLoadCondition, setNewLoadCondition] = useState<'nominal' | 'heavy' | 'no_load' | 'stress'>('nominal');
  const [selectedProbesForSave, setSelectedProbesForSave] = useState<string[]>([]);
  const [customProbeInput, setCustomProbeInput] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute all unique nets in circuit
  const allCircuitNets = useMemo(() => {
    const set = new Set<string>();
    components.forEach((c) => {
      c.pins.forEach((p) => {
        if (p.net && p.net.trim()) set.add(p.net.trim());
      });
    });
    wires.forEach((w) => {
      if (w.net && w.net.trim()) set.add(w.net.trim());
    });
    return Array.from(set).sort();
  }, [components, wires]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setPanelView('list');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Determine current active scenario (or default baseline)
  const activeScenario = useMemo(() => {
    if (simulationState.activeScenarioId) {
      const found = scenarios.find((s) => s.id === simulationState.activeScenarioId);
      if (found) return found;
    }
    // Fallback: match by name or return default
    if (simulationState.activeScenarioName) {
      const found = scenarios.find((s) => s.name === simulationState.activeScenarioName);
      if (found) return found;
    }
    return scenarios[0]; // Baseline
  }, [scenarios, simulationState.activeScenarioId, simulationState.activeScenarioName]);

  // Filtered scenarios list
  const filteredScenarios = useMemo(() => {
    return scenarios.filter((s) => {
      const matchesCat =
        selectedCategory === 'all'
          ? true
          : selectedCategory === 'custom'
          ? !s.isBuiltIn
          : s.category === selectedCategory;
      const matchesSearch =
        searchFilter.trim() === ''
          ? true
          : s.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
            s.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
            s.probedNets.some((p) => p.toLowerCase().includes(searchFilter.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [scenarios, selectedCategory, searchFilter]);

  // Quick notification banner helper
  const showNotification = (msg: string) => {
    setStatusNotification(msg);
    setTimeout(() => setStatusNotification(null), 3000);
  };

  // Open Save New Scenario Drawer
  const handleOpenSaveDrawer = () => {
    const currentProbes = simulationState.probedNets.length > 0
      ? simulationState.probedNets
      : allCircuitNets.slice(0, 3);
    setSelectedProbesForSave([...currentProbes]);
    setNewScenarioName(`Scenario ${scenarios.filter((s) => !s.isBuiltIn).length + 1} (${simulationState.operatingConditions?.supplyVoltage ?? 5}V)`);
    setNewScenarioDesc('Custom circuit test profile with specific operating rails and probe set.');
    setNewScenarioBadge('User Profile');
    setNewSupplyVoltage(simulationState.operatingConditions?.supplyVoltage ?? 5.0);
    setNewTemperature(simulationState.operatingConditions?.temperature ?? 25);
    setNewSimSpeed(simulationState.speed ?? 1);
    setNewLoadCondition(simulationState.operatingConditions?.loadCondition ?? 'nominal');
    setPanelView('save_new');
  };

  // Save new scenario handler
  const handleConfirmSaveScenario = () => {
    if (!newScenarioName.trim()) {
      showNotification('Please enter a scenario name.');
      return;
    }

    const newScenario: SimulationScenario = {
      id: `user_scenario_${Date.now()}`,
      name: newScenarioName.trim(),
      description: newScenarioDesc.trim() || 'Custom user simulation scenario.',
      badge: newScenarioBadge.trim() || 'Custom',
      category: 'custom',
      probedNets: selectedProbesForSave.length > 0 ? selectedProbesForSave : ['VCC', '+5V'],
      operatingConditions: {
        supplyVoltage: Number(newSupplyVoltage) || 5.0,
        temperature: Number(newTemperature) || 25,
        simSpeed: Number(newSimSpeed) || 1,
        loadCondition: newLoadCondition,
        tolerance: 5,
        notes: newScenarioDesc.trim(),
      },
      isBuiltIn: false,
      createdAt: new Date().toISOString(),
    };

    const updated = saveUserSimulationScenario(newScenario);
    setScenarios(updated);
    onApplyScenario(newScenario);
    setPanelView('list');
    showNotification(`Saved and loaded "${newScenario.name}"`);
  };

  // Delete scenario handler
  const handleDeleteScenario = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteUserSimulationScenario(id);
    setScenarios(updated);
    showNotification('Scenario removed.');
  };

  // Duplicate scenario to custom handler
  const handleDuplicateToCustom = (src: SimulationScenario, e: React.MouseEvent) => {
    e.stopPropagation();
    const copy: SimulationScenario = {
      ...src,
      id: `user_copy_${Date.now()}`,
      name: `${src.name} (Copy)`,
      isBuiltIn: false,
      createdAt: new Date().toISOString(),
    };
    const updated = saveUserSimulationScenario(copy);
    setScenarios(updated);
    showNotification(`Duplicated "${src.name}" to custom scenario.`);
  };

  // Export Scenarios JSON
  const handleExportJson = () => {
    const jsonStr = exportScenariosAsJson(scenarios);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulation_scenarios_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Exported scenarios JSON.');
  };

  // Import Scenarios JSON
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const imported = importScenariosFromJson(text);
        setScenarios(imported);
        setImportError(null);
        showNotification(`Imported ${imported.length} scenarios.`);
      } catch (err: any) {
        setImportError(err.message || 'Failed to parse scenarios file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Toggle net probe in save drawer
  const handleToggleNetProbe = (net: string) => {
    setSelectedProbesForSave((prev) =>
      prev.includes(net) ? prev.filter((p) => p !== net) : [...prev, net]
    );
  };

  // Add custom probe string
  const handleAddCustomProbe = () => {
    if (customProbeInput.trim() && !selectedProbesForSave.includes(customProbeInput.trim())) {
      setSelectedProbesForSave((prev) => [...prev, customProbeInput.trim()]);
      setCustomProbeInput('');
    }
  };

  // Current conditions readout
  const currentVolt = simulationState.operatingConditions?.supplyVoltage ?? 5.0;
  const currentTemp = simulationState.operatingConditions?.temperature ?? 25;
  const currentSpeed = simulationState.speed ?? 1;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Hidden File Input for Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      {/* Main Header Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setPanelView('list');
        }}
        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-2 transition-all cursor-pointer ${
          isOpen
            ? 'bg-sky-600 text-white border-sky-400 shadow-md shadow-sky-950'
            : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700 hover:border-slate-600'
        }`}
        title="Simulation Scenarios: Save & Load Probe Sets & Operating Conditions"
      >
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className={`w-3.5 h-3.5 ${isOpen ? 'text-white' : 'text-sky-400'}`} />
          <span className="font-semibold max-w-[130px] sm:max-w-[180px] truncate">
            {activeScenario?.name || 'Scenarios'}
          </span>
        </div>

        {/* Operating Conditions Quick Badges */}
        <div className="hidden md:flex items-center gap-1 font-mono text-[10px] pl-1 border-l border-slate-700">
          <span className="px-1 py-0.2 bg-slate-800 text-amber-300 rounded" title="Supply Voltage">
            {currentVolt.toFixed(1)}V
          </span>
          <span
            className={`px-1 py-0.2 rounded ${
              currentTemp > 45
                ? 'bg-rose-950 text-rose-300'
                : currentTemp < 0
                ? 'bg-cyan-950 text-cyan-300'
                : 'bg-slate-800 text-slate-300'
            }`}
            title="Ambient Temperature"
          >
            {currentTemp}°C
          </span>
          <span className="px-1 py-0.2 bg-slate-800 text-emerald-300 rounded" title="Monitored Probes">
            {simulationState.probedNets.length}P
          </span>
        </div>

        <ChevronDown
          className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Panel */}
      {isOpen && (
        <div className="absolute left-0 sm:left-auto right-0 mt-2 w-[420px] max-w-[95vw] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden font-sans text-slate-100 flex flex-col">
          {/* Header Bar */}
          <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-sky-500/20 text-sky-400 rounded-md border border-sky-500/30">
                <Gauge className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                  Simulation Scenarios
                  <span className="text-[10px] px-1.5 py-0.2 bg-sky-950 text-sky-300 border border-sky-800 rounded-full font-mono">
                    {scenarios.length} Profiles
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Preset operating conditions &amp; probe sets for complex circuits
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {panelView !== 'list' ? (
                <button
                  onClick={() => setPanelView('list')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Back</span>
                </button>
              ) : (
                <button
                  onClick={handleOpenSaveDrawer}
                  className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
                  title="Save current circuit operating conditions & probes as a new scenario"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save Scenario</span>
                </button>
              )}
            </div>
          </div>

          {/* Status / Toast alert */}
          {statusNotification && (
            <div className="px-3 py-1.5 bg-emerald-950/80 border-b border-emerald-800 text-emerald-300 text-xs flex items-center gap-1.5 animate-fadeIn">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>{statusNotification}</span>
            </div>
          )}

          {importError && (
            <div className="px-3 py-1.5 bg-rose-950/80 border-b border-rose-800 text-rose-300 text-xs flex items-center justify-between">
              <span>{importError}</span>
              <button onClick={() => setImportError(null)} className="text-rose-400 hover:text-rose-200">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* VIEW: MAIN SCENARIO LIST */}
          {panelView === 'list' && (
            <div className="flex flex-col max-h-[480px]">
              {/* Active Conditions Summary Pill */}
              <div className="px-3.5 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Active Scenario:
                    </span>
                    <span className="font-bold text-sky-400 truncate max-w-[170px]">
                      {activeScenario?.name}
                    </span>
                  </div>

                  <button
                    onClick={() => setPanelView('custom_tweak')}
                    className="text-[11px] text-sky-400 hover:text-sky-300 underline font-medium cursor-pointer"
                  >
                    Quick Adjust Rails
                  </button>
                </div>

                {/* Operating Parameter Pills */}
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  <div className="bg-slate-900 border border-slate-800 p-1 rounded flex flex-col items-center">
                    <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                      <Zap className="w-2.5 h-2.5 text-amber-400" /> Rail V
                    </span>
                    <span className="font-mono text-xs font-bold text-amber-300">
                      {currentVolt.toFixed(1)}V
                    </span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-1 rounded flex flex-col items-center">
                    <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                      <Thermometer className="w-2.5 h-2.5 text-rose-400" /> Temp
                    </span>
                    <span className="font-mono text-xs font-bold text-rose-300">
                      {currentTemp}°C
                    </span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-1 rounded flex flex-col items-center">
                    <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5 text-sky-400" /> Speed
                    </span>
                    <span className="font-mono text-xs font-bold text-sky-300">
                      {currentSpeed}x
                    </span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-1 rounded flex flex-col items-center">
                    <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                      <Radio className="w-2.5 h-2.5 text-emerald-400" /> Probes
                    </span>
                    <span className="font-mono text-xs font-bold text-emerald-300">
                      {simulationState.probedNets.length} active
                    </span>
                  </div>
                </div>

                {/* Active Probes Preview */}
                <div className="flex flex-wrap items-center gap-1 pt-1">
                  <span className="text-[10px] text-slate-400">Probed Nets:</span>
                  {simulationState.probedNets.map((net, i) => (
                    <span
                      key={net}
                      className="px-1.5 py-0.2 bg-slate-800 text-sky-300 border border-sky-900/60 rounded text-[10px] font-mono"
                    >
                      {net}
                    </span>
                  ))}
                  {simulationState.probedNets.length === 0 && (
                    <span className="text-[10px] text-slate-500 italic">No nets currently probed</span>
                  )}
                </div>
              </div>

              {/* Category Filter Tabs */}
              <div className="px-3 pt-2 pb-1.5 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center space-x-1 overflow-x-auto text-[11px] pb-0.5">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'standard', label: 'Standard' },
                    { id: 'power', label: 'Power / Rails' },
                    { id: 'stress', label: 'Thermals & Stress' },
                    { id: 'speed', label: 'Speed' },
                    { id: 'custom', label: 'Custom' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                        selectedCategory === cat.id
                          ? 'bg-sky-700 text-white font-semibold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scenarios Scrollable List */}
              <div className="overflow-y-auto p-2 space-y-2 flex-1 max-h-[290px]">
                {filteredScenarios.map((scen) => {
                  const isActive = activeScenario?.id === scen.id;
                  const volt = scen.operatingConditions.supplyVoltage;
                  const temp = scen.operatingConditions.temperature;
                  const speed = scen.operatingConditions.simSpeed;

                  return (
                    <div
                      key={scen.id}
                      onClick={() => {
                        onApplyScenario(scen);
                        showNotification(`Loaded scenario: ${scen.name}`);
                      }}
                      className={`p-2.5 rounded-lg border transition-all cursor-pointer group flex flex-col gap-1.5 ${
                        isActive
                          ? 'bg-sky-950/40 border-sky-500/80 shadow-md shadow-sky-950/50 ring-1 ring-sky-500/50'
                          : 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {isActive ? (
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-slate-600 group-hover:bg-sky-400 transition-colors" />
                          )}
                          <span className={`text-xs font-bold ${isActive ? 'text-sky-300' : 'text-slate-100'}`}>
                            {scen.name}
                          </span>
                          {scen.badge && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-slate-800 text-slate-300 border border-slate-700 rounded font-mono">
                              {scen.badge}
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          {isActive ? (
                            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                              Click to Load
                            </span>
                          )}

                          <button
                            onClick={(e) => handleDuplicateToCustom(scen, e)}
                            className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded transition-colors"
                            title="Duplicate as Custom Scenario"
                          >
                            <Copy className="w-3 h-3" />
                          </button>

                          {!scen.isBuiltIn && (
                            <button
                              onClick={(e) => handleDeleteScenario(scen.id, e)}
                              className="p-1 text-rose-500 hover:text-rose-300 hover:bg-rose-950/50 rounded transition-colors"
                              title="Delete Scenario"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {scen.description}
                      </p>

                      {/* Tags & Probes */}
                      <div className="flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-slate-800/60 text-[10px]">
                        {/* Operating Condition Badges */}
                        <div className="flex items-center gap-1 font-mono">
                          <span className="px-1.5 py-0.2 bg-amber-950/60 text-amber-300 border border-amber-800/60 rounded">
                            {volt.toFixed(1)}V
                          </span>
                          <span className="px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded">
                            {temp}°C
                          </span>
                          <span className="px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded">
                            {speed}x speed
                          </span>
                        </div>

                        {/* Probed Net Pills */}
                        <div className="flex items-center gap-1 font-mono">
                          <span className="text-slate-500">Probes:</span>
                          {scen.probedNets.slice(0, 3).map((net) => (
                            <span
                              key={net}
                              className="px-1 py-0.2 bg-slate-800 text-sky-300 rounded"
                            >
                              {net}
                            </span>
                          ))}
                          {scen.probedNets.length > 3 && (
                            <span className="text-slate-500">+{scen.probedNets.length - 3}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredScenarios.length === 0 && (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    No scenarios found matching "{selectedCategory}". Click "Save Scenario" to create one.
                  </div>
                )}
              </div>

              {/* Footer Toolbar: Import/Export */}
              <div className="px-3 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportJson}
                    className="hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                    title="Export all scenarios to JSON"
                  >
                    <Download className="w-3 h-3 text-slate-400" />
                    <span>Export JSON</span>
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                    title="Import scenarios from JSON"
                  >
                    <Upload className="w-3 h-3 text-slate-400" />
                    <span>Import JSON</span>
                  </button>
                </div>

                <span className="text-[10px] text-slate-500 font-mono">
                  Auto-persisted to browser storage
                </span>
              </div>
            </div>
          )}

          {/* VIEW: SAVE NEW SCENARIO */}
          {panelView === 'save_new' && (
            <div className="p-4 flex flex-col gap-3 max-h-[480px] overflow-y-auto">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-sky-400" />
                  Save Current Simulation Scenario
                </span>
                <button
                  onClick={() => setPanelView('list')}
                  className="text-slate-400 hover:text-slate-200 text-xs"
                >
                  Cancel
                </button>
              </div>

              {/* Scenario Name */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Scenario Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={newScenarioName}
                  onChange={(e) => setNewScenarioName(e.target.value)}
                  placeholder="e.g. 5V Astable Full-Load Verification"
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-md text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-sky-500 font-sans"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Description &amp; Operating Notes
                </label>
                <textarea
                  value={newScenarioDesc}
                  onChange={(e) => setNewScenarioDesc(e.target.value)}
                  rows={2}
                  placeholder="Notes about expected waveform outputs, frequency, or threshold triggers..."
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-md text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-sky-500 font-sans resize-none"
                />
              </div>

              {/* Operating Conditions Inputs */}
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Operating Conditions
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Supply Rail Voltage (V)</label>
                    <div className="flex gap-1">
                      {[3.3, 5.0, 9.0, 12.0].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setNewSupplyVoltage(v)}
                          className={`px-1.5 py-0.5 text-[10px] font-mono rounded cursor-pointer ${
                            newSupplyVoltage === v
                              ? 'bg-amber-600 text-white font-bold'
                              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                          }`}
                        >
                          {v}V
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      step="0.1"
                      value={newSupplyVoltage}
                      onChange={(e) => setNewSupplyVoltage(parseFloat(e.target.value) || 5.0)}
                      className="w-full mt-1 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-amber-300 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Ambient Temp (°C)</label>
                    <div className="flex gap-1">
                      {[-20, 25, 70, 125].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setNewTemperature(t)}
                          className={`px-1.5 py-0.5 text-[10px] font-mono rounded cursor-pointer ${
                            newTemperature === t
                              ? 'bg-rose-600 text-white font-bold'
                              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                          }`}
                        >
                          {t}°C
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      value={newTemperature}
                      onChange={(e) => setNewTemperature(parseInt(e.target.value, 10) || 25)}
                      className="w-full mt-1 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-rose-300 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Simulation Speed</label>
                    <div className="flex gap-1">
                      {[0.5, 1, 2, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setNewSimSpeed(s)}
                          className={`flex-1 py-0.5 text-[10px] font-mono rounded cursor-pointer ${
                            newSimSpeed === s
                              ? 'bg-sky-600 text-white font-bold'
                              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                          }`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Load Condition</label>
                    <select
                      value={newLoadCondition}
                      onChange={(e) => setNewLoadCondition(e.target.value as any)}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200"
                    >
                      <option value="nominal">Nominal (Standard)</option>
                      <option value="heavy">Heavy Sink (+150mA)</option>
                      <option value="no_load">No Load / Open Circuit</option>
                      <option value="stress">Overvoltage Stress</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Probed Nets Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-300">
                    Probed Nets to Include ({selectedProbesForSave.length})
                  </label>
                  <span className="text-[10px] text-slate-500">Check nets to monitor</span>
                </div>

                {/* Available Net Chips */}
                <div className="flex flex-wrap gap-1 p-2 bg-slate-950 border border-slate-800 rounded-md max-h-28 overflow-y-auto">
                  {allCircuitNets.map((net) => {
                    const isChecked = selectedProbesForSave.includes(net);
                    return (
                      <button
                        key={net}
                        type="button"
                        onClick={() => handleToggleNetProbe(net)}
                        className={`px-2 py-0.5 text-[11px] font-mono rounded-md border flex items-center gap-1 transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-sky-950 border-sky-500 text-sky-300 font-semibold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {isChecked && <Check className="w-2.5 h-2.5" />}
                        {net}
                      </button>
                    );
                  })}

                  {allCircuitNets.length === 0 && (
                    <span className="text-[10px] text-slate-500 italic">No named nets in circuit</span>
                  )}
                </div>

                {/* Add Custom Probe */}
                <div className="flex gap-1.5 mt-1.5">
                  <input
                    type="text"
                    value={customProbeInput}
                    onChange={(e) => setCustomProbeInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomProbe()}
                    placeholder="Add custom net name (e.g. NET_CLOCK)..."
                    className="flex-1 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-slate-200 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomProbe}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded transition-colors cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPanelView('list')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSaveScenario}
                  className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-md shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save &amp; Apply Scenario</span>
                </button>
              </div>
            </div>
          )}

          {/* VIEW: QUICK ADJUST RAILS & LIVE CONDITIONS */}
          {panelView === 'custom_tweak' && (
            <div className="p-4 flex flex-col gap-3 max-h-[480px] overflow-y-auto">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  Live Operating Conditions Tweaker
                </span>
                <button
                  onClick={() => setPanelView('list')}
                  className="text-slate-400 hover:text-slate-200 text-xs"
                >
                  Done
                </button>
              </div>

              <p className="text-[11px] text-slate-400">
                Directly tune supply voltages, operating temperatures, and test conditions without saving a new scenario.
              </p>

              {/* Quick Voltage Select */}
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" /> DC Power Rail:
                  </span>
                  <span className="font-mono text-xs font-bold text-amber-300">
                    {currentVolt.toFixed(1)} Volts
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {[3.3, 5.0, 9.0, 12.0].map((volt) => (
                    <button
                      key={volt}
                      onClick={() => onUpdateConditions?.({ supplyVoltage: volt })}
                      className={`py-1 text-xs font-mono rounded border transition-all cursor-pointer ${
                        Math.abs(currentVolt - volt) < 0.05
                          ? 'bg-amber-950 border-amber-500 text-amber-300 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {volt}V
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Temperature Select */}
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                    <Thermometer className="w-3 h-3 text-rose-400" /> Ambient Temperature:
                  </span>
                  <span className="font-mono text-xs font-bold text-rose-300">
                    {currentTemp}°C
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: '-20°C', val: -20, icon: Snowflake },
                    { label: '25°C', val: 25, icon: Thermometer },
                    { label: '70°C', val: 70, icon: Flame },
                    { label: '125°C', val: 125, icon: Flame },
                  ].map((item) => (
                    <button
                      key={item.val}
                      onClick={() => onUpdateConditions?.({ temperature: item.val })}
                      className={`py-1 text-xs font-mono rounded border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        currentTemp === item.val
                          ? 'bg-rose-950 border-rose-500 text-rose-300 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <item.icon className="w-2.5 h-2.5" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Return to list button */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleOpenSaveDrawer}
                  className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Save these settings as a new Scenario
                </button>
                <button
                  type="button"
                  onClick={() => setPanelView('list')}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded transition-colors cursor-pointer"
                >
                  Close Tweaker
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
