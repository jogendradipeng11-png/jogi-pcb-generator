import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  SchematicComponent,
  Wire,
  Point,
  EditorTool,
  ComponentDefinition,
} from '../../types';
import { ComponentGlyph } from './ComponentGlyph';
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
import { getComponentDef } from '../../data/components';
import { SimulationState } from '../../types';
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
  onSelectComponents: (ids: string[]) => void;
  onSelectWires: (ids: string[]) => void;
  onFinishPlacingComponent?: () => void;
  onPanChange: (pan: Point) => void;
  onZoomChange: (zoom: number) => void;
  simulationState?: SimulationState;
  isSimulating?: boolean;
  onToggleProbeNet?: (net: string) => void;
  onToggleSwitch?: (comp: SchematicComponent) => void;
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
  onSelectComponents,
  onSelectWires,
  onFinishPlacingComponent,
  onPanChange,
  onZoomChange,
  simulationState,
  isSimulating = false,
  onToggleProbeNet,
  onToggleSwitch,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Interaction states
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });

  // Dragging components
  const [isDraggingComponents, setIsDraggingComponents] = useState(false);
  const [dragStartMouse, setDragStartMouse] = useState<Point>({ x: 0, y: 0 });
  const [dragInitialPositions, setDragInitialPositions] = useState<Map<string, Point>>(new Map());

  // Wiring state
  const [isWiring, setIsWiring] = useState(false);
  const [wirePoints, setWirePoints] = useState<Point[]>([]);
  const [wireStartPin, setWireStartPin] = useState<{ componentId: string; pinId: string } | null>(null);
  const [currentMousePos, setCurrentMousePos] = useState<Point>({ x: 0, y: 0 });
  const [hoveredPin, setHoveredPin] = useState<{ componentId: string; pinId: string } | null>(null);

  // Marquee selection box
  const [marqueeStart, setMarqueeStart] = useState<Point | null>(null);
  const [marqueeCurrent, setMarqueeCurrent] = useState<Point | null>(null);

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

  // Keyboard controls: Rotate, Delete, Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === 'r' || e.key === 'R') {
        // Rotate selected components 90 degrees
        if (selectedComponentIds.length > 0) {
          e.preventDefault();
          onUpdateComponents(
            components.map((c) => {
              if (selectedComponentIds.includes(c.id)) {
                const nextRot = ((c.rotation + 90) % 360) as 0 | 90 | 180 | 270;
                return { ...c, rotation: nextRot };
              }
              return c;
            })
          );
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedComponentIds.length > 0 || selectedWireIds.length > 0) {
          e.preventDefault();
          // Remove selected components
          const newComps = components.filter((c) => !selectedComponentIds.includes(c.id));
          // Remove wires connected to deleted components or explicitly selected wires
          const newWires = wires.filter((w) => {
            if (selectedWireIds.includes(w.id)) return false;
            if (w.startPin && selectedComponentIds.includes(w.startPin.componentId)) return false;
            if (w.endPin && selectedComponentIds.includes(w.endPin.componentId)) return false;
            return true;
          });
          onUpdateComponents(newComps);
          onUpdateWires(newWires);
          onSelectComponents([]);
          onSelectWires([]);
        }
      } else if (e.key === 'Escape') {
        // Cancel wiring or placement
        setIsWiring(false);
        setWirePoints([]);
        setWireStartPin(null);
        if (onFinishPlacingComponent) onFinishPlacingComponent();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedComponentIds,
    selectedWireIds,
    components,
    wires,
    onUpdateComponents,
    onUpdateWires,
    onSelectComponents,
    onSelectWires,
    onFinishPlacingComponent,
  ]);

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
      const newComponent: SchematicComponent = {
        id: `comp_${Date.now()}`,
        type: placingComponentDef.type,
        designator: `${placingComponentDef.prefix}${designatorNumber}`,
        value: placingComponentDef.defaultVal,
        footprint: placingComponentDef.defaultFootprint,
        x: snapped.x,
        y: snapped.y,
        rotation: 0,
        pins: placingComponentDef.pins.map((p) => ({
          id: p.id,
          name: p.name,
        })),
      };
      onUpdateComponents([...components, newComponent]);
      onSelectComponents([newComponent.id]);
      if (onFinishPlacingComponent) onFinishPlacingComponent();
      return;
    }

    // Wiring tool
    if (activeTool === 'wire' || isWiring) {
      // Check if clicking on or near a pin
      const pinTarget = findClosestPin(worldPos, components, 16);

      if (!isWiring) {
        // Start new wire
        if (pinTarget) {
          setIsWiring(true);
          setWireStartPin({
            componentId: pinTarget.component.id,
            pinId: pinTarget.pinId,
          });
          setWirePoints([pinTarget.pos]);
        } else {
          // Start wire from free grid point
          setIsWiring(true);
          setWireStartPin(null);
          setWirePoints([snapped]);
        }
      } else {
        // Continue or finish wiring
        if (pinTarget) {
          // Finish wire connected to this pin
          const lastPt = wirePoints[wirePoints.length - 1];
          const segment = generateOrthogonalPath(lastPt, pinTarget.pos);
          const finalPoints = [...wirePoints.slice(0, -1), ...segment];

          const startPinInfo = wireStartPin;
          const endPinInfo = {
            componentId: pinTarget.component.id,
            pinId: pinTarget.pinId,
          };

          // Determine net name
          let netName = `NET_${Date.now().toString(36).toUpperCase()}`;
          if (startPinInfo) {
            const startComp = components.find((c) => c.id === startPinInfo.componentId);
            const startPin = startComp?.pins.find((p) => p.id === startPinInfo.pinId);
            if (startPin?.net) netName = startPin.net;
          }

          const newWire: Wire = {
            id: `wire_${Date.now()}`,
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
              if (
                comp.id === endPinInfo.componentId &&
                p.id === endPinInfo.pinId
              ) {
                modified = true;
                return { ...p, net: netName };
              }
              return p;
            });
            return modified ? { ...comp, pins: updatedPins } : comp;
          });

          onUpdateWires([...wires, newWire]);
          onUpdateComponents(updatedComponents);

          setIsWiring(false);
          setWirePoints([]);
          setWireStartPin(null);
        } else {
          // Add orthogonal corner point
          const lastPt = wirePoints[wirePoints.length - 1];
          const segment = generateOrthogonalPath(lastPt, snapped);
          setWirePoints([...wirePoints.slice(0, -1), ...segment]);
        }
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
      if (e.shiftKey) {
        // Toggle selection
        if (selectedComponentIds.includes(clickedComp.id)) {
          onSelectComponents(selectedComponentIds.filter((id) => id !== clickedComp.id));
        } else {
          onSelectComponents([...selectedComponentIds, clickedComp.id]);
        }
      } else {
        if (!selectedComponentIds.includes(clickedComp.id)) {
          onSelectComponents([clickedComp.id]);
        }
      }
      onSelectWires([]);

      // Start drag
      setIsDraggingComponents(true);
      setDragStartMouse(snapped);
      const initialPosMap = new Map<string, Point>();
      for (const comp of components) {
        if (selectedComponentIds.includes(comp.id) || comp.id === clickedComp.id) {
          initialPosMap.set(comp.id, { x: comp.x, y: comp.y });
        }
      }
      setDragInitialPositions(initialPosMap);
      return;
    }

    // Clicked empty background: start marquee selection or clear selection
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

    // Dragging components
    if (isDraggingComponents) {
      const dx = snapped.x - dragStartMouse.x;
      const dy = snapped.y - dragStartMouse.y;

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

      // Rubberband connected wires
      const updatedWires = wires.map((wire) => {
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

      onUpdateComponents(updated);
      onUpdateWires(updatedWires);
      return;
    }

    // Wiring mode hover indicator
    if (activeTool === 'wire' || isWiring) {
      const pinTarget = findClosestPin(worldPos, components, 16);
      if (pinTarget) {
        setHoveredPin({
          componentId: pinTarget.component.id,
          pinId: pinTarget.pinId,
        });
      } else {
        setHoveredPin(null);
      }
    }
  };

  // Mouse Up
  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }
    if (isDraggingComponents) {
      setIsDraggingComponents(false);
    }
    if (marqueeStart && marqueeCurrent) {
      // Find all components within the marquee rectangle
      const x1 = Math.min(marqueeStart.x, marqueeCurrent.x);
      const y1 = Math.min(marqueeStart.y, marqueeCurrent.y);
      const x2 = Math.max(marqueeStart.x, marqueeCurrent.x);
      const y2 = Math.max(marqueeStart.y, marqueeCurrent.y);

      if (Math.abs(x2 - x1) > 5 && Math.abs(y2 - y1) > 5) {
        const enclosedIds = components
          .filter((c) => c.x >= x1 && c.x <= x2 && c.y >= y1 && c.y <= y2)
          .map((c) => c.id);
        onSelectComponents(enclosedIds);
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
          }
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

          {/* Existing Wires */}
          {wires.map((wire) => {
            const isSelected = selectedWireIds.includes(wire.id);
            const pathStr = pointsToSvgPath(wire.points);
            const isPower = wire.net === 'VCC' || wire.net === '+5V' || wire.net === '9V';
            const isGround = wire.net === 'GND' || wire.net === '0V';
            const strokeColor = isPower ? '#f43f5e' : isGround ? '#38bdf8' : '#22c55e';
            const currentVal = simulationState?.wireCurrents[wire.id] || 0;
            const netVoltage = simulationState?.netVoltages[wire.net];
            const isProbed = simulationState?.probedNets.includes(wire.net);

            // Compute midpoint of wire for label placement
            const midIndex = Math.floor(wire.points.length / 2);
            const midPt = wire.points[midIndex] || wire.points[0];

            return (
              <g
                key={wire.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isSimulating && onToggleProbeNet && wire.net) {
                    onToggleProbeNet(wire.net);
                  } else {
                    onSelectWires([wire.id]);
                    onSelectComponents([]);
                  }
                }}
                className="cursor-pointer"
              >
                {/* Thick invisible hit-test stroke */}
                <path
                  d={pathStr}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="12"
                />
                {/* Selection halo */}
                {isSelected && (
                  <path
                    d={pathStr}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="6"
                    strokeOpacity="0.4"
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

                {/* Animated Current Flow (Moving electrons) */}
                {isSimulating && simulationState && currentVal > 0.0001 && (
                  <path
                    d={pathStr}
                    fill="none"
                    stroke="#fef08a"
                    strokeWidth="2.5"
                    strokeDasharray="4 8"
                    strokeDashoffset={-simulationState.time * 65}
                    strokeOpacity="0.85"
                    className="pointer-events-none"
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
              strokeWidth="2"
              strokeDasharray="4 2"
              className="animate-pulse"
            />
          )}

          {/* Components */}
          {components.map((comp) => {
            const isSelected = selectedComponentIds.includes(comp.id);
            const simResult = simulationState?.componentResults[comp.id];
            return (
              <ComponentGlyph
                key={comp.id}
                component={comp}
                isSelected={isSelected}
                hoveredPinId={hoveredPin?.componentId === comp.id ? hoveredPin.pinId : null}
                simulationResult={simResult}
                isSimulating={isSimulating}
                onToggleSwitch={onToggleSwitch}
              />
            );
          })}

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

          {/* Marquee Selection Box */}
          {marqueeStart && marqueeCurrent && (
            <rect
              x={Math.min(marqueeStart.x, marqueeCurrent.x)}
              y={Math.min(marqueeStart.y, marqueeCurrent.y)}
              width={Math.abs(marqueeCurrent.x - marqueeStart.x)}
              height={Math.abs(marqueeCurrent.y - marqueeStart.y)}
              fill="#38bdf8"
              fillOpacity="0.1"
              stroke="#38bdf8"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          )}
        </g>
      </svg>

      {/* Floating Canvas HUD Indicator */}
      <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-xs border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-4 text-[11px] text-slate-400 font-mono shadow-lg">
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
      </div>

      {/* Wiring Instruction Tooltip */}
      {isWiring && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-emerald-950/90 border border-emerald-700 text-emerald-300 text-xs font-mono rounded-full shadow-xl flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          Click pin to connect • Click canvas for orthogonal bend • Esc to cancel
        </div>
      )}
    </div>
  );
};
