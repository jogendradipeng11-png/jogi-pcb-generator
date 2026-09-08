import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  SchematicComponent,
  Wire,
  Point,
  EditorTool,
  ComponentDefinition,
  ProbeTarget,
  ComponentTestSettings,
  SimulationState,
  CircuitRotationDirection,
} from '../../types';
import { ComponentGlyph } from './ComponentGlyph';
import { TransientProbeWidget } from '../simulation/TransientProbeWidget';
import { CircuitRotationToolbar } from './CircuitRotationToolbar';
import { rotateCircuit } from '../../utils/circuitTransform';
import { SchematicContextMenu, ContextMenuTarget } from './SchematicContextMenu';
import {
  Radio,
  AlignLeft,
  AlignCenter,
  AlignRight,
  RotateCw,
  Copy,
  Trash2,
  Check,
  Cpu,
  Info,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  Edit2,
  Settings2,
  AlertCircle,
  Magnet,
  ClipboardPaste,
  Activity,
  Zap,
} from 'lucide-react';
import { RealProductImage, getRealProductDetails } from '../../utils/componentImages';
import {
  snapToGrid,
  snapPoint,
  getPinWorldPosition,
  generateOrthogonalPath,
  pointsToSvgPath,
  calculateJunctions,
  findClosestPin,
  GRID_SIZE,
  MAJOR_GRID_SIZE,
} from '../../utils/geometry';
import {
  calculateMagneticSnap,
  calculatePlacementSnap,
  AlignmentGuide,
} from '../../utils/magneticSnap';
import { getComponentDef } from '../../data/components';
import { formatVoltage, formatCurrent } from '../../utils/simulation';

interface SchematicCanvasProps {
  components: SchematicComponent[];
  wires: Wire[];
  activeTool: EditorTool;
  selectedComponentIds: string[];
  selectedWireIds: string[];
  placingComponentDef: ComponentDefinition | null;
  zoom: number;
  pan: Point;
  onUpdateComponents: (components: SchematicComponent[]) => void;
  onUpdateWires: (wires: Wire[]) => void;
  onUpdateCircuit?: (components: SchematicComponent[], wires: Wire[]) => void;
  onSelectComponents: (ids: string[]) => void;
  onSelectWires: (ids: string[]) => void;
  onFinishPlacingComponent?: () => void;
  onPanChange: (pan: Point) => void;
  onZoomChange: (zoom: number) => void;
  simulationState?: SimulationState;
  isSimulating?: boolean;
  onToggleProbeNet?: (net: string) => void;
  onToggleSwitch?: (comp: SchematicComponent) => void;
  onOpenFullScope?: () => void;
  onUpdateComponentSettings?: (compId: string, settings: Partial<ComponentTestSettings>) => void;
  onToolChange?: (tool: EditorTool) => void;
  onPasteFromClipboard?: () => void;
  onOpenLoadDiagram?: () => void;
  onOpenChatDrawer?: () => void;
  onOpenAutoCorrect?: () => void;
  onOpenPinoutModal?: (comp: SchematicComponent) => void;
  onOpenDiagnostics?: () => void;
  onClearCanvas?: () => void;
  onShowToast?: (msg: string) => void;
  onZoomFit?: () => void;
}

