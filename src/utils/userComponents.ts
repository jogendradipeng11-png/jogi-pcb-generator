import { ComponentDefinition, SchematicComponent, Wire } from '../types';
import { registerCustomComponentDef } from '../data/components';

const STORAGE_KEY_SAVED_COMPONENTS = 'circuitforge_user_saved_components';
const STORAGE_KEY_SAVED_CIRCUITS = 'circuitforge_user_saved_circuits';

export interface SavedCircuitItem {
  id: string;
  title: string;
  category: string;
  description: string;
  createdAt: string;
  components: SchematicComponent[];
  wires?: Wire[];
}

// 1. Save a Component to User App Library
export function saveUserComponent(def: ComponentDefinition): void {
  try {
    const list = getUserSavedComponents();
    const existingIdx = list.findIndex((c) => c.type === def.type);
    if (existingIdx >= 0) {
      list[existingIdx] = def;
    } else {
      list.push(def);
    }
    localStorage.setItem(STORAGE_KEY_SAVED_COMPONENTS, JSON.stringify(list));
    // Also register in memory catalog
    registerCustomComponentDef(def);
  } catch (e) {
    console.warn('Failed to save user component', e);
  }
}

// 2. Retrieve all saved components
export function getUserSavedComponents(): ComponentDefinition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SAVED_COMPONENTS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// 3. Delete a saved component
export function deleteUserComponent(type: string): void {
  try {
    const list = getUserSavedComponents().filter((c) => c.type !== type);
    localStorage.setItem(STORAGE_KEY_SAVED_COMPONENTS, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to remove component', e);
  }
}

// 4. Initialize & load all saved components into memory
export function loadUserSavedComponents(): void {
  const list = getUserSavedComponents();
  list.forEach((def) => {
    registerCustomComponentDef(def);
  });
}

// 5. Save a Circuit to User App Library
export function saveUserCircuit(item: {
  title?: string;
  category?: string;
  description?: string;
  components?: SchematicComponent[];
  wires?: Wire[];
}): SavedCircuitItem {
  const comps = Array.isArray(item?.components) ? item.components : [];
  const id = `user_circ_${Date.now().toString(36)}`;
  const newCirc: SavedCircuitItem = {
    id,
    title: item?.title || 'Custom Circuit',
    category: item?.category || 'Custom Circuit',
    description: item?.description || `Custom circuit with ${comps.length} components.`,
    createdAt: new Date().toISOString(),
    components: comps,
    wires: Array.isArray(item?.wires) ? item.wires : [],
  };

  try {
    const list = getUserSavedCircuits();
    list.unshift(newCirc);
    localStorage.setItem(STORAGE_KEY_SAVED_CIRCUITS, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to save user circuit', e);
  }

  return newCirc;
}

export function getUserSavedCircuits(): SavedCircuitItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SAVED_CIRCUITS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is SavedCircuitItem => Boolean(item && typeof item === 'object'))
      .map((item) => ({
        id: String(item.id || `circ_${Math.random()}`),
        title: String(item.title || 'Untitled Circuit'),
        category: String(item.category || 'Custom Circuit'),
        description: String(item.description || ''),
        createdAt: String(item.createdAt || new Date().toISOString()),
        components: Array.isArray(item.components) ? item.components : [],
        wires: Array.isArray(item.wires) ? item.wires : [],
      }));
  } catch {
    return [];
  }
}
