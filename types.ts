export type Gender = 'Male' | 'Female';

export interface Person {
  id: string;
  name: string;
  surnames: string;
  gender: Gender;
  photo?: string; // URL o base64 de la foto
  partners: string[];
  parents: string[];
  children: string[];
  siblings: string[]; // Hermanos directos (para casos sin padres)
}

export interface RenderNode extends Person {
  generation: number; // 0 for current focus, -1 parents, +1 children
  relationType: string; // 'Focus', 'Parent', 'Sibling', 'Cousin', etc.
  x?: number; // Calculated for SVG lines
  y?: number;
}

export interface AutocompleteData {
  maleNames: string[];
  femaleNames: string[];
  surnames: string[];
}

// New type for adding relatives
export type RelationContext = 'Parent' | 'Child' | 'Partner' | 'Sibling' | 'None';

// Action types for the menu
export type ActionType = 'Parent' | 'Child' | 'Partner' | 'Sibling' | 'Edit' | 'Delete';