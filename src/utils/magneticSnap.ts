import { Point, SchematicComponent, Wire, ComponentDefinition } from '../types';
import { getComponentDef } from '../data/components';
import { getPinWorldPosition, GRID_SIZE } from './geometry';

export interface AlignmentGuide {
  id: string;
  axis: 'x' | 'y';
  pos: number;
  type: 'pin' | 'wire_port' | 'center' | 'edge';
  label: string;
  subLabel?: string;
  sourcePt?: Point;
  targetPt?: Point;
  distance?: number;
}

export interface MagneticSnapResult {
  dx: number;
  dy: number;
  guides: AlignmentGuide[];
  isLockedToPin: boolean;
  isLockedToPort: boolean;
  isLockedToCenter: boolean;
}

interface TargetItem {
  pos: Point;
  label: string;
  type: 'pin' | 'wire_port' | 'center' | 'edge';
  compId?: string;
  pinId?: string;
}

/**
 * Calculate magnetic snapping adjustments for dragged schematic components.
 * Prioritizes pin-to-pin and pin-to-wire port alignment, followed by component
 * center and edge alignment, while ensuring strict adherence to the grid.
 */
export function calculateMagneticSnap(params: {
  draggedComponents: SchematicComponent[];
  dragInitialPositions: Map<string, Point>;
  stationaryComponents: SchematicComponent[];
  wires: Wire[];
  rawDx: number;
  rawDy: number;
  primaryCompId?: string;
  snapThreshold?: number;
}): MagneticSnapResult {
  const {
    draggedComponents,
    dragInitialPositions,
    stationaryComponents,
    wires,
    rawDx,
    rawDy,
    primaryCompId,
    snapThreshold = 14,
  } = params;

  let finalDx = rawDx;
  let finalDy = rawDy;

  // 1. Gather all stationary targets (Pins, Wire Ports, Centers, Edges)
  const stationaryPinTargets: TargetItem[] = [];
  for (const comp of stationaryComponents) {
    const def = getComponentDef(comp.type);
    for (const pin of def.pins) {
      const pinPos = getPinWorldPosition(comp, pin.id);
      stationaryPinTargets.push({
        pos: pinPos,
        label: `${comp.designator}.${pin.name || pin.id}`,
        type: 'pin',
        compId: comp.id,
        pinId: pin.id,
      });
    }
  }

  // Gather stationary wire ports and vertices
  const stationaryWireTargets: TargetItem[] = [];
  for (const wire of wires) {
    const isWireMoving =
      (wire.startPin && dragInitialPositions.has(wire.startPin.componentId)) ||
      (wire.endPin && dragInitialPositions.has(wire.endPin.componentId));

    if (!isWireMoving && wire.points.length > 0) {
      // Wire endpoints
      const startPt = wire.points[0];
      const endPt = wire.points[wire.points.length - 1];

      stationaryWireTargets.push({
        pos: startPt,
        label: `Wire Terminal (${wire.net || 'Net'})`,
        type: 'wire_port',
      });

      if (wire.points.length > 1) {
        stationaryWireTargets.push({
          pos: endPt,
          label: `Wire Terminal (${wire.net || 'Net'})`,
          type: 'wire_port',
        });
      }

      // Intermediate junction / corner vertices
      for (let i = 1; i < wire.points.length - 1; i++) {
        stationaryWireTargets.push({
          pos: wire.points[i],
          label: `Wire Junction (${wire.net || 'Net'})`,
          type: 'wire_port',
        });
      }
    }
  }

  const allPortTargets = [...stationaryPinTargets, ...stationaryWireTargets];

  // Gather stationary component centers and bounding box edges
  const stationaryCenterTargets: TargetItem[] = [];
  const stationaryEdgeTargetsX: Array<{ pos: number; label: string; comp: SchematicComponent }> = [];
  const stationaryEdgeTargetsY: Array<{ pos: number; label: string; comp: SchematicComponent }> = [];

  for (const comp of stationaryComponents) {
    const def = getComponentDef(comp.type);
    const halfW = def.width / 2;
    const halfH = def.height / 2;

    stationaryCenterTargets.push({
      pos: { x: comp.x, y: comp.y },
      label: `${comp.designator}`,
      type: 'center',
      compId: comp.id,
    });

    stationaryEdgeTargetsX.push(
      { pos: comp.x - halfW, label: `${comp.designator} Left`, comp },
      { pos: comp.x + halfW, label: `${comp.designator} Right`, comp }
    );

    stationaryEdgeTargetsY.push(
      { pos: comp.y - halfH, label: `${comp.designator} Top`, comp },
      { pos: comp.y + halfH, label: `${comp.designator} Bottom`, comp }
    );
  }

  // 2. Identify dragged pins at initial positions
  interface DraggedPinInfo {
    comp: SchematicComponent;
    pinId: string;
    pinName: string;
    initPinPos: Point;
  }

  const draggedPins: DraggedPinInfo[] = [];
  for (const comp of draggedComponents) {
    const initCompPos = dragInitialPositions.get(comp.id);
    if (!initCompPos) continue;

    const def = getComponentDef(comp.type);
    for (const pin of def.pins) {
      // Calculate pin position at initial location
      const initPinPos = getPinWorldPosition(comp, pin.id);
      draggedPins.push({
        comp,
        pinId: pin.id,
        pinName: pin.name || pin.id,
        initPinPos,
      });
    }
  }

  // Flags to track snap types
  let isLockedToPin = false;
  let isLockedToPort = false;
  let isLockedToCenter = false;

  // Best match holders
  interface SnapMatchX {
    type: 'pin' | 'wire_port' | 'center' | 'edge';
    snapDx: number;
    pos: number;
    diff: number;
    label: string;
    sourcePt?: Point;
    targetPt?: Point;
  }

  interface SnapMatchY {
    type: 'pin' | 'wire_port' | 'center' | 'edge';
    snapDy: number;
    pos: number;
    diff: number;
    label: string;
    sourcePt?: Point;
    targetPt?: Point;
  }

  let bestMatchX: SnapMatchX | null = null;
  let bestMatchY: SnapMatchY | null = null;

  // A. Check Pin-to-Port / Pin-to-Pin Snapping (Highest Priority)
  for (const dp of draggedPins) {
    const candPinX = dp.initPinPos.x + rawDx;
    const candPinY = dp.initPinPos.y + rawDy;

    for (const target of allPortTargets) {
      // Check X axis
      const diffX = Math.abs(candPinX - target.pos.x);
      if (diffX <= snapThreshold) {
        if (!bestMatchX || diffX < bestMatchX.diff) {
          bestMatchX = {
            type: target.type,
            snapDx: target.pos.x - dp.initPinPos.x,
            pos: target.pos.x,
            diff: diffX,
            label: `Port Snap: ${dp.comp.designator}.${dp.pinName} ↔ ${target.label}`,
            sourcePt: { x: target.pos.x, y: candPinY },
            targetPt: target.pos,
          };
        }
      }

      // Check Y axis
      const diffY = Math.abs(candPinY - target.pos.y);
      if (diffY <= snapThreshold) {
        if (!bestMatchY || diffY < bestMatchY.diff) {
          bestMatchY = {
            type: target.type,
            snapDy: target.pos.y - dp.initPinPos.y,
            pos: target.pos.y,
            diff: diffY,
            label: `Port Snap: ${dp.comp.designator}.${dp.pinName} ↔ ${target.label}`,
            sourcePt: { x: candPinX, y: target.pos.y },
            targetPt: target.pos,
          };
        }
      }
    }
  }

  // B. If no Pin match on X, check Component Centers & Edges
  const primaryId = primaryCompId || draggedComponents[0]?.id;
  const primaryComp = draggedComponents.find((c) => c.id === primaryId) || draggedComponents[0];
  const primaryInit = primaryComp ? dragInitialPositions.get(primaryComp.id) : null;

  if (primaryComp && primaryInit) {
    const primaryDef = getComponentDef(primaryComp.type);
    const primaryHalfW = primaryDef.width / 2;
    const primaryHalfH = primaryDef.height / 2;

    if (!bestMatchX) {
      const candCenterX = primaryInit.x + rawDx;

      // Check center-to-center
      for (const target of stationaryCenterTargets) {
        const diffX = Math.abs(candCenterX - target.pos.x);
        if (diffX <= snapThreshold) {
          if (!bestMatchX || diffX < bestMatchX.diff) {
            bestMatchX = {
              type: 'center',
              snapDx: target.pos.x - primaryInit.x,
              pos: target.pos.x,
              diff: diffX,
              label: `Center Align: ${primaryComp.designator} ↔ ${target.label}`,
              sourcePt: { x: target.pos.x, y: primaryInit.y + rawDy },
              targetPt: target.pos,
            };
          }
        }
      }

      // Check edge-to-edge on X
      if (!bestMatchX) {
        const candLeft = primaryInit.x - primaryHalfW + rawDx;
        const candRight = primaryInit.x + primaryHalfW + rawDx;

        for (const edge of stationaryEdgeTargetsX) {
          // Left to edge
          const diffLeft = Math.abs(candLeft - edge.pos);
          if (diffLeft <= snapThreshold && (!bestMatchX || diffLeft < bestMatchX.diff)) {
            bestMatchX = {
              type: 'edge',
              snapDx: edge.pos - (primaryInit.x - primaryHalfW),
              pos: edge.pos,
              diff: diffLeft,
              label: `Edge Align: ${primaryComp.designator} Left ↔ ${edge.label}`,
              sourcePt: { x: edge.pos, y: primaryInit.y + rawDy },
              targetPt: { x: edge.pos, y: edge.comp.y },
            };
          }
          // Right to edge
          const diffRight = Math.abs(candRight - edge.pos);
          if (diffRight <= snapThreshold && (!bestMatchX || diffRight < bestMatchX.diff)) {
            bestMatchX = {
              type: 'edge',
              snapDx: edge.pos - (primaryInit.x + primaryHalfW),
              pos: edge.pos,
              diff: diffRight,
              label: `Edge Align: ${primaryComp.designator} Right ↔ ${edge.label}`,
              sourcePt: { x: edge.pos, y: primaryInit.y + rawDy },
              targetPt: { x: edge.pos, y: edge.comp.y },
            };
          }
        }
      }
    }

    // C. If no Pin match on Y, check Component Centers & Edges
    if (!bestMatchY) {
      const candCenterY = primaryInit.y + rawDy;

      // Check center-to-center
      for (const target of stationaryCenterTargets) {
        const diffY = Math.abs(candCenterY - target.pos.y);
        if (diffY <= snapThreshold) {
          if (!bestMatchY || diffY < bestMatchY.diff) {
            bestMatchY = {
              type: 'center',
              snapDy: target.pos.y - primaryInit.y,
              pos: target.pos.y,
              diff: diffY,
              label: `Center Align: ${primaryComp.designator} ↔ ${target.label}`,
              sourcePt: { x: primaryInit.x + rawDx, y: target.pos.y },
              targetPt: target.pos,
            };
          }
        }
      }

      // Check edge-to-edge on Y
      if (!bestMatchY) {
        const candTop = primaryInit.y - primaryHalfH + rawDy;
        const candBottom = primaryInit.y + primaryHalfH + rawDy;

        for (const edge of stationaryEdgeTargetsY) {
          const diffTop = Math.abs(candTop - edge.pos);
          if (diffTop <= snapThreshold && (!bestMatchY || diffTop < bestMatchY.diff)) {
            bestMatchY = {
              type: 'edge',
              snapDy: edge.pos - (primaryInit.y - primaryHalfH),
              pos: edge.pos,
              diff: diffTop,
              label: `Edge Align: ${primaryComp.designator} Top ↔ ${edge.label}`,
              sourcePt: { x: primaryInit.x + rawDx, y: edge.pos },
              targetPt: { x: edge.comp.x, y: edge.pos },
            };
          }
          const diffBottom = Math.abs(candBottom - edge.pos);
          if (diffBottom <= snapThreshold && (!bestMatchY || diffBottom < bestMatchY.diff)) {
            bestMatchY = {
              type: 'edge',
              snapDy: edge.pos - (primaryInit.y + primaryHalfH),
              pos: edge.pos,
              diff: diffBottom,
              label: `Edge Align: ${primaryComp.designator} Bottom ↔ ${edge.label}`,
              sourcePt: { x: primaryInit.x + rawDx, y: edge.pos },
              targetPt: { x: edge.comp.x, y: edge.pos },
            };
          }
        }
      }
    }
  }

  // Apply final snapped delta
  if (bestMatchX) {
    finalDx = bestMatchX.snapDx;
    if (bestMatchX.type === 'pin') isLockedToPin = true;
    else if (bestMatchX.type === 'wire_port') isLockedToPort = true;
    else if (bestMatchX.type === 'center') isLockedToCenter = true;
  }

  if (bestMatchY) {
    finalDy = bestMatchY.snapDy;
    if (bestMatchY.type === 'pin') isLockedToPin = true;
    else if (bestMatchY.type === 'wire_port') isLockedToPort = true;
    else if (bestMatchY.type === 'center') isLockedToCenter = true;
  }

  // Assemble the active guides to display
  const guides: AlignmentGuide[] = [];

  if (bestMatchX) {
    const src = bestMatchX.sourcePt ? { ...bestMatchX.sourcePt, y: (bestMatchX.sourcePt.y || 0) + (finalDy - rawDy) } : undefined;
    const dist = src && bestMatchX.targetPt ? Math.abs(src.y - bestMatchX.targetPt.y) : undefined;

    guides.push({
      id: `guide_x_${bestMatchX.pos}`,
      axis: 'x',
      pos: bestMatchX.pos,
      type: bestMatchX.type,
      label: bestMatchX.label,
      subLabel: `Collinear X: ${bestMatchX.pos.toFixed(0)}`,
      sourcePt: src,
      targetPt: bestMatchX.targetPt,
      distance: dist,
    });
  }

  if (bestMatchY) {
    const src = bestMatchY.sourcePt ? { ...bestMatchY.sourcePt, x: (bestMatchY.sourcePt.x || 0) + (finalDx - rawDx) } : undefined;
    const dist = src && bestMatchY.targetPt ? Math.abs(src.x - bestMatchY.targetPt.x) : undefined;

    guides.push({
      id: `guide_y_${bestMatchY.pos}`,
      axis: 'y',
      pos: bestMatchY.pos,
      type: bestMatchY.type,
      label: bestMatchY.label,
      subLabel: `Collinear Y: ${bestMatchY.pos.toFixed(0)}`,
      sourcePt: src,
      targetPt: bestMatchY.targetPt,
      distance: dist,
    });
  }

  return {
    dx: finalDx,
    dy: finalDy,
    guides,
    isLockedToPin,
    isLockedToPort,
    isLockedToCenter,
  };
}

/**
 * Calculate magnetic snapping for newly placed library components.
 */
export function calculatePlacementSnap(params: {
  componentDef: ComponentDefinition;
  rawPos: Point;
  stationaryComponents: SchematicComponent[];
  wires: Wire[];
  snapThreshold?: number;
}): {
  snappedPos: Point;
  guides: AlignmentGuide[];
  isLockedToPin: boolean;
  isLockedToPort: boolean;
  isLockedToCenter: boolean;
} {
  const { componentDef, rawPos, stationaryComponents, wires, snapThreshold = 14 } = params;

  // Create temporary component at rawPos
  const tempComp: SchematicComponent = {
    id: 'temp_placement',
    type: componentDef.type,
    designator: componentDef.prefix,
    value: componentDef.defaultVal,
    footprint: componentDef.defaultFootprint,
    x: 0,
    y: 0,
    rotation: 0,
    pins: componentDef.pins.map((p) => ({ id: p.id, name: p.name })),
  };

  const initialPositions = new Map<string, Point>([['temp_placement', { x: 0, y: 0 }]]);

  const snapResult = calculateMagneticSnap({
    draggedComponents: [tempComp],
    dragInitialPositions: initialPositions,
    stationaryComponents,
    wires,
    rawDx: rawPos.x,
    rawDy: rawPos.y,
    snapThreshold,
  });

  return {
    snappedPos: { x: snapResult.dx, y: snapResult.dy },
    guides: snapResult.guides,
    isLockedToPin: snapResult.isLockedToPin,
    isLockedToPort: snapResult.isLockedToPort,
    isLockedToCenter: snapResult.isLockedToCenter,
  };
}
