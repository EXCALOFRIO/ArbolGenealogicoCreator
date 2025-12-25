import { useMemo } from 'react';
import { Person, RenderNode } from '../types';
import { useFamilyStore } from '../store/familyStore';

export const useFamilyLogic = () => {
  const { people, focusId, viewRootId, getPerson } = useFamilyStore();

  const familyTree = useMemo(() => {
    const rootId = viewRootId || focusId;
    const focusPerson = getPerson(rootId);
    if (!focusPerson) return [];

    const nodes = new Map<string, RenderNode>();
    const visited = new Set<string>();

    const addNode = (p: Person, generation: number, relation: string) => {
      if (visited.has(p.id)) return;
      visited.add(p.id);
      nodes.set(p.id, { ...p, generation, relationType: relation });
    };

    const getAncestorLabel = (depth: number, gender: string) => {
      if (depth === 1) return gender === 'Male' ? 'Padre' : 'Madre';
      if (depth === 2) return gender === 'Male' ? 'Abuelo' : 'Abuela';
      if (depth === 3) return gender === 'Male' ? 'Bisabuelo' : 'Bisabuela';
      if (depth === 4) return gender === 'Male' ? 'Tatarabuelo' : 'Tatarabuela';
      if (depth === 5) return gender === 'Male' ? 'Trastatarabuelo' : 'Trastatarabuela';
      return gender === 'Male' ? `Ancestro (Gen -${depth})` : `Ancestra (Gen -${depth})`;
    };

    const getDescendantLabel = (depth: number, gender: string) => {
      if (depth === 1) return gender === 'Male' ? 'Hijo' : 'Hija';
      if (depth === 2) return gender === 'Male' ? 'Nieto' : 'Nieta';
      if (depth === 3) return gender === 'Male' ? 'Bisnieto' : 'Bisnieta';
      if (depth === 4) return gender === 'Male' ? 'Tataranieto' : 'Tataranieta';
      return gender === 'Male' ? `Descendiente (Gen ${depth})` : `Descendiente (Gen ${depth})`;
    };

    // Helper: obtener hermanos de una persona incluso si no hay padres/abuelos
    const collectSiblingsOf = (person: Person): string[] => {
      const out = new Set<string>();

      // A) Por padres compartidos
      (person.parents || []).forEach(parentId => {
        const parent = getPerson(parentId);
        if (!parent) return;
        (parent.children || []).forEach(childId => {
          if (childId !== person.id) out.add(childId);
        });
      });

      // B) Campo siblings directo
      (person.siblings || []).forEach(sibId => {
        if (sibId !== person.id) out.add(sibId);
      });

      // C) Reverse siblings
      people.forEach(p => {
        if (p.id === person.id) return;
        if ((p.siblings || []).includes(person.id)) out.add(p.id);
      });

      // D) Fallback: comparte al menos un parentId
      if ((person.parents || []).length > 0) {
        people.forEach(p => {
          if (p.id === person.id) return;
          if (p.parents?.some(pid => (person.parents || []).includes(pid))) out.add(p.id);
        });
      }

      return Array.from(out);
    };

    // 1. Nodo Central (YO)
    addNode(focusPerson, 0, 'YO');

    // 2. Mis Parejas (Generación 0)
    focusPerson.partners.forEach(id => {
      const p = getPerson(id);
      if (p) addNode(p, 0, p.gender === 'Male' ? 'Esposo' : 'Esposa');
    });

    const visibleChildrenIds = new Set<string>();
    focusPerson.children.forEach(cid => visibleChildrenIds.add(cid));
    focusPerson.partners.forEach(pid => {
      const partner = getPerson(pid);
      if (!partner) return;
      partner.children.forEach(cid => visibleChildrenIds.add(cid));
    });

    // 3. Padres de mi pareja (Suegros) - Generación -1
    focusPerson.partners.forEach(partnerId => {
      const partner = getPerson(partnerId);
      if (partner) {
        partner.parents.forEach(parentId => {
          const inLaw = getPerson(parentId);
          if (inLaw) addNode(inLaw, -1, inLaw.gender === 'Male' ? 'Suegro' : 'Suegra');
        });
      }
    });

    // 4. Hermanos de mi pareja (Cuñados) - Generación 0
    focusPerson.partners.forEach(partnerId => {
      const partner = getPerson(partnerId);
      if (partner) {
        const addInLawSibling = (siblingId: string) => {
          if (siblingId === partnerId) return;
          const sibling = getPerson(siblingId);
          if (sibling) addNode(sibling, 0, sibling.gender === 'Male' ? 'Cuñado' : 'Cuñada');
        };
        collectSiblingsOf(partner).forEach(addInLawSibling);
      }
    });

    // 5. Padres (Generación -1)
    const parents = focusPerson.parents.map(id => getPerson(id)).filter((p): p is Person => !!p);
    parents.forEach(p => addNode(p, -1, p.gender === 'Male' ? 'Padre' : 'Madre'));

    // 6. Ancestros recursivos (Abuelos, Bisabuelos...)
    const ancestorQueue: Array<{ person: Person; depth: number }> = [];
    parents.forEach(parent => {
      parent.parents.forEach(pid => {
        const p = getPerson(pid);
        if (p) ancestorQueue.push({ person: p, depth: 2 });
      });
    });

    while (ancestorQueue.length > 0) {
      const { person, depth } = ancestorQueue.shift()!;
      addNode(person, -depth, getAncestorLabel(depth, person.gender));

      if (depth < 6) {
        person.parents.forEach(pid => {
          const p = getPerson(pid);
          if (p) ancestorQueue.push({ person: p, depth: depth + 1 });
        });
      }
    }

    // 7. Hermanos (Generación 0)
    collectSiblingsOf(focusPerson).forEach(sibId => {
      const sibling = getPerson(sibId);
      if (sibling) addNode(sibling, 0, sibling.gender === 'Male' ? 'Hermano' : 'Hermana');
    });

    // 8. Parejas de mis hermanos (Cuñados) - Generación 0
    Array.from(nodes.values()).filter(n => n.relationType === 'Hermano' || n.relationType === 'Hermana').forEach(sibling => {
      sibling.partners.forEach(partnerId => {
        const partner = getPerson(partnerId);
        if (partner) addNode(partner, 0, partner.gender === 'Male' ? 'Cuñado' : 'Cuñada');
      });
    });

    // 9. Hijos de mis hermanos (Sobrinos) - Generación 1
    Array.from(nodes.values()).filter(n => n.relationType === 'Hermano' || n.relationType === 'Hermana').forEach(sibling => {
      sibling.children.forEach(nephewId => {
        const nephew = getPerson(nephewId);
        if (nephew) addNode(nephew, 1, nephew.gender === 'Male' ? 'Sobrino' : 'Sobrina');
      });
    });

    // 10. Descendientes (Hijos, Nietos, Bisnietos...)
    const descQueue: Array<{ person: Person; depth: number }> = [];
    Array.from(visibleChildrenIds).forEach(cid => {
      const c = getPerson(cid);
      if (c) descQueue.push({ person: c, depth: 1 });
    });

    while (descQueue.length > 0) {
      const { person, depth } = descQueue.shift()!;
      addNode(person, depth, getDescendantLabel(depth, person.gender));

      // Parejas de descendientes (Yernos, Nueras...)
      person.partners.forEach(pid => {
        const partner = getPerson(pid);
        if (partner) {
          let label = 'Pareja';
          if (depth === 1) label = partner.gender === 'Male' ? 'Yerno' : 'Nuera';
          addNode(partner, depth, label);
        }
      });

      if (depth < 6) {
        person.children.forEach(cid => {
          const c = getPerson(cid);
          if (!c) return; // Ensure person exists before pushing
          descQueue.push({ person: c, depth: depth + 1 });
        });
      }
    }

    // 11. Tíos, Tíos abuelos, etc. (Hermanos de mis ancestros)
    Array.from(nodes.values()).forEach(n => {
      const isAncestor = n.generation < 0 && (
        n.relationType?.includes('Padre') ||
        n.relationType?.includes('Madre') ||
        n.relationType?.includes('Abuelo') ||
        n.relationType?.includes('Abuela')
      );

      if (isAncestor) {
        const parentDepth = Math.abs(n.generation);
        const person = getPerson(n.id);
        if (person) {
          collectSiblingsOf(person).forEach(sibId => {
            const sibling = getPerson(sibId);
            if (!sibling) return;

            let label = 'Tío/a';
            if (parentDepth === 1) label = sibling.gender === 'Male' ? 'Tío' : 'Tía';
            else if (parentDepth === 2) label = sibling.gender === 'Male' ? 'Tío abuelo' : 'Tía abuela';
            else if (parentDepth === 3) label = sibling.gender === 'Male' ? 'Tío bisabuelo' : 'Tía bisabuela';
            else if (parentDepth === 4) label = sibling.gender === 'Male' ? 'Tío tatarabuelo' : 'Tía tatarabuela';

            addNode(sibling, n.generation, label);
          });
        }
      }
    });

    // 12. Primos (Hijos de tíos, tíos abuelos...)
    Array.from(nodes.values()).forEach(n => {
      if (n.generation < 0 && n.relationType?.includes('Tío')) {
        const uncleDepth = Math.abs(n.generation);
        const uncle = getPerson(n.id);
        if (uncle) {
          uncle.children.forEach(childId => {
            const child = getPerson(childId);
            if (!child) return;

            let label = 'Primo/a';
            const cousinGen = n.generation + 1; // Hijos de tíos gen -1 están en gen 0
            if (uncleDepth === 1) label = child.gender === 'Male' ? 'Primo' : 'Prima'; // Primo hermano
            else if (uncleDepth === 2) label = child.gender === 'Male' ? 'Tío segundo' : 'Tía segunda'; // Primo de mi padre = mi tío 2º
            else if (uncleDepth === 3) label = child.gender === 'Male' ? 'Tío tercero' : 'Tía tercera';

            addNode(child, cousinGen, label);
          });
        }
      }
    });

    // 13. Primos Segundos (Hijos de Tíos segundos / Primos de padres)
    Array.from(nodes.values()).forEach(n => {
      if (n.relationType?.includes('Tío segundo') || n.relationType?.includes('Tía segunda')) {
        const person = getPerson(n.id);
        if (person) {
          person.children.forEach(childId => {
            const child = getPerson(childId);
            if (!child) return;
            const label = child.gender === 'Male' ? 'Primo segundo' : 'Prima segunda';
            addNode(child, 0, label);
          });
        }
      }
    });

    // Fallback: Parejas de cualquier "Tío" o "Primo"
    Array.from(nodes.values()).forEach(n => {
      if (n.relationType?.includes('Tío') || n.relationType?.includes('Primo')) {
        const person = getPerson(n.id);
        if (person) {
          person.partners.forEach(pid => {
            const partner = getPerson(pid);
            if (partner) addNode(partner, n.generation, `Cónyuge de ${n.relationType}`);
          });
        }
      }
    });

    // 18. EXPOSICIÓN TOTAL
    people.forEach(p => {
      if (!visited.has(p.id)) {
        addNode(p, 0, 'Pariente');
      }
    });

    return Array.from(nodes.values()).sort((a, b) => a.generation - b.generation);

  }, [people, focusId, viewRootId, getPerson]);

  return familyTree;
};