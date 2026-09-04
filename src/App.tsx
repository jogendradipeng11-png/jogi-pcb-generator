import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  SchematicDocument,
  EditorTool,
  CanvasViewMode,
  ComponentDefinition,
  Point,
  SchematicComponent,
  Wire,
  SimulationState,
} from './types';
import { STARTER_CIRCUITS } from './data/examples';
import { Header } from './components/layout/Header';
import { SchematicCanvas } from './components/schematic/SchematicCanvas';
import { PcbCanvas } from './components/pcb/PcbCanvas';
import { ComponentLibraryPanel } from './components/panels/ComponentLibraryPanel';
import { PropertiesPanel } from './components/panels/PropertiesPanel';
import { AiCircuitModal } from './components/ai/AiCircuitModal';
import { BomPanel } from './components/panels/BomPanel';
import { ErcPanel } from './components/panels/ErcPanel';
import { NetlistPanel } from './components/panels/NetlistPanel';
import { OscilloscopePanel } from './components/simulation/OscilloscopePanel';
import { Pcb3DViewer } from './components/pcb/Pcb3DViewer';
import { PrintPdfModal } from './components/panels/PrintPdfModal';
import { ProductSelectorModal } from './components/panels/ProductSelectorModal';
import { stepCircuitSimulation } from './utils/simulation';
import { generateGerberZip } from './utils/gerber';
import { autoRouteSchematicNets } from './utils/autorouter';
import { reannotateComponents } from './utils/annotation';
import { Sparkles, HelpCircle, Layers, Cpu, Activity, CheckCircle2 } from 'lucide-react';

export default function App() {
  // Main Schematic Document
  const [doc, setDoc] = useState<SchematicDocument>(() => STARTER_CIRCUITS[0]);

  // History stack for Undo / Redo
  const [history, setHistory] = useState<SchematicDocument[]>([STARTER_CIRCUITS[0]]);
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
  const [productSelectorComp, setProductSelectorComp] = useState<SchematicComponent | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showInfoBanner, setShowInfoBanner] = useState(true);

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
  }));
  const [isScopeOpen, setIsScopeOpen] = useState(false);

  // Real-Time Circuit Simulation Animation Loop (60 FPS)
  useEffect(() => {
    if (!simulationState.isRunning || viewMode !== 'schematic') return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const simLoop = (now: number) => {
      const dt = Math.min(0.04, (now - lastTime) / 1000);
      lastTime = now;

      setSimulationState((prev) =>
        stepCircuitSimulation(doc.components, doc.wires, prev, dt)
      );

      animationFrameId = requestAnimationFrame(simLoop);
    };

    animationFrameId = requestAnimationFrame(simLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [simulationState.isRunning, viewMode, doc.components, doc.wires]);

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
    const nextComps = doc.components.map((c) =>
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
    setDoc((prev) => ({
      ...prev,
      components: nextComps,
      updatedAt: new Date().toISOString(),
    }));
  }, [doc.components]);

  // Record document changes to Undo/Redo history
  const commitDocumentChange = useCallback((newDoc: SchematicDocument) => {
    setDoc(newDoc);
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, newDoc];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const nextIdx = historyIndex - 1;
      setHistoryIndex(nextIdx);
      setDoc(history[nextIdx]);
      setSelectedCompIds([]);
      setSelectedWireIds([]);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setDoc(history[nextIdx]);
      setSelectedCompIds([]);
      setSelectedWireIds([]);
    }
  }, [historyIndex, history]);

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
      } else if (e.key === 's' || e.key === 'S') {
        setActiveTool('select');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Update Components callback
  const handleUpdateComponents = (newComps: SchematicComponent[]) => {
    commitDocumentChange({
      ...doc,
      components: newComps,
      updatedAt: new Date().toISOString(),
    });
  };

  // Update Wires callback
  const handleUpdateWires = (newWires: Wire[]) => {
    commitDocumentChange({
      ...doc,
      wires: newWires,
      updatedAt: new Date().toISOString(),
    });
  };

  // Rotate selected components
  const handleRotateSelected = () => {
    if (selectedCompIds.length === 0) return;
    const updated = doc.components.map((c) => {
      if (selectedCompIds.includes(c.id)) {
        const nextRot = ((c.rotation + 90) % 360) as 0 | 90 | 180 | 270;
        return { ...c, rotation: nextRot };
      }
      return c;
    });
    handleUpdateComponents(updated);
  };

  // Delete selected components / wires
  const handleDeleteSelected = () => {
    if (selectedCompIds.length === 0 && selectedWireIds.length === 0) return;
    const newComps = doc.components.filter((c) => !selectedCompIds.includes(c.id));
    const newWires = doc.wires.filter((w) => {
      if (selectedWireIds.includes(w.id)) return false;
      if (w.startPin && selectedCompIds.includes(w.startPin.componentId)) return false;
      if (w.endPin && selectedCompIds.includes(w.endPin.componentId)) return false;
      return true;
    });
    commitDocumentChange({
      ...doc,
      components: newComps,
      wires: newWires,
      updatedAt: new Date().toISOString(),
    });
    setSelectedCompIds([]);
    setSelectedWireIds([]);
  };

  // Apply AI Generated Circuit
  const handleApplyAiCircuit = (
    generated: SchematicDocument,
    mode: 'replace' | 'append'
  ) => {
    if (mode === 'replace') {
      commitDocumentChange(generated);
    } else {
      // Append mode: offset generated components to not overlap
      const offsetX = 350;
      const offsetComps = generated.components.map((c) => ({
        ...c,
        id: `ai_${c.id}_${Date.now()}`,
        x: c.x + offsetX,
      }));
      const offsetWires = generated.wires.map((w) => ({
        ...w,
        id: `ai_${w.id}_${Date.now()}`,
        points: w.points.map((p) => ({ x: p.x + offsetX, y: p.y })),
      }));

      commitDocumentChange({
        ...doc,
        components: [...doc.components, ...offsetComps],
        wires: [...doc.wires, ...offsetWires],
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

  // Toast helper
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 4000);
  }, []);

  // Export Gerber & Excellon Drill files in a ZIP archive
  const handleExportGerber = useCallback(async () => {
    try {
      const zipBlob = await generateGerberZip(doc.components, doc.wires, doc.title);
      const url = URL.createObjectURL(zipBlob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = url;
      downloadAnchor.download = `${doc.title.toLowerCase().replace(/\s+/g, '_')}_gerber_rs274x.zip`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);
      showToast('Gerber & Excellon ZIP package generated and downloaded successfully!');
    } catch (err) {
      console.error('Gerber export error:', err);
      showToast('Failed to generate Gerber package.');
    }
  }, [doc.components, doc.wires, doc.title, showToast]);

  // Autoroute Schematic Net connections
  const handleAutoRoute = useCallback(() => {
    const routeResult = autoRouteSchematicNets(doc.components, doc.wires);
    const updatedWires = [...doc.wires, ...routeResult.newWires];
    commitDocumentChange({
      ...doc,
      components: routeResult.updatedComponents,
      wires: updatedWires,
      updatedAt: new Date().toISOString(),
    });
    showToast(
      routeResult.connectionsCount > 0
        ? `Auto-routed ${routeResult.connectionsCount} new wire connection${routeResult.connectionsCount > 1 ? 's' : ''}!`
        : `All shared nets are already connected (${updatedWires.length} wires total).`
    );
  }, [doc, commitDocumentChange, showToast]);

  // Sequentially renumber / annotate components
  const handleAnnotate = useCallback(() => {
    const { components: annotatedComps, wires: updatedWires, countUpdated } = reannotateComponents(
      doc.components,
      doc.wires
    );
    commitDocumentChange({
      ...doc,
      components: annotatedComps,
      wires: updatedWires,
      updatedAt: new Date().toISOString(),
    });
    showToast(
      `Components sequentially renumbered to standard IEEE designators (${countUpdated} parts updated).`
    );
  }, [doc, commitDocumentChange, showToast]);

  // Export JSON file
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(doc, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `${doc.title.toLowerCase().replace(/\s+/g, '_')}_schematic.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Selected component objects
  const selectedComponents = doc.components.filter((c) =>
    selectedCompIds.includes(c.id)
  );
  const selectedWires = doc.wires.filter((w) => selectedWireIds.includes(w.id));

  return (
    <div className="flex flex-col w-screen h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Top Application Header */}
      <Header
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onOpenAiModal={() => setIsAiModalOpen(true)}
        onOpenBom={() => setIsBomOpen(true)}
        onOpenErc={() => setIsErcOpen(true)}
        onOpenNetlist={() => setIsNetlistOpen(true)}
        onOpenPrintPdf={() => setIsPrintPdfOpen(true)}
        onExportGerber={handleExportGerber}
        onAutoRoute={handleAutoRoute}
        onAnnotate={handleAnnotate}
        onRotateSelected={handleRotateSelected}
        onDeleteSelected={handleDeleteSelected}
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
          />
        )}

        {/* Central Canvas Area */}
        <div className="flex-1 relative h-full">
          {viewMode === 'schematic' ? (
            <SchematicCanvas
              components={doc.components}
              wires={doc.wires}
              activeTool={activeTool}
              selectedComponentIds={selectedCompIds}
              selectedWireIds={selectedWireIds}
              placingComponentDef={placingDef}
              zoom={zoom}
              pan={pan}
              onUpdateComponents={handleUpdateComponents}
              onUpdateWires={handleUpdateWires}
              onSelectComponents={setSelectedCompIds}
              onSelectWires={setSelectedWireIds}
              onFinishPlacingComponent={() => setPlacingDef(null)}
              onPanChange={setPan}
              onZoomChange={setZoom}
              simulationState={simulationState}
              isSimulating={simulationState.isRunning}
              onToggleProbeNet={handleToggleProbeNet}
              onToggleSwitch={handleToggleSwitch}
            />
          ) : viewMode === 'pcb' ? (
            <PcbCanvas components={doc.components} wires={doc.wires} />
          ) : (
            <Pcb3DViewer
              components={doc.components}
              wires={doc.wires}
              projectName={doc.title}
              onSelectComponent={(id) => {
                setSelectedCompIds([id]);
                setSelectedWireIds([]);
              }}
              onOpenProductSelector={(comp) => setProductSelectorComp(comp)}
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
          {showInfoBanner && doc.summary && (
            <div className="absolute top-4 left-4 max-w-md bg-slate-900/90 backdrop-blur-xs border border-slate-800 p-3 rounded-lg shadow-xl text-xs z-10 transition-all">
              <div className="flex items-center justify-between font-semibold text-slate-200 mb-1">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-sky-400" />
                  {doc.title}
                </span>
                <button
                  onClick={() => setShowInfoBanner(false)}
                  className="text-slate-500 hover:text-slate-300 text-[10px]"
                >
                  ✕
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {doc.summary}
              </p>
              {doc.formula && (
                <div className="mt-1 text-[10px] text-amber-300 font-mono">
                  {doc.formula}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Properties & Inspector Panel */}
        <PropertiesPanel
          selectedComponents={selectedComponents}
          selectedWires={selectedWires}
          document={doc}
          onUpdateComponent={(updated) => {
            const next = doc.components.map((c) => (c.id === updated.id ? updated : c));
            handleUpdateComponents(next);
          }}
          onDeleteSelected={handleDeleteSelected}
          onUpdateDocumentMeta={(meta) => {
            commitDocumentChange({
              ...doc,
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
        />
      </div>

      {/* VIRTUAL OSCILLOSCOPE & SIGNAL ANALYZER */}
      <OscilloscopePanel
        simulationState={simulationState}
        components={doc.components}
        wires={doc.wires}
        isOpen={isScopeOpen}
        onClose={() => setIsScopeOpen(false)}
        onToggleProbeNet={handleToggleProbeNet}
      />

      {/* MODALS */}
      <AiCircuitModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onApplyCircuit={handleApplyAiCircuit}
        currentCircuit={doc}
      />

      <BomPanel
        isOpen={isBomOpen}
        onClose={() => setIsBomOpen(false)}
        components={doc.components}
        circuitTitle={doc.title}
      />

      <ErcPanel
        isOpen={isErcOpen}
        onClose={() => setIsErcOpen(false)}
        components={doc.components}
        wires={doc.wires}
        onSelectComponent={(id) => {
          setSelectedCompIds([id]);
          setSelectedWireIds([]);
        }}
      />

      <NetlistPanel
        isOpen={isNetlistOpen}
        onClose={() => setIsNetlistOpen(false)}
        components={doc.components}
        wires={doc.wires}
        circuitTitle={doc.title}
      />

      {/* Print PDF / Schematic SVG Export Modal */}
      <PrintPdfModal
        isOpen={isPrintPdfOpen}
        onClose={() => setIsPrintPdfOpen(false)}
        document={doc}
      />

      {/* Real Hardware Product Selector Modal (from 3D view or Inspector) */}
      {productSelectorComp && (
        <ProductSelectorModal
          isOpen={Boolean(productSelectorComp)}
          onClose={() => setProductSelectorComp(null)}
          component={productSelectorComp}
          onSelectProduct={(part) => {
            const next = doc.components.map((c) =>
              c.id === productSelectorComp.id
                ? {
                    ...c,
                    value: part.manufacturerPartNumber,
                    footprint: part.packageFootprint,
                  }
                : c
            );
            commitDocumentChange({
              ...doc,
              components: next,
              updatedAt: new Date().toISOString(),
            });
            setProductSelectorComp(null);
            showToast(`Selected hardware part: ${part.manufacturerPartNumber} (${part.packageFootprint})`);
          }}
        />
      )}

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
