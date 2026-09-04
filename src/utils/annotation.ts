import { SchematicComponent, Wire } from '../types';

export interface AnnotationReport {
  duplicateCount: number;
  unassignedCount: number;
  duplicates: { designator: string; count: number }[];
  missingValues: string[];
  totalComponents: number;
}

// Inspect current component designators and detect duplicate or unassigned designators
export function checkComponentNaming(components: SchematicComponent[]): AnnotationReport {
  const counts: Record<string, number> = {};
  let unassignedCount = 0;
  const missingValues: string[] = [];

  for (const c of components) {
    const des = (c.designator || '').trim();
    if (!des || des.endsWith('?') || des.toLowerCase() === 'r' || des.toLowerCase() === 'c') {
      unassignedCount++;
    } else {
      counts[des] = (counts[des] || 0) + 1;
    }

    if (!c.value || c.value.trim() === '' || c.value.toLowerCase() === 'value') {
      missingValues.push(c.designator || c.id);
    }
  }

  const duplicates: { designator: string; count: number }[] = [];
  let duplicateCount = 0;
  for (const [des, count] of Object.entries(counts)) {
    if (count > 1) {
      duplicates.push({ designator: des, count });
      duplicateCount += count - 1;
    }
  }

  return {
    duplicateCount,
    unassignedCount,
    duplicates,
    missingValues,
    totalComponents: components.length,
  };
}

// Sequentially re-annotate all components by prefix (R1, R2, C1, C2, U1, Q1, D1, SW1...)
// sorted by canvas position (top-to-bottom, left-to-right)
export function reannotateComponents(
  components: SchematicComponent[],
  wires: Wire[]
): { components: SchematicComponent[]; wires: Wire[]; countUpdated: number } {
  // Extract prefix mapping (e.g. 'R' from 'R1', or determine by type)
  const getPrefix = (c: SchematicComponent): string => {
    if (c.type === 'resistor' || c.type === 'pot') return 'R';
    if (c.type === 'capacitor' || c.type === 'polarized_capacitor') return 'C';
    if (c.type === 'inductor') return 'L';
    if (c.type === 'diode' || c.type === 'zener_diode') return 'D';
    if (c.type === 'led') return 'LED';
    if (c.type === 'npn_bjt' || c.type === 'pnp_bjt' || c.type === 'n_mosfet' || c.type === 'p_mosfet') return 'Q';
    if (c.type.startsWith('ic_')) return 'U';
    if (c.type === 'switch' || c.type === 'push_button') return 'SW';
    if (c.type === 'battery' || c.type === 'vcc') return 'BT';
    if (c.type.startsWith('connector_')) return 'J';
    if (c.type === 'crystal') return 'Y';
    if (c.type === 'buzzer') return 'BZ';

    const match = (c.designator || '').match(/^([A-Za-z]+)/);
    return match ? match[1].toUpperCase() : 'U';
  };

  // Group components by prefix
  const groups: Record<string, SchematicComponent[]> = {};
  for (const c of components) {
    const pfx = getPrefix(c);
    if (!groups[pfx]) groups[pfx] = [];
    groups[pfx].push(c);
  }

  let countUpdated = 0;
  const newComponents: SchematicComponent[] = [];

  // Sort each prefix group top-to-bottom, left-to-right (standard EDA standard)
  for (const [pfx, compList] of Object.entries(groups)) {
    const sorted = [...compList].sort((a, b) => {
      // Primary: Y coordinate rounded to grid row
      const rowA = Math.floor(a.y / 60);
      const rowB = Math.floor(b.y / 60);
      if (rowA !== rowB) return rowA - rowB;
      return a.x - b.x;
    });

    sorted.forEach((c, idx) => {
      const newDesignator = `${pfx}${idx + 1}`;
      if (c.designator !== newDesignator) {
        countUpdated++;
      }
      newComponents.push({
        ...c,
        designator: newDesignator,
      });
    });
  }

  // Restore original ordering of IDs
  const idMap = new Map<string, SchematicComponent>();
  for (const c of newComponents) {
    idMap.set(c.id, c);
  }

  const finalComponents = components.map((c) => idMap.get(c.id) || c);

  return {
    components: finalComponents,
    wires,
    countUpdated,
  };
}
