import { Point, SchematicComponent, Wire } from '../types';
import { getComponentDef } from '../data/components';

export const GRID_SIZE = 10;
export const MAJOR_GRID_SIZE = 50;

// Snap a coordinate to the grid
export function snapToGrid(val: number, step = GRID_SIZE): number {
  return Math.round(val / step) * step;
}

export function snapPoint(p: Point, step = GRID_SIZE): Point {
  return {
    x: snapToGrid(p.x, step),
    y: snapToGrid(p.y, step),
  };
}

// Compute world coordinate of a component pin taking rotation into account
export function getPinWorldPosition(
  comp: SchematicComponent,
  pinId: string
): Point {
  const def = getComponentDef(comp.type);
  const pinDef = def.pins.find((p) => p.id === pinId);
  if (!pinDef) {
    return { x: comp.x, y: comp.y };
  }

  let rx = pinDef.x;
  let ry = pinDef.y;

  // Apply rotation around component center (0,0)
  const rot = comp.rotation || 0;
  if (rot === 90) {
    const temp = rx;
    rx = -ry;
    ry = temp;
  } else if (rot === 180) {
    rx = -rx;
    ry = -ry;
  } else if (rot === 270) {
    const temp = rx;
    rx = ry;
    ry = -temp;
  }

  return {
    x: snapToGrid(comp.x + rx),
    y: snapToGrid(comp.y + ry),
  };
}

// Generate orthogonal Manhattan wire path between two points
export function generateOrthogonalPath(
  p1: Point,
  p2: Point,
  preferVerticalFirst = false
): Point[] {
  const start = snapPoint(p1);
  const end = snapPoint(p2);

  // If aligned on axis
  if (start.x === end.x || start.y === end.y) {
    return [start, end];
  }

  if (preferVerticalFirst) {
    const mid = { x: start.x, y: end.y };
    return [start, mid, end];
  } else {
    const mid = { x: end.x, y: start.y };
    return [start, mid, end];
  }
}

// Convert wire points into SVG path string 'M x y L x y ...'
export function pointsToSvgPath(points: Point[]): string {
  if (!points || points.length === 0) return '';
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');
}

// Check if a point is close to a line segment
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * (b.x - a.x)), p.y - (a.y + t * (b.y - a.y)));
}

// Find all junction points (where 3+ wire points meet or where a pin connects to a pass-through wire)
export function calculateJunctions(wires: Wire[], components: SchematicComponent[]): Point[] {
  const countMap = new Map<string, { point: Point; count: number }>();

  // Count wire endpoints & vertices
  for (const wire of wires) {
    for (const pt of wire.points) {
      const key = `${Math.round(pt.x)},${Math.round(pt.y)}`;
      const existing = countMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        countMap.set(key, { point: pt, count: 1 });
      }
    }
  }

  // Also check if any component pin lies on a wire segment
  for (const comp of components) {
    const def = getComponentDef(comp.type);
    for (const p of def.pins) {
      const pinPos = getPinWorldPosition(comp, p.id);
      const key = `${Math.round(pinPos.x)},${Math.round(pinPos.y)}`;
      const existing = countMap.get(key);
      if (existing) {
        existing.count += 1;
      }
    }
  }

  const junctions: Point[] = [];
  for (const item of countMap.values()) {
    if (item.count >= 3) {
      junctions.push(item.point);
    }
  }

  return junctions;
}

// Find closest component pin within snap radius
export function findClosestPin(
  pos: Point,
  components: SchematicComponent[],
  snapRadius = 15
): { component: SchematicComponent; pinId: string; pos: Point } | null {
  let closest: { component: SchematicComponent; pinId: string; pos: Point } | null = null;
  let minDist = snapRadius;

  for (const comp of components) {
    const def = getComponentDef(comp.type);
    for (const pinDef of def.pins) {
      const pinPos = getPinWorldPosition(comp, pinDef.id);
      const dist = Math.hypot(pos.x - pinPos.x, pos.y - pinPos.y);
      if (dist < minDist) {
        minDist = dist;
        closest = { component: comp, pinId: pinDef.id, pos: pinPos };
      }
    }
  }

  return closest;
}