export const SchematicCanvas: React.FC<SchematicCanvasProps> = ({
  components,
  wires,
  activeTool,
  selectedComponentIds,
  selectedWireIds,
  placingComponentDef,
  zoom,
  pan,
  onUpdateComponents,
  onUpdateWires,
  onUpdateCircuit,
  onSelectComponents,
  onSelectWires,
  onFinishPlacingComponent,
  onPanChange,
  onZoomChange,
  onZoomFit,
  simulationState,
  isSimulating = false,
  onToggleProbeNet,
  onToggleSwitch,
  onOpenFullScope,
  onUpdateComponentSettings,
  onToolChange,
  onPasteFromClipboard,
  onOpenLoadDiagram,
  onOpenChatDrawer,
  onOpenAutoCorrect,
  onOpenPinoutModal,
  onOpenDiagnostics,
  onClearCanvas,
  onShowToast,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Electrical alert dismissal toggle
  const [warningsDismissed, setWarningsDismissed] = useState(false);

  // Clipboard and Right-Click Context Menu states
  const [canvasClipboard, setCanvasClipboard] = useState<{
    components: SchematicComponent[];
    wires: Wire[];
  } | null>(null);
  const [contextMenuTarget, setContextMenuTarget] = useState<ContextMenuTarget | null>(null);

  // Click-to-Probe Active Target & Hover State
  const [activeProbe, setActiveProbe] = useState<ProbeTarget | null>(null);
  const [hoveredWireId, setHoveredWireId] = useState<string | null>(null);

  // Interaction states
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });

  // Dragging components
  const [isDraggingComponents, setIsDraggingComponents] = useState(false);
  const [dragStartMouse, setDragStartMouse] = useState<Point>({ x: 0, y: 0 });
  const [dragInitialPositions, setDragInitialPositions] = useState<Map<string, Point>>(new Map());
  const [dragInitialWirePoints, setDragInitialWirePoints] = useState<Map<string, Point[]>>(new Map());
  const [activeGuides, setActiveGuides] = useState<AlignmentGuide[] | null>(null);
  const [magneticStatus, setMagneticStatus] = useState<{
    isLockedToPin: boolean;
    isLockedToPort: boolean;
    isLockedToCenter: boolean;
  } | null>(null);

  // Component Details HUD state
  const [isDetailsCardExpanded, setIsDetailsCardExpanded] = useState(true);
  const [editingValueCompId, setEditingValueCompId] = useState<string | null>(null);
  const [editingValueText, setEditingValueText] = useState('');

  // Wiring state
  const [isWiring, setIsWiring] = useState(false);
  const [wirePoints, setWirePoints] = useState<Point[]>([]);
  const [wireStartPin, setWireStartPin] = useState<{ componentId: string; pinId: string } | null>(null);
  const [currentMousePos, setCurrentMousePos] = useState<Point>({ x: 0, y: 0 });
  const [hoveredPin, setHoveredPin] = useState<{ componentId: string; pinId: string } | null>(null);

  // Schematic Section Demarcation Visibility (Source Section & Load Section)
  const [showSectionZones, setShowSectionZones] = useState(true);

  // Live Working Animated View toggle (active electron flow and component dynamics)
  const [isLiveWorkingAnimation, setIsLiveWorkingAnimation] = useState(true);

  // Full Circuit & Selected Components Rotation Handler (0°, 90° CW, 90° CCW, 180°, Flip H, Flip V)
  const handleRotateCircuit = useCallback(
    (direction: CircuitRotationDirection) => {
      const isSubset = selectedComponentIds.length > 0;
      const result = rotateCircuit(
        components,
        wires,
        direction,
        isSubset ? selectedComponentIds : undefined,
        isSubset ? selectedWireIds : undefined
      );

      if (onUpdateCircuit) {
        onUpdateCircuit(result.components, result.wires);
      } else {
        onUpdateComponents(result.components);
        onUpdateWires(result.wires);
      }
    },
    [components, wires, selectedComponentIds, selectedWireIds, onUpdateCircuit, onUpdateComponents, onUpdateWires]
  );

  // Marquee selection box
  const [marqueeStart, setMarqueeStart] = useState<Point | null>(null);
  const [marqueeCurrent, setMarqueeCurrent] = useState<Point | null>(null);
  const [marqueeShift, setMarqueeShift] = useState(false);

  // Transform screen coordinate to SVG world coordinate
  const screenToWorld = useCallback(
    (clientX: number, clientY: number): Point => {
      if (!svgRef.current) return { x: 0, y: 0 };
      const rect = svgRef.current.getBoundingClientRect();
      const x = (clientX - rect.left - pan.x) / zoom;
      const y = (clientY - rect.top - pan.y) / zoom;
      return { x, y };
    },
    [pan, zoom]
  );

  // Transform SVG world coordinate to screen coordinate
  const worldToScreen = useCallback(
    (worldPt: Point): Point => {
      if (!svgRef.current) return { x: 200, y: 150 };
      const rect = svgRef.current.getBoundingClientRect();
      const x = rect.left + pan.x + worldPt.x * zoom;
      const y = rect.top + pan.y + worldPt.y * zoom;
      return { x, y };
    },
    [pan, zoom]
  );

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = Math.max(0.2, Math.min(4.0, zoom * zoomFactor));

    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Zoom centered on mouse pointer
    const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
    const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);

    onZoomChange(newZoom);
    onPanChange({ x: newPanX, y: newPanY });
  };

  // Action Handlers: Delete, Copy, Cut, Duplicate, Paste, Flip
  const handleDeleteSelected = useCallback(() => {
    if (selectedComponentIds.length === 0 && selectedWireIds.length === 0) return;
    const newComps = components.filter((c) => !selectedComponentIds.includes(c.id));
    const newWires = wires.filter((w) => {
      if (selectedWireIds.includes(w.id)) return false;
      if (w.startPin && selectedComponentIds.includes(w.startPin.componentId)) return false;
      if (w.endPin && selectedComponentIds.includes(w.endPin.componentId)) return false;
      return true;
    });

    if (onUpdateCircuit) {
      onUpdateCircuit(newComps, newWires);
    } else {
      onUpdateComponents(newComps);
      onUpdateWires(newWires);
    }

    const count = (components.length - newComps.length) + (wires.length - newWires.length);
    onSelectComponents([]);
    onSelectWires([]);
    if (onShowToast) onShowToast(`Deleted ${count} item${count === 1 ? '' : 's'} from schematic`);
  }, [components, wires, selectedComponentIds, selectedWireIds, onUpdateCircuit, onUpdateComponents, onUpdateWires, onSelectComponents, onSelectWires, onShowToast]);

  const handleCopySelected = useCallback(() => {
    if (selectedComponentIds.length === 0 && selectedWireIds.length === 0) return;
    const copiedComps = components.filter((c) => selectedComponentIds.includes(c.id));
    const copiedWires = wires.filter(
      (w) =>
        selectedWireIds.includes(w.id) ||
        (w.startPin &&
          w.endPin &&
          selectedComponentIds.includes(w.startPin.componentId) &&
          selectedComponentIds.includes(w.endPin.componentId))
    );

    const payload = { components: copiedComps, wires: copiedWires };
    setCanvasClipboard(payload);

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(JSON.stringify({ circuitforge_circuit: true, ...payload }));
      }
    } catch {
      // Ignore if clipboard access is blocked
    }

    if (onShowToast) {
      onShowToast(`Copied ${copiedComps.length} component${copiedComps.length === 1 ? '' : 's'}${copiedWires.length > 0 ? ` and ${copiedWires.length} wires` : ''}`);
    }
  }, [components, wires, selectedComponentIds, selectedWireIds, onShowToast]);

  const handleCutSelected = useCallback(() => {
    handleCopySelected();
    handleDeleteSelected();
  }, [handleCopySelected, handleDeleteSelected]);

  const handlePasteClipboard = useCallback((targetX?: number, targetY?: number) => {
    if (!canvasClipboard || canvasClipboard.components.length === 0) {
      if (onPasteFromClipboard) {
        onPasteFromClipboard();
      } else if (onShowToast) {
        onShowToast('Clipboard is empty. Select components to copy (Ctrl+C)');
      }
      return;
    }

    const { components: clipComps, wires: clipWires } = canvasClipboard;

    let minX = Infinity;
    let minY = Infinity;
    clipComps.forEach((c) => {
      if (c.x < minX) minX = c.x;
      if (c.y < minY) minY = c.y;
    });

    const deltaX = targetX !== undefined ? snapToGrid(targetX - minX) : 40;
    const deltaY = targetY !== undefined ? snapToGrid(targetY - minY) : 40;

    const idMap: Record<string, string> = {};
    const newComps: SchematicComponent[] = clipComps.map((c) => {
      const newId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      idMap[c.id] = newId;
      return {
        ...c,
        id: newId,
        designator: `${c.designator}_copy`,
        x: snapToGrid(c.x + deltaX),
        y: snapToGrid(c.y + deltaY),
      };
    });

    const newWires: Wire[] = clipWires.map((w) => {
      const newId = `wire_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      return {
        ...w,
        id: newId,
        points: w.points.map((p) => ({ x: snapToGrid(p.x + deltaX), y: snapToGrid(p.y + deltaY) })),
        startPin: w.startPin
          ? {
              ...w.startPin,
              componentId: idMap[w.startPin.componentId] || w.startPin.componentId,
            }
          : undefined,
        endPin: w.endPin
          ? {
              ...w.endPin,
              componentId: idMap[w.endPin.componentId] || w.endPin.componentId,
            }
          : undefined,
      };
    });

    const combinedComps = [...components, ...newComps];
    const combinedWires = [...wires, ...newWires];

    if (onUpdateCircuit) {
      onUpdateCircuit(combinedComps, combinedWires);
    } else {
      onUpdateComponents(combinedComps);
      onUpdateWires(combinedWires);
    }

    onSelectComponents(newComps.map((c) => c.id));
    onSelectWires(newWires.map((w) => w.id));

    if (onShowToast) {
      onShowToast(`Pasted ${newComps.length} component${newComps.length === 1 ? '' : 's'}`);
    }
  }, [canvasClipboard, components, wires, onUpdateCircuit, onUpdateComponents, onUpdateWires, onSelectComponents, onSelectWires, onPasteFromClipboard, onShowToast]);

  const handleDuplicateSelected = useCallback(() => {
    handleCopySelected();
    setTimeout(() => {
      handlePasteClipboard();
    }, 20);
  }, [handleCopySelected, handlePasteClipboard]);

  const handleFlipSelected = useCallback(() => {
    if (selectedComponentIds.length === 0) return;
    const selComps = components.filter((c) => selectedComponentIds.includes(c.id));
    const avgX = selComps.reduce((acc, c) => acc + c.x, 0) / selComps.length;
    const updated = components.map((c) => {
      if (!selectedComponentIds.includes(c.id)) return c;
      const newRot = (c.rotation === 0 ? 180 : c.rotation === 180 ? 0 : c.rotation) as any;
      return {
        ...c,
        x: snapToGrid(2 * avgX - c.x),
        rotation: newRot,
      };
    });
    onUpdateComponents(updated);
    if (onShowToast) onShowToast('Flipped selected components horizontally');
  }, [components, selectedComponentIds, onUpdateComponents, onShowToast]);

  // Keyboard controls: Rotate, Delete, Copy, Cut, Paste, Duplicate, Select All, Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        handleCopySelected();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        handlePasteClipboard();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        handleCutSelected();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        handleDuplicateSelected();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        onSelectComponents(components.map((c) => c.id));
        onSelectWires(wires.map((w) => w.id));
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        const dir: CircuitRotationDirection = e.shiftKey ? 'ccw90' : 'cw90';
        handleRotateCircuit(dir);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedComponentIds.length > 0 || selectedWireIds.length > 0) {
          e.preventDefault();
          handleDeleteSelected();
        }
      } else if (e.key === 'p' || e.key === 'P') {
        if (onToolChange) {
          e.preventDefault();
          onToolChange(activeTool === 'probe' ? 'select' : 'probe');
        }
      } else if (e.key === 'Escape') {
        // Cancel wiring, placement, or active probe
        if (activeProbe) {
          setActiveProbe(null);
        }
        setIsWiring(false);
        setWirePoints([]);
        setWireStartPin(null);
        setIsDraggingComponents(false);
        setActiveGuides(null);
        setMagneticStatus(null);
        if (contextMenuTarget) {
          setContextMenuTarget(null);
        }
        if (onFinishPlacingComponent) onFinishPlacingComponent();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeTool,
    activeProbe,
    onToolChange,
    selectedComponentIds,
    selectedWireIds,
    components,
    wires,
    contextMenuTarget,
    handleRotateCircuit,
    handleDeleteSelected,
    handleCopySelected,
    handleCutSelected,
    handlePasteClipboard,
    handleDuplicateSelected,
    onSelectComponents,
    onSelectWires,
    onFinishPlacingComponent,
  ]);

  // Helper to complete a wire connection to a target pin
  const completeWireConnection = (target: {
    component: SchematicComponent;
    pinId: string;
    pos: Point;
  }) => {
    const exactTargetPos = getPinWorldPosition(target.component, target.pinId);
    let startPt: Point;
    if (wireStartPin) {
      const sComp = components.find((c) => c.id === wireStartPin.componentId);
      startPt = sComp ? getPinWorldPosition(sComp, wireStartPin.pinId) : (wirePoints[0] || exactTargetPos);
    } else {
      startPt = wirePoints[0] || exactTargetPos;
    }

    const currentPoints = wirePoints.length > 0 ? wirePoints : [startPt];
    const lastPt = currentPoints[currentPoints.length - 1];
    const segment = generateOrthogonalPath(lastPt, exactTargetPos);
    const finalPoints = [...currentPoints.slice(0, -1), ...segment];

    const startPinInfo = wireStartPin;
    const endPinInfo = {
      componentId: target.component.id,
      pinId: target.pinId,
    };

    // Determine reference net: detect power rails (+V, VCC, -Ve, GND, EARTH/PE)
    const getReferenceNet = (compId: string, pinId: string): string | null => {
      const comp = components.find((c) => c.id === compId);
      if (!comp) return null;
      const pin = comp.pins.find((p) => p.id === pinId);
      if (pin?.net && pin.net !== 'NC' && !pin.net.startsWith('NET_')) return pin.net;
      
      // Known reference components
      if (comp.type === 'dc_source') {
        return (pin?.name === '+' || pinId === '1') ? 'VCC' : 'GND';
      }
      if (comp.type === 'source_pos_point') return 'VCC';
      if (comp.type === 'source_neg_point') return 'GND';
      if (comp.type === 'earth_ground') return 'EARTH';
      if (comp.type === 'vcc' || comp.type === 'vcc_3v3') return 'VCC';
      if (comp.type === 'gnd') return 'GND';
      return null;
    };

    let netName =
      getReferenceNet(endPinInfo.componentId, endPinInfo.pinId) ||
      (startPinInfo ? getReferenceNet(startPinInfo.componentId, startPinInfo.pinId) : null) ||
      `NET_${Date.now().toString(36).toUpperCase()}`;

    if (netName.startsWith('NET_')) {
      if (startPinInfo) {
        const startComp = components.find((c) => c.id === startPinInfo.componentId);
        const startPin = startComp?.pins.find((p) => p.id === startPinInfo.pinId);
        if (startPin?.net) netName = startPin.net;
      }
      if (netName.startsWith('NET_')) {
        const endComp = components.find((c) => c.id === endPinInfo.componentId);
        const endPin = endComp?.pins.find((p) => p.id === endPinInfo.pinId);
        if (endPin?.net) netName = endPin.net;
      }
    }

    const newWire: Wire = {
      id: `wire_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      points: finalPoints,
      net: netName,
      startPin: startPinInfo || undefined,
      endPin: endPinInfo,
    };

    // Update pin net assignments in components
    const updatedComponents = components.map((comp) => {
      let modified = false;
      const updatedPins = comp.pins.map((p) => {
        if (
          startPinInfo &&
          comp.id === startPinInfo.componentId &&
          p.id === startPinInfo.pinId
        ) {
          modified = true;
          return { ...p, net: netName };
        }
        if (comp.id === endPinInfo.componentId && p.id === endPinInfo.pinId) {
          modified = true;
          return { ...p, net: netName };
        }
        return p;
      });
      return modified ? { ...comp, pins: updatedPins } : comp;
    });

    if (onUpdateCircuit) {
      onUpdateCircuit(updatedComponents, [...wires, newWire]);
    } else {
      onUpdateWires([...wires, newWire]);
      onUpdateComponents(updatedComponents);
    }

    setIsWiring(false);
    setWirePoints([]);
    setWireStartPin(null);
  };

  // Helper to delete a wire
  const handleDeleteWire = (wireId: string) => {
    onUpdateWires(wires.filter((w) => w.id !== wireId));
    onSelectWires(selectedWireIds.filter((id) => id !== wireId));
  };

  // Helper to delete a component
  const handleDeleteComponent = (compId: string) => {
    const newComps = components.filter((c) => c.id !== compId);
    const newWires = wires.filter(
      (w) =>
        (!w.startPin || w.startPin.componentId !== compId) &&
        (!w.endPin || w.endPin.componentId !== compId)
    );
    if (onUpdateCircuit) {
      onUpdateCircuit(newComps, newWires);
    } else {
      onUpdateComponents(newComps);
      onUpdateWires(newWires);
    }
    onSelectComponents(selectedComponentIds.filter((id) => id !== compId));
  };

  // Helper to update connected wire endpoints when components move or align
  const updateWiresForMovedComponents = (newComponents: SchematicComponent[], movedIds: string[]) => {
    const compMap = new Map(newComponents.map((c) => [c.id, c]));
    return wires.map((wire) => {
      let newPts = [...wire.points];
      let changed = false;
      if (wire.startPin && movedIds.includes(wire.startPin.componentId)) {
        const comp = compMap.get(wire.startPin.componentId);
        if (comp) {
          newPts[0] = getPinWorldPosition(comp, wire.startPin.pinId);
          changed = true;
        }
      }
      if (wire.endPin && movedIds.includes(wire.endPin.componentId)) {
        const comp = compMap.get(wire.endPin.componentId);
        if (comp) {
          newPts[newPts.length - 1] = getPinWorldPosition(comp, wire.endPin.pinId);
          changed = true;
        }
      }
      return changed ? { ...wire, points: newPts } : wire;
    });
  };

  // Align selected components
  const handleAlign = (alignment: 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom') => {
    const selected = components.filter((c) => selectedComponentIds.includes(c.id));
    if (selected.length < 2) return;

    let targetVal: number;
    let updated = [...components];

    if (alignment === 'left') {
      targetVal = Math.min(...selected.map((c) => c.x));
      updated = components.map((c) => (selectedComponentIds.includes(c.id) ? { ...c, x: snapToGrid(targetVal) } : c));
    } else if (alignment === 'center-x') {
      targetVal = Math.round(selected.reduce((sum, c) => sum + c.x, 0) / selected.length);
      updated = components.map((c) => (selectedComponentIds.includes(c.id) ? { ...c, x: snapToGrid(targetVal) } : c));
    } else if (alignment === 'right') {
      targetVal = Math.max(...selected.map((c) => c.x));
      updated = components.map((c) => (selectedComponentIds.includes(c.id) ? { ...c, x: snapToGrid(targetVal) } : c));
    } else if (alignment === 'top') {
      targetVal = Math.min(...selected.map((c) => c.y));
      updated = components.map((c) => (selectedComponentIds.includes(c.id) ? { ...c, y: snapToGrid(targetVal) } : c));
    } else if (alignment === 'center-y') {
      targetVal = Math.round(selected.reduce((sum, c) => sum + c.y, 0) / selected.length);
      updated = components.map((c) => (selectedComponentIds.includes(c.id) ? { ...c, y: snapToGrid(targetVal) } : c));
    } else if (alignment === 'bottom') {
      targetVal = Math.max(...selected.map((c) => c.y));
      updated = components.map((c) => (selectedComponentIds.includes(c.id) ? { ...c, y: snapToGrid(targetVal) } : c));
    }

    const updatedWires = updateWiresForMovedComponents(updated, selectedComponentIds);
    if (onUpdateCircuit) {
      onUpdateCircuit(updated, updatedWires);
    } else {
      onUpdateComponents(updated);
      onUpdateWires(updatedWires);
    }
  };

  // Distribute selected components evenly
  const handleDistribute = (axis: 'x' | 'y') => {
    const selected = components.filter((c) => selectedComponentIds.includes(c.id));
    if (selected.length < 3) return;

    const sorted = [...selected].sort((a, b) => (axis === 'x' ? a.x - b.x : a.y - b.y));
    const minPos = axis === 'x' ? sorted[0].x : sorted[0].y;
    const maxPos = axis === 'x' ? sorted[sorted.length - 1].x : sorted[sorted.length - 1].y;
    const step = (maxPos - minPos) / (sorted.length - 1);

    const posMap = new Map<string, number>();
    sorted.forEach((comp, idx) => {
      posMap.set(comp.id, snapToGrid(minPos + idx * step));
    });

    const updated = components.map((c) => {
      if (posMap.has(c.id)) {
        return axis === 'x' ? { ...c, x: posMap.get(c.id)! } : { ...c, y: posMap.get(c.id)! };
      }
      return c;
    });

    const updatedWires = updateWiresForMovedComponents(updated, selectedComponentIds);
    if (onUpdateCircuit) {
      onUpdateCircuit(updated, updatedWires);
    } else {
      onUpdateComponents(updated);
      onUpdateWires(updatedWires);
    }
  };

  // Rotate selected components
  const handleRotateSelected = () => {
    if (selectedComponentIds.length === 0) return;
    const updated = components.map((c) => {
      if (selectedComponentIds.includes(c.id)) {
        return { ...c, rotation: (((c.rotation || 0) + 90) % 360) as any };
      }
      return c;
    });
    const updatedWires = updateWiresForMovedComponents(updated, selectedComponentIds);
    if (onUpdateCircuit) {
      onUpdateCircuit(updated, updatedWires);
    } else {
      onUpdateComponents(updated);
      onUpdateWires(updatedWires);
    }
  };

  // Handle click-to-probe for a component pin
  const handleProbePin = useCallback(
    (componentId: string, pinId: string, screenPos?: Point) => {
      const comp = components.find((c) => c.id === componentId);
      if (!comp) return;
      const def = getComponentDef(comp.type);
      const pinDef = def.pins.find((p) => p.id === pinId);
      const pinState = comp.pins.find((p) => p.id === pinId);
      const worldPos = getPinWorldPosition(comp, pinId);

      const target: ProbeTarget = {
        id: `pin:${comp.id}:${pinId}`,
        type: 'pin',
        label: `${comp.designator} Pin ${pinId}${pinDef?.name ? ` (${pinDef.name})` : ''}`,
        subLabel: `${def.name} • ${pinState?.net ? `Net: ${pinState.net}` : 'Direct Terminal'}`,
        netName: pinState?.net,
        componentId: comp.id,
        pinId: pinId,
        worldPosition: worldPos,
        screenPosition: screenPos || worldToScreen(worldPos),
      };

      setActiveProbe(target);
      const probeKey = pinState?.net || `pin:${comp.id}:${pinId}`;
      if (onToggleProbeNet && (!simulationState?.probedNets.includes(probeKey))) {
        onToggleProbeNet(probeKey);
      }
    },
    [components, simulationState?.probedNets, onToggleProbeNet, worldToScreen]
  );

  // Handle click-to-probe for a wire
  const handleProbeWire = useCallback(
    (wire: Wire, screenPos?: Point) => {
      const midIdx = Math.floor(wire.points.length / 2);
      const midPt = wire.points[midIdx] || wire.points[0];

      const target: ProbeTarget = {
        id: `wire:${wire.id}`,
        type: 'wire',
        label: `Wire (${wire.net || 'Unassigned Net'})`,
        subLabel: wire.net ? `Net: ${wire.net}` : 'Wire Segment',
        netName: wire.net,
        wireId: wire.id,
        worldPosition: midPt,
        screenPosition: screenPos || (midPt ? worldToScreen(midPt) : undefined),
      };

      setActiveProbe(target);
      const probeKey = wire.net || `wire:${wire.id}`;
      if (onToggleProbeNet && (!simulationState?.probedNets.includes(probeKey))) {
        onToggleProbeNet(probeKey);
      }
    },
    [simulationState?.probedNets, onToggleProbeNet, worldToScreen]
  );

  // Handle Mouse Down
  const handleMouseDown = (e: React.MouseEvent) => {
    const worldPos = screenToWorld(e.clientX, e.clientY);
    const snapped = snapPoint(worldPos);

    // Middle click or space key: pan canvas
    if (e.button === 1 || activeTool === 'pan' || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button !== 0) return; // Left click only for drawing/selecting

    // Placing a library component
    if (placingComponentDef) {
      const existingOfCategory = components.filter((c) => c.type === placingComponentDef.type);
      const designatorNumber = existingOfCategory.length + 1;
      const targetPos = currentMousePos || snapped;

      // Assign initial reference nets for power rails & ground pins
      const resolveInitialNet = (compType: string, pin: { id: string; name: string }) => {
        if (compType === 'dc_source') {
          return (pin.name === '+' || pin.id === '1') ? 'VCC' : 'GND';
        }
        if (compType === 'source_pos_point' || compType === 'vcc' || compType === 'vcc_3v3') return 'VCC';
        if (compType === 'source_neg_point' || compType === 'gnd') return 'GND';
        if (compType === 'earth_ground') return 'EARTH';
        return undefined;
      };

      const newComponent: SchematicComponent = {
        id: `comp_${Date.now()}`,
        type: placingComponentDef.type,
        designator: `${placingComponentDef.prefix}${designatorNumber}`,
        value: placingComponentDef.defaultVal,
        footprint: placingComponentDef.defaultFootprint,
        x: targetPos.x,
        y: targetPos.y,
        rotation: 0,
        pins: placingComponentDef.pins.map((p) => ({
          id: p.id,
          name: p.name,
          net: resolveInitialNet(placingComponentDef.type, p),
        })),
      };
      onUpdateComponents([...components, newComponent]);
      onSelectComponents([newComponent.id]);
      setActiveGuides(null);
      setMagneticStatus(null);
      if (onFinishPlacingComponent) onFinishPlacingComponent();
      return;
    }

    // 1. PIN CLICK CHECK (Terminal snapping for BOTH select and wire tools, or Click-to-Probe)
    const pinTarget = findClosestPin(worldPos, components, 18);

    if (pinTarget) {
      // If live simulation is running OR activeTool is probe, and not actively drawing a wire:
      if ((isSimulating || activeTool === 'probe') && activeTool !== 'wire' && !isWiring) {
        handleProbePin(pinTarget.component.id, pinTarget.pinId, { x: e.clientX, y: e.clientY });
        setIsDraggingComponents(false);
        return;
      }

      if (!isWiring) {
        // Start wiring from this pin terminal!
        setIsWiring(true);
        setWireStartPin({
          componentId: pinTarget.component.id,
          pinId: pinTarget.pinId,
        });
        setWirePoints([pinTarget.pos]);
        setIsDraggingComponents(false);
        return;
      } else {
        // Currently wiring: Check if clicking starting pin
        if (
          wireStartPin &&
          pinTarget.component.id === wireStartPin.componentId &&
          pinTarget.pinId === wireStartPin.pinId
        ) {
          // Clicked same starting pin: keep wiring
          return;
        }
        completeWireConnection(pinTarget);
        return;
      }
    }

    // 2. WIRING ON EMPTY CANVAS (Waypoints or free wire start)
    if (activeTool === 'wire' || isWiring) {
      if (!isWiring) {
        // Start wire from free grid point
        setIsWiring(true);
        setWireStartPin(null);
        setWirePoints([snapped]);
      } else {
        // Add orthogonal waypoint
        const lastPt = wirePoints[wirePoints.length - 1];
        const segment = generateOrthogonalPath(lastPt, snapped);
        setWirePoints([...wirePoints.slice(0, -1), ...segment]);
      }
      return;
    }

    // Selection mode: Check if clicked on a component
    const clickedComp = components.find((c) => {
      const def = getComponentDef(c.type);
      const halfW = def.width / 2 + 10;
      const halfH = def.height / 2 + 10;
      return (
        worldPos.x >= c.x - halfW &&
        worldPos.x <= c.x + halfW &&
        worldPos.y >= c.y - halfH &&
        worldPos.y <= c.y + halfH
      );
    });

    if (clickedComp) {
      const isAlreadySelected = selectedComponentIds.includes(clickedComp.id);
      let newSelectedIds = selectedComponentIds;
      if (e.shiftKey) {
        // Toggle selection
        if (isAlreadySelected) {
          newSelectedIds = selectedComponentIds.filter((id) => id !== clickedComp.id);
          onSelectComponents(newSelectedIds);
        } else {
          newSelectedIds = [...selectedComponentIds, clickedComp.id];
          onSelectComponents(newSelectedIds);
        }
      } else {
        if (!isAlreadySelected) {
          newSelectedIds = [clickedComp.id];
          onSelectComponents(newSelectedIds);
        }
      }
      onSelectWires([]);

      // Start drag
      setIsDraggingComponents(true);
      setDragStartMouse(snapped);
      const initialPosMap = new Map<string, Point>();
      const initialWireMap = new Map<string, Point[]>();
      const dragIds = newSelectedIds.length > 0 ? newSelectedIds : [clickedComp.id];

      for (const comp of components) {
        if (dragIds.includes(comp.id)) {
          initialPosMap.set(comp.id, { x: comp.x, y: comp.y });
        }
      }
      for (const wire of wires) {
        if (
          wire.startPin &&
          wire.endPin &&
          dragIds.includes(wire.startPin.componentId) &&
          dragIds.includes(wire.endPin.componentId)
        ) {
          initialWireMap.set(wire.id, wire.points.map((p) => ({ ...p })));
        }
      }
      setDragInitialPositions(initialPosMap);
      setDragInitialWirePoints(initialWireMap);
      return;
    }

    // Clicked empty background: start marquee selection or clear selection
    setMarqueeShift(e.shiftKey);
    if (!e.shiftKey) {
      onSelectComponents([]);
      onSelectWires([]);
    }
    setMarqueeStart(worldPos);
    setMarqueeCurrent(worldPos);
  };

  // Mouse Move
  const handleMouseMove = (e: React.MouseEvent) => {
    const worldPos = screenToWorld(e.clientX, e.clientY);
    const snapped = snapPoint(worldPos);
    setCurrentMousePos(snapped);

    // Panning
    if (isPanning) {
      onPanChange({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    // Marquee Selection Box
    if (marqueeStart) {
      setMarqueeCurrent(worldPos);
      return;
    }

    // Dragging components with Magnetic Snap-to-Grid & Port Alignment
    if (isDraggingComponents) {
      const rawDx = snapped.x - dragStartMouse.x;
      const rawDy = snapped.y - dragStartMouse.y;

      const stationaryComps = components.filter((c) => !dragInitialPositions.has(c.id));
      const draggedComps = components.filter((c) => dragInitialPositions.has(c.id));
      const primaryCompId = selectedComponentIds[0] || Array.from(dragInitialPositions.keys())[0];

      // Perform Magnetic Snap: locks to wire ports, pins, component centers, and edges
      const snapResult = calculateMagneticSnap({
        draggedComponents: draggedComps,
        dragInitialPositions,
        stationaryComponents: stationaryComps,
        wires,
        rawDx,
        rawDy,
        primaryCompId,
        snapThreshold: 14,
      });

      const dx = snapResult.dx;
      const dy = snapResult.dy;

      setActiveGuides(snapResult.guides.length > 0 ? snapResult.guides : null);
      setMagneticStatus({
        isLockedToPin: snapResult.isLockedToPin,
        isLockedToPort: snapResult.isLockedToPort,
        isLockedToCenter: snapResult.isLockedToCenter,
      });

      const updated = components.map((comp) => {
        const initPos = dragInitialPositions.get(comp.id);
        if (initPos) {
          return {
            ...comp,
            x: initPos.x + dx,
            y: initPos.y + dy,
          };
        }
        return comp;
      });

      // Rubberband connected wires, preserving internal wires
      const updatedWires = wires.map((wire) => {
        const initPts = dragInitialWirePoints.get(wire.id);
        if (initPts) {
          return {
            ...wire,
            points: initPts.map((p) => ({ x: p.x + dx, y: p.y + dy })),
          };
        }
        let newPts = [...wire.points];
        if (wire.startPin && dragInitialPositions.has(wire.startPin.componentId)) {
          const comp = updated.find((c) => c.id === wire.startPin!.componentId);
          if (comp) {
            newPts[0] = getPinWorldPosition(comp, wire.startPin.pinId);
          }
        }
        if (wire.endPin && dragInitialPositions.has(wire.endPin.componentId)) {
          const comp = updated.find((c) => c.id === wire.endPin!.componentId);
          if (comp) {
            newPts[newPts.length - 1] = getPinWorldPosition(comp, wire.endPin.pinId);
          }
        }
        return { ...wire, points: newPts };
      });

      if (onUpdateCircuit) {
        onUpdateCircuit(updated, updatedWires);
      } else {
        onUpdateComponents(updated);
        onUpdateWires(updatedWires);
      }
      return;
    }

    // Placing a library component: preview with magnetic alignment to existing ports & centers
    if (placingComponentDef) {
      const placeSnap = calculatePlacementSnap({
        componentDef: placingComponentDef,
        rawPos: snapped,
        stationaryComponents: components,
        wires,
        snapThreshold: 14,
      });
      setCurrentMousePos(placeSnap.snappedPos);
      setActiveGuides(placeSnap.guides.length > 0 ? placeSnap.guides : null);
      setMagneticStatus({
        isLockedToPin: placeSnap.isLockedToPin,
        isLockedToPort: placeSnap.isLockedToPort,
        isLockedToCenter: placeSnap.isLockedToCenter,
      });
      return;
    }

    // Universal pin hover & snap detection
    const pinTarget = findClosestPin(worldPos, components, 18);
    if (pinTarget) {
      setHoveredPin({
        componentId: pinTarget.component.id,
        pinId: pinTarget.pinId,
      });
      // Snap directly to the pin center for crisp precision
      setCurrentMousePos(pinTarget.pos);
    } else {
      setHoveredPin(null);
      setCurrentMousePos(snapped);
      if (!isDraggingComponents) {
        setActiveGuides(null);
        setMagneticStatus(null);
      }
    }
  };

  // Mouse Up
  const handleMouseUp = (e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
    }
    if (isDraggingComponents) {
      setIsDraggingComponents(false);
      setActiveGuides(null);
      setMagneticStatus(null);

      // Auto-snap feature that aligns components to the nearest grid intersection when moving them
      const movedIds = Array.from(dragInitialPositions.keys()) as string[];
      if (movedIds.length > 0) {
        const snappedComponents = components.map((c) => {
          if (dragInitialPositions.has(c.id)) {
            return {
              ...c,
              x: snapToGrid(c.x, GRID_SIZE),
              y: snapToGrid(c.y, GRID_SIZE),
            };
          }
          return c;
        });

        const updatedWires = updateWiresForMovedComponents(snappedComponents, movedIds);

        if (onUpdateCircuit) {
          onUpdateCircuit(snappedComponents, updatedWires);
        } else {
          onUpdateComponents(snappedComponents);
          onUpdateWires(updatedWires);
        }
      }
    }

    // Drag-to-connect support:
    // If user clicked down on pin A, dragged to pin B, and released over pin B
    if (isWiring && wireStartPin) {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      const pinTarget = findClosestPin(worldPos, components, 18);
      if (
        pinTarget &&
        (pinTarget.component.id !== wireStartPin.componentId ||
          pinTarget.pinId !== wireStartPin.pinId)
      ) {
        completeWireConnection(pinTarget);
        return;
      }
    }

    if (marqueeStart && marqueeCurrent) {
      // Find all components intersecting or enclosed within the marquee rectangle
      const x1 = Math.min(marqueeStart.x, marqueeCurrent.x);
      const y1 = Math.min(marqueeStart.y, marqueeCurrent.y);
      const x2 = Math.max(marqueeStart.x, marqueeCurrent.x);
      const y2 = Math.max(marqueeStart.y, marqueeCurrent.y);

      if (Math.abs(x2 - x1) > 4 && Math.abs(y2 - y1) > 4) {
        const enclosedIds = components
          .filter((c) => {
            const def = getComponentDef(c.type);
            const halfW = def.width / 2;
            const halfH = def.height / 2;
            return !(c.x + halfW < x1 || c.x - halfW > x2 || c.y + halfH < y1 || c.y - halfH > y2);
          })
          .map((c) => c.id);

        const enclosedWireIds = wires
          .filter((w) => w.points.some((pt) => pt.x >= x1 && pt.x <= x2 && pt.y >= y1 && pt.y <= y2))
          .map((w) => w.id);

        if (marqueeShift) {
          onSelectComponents(Array.from(new Set([...selectedComponentIds, ...enclosedIds])));
          onSelectWires(Array.from(new Set([...selectedWireIds, ...enclosedWireIds])));
        } else {
          onSelectComponents(enclosedIds);
          onSelectWires(enclosedWireIds);
        }
      }
      setMarqueeStart(null);
      setMarqueeCurrent(null);
    }
  };

  // Junction dots
  const junctions = calculateJunctions(wires, components);

  // Active wire preview path
  const activeWirePreview = () => {
    if (!isWiring || wirePoints.length === 0) return null;
    const lastPoint = wirePoints[wirePoints.length - 1];
    const previewPoints = generateOrthogonalPath(lastPoint, currentMousePos);
    const fullPoints = [...wirePoints.slice(0, -1), ...previewPoints];
    return pointsToSvgPath(fullPoints);
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-[#0a0f1d] cursor-crosshair">
      <svg
        ref={svgRef}
        className="w-full h-full"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => {
          e.preventDefault();
          if (isWiring) {
            setIsWiring(false);
            setWirePoints([]);
            setWireStartPin(null);
            return;
          }

          const worldPos = screenToWorld(e.clientX, e.clientY);

          // 1. Check if right-clicked on a component
          const clickedComp = components.find((c) => {
            const def = getComponentDef(c.type);
            const halfW = def.width / 2 + 10;
            const halfH = def.height / 2 + 10;
            return (
              worldPos.x >= c.x - halfW &&
              worldPos.x <= c.x + halfW &&
              worldPos.y >= c.y - halfH &&
              worldPos.y <= c.y + halfH
            );
          });

          if (clickedComp) {
            let nextSel = selectedComponentIds;
            if (!selectedComponentIds.includes(clickedComp.id)) {
              nextSel = [clickedComp.id];
              onSelectComponents(nextSel);
            }
            setContextMenuTarget({
              type: 'component',
              component: clickedComp,
              selectedComponentIds: nextSel,
              selectedWireIds,
              x: e.clientX,
              y: e.clientY,
              worldX: worldPos.x,
              worldY: worldPos.y,
            });
            return;
          }

          // 2. Check if right-clicked on a wire
          const clickedWire = wires.find((w) => {
            for (let i = 0; i < w.points.length - 1; i++) {
              const p1 = w.points[i];
              const p2 = w.points[i + 1];
              const minX = Math.min(p1.x, p2.x) - 10;
              const maxX = Math.max(p1.x, p2.x) + 10;
              const minY = Math.min(p1.y, p2.y) - 10;
              const maxY = Math.max(p1.y, p2.y) + 10;
              if (
                worldPos.x >= minX &&
                worldPos.x <= maxX &&
                worldPos.y >= minY &&
                worldPos.y <= maxY
              ) {
                return true;
              }
            }
            return false;
          });

          if (clickedWire) {
            onSelectWires([clickedWire.id]);
            setContextMenuTarget({
              type: 'wire',
              wire: clickedWire,
              selectedComponentIds,
              selectedWireIds: [clickedWire.id],
              x: e.clientX,
              y: e.clientY,
              worldX: worldPos.x,
              worldY: worldPos.y,
            });
            return;
          }

          // 3. Right-clicked on empty canvas
          setContextMenuTarget({
            type: 'canvas',
            selectedComponentIds,
            selectedWireIds,
            x: e.clientX,
            y: e.clientY,
            worldX: worldPos.x,
            worldY: worldPos.y,
          });
        }}
      >
        <defs>
          {/* EasyEDA Grid Pattern */}
          <pattern
            id="eda-grid-minor"
            width={GRID_SIZE}
            height={GRID_SIZE}
            patternUnits="userSpaceOnUse"
          >
            <circle cx={GRID_SIZE / 2} cy={GRID_SIZE / 2} r="0.8" fill="#1e293b" />
          </pattern>
          <pattern
            id="eda-grid-major"
            width={MAJOR_GRID_SIZE}
            height={MAJOR_GRID_SIZE}
            patternUnits="userSpaceOnUse"
          >
            <rect width={MAJOR_GRID_SIZE} height={MAJOR_GRID_SIZE} fill="url(#eda-grid-minor)" />
            <path
              d={`M ${MAJOR_GRID_SIZE} 0 L 0 0 0 ${MAJOR_GRID_SIZE}`}
              fill="none"
              stroke="#1e3a5f"
              strokeWidth="0.8"
              opacity="0.6"
            />
          </pattern>

          {/* Flow indicator marker */}
          <marker
            id="arrow-head"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#38bdf8" />
          </marker>
        </defs>

        {/* Scaled & Panned Canvas Viewport */}
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Endless CAD Grid Background */}
          <rect
            x={-5000}
            y={-5000}
            width={10000}
            height={10000}
            fill="url(#eda-grid-major)"
          />

          {/* Coordinate Origin Crosshair */}
          <g stroke="#38bdf8" strokeWidth="1" opacity="0.4">
            <line x1="-30" y1="0" x2="30" y2="0" />
            <line x1="0" y1="-30" x2="0" y2="30" />
            <circle cx="0" cy="0" r="4" fill="none" />
          </g>

          {/* Schematic Functional Sections: SOURCE SECTION & LOAD SECTION */}
          {showSectionZones && (() => {
            // Source Components include power supplies, batteries, reference test points (+ / -), and Earth
            const isSourceComp = (c: SchematicComponent) =>
              c.type === 'dc_source' ||
              c.type === 'ac_source' ||
              c.type === 'source_pos_point' ||
              c.type === 'source_neg_point' ||
              c.type === 'vcc' ||
              c.type === 'gnd' ||
              c.type === 'earth_ground' ||
              c.category === 'power';

            const sourceComps = components.filter(isSourceComp);
            const loadComps = components.filter((c) => !isSourceComp(c));

            // Compute bounding box with safe padding
            const getBox = (comps: SchematicComponent[], defaultBox: { x: number; y: number; w: number; h: number }) => {
              if (comps.length === 0) return defaultBox;
              let minX = Infinity;
              let minY = Infinity;
              let maxX = -Infinity;
              let maxY = -Infinity;
              comps.forEach((c) => {
                minX = Math.min(minX, c.x - 70);
                minY = Math.min(minY, c.y - 70);
                maxX = Math.max(maxX, c.x + 70);
                maxY = Math.max(maxY, c.y + 70);
              });
              return {
                x: Math.round(minX),
                y: Math.round(minY),
                w: Math.max(260, Math.round(maxX - minX)),
                h: Math.max(340, Math.round(maxY - minY)),
              };
            };

            const sourceBox = getBox(sourceComps, { x: 100, y: 70, w: 400, h: 440 });
            const loadBox = getBox(loadComps, { x: 530, y: 70, w: 440, h: 440 });

            return (
              <g className="select-none pointer-events-none">
                {/* 1. SOURCE SECTION ZONE */}
                <g>
                  {/* Subtle translucent tinted background */}
                  <rect
                    x={sourceBox.x}
                    y={sourceBox.y}
                    width={sourceBox.w}
                    height={sourceBox.h}
                    rx={14}
                    fill="#3b82f6"
                    fillOpacity="0.04"
                    stroke="#3b82f6"
                    strokeWidth="1.8"
                    strokeDasharray="6 4"
                    strokeOpacity="0.75"
                  />

                  {/* Header Badge */}
                  <g transform={`translate(${sourceBox.x + 16}, ${sourceBox.y - 12})`}>
                    <rect
                      x="0"
                      y="0"
                      width="180"
                      height="24"
                      rx="6"
                      fill="#1e293b"
                      stroke="#3b82f6"
                      strokeWidth="1.2"
                    />
                    <circle cx="14" cy="12" r="4.5" fill="#3b82f6" />
                    <text
                      x="26"
                      y="16"
                      fill="#93c5fd"
                      fontSize="11"
                      fontWeight="800"
                      fontFamily="sans-serif"
                      letterSpacing="0.05em"
                    >
                      SOURCE SECTION (+ / -)
                    </text>
                  </g>

                  {/* Connection Reference Guide Note */}
                  <g transform={`translate(${sourceBox.x + 16}, ${sourceBox.y + sourceBox.h - 10})`}>
                    <rect
                      x="0"
                      y="0"
                      width="280"
                      height="20"
                      rx="4"
                      fill="#0f172a"
                      stroke="#1e3a5f"
                      strokeWidth="1"
                    />
                    <text
                      x="10"
                      y="14"
                      fill="#60a5fa"
                      fontSize="9.5"
                      fontFamily="monospace"
                      fontWeight="600"
                    >
                      ⚡ Reference Rails: + Point (VCC) • - Point (0V) • ⏚ Earth
                    </text>
                  </g>
                </g>

                {/* Arrow connecting Source to Load */}
                <g stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6">
                  <path
                    d={`M ${sourceBox.x + sourceBox.w} ${sourceBox.y + 70} L ${loadBox.x} ${loadBox.y + 70}`}
                    markerEnd="url(#arrow-head)"
                  />
                  <text
                    x={(sourceBox.x + sourceBox.w + loadBox.x) / 2}
                    y={sourceBox.y + 64}
                    textAnchor="middle"
                    fill="#38bdf8"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    POWER FLOW →
                  </text>
                </g>

                {/* 2. LOAD SECTION ZONE */}
                <g>
                  {/* Subtle translucent tinted background */}
                  <rect
                    x={loadBox.x}
                    y={loadBox.y}
                    width={loadBox.w}
                    height={loadBox.h}
                    rx={14}
                    fill="#10b981"
                    fillOpacity="0.035"
                    stroke="#10b981"
                    strokeWidth="1.8"
                    strokeDasharray="6 4"
                    strokeOpacity="0.75"
                  />

                  {/* Header Badge */}
                  <g transform={`translate(${loadBox.x + 16}, ${loadBox.y - 12})`}>
                    <rect
                      x="0"
                      y="0"
                      width="215"
                      height="24"
                      rx="6"
                      fill="#1e293b"
                      stroke="#10b981"
                      strokeWidth="1.2"
                    />
                    <circle cx="14" cy="12" r="4.5" fill="#10b981" />
                    <text
                      x="26"
                      y="16"
                      fill="#6ee7b7"
                      fontSize="11"
                      fontWeight="800"
                      fontFamily="sans-serif"
                      letterSpacing="0.05em"
                    >
                      LOAD SECTION (PRODUCT / IC)
                    </text>
                  </g>

                  {/* Connection Guidance Subtitle */}
                  <g transform={`translate(${loadBox.x + 16}, ${loadBox.y + loadBox.h - 10})`}>
                    <rect
                      x="0"
                      y="0"
                      width="310"
                      height="20"
                      rx="4"
                      fill="#0f172a"
                      stroke="#064e3b"
                      strokeWidth="1"
                    />
                    <text
                      x="10"
                      y="14"
                      fill="#34d399"
                      fontSize="9.5"
                      fontFamily="monospace"
                      fontWeight="600"
                    >
                      🔌 Place Selected Product Here &amp; Connect Wires to + / - / Earth
                    </text>
                  </g>
                </g>
              </g>
            );
          })()}

          {/* Existing Wires */}
          {wires.map((wire, wireIdx) => {
            const isSelected = selectedWireIds.includes(wire.id);
            const pathStr = pointsToSvgPath(wire.points);
            const isPower = wire.net === 'VCC' || wire.net === '+5V' || wire.net === '9V';
            const isGround = wire.net === 'GND' || wire.net === '0V';
            const strokeColor = isPower ? '#f43f5e' : isGround ? '#38bdf8' : '#22c55e';
            const currentVal = simulationState?.wireCurrents[wire.id] || 0;
            const netVoltage = simulationState?.netVoltages[wire.net];
            const isProbed = simulationState?.probedNets.includes(wire.net);
            const isActivelyProbed =
              activeProbe?.id === `wire:${wire.id}` ||
              (Boolean(activeProbe?.netName) && activeProbe?.netName === wire.net);
            const isHovered = (isSimulating || activeTool === 'probe') && hoveredWireId === wire.id;

            // Compute midpoint of wire for label placement
            const midIndex = Math.floor(wire.points.length / 2);
            const midPt = wire.points[midIndex] || wire.points[0];

            return (
              <g
                key={`${wire.id}-${wireIdx}`}
                onMouseEnter={() => setHoveredWireId(wire.id)}
                onMouseLeave={() => setHoveredWireId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectWires([wire.id]);
                  onSelectComponents([]);
                  if (isSimulating || activeTool === 'probe') {
                    handleProbeWire(wire, { x: e.clientX, y: e.clientY });
                  } else if (onToggleProbeNet && wire.net && e.shiftKey) {
                    onToggleProbeNet(wire.net);
                  }
                }}
                className="cursor-pointer group"
              >
                {/* Thick hit-test stroke for effortless clicking */}
                <path
                  d={pathStr}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="16"
                />
                {/* Hover Probe Cue during Live Simulation */}
                {isHovered && (
                  <>
                    <path
                      d={pathStr}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="7"
                      strokeOpacity="0.45"
                      strokeLinecap="round"
                    />
                    {midPt && (
                      <g transform={`translate(${midPt.x}, ${midPt.y - 12})`} className="pointer-events-none select-none">
                        <rect x="-42" y="-9" width="84" height="18" rx="4" fill="#0284c7" stroke="#38bdf8" strokeWidth="1" />
                        <text x="0" y="3" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold" fontFamily="monospace">
                          ⚡ PROBE WIRE
                        </text>
                      </g>
                    )}
                  </>
                )}
                {/* Selection halo */}
                {isSelected && (
                  <path
                    d={pathStr}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="7"
                    strokeOpacity="0.45"
                  />
                )}
                {/* Active Probed Wire Glow */}
                {isActivelyProbed && (
                  <path
                    d={pathStr}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="4"
                    strokeOpacity="0.6"
                    strokeDasharray="6 3"
                    className="animate-pulse"
                  />
                )}
                {/* Visible Wire */}
                <path
                  d={pathStr}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isSelected ? '2.5' : '1.8'}
                  strokeLinecap="round"
                  strokeLinejoin="miter"
                />

                {/* Vertex handles for selected wire */}
                {isSelected &&
                  wire.points.map((pt, pIdx) => (
                    <circle
                      key={`pt-${pIdx}`}
                      cx={pt.x}
                      cy={pt.y}
                      r="3.5"
                      fill="#38bdf8"
                      stroke="#0f172a"
                      strokeWidth="1.5"
                    />
                  ))}

                {/* Floating Action & Delete Pill for Selected Wire */}
                {isSelected && midPt && (
                  <g
                    transform={`translate(${midPt.x}, ${midPt.y - 18})`}
                    className="select-none"
                  >
                    <rect
                      x="-70"
                      y="-13"
                      width="140"
                      height="26"
                      rx="6"
                      fill="#090d16"
                      stroke="#ef4444"
                      strokeWidth="1.2"
                      className="drop-shadow-lg"
                    />
                    <text
                      x="-38"
                      y="3"
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {wire.net ? (wire.net.length > 7 ? wire.net.slice(0, 6) + '…' : wire.net) : 'NET'}
                    </text>
                    <line x1="-12" y1="-7" x2="-12" y2="7" stroke="#334155" strokeWidth="1" />
                    {/* Clickable Delete Button */}
                    <g
                      className="cursor-pointer hover:opacity-90"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteWire(wire.id);
                      }}
                    >
                      <rect x="-8" y="-9" width="72" height="18" rx="4" fill="#dc2626" />
                      <text
                        x="28"
                        y="4"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="sans-serif"
                      >
                        ✕ Delete [Del]
                      </text>
                    </g>
                  </g>
                )}

                {/* Animated Current Flow (Moving electrons in real working schematic view) */}
                {(isLiveWorkingAnimation || (isSimulating && simulationState && currentVal > 0.0001)) && (
                  <path
                    d={pathStr}
                    fill="none"
                    stroke="#fef08a"
                    strokeWidth="2.5"
                    strokeDasharray="4 8"
                    strokeDashoffset={simulationState ? -simulationState.time * 65 : undefined}
                    strokeOpacity="0.85"
                    className={`pointer-events-none ${!simulationState ? 'animate-current-flow' : ''}`}
                  />
                )}

                {/* Live Current Readout Badge on Active Wires */}
                {isSimulating && currentVal >= 0.001 && midPt && (
                  <g transform={`translate(${midPt.x}, ${midPt.y})`} className="pointer-events-none">
                    <rect
                      x="-24"
                      y="-16"
                      width="48"
                      height="12"
                      rx="2"
                      fill="#0f172a"
                      fillOpacity="0.85"
                      stroke="#10b981"
                      strokeWidth="0.8"
                    />
                    <text
                      x="0"
                      y="-7"
                      textAnchor="middle"
                      fontSize="8"
                      fontFamily="monospace"
                      fontWeight="bold"
                      fill="#34d399"
                    >
                      {formatCurrent(currentVal)}
                    </text>
                  </g>
                )}

                {/* Oscilloscope Probed Net Marker */}
                {isProbed && midPt && (
                  <g transform={`translate(${midPt.x}, ${midPt.y})`} className="pointer-events-none">
                    <circle cx="0" cy="0" r="8" fill="none" stroke="#38bdf8" strokeWidth="2" className="animate-ping" />
                    <circle cx="0" cy="0" r="5" fill="#38bdf8" />
                    <text x="10" y="3" fontSize="8" fill="#38bdf8" fontWeight="bold" fontFamily="monospace">
                      PROBE
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Solder Junction Dots */}
          {junctions.map((pt, idx) => (
            <circle
              key={`junct-${idx}`}
              cx={pt.x}
              cy={pt.y}
              r="3.5"
              fill="#22c55e"
              stroke="#0f172a"
              strokeWidth="1"
            />
          ))}

          {/* Active Wiring Preview Line */}
          {isWiring && (
            <path
              d={activeWirePreview() || ''}
              fill="none"
              stroke="#22c55e"
              strokeWidth="2.5"
              strokeDasharray="4 2"
              className="animate-pulse"
            />
          )}

          {/* Components */}
          {components.map((comp, compIdx) => {
            const isSelected = selectedComponentIds.includes(comp.id);
            const simResult = simulationState?.componentResults[comp.id];
            return (
              <ComponentGlyph
                key={`${comp.id}-${compIdx}`}
                component={comp}
                isSelected={isSelected}
                hoveredPinId={hoveredPin?.componentId === comp.id ? hoveredPin.pinId : null}
                simulationResult={simResult}
                isSimulating={isSimulating}
                isLiveWorking={isLiveWorkingAnimation}
                onToggleSwitch={onToggleSwitch}
                probedPinId={
                  activeProbe?.type === 'pin' && activeProbe.componentId === comp.id
                    ? activeProbe.pinId
                    : null
                }
                onPinClick={(pinId, event) => {
                  if (isSimulating || activeTool === 'probe') {
                    handleProbePin(comp.id, pinId, event ? { x: event.clientX, y: event.clientY } : undefined);
                  }
                }}
              />
            );
          })}

          {/* HIGH-VISIBILITY IDENTIFIED SOURCE & LOAD CONNECTION POINT CALLOUT OVERLAYS */}
          {showSectionZones && (
            <g className="pointer-events-none select-none">
              {components.map((comp) => {
                const isSourceType =
                  comp.type === 'source_pos_point' ||
                  comp.type === 'source_neg_point' ||
                  comp.type === 'earth_ground' ||
                  comp.type === 'source_terminal_block' ||
                  comp.type === 'three_phase_source_terminal' ||
                  comp.type === 'dc_source' ||
                  comp.type === 'ac_source';

                const isLoadType =
                  comp.type === 'load_terminal_block' ||
                  comp.type === 'three_phase_load_terminal' ||
                  comp.type === 'three_phase_motor';

                if (!isSourceType && !isLoadType) return null;

                const def = getComponentDef(comp.type);
                const tagX = comp.x;
                const tagY = comp.y - def.height / 2 - 22;

                const isSource = isSourceType;
                const badgeTitle =
                  comp.type === 'source_pos_point'
                    ? '⚡ [SOURCE POINT: +VCC RAIL]'
                    : comp.type === 'source_neg_point'
                    ? '⚡ [SOURCE POINT: -0V GND RETURN]'
                    : comp.type === 'earth_ground'
                    ? '⏚ [SOURCE POINT: PROTECTIVE EARTH]'
                    : comp.type === 'source_terminal_block'
                    ? '⚡ [MAIN SOURCE: 220V L / N / PE]'
                    : comp.type === 'three_phase_source_terminal'
                    ? '⚡ [MAIN SOURCE: 440V 3Φ L1/L2/L3]'
                    : comp.type === 'dc_source'
                    ? '⚡ [DC POWER SOURCE: +V / -V]'
                    : comp.type === 'load_terminal_block'
                    ? '🔌 [LOAD INPUT: CONNECT TO SOURCE]'
                    : comp.type === 'three_phase_load_terminal'
                    ? '🔌 [MOTOR LOAD TERMINALS: U/V/W]'
                    : comp.type === 'three_phase_motor'
                    ? '🔌 [3Φ INDUCTION MOTOR LOAD]'
                    : '🔌 [LOAD CONNECTION POINT]';

                const borderColor = isSource ? '#3b82f6' : '#10b981';
                const glowFill = isSource ? '#60a5fa' : '#34d399';

                return (
                  <g key={`conn-callout-${comp.id}`}>
                    {/* Pulsating target rings on all component terminal pins */}
                    {(comp.pins || []).map((pin) => {
                      const pinWorld = getPinWorldPosition(comp, pin.id);
                      return (
                        <g key={`pin-target-${comp.id}-${pin.id}`} transform={`translate(${pinWorld.x}, ${pinWorld.y})`}>
                          <circle cx="0" cy="0" r="10" fill="none" stroke={borderColor} strokeWidth="1.5" className="animate-ping" opacity="0.6" />
                          <circle cx="0" cy="0" r="6" fill="none" stroke={borderColor} strokeWidth="2" strokeDasharray="3 2" />
                        </g>
                      );
                    })}

                    {/* Floating Callout Pointer Badge */}
                    <g transform={`translate(${tagX}, ${tagY})`}>
                      <rect
                        x="-105"
                        y="-12"
                        width="210"
                        height="24"
                        rx="6"
                        fill="#090d16"
                        stroke={borderColor}
                        strokeWidth="1.8"
                        className="drop-shadow-xl"
                      />
                      <circle cx="-92" cy="0" r="4" fill={glowFill} className="animate-pulse" />
                      <text
                        x="-82"
                        y="4"
                        fill="#ffffff"
                        fontSize="9"
                        fontWeight="800"
                        fontFamily="monospace"
                        letterSpacing="0.03em"
                      >
                        {badgeTitle}
                      </text>
                      {/* Downward pointer caret */}
                      <polygon
                        points="-6,12 6,12 0,18"
                        fill="#090d16"
                        stroke={borderColor}
                        strokeWidth="1.5"
                      />
                    </g>
                  </g>
                );
              })}
            </g>
          )}

          {/* Magnetic Docking Halo on Dragged Components */}
          {isDraggingComponents && (
            <g className="pointer-events-none select-none">
              {components
                .filter((comp) => dragInitialPositions.has(comp.id))
                .map((comp) => {
                  const def = getComponentDef(comp.type);
                  const isPortLocked = magneticStatus?.isLockedToPin || magneticStatus?.isLockedToPort;
                  const isCenterLocked = magneticStatus?.isLockedToCenter;
                  const strokeColor = isPortLocked ? '#06b6d4' : isCenterLocked ? '#f59e0b' : '#38bdf8';
                  const glowColor = isPortLocked ? '#0891b2' : isCenterLocked ? '#d97706' : '#0284c7';

                  return (
                    <g key={`drag-halo-${comp.id}`}>
                      <rect
                        x={comp.x - def.width / 2 - 8}
                        y={comp.y - def.height / 2 - 8}
                        width={def.width + 16}
                        height={def.height + 16}
                        rx="8"
                        fill="none"
                        stroke={glowColor}
                        strokeWidth="4"
                        opacity="0.25"
                      />
                      <rect
                        x={comp.x - def.width / 2 - 8}
                        y={comp.y - def.height / 2 - 8}
                        width={def.width + 16}
                        height={def.height + 16}
                        rx="8"
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="1.8"
                        strokeDasharray={isPortLocked ? '6 3' : '4 4'}
                        className={isPortLocked ? 'animate-pulse' : undefined}
                      />
                    </g>
                  );
                })}
            </g>
          )}

          {/* Physical Oscilloscope Probe Head Fixture on Active Probed Point */}
          {activeProbe && (() => {
            let probePos = activeProbe.worldPosition;
            if (activeProbe.type === 'pin' && activeProbe.componentId && activeProbe.pinId) {
              const comp = components.find((c) => c.id === activeProbe.componentId);
              if (comp) probePos = getPinWorldPosition(comp, activeProbe.pinId);
            } else if (activeProbe.type === 'wire' && activeProbe.wireId) {
              const wire = wires.find((w) => w.id === activeProbe.wireId);
              if (wire) {
                const midIdx = Math.floor(wire.points.length / 2);
                probePos = wire.points[midIdx] || wire.points[0];
              }
            }
            if (!probePos) return null;

            return (
              <g transform={`translate(${probePos.x}, ${probePos.y})`} className="pointer-events-none select-none">
                {/* Measurement Pulse Halo */}
                <circle cx="0" cy="0" r="16" fill="none" stroke="#38bdf8" strokeWidth="2.5" className="animate-ping" opacity="0.6" />
                <circle cx="0" cy="0" r="8" fill="#0284c7" fillOpacity="0.4" stroke="#38bdf8" strokeWidth="2" />
                <circle cx="0" cy="0" r="3" fill="#ffffff" />

                {/* Oscilloscope Probe Head Body (Angled 10:1 test lead) */}
                <g transform="rotate(-35)">
                  {/* Hook tip clamping pin/wire */}
                  <path d="M 0 0 L -3 -6 L -1.5 -12 L 1.5 -12 L 3 -6 Z" fill="#cbd5e1" stroke="#38bdf8" strokeWidth="1" />
                  {/* Probe Barrel Body */}
                  <rect x="-4" y="-36" width="8" height="24" rx="2" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" />
                  {/* High-bandwidth Channel band (Electric Blue) */}
                  <rect x="-4" y="-32" width="8" height="4" fill="#38bdf8" />
                  {/* Coaxial BNC cable extending off */}
                  <path d="M 0 -36 Q 12 -50 24 -60" fill="none" stroke="#0284c7" strokeWidth="2" strokeDasharray="3 2" />
                </g>

                {/* Floating Probed Net / Pin Tag Pill */}
                <g transform="translate(18, -18)">
                  <rect x="0" y="-12" width="116" height="22" rx="4" fill="#090d16" stroke="#38bdf8" strokeWidth="1.2" className="drop-shadow-lg" />
                  <text x="8" y="2" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="monospace">
                    ⚡ CH1 PROBE
                  </text>
                  <text x="76" y="2" fill="#34d399" fontSize="8" fontWeight="bold" fontFamily="monospace">
                    {simulationState?.isRunning ? 'LIVE' : 'HOLD'}
                  </text>
                </g>
              </g>
            );
          })()}

          {/* Floating Action Controls for Single Selected Component */}
          {selectedComponentIds.length === 1 && (() => {
            const comp = components.find((c) => c.id === selectedComponentIds[0]);
            if (!comp) return null;
            const def = getComponentDef(comp.type);
            const topY = comp.y - (def.height / 2) - 22;
            return (
              <g transform={`translate(${comp.x}, ${topY})`} className="select-none">
                <rect
                  x="-72"
                  y="-12"
                  width="144"
                  height="24"
                  rx="5"
                  fill="#0f172a"
                  stroke="#38bdf8"
                  strokeWidth="1.2"
                  className="drop-shadow-lg"
                />
                {/* Rotate Button */}
                <g
                  className="cursor-pointer hover:opacity-80"
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextRot = ((comp.rotation + 90) % 360) as 0 | 90 | 180 | 270;
                    onUpdateComponents(
                      components.map((c) => (c.id === comp.id ? { ...c, rotation: nextRot } : c))
                    );
                  }}
                >
                  <text x="-38" y="4" textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold">
                    ↻ Rotate [R]
                  </text>
                </g>
                <line x1="0" y1="-6" x2="0" y2="6" stroke="#334155" strokeWidth="1" />
                {/* Delete Button */}
                <g
                  className="cursor-pointer hover:opacity-80"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteComponent(comp.id);
                  }}
                >
                  <text x="36" y="4" textAnchor="middle" fill="#f87171" fontSize="9" fontWeight="bold">
                    ✕ Delete [Del]
                  </text>
                </g>
              </g>
            );
          })()}

          {/* Active target pin pulsing snap ring during wiring */}
          {isWiring && hoveredPin && (
            <g
              transform={`translate(${currentMousePos.x}, ${currentMousePos.y})`}
              className="pointer-events-none"
            >
              <circle cx="0" cy="0" r="14" fill="none" stroke="#22c55e" strokeWidth="2.5" className="animate-ping" />
              <circle cx="0" cy="0" r="7" fill="#22c55e" fillOpacity="0.4" stroke="#ffffff" strokeWidth="2" />
              <rect x="12" y="-12" width="95" height="22" rx="4" fill="#052e16" stroke="#22c55e" strokeWidth="1" />
              <text x="59" y="3" textAnchor="middle" fill="#4ade80" fontSize="9" fontWeight="bold" fontFamily="monospace">
                Click to Connect
              </text>
            </g>
          )}

          {/* Placing Component Ghost Outline */}
          {placingComponentDef && (
            <g
              transform={`translate(${currentMousePos.x}, ${currentMousePos.y})`}
              className="pointer-events-none opacity-80"
            >
              <rect
                x={-placingComponentDef.width / 2}
                y={-placingComponentDef.height / 2}
                width={placingComponentDef.width}
                height={placingComponentDef.height}
                fill="#38bdf8"
                fillOpacity="0.15"
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="4 2"
                rx="3"
              />
              <text
                x="0"
                y="4"
                textAnchor="middle"
                fontSize="10"
                fill="#38bdf8"
                fontWeight="bold"
              >
                {placingComponentDef.name}
              </text>
            </g>
          )}

          {/* Dynamic Magnetic Snap & Smart Alignment Guides */}
          {activeGuides && activeGuides.length > 0 && (
            <g className="pointer-events-none select-none">
              {activeGuides.map((guide) => {
                const isPortOrPin = guide.type === 'pin' || guide.type === 'wire_port';
                const isEdge = guide.type === 'edge';
                const lineColor = isPortOrPin ? '#06b6d4' : isEdge ? '#a855f7' : '#f59e0b';
                const glowColor = isPortOrPin ? '#0891b2' : isEdge ? '#9333ea' : '#d97706';
                const badgeBg = isPortOrPin ? '#083344' : isEdge ? '#3b0764' : '#451a03';
                const badgeBorder = isPortOrPin ? '#06b6d4' : isEdge ? '#c084fc' : '#f59e0b';
                const textColor = isPortOrPin ? '#67e8f9' : isEdge ? '#e9d5ff' : '#fde68a';

                return (
                  <g key={guide.id}>
                    {/* Full Canvas Alignment Beam */}
                    {guide.axis === 'x' ? (
                      <>
                        <line
                          x1={guide.pos}
                          y1={-5000}
                          x2={guide.pos}
                          y2={5000}
                          stroke={glowColor}
                          strokeWidth="5"
                          opacity="0.25"
                        />
                        <line
                          x1={guide.pos}
                          y1={-5000}
                          x2={guide.pos}
                          y2={5000}
                          stroke={lineColor}
                          strokeWidth="1.5"
                          strokeDasharray="6 3"
                        />
                      </>
                    ) : (
                      <>
                        <line
                          x1={-5000}
                          y1={guide.pos}
                          x2={5000}
                          y2={guide.pos}
                          stroke={glowColor}
                          strokeWidth="5"
                          opacity="0.25"
                        />
                        <line
                          x1={-5000}
                          y1={guide.pos}
                          x2={5000}
                          y2={guide.pos}
                          stroke={lineColor}
                          strokeWidth="1.5"
                          strokeDasharray="6 3"
                        />
                      </>
                    )}

                    {/* Connecting Segment Between Dragged Pin/Center & Target Pin/Port */}
                    {guide.sourcePt && guide.targetPt && (
                      <g>
                        <line
                          x1={guide.sourcePt.x}
                          y1={guide.sourcePt.y}
                          x2={guide.targetPt.x}
                          y2={guide.targetPt.y}
                          stroke={lineColor}
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                          opacity="0.85"
                        />
                        {/* Distance badge if anchors are separated */}
                        {guide.distance !== undefined && guide.distance > 35 && (
                          <g
                            transform={`translate(${
                              (guide.sourcePt.x + guide.targetPt.x) / 2
                            }, ${(guide.sourcePt.y + guide.targetPt.y) / 2})`}
                          >
                            <rect
                              x="-22"
                              y="-8"
                              width="44"
                              height="16"
                              rx="3"
                              fill="#090d16"
                              stroke={lineColor}
                              strokeWidth="0.8"
                              opacity="0.95"
                            />
                            <text
                              x="0"
                              y="3"
                              textAnchor="middle"
                              fill={textColor}
                              fontSize="7.5"
                              fontWeight="bold"
                              fontFamily="monospace"
                            >
                              {Math.round(guide.distance)}px
                            </text>
                          </g>
                        )}
                      </g>
                    )}

                    {/* Stationary Target Magnetic Reticle & Crosshair */}
                    {guide.targetPt && (
                      <g transform={`translate(${guide.targetPt.x}, ${guide.targetPt.y})`}>
                        <circle
                          cx="0"
                          cy="0"
                          r="12"
                          fill="none"
                          stroke={lineColor}
                          strokeWidth="1.2"
                          opacity="0.6"
                          className="animate-ping"
                        />
                        <circle
                          cx="0"
                          cy="0"
                          r="5.5"
                          fill={badgeBg}
                          stroke={lineColor}
                          strokeWidth="2"
                        />
                        <line x1="-8" y1="0" x2="8" y2="0" stroke={lineColor} strokeWidth="1.2" />
                        <line x1="0" y1="-8" x2="0" y2="8" stroke={lineColor} strokeWidth="1.2" />
                      </g>
                    )}

                    {/* Dragged Anchor Lock Ring */}
                    {guide.sourcePt && (
                      <g transform={`translate(${guide.sourcePt.x}, ${guide.sourcePt.y})`}>
                        <circle
                          cx="0"
                          cy="0"
                          r="6"
                          fill="#10b981"
                          fillOpacity="0.35"
                          stroke="#34d399"
                          strokeWidth="2"
                        />
                        <circle cx="0" cy="0" r="2" fill="#ffffff" />
                      </g>
                    )}

                    {/* Interactive HUD Pill Badge with Alignment Label */}
                    {(() => {
                      const badgeX = guide.axis === 'x' ? guide.pos : currentMousePos.x;
                      const badgeY = guide.axis === 'y' ? guide.pos : currentMousePos.y - 26;
                      const labelText = guide.label;
                      const textWidth = Math.max(120, labelText.length * 6.2 + 24);

                      return (
                        <g transform={`translate(${badgeX}, ${badgeY})`}>
                          <rect
                            x={-textWidth / 2}
                            y="-11"
                            width={textWidth}
                            height="22"
                            rx="4"
                            fill={badgeBg}
                            stroke={badgeBorder}
                            strokeWidth="1.2"
                            filter="drop-shadow(0 2px 6px rgba(0,0,0,0.7))"
                          />
                          <circle
                            cx={-textWidth / 2 + 12}
                            cy="0"
                            r="3.5"
                            fill={lineColor}
                          />
                          <text
                            x={-textWidth / 2 + 20}
                            y="3.5"
                            textAnchor="start"
                            fill={textColor}
                            fontSize="8.5"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            {labelText}
                          </text>
                        </g>
                      );
                    })()}
                  </g>
                );
              })}
            </g>
          )}

          {/* Enhanced Marquee Selection Box with Live Preview Counter */}
          {marqueeStart && marqueeCurrent && (() => {
            const x1 = Math.min(marqueeStart.x, marqueeCurrent.x);
            const y1 = Math.min(marqueeStart.y, marqueeCurrent.y);
            const w = Math.abs(marqueeCurrent.x - marqueeStart.x);
            const h = Math.abs(marqueeCurrent.y - marqueeStart.y);
            const selectedCount = components.filter((c) => {
              const def = getComponentDef(c.type);
              const halfW = def.width / 2;
              const halfH = def.height / 2;
              return !(c.x + halfW < x1 || c.x - halfW > x1 + w || c.y + halfH < y1 || c.y - halfH > y1 + h);
            }).length;

            return (
              <g className="pointer-events-none select-none">
                <rect
                  x={x1}
                  y={y1}
                  width={w}
                  height={h}
                  fill="#0284c7"
                  fillOpacity="0.12"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  strokeDasharray="5 3"
                  rx="3"
                />
                {/* Corner Accents */}
                <rect x={x1 - 2} y={y1 - 2} width="5" height="5" fill="#38bdf8" />
                <rect x={x1 + w - 3} y={y1 - 2} width="5" height="5" fill="#38bdf8" />
                <rect x={x1 - 2} y={y1 + h - 3} width="5" height="5" fill="#38bdf8" />
                <rect x={x1 + w - 3} y={y1 + h - 3} width="5" height="5" fill="#38bdf8" />

                {/* Floating Selection Counter Badge */}
                {w > 25 && h > 20 && (
                  <g transform={`translate(${x1 + w + 8}, ${y1 + h + 8})`}>
                    <rect
                      x="0"
                      y="-11"
                      width="120"
                      height="22"
                      rx="4"
                      fill="#0f172a"
                      stroke="#38bdf8"
                      strokeWidth="1.2"
                      className="drop-shadow-lg"
                    />
                    <text
                      x="60"
                      y="4"
                      textAnchor="middle"
                      fill="#38bdf8"
                      fontSize="9.5"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {selectedCount} Component{selectedCount !== 1 ? 's' : ''}
                    </text>
                  </g>
                )}
              </g>
            );
          })()}
        </g>
      </svg>

      {/* Floating Arrange Toolbar (Top-Center) */}
      {selectedComponentIds.length > 0 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl rounded-xl px-3 py-1.5 flex items-center gap-1.5 text-xs text-slate-200 z-20 select-none animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-1.5 pr-2 border-r border-slate-700/80 text-sky-400 font-mono font-medium text-[11px]">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            <span>{selectedComponentIds.length} Selected</span>
          </div>

          {/* Multi-Component Alignment Controls */}
          {selectedComponentIds.length > 1 && (
            <>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => handleAlign('left')}
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Align Left (Align all selected to leftmost position)"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleAlign('center-x')}
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Align Center X (Align horizontal centers)"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleAlign('right')}
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Align Right (Align all selected to rightmost position)"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
                <div className="h-3 w-px bg-slate-700 mx-0.5" />
                <button
                  onClick={() => handleAlign('top')}
                  className="px-1.5 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white text-[10px] font-mono font-bold transition-colors cursor-pointer"
                  title="Align Top (Align all selected to topmost position)"
                >
                  Top
                </button>
                <button
                  onClick={() => handleAlign('center-y')}
                  className="px-1.5 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white text-[10px] font-mono font-bold transition-colors cursor-pointer"
                  title="Align Center Y (Align vertical centers)"
                >
                  Mid
                </button>
                <button
                  onClick={() => handleAlign('bottom')}
                  className="px-1.5 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white text-[10px] font-mono font-bold transition-colors cursor-pointer"
                  title="Align Bottom (Align all selected to bottommost position)"
                >
                  Btm
                </button>
              </div>

              {selectedComponentIds.length >= 3 && (
                <>
                  <div className="h-3 w-px bg-slate-700 mx-0.5" />
                  <button
                    onClick={() => handleDistribute('x')}
                    className="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white text-[10px] font-mono transition-colors cursor-pointer"
                    title="Distribute evenly horizontally"
                  >
                    Distribute X
                  </button>
                  <button
                    onClick={() => handleDistribute('y')}
                    className="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white text-[10px] font-mono transition-colors cursor-pointer"
                    title="Distribute evenly vertically"
                  >
                    Distribute Y
                  </button>
                </>
              )}

              <div className="h-3 w-px bg-slate-700 mx-1" />
            </>
          )}

          {/* Rotate 90deg */}
          <button
            onClick={handleRotateSelected}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-sky-300 transition-colors cursor-pointer text-[11px]"
            title="Rotate 90 degrees [R]"
          >
            <RotateCw className="w-3.5 h-3.5 text-sky-400" />
            <span>Rotate</span>
            <kbd className="text-[9px] bg-slate-800 px-1 py-0.5 rounded text-slate-400">R</kbd>
          </button>

          {/* Duplicate */}
          <button
            onClick={handleDuplicateSelected}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-sky-300 transition-colors cursor-pointer text-[11px]"
            title="Duplicate components [Ctrl+D]"
          >
            <Copy className="w-3.5 h-3.5 text-amber-400" />
            <span>Duplicate</span>
          </button>

          {/* Delete */}
          <button
            onClick={handleDeleteSelected}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 transition-colors cursor-pointer text-[11px]"
            title="Delete components [Del]"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Delete</span>
            <kbd className="text-[9px] bg-slate-800 px-1 py-0.5 rounded text-slate-400">Del</kbd>
          </button>
        </div>
      )}

      {/* Clearly Mention Component Details: Floating On-Canvas Component Details HUD Card */}
      {selectedComponentIds.length === 1 && (() => {
        const comp = components.find((c) => c.id === selectedComponentIds[0]);
        if (!comp) return null;
        const def = getComponentDef(comp.type);
        const compSim = simulationState?.componentResults?.[comp.id];
        const realDetails = getRealProductDetails(comp);

        return (
          <div className="absolute bottom-12 right-4 w-80 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden z-20 font-sans animate-in fade-in slide-in-from-bottom-2">
            {/* Header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-800/80 border-b border-slate-700">
              <div className="flex items-center gap-2.5">
                <RealProductImage component={comp} className="w-10 h-10 rounded-lg border border-slate-700 bg-slate-950 p-0.5 object-contain flex-shrink-0 shadow-inner" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-sky-300 font-mono">{comp.designator}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-medium uppercase">
                      {def.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate max-w-[170px]">{def.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailsCardExpanded(!isDetailsCardExpanded)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition-colors cursor-pointer"
                title={isDetailsCardExpanded ? 'Collapse Details' : 'Expand Details'}
              >
                {isDetailsCardExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>

            {/* Body */}
            {isDetailsCardExpanded && (
              <div className="p-3 space-y-2.5 text-xs">
                {/* Authentic Component Specs */}
                <div className="bg-slate-950/70 p-2.5 rounded-lg border border-emerald-900/40 text-[11px] space-y-1">
                  <div className="flex items-center justify-between text-[10px] uppercase font-bold text-emerald-400">
                    <span>Authentic Component Product</span>
                    <span className="font-mono text-slate-400 text-[9px]">{realDetails.package}</span>
                  </div>
                  <div className="flex justify-between py-0.5 text-slate-300">
                    <span className="text-slate-400">Part (MPN):</span>
                    <span className="text-amber-300 font-mono font-medium">{realDetails.partNumber}</span>
                  </div>
                  <div className="flex justify-between py-0.5 text-slate-300">
                    <span className="text-slate-400">Manufacturer:</span>
                    <span>{realDetails.manufacturer}</span>
                  </div>
                  <div className="flex justify-between py-0.5 text-slate-300">
                    <span className="text-slate-400">Supplier &amp; SKU:</span>
                    <span className="text-sky-300 font-mono">{realDetails.supplier} ({realDetails.supplierPartNumber})</span>
                  </div>
                  <div className="flex justify-between py-0.5 text-slate-300">
                    <span className="text-slate-400">Estimated Unit Cost:</span>
                    <span className="text-emerald-400 font-mono font-semibold">{realDetails.unitPrice}</span>
                  </div>
                </div>

                {/* Value & Package Details */}
                <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-mono">Component Value</span>
                    {editingValueCompId === comp.id ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <input
                          type="text"
                          value={editingValueText}
                          onChange={(e) => setEditingValueText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              onUpdateComponents(
                                components.map((c) => (c.id === comp.id ? { ...c, value: editingValueText } : c))
                              );
                              setEditingValueCompId(null);
                            } else if (e.key === 'Escape') {
                              setEditingValueCompId(null);
                            }
                          }}
                          className="w-full bg-slate-800 border border-sky-500 rounded px-1.5 py-0.5 text-xs text-sky-200 font-mono focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            onUpdateComponents(
                              components.map((c) => (c.id === comp.id ? { ...c, value: editingValueText } : c))
                            );
                            setEditingValueCompId(null);
                          }}
                          className="p-1 rounded bg-sky-500 text-white cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          setEditingValueCompId(comp.id);
                          setEditingValueText(comp.value);
                        }}
                        className="flex items-center justify-between group cursor-pointer hover:text-sky-300 mt-0.5"
                        title="Click to edit value"
                      >
                        <span className="font-bold text-slate-200 font-mono">{comp.value}</span>
                        <Edit2 className="w-3 h-3 text-slate-500 group-hover:text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-mono">Footprint / Package</span>
                    <span className="font-medium text-slate-300 font-mono truncate block mt-0.5">
                      {comp.footprint || def.defaultFootprint || 'Generic'}
                    </span>
                  </div>
                </div>

                {/* Spatial / Layout Details */}
                <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-800/40 rounded border border-slate-800/80 text-[11px] font-mono text-slate-400">
                  <span>Position: <strong className="text-slate-200">{Math.round(comp.x)}, {Math.round(comp.y)}</strong></span>
                  <span>Rotation: <strong className="text-sky-400">{comp.rotation || 0}°</strong></span>
                  <span>Pins: <strong className="text-slate-200">{def.pins.length}</strong></span>
                </div>

                {/* Live Electrical Health & Overload / Burnout Diagnostics */}
                {isSimulating && compSim && (
                  <div className="space-y-1.5 p-2 bg-slate-950/80 rounded-lg border border-slate-800 font-mono">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Live Status:</span>
                      <span
                        className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                          compSim.isBurnedOut
                            ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                            : compSim.isOverloaded
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {compSim.state || 'NORMAL'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Current: <strong className="text-slate-200">{(compSim.current * 1000).toFixed(2)} mA</strong></span>
                      <span>Drop: <strong className="text-slate-200">{compSim.voltageDrop.toFixed(2)} V</strong></span>
                      <span>Power: <strong className="text-slate-200">{(compSim.power * 1000).toFixed(1)} mW</strong></span>
                    </div>
                    {compSim.warning && (
                      <div className="mt-1 p-2 rounded bg-rose-950/70 border border-rose-700/60 text-[10.5px] text-rose-200 font-sans leading-relaxed">
                        {compSim.warning}
                      </div>
                    )}
                  </div>
                )}

                {/* Pinout Details Table */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase font-mono">
                      Pinout & Connected Nets
                    </span>
                    {isSimulating && (
                      <span className="text-[9px] text-emerald-400 font-mono font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Live
                      </span>
                    )}
                  </div>
                  <div className="max-h-32 overflow-y-auto rounded border border-slate-800 divide-y divide-slate-800/60 bg-slate-950/40">
                    {def.pins.map((pin) => {
                      const pinState = comp.pins.find((p) => p.id === pin.id);
                      const connectedWire = wires.find(
                        (w) =>
                          (w.startPin?.componentId === comp.id && w.startPin.pinId === pin.id) ||
                          (w.endPin?.componentId === comp.id && w.endPin.pinId === pin.id)
                      );
                      const netName = pinState?.net || connectedWire?.net || 'Floating';
                      const pinVoltage = simulationState?.pinVoltages?.[`${comp.id}:${pin.id}`];

                      return (
                        <div key={pin.id} className="flex items-center justify-between px-2 py-1 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="w-4 text-center font-mono font-bold text-sky-400 text-[10px]">
                              {pin.id}
                            </span>
                            <span className="text-slate-300 font-mono text-[10px]">{pin.name || `Pin ${pin.id}`}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                                netName === 'Floating'
                                  ? 'bg-slate-800 text-slate-500'
                                  : 'bg-sky-950 text-sky-300 border border-sky-800/50'
                              }`}
                            >
                              {netName}
                            </span>
                            {pinVoltage !== undefined && (
                              <span className="text-[10px] font-mono font-bold text-emerald-400">
                                {pinVoltage.toFixed(2)}V
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Action Footer */}
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={() => handleRotateSelected()}
                    className="flex-1 py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <RotateCw className="w-3 h-3 text-sky-400" />
                    Rotate
                  </button>
                  <button
                    onClick={() => handleDuplicateSelected()}
                    className="flex-1 py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Copy className="w-3 h-3 text-amber-400" />
                    Duplicate
                  </button>
                  <button
                    onClick={() => handleDeleteComponent(comp.id)}
                    className="py-1 px-2.5 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-[11px] font-medium transition-colors cursor-pointer flex items-center justify-center"
                    title="Delete Component"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Multi-Component Selection Details Card */}
      {selectedComponentIds.length > 1 && (
        <div className="absolute bottom-12 right-4 w-72 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl p-3 z-20 font-sans animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-sky-400" />
              <span className="font-bold text-xs text-slate-200">Area Selection</span>
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800/60">
              {selectedComponentIds.length} Components
            </span>
          </div>
          <div className="mt-2 text-slate-400 text-[11px]">
            <p className="mb-1.5 font-medium text-slate-300">Selected components:</p>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 bg-slate-950/50 rounded border border-slate-800">
              {components
                .filter((c) => selectedComponentIds.includes(c.id))
                .map((c) => (
                  <span
                    key={c.id}
                    className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 text-[10px] font-mono border border-slate-700"
                  >
                    {c.designator} ({c.value})
                  </span>
                ))}
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <span>Tip: Drag any selected part to arrange together</span>
          </div>
        </div>
      )}

      {/* Floating Canvas HUD Indicator */}
      <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-xs border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-3 text-[11px] text-slate-400 font-mono shadow-lg">
        <div>
          X: <span className="text-slate-200">{Math.round(currentMousePos.x)}</span> Y:{' '}
          <span className="text-slate-200">{Math.round(currentMousePos.y)}</span>
        </div>
        <div className="h-3 w-px bg-slate-700" />
        <div>
          Grid: <span className="text-slate-200">10px</span>
        </div>
        <div className="h-3 w-px bg-slate-700" />
        <div>
          Zoom: <span className="text-sky-400 font-semibold">{Math.round(zoom * 100)}%</span>
        </div>
        {isSimulating && (
          <>
            <div className="h-3 w-px bg-slate-700" />
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Sim: Live</span>
            </div>
          </>
        )}
        <div className="h-3 w-px bg-slate-700" />
        <button
          onClick={() => {
            if (activeProbe) {
              setActiveProbe(null);
            } else {
              // Probe first wire or pin as quick start
              const wire = wires[0];
              if (wire) {
                handleProbeWire(wire);
              }
            }
          }}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
            activeProbe
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
              : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title="Click-to-Probe: Click any wire or pin during live simulation to inspect transient trends"
        >
          <Radio className="w-3 h-3 text-sky-400" />
          <span>{activeProbe ? `Probe: ${activeProbe.label.slice(0, 12)}…` : 'Click to Probe [P]'}</span>
        </button>

        <div className="h-3 w-px bg-slate-700" />
        <button
          onClick={() => setIsLiveWorkingAnimation(!isLiveWorkingAnimation)}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors border ${
            isLiveWorkingAnimation
              ? 'bg-amber-950/80 text-amber-300 border-amber-600/60'
              : 'hover:bg-slate-800 text-slate-400 border-slate-700'
          }`}
          title="Toggle animated real working schematic current flow and active component dynamics"
        >
          <Activity className={`w-3 h-3 ${isLiveWorkingAnimation ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
          <span>Working: {isLiveWorkingAnimation ? 'Live Animated Flow' : 'Static'}</span>
        </button>

        {onPasteFromClipboard && (
          <>
            <div className="h-3 w-px bg-slate-700" />
            <button
              onClick={onPasteFromClipboard}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-sans font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 cursor-pointer transition-colors"
              title="Paste copied circuit diagram or web link (Ctrl+V) to auto-generate schematic"
            >
              <ClipboardPaste className="w-3 h-3 text-amber-400" />
              <span>Paste Web Circuit [Ctrl+V]</span>
            </button>
          </>
        )}
      </div>

      {/* Real-time Magnetic Snap Status Pill during Drag or Library Placement */}
      {(isDraggingComponents || placingComponentDef) && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none select-none animate-in fade-in slide-in-from-top-1">
          {magneticStatus?.isLockedToPin || magneticStatus?.isLockedToPort ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/95 border border-cyan-400 text-cyan-200 text-xs font-mono shadow-2xl shadow-cyan-950/80 backdrop-blur-md">
              <Magnet className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="font-bold tracking-wide">MAGNETIC SNAP: PORT LOCKED</span>
              <span className="text-[10px] text-cyan-300 px-1.5 py-0.5 rounded bg-cyan-900/70 font-semibold">
                {activeGuides?.length || 0} axis aligned
              </span>
            </div>
          ) : magneticStatus?.isLockedToCenter ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-950/95 border border-amber-400 text-amber-200 text-xs font-mono shadow-2xl shadow-amber-950/80 backdrop-blur-md">
              <Magnet className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold tracking-wide">MAGNETIC SNAP: CENTER ALIGNED</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-slate-300 text-xs font-mono shadow-lg backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-medium">Grid Snap (10px)</span>
              <span className="text-[10px] text-slate-400 font-sans">· Drag near ports or centers to snap</span>
            </div>
          )}
        </div>
      )}

      {/* Electrical Health & Damage Alert Banner (Visual failure feedback & notifications) */}
      {isSimulating && simulationState?.warnings && simulationState.warnings.length > 0 && (
        <div className="absolute top-3 left-4 max-w-md z-30 space-y-2 animate-in fade-in slide-in-from-top-2 pointer-events-auto">
          {warningsDismissed ? (
            <button
              onClick={() => setWarningsDismissed(false)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-950/95 border border-rose-500 text-rose-200 text-xs font-mono shadow-xl hover:bg-rose-900/90 transition-all cursor-pointer animate-pulse"
              title="Click to view electrical fault notifications"
            >
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span className="font-bold">🔥 {simulationState.warnings.length} Circuit Fault{simulationState.warnings.length > 1 ? 's' : ''} Detected</span>
              <span className="text-[10px] text-rose-300 underline font-sans ml-1">Inspect</span>
            </button>
          ) : (
            <div className="bg-slate-900/95 border border-rose-600/80 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md">
              {/* Header */}
              <div className="flex items-center justify-between px-3.5 py-2 bg-gradient-to-r from-rose-950/90 to-red-950/80 border-b border-rose-700/60 text-xs">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                  </span>
                  <span className="font-bold text-rose-200 font-mono text-[11px] tracking-wide">
                    ⚡ ELECTRICAL DAMAGE NOTIFICATION ({simulationState.warnings.length})
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {onOpenDiagnostics && (
                    <button
                      onClick={onOpenDiagnostics}
                      className="px-2 py-0.5 rounded bg-rose-900/60 hover:bg-rose-800 text-[10px] font-semibold text-rose-200 border border-rose-700/60 transition-colors cursor-pointer"
                      title="Open full diagnostic test report with remedies"
                    >
                      Diagnose All
                    </button>
                  )}
                  <button
                    onClick={() => setWarningsDismissed(true)}
                    className="p-1 rounded text-rose-300 hover:text-white hover:bg-rose-900/60 transition-colors cursor-pointer text-xs"
                    title="Minimize alert notifications"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Warnings List */}
              <div className="p-3 space-y-2.5 max-h-64 overflow-y-auto divide-y divide-slate-800/80">
                {simulationState.warnings.slice(0, 3).map((warn, idx) => {
                  const isBurnout = warn.includes('BURNOUT') || warn.includes('destroyed') || warn.includes('BREAKDOWN') || warn.includes('BURST');
                  
                  // Try to find matching component
                  const matchedComp = components.find((c) =>
                    (c.designator && warn.includes(c.designator)) ||
                    (c.name && warn.includes(c.name))
                  );

                  return (
                    <div key={idx} className={idx > 0 ? 'pt-2.5' : ''}>
                      <div className="flex items-start gap-2 text-xs">
                        <span className="text-base shrink-0 mt-0.5">{isBurnout ? '🔥' : '⚠️'}</span>
                        <div className="flex-1 leading-snug">
                          <p className="text-[11.5px] font-medium text-slate-100">
                            {warn}
                          </p>
                          {matchedComp && (
                            <div className="mt-1.5 flex items-center gap-2">
                              <button
                                onClick={() => {
                                  onSelectComponents([matchedComp.id]);
                                  // Pan canvas to center on component
                                  onPanChange({
                                    x: window.innerWidth / 2 - matchedComp.position.x * zoom,
                                    y: window.innerHeight / 2 - matchedComp.position.y * zoom,
                                  });
                                }}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 text-[10px] font-mono border border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <span>Focus {matchedComp.designator || matchedComp.name}</span>
                              </button>
                              {warn.includes('LED') && (
                                <span className="text-[10.5px] text-amber-300/90 font-sans">
                                  💡 Add 220Ω–1kΩ series resistor to protect LED
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Click-to-Probe Guidance Banner during Live Simulation */}
      {isSimulating && !activeProbe && (
        <div className="absolute top-3 right-4 px-3 py-1.5 bg-slate-900/90 backdrop-blur-xs border border-sky-500/40 text-sky-300 text-xs font-mono rounded-lg shadow-xl flex items-center gap-2 pointer-events-none select-none animate-in fade-in">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
          <span>Click any wire or pin to probe transient voltage & current trends</span>
        </div>
      )}

      {/* Floating Transient Probe Widget */}
      {activeProbe && (
        <TransientProbeWidget
          probeTarget={activeProbe}
          simulationState={
            simulationState || {
              isRunning: false,
              time: 0,
              speed: 1,
              netVoltages: {},
              pinVoltages: {},
              wireCurrents: {},
              componentResults: {},
              probedNets: [],
              probedWaveforms: {},
            }
          }
          components={components}
          wires={wires}
          onClose={() => setActiveProbe(null)}
          onOpenFullScope={onOpenFullScope}
          onToggleSwitch={onToggleSwitch}
          onUpdateComponentSettings={onUpdateComponentSettings}
        />
      )}

      {/* Floating Circuit Controls: Section Toggle & Circuit Rotation */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
        <button
          onClick={() => setShowSectionZones(!showSectionZones)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-2 transition-colors cursor-pointer shadow-lg backdrop-blur-md ${
            showSectionZones
              ? 'bg-blue-950/90 border-blue-400 text-blue-100 hover:bg-blue-900/90 ring-1 ring-blue-500/50'
              : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle Source Section and Load Section Visual Demarcation & Connection Point Callouts"
        >
          <span className={`w-2.5 h-2.5 rounded-full ${showSectionZones ? 'bg-sky-400 animate-pulse' : 'bg-slate-500'}`} />
          <span>⚡ Source &amp; Load Points</span>
        </button>

        <CircuitRotationToolbar
          onRotate={handleRotateCircuit}
          selectedCount={selectedComponentIds.length}
          totalComponentsCount={components.length}
        />
      </div>

      {/* Wiring Instruction Tooltip */}
      {isWiring && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-emerald-950/90 border border-emerald-700 text-emerald-300 text-xs font-mono rounded-full shadow-xl flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          Click pin to connect • Click canvas for orthogonal bend • Esc to cancel
        </div>
      )}

      {/* Right-Click Context Menu (Components, Wires, or Canvas) */}
      <SchematicContextMenu
        target={contextMenuTarget}
        onClose={() => setContextMenuTarget(null)}
        onDeleteSelected={handleDeleteSelected}
        onCopySelected={handleCopySelected}
        onCutSelected={handleCutSelected}
        onPasteAtPos={(x, y) => handlePasteClipboard(x, y)}
        onDuplicateSelected={handleDuplicateSelected}
        onRotateSelected={(dir) => handleRotateCircuit(dir)}
        onFlipSelected={handleFlipSelected}
        onEditComponentValue={(comp) => {
          setEditingValueCompId(comp.id);
          setEditingValueText(comp.value);
        }}
        onOpenPinoutMap={onOpenPinoutModal}
        onProbeTarget={(net) => {
          if (onToggleProbeNet) onToggleProbeNet(net);
        }}
        onOpenLoadDiagram={onOpenLoadDiagram}
        onOpenChatDrawer={onOpenChatDrawer}
        onOpenAutoCorrect={onOpenAutoCorrect}
        onFitView={onZoomFit}
        onClearAll={onClearCanvas}
        canPaste={Boolean(canvasClipboard && canvasClipboard.components.length > 0)}
      />
    </div>
  );
};
