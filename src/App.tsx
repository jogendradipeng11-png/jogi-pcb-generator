import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  SchematicDocument,
  EditorTool,
  CanvasViewMode,
  ComponentDefinition,
  PinDefinition,
  Point,
  SchematicComponent,
  Wire,
  SimulationState,
  SimulationScenario,
  OperatingConditions,
  UserProfile,
  AllDataSheetComponent,
  CircuitRotationDirection,
} from './types';
import { STARTER_CIRCUITS } from './data/examples';
import { getComponentDef, registerCustomComponentDef, COMPONENT_CATALOG } from './data/components';
import { Header } from './components/layout/Header';
import { SchematicCanvas } from './components/schematic/SchematicCanvas';
import { PcbCanvas } from './components/pcb/PcbCanvas';
import { ComponentLibraryPanel } from './components/panels/ComponentLibraryPanel';
import { PropertiesPanel } from './components/panels/PropertiesPanel';
import { AllDataSheetModal } from './components/panels/AllDataSheetModal';
import { AiCircuitModal } from './components/ai/AiCircuitModal';
import { BomPanel } from './components/panels/BomPanel';
import { ErcPanel } from './components/panels/ErcPanel';
import { NetlistPanel } from './components/panels/NetlistPanel';
import { OscilloscopePanel } from './components/simulation/OscilloscopePanel';
import { Pcb3DViewer } from './components/pcb/Pcb3DViewer';
import { PrintPdfModal } from './components/panels/PrintPdfModal';
import { UniversalFileModal } from './components/panels/UniversalFileModal';
import { GoogleReferenceModal } from './components/panels/GoogleReferenceModal';
import { ProductSelectorModal } from './components/panels/ProductSelectorModal';
import { IndustrialPanelDiagram } from './components/panels/IndustrialPanelDiagram';
import { AuthModal } from './components/auth/AuthModal';
import { KeyboardShortcutsModal } from './components/help/KeyboardShortcutsModal';
import { KeyboardShortcutsOverlay } from './components/help/KeyboardShortcutsOverlay';
import { GitHubDeployModal } from './components/modals/GitHubDeployModal';
import { AutoCorrectModal } from './components/modals/AutoCorrectModal';
import { CircuitsDiyExplorerModal } from './components/modals/CircuitsDiyExplorerModal';
import { ComponentPinoutModal } from './components/modals/ComponentPinoutModal';
import { LoadDiagramSketchModal } from './components/modals/LoadDiagramSketchModal';
import { CircuitBrainModal } from './components/modals/CircuitBrainModal';
import { AiCircuitChatDrawer } from './components/chat/AiCircuitChatDrawer';
import { getCurrentUser, setCurrentUser, subscribeToAuthChanges } from './utils/authService';
import { loadUserSavedComponents } from './utils/userComponents';
import { stepCircuitSimulation } from './utils/simulation';
import { generateGerberZip } from './utils/gerber';
import { autoRouteSchematicNets } from './utils/autorouter';
import { reannotateComponents } from './utils/annotation';
import { rotateCircuit } from './utils/circuitTransform';
import { getComponentRealImageUrl } from './utils/componentImages';
import { learnCircuit } from './utils/circuitBrainLearner';
import {
  importCircuitFromImageDataUrl,
  importCircuitFromUrlOrText,
  readClipboardCircuitData,
} from './utils/circuitClipboardImporter';
import { Sparkles, HelpCircle, Layers, Cpu, Activity, CheckCircle2 } from 'lucide-react';

// Ensure all component and wire IDs are strictly unique and document is guaranteed valid
function sanitizeDocument(doc?: Partial<SchematicDocument> | null): SchematicDocument {
  const fallback = (STARTER_CIRCUITS && STARTER_CIRCUITS[0]) || {
    id: 'starter_circuit_fallback',
    title: 'Circuit Schematic',
    category: 'General',
    summary: 'Standard schematic circuit diagram.',
    components: [],
    wires: [],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const base = doc || fallback;
  const rawWires = Array.isArray(base.wires)
    ? base.wires
    : Array.isArray(fallback.wires)
    ? fallback.wires
    : [];
  const rawComponents = Array.isArray(base.components)
    ? base.components
    : Array.isArray(fallback.components)
    ? fallback.components
    : [];

  const seenWireIds = new Set<string>();
  const uniqueWires: Wire[] = [];
  for (const w of rawWires) {
    if (!w || !w.id) continue;
    if (!seenWireIds.has(w.id)) {
      seenWireIds.add(w.id);
      uniqueWires.push(w);
    } else {
      const newId = `${w.id}_${Math.random().toString(36).slice(2, 6)}`;
      seenWireIds.add(newId);
      uniqueWires.push({ ...w, id: newId });
    }
  }

  const seenCompIds = new Set<string>();
  const uniqueComponents: SchematicComponent[] = [];
  for (const c of rawComponents) {
    if (!c || !c.id) continue;
    if (!seenCompIds.has(c.id)) {
      seenCompIds.add(c.id);
      uniqueComponents.push(c);
    } else {
      const newId = `${c.id}_${Math.random().toString(36).slice(2, 6)}`;
      seenCompIds.add(newId);
      uniqueComponents.push({ ...c, id: newId });
    }
  }

  return {
    id: base.id || fallback.id || `doc_${Date.now()}`,
    title: base.title || fallback.title || 'Circuit Schematic',
    category: base.category || fallback.category || 'General',
    summary: base.summary ?? fallback.summary ?? '',
    explanation: base.explanation ?? fallback.explanation ?? '',
    formula: base.formula ?? fallback.formula ?? '',
    specifications: Array.isArray(base.specifications) ? base.specifications : fallback.specifications || [],
    tips: Array.isArray(base.tips) ? base.tips : fallback.tips || [],
    components: uniqueComponents,
    wires: uniqueWires,
    version: base.version || fallback.version || 1,
    createdAt: base.createdAt || fallback.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export default function App() {
  // Main Schematic Document
  const [doc, setDoc] = useState<SchematicDocument>(() => sanitizeDocument(STARTER_CIRCUITS[0]));
  const safeDoc = useMemo(() => sanitizeDocument(doc), [doc]);

  // History stack for Undo / Redo
  const [history, setHistory] = useState<SchematicDocument[]>([sanitizeDocument(STARTER_CIRCUITS[0])]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // View & Tool States
  const [viewMode, setViewMode] = useState<CanvasViewMode>('schematic');
  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [placingDef, setPlacingDef] = useState<ComponentDefinition | null>(null);

  // Selection
  const [selectedCompIds, setSelectedCompIds] = useState<string[]>([]);
  const [selectedWireIds, setSelectedWireIds] = useState<string[]>([]);

  // Canvas Transform
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState<Point>({ x: 80, y: 40 });

  // Dialog & Modal states
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isBomOpen, setIsBomOpen] = useState(false);
  const [isErcOpen, setIsErcOpen] = useState(false);
  const [isNetlistOpen, setIsNetlistOpen] = useState(false);
  const [isPrintPdfOpen, setIsPrintPdfOpen] = useState(false);
  const [isUniversalModalOpen, setIsUniversalModalOpen] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleSearchQuery, setGoogleSearchQuery] = useState('');
  const [isAllDataSheetModalOpen, setIsAllDataSheetModalOpen] = useState(false);
  const [allDataSheetSearchQuery, setAllDataSheetSearchQuery] = useState('');
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);
  const [isCircuitsDiyOpen, setIsCircuitsDiyOpen] = useState(false);
  const [isAutoCorrectOpen, setIsAutoCorrectOpen] = useState(false);
  const [isPinoutModalOpen, setIsPinoutModalOpen] = useState(false);
  const [isLoadDiagramModalOpen, setIsLoadDiagramModalOpen] = useState(false);
  const [isCircuitBrainOpen, setIsCircuitBrainOpen] = useState(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [productSelectorComp, setProductSelectorComp] = useState<SchematicComponent | null>(null);
  const [internalClipboard, setInternalClipboard] = useState<{
    components: SchematicComponent[];
    wires: Wire[];
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showInfoBanner, setShowInfoBanner] = useState(true);

  // User Authentication State
  const [currentUser, setLocalCurrentUser] = useState<UserProfile | null>(() => getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'whatsapp_otp' | 'forgot_password'>('signin');

  // Load custom/Google synthesized parts and listen to auth changes on startup
  useEffect(() => {
    loadUserSavedComponents();
    const unsub = subscribeToAuthChanges((user) => {
      setLocalCurrentUser(user);
    });
    return unsub;
  }, []);

  const handleOpenAuth = (mode: 'signin' | 'signup' | 'whatsapp_otp' | 'forgot_password' = 'signin') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = (user: UserProfile) => {
    setLocalCurrentUser(user);
    setIsAuthModalOpen(false);
    setToastMessage(`Welcome, ${user.name}! ${user.isWhatsappVerified ? 'WhatsApp verified.' : ''}`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLocalCurrentUser(null);
    setToastMessage('Signed out successfully.');
  };

  const handleSearchGoogle = (query: string) => {
    setGoogleSearchQuery(query);
    setIsGoogleModalOpen(true);
  };

  // Real-Time Simulation State
  const [simulationState, setSimulationState] = useState<SimulationState>(() => ({
    isRunning: true, // Start with live simulation active
    speed: 1,
    time: 0,
    netVoltages: {},
    pinVoltages: {},
    wireCurrents: {},
    componentResults: {},
    probedNets: ['VCC', '+5V', 'OUT_555'],
    probedWaveforms: {},
    activeScenarioId: 'scenario_nominal_5v',
    activeScenarioName: 'Nominal 5.0V Baseline (25°C)',
    operatingConditions: {
      supplyVoltage: 5.0,
      temperature: 25,
      simSpeed: 1,
      loadCondition: 'nominal',
      tolerance: 0,
      notes: 'Standard room-temperature lab benchmark with regulated 5.0V rail',
    },
  }));
  const [isScopeOpen, setIsScopeOpen] = useState(false);

  // Record document changes to Undo/Redo history (capped at 30 to protect memory)
  const commitDocumentChange = useCallback((newDoc?: Partial<SchematicDocument> | null) => {
    const cleanDoc = sanitizeDocument(newDoc);
    setDoc(cleanDoc);
    setHistory((prev) => {
      const validIndex = Math.min(Math.max(0, historyIndex), prev.length - 1);
      const sliced = prev.slice(0, validIndex + 1);
      const updated = [...sliced, cleanDoc];
      if (updated.length > 30) {
        return updated.slice(updated.length - 30);
      }
      return updated;
    });
    setHistoryIndex((prev) => Math.min(29, prev + 1));
  }, [historyIndex]);

  // Apply a Simulation Scenario (loads saved probes, operating conditions & rails)
  const handleApplyScenario = useCallback((scenario: SimulationScenario) => {
    setSimulationState((prev) => ({
      ...prev,
      activeScenarioId: scenario.id,
      activeScenarioName: scenario.name,
      speed: scenario.operatingConditions.simSpeed || prev.speed,
      probedNets: [...scenario.probedNets],
      operatingConditions: { ...scenario.operatingConditions },
    }));

    // If scenario specifies component overrides (e.g. switch positions, source voltages), apply them to doc.components
    if (scenario.componentOverrides && Object.keys(scenario.componentOverrides).length > 0) {
      setDoc((prev) => {
        const current = sanitizeDocument(prev);
        return {
          ...current,
          components: current.components.map((c) => {
            const override = scenario.componentOverrides?.[c.id];
            if (!override) return c;
            return {
              ...c,
              testSettings: {
                ...(c.testSettings || {}),
                ...override,
              },
            };
          }),
        };
      });
    }
  }, []);

  // Update live operating conditions (supply voltage, ambient temp, load condition)
  const handleUpdateConditions = useCallback((conditions: Partial<OperatingConditions>, newProbes?: string[]) => {
    setSimulationState((prev) => {
      const currentCond = prev.operatingConditions || {
        supplyVoltage: 5.0,
        temperature: 25,
        simSpeed: prev.speed,
        loadCondition: 'nominal',
      };
      const updatedCond: OperatingConditions = { ...currentCond, ...conditions };
      return {
        ...prev,
        speed: conditions.simSpeed !== undefined ? conditions.simSpeed : prev.speed,
        probedNets: newProbes !== undefined ? newProbes : prev.probedNets,
        operatingConditions: updatedCond,
      };
    });
  }, []);

  // Real-Time Circuit Simulation Animation Loop (60 FPS)
  useEffect(() => {
    if (!simulationState.isRunning || viewMode !== 'schematic') return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const simLoop = (now: number) => {
      const dt = Math.min(0.04, (now - lastTime) / 1000);
      lastTime = now;

      setSimulationState((prev) =>
        stepCircuitSimulation(safeDoc.components, safeDoc.wires, prev, dt)
      );

      animationFrameId = requestAnimationFrame(simLoop);
    };

    animationFrameId = requestAnimationFrame(simLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [simulationState.isRunning, viewMode, safeDoc.components, safeDoc.wires]);

  // Toggle Oscilloscope Probed Net
  const handleToggleProbeNet = useCallback((net: string) => {
    setSimulationState((prev) => {
      const isAlreadyProbed = prev.probedNets.includes(net);
      const newProbes = isAlreadyProbed
        ? prev.probedNets.filter((n) => n !== net)
        : [...prev.probedNets, net];
      return {
        ...prev,
        probedNets: newProbes,
      };
    });
    // Open scope automatically if not open yet
    setIsScopeOpen(true);
  }, []);

  // Quick switch toggle on canvas
  const handleToggleSwitch = useCallback((component: SchematicComponent) => {
    const isClosed = component.testSettings?.isClosed ?? true;
    const nextComps = (safeDoc.components || []).map((c) =>
      c.id === component.id
        ? {
            ...c,
            testSettings: {
              ...(c.testSettings || {}),
              isClosed: !isClosed,
            },
          }
        : c
    );
    commitDocumentChange({
      ...safeDoc,
      components: nextComps,
      updatedAt: new Date().toISOString(),
    });
  }, [safeDoc, commitDocumentChange]);

  // Update component settings (e.g. potentiometer slider, resistance, switch)
  const handleUpdateComponentSettings = useCallback((componentId: string, settings: Partial<SchematicComponent['testSettings']>) => {
    const nextComps = (safeDoc.components || []).map((c) =>
      c.id === componentId
        ? {
            ...c,
            testSettings: {
              ...(c.testSettings || {}),
              ...settings,
            },
          }
        : c
    );
    commitDocumentChange({
      ...safeDoc,
      components: nextComps,
      updatedAt: new Date().toISOString(),
    });
  }, [safeDoc, commitDocumentChange]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const nextIdx = historyIndex - 1;
      if (history[nextIdx]) {
        setHistoryIndex(nextIdx);
        setDoc(sanitizeDocument(history[nextIdx]));
        setSelectedCompIds([]);
        setSelectedWireIds([]);
      }
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      if (history[nextIdx]) {
        setHistoryIndex(nextIdx);
        setDoc(sanitizeDocument(history[nextIdx]));
        setSelectedCompIds([]);
        setSelectedWireIds([]);
      }
    }
  }, [historyIndex, history]);

  // Add a circuit directly from Google Search / Reference Hub into the schematic
  const handleAddCircuitFromGoogle = useCallback(
    (newComponents: SchematicComponent[], newWires: Wire[] = []) => {
      if (!newComponents || newComponents.length === 0) return;

      const currentComps = safeDoc.components || [];
      const currentWires = safeDoc.wires || [];

      // Ensure every new component has a valid definition registered so it renders cleanly
      newComponents.forEach((c) => {
        const existing = COMPONENT_CATALOG.find((def) => def.type === c.type);
        if (!existing) {
          const pinCount = (c.pins || []).length;
          const half = Math.max(1, Math.ceil(pinCount / 2));
          const pins: PinDefinition[] = (c.pins || []).map((p, idx) => {
            const isLeft = pinCount <= 2 ? idx === 0 : idx < half;
            const rowIdx = isLeft ? idx : idx - half;
            const yOffset = (rowIdx - (half - 1) / 2) * 20;
            return {
              id: p.id,
              name: p.name,
              x: isLeft ? -45 : 45,
              y: Math.round(yOffset),
              direction: isLeft ? 'left' : 'right',
              type: 'passive',
            };
          });
          registerCustomComponentDef({
            type: c.type,
            name: c.value || c.type,
            prefix: c.designator ? c.designator.replace(/[0-9]/g, '') : 'U',
            category: 'modules',
            defaultVal: c.value,
            defaultFootprint: c.footprint || 'MODULE_STANDARD',
            width: 90,
            height: Math.max(60, half * 22 + 20),
            pins: pins.length > 0 ? pins : [
              { id: '1', name: '1', x: -40, y: 0, direction: 'left', type: 'passive' },
              { id: '2', name: '2', x: 40, y: 0, direction: 'right', type: 'passive' },
            ],
            description: c.datasheetDescription || c.value,
            symbol: 'generic_ic',
          });
        }
      });

      // Find an offset so it doesn't directly overlap existing components
      const maxX = currentComps.length > 0 
        ? Math.max(...currentComps.map((c) => c.x)) + 160 
        : 120;
      const minY = newComponents.length > 0 ? Math.min(...newComponents.map((c) => c.y)) : 0;
      const minX = newComponents.length > 0 ? Math.min(...newComponents.map((c) => c.x)) : 0;
      
      const offsetX = maxX - minX;
      const offsetY = 100 - minY;

      // Map ID collisions
      const idMap = new Map<string, string>();
      const placedComponents: SchematicComponent[] = newComponents.map((c) => {
        const uniqueId = `comp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        idMap.set(c.id, uniqueId);
        return {
          ...c,
          id: uniqueId,
          x: Math.round((c.x + offsetX) / 10) * 10,
          y: Math.round((c.y + offsetY) / 10) * 10,
        };
      });

      let placedWires: Wire[] = (newWires || []).map((w) => {
        return {
          ...w,
          id: `wire_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          startPin: w.startPin && idMap.has(w.startPin.componentId)
            ? { ...w.startPin, componentId: idMap.get(w.startPin.componentId)! }
            : w.startPin,
          endPin: w.endPin && idMap.has(w.endPin.componentId)
            ? { ...w.endPin, componentId: idMap.get(w.endPin.componentId)! }
            : w.endPin,
          points: (w.points || []).map((pt) => ({
            x: Math.round((pt.x + offsetX) / 10) * 10,
            y: Math.round((pt.y + offsetY) / 10) * 10,
          })),
        };
      });

      // If newWires was empty or zero, auto-route nets between placed components
      if (placedWires.length === 0 && placedComponents.some((c) => (c.pins || []).some((p) => p.net))) {
        const routed = autoRouteSchematicNets(placedComponents, []);
        placedWires = routed.newWires;
      }

      const updated = sanitizeDocument({
        ...safeDoc,
        components: [...currentComps, ...placedComponents],
        wires: [...currentWires, ...placedWires],
        updatedAt: new Date().toISOString(),
      });

      commitDocumentChange(updated);
      setSelectedCompIds(placedComponents.map((c) => c.id));
      setSelectedWireIds([]);
      setActiveTool('select');

      // Smoothly center canvas viewport on newly placed circuit
      if (placedComponents.length > 0) {
        const minPlacedX = Math.min(...placedComponents.map((c) => c.x));
        const maxPlacedX = Math.max(...placedComponents.map((c) => c.x));
        const minPlacedY = Math.min(...placedComponents.map((c) => c.y));
        const maxPlacedY = Math.max(...placedComponents.map((c) => c.y));
        const midX = (minPlacedX + maxPlacedX) / 2;
        const midY = (minPlacedY + maxPlacedY) / 2;
        setPan({
          x: Math.round(400 - midX * zoom),
          y: Math.round(260 - midY * zoom),
        });
      }

      setToastMessage(`⚡ Added circuit with ${placedComponents.length} components to schematic!`);
    },
    [safeDoc, zoom, commitDocumentChange]
  );

  // Open AllDataSheet Search Modal
  const handleOpenAllDataSheetModal = useCallback((query: string = '') => {
    setAllDataSheetSearchQuery(query);
    setIsAllDataSheetModalOpen(true);
  }, []);

  // Apply component data from AllDataSheet into schematic: directly adds component to circuit diagram
  const handleApplyAllDataSheetComponent = useCallback(
    (part: AllDataSheetComponent) => {
      // Determine reference designator prefix based on component category
      let prefix = 'U';
      const catLower = (part.category || '').toLowerCase();
      if (catLower.includes('transistor') || catLower.includes('mosfet')) {
        prefix = 'Q';
      } else if (catLower.includes('diode')) {
        prefix = 'D';
      } else if (catLower.includes('resistor')) {
        prefix = 'R';
      } else if (catLower.includes('capacitor')) {
        prefix = 'C';
      } else if (catLower.includes('sensor')) {
        prefix = 'S';
      }

      const currentComps = safeDoc.components || [];
      const existingCount = currentComps.filter((c) => c.designator.startsWith(prefix)).length;
      const nextDesignator = `${prefix}${existingCount + 1}`;

      // Calculate placement coordinates near viewport center with collision avoidance
      let placeX = Math.round((Math.max(120, -pan.x + 360)) / 10) * 10;
      let placeY = Math.round((Math.max(120, -pan.y + 240)) / 10) * 10;

      while (currentComps.some((c) => Math.abs(c.x - placeX) < 40 && Math.abs(c.y - placeY) < 40)) {
        placeX += 50;
        placeY += 40;
      }

      // Dynamically create and register custom component definition with physical pin locations
      const cleanPartName = (part.partNumber || 'PART').replace(/[^a-zA-Z0-9]/g, '_');
      const customType = `ads_${cleanPartName.toLowerCase()}_${Date.now().toString(36)}`;
      
      const pinCount = (part.pinout && part.pinout.length > 0) ? part.pinout.length : 8;
      const isDualRow = pinCount >= 4;
      const half = Math.ceil(pinCount / 2);
      const rowSpacing = 22;
      const boxHeight = Math.max(70, half * rowSpacing + 28);
      const boxWidth = 100;
      
      const defPins: PinDefinition[] = (part.pinout && part.pinout.length > 0)
        ? part.pinout.map((p, idx) => {
            const isLeft = isDualRow ? idx < half : idx % 2 === 0;
            const rowIdx = isDualRow ? (isLeft ? idx : idx - half) : Math.floor(idx / 2);
            const totalRows = isDualRow ? half : Math.ceil(pinCount / 2);
            const yOffset = (rowIdx - (totalRows - 1) / 2) * rowSpacing;
            return {
              id: String(p.pin),
              name: p.name,
              number: String(p.pin),
              x: isLeft ? -boxWidth / 2 : boxWidth / 2,
              y: Math.round(yOffset),
              direction: isLeft ? 'left' : 'right',
              type: (p.type as any) || (p.name.toLowerCase().includes('gnd') ? 'ground' : p.name.toLowerCase().includes('vcc') ? 'power' : 'passive'),
            };
          })
        : [
            { id: '1', name: '1', x: -40, y: -15, direction: 'left', type: 'passive' },
            { id: '2', name: '2', x: -40, y: 15, direction: 'left', type: 'passive' },
            { id: '3', name: '3', x: 40, y: -15, direction: 'right', type: 'passive' },
            { id: '4', name: '4', x: 40, y: 15, direction: 'right', type: 'passive' },
          ];

      const customDef: ComponentDefinition = {
        type: customType,
        name: `${part.partNumber} (${part.manufacturer || 'IC'})`,
        prefix,
        category: (catLower.includes('sensor') ? 'sensors' : catLower.includes('transistor') ? 'semiconductors' : 'ics') as any,
        defaultVal: part.partNumber,
        defaultFootprint: part.package || 'DIP-8',
        width: boxWidth,
        height: boxHeight,
        pins: defPins,
        description: part.description,
        symbol: 'generic_ic',
      };

      registerCustomComponentDef(customDef);

      const initialPins = defPins.map((p) => ({
        id: p.id,
        name: p.name,
      }));

      const resolvedImageUrl = part.imageUrl || getComponentRealImageUrl(part.partNumber, part.category, part.package);

      const newComponent: SchematicComponent = {
        id: `comp_ads_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: customType,
        designator: nextDesignator,
        value: part.partNumber,
        footprint: part.package,
        x: placeX,
        y: placeY,
        rotation: 0,
        pins: initialPins,
        imageUrl: resolvedImageUrl,
        alldatasheetUrl: part.pdfUrl || part.alldatasheetUrl,
        manufacturer: part.manufacturer,
        partNumber: part.partNumber,
        datasheetDescription: part.description,
        datasheetSpecs: part.specs,
        realPart: {
          id: part.id,
          manufacturer: part.manufacturer,
          manufacturerPartNumber: part.partNumber,
          category: part.category,
          description: part.description,
          packageFootprint: part.package,
          datasheetUrl: part.pdfUrl || part.alldatasheetUrl,
          approximatePriceUSD: 0.85,
          inStock: true,
          stockCount: 5000,
          supplier: 'AllDataSheet Verified Part',
          leadTimeDays: 2,
          pinCount: part.pinCount,
          specs: part.specs,
          recommendedApplication: part.applicationNotes,
        },
      };

      const updated = sanitizeDocument({
        ...safeDoc,
        components: [...currentComps, newComponent],
        updatedAt: new Date().toISOString(),
      });

      commitDocumentChange(updated);
      setSelectedCompIds([newComponent.id]);
      setSelectedWireIds([]);
      setActiveTool('select');

      // Center viewport onto the placed component
      setPan({
        x: Math.round(360 - placeX * zoom),
        y: Math.round(240 - placeY * zoom),
      });

      setToastMessage(`⚡ Added ${part.partNumber} (${part.manufacturer}) directly to circuit diagram!`);
      setIsAllDataSheetModalOpen(false);
    },
    [safeDoc, pan, zoom, commitDocumentChange]
  );

  // Apply datasheet specs to an existing selected component
  const handleApplySpecsToComponent = useCallback(
    (
      componentId: string,
      datasheetData: {
        partNumber: string;
        manufacturer: string;
        alldatasheetUrl: string;
        footprint: string;
        description: string;
        specs: Record<string, string>;
      }
    ) => {
      const currentComps = safeDoc.components || [];
      const updated = currentComps.map((c) => {
        if (c.id === componentId) {
          return {
            ...c,
            value: datasheetData.partNumber,
            footprint: datasheetData.footprint || c.footprint,
            manufacturer: datasheetData.manufacturer,
            partNumber: datasheetData.partNumber,
            alldatasheetUrl: datasheetData.alldatasheetUrl,
            datasheetDescription: datasheetData.description,
            datasheetSpecs: datasheetData.specs,
          };
        }
        return c;
      });
      commitDocumentChange({
        ...safeDoc,
        components: updated,
        updatedAt: new Date().toISOString(),
      });
      setToastMessage(`Updated ${datasheetData.partNumber} specs on component!`);
    },
    [safeDoc, commitDocumentChange]
  );

  // Quick Insert Power & Earthing Reference Rails (+ / - / ⏚ PE)
  const handleInsertPowerReferences = useCallback(() => {
    const currentComps = safeDoc.components || [];
    const currentWires = safeDoc.wires || [];

    // Place near viewport center with 10px grid snap
    const baseX = Math.round(Math.max(120, -pan.x + 300) / 10) * 10;
    const baseY = Math.round(Math.max(140, -pan.y + 220) / 10) * 10;

    const vSourceId = `vsource_${Date.now()}`;
    const vPosId = `vpos_${Date.now()}`;
    const vNegId = `vneg_${Date.now()}`;
    const peId = `pe_${Date.now()}`;

    const newComps: SchematicComponent[] = [
      {
        id: vSourceId,
        type: 'dc_source',
        designator: `V${currentComps.filter((c) => c.type === 'dc_source').length + 1}`,
        value: '12V',
        footprint: 'PWR-TB-2P_5.08',
        x: baseX,
        y: baseY + 80,
        rotation: 0,
        pins: [
          { id: '1', name: '+', net: 'VCC' },
          { id: '2', name: '-', net: 'GND' },
        ],
      },
      {
        id: vPosId,
        type: 'source_pos_point',
        designator: `V_POS${currentComps.filter((c) => c.type === 'source_pos_point').length + 1}`,
        value: '+12V',
        footprint: 'TESTPOINT_RED',
        x: baseX + 180,
        y: baseY,
        rotation: 0,
        pins: [{ id: '1', name: '+', net: 'VCC' }],
      },
      {
        id: vNegId,
        type: 'source_neg_point',
        designator: `V_NEG${currentComps.filter((c) => c.type === 'source_neg_point').length + 1}`,
        value: '-Ve (0V)',
        footprint: 'TESTPOINT_BLK',
        x: baseX + 180,
        y: baseY + 180,
        rotation: 0,
        pins: [{ id: '1', name: '-', net: 'GND' }],
      },
      {
        id: peId,
        type: 'earth_ground',
        designator: `PE${currentComps.filter((c) => c.type === 'earth_ground').length + 1}`,
        value: 'EARTH (⏚)',
        footprint: 'EARTH_CHASSIS_LUG',
        x: baseX,
        y: baseY + 180,
        rotation: 0,
        pins: [{ id: '1', name: 'EARTH', net: 'EARTH' }],
      },
    ];

    const newWires: Wire[] = [
      {
        id: `wire_vpos_${Date.now()}`,
        points: [
          { x: baseX, y: baseY + 50 },
          { x: baseX, y: baseY },
          { x: baseX + 180, y: baseY },
          { x: baseX + 180, y: baseY + 16 },
        ],
        net: 'VCC',
        startPin: { componentId: vSourceId, pinId: '1' },
        endPin: { componentId: vPosId, pinId: '1' },
      },
      {
        id: `wire_vneg_${Date.now()}`,
        points: [
          { x: baseX, y: baseY + 110 },
          { x: baseX, y: baseY + 150 },
          { x: baseX + 180, y: baseY + 150 },
          { x: baseX + 180, y: baseY + 164 },
        ],
        net: 'GND',
        startPin: { componentId: vSourceId, pinId: '2' },
        endPin: { componentId: vNegId, pinId: '1' },
      },
      {
        id: `wire_pe_${Date.now()}`,
        points: [
          { x: baseX, y: baseY + 150 },
          { x: baseX, y: baseY + 162 },
        ],
        net: 'EARTH',
        startPin: { componentId: vSourceId, pinId: '2' },
        endPin: { componentId: peId, pinId: '1' },
      },
    ];

    const updated = sanitizeDocument({
      ...safeDoc,
      components: [...currentComps, ...newComps],
      wires: [...currentWires, ...newWires],
      updatedAt: new Date().toISOString(),
    });

    commitDocumentChange(updated);
    setSelectedCompIds(newComps.map((c) => c.id));
    setSelectedWireIds([]);
    setActiveTool('select');
    setToastMessage('⚡ Added DC Voltage Source (+ / -) & Earthing reference points to circuit!');
  }, [safeDoc, pan, commitDocumentChange]);

  // Circuit Rotation Handler (Rotates full circuit or selected subset, preserving wire connectivity)
  const handleRotateCircuit = useCallback(
    (direction: CircuitRotationDirection) => {
      const isSubset = selectedCompIds.length > 0;
      const result = rotateCircuit(
        safeDoc.components || [],
        safeDoc.wires || [],
        direction,
        isSubset ? selectedCompIds : undefined,
        isSubset ? selectedWireIds : undefined
      );

      const updated = sanitizeDocument({
        ...safeDoc,
        components: result.components,
        wires: result.wires,
        updatedAt: new Date().toISOString(),
      });

      commitDocumentChange(updated);
      setToastMessage(
        isSubset
          ? `Rotated ${selectedCompIds.length} selected component(s) (${direction})`
          : `Rotated entire circuit (${direction})`
      );
    },
    [safeDoc, selectedCompIds, selectedWireIds, commitDocumentChange]
  );

  // Global Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, W, S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'w' || e.key === 'W') {
        setActiveTool((prev) => (prev === 'wire' ? 'select' : 'wire'));
      } else if (e.key === 'p' || e.key === 'P') {
        setActiveTool((prev) => (prev === 'probe' ? 'select' : 'probe'));
      } else if (e.key === 's' || e.key === 'S') {
        setActiveTool('select');
      } else if (e.key === 'h' || e.key === 'H') {
        setActiveTool((prev) => (prev === 'pan' ? 'select' : 'pan'));
      } else if (e.key === 'e' || e.key === 'E') {
        setActiveTool((prev) => (prev === 'erase' ? 'select' : 'erase'));
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
      } else if (e.key === ' ' && viewMode === 'schematic') {
        e.preventDefault();
        setSimulationState((prev) => ({ ...prev, isRunning: !prev.isRunning }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, viewMode]);

  // Read Clipboard and Auto-Generate circuit onto Schematic Editor
  const handlePasteFromClipboard = useCallback(async () => {
    setToastMessage('Reading clipboard for copied circuit diagram image or web link...');
    try {
      const clip = await readClipboardCircuitData();
      if (!clip) {
        setIsGoogleModalOpen(true);
        setToastMessage('Press Ctrl+V to paste your copied circuit image or web link directly!');
        return;
      }

      if (clip.type === 'image') {
        setToastMessage('🔍 Translating copied circuit image into schematic components & nets...');
        const res = await importCircuitFromImageDataUrl(clip.data);
        if (res.components && res.components.length > 0) {
          setViewMode('schematic');
          handleAddCircuitFromGoogle(res.components, res.wires);
          setToastMessage(`⚡ Auto-generated circuit "${res.title}" from copied image onto schematic editor!`);
        }
      } else if (clip.type === 'text') {
        setToastMessage(`⚡ Auto-generating schematic from copied link: "${clip.data.slice(0, 40)}..."`);
        const res = await importCircuitFromUrlOrText(clip.data);
        if (res.components && res.components.length > 0) {
          setViewMode('schematic');
          handleAddCircuitFromGoogle(res.components, res.wires);
          setToastMessage(`⚡ Auto-generated circuit "${res.title}" from copied link onto schematic editor!`);
        }
      }
    } catch (err) {
      console.error('Failed to paste from clipboard:', err);
      setToastMessage('Could not parse circuit from clipboard. Try pasting a link or search term.');
    }
  }, [handleAddCircuitFromGoogle]);

  // Global listener for Ctrl+V / paste (Copy Image, Copy URL, Copy Link Address from Google / Web)
  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Check for image in clipboard
      const items = e.clipboardData?.items;
      let imageFile: File | null = null;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith('image/')) {
            imageFile = items[i].getAsFile();
            break;
          }
        }
      }

      if (imageFile) {
        e.preventDefault();
        setToastMessage('🔍 Processing copied circuit diagram image... Synthesizing schematic...');
        try {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(imageFile!);
          });

          const res = await importCircuitFromImageDataUrl(dataUrl);
          if (res.components && res.components.length > 0) {
            setViewMode('schematic');
            handleAddCircuitFromGoogle(res.components, res.wires);
            setToastMessage(`⚡ Auto-generated circuit "${res.title}" from copied image onto schematic editor! Check and edit below.`);
          }
        } catch (err) {
          console.error('Error importing circuit from image:', err);
          setToastMessage('Failed to import copied image.');
        }
        return;
      }

      // Check for text or link in clipboard
      const pastedText = e.clipboardData?.getData('text');
      if (pastedText && pastedText.trim()) {
        const trimmed = pastedText.trim();
        const isUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('www.');
        const isCircuitKeyword = /circuit|schematic|555|timer|charger|relay|sensor|ldr|regulator|amplifier|transistor|inverter|arduino|esp32|diy/i.test(trimmed);

        if (isUrl || isCircuitKeyword) {
          e.preventDefault();
          setToastMessage(`⚡ Auto-generating schematic from copied web link: ${trimmed.slice(0, 45)}...`);
          try {
            const res = await importCircuitFromUrlOrText(trimmed);
            if (res.components && res.components.length > 0) {
              setViewMode('schematic');
              handleAddCircuitFromGoogle(res.components, res.wires);
              setToastMessage(`⚡ Auto-generated circuit "${res.title}" from copied web link onto schematic editor! Check and edit below.`);
            }
          } catch (err) {
            console.error('Error importing circuit from link:', err);
            setToastMessage('Failed to auto-generate circuit from link.');
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [handleAddCircuitFromGoogle]);

  // Update Circuit callback (both components and wires atomically)
  const handleUpdateCircuit = useCallback((newComps: SchematicComponent[], newWires: Wire[]) => {
    commitDocumentChange({
      ...safeDoc,
      components: newComps,
      wires: newWires,
      updatedAt: new Date().toISOString(),
    });
  }, [safeDoc, commitDocumentChange]);

  // Update Components callback
  const handleUpdateComponents = (newComps: SchematicComponent[]) => {
    commitDocumentChange({
      ...safeDoc,
      components: newComps,
      updatedAt: new Date().toISOString(),
    });
  };

  // Update Wires callback
  const handleUpdateWires = (newWires: Wire[]) => {
    commitDocumentChange({
      ...safeDoc,
      wires: newWires,
      updatedAt: new Date().toISOString(),
    });
  };

  // Rotate selected components
  const handleRotateSelected = () => {
    if (selectedCompIds.length === 0) return;
    const currentComps = safeDoc.components || [];
    const updated = currentComps.map((c) => {
      if (selectedCompIds.includes(c.id)) {
        const nextRot = ((c.rotation + 90) % 360) as 0 | 90 | 180 | 270;
        return { ...c, rotation: nextRot };
      }
      return c;
    });
    handleUpdateComponents(updated);
  };

  // Toast helper
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 4000);
  }, []);

  // Delete selected components / wires
  const handleDeleteSelected = () => {
    if (selectedCompIds.length === 0 && selectedWireIds.length === 0) return;
    const currentComps = safeDoc.components || [];
    const currentWires = safeDoc.wires || [];
    const newComps = currentComps.filter((c) => !selectedCompIds.includes(c.id));
    const newWires = currentWires.filter((w) => {
      if (selectedWireIds.includes(w.id)) return false;
      if (w.startPin && selectedCompIds.includes(w.startPin.componentId)) return false;
      if (w.endPin && selectedCompIds.includes(w.endPin.componentId)) return false;
      return true;
    });
    commitDocumentChange({
      ...safeDoc,
      components: newComps,
      wires: newWires,
      updatedAt: new Date().toISOString(),
    });
    const removedCount = (currentComps.length - newComps.length) + (currentWires.length - newWires.length);
    setSelectedCompIds([]);
    setSelectedWireIds([]);
    showToast(`Deleted ${removedCount} item${removedCount === 1 ? '' : 's'}`);
  };

  // Copy selected components and wires
  const handleCopySelected = useCallback(() => {
    if (selectedCompIds.length === 0 && selectedWireIds.length === 0) {
      showToast('Select components or wires first to copy');
      return;
    }
    const currentComps = safeDoc.components || [];
    const currentWires = safeDoc.wires || [];
    const copiedComps = currentComps.filter((c) => selectedCompIds.includes(c.id));
    const copiedWires = currentWires.filter(
      (w) =>
        selectedWireIds.includes(w.id) ||
        (w.startPin &&
          w.endPin &&
          selectedCompIds.includes(w.startPin.componentId) &&
          selectedCompIds.includes(w.endPin.componentId))
    );

    const payload = { components: copiedComps, wires: copiedWires };
    setInternalClipboard(payload);

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(JSON.stringify({ circuitforge_circuit: true, ...payload }));
      }
    } catch {
      // ignore
    }
    showToast(`Copied ${copiedComps.length} component${copiedComps.length === 1 ? '' : 's'} (Ctrl+C)`);
  }, [selectedCompIds, selectedWireIds, safeDoc, showToast]);

  // Paste components from clipboard
  const handlePasteSelected = useCallback(() => {
    if (!internalClipboard || internalClipboard.components.length === 0) {
      handlePasteFromClipboard();
      return;
    }
    const deltaX = 40;
    const deltaY = 40;
    const idMap: Record<string, string> = {};
    const newComps: SchematicComponent[] = internalClipboard.components.map((c) => {
      const newId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      idMap[c.id] = newId;
      return {
        ...c,
        id: newId,
        designator: `${c.designator}_copy`,
        x: Math.round((c.x + deltaX) / 10) * 10,
        y: Math.round((c.y + deltaY) / 10) * 10,
      };
    });
    const newWires: Wire[] = internalClipboard.wires.map((w) => ({
      ...w,
      id: `wire_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      points: w.points.map((p) => ({ x: p.x + deltaX, y: p.y + deltaY })),
      startPin: w.startPin
        ? { ...w.startPin, componentId: idMap[w.startPin.componentId] || w.startPin.componentId }
        : undefined,
      endPin: w.endPin
        ? { ...w.endPin, componentId: idMap[w.endPin.componentId] || w.endPin.componentId }
        : undefined,
    }));
    commitDocumentChange({
      ...safeDoc,
      components: [...(safeDoc.components || []), ...newComps],
      wires: [...(safeDoc.wires || []), ...newWires],
      updatedAt: new Date().toISOString(),
    });
    setSelectedCompIds(newComps.map((c) => c.id));
    setSelectedWireIds(newWires.map((w) => w.id));
    showToast(`Pasted ${newComps.length} components and ${newWires.length} wires`);
  }, [internalClipboard, safeDoc, commitDocumentChange, handlePasteFromClipboard, showToast]);

  // Apply AI Generated Circuit
  const handleApplyAiCircuit = (
    generated: SchematicDocument,
    mode: 'replace' | 'append'
  ) => {
    if (mode === 'replace') {
      commitDocumentChange(sanitizeDocument(generated));
    } else {
      // Append mode: offset generated components to not overlap
      const offsetX = 350;
      const genComps = Array.isArray(generated?.components) ? generated.components : [];
      const genWires = Array.isArray(generated?.wires) ? generated.wires : [];
      const offsetComps = genComps.map((c) => ({
        ...c,
        id: `ai_${c.id}_${Date.now()}`,
        x: c.x + offsetX,
      }));
      const offsetWires = genWires.map((w) => ({
        ...w,
        id: `ai_${w.id}_${Date.now()}`,
        points: (w.points || []).map((p) => ({ x: p.x + offsetX, y: p.y })),
      }));

      commitDocumentChange({
        ...safeDoc,
        components: [...(safeDoc.components || []), ...offsetComps],
        wires: [...(safeDoc.wires || []), ...offsetWires],
        updatedAt: new Date().toISOString(),
      });
    }
    setIsAiModalOpen(false);
    setSelectedCompIds([]);
    setSelectedWireIds([]);
  };

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(4.0, z * 1.2));
  const handleZoomOut = () => setZoom((z) => Math.max(0.2, z / 1.2));
  const handleZoomFit = () => {
    setZoom(1.0);
    setPan({ x: 80, y: 40 });
  };

  // Export Gerber & Excellon Drill files in a ZIP archive
  const handleExportGerber = useCallback(async () => {
    try {
      const zipBlob = await generateGerberZip(safeDoc.components || [], safeDoc.wires || [], safeDoc.title);
      const url = URL.createObjectURL(zipBlob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = url;
      downloadAnchor.download = `${(safeDoc.title || 'circuit').toLowerCase().replace(/\s+/g, '_')}_gerber_rs274x.zip`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);
      showToast('Gerber & Excellon ZIP package generated and downloaded successfully!');
    } catch (err) {
      console.error('Gerber export error:', err);
      showToast('Failed to generate Gerber package.');
    }
  }, [safeDoc, showToast]);

  // Autoroute Schematic Net connections
  const handleAutoRoute = useCallback(() => {
    const routeResult = autoRouteSchematicNets(safeDoc.components || [], safeDoc.wires || []);
    commitDocumentChange({
      ...safeDoc,
      components: routeResult.updatedComponents,
      wires: routeResult.allWires,
      updatedAt: new Date().toISOString(),
    });
    showToast(
      routeResult.connectionsCount > 0
        ? `Auto-routed ${routeResult.connectionsCount} new wire connection${routeResult.connectionsCount > 1 ? 's' : ''}!`
        : `All shared nets are already connected (${routeResult.allWires.length} wires total).`
    );
  }, [safeDoc, commitDocumentChange, showToast]);

  // Sequentially renumber / annotate components
  const handleAnnotate = useCallback(() => {
    const { components: annotatedComps, wires: updatedWires, countUpdated } = reannotateComponents(
      safeDoc.components || [],
      safeDoc.wires || []
    );
    commitDocumentChange({
      ...safeDoc,
      components: annotatedComps,
      wires: updatedWires,
      updatedAt: new Date().toISOString(),
    });
    showToast(
      `Components sequentially renumbered to standard IEEE designators (${countUpdated} parts updated).`
    );
  }, [safeDoc, commitDocumentChange, showToast]);

  // Save circuit to browser localStorage, download file, & learn circuit pattern
  const handleSaveCircuit = useCallback(() => {
    try {
      learnCircuit(safeDoc);
      localStorage.setItem('circuiteda_saved_circuit', JSON.stringify(safeDoc));
      const existingListStr = localStorage.getItem('circuiteda_saved_projects_list') || '[]';
      let existingList: any[] = [];
      try {
        existingList = JSON.parse(existingListStr);
      } catch (e) {
        existingList = [];
      }
      const updatedList = [
        {
          id: safeDoc.id,
          title: safeDoc.title || 'Untitled Circuit',
          savedAt: new Date().toISOString(),
          componentsCount: (safeDoc.components || []).length,
          wiresCount: (safeDoc.wires || []).length,
        },
        ...existingList.filter((item: any) => item.id !== safeDoc.id),
      ].slice(0, 30);
      localStorage.setItem('circuiteda_saved_projects_list', JSON.stringify(updatedList));

      // Trigger instant file download (.cirkit format)
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(safeDoc, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute(
        'download',
        `${(safeDoc.title || 'circuit').toLowerCase().replace(/[^a-z0-9]/g, '_')}.cirkit`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showToast(`💾 Saved circuit "${safeDoc.title || 'Untitled'}" and downloaded file! AI Brain learned this circuit.`);
    } catch (e) {
      console.error('Error saving circuit:', e);
      showToast('Circuit state saved in memory.');
    }
  }, [safeDoc, showToast]);

  // Export and Download JSON file
  const handleExportJson = useCallback(() => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(safeDoc, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute(
        'download',
        `${(safeDoc.title || 'circuit').toLowerCase().replace(/[^a-z0-9]/g, '_')}_schematic.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast(`📥 Downloaded "${safeDoc.title || 'circuit'}" schematic JSON file!`);
    } catch (err) {
      console.error('Download error:', err);
      showToast('Failed to download schematic file.');
    }
  }, [safeDoc, showToast]);

  // Circuits-DIY Project Ingestion
  const handleLoadCircuitsDiy = useCallback((circuit: SchematicDocument) => {
    commitDocumentChange(sanitizeDocument(circuit));
    setSelectedCompIds([]);
    setSelectedWireIds([]);
    setIsCircuitsDiyOpen(false);
    showToast(`⚡ Loaded "${circuit.title}" from Circuits-DIY into editor!`);
  }, [commitDocumentChange, showToast]);

  const handleAppendCircuitsDiy = useCallback((circuit: SchematicDocument) => {
    handleAddCircuitFromGoogle(circuit.components || [], circuit.wires || []);
    setIsCircuitsDiyOpen(false);
    showToast(`⚡ Appended "${circuit.title}" from Circuits-DIY to schematic!`);
  }, [handleAddCircuitFromGoogle, showToast]);

  // Circuit Auto-Correction Engine Apply
  const handleApplyAutoCorrection = useCallback((correctedDoc: SchematicDocument, summaryMsg: string) => {
    commitDocumentChange(sanitizeDocument(correctedDoc));
    setIsAutoCorrectOpen(false);
    showToast(summaryMsg);
  }, [commitDocumentChange, showToast]);

  // Selected component objects
  const selectedComponents = (safeDoc.components || []).filter((c) =>
    selectedCompIds.includes(c.id)
  );
  const selectedWires = (safeDoc.wires || []).filter((w) => selectedWireIds.includes(w.id));

  return (
    <div className="flex flex-col w-screen h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Top Application Header */}
      <Header
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onOpenAiModal={() => setIsAiModalOpen(true)}
        onOpenLoadDiagram={() => setIsLoadDiagramModalOpen(true)}
        onOpenChatDrawer={() => setIsChatDrawerOpen(true)}
        onOpenBom={() => setIsBomOpen(true)}
        onOpenErc={() => setIsErcOpen(true)}
        onOpenNetlist={() => setIsNetlistOpen(true)}
        onOpenPrintPdf={() => setIsPrintPdfOpen(true)}
        onOpenUniversalModal={() => setIsUniversalModalOpen(true)}
        onOpenGoogleModal={() => setIsGoogleModalOpen(true)}
        onExportGerber={handleExportGerber}
        onAutoRoute={handleAutoRoute}
        onAnnotate={handleAnnotate}
        onRotateSelected={handleRotateSelected}
        onDeleteSelected={handleDeleteSelected}
        onCopySelected={handleCopySelected}
        onPasteSelected={handlePasteSelected}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomFit={handleZoomFit}
        isSimulating={simulationState.isRunning}
        onToggleSimulation={() =>
          setSimulationState((prev) => ({ ...prev, isRunning: !prev.isRunning }))
        }
        onResetSimulation={() =>
          setSimulationState((prev) => ({ ...prev, time: 0, probedWaveforms: {} }))
        }
        isScopeOpen={isScopeOpen}
        onToggleScope={() => setIsScopeOpen((prev) => !prev)}
        simSpeed={simulationState.speed}
        onChangeSimSpeed={(speed) =>
          setSimulationState((prev) => ({ ...prev, speed }))
        }
        simulationState={simulationState}
        components={safeDoc.components}
        wires={safeDoc.wires}
        onApplyScenario={handleApplyScenario}
        onUpdateConditions={handleUpdateConditions}
        onLoadExample={(example) => {
          commitDocumentChange(example);
          setSelectedCompIds([]);
          setSelectedWireIds([]);
        }}
        onNewCircuit={() => {
          commitDocumentChange({
            id: `sheet_${Date.now()}`,
            title: 'New Circuit Schematic',
            category: 'Custom',
            summary: 'Blank schematic sheet ready for component placement and wiring.',
            components: [],
            wires: [],
            version: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          setSelectedCompIds([]);
          setSelectedWireIds([]);
        }}
        onExportJson={handleExportJson}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        currentUser={currentUser}
        onOpenAuthModal={handleOpenAuth}
        onLogout={handleLogout}
        onSearchGoogle={handleSearchGoogle}
        onOpenCircuitsDiy={() => setIsCircuitsDiyOpen(true)}
        onOpenPinoutModal={() => setIsPinoutModalOpen(true)}
        onOpenAutoCorrectModal={() => setIsAutoCorrectOpen(true)}
        onSaveCircuit={handleSaveCircuit}
        onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
        onOpenAllDataSheetModal={() => handleOpenAllDataSheetModal()}
        onInsertPowerReferences={handleInsertPowerReferences}
        onPasteFromClipboard={handlePasteFromClipboard}
        onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
        onOpenCircuitBrain={() => setIsCircuitBrainOpen(true)}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Left Side: Component Library Palette (available in Schematic mode) */}
        {viewMode === 'schematic' && (
          <ComponentLibraryPanel
            onSelectComponentToPlace={(def) => {
              setPlacingDef(def);
              if (def) setActiveTool('select');
            }}
            selectedDef={placingDef}
            onOpenGoogleRefModal={() => setIsGoogleModalOpen(true)}
            onOpenAllDataSheetModal={() => handleOpenAllDataSheetModal()}
            onOpenCircuitsDiyModal={() => setIsCircuitsDiyOpen(true)}
            onOpenPinoutModal={() => setIsPinoutModalOpen(true)}
          />
        )}

        {/* Central Canvas Area */}
        <div className="flex-1 relative h-full">
          {viewMode === 'schematic' ? (
            <SchematicCanvas
              components={safeDoc.components}
              wires={safeDoc.wires}
              activeTool={activeTool}
              selectedComponentIds={selectedCompIds}
              selectedWireIds={selectedWireIds}
              placingComponentDef={placingDef}
              zoom={zoom}
              pan={pan}
              onUpdateComponents={handleUpdateComponents}
              onUpdateWires={handleUpdateWires}
              onUpdateCircuit={handleUpdateCircuit}
              onSelectComponents={setSelectedCompIds}
              onSelectWires={setSelectedWireIds}
              onFinishPlacingComponent={() => setPlacingDef(null)}
              onPanChange={setPan}
              onZoomChange={setZoom}
              simulationState={simulationState}
              isSimulating={simulationState.isRunning}
              onToggleProbeNet={handleToggleProbeNet}
              onToggleSwitch={handleToggleSwitch}
              onToolChange={setActiveTool}
              onOpenFullScope={() => setIsScopeOpen(true)}
              onUpdateComponentSettings={handleUpdateComponentSettings}
              onPasteFromClipboard={handlePasteFromClipboard}
              onOpenLoadDiagram={() => setIsLoadDiagramModalOpen(true)}
              onOpenChatDrawer={() => setIsChatDrawerOpen(true)}
              onOpenAutoCorrect={() => setIsAutoCorrectOpen(true)}
              onOpenPinoutModal={(comp) => {
                setProductSelectorComp(comp);
                setIsPinoutModalOpen(true);
              }}
              onClearCanvas={() => {
                commitDocumentChange({
                  ...safeDoc,
                  components: [],
                  wires: [],
                  updatedAt: new Date().toISOString(),
                });
                setSelectedCompIds([]);
                setSelectedWireIds([]);
                showToast('Cleared schematic canvas');
              }}
              onShowToast={showToast}
              onZoomFit={handleZoomFit}
            />
          ) : viewMode === 'pcb' ? (
            <PcbCanvas
              components={safeDoc.components}
              wires={safeDoc.wires}
              onUpdateComponentPlacement={(id, x, y, rotation) => {
                const next = (safeDoc.components || []).map((c) =>
                  c.id === id
                    ? {
                        ...c,
                        pcbX: x,
                        pcbY: y,
                        pcbRotation: rotation !== undefined ? rotation : c.pcbRotation ?? 0,
                      }
                    : c
                );
                commitDocumentChange({
                  ...safeDoc,
                  components: next,
                  updatedAt: new Date().toISOString(),
                });
              }}
              onBatchUpdatePlacements={(updatedComponents) => {
                commitDocumentChange({
                  ...safeDoc,
                  components: updatedComponents,
                  updatedAt: new Date().toISOString(),
                });
              }}
              onSelectComponent={(id) => {
                setSelectedCompIds([id]);
                setSelectedWireIds([]);
              }}
            />
          ) : viewMode === 'panel' ? (
            <IndustrialPanelDiagram
              onLoadCircuitToCanvas={(circuitDoc) => {
                commitDocumentChange({
                  ...safeDoc,
                  ...circuitDoc,
                  id: `panel_circuit_${Date.now()}`,
                  version: 1,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
                setSelectedCompIds([]);
                setSelectedWireIds([]);
                setViewMode('schematic');
              }}
            />
          ) : (
            <Pcb3DViewer
              components={safeDoc.components}
              wires={safeDoc.wires}
              projectName={safeDoc.title}
              onSelectComponent={(id) => {
                setSelectedCompIds([id]);
                setSelectedWireIds([]);
              }}
              onOpenProductSelector={(comp) => setProductSelectorComp(comp)}
              onUpdateComponentPlacement={(id, x, y) => {
                const next = (safeDoc.components || []).map((c) =>
                  c.id === id ? { ...c, pcbX: x, pcbY: y } : c
                );
                commitDocumentChange({
                  ...safeDoc,
                  components: next,
                  updatedAt: new Date().toISOString(),
                });
              }}
              onBatchUpdatePlacements={(updatedComponents) => {
                commitDocumentChange({
                  ...safeDoc,
                  components: updatedComponents,
                  updatedAt: new Date().toISOString(),
                });
              }}
            />
          )}

          {/* Quick Floating Action: AI Circuit Prompt Assistant */}
          <div className="absolute top-4 right-4 flex items-center space-x-2 z-20">
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-850 backdrop-blur-xs border border-sky-500/50 hover:border-sky-400 text-sky-200 text-xs font-semibold rounded-lg shadow-xl flex items-center gap-2 transition-all group"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Prompt AI to Create Circuit...</span>
            </button>
          </div>

          {/* Top Info Banner about Current Circuit */}
          {showInfoBanner && safeDoc.summary && (
            <div className="absolute top-4 left-4 max-w-md bg-slate-900/90 backdrop-blur-xs border border-slate-800 p-3 rounded-lg shadow-xl text-xs z-10 transition-all">
              <div className="flex items-center justify-between font-semibold text-slate-200 mb-1">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-sky-400" />
                  {safeDoc.title}
                </span>
                <button
                  onClick={() => setShowInfoBanner(false)}
                  className="text-slate-500 hover:text-slate-300 text-[10px]"
                >
                  ✕
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {safeDoc.summary}
              </p>
              {safeDoc.formula && (
                <div className="mt-1 text-[10px] text-amber-300 font-mono">
                  {safeDoc.formula}
                </div>
              )}
            </div>
          )}

          {/* Persistent Keyboard Shortcuts Footer Overlay */}
          <KeyboardShortcutsOverlay
            activeTool={activeTool}
            onSelectTool={(tool) => setActiveTool(tool)}
            onOpenModal={() => setIsShortcutsModalOpen(true)}
            onRotateSelected={handleRotateSelected}
            onDeleteSelected={handleDeleteSelected}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            isSimulating={simulationState.isRunning}
            onToggleSimulation={() =>
              setSimulationState((prev) => ({ ...prev, isRunning: !prev.isRunning }))
            }
            hasSelection={selectedCompIds.length > 0 || selectedWireIds.length > 0}
          />
        </div>

        {/* Right Side: Properties & Inspector Panel */}
        {viewMode !== 'panel' && (
          <PropertiesPanel
            selectedComponents={selectedComponents}
            selectedWires={selectedWires}
            document={safeDoc}
            onUpdateComponent={(updated) => {
              const next = (safeDoc.components || []).map((c) => (c.id === updated.id ? updated : c));
              handleUpdateComponents(next);
            }}
            onDeleteSelected={handleDeleteSelected}
            onUpdateDocumentMeta={(meta) => {
              commitDocumentChange({
                ...safeDoc,
                ...meta,
                updatedAt: new Date().toISOString(),
              });
            }}
            simulationResult={
              selectedComponents.length === 1
                ? simulationState.componentResults[selectedComponents[0].id]
                : undefined
            }
            isSimulating={simulationState.isRunning}
            onRotateCircuit={handleRotateCircuit}
            onOpenAllDataSheetModal={handleOpenAllDataSheetModal}
          />
        )}
      </div>

      {/* VIRTUAL OSCILLOSCOPE & SIGNAL ANALYZER */}
      <OscilloscopePanel
        simulationState={simulationState}
        components={safeDoc.components}
        wires={safeDoc.wires}
        isOpen={isScopeOpen}
        onClose={() => setIsScopeOpen(false)}
        onToggleProbeNet={handleToggleProbeNet}
      />

      {/* MODALS */}
      <AiCircuitModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onApplyCircuit={handleApplyAiCircuit}
        currentCircuit={safeDoc}
      />

      <BomPanel
        isOpen={isBomOpen}
        onClose={() => setIsBomOpen(false)}
        components={safeDoc.components}
        circuitTitle={safeDoc.title}
      />

      <ErcPanel
        isOpen={isErcOpen}
        onClose={() => setIsErcOpen(false)}
        components={safeDoc.components}
        wires={safeDoc.wires}
        onSelectComponent={(id) => {
          setSelectedCompIds([id]);
          setSelectedWireIds([]);
        }}
      />

      <NetlistPanel
        isOpen={isNetlistOpen}
        onClose={() => setIsNetlistOpen(false)}
        components={safeDoc.components}
        wires={safeDoc.wires}
        circuitTitle={safeDoc.title}
      />

      {/* Print PDF / Schematic SVG Export Modal */}
      <PrintPdfModal
        isOpen={isPrintPdfOpen}
        onClose={() => setIsPrintPdfOpen(false)}
        document={safeDoc}
      />

      {/* Universal Manufacturing & File Hub (BOM, Gerber, 3D OBJ, PDF, DOC & File Import) */}
      <UniversalFileModal
        isOpen={isUniversalModalOpen}
        onClose={() => setIsUniversalModalOpen(false)}
        document={safeDoc}
        onImportProject={(importedDoc) => {
          commitDocumentChange(sanitizeDocument(importedDoc));
          setSelectedCompIds([]);
          setSelectedWireIds([]);
          setToastMessage(`Imported project: ${importedDoc.title}`);
        }}
        onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
      />

      {/* Google Reference & Custom Component Synthesizer */}
      <GoogleReferenceModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        initialSearchQuery={googleSearchQuery}
        onSelectComponentToPlace={(def) => {
          setPlacingDef(def);
          setActiveTool('select');
          setToastMessage(`Selected "${def.name}". Click on schematic canvas to place.`);
        }}
        onAddComponentDirectlyToCanvas={(def) => {
          registerCustomComponentDef(def);
          const currentComps = safeDoc.components || [];
          const maxX = currentComps.length > 0 ? Math.max(...currentComps.map((c) => c.x)) + 140 : 200;
          const prefix = def.prefix || 'U';
          const existingWithPrefix = currentComps.filter((c) => c.designator?.startsWith(prefix)).length;
          const newComp: SchematicComponent = {
            id: `comp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            type: def.type,
            designator: `${prefix}${existingWithPrefix + 1}`,
            value: def.defaultVal || def.name,
            footprint: def.defaultFootprint || 'MODULE_STANDARD',
            x: Math.round(maxX / 10) * 10,
            y: 220,
            rotation: 0,
            pins: def.pins.map((p) => ({ id: p.id, name: p.name })),
          };
          const updated = sanitizeDocument({
            ...safeDoc,
            components: [...currentComps, newComp],
            updatedAt: new Date().toISOString(),
          });
          commitDocumentChange(updated);
          setSelectedCompIds([newComp.id]);
          setSelectedWireIds([]);
          setToastMessage(`Placed "${def.name}" (${newComp.designator}) directly onto schematic!`);
        }}
        onAddCircuitToCanvas={handleAddCircuitFromGoogle}
        onApplyAllDataSheetComponent={handleApplyAllDataSheetComponent}
        onOpenAllDataSheet={handleOpenAllDataSheetModal}
      />

      {/* User Authentication & WhatsApp OTP Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        initialMode={authModalMode}
      />

      {/* Real Hardware Product Selector Modal (from 3D view or Inspector) */}
      {productSelectorComp && (
        <ProductSelectorModal
          isOpen={Boolean(productSelectorComp)}
          onClose={() => setProductSelectorComp(null)}
          component={productSelectorComp}
          onSelectProduct={(part) => {
            const next = (safeDoc.components || []).map((c) =>
              c.id === productSelectorComp.id
                ? {
                    ...c,
                    value: part.manufacturerPartNumber,
                    footprint: part.packageFootprint,
                  }
                : c
            );
            commitDocumentChange({
              ...safeDoc,
              components: next,
              updatedAt: new Date().toISOString(),
            });
            setProductSelectorComp(null);
            showToast(`Selected hardware part: ${part.manufacturerPartNumber} (${part.packageFootprint})`);
          }}
        />
      )}

      {/* AllDataSheet.com Component Search, Pinout & Specs Modal */}
      <AllDataSheetModal
        isOpen={isAllDataSheetModalOpen}
        onClose={() => setIsAllDataSheetModalOpen(false)}
        onSelectComponent={handleApplyAllDataSheetComponent}
        onAddCircuitToCanvas={handleAddCircuitFromGoogle}
        selectedComponent={selectedComponents[0] || null}
        onApplySpecsToComponent={handleApplySpecsToComponent}
        initialQuery={allDataSheetSearchQuery}
      />

      {/* Keyboard Shortcuts Reference Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
        onSelectTool={(tool) => {
          setActiveTool(tool);
          setIsShortcutsModalOpen(false);
        }}
      />

      {/* GitHub Repository Deployment, Live URL & User Sign-Up Modal */}
      <GitHubDeployModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
        onOpenAuthModal={(mode) => {
          setIsGitHubModalOpen(false);
          handleOpenAuth(mode);
        }}
      />

      {/* Circuits-DIY.com Project Schematics & Search Modal */}
      <CircuitsDiyExplorerModal
        isOpen={isCircuitsDiyOpen}
        onClose={() => setIsCircuitsDiyOpen(false)}
        onLoadCircuit={handleLoadCircuitsDiy}
        onAppendCircuit={handleAppendCircuitsDiy}
        onShowToast={showToast}
      />

      {/* Component Pinout Maps, Uses & Missing Component Creator */}
      <ComponentPinoutModal
        isOpen={isPinoutModalOpen}
        onClose={() => setIsPinoutModalOpen(false)}
        onSelectComponentToPlace={(def) => {
          registerCustomComponentDef(def);
          setPlacingDef(def);
          setActiveTool('select');
          setIsPinoutModalOpen(false);
          showToast(`Click anywhere on canvas to place ${def.name}`);
        }}
        onAddComponentDirectlyToCanvas={(def) => {
          registerCustomComponentDef(def);
          const currentComps = safeDoc.components || [];
          const maxX = currentComps.length > 0 ? Math.max(...currentComps.map((c) => c.x)) + 140 : 200;
          const prefix = def.prefix || 'U';
          const existingWithPrefix = currentComps.filter((c) => c.designator?.startsWith(prefix)).length;
          const newComp: SchematicComponent = {
            id: `comp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            type: def.type,
            designator: `${prefix}${existingWithPrefix + 1}`,
            value: def.defaultVal || def.name,
            footprint: def.defaultFootprint || 'MODULE_STANDARD',
            x: Math.round(maxX / 10) * 10,
            y: 220,
            rotation: 0,
            pins: def.pins.map((p) => ({ id: p.id, name: p.name })),
          };
          const updated = sanitizeDocument({
            ...safeDoc,
            components: [...currentComps, newComp],
            updatedAt: new Date().toISOString(),
          });
          commitDocumentChange(updated);
          setSelectedCompIds([newComp.id]);
          setSelectedWireIds([]);
          setIsPinoutModalOpen(false);
          showToast(`Placed "${def.name}" (${newComp.designator}) directly onto schematic!`);
        }}
        onShowToast={showToast}
      />

      {/* Circuit Auto-Corrector & Electrical Rule Engine Modal */}
      <AutoCorrectModal
        isOpen={isAutoCorrectOpen}
        onClose={() => setIsAutoCorrectOpen(false)}
        document={safeDoc}
        onApplyCorrection={handleApplyAutoCorrection}
      />

      {/* Load Diagram, Document, or Rough Sketch Modal (AI Vision + Whiteboard + Zero 404/405 Global Importer) */}
      <LoadDiagramSketchModal
        isOpen={isLoadDiagramModalOpen}
        onClose={() => setIsLoadDiagramModalOpen(false)}
        onSwitchViewMode={(mode) => setViewMode(mode)}
        onApplyCircuit={(circuit, mode) => {
          learnCircuit(circuit);
          if (mode === 'replace') {
            const newDoc: SchematicDocument = {
              id: `sketch_${Date.now()}`,
              title: circuit.title || 'Imported Diagram / Sketch',
              category: circuit.category || 'Loaded',
              summary: circuit.summary || circuit.description || 'Imported diagram transformed into verified schematic.',
              components: circuit.components || [],
              wires: circuit.wires || [],
              version: 1,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            commitDocumentChange(sanitizeDocument(newDoc));
          } else {
            const currentComps = safeDoc.components || [];
            const maxX = currentComps.length > 0
              ? Math.max(...currentComps.map((c) => c.x)) + 250
              : 150;
            const minImportX = (circuit.components || []).length > 0
              ? Math.min(...(circuit.components || []).map((c) => c.x))
              : 0;
            const deltaX = maxX - minImportX;
            const offsetComps = (circuit.components || []).map((c) => ({
              ...c,
              id: `imp_${c.id}_${Date.now()}`,
              x: c.x + deltaX,
            }));
            const offsetWires = (circuit.wires || []).map((w) => ({
              ...w,
              id: `imp_${w.id}_${Date.now()}`,
              points: (w.points || []).map((p) => ({ x: p.x + deltaX, y: p.y })),
            }));
            commitDocumentChange({
              ...safeDoc,
              components: [...currentComps, ...offsetComps],
              wires: [...(safeDoc.wires || []), ...offsetWires],
              updatedAt: new Date().toISOString(),
            });
          }
          showToast(`Successfully synthesized "${circuit.title}" with all components & wires!`);
        }}
        onShowToast={showToast}
      />

      {/* Circuit Brain: Self-Learning Engine & Autonomous Circuit Modal */}
      <CircuitBrainModal
        isOpen={isCircuitBrainOpen}
        onClose={() => setIsCircuitBrainOpen(false)}
        onApplyCircuit={(circuit) => {
          commitDocumentChange(sanitizeDocument(circuit));
          setViewMode('schematic');
          showToast(`⚡ Brain synthesized & loaded "${circuit.title}" into Schematic Editor!`);
        }}
        currentCircuit={safeDoc}
        onSwitchViewMode={(mode) => setViewMode(mode)}
        onShowToast={showToast}
      />

      {/* AI Circuit Engineering Chat & Suggestions Drawer */}
      <AiCircuitChatDrawer
        isOpen={isChatDrawerOpen}
        onClose={() => setIsChatDrawerOpen(false)}
        document={safeDoc}
        onApplyModification={(updatedDoc, note) => {
          commitDocumentChange(sanitizeDocument(updatedDoc));
          showToast(note || 'Applied AI circuit modification to schematic!');
        }}
        onSelectComponents={(ids) => {
          setSelectedCompIds(ids);
          setSelectedWireIds([]);
        }}
        onShowToast={showToast}
      />

      {/* Floating Status Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-slate-900/95 text-slate-100 px-4 py-2.5 rounded-lg border border-sky-500/50 shadow-2xl backdrop-blur-xs text-xs animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-slate-200 text-xs"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
