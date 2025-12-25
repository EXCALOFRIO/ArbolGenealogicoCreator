import { useMemo } from 'react';
import { Person, RenderNode } from '../types';
import { useFamilyStore } from '../store/familyStore';

export const useFamilyLogic = () => {
  const { people, focusId, viewRootId, getPerson } = useFamilyStore();

  // --- LÓGICA DE RELACIONES Y LEYENDAS ---
  const getAncestorLabel = (depth: number, gender: string) => {
    if (depth === 1) return gender === 'Male' ? 'Padre' : 'Madre';
    if (depth === 2) return gender === 'Male' ? 'Abuelo' : 'Abuela';
    if (depth === 3) return gender === 'Male' ? 'Bisabuelo' : 'Bisabuela';
    if (depth === 4) return gender === 'Male' ? 'Tatarabuelo' : 'Tatarabuela';
    if (depth === 5) return gender === 'Male' ? 'Trastatarabuelo' : 'Trastatarabuelo';
    return gender === 'Male' ? `Ancestro (Gen -${depth})` : `Ancestra (Gen -${depth})`;
  };

  const getDescendantLabel = (depth: number, gender: string) => {
    if (depth === 1) return gender === 'Male' ? 'Hijo' : 'Hija';
    if (depth === 2) return gender === 'Male' ? 'Nieto' : 'Nieta';
    if (depth === 3) return gender === 'Male' ? 'Bisnieto' : 'Bisnieta';
    if (depth === 4) return gender === 'Male' ? 'Tataranieto' : 'Tataranieta';
    return gender === 'Male' ? `Descendiente (Gen ${depth})` : `Descendiente (Gen ${depth})`;
  };

  const familyTree = useMemo(() => {
    if (people.length === 0) return [];

    // 1. DETERMINAR UN ANCLA ESTABLE PARA EL LAYOUT
    // Buscamos a Alejandro (el usuario habitual) o el primer YO/Focus de la lista
    // para que la estructura del árbol (generaciones) no cambie al saltar entre nodos.
    const anchor = people.find(p => p.name.toUpperCase() === 'ALEJANDRO') || people[0];
    const anchorId = anchor.id;

    const peopleById = new Map(people.map(p => [p.id, p]));
    const nodes = new Map<string, RenderNode>();
    const gens = new Map<string, number>();

    // 2. CALCULAR GENERACIONES DESDE EL ANCLA (ESTABLE)
    const q: { id: string, gen: number }[] = [{ id: anchorId, gen: 0 }];
    gens.set(anchorId, 0);

    let head = 0;
    while (head < q.length) {
      const { id, gen } = q[head++];
      const p = peopleById.get(id);
      if (!p) continue;

      // Subir a padres
      (p.parents || []).forEach(pid => {
        if (!gens.has(pid)) {
          gens.set(pid, gen - 1);
          q.push({ id: pid, gen: gen - 1 });
        }
      });
      // Bajar a hijos
      (p.children || []).forEach(cid => {
        if (!gens.has(cid)) {
          gens.set(cid, gen + 1);
          q.push({ id: cid, gen: gen + 1 });
        }
      });
      // Parejas al mismo nivel
      (p.partners || []).forEach(sid => {
        if (!gens.has(sid)) {
          gens.set(sid, gen);
          q.push({ id: sid, gen: gen });
        }
      });
      // Hermanos al mismo nivel
      (p.siblings || []).forEach(bid => {
        if (!gens.has(bid)) {
          gens.set(bid, gen);
          q.push({ id: bid, gen: gen });
        }
      });
    }

    // 3. CALCULAR RELACIONES DESDE EL FOCO (N LEV up, M LEV down)
    const currentFocusId = viewRootId || focusId || anchorId;
    const nodeCoords = new Map<string, { up: number, down: number }>();

    // BFS para distancias/rutas relativas
    // (up: niveles hacia el ancestro común, down: niveles hacia el pariente)
    const rq: { id: string, up: number, down: number }[] = [{ id: currentFocusId, up: 0, down: 0 }];
    nodeCoords.set(currentFocusId, { up: 0, down: 0 });

    head = 0;
    while (head < rq.length) {
      const { id, up, down } = rq[head++];
      const p = peopleById.get(id);
      if (!p) continue;

      // REGLAS ESTRICTAS DE GENEALOGÍA:
      // A) SUBIR A PADRES: Solo si no hemos empezado a bajar (somos ancestros directos)
      if (down === 0) {
        (p.parents || []).forEach(pid => {
          if (!nodeCoords.has(pid)) {
            nodeCoords.set(pid, { up: up + 1, down: 0 });
            rq.push({ id: pid, up: up + 1, down: 0 });
          }
        });
      }

      // B) BAJAR A HIJOS: Se puede bajar desde el foco o desde cualquier ancestro
      (p.children || []).forEach(cid => {
        if (!nodeCoords.has(cid)) {
          // Si bajamos, incrementamos el contador de "down"
          nodeCoords.set(cid, { up, down: down + 1 });
          rq.push({ id: cid, up, down: down + 1 });
        }
      });

      // C) PAREJAS: Se mantienen en el mismo nivel de parentesco
      (p.partners || []).forEach(sid => {
        if (!nodeCoords.has(sid)) {
          nodeCoords.set(sid, { up, down });
          rq.push({ id: sid, up, down });
        }
      });
    }

    const getRelLabel = (p: Person, up: number, down: number) => {
      const gender = p.gender;

      // Coordenadas exactas:
      if (up === 0 && down === 0) return 'YO';
      if (up === 1 && down === 0) return gender === 'Male' ? 'Padre' : 'Madre';
      if (up === 0 && down === 1) return gender === 'Male' ? 'Hijo' : 'Hija';
      if (up === 1 && down === 1) return gender === 'Male' ? 'Hermano' : 'Hermana';
      if (up === 2 && down === 0) return gender === 'Male' ? 'Abuelo' : 'Abuela';
      if (up === 0 && down === 2) return gender === 'Male' ? 'Nieto' : 'Nieta';
      if (up === 2 && down === 1) return gender === 'Male' ? 'Tío' : 'Tía';
      if (up === 1 && down === 2) return gender === 'Male' ? 'Sobrino' : 'Sobrina';
      if (up === 2 && down === 2) return gender === 'Male' ? 'Primo' : 'Prima';
      if (up === 3 && down === 0) return gender === 'Male' ? 'Bisabuelo' : 'Bisabuela';
      if (up === 0 && down === 3) return gender === 'Male' ? 'Bisnieto' : 'Bisnieta';
      if (up === 3 && down === 1) return gender === 'Male' ? 'Tío abuelo' : 'Tía abuela';
      if (up === 1 && down === 3) return gender === 'Male' ? 'Bisobrino' : 'Bisobrina';
      if (up === 3 && down === 2) return gender === 'Male' ? 'Tío segundo' : 'Tía segunda';
      if (up === 2 && down === 3) return gender === 'Male' ? 'Sob. segundo' : 'Sob. segunda';
      if (up === 3 && down === 3) return gender === 'Male' ? 'Primo segundo' : 'Prima segunda';

      // Genéricos:
      if (up > 0 && down === 0) return getAncestorLabel(up, gender);
      if (up === 0 && down > 0) return getDescendantLabel(down, gender);

      return 'Pariente';
    };

    // 4. MAPPING FINAL
    people.forEach(p => {
      const coords = nodeCoords.get(p.id);
      let rType = 'Pariente';

      if (coords) {
        rType = getRelLabel(p, coords.up, coords.down);
      } else {
        // Si no hay ruta directa, ver si es pareja de alguien con ruta
        for (const partnerId of p.partners) {
          const partnerCoords = nodeCoords.get(partnerId);
          if (partnerCoords) {
            const pLabel = getRelLabel(peopleById.get(partnerId)!, partnerCoords.up, partnerCoords.down);
            rType = `Cónyuge de ${pLabel}`;
            break;
          }
        }
      }

      // Corrección final para partners directos del foco si no se detectó
      const focusP = peopleById.get(currentFocusId);
      if (focusP?.partners.includes(p.id)) {
        rType = p.gender === 'Male' ? 'Esposo' : 'Esposa';
      }

      nodes.set(p.id, {
        ...p,
        generation: gens.get(p.id) || 0,
        relationType: rType
      });
    });

    return Array.from(nodes.values()).sort((a, b) => a.generation - b.generation);
  }, [people, focusId, viewRootId, getPerson]);

  return familyTree;
};