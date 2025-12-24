import { create } from 'zustand';
import { Person, RelationContext } from '../types';

interface FamilyState {
  people: Person[];
  focusId: string;
  isModalOpen: boolean;
  modalContext: RelationContext;
  editingPerson: Person | null;

  exportRelationships: () => {
    version: 2;
    focusId: string;
    people: Record<string, { name: string; surnames: string; gender: 'Male' | 'Female'; photo?: string }>;
    relationships: Record<string, { parents: string[]; partners: string[]; children: string[] }>;
  };
  importRelationships: (payload: {
    version: 1 | 2;
    focusId?: string;
    people?: Record<string, { name?: string; surnames?: string; gender?: 'Male' | 'Female'; photo?: string }>;
    relationships: Record<string, { parents?: string[]; partners?: string[]; children?: string[] }>;
  }) => void;
  
  setFocusId: (id: string) => void;
  openAddModal: (context: RelationContext) => void;
  openEditModal: (person: Person) => void;
  closeAddModal: () => void;
  
  addPerson: (person: Person) => void;
  addRelative: (newPerson: Person, context: RelationContext) => void;
  updatePerson: (person: Person) => void;
  deletePerson: (id: string) => void;
  
  getPerson: (id: string) => Person | undefined;
}

export const useFamilyStore = create<FamilyState>((set, get) => ({
  people: [],
  focusId: '',
  isModalOpen: false,
  modalContext: 'None',
  editingPerson: null,

  exportRelationships: () => {
    const people = get().people;
    const relationships: Record<string, { parents: string[]; partners: string[]; children: string[]; siblings: string[] }> = {};
    const peopleData: Record<string, { name: string; surnames: string; gender: 'Male' | 'Female'; photo?: string }> = {};
    people.forEach(p => {
      peopleData[p.id] = {
        name: p.name,
        surnames: p.surnames,
        gender: p.gender,
        photo: p.photo,
      };
      relationships[p.id] = {
        parents: [...p.parents],
        partners: [...p.partners],
        children: [...p.children],
        siblings: [...(p.siblings || [])],
      };
    });
    return { version: 2 as const, focusId: get().focusId, people: peopleData, relationships };
  },

  importRelationships: (payload) => set((state) => {
    if (!payload || (payload.version !== 1 && payload.version !== 2) || !payload.relationships) return state;

    const safeArray = (v: unknown): string[] => {
      if (!Array.isArray(v)) return [];
      return v.filter(x => typeof x === 'string' && x.trim().length > 0).map(x => x.trim());
    };

    const uniq = (arr: string[]) => Array.from(new Set(arr));
    const firstSurname = (s: string) => (s || '').trim().split(/\s+/g)[0] || '';

    const inferFatherMother = (a: Person, b: Person) => {
      const father = a.gender === 'Male' ? a : (b.gender === 'Male' ? b : a);
      const mother = a.gender === 'Female' ? a : (b.gender === 'Female' ? b : b);
      return { father, mother };
    };

    const toUpperOrEmpty = (v: unknown) => (typeof v === 'string' ? v.toUpperCase().trim() : '');

    // 0) Si viene people (v2), crear/actualizar datos básicos
    const byId = new Map(state.people.map(p => [p.id, { ...p }] as const));
    if (payload.version === 2 && payload.people) {
      Object.entries(payload.people).forEach(([id, pdata]) => {
        const existing = byId.get(id);
        const name = toUpperOrEmpty(pdata.name) || existing?.name || '';
        const surnames = toUpperOrEmpty(pdata.surnames) || existing?.surnames || '';
        const gender = (pdata.gender === 'Male' || pdata.gender === 'Female')
          ? pdata.gender
          : (existing?.gender || 'Male');
        const photo = typeof pdata.photo === 'string' && pdata.photo.length > 0
          ? pdata.photo
          : existing?.photo;

        if (existing) {
          byId.set(id, { ...existing, name, surnames, gender, photo });
        } else {
          // Crear persona faltante con relaciones vacías; se llenarán en el paso 1)
          byId.set(id, {
            id,
            name: name || id,
            surnames,
            gender,
            photo,
            partners: [],
            parents: [],
            children: [],
            siblings: [],
          });
        }
      });
    }

    // 1) Aplicar relaciones por id (solo para ids presentes en el payload)
    Object.entries(payload.relationships).forEach(([id, rel]) => {
      const p = byId.get(id);
      if (!p) return;
      const parents = uniq(safeArray(rel.parents)).filter(x => x !== id);
      const partners = uniq(safeArray(rel.partners)).filter(x => x !== id);
      const children = uniq(safeArray(rel.children)).filter(x => x !== id);
      const siblings = uniq(safeArray((rel as any).siblings)).filter(x => x !== id);
      p.parents = parents;
      p.partners = partners;
      p.children = children;
      p.siblings = siblings;
      byId.set(id, p);
    });

    // 2) Normalizar reciprocidad (partners, parents/children, siblings)
    const ensure = (id: string) => byId.get(id);

    const addUnique = (arr: string[], id: string) => {
      if (!arr.includes(id)) arr.push(id);
    };

    byId.forEach((p) => {
      // Partners recíprocos
      p.partners.forEach(pid => {
        const other = ensure(pid);
        if (!other) return;
        addUnique(other.partners, p.id);
      });
      
      // Siblings recíprocos
      (p.siblings || []).forEach(sibId => {
        const other = ensure(sibId);
        if (!other) return;
        if (!other.siblings) other.siblings = [];
        addUnique(other.siblings, p.id);
      });

      // Parents/children recíprocos
      p.children.forEach(cid => {
        const child = ensure(cid);
        if (!child) return;
        addUnique(child.parents, p.id);
      });
      p.parents.forEach(pid => {
        const parent = ensure(pid);
        if (!parent) return;
        addUnique(parent.children, p.id);
      });
    });

    // 2.5) Si están en pareja, los hijos se consideran de los dos (núcleo familiar)
    // y el hijo debe tener ambos padres. (Evita que parezca "solo hijo de uno".)
    byId.forEach((p) => {
      p.partners.forEach(partnerId => {
        const partner = ensure(partnerId);
        if (!partner) return;

        const sharedChildren = uniq([...(p.children || []), ...(partner.children || [])]);
        p.children = sharedChildren;
        partner.children = sharedChildren;

        sharedChildren.forEach(childId => {
          const child = ensure(childId);
          if (!child) return;

          const hasP = child.parents.includes(p.id);
          const hasPartner = child.parents.includes(partner.id);

          // Si el hijo ya tiene uno de los dos como padre/madre, completar el otro.
          if (hasP && !hasPartner && child.parents.length < 2) addUnique(child.parents, partner.id);
          if (hasPartner && !hasP && child.parents.length < 2) addUnique(child.parents, p.id);

          // Autocompletar apellidos del hijo si están vacíos o solo tiene 1 palabra.
          const parts = (child.surnames || '').trim().split(/\s+/g).filter(Boolean);
          if (parts.length <= 1) {
            const { father, mother } = inferFatherMother(p, partner);
            const sf = firstSurname(father.surnames);
            const sm = firstSurname(mother.surnames);
            const combined = [sf, sm].filter(Boolean).join(' ');
            if (combined) child.surnames = combined;
          }
        });
      });
    });

    // 3) Dedupe final
    const newPeople = Array.from(byId.values()).map(p => ({
      ...p,
      parents: uniq(p.parents).filter(x => x !== p.id),
      partners: uniq(p.partners).filter(x => x !== p.id),
      children: uniq(p.children).filter(x => x !== p.id),
      siblings: uniq(p.siblings || []).filter(x => x !== p.id),
    }));

    const newFocusId = payload.focusId && newPeople.some(p => p.id === payload.focusId)
      ? payload.focusId
      : state.focusId;

    return { ...state, people: newPeople, focusId: newFocusId };
  }),

  setFocusId: (id) => set({ focusId: id }),
  
  openAddModal: (context) => set({ isModalOpen: true, modalContext: context, editingPerson: null }),
  openEditModal: (person) => set({ isModalOpen: true, modalContext: 'None', editingPerson: person }),
  closeAddModal: () => set({ isModalOpen: false, modalContext: 'None', editingPerson: null }),

  getPerson: (id) => get().people.find(p => p.id === id),

  addPerson: (person) => set((state) => ({ people: [...state.people, person] })),

  updatePerson: (updatedPerson) => set((state) => ({
    people: state.people.map(p => p.id === updatedPerson.id ? updatedPerson : p)
  })),

  deletePerson: (id) => set((state) => {
    // Eliminar persona y limpiar referencias
    const newPeople = state.people
      .filter(p => p.id !== id)
      .map(p => ({
        ...p,
        partners: p.partners.filter(pid => pid !== id),
        parents: p.parents.filter(pid => pid !== id),
        children: p.children.filter(pid => pid !== id),
        siblings: (p.siblings || []).filter(pid => pid !== id),
      }));
    
    // Si eliminamos la persona en foco, cambiar a otra
    const newFocusId = state.focusId === id 
      ? (newPeople[0]?.id || '') 
      : state.focusId;
    
    return { people: newPeople, focusId: newFocusId };
  }),

  // Smart add function that links IDs
  addRelative: (newPerson, context) => set((state) => {
    const focusId = state.focusId;
    const focusPerson = state.people.find(p => p.id === focusId);
    if (!focusPerson) return state;

    const updatedPeople = [...state.people, newPerson];
    
    // Update the existing person to include the relationship
    const updatedFocusPerson = { ...focusPerson };

    if (context === 'Parent') {
      updatedFocusPerson.parents = [...updatedFocusPerson.parents, newPerson.id];
      newPerson.children = [focusId];
    } 
    else if (context === 'Child') {
      updatedFocusPerson.children = [...updatedFocusPerson.children, newPerson.id];
      newPerson.parents = [focusId];
      // Añadir pareja como padre si existe
      if (updatedFocusPerson.partners.length > 0) {
        newPerson.parents.push(updatedFocusPerson.partners[0]);
        // También actualizar la pareja
        const partner = updatedPeople.find(p => p.id === updatedFocusPerson.partners[0]);
        if (partner) {
          partner.children = [...partner.children, newPerson.id];
        }
      }
    } 
    else if (context === 'Partner') {
      updatedFocusPerson.partners = [...updatedFocusPerson.partners, newPerson.id];
      newPerson.partners = [focusId];

      // Si ya hay hijos en uno de los dos, considerarlos hijos de ambos
      const sharedChildren = Array.from(new Set([...(updatedFocusPerson.children || []), ...(newPerson.children || [])]));
      updatedFocusPerson.children = sharedChildren;
      newPerson.children = sharedChildren;

      const firstSurname = (s: string) => (s || '').trim().split(/\s+/g)[0] || '';
      const inferFatherMother = (a: Person, b: Person) => {
        const father = a.gender === 'Male' ? a : (b.gender === 'Male' ? b : a);
        const mother = a.gender === 'Female' ? a : (b.gender === 'Female' ? b : b);
        return { father, mother };
      };

      sharedChildren.forEach(cid => {
        const child = updatedPeople.find(p => p.id === cid);
        if (!child) return;

        if (child.parents.includes(updatedFocusPerson.id) && !child.parents.includes(newPerson.id) && child.parents.length < 2) {
          child.parents.push(newPerson.id);
        }
        if (child.parents.includes(newPerson.id) && !child.parents.includes(updatedFocusPerson.id) && child.parents.length < 2) {
          child.parents.push(updatedFocusPerson.id);
        }

        const parts = (child.surnames || '').trim().split(/\s+/g).filter(Boolean);
        if (parts.length <= 1) {
          const { father, mother } = inferFatherMother(updatedFocusPerson, newPerson);
          const combined = [firstSurname(father.surnames), firstSurname(mother.surnames)].filter(Boolean).join(' ');
          if (combined) child.surnames = combined;
        }
      });
    }
    else if (context === 'Sibling') {
      // Siblings share parents (if any)
      newPerson.parents = [...updatedFocusPerson.parents];
      // Direct sibling relationship (works even without parents)
      updatedFocusPerson.siblings = [...(updatedFocusPerson.siblings || []), newPerson.id];
      newPerson.siblings = [focusId];
      // Update parents to include this new child
      updatedPeople.forEach(p => {
        if (updatedFocusPerson.parents.includes(p.id)) {
           p.children = [...p.children, newPerson.id];
        }
      });
      // Also link to other siblings of focusPerson
      (updatedFocusPerson.siblings || []).forEach(sibId => {
        if (sibId !== newPerson.id) {
          const existingSib = updatedPeople.find(p => p.id === sibId);
          if (existingSib) {
            existingSib.siblings = [...(existingSib.siblings || []), newPerson.id];
            newPerson.siblings.push(sibId);
          }
        }
      });
    }

    // Replace the focus person in the array with the updated version
    const finalPeople = updatedPeople.map(p => p.id === focusId ? updatedFocusPerson : p);

    return { people: finalPeople };
  }),
}));