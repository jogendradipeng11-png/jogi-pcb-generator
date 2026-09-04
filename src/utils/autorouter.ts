import { SchematicComponent, Wire, Point } from '../types';
import { getPinWorldPosition, generateOrthogonalPath } from './geometry';

export interface AutoRouteResult {
  newWires: Wire[];
  updatedComponents: SchematicComponent[];
  connectionsCount: number;
}

// Automatically route wires between pins that share identical net names
// but don't yet have an active wire connecting them
export function autoRouteSchematicNets(
  components: SchematicComponent[],
  existingWires: Wire[]
): AutoRouteResult {
  // Collect all pins and their world positions
  interface PinTarget {
    componentId: string;
    pinId: string;
    pinName: string;
    net: string;
    pos: Point;
  }

  const netPinMap = new Map<string, PinTarget[]>();

  for (const comp of components) {
    for (const pin of comp.pins) {
      if (pin.net && pin.net.trim() !== '' && pin.net.toUpperCase() !== 'NC') {
        const pos = getPinWorldPosition(comp, pin.id);
        const list = netPinMap.get(pin.net) || [];
        list.push({
          componentId: comp.id,
          pinId: pin.id,
          pinName: pin.name,
          net: pin.net,
          pos,
        });
        netPinMap.set(pin.net, list);
      }
    }
  }

  // Check existing wire connections so we don't duplicate
  const connectedPairs = new Set<string>();
  for (const w of existingWires) {
    if (w.startPin && w.endPin) {
      const k1 = `${w.startPin.componentId}:${w.startPin.pinId}->${w.endPin.componentId}:${w.endPin.pinId}`;
      const k2 = `${w.endPin.componentId}:${w.endPin.pinId}->${w.startPin.componentId}:${w.startPin.pinId}`;
      connectedPairs.add(k1);
      connectedPairs.add(k2);
    }
  }

  const generatedWires: Wire[] = [];
  let connectionsCount = 0;

  for (const [netName, pinList] of netPinMap.entries()) {
    if (pinList.length < 2) continue;

    // Connect sequentially or via minimum spanning distance
    // Sort pins by X position for logical left-to-right flow
    const sorted = [...pinList].sort((a, b) => a.pos.x - b.pos.x || a.pos.y - b.pos.y);

    for (let i = 0; i < sorted.length - 1; i++) {
      const p1 = sorted[i];
      const p2 = sorted[i + 1];

      // Avoid self-connection on same component
      if (p1.componentId === p2.componentId) continue;

      const key = `${p1.componentId}:${p1.pinId}->${p2.componentId}:${p2.pinId}`;
      if (connectedPairs.has(key)) continue;

      // Generate clean orthogonal path
      const points = generateOrthogonalPath(p1.pos, p2.pos);

      // Distinguish power/ground colors
      let wireColor: string | undefined = undefined;
      const upperNet = netName.toUpperCase();
      if (upperNet.includes('VCC') || upperNet.includes('5V') || upperNet.includes('+12V') || upperNet.includes('3V3')) {
        wireColor = '#ef4444'; // Red for VCC
      } else if (upperNet.includes('GND') || upperNet === '0V') {
        wireColor = '#3b82f6'; // Blue for Ground
      }

      const newWire: Wire = {
        id: `wire_autoroute_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        points,
        net: netName,
        startPin: {
          componentId: p1.componentId,
          pinId: p1.pinId,
        },
        endPin: {
          componentId: p2.componentId,
          pinId: p2.pinId,
        },
        color: wireColor,
      };

      generatedWires.push(newWire);
      connectedPairs.add(key);
      connectionsCount++;
    }
  }

  return {
    newWires: [...existingWires, ...generatedWires],
    updatedComponents: components,
    connectionsCount,
  };
}

// PCB Copper Trace Autorouter (2-Layer Orthogonal & Mitered Routes)
export interface PcbRouteTrace {
  id: string;
  net: string;
  layer: 'top' | 'bottom';
  points: Point[];
  via?: Point;
}

export function autoRoutePcbTraces(
  padsList: { x: number; y: number; net: string; padId: string }[]
): PcbRouteTrace[] {
  const traces: PcbRouteTrace[] = [];
  const netGroups = new Map<string, { x: number; y: number }[]>();

  for (const p of padsList) {
    if (!p.net || p.net === 'NC') continue;
    const list = netGroups.get(p.net) || [];
    list.push({ x: p.x, y: p.y });
    netGroups.set(p.net, list);
  }

  let traceIdx = 0;
  for (const [netName, pads] of netGroups.entries()) {
    if (pads.length < 2) continue;

    for (let i = 0; i < pads.length - 1; i++) {
      const p1 = pads[i];
      const p2 = pads[i + 1];

      // Alternate top layer (red) and bottom layer (blue) to avoid single-layer choke
      const isTop = (traceIdx % 2 === 0);
      traceIdx++;

      // Create 45-degree or orthogonal routed copper path
      const midX = (p1.x + p2.x) / 2;
      const pts: Point[] = [
        p1,
        { x: midX, y: p1.y },
        { x: midX, y: p2.y },
        p2,
      ];

      traces.push({
        id: `trace_${Date.now()}_${traceIdx}`,
        net: netName,
        layer: isTop ? 'top' : 'bottom',
        points: pts,
        via: Math.abs(p1.x - p2.x) > 100 && Math.abs(p1.y - p2.y) > 100 ? { x: midX, y: (p1.y + p2.y) / 2 } : undefined,
      });
    }
  }

  return traces;
}
