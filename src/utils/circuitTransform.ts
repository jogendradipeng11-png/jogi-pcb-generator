import { SchematicComponent, Wire, Point, CircuitRotationDirection } from '../types';
import { snapToGrid, getPinWorldPosition } from './geometry';

export interface CircuitTransformResult {
  components: SchematicComponent[];
  wires: Wire[];
  appliedDirection: CircuitRotationDirection;
  count: number;
}

/**
 * Rotates a point (x, y) around a center point (cx, cy) by a given direction.
 */
export function rotatePoint(
  x: number,
  y: number,
  cx: number,
  cy: number,
  direction: CircuitRotationDirection
): Point {
  const dx = x - cx;
  const dy = y - cy;

  switch (direction) {
    case 'cw90': // 90° Clockwise
      return {
        x: snapToGrid(cx - dy),
        y: snapToGrid(cy + dx),
      };
    case 'ccw90': // 90° Counter-Clockwise
      return {
        x: snapToGrid(cx + dy),
        y: snapToGrid(cy - dx),
      };
    case '180': // 180° Inversion
      return {
        x: snapToGrid(cx - dx),
        y: snapToGrid(cy - dy),
      };
    case 'flipH': // Mirror horizontally (along vertical axis through cx)
      return {
        x: snapToGrid(cx - dx),
        y: snapToGrid(cy + dy),
      };
    case 'flipV': // Mirror vertically (along horizontal axis through cy)
      return {
        x: snapToGrid(cx + dx),
        y: snapToGrid(cy - dy),
      };
    default:
      return { x, y };
  }
}

/**
 * Computes next component rotation value (0 | 90 | 180 | 270)
 */
export function transformComponentRotation(
  currentRot: 0 | 90 | 180 | 270,
  direction: CircuitRotationDirection,
  currentFlipped: boolean = false
): { rotation: 0 | 90 | 180 | 270; flipped: boolean } {
  switch (direction) {
    case 'cw90':
      return {
        rotation: (((currentRot + 90) % 360) as 0 | 90 | 180 | 270),
        flipped: currentFlipped,
      };
    case 'ccw90':
      return {
        rotation: (((currentRot + 270) % 360) as 0 | 90 | 180 | 270),
        flipped: currentFlipped,
      };
    case '180':
      return {
        rotation: (((currentRot + 180) % 360) as 0 | 90 | 180 | 270),
        flipped: currentFlipped,
      };
    case 'flipH': {
      // Horizontal flip: mirror X coordinates
      let nextRot = currentRot;
      if (currentRot === 90) nextRot = 270;
      else if (currentRot === 270) nextRot = 90;
      return {
        rotation: nextRot,
        flipped: !currentFlipped,
      };
    }
    case 'flipV': {
      // Vertical flip: mirror Y coordinates
      let nextRot = currentRot;
      if (currentRot === 0) nextRot = 180;
      else if (currentRot === 180) nextRot = 0;
      return {
        rotation: nextRot,
        flipped: !currentFlipped,
      };
    }
  }
}

/**
 * Transforms an entire circuit (or a selected subset) in all orthogonal directions (90° CW, 90° CCW, 180°, Flip H, Flip V).
 * Re-aligns all component coordinates, PCB coordinates, and wire segments so connections stay intact.
 */
export function rotateCircuit(
  components: SchematicComponent[],
  wires: Wire[],
  direction: CircuitRotationDirection,
  selectedCompIds?: string[],
  selectedWireIds?: string[]
): CircuitTransformResult {
  const isSubset = Boolean(selectedCompIds && selectedCompIds.length > 0);
  const targetCompIds = new Set(
    isSubset ? selectedCompIds! : components.map((c) => c.id)
  );

  // If no components exist, nothing to transform
  if (components.length === 0 && wires.length === 0) {
    return { components, wires, appliedDirection: direction, count: 0 };
  }

  // 1. Calculate Center of Geometry (Centroid)
  const targetComponents = components.filter((c) => targetCompIds.has(c.id));
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  if (targetComponents.length > 0) {
    for (const c of targetComponents) {
      minX = Math.min(minX, c.x);
      maxX = Math.max(maxX, c.x);
      minY = Math.min(minY, c.y);
      maxY = Math.max(maxY, c.y);
    }
  } else {
    // If only wires are selected or present
    for (const w of wires) {
      for (const p of w.points) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      }
    }
  }

  // Midpoint snapped to grid
  const cx = snapToGrid((minX + maxX) / 2);
  const cy = snapToGrid((minY + maxY) / 2);

  // 2. Transform Components
  const updatedComponents = components.map((c) => {
    if (!targetCompIds.has(c.id)) return c;

    const newCoord = rotatePoint(c.x, c.y, cx, cy, direction);
    const { rotation: newRot, flipped: newFlipped } = transformComponentRotation(
      c.rotation || 0,
      direction,
      Boolean(c.flipped)
    );

    // Also transform PCB coordinates if set
    let newPcbX = c.pcbX;
    let newPcbY = c.pcbY;
    let newPcbRot = c.pcbRotation ?? newRot;
    if (c.pcbX !== undefined && c.pcbY !== undefined) {
      const pcbCoord = rotatePoint(c.pcbX, c.pcbY, cx, cy, direction);
      newPcbX = pcbCoord.x;
      newPcbY = pcbCoord.y;
      newPcbRot = (((c.pcbRotation ?? 0) + (direction === 'cw90' ? 90 : direction === 'ccw90' ? 270 : direction === '180' ? 180 : 0)) % 360);
    }

    return {
      ...c,
      x: newCoord.x,
      y: newCoord.y,
      rotation: newRot,
      flipped: newFlipped,
      pcbX: newPcbX,
      pcbY: newPcbY,
      pcbRotation: newPcbRot,
    };
  });

  // Fast map to query newly transformed components by ID
  const compMap = new Map<string, SchematicComponent>();
  for (const c of updatedComponents) {
    compMap.set(c.id, c);
  }

  // 3. Transform Wires
  const updatedWires = wires.map((w) => {
    const startAttachedToTarget = w.startPin && targetCompIds.has(w.startPin.componentId);
    const endAttachedToTarget = w.endPin && targetCompIds.has(w.endPin.componentId);

    // In whole circuit mode, transform all wires.
    // In subset mode, transform wires if either connected to target or in selectedWireIds
    const shouldTransform =
      !isSubset ||
      (selectedWireIds && selectedWireIds.includes(w.id)) ||
      (startAttachedToTarget && endAttachedToTarget);

    if (!shouldTransform) return w;

    // Transform internal pathway vertices
    const newPoints = w.points.map((p) => rotatePoint(p.x, p.y, cx, cy, direction));

    // Ensure start point snaps to actual newly rotated pin if attached
    if (w.startPin && compMap.has(w.startPin.componentId)) {
      const targetComp = compMap.get(w.startPin.componentId)!;
      const actualPinPos = getPinWorldPosition(targetComp, w.startPin.pinId);
      if (newPoints.length > 0) {
        newPoints[0] = actualPinPos;
      }
    }

    // Ensure end point snaps to actual newly rotated pin if attached
    if (w.endPin && compMap.has(w.endPin.componentId)) {
      const targetComp = compMap.get(w.endPin.componentId)!;
      const actualPinPos = getPinWorldPosition(targetComp, w.endPin.pinId);
      if (newPoints.length > 0) {
        newPoints[newPoints.length - 1] = actualPinPos;
      }
    }

    return {
      ...w,
      points: newPoints,
    };
  });

  return {
    components: updatedComponents,
    wires: updatedWires,
    appliedDirection: direction,
    count: targetComponents.length,
  };
}
