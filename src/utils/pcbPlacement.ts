import { SchematicComponent } from '../types';

export interface PcbPlacement {
  id: string;
  x: number;
  y: number;
  rotation: number;
}

/**
 * Calculates PCB board coordinates for components based on their positions in the
 * schematic diagram, or retrieves their stored pcbX/pcbY coordinates if already arranged.
 */
export function computePcbCoordinatesFromSchematic(
  components: SchematicComponent[],
  boardWidth: number = 620,
  boardHeight: number = 420
): Map<string, PcbPlacement> {
  const result = new Map<string, PcbPlacement>();
  if (components.length === 0) return result;

  const marginX = 65;
  const marginY = 60;
  const usableW = Math.max(100, boardWidth - marginX * 2);
  const usableH = Math.max(100, boardHeight - marginY * 2);

  // Compute bounding box of schematic diagram components
  let minSchemX = Infinity;
  let maxSchemX = -Infinity;
  let minSchemY = Infinity;
  let maxSchemY = -Infinity;

  for (const c of components) {
    if (c.x < minSchemX) minSchemX = c.x;
    if (c.x > maxSchemX) maxSchemX = c.x;
    if (c.y < minSchemY) minSchemY = c.y;
    if (c.y > maxSchemY) maxSchemY = c.y;
  }

  const rangeX = maxSchemX - minSchemX;
  const rangeY = maxSchemY - minSchemY;

  components.forEach((c, idx) => {
    // If the component already has a customized PCB position, use it
    if (typeof c.pcbX === 'number' && typeof c.pcbY === 'number') {
      result.set(c.id, {
        id: c.id,
        x: Math.max(35, Math.min(boardWidth - 35, c.pcbX)),
        y: Math.max(35, Math.min(boardHeight - 35, c.pcbY)),
        rotation: c.pcbRotation ?? 0,
      });
      return;
    }

    // Otherwise, plot proportionally according to the schematic editor diagram!
    let targetX: number;
    let targetY: number;

    if (rangeX > 30) {
      const normX = (c.x - minSchemX) / rangeX;
      targetX = marginX + normX * usableW;
    } else {
      targetX = marginX + (idx % 4) * (usableW / 3);
    }

    if (rangeY > 30) {
      const normY = (c.y - minSchemY) / rangeY;
      targetY = marginY + normY * usableH;
    } else {
      targetY = marginY + Math.floor(idx / 4) * (usableH / Math.max(1, Math.ceil(components.length / 4)));
    }

    // Snap to 10px grid and clamp to board
    const snappedX = Math.max(40, Math.min(boardWidth - 40, Math.round(targetX / 10) * 10));
    const snappedY = Math.max(40, Math.min(boardHeight - 40, Math.round(targetY / 10) * 10));

    result.set(c.id, {
      id: c.id,
      x: snappedX,
      y: snappedY,
      rotation: c.pcbRotation ?? 0,
    });
  });

  return result;
}

/**
 * Re-plots all components according to the schematic editor diagram positions,
 * ignoring any prior PCB manual layout.
 */
export function syncAllFromSchematic(
  components: SchematicComponent[],
  boardWidth: number = 620,
  boardHeight: number = 420
): SchematicComponent[] {
  const marginX = 65;
  const marginY = 60;
  const usableW = Math.max(100, boardWidth - marginX * 2);
  const usableH = Math.max(100, boardHeight - marginY * 2);

  let minSchemX = Infinity;
  let maxSchemX = -Infinity;
  let minSchemY = Infinity;
  let maxSchemY = -Infinity;

  for (const c of components) {
    if (c.x < minSchemX) minSchemX = c.x;
    if (c.x > maxSchemX) maxSchemX = c.x;
    if (c.y < minSchemY) minSchemY = c.y;
    if (c.y > maxSchemY) maxSchemY = c.y;
  }

  const rangeX = maxSchemX - minSchemX;
  const rangeY = maxSchemY - minSchemY;

  return components.map((c, idx) => {
    let targetX: number;
    let targetY: number;

    if (rangeX > 30) {
      const normX = (c.x - minSchemX) / rangeX;
      targetX = marginX + normX * usableW;
    } else {
      targetX = marginX + (idx % 4) * (usableW / 3);
    }

    if (rangeY > 30) {
      const normY = (c.y - minSchemY) / rangeY;
      targetY = marginY + normY * usableH;
    } else {
      targetY = marginY + Math.floor(idx / 4) * (usableH / Math.max(1, Math.ceil(components.length / 4)));
    }

    return {
      ...c,
      pcbX: Math.max(40, Math.min(boardWidth - 40, Math.round(targetX / 10) * 10)),
      pcbY: Math.max(40, Math.min(boardHeight - 40, Math.round(targetY / 10) * 10)),
      pcbRotation: c.pcbRotation ?? 0,
    };
  });
}

/**
 * Optimizes PCB layout space with non-overlapping clearance grid (Best-Fit Arrangement).
 */
export function autoArrangeBestFit(
  components: SchematicComponent[],
  boardWidth: number = 620,
  boardHeight: number = 420
): SchematicComponent[] {
  const marginX = 70;
  const marginY = 65;
  const availW = boardWidth - marginX * 2;
  const availH = boardHeight - marginY * 2;

  // Prioritize big components (Sensors, ICs, Microcontrollers) first
  const sorted = [...components].sort((a, b) => {
    const isASensorOrIC = a.category === 'sensors' || a.category === 'modules' || a.category === 'ics' || a.type.startsWith('sensor_');
    const isBSensorOrIC = b.category === 'sensors' || b.category === 'modules' || b.category === 'ics' || b.type.startsWith('sensor_');
    if (isASensorOrIC && !isBSensorOrIC) return -1;
    if (!isASensorOrIC && isBSensorOrIC) return 1;
    return 0;
  });

  const count = sorted.length;
  const cols = Math.max(3, Math.ceil(Math.sqrt(count * 1.4)));
  const rows = Math.ceil(count / cols);
  const stepX = availW / Math.max(1, cols - 1);
  const stepY = availH / Math.max(1, rows - 1);

  const placementMap = new Map<string, { x: number; y: number }>();

  sorted.forEach((c, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = Math.round((marginX + col * stepX) / 10) * 10;
    const y = Math.round((marginY + row * stepY) / 10) * 10;
    placementMap.set(c.id, {
      x: Math.max(40, Math.min(boardWidth - 40, x)),
      y: Math.max(40, Math.min(boardHeight - 40, y)),
    });
  });

  return components.map((c) => {
    const pos = placementMap.get(c.id);
    return {
      ...c,
      pcbX: pos?.x ?? c.pcbX ?? 100,
      pcbY: pos?.y ?? c.pcbY ?? 100,
      pcbRotation: c.pcbRotation ?? 0,
    };
  });
}
