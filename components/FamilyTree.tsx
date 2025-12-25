import React, { useMemo, useEffect, useRef, useState } from 'react';
import { ReactFlow, Background, Edge, Node, useReactFlow } from '@xyflow/react';
import { useFamilyLogic } from '../hooks/useFamilyLogic';
import { PersonNode } from './PersonNode';
import { CoupleNode } from './CoupleNode';
import { useFamilyStore } from '../store/familyStore';

const nodeTypes = {
  person: PersonNode,
  couple: CoupleNode,
};

// Componente interno para manejar el centrado
const FlowContent: React.FC<{ nodes: Node[]; edges: Edge[]; focusId: string }> = ({ nodes, edges, focusId }) => {
  const { setCenter } = useReactFlow();
  const prevFocusId = useRef(focusId);

  useEffect(() => {
    if (focusId !== prevFocusId.current) {
      prevFocusId.current = focusId;

      // Buscar el nodo que contiene al focus (puede ser un couple o person)
      const focusNode = nodes.find(n => {
        if (n.id === focusId) return true;
        if (n.type === 'couple' && n.data) {
          return n.data.person1?.id === focusId || n.data.person2?.id === focusId;
        }
        return false;
      });

      if (focusNode) {
        const nodeWidth = focusNode.type === 'couple' ? 320 : 160;
        const nodeHeight = 140;
        const centerX = focusNode.position.x + nodeWidth / 2;
        const centerY = focusNode.position.y + nodeHeight / 2;

        setTimeout(() => {
          setCenter(centerX, centerY, { duration: 500, zoom: 0.9 });
        }, 100);
      }
    }
  }, [focusId, nodes, setCenter]);

  return null;
};

export const FamilyTree: React.FC = () => {
  const familyNodes = useFamilyLogic();
  const { focusId, viewRootId } = useFamilyStore();
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  // Detectar móvil para ajustar tamaños
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { nodes, edges } = useMemo(() => {
    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];
    const processedCouples = new Set<string>();
    const nodePositions = new Map<string, { x: number; y: number; width: number }>();

    // 1. Agrupar por generación
    const byGen: Record<number, any[]> = {};
    familyNodes.forEach(n => {
      if (!byGen[n.generation]) byGen[n.generation] = [];
      byGen[n.generation].push(n);
    });

    // Tamaños responsivos
    const COUPLE_WIDTH = isMobile ? 200 : 320;
    const SINGLE_WIDTH = isMobile ? 100 : 160;
    const HORIZONTAL_GAP = isMobile ? 60 : 120; // Aumentado para evitar apretujamiento
    const VERTICAL_SPACING = isMobile ? 160 : 220;

    // Normaliza una pareja de padres a una clave estable
    const parentPairKey = (parents: string[] | undefined): string | null => {
      if (!parents || parents.length !== 2) return null;
      const [a, b] = [...parents].sort();
      return `${a}|${b}`;
    };

    type NodeItem = {
      id: string;
      gen: number;
      width: number;
      node: Node;
      kind: 'person' | 'couple';
      members: string[];
      person1Id?: string;
      person2Id?: string;
      p1Parents?: string[];
      p2Parents?: string[];
      personParents?: string[];
    };

    // 2. Construir nodos (sin posiciones definitivas) + mapa persona->contenedor
    const sortedGens = Object.entries(byGen).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
    const nodeItems: NodeItem[] = [];
    const personToContainer = new Map<string, string>();

    sortedGens.forEach(([genStr, members]) => {
      const gen = parseInt(genStr);
      const processed = new Set<string>();

      members.forEach(member => {
        if (processed.has(member.id)) return;

        // Buscar pareja declarada
        let partnerInGen = member.partners.find((pId: string) =>
          members.some(m => m.id === pId) && !processed.has(pId)
        );

        // Si no hay pareja declarada, inferir co-padre/madre (comparten el mismo hijo)
        if (!partnerInGen && member.children && member.children.length > 0) {
          for (const childId of member.children) {
            const coParent = members.find(m =>
              m.id !== member.id &&
              !processed.has(m.id) &&
              m.children?.includes(childId)
            );
            if (coParent) {
              partnerInGen = coParent.id;
              break;
            }
          }
        }

        const partner = partnerInGen ? members.find(m => m.id === partnerInGen) : null;

        if (partner) {
          const coupleId = [member.id, partner.id].sort().join('-couple-');
          if (processedCouples.has(coupleId)) return;

          processedCouples.add(coupleId);
          processed.add(member.id);
          processed.add(partner.id);

          const coupleNode: Node = {
            id: coupleId,
            type: 'couple',
            data: {
              person1: member,
              person2: partner,
              coupleId,
            },
            position: { x: 0, y: gen * VERTICAL_SPACING },
          };

          nodeItems.push({
            id: coupleId,
            gen,
            width: COUPLE_WIDTH,
            node: coupleNode,
            kind: 'couple',
            members: [member.id, partner.id],
            person1Id: member.id,
            person2Id: partner.id,
            p1Parents: member.parents || [],
            p2Parents: partner.parents || [],
          });
          personToContainer.set(member.id, coupleId);
          personToContainer.set(partner.id, coupleId);
        } else {
          processed.add(member.id);

          const personNode: Node = {
            id: member.id,
            type: 'person',
            data: member,
            position: { x: 0, y: gen * VERTICAL_SPACING },
          };

          nodeItems.push({
            id: member.id,
            gen,
            width: SINGLE_WIDTH,
            node: personNode,
            kind: 'person',
            members: [member.id],
            personParents: member.parents || [],
          });
          personToContainer.set(member.id, member.id);
        }
      });
    });

    const nodeById = new Map(nodeItems.map(n => [n.id, n] as const));

    // --- Separación por familias (izq/centro/der) para que no se mezclen ramas ---
    const familyById = new Map<string, any>();
    familyNodes.forEach(p => familyById.set(p.id, p));

    const layoutRootId = viewRootId || focusId;
    const focusContainerId = personToContainer.get(layoutRootId) || layoutRootId;
    const focusContainerItem = nodeById.get(focusContainerId);
    const focusPersonData = familyById.get(layoutRootId);

    // Detectar los dos "lados" de la familia
    // Caso 1: el foco tiene pareja -> izq = familia pareja, der = familia foco
    // Caso 2: el foco tiene padres -> izq = familia madre, der = familia padre
    let leftRootPersonId: string | null = null;
    let rightRootPersonId: string | null = null;

    // Primero intentar con la pareja del foco
    if (focusContainerItem && focusContainerItem.kind === 'couple') {
      const d: any = focusContainerItem.node.data;
      const p1 = d?.person1;
      const p2 = d?.person2;
      if (p1?.id && p2?.id) {
        const focusPerson = p1.id === layoutRootId ? p1 : p2.id === layoutRootId ? p2 : p1;
        const partnerPerson = p1.id === layoutRootId ? p2 : p2.id === layoutRootId ? p1 : p2;
        leftRootPersonId = partnerPerson?.id || null;
        rightRootPersonId = focusPerson?.id || null;
      }
    }
    
    // Si no hay pareja pero hay padres, usar los padres para determinar lados
    if (!leftRootPersonId && !rightRootPersonId && focusPersonData?.parents?.length >= 1) {
      const parentIds = focusPersonData.parents;
      if (parentIds.length === 2) {
        const p0 = familyById.get(parentIds[0]);
        const p1 = familyById.get(parentIds[1]);
        if (p0?.gender === 'Female') {
          leftRootPersonId = parentIds[0];
          rightRootPersonId = parentIds[1];
        } else if (p1?.gender === 'Female') {
          leftRootPersonId = parentIds[1];
          rightRootPersonId = parentIds[0];
        } else {
          const sorted = [...parentIds].sort();
          leftRootPersonId = sorted[0];
          rightRootPersonId = sorted[1];
        }
      } else if (parentIds.length === 1) {
        rightRootPersonId = parentIds[0];
      }
    }

    // Identificar consuegros: padres de las parejas de los hijos del foco
    const consuegrosIds = new Set<string>();
    (focusPersonData?.children || []).forEach((childId: string) => {
      const child = familyById.get(childId);
      if (!child) return;
      (child.partners || []).forEach((childPartnerId: string) => {
        const childPartner = familyById.get(childPartnerId);
        if (!childPartner) return;
        (childPartner.parents || []).forEach((consuegrosId: string) => {
          consuegrosIds.add(consuegrosId);
          // También añadir parejas de los consuegros
          const consuegro = familyById.get(consuegrosId);
          if (consuegro?.partners) {
            consuegro.partners.forEach((pid: string) => consuegrosIds.add(pid));
          }
        });
      });
    });

    const childrenById = new Map<string, string[]>();
    const partnersById = new Map<string, string[]>();
    const parentsById = new Map<string, string[]>();
    const siblingsById = new Map<string, string[]>();
    familyNodes.forEach(p => {
      childrenById.set(p.id, p.children || []);
      partnersById.set(p.id, p.partners || []);
      parentsById.set(p.id, p.parents || []);
      siblingsById.set(p.id, (p as any).siblings || []);
    });

    // Construir el conjunto de personas que pertenecen a una "rama" familiar
    // otherRootId es el root de la otra familia, para no añadirlo accidentalmente
    const buildFamilySet = (rootPersonId: string | null, otherRootId: string | null): Set<string> => {
      const out = new Set<string>();
      if (!rootPersonId) return out;

      const q: string[] = [rootPersonId];
      out.add(rootPersonId);

      for (let i = 0; i < q.length; i++) {
        const pid = q[i];
        // Añadir pareja(s) (sin añadir el foco ni el otro root)
        const partners = partnersById.get(pid) || [];
        partners.forEach(partnerId => {
          if (!out.has(partnerId) && partnerId !== layoutRootId && partnerId !== otherRootId) {
            out.add(partnerId);
            q.push(partnerId); // EXPLORAR RAMA PAREJA (NUEVO)
          }
        });

        // Añadir co-padres (personas que comparten el mismo hijo aunque no estén en partners)
        const children = childrenById.get(pid) || [];
        children.forEach(childId => {
          familyNodes.forEach(otherPerson => {
            if (otherPerson.id === pid) return;
            if (otherPerson.id === layoutRootId || otherPerson.id === otherRootId) return;
            if (otherPerson.children?.includes(childId) && !out.has(otherPerson.id)) {
              out.add(otherPerson.id);
            }
          });
        });

        // Subir a padres
        const parents = parentsById.get(pid) || [];
        parents.forEach(parentId => {
          if (!out.has(parentId)) {
            out.add(parentId);
            q.push(parentId);
          }
        });

        // Hermanos directos (campo siblings) - importante cuando no hay padres
        const siblings = siblingsById.get(pid) || [];
        siblings.forEach(sibId => {
          if (sibId === layoutRootId || sibId === otherRootId) return;
          if (!out.has(sibId)) {
            out.add(sibId);
            q.push(sibId);
          }
        });

        // Reverse siblings (por seguridad ante imports viejos)
        siblingsById.forEach((sibList, otherId) => {
          if (otherId === pid) return;
          if (!sibList?.includes(pid)) return;
          if (otherId === layoutRootId || otherId === otherRootId) return;
          if (!out.has(otherId)) {
            out.add(otherId);
            q.push(otherId);
          }
        });
        // Hermanos (hijos de los padres excluyendo foco)
        parents.forEach(parentId => {
          const parentData = familyById.get(parentId);
          if (!parentData) return;
          (parentData.children || []).forEach((sibId: string) => {
            if (sibId !== layoutRootId && !out.has(sibId)) {
              out.add(sibId);
              const sibPartners = partnersById.get(sibId) || [];
              sibPartners.forEach(sp => { if (!out.has(sp) && sp !== layoutRootId) out.add(sp); });
              const sibChildren = childrenById.get(sibId) || [];
              sibChildren.forEach(sc => { if (!out.has(sc) && sc !== layoutRootId) out.add(sc); });
            }
          });
        });

        // DESCENDIENTES (NUEVO: Importante para primos/sobrinos)
        const personChildren = childrenById.get(pid) || [];
        personChildren.forEach(childId => {
          if (childId !== layoutRootId && !out.has(childId)) {
            out.add(childId);
            q.push(childId);
          }
        });
      }
      return out;
    };

    const leftFamily = buildFamilySet(leftRootPersonId, rightRootPersonId);
    const rightFamily = buildFamilySet(rightRootPersonId, leftRootPersonId);

    // Detectar si el foco tiene padres en el árbol (para decidir si separar consuegros o no)
    const focusHasParentsInTree = (focusPersonData?.parents || []).some((pid: string) => familyById.has(pid));
    
    // Detectar si el foco tiene hijos (para decidir si aplicar separación de familias)
    const focusHasChildrenInTree = (focusPersonData?.children || []).some((cid: string) => familyById.has(cid));
    
    // Solo aplicar separación izq/der cuando el foco tiene pareja Y tiene hijos/padres
    // Esto evita cambios drásticos cuando seleccionas a un abuelo
    const shouldApplyFamilySeparation = focusContainerItem?.kind === 'couple' && (focusHasChildrenInTree || focusHasParentsInTree);

    type FamilySide = 'left' | 'center' | 'right';
    const sideOfItemBase = (item: NodeItem): FamilySide => {
      if (item.id === focusContainerId) return 'center';
      if (item.members.includes(layoutRootId)) return 'center';
      
      // Si no debemos aplicar separación de familias, todo va al centro
      if (!shouldApplyFamilySeparation) return 'center';
      
      // Consuegros: solo separar a la izquierda si el foco tiene sus propios padres
      // Si el foco no tiene padres, mantener consuegros en el centro para layout simétrico
      const isConsuegro = item.members.some(m => consuegrosIds.has(m));
      if (isConsuegro) {
        return focusHasParentsInTree ? 'left' : 'center';
      }
      
      const inLeft = item.members.some(m => leftFamily.has(m));
      const inRight = item.members.some(m => rightFamily.has(m));
      if (inLeft && !inRight) return 'left';
      if (inRight && !inLeft) return 'right';
      return 'center';
    };

    const getParentContainerId = (parents: string[] | undefined): string | null => {
      if (!parents || parents.length === 0) return null;
      if (parents.length === 2) {
        const coupleId = [...parents].sort().join('-couple-');
        if (nodeById.has(coupleId)) return coupleId;
      }
      // fallback: usar el primer padre disponible
      const parentId = parents[0];
      return personToContainer.get(parentId) || null;
    };

    // Importante: los hijos deben quedar en el mismo “lado” que sus padres.
    // Si no, el shift por segmentos (FAMILY_GAP) los descuadra y quedan fuera del centro.
    const sideCache = new Map<string, FamilySide>();
    const sideOfItem = (item: NodeItem): FamilySide => {
      const cached = sideCache.get(item.id);
      if (cached) return cached;

      let side: FamilySide = sideOfItemBase(item);

      // Mantener hermanos/cuñaados cerca del foco (en el centro), no en ramas separadas.
      // El orden izquierda/derecha se controla con un “bias” aparte.
      const relOf = (it: NodeItem): string | null => {
        const d: any = it.node.data;
        if (it.kind === 'person') return d?.relationType || null;
        // couple: si alguno es hermano/cuñado, tomar ese tipo
        const r1 = d?.person1?.relationType;
        const r2 = d?.person2?.relationType;
        return r1 || r2 || null;
      };
      const rel = relOf(item);
      if (item.gen === 0 && (rel === 'Sibling' || rel === 'PartnerSibling')) {
        side = 'center';
      }
      
      // Consuegros: solo separar si el foco tiene sus propios padres en el árbol
      if (rel === 'Consuegro' || rel === 'Consuegra') {
        side = focusHasParentsInTree ? 'left' : 'center';
      }

      if (item.kind === 'person') {
        const parentContainerId = getParentContainerId(item.personParents);
        if (parentContainerId && parentContainerId !== item.id) {
          const parentContainer = nodeById.get(parentContainerId);
          if (parentContainer) side = sideOfItemBase(parentContainer);
        }
      }

      sideCache.set(item.id, side);
      return side;
    };

    // Sesgo de orden: cuñados a la izquierda (lado de la pareja), hermanos propios a la derecha.
    const biasOfItem = (item: NodeItem): FamilySide => {
      const d: any = item.node.data;
      const rel = item.kind === 'person'
        ? d?.relationType
        : (d?.person1?.relationType === 'PartnerSibling' || d?.person2?.relationType === 'PartnerSibling')
          ? 'PartnerSibling'
          : (d?.person1?.relationType === 'Sibling' || d?.person2?.relationType === 'Sibling')
            ? 'Sibling'
            : null;

      // GENERACIÓN -1: mantener al padre/madre del foco en el centro,
      // y empujar tíos/tías a los lados según género (tías a la izquierda).
      // Esto reduce cruces cuando hay tíos + parejas de tíos.
      if (item.gen === -1) {
        const rel2 = item.kind === 'person'
          ? d?.relationType
          : (d?.person1?.relationType === 'Uncle/Aunt' || d?.person2?.relationType === 'Uncle/Aunt')
            ? 'Uncle/Aunt'
            : (d?.person1?.relationType === 'UnclePartner' || d?.person2?.relationType === 'UnclePartner')
              ? 'UnclePartner'
              : null;

        if (rel2 === 'Parent') return 'center';

        // Para parejas de tíos, decidir por el miembro que es tío/tía (no la pareja política)
        if (rel2 === 'Uncle/Aunt') {
          if (item.kind === 'person') {
            const p = familyById.get(item.personId);
            return p?.gender === 'Female' ? 'left' : 'right';
          }

          if (item.kind === 'couple') {
            const p1Rel = d?.person1?.relationType;
            const p2Rel = d?.person2?.relationType;
            const bloodId = p1Rel === 'Uncle/Aunt'
              ? item.person1Id
              : (p2Rel === 'Uncle/Aunt' ? item.person2Id : item.person1Id);
            const blood = bloodId ? familyById.get(bloodId) : null;
            return blood?.gender === 'Female' ? 'left' : 'right';
          }
        }
      }

      if (item.gen === 0 && rel === 'PartnerSibling') return 'left';
      if (item.gen === 0 && rel === 'Sibling') return 'right';

      // SESGO PROACTIVO (NUEVO): Si un miembro de una pareja tiene hijos que casan con el "Left branch",
      // mover esa pareja hacia la izquierda para evitar cruces.
      if (item.kind === 'couple') {
        const p1Id = item.person1Id;
        const p2Id = item.person2Id;
        const p1Data = familyById.get(p1Id);
        const p2Data = familyById.get(p2Id);

        const hasChildInLeft = (pId: string) => {
          const children = childrenById.get(pId) || [];
          return children.some(cid => {
            const childPartners = partnersById.get(cid) || [];
            return childPartners.some(cp => leftFamily.has(cp));
          });
        };

        if (hasChildInLeft(p1Id!) || hasChildInLeft(p2Id!)) return 'left';
      }

      return sideOfItem(item);
    };

    const getNodeCenter = (nodeId: string): number | null => {
      const pos = nodePositions.get(nodeId);
      if (!pos) return null;
      return pos.x + pos.width / 2;
    };

    const getParentCoupleCenter = (parents: string[] | undefined): number | null => {
      if (!parents || parents.length === 0) return null;
      if (parents.length === 2) {
        const coupleId = [...parents].sort().join('-couple-');
        if (nodeById.has(coupleId)) {
          return getNodeCenter(coupleId);
        }
      }

      // fallback: usar el primer padre disponible
      const parentId = parents[0];
      const containerId = personToContainer.get(parentId);
      if (!containerId) return null;
      return getNodeCenter(containerId);
    };

    const ensureCoupleOrderByParents = (item: NodeItem) => {
      if (item.kind !== 'couple') return;

      const p1Id = item.person1Id;
      const p2Id = item.person2Id;
      if (!p1Id || !p2Id) return;

      // Primero: si uno de los miembros es el "leftRoot" o "rightRoot", usarlo para ordenar
      // Esto asegura que la tarjeta de los padres del foco tenga el orden correcto
      const p1IsLeft = p1Id === leftRootPersonId || leftFamily.has(p1Id);
      const p1IsRight = p1Id === rightRootPersonId || rightFamily.has(p1Id);
      const p2IsLeft = p2Id === leftRootPersonId || leftFamily.has(p2Id);
      const p2IsRight = p2Id === rightRootPersonId || rightFamily.has(p2Id);

      let shouldSwap = false;

      // Si p2 es de la familia izquierda y p1 no, swap
      if (p2IsLeft && !p1IsLeft) {
        shouldSwap = true;
      }
      // Si p1 es de la familia derecha y p2 no es derecha, swap
      else if (p1IsRight && !p2IsRight) {
        shouldSwap = true;
      }
      // Fallback: usar posiciones de los padres de cada miembro
      else {
        const c1 = getParentCoupleCenter(item.p1Parents);
        const c2 = getParentCoupleCenter(item.p2Parents);
        if (c1 != null && c2 != null && c2 < c1) {
          shouldSwap = true;
        }
      }

      if (shouldSwap) {
        item.person1Id = p2Id;
        item.person2Id = p1Id;

        const tmpParents = item.p1Parents;
        item.p1Parents = item.p2Parents;
        item.p2Parents = tmpParents;

        // También swap en data para que el UI/handles reflejen el orden
        const d: any = item.node.data;
        if (d?.person1 && d?.person2) {
          const tmpPerson = d.person1;
          d.person1 = d.person2;
          d.person2 = tmpPerson;
        }
      }
    };

    // 3. Posicionamiento por generación:
    // - Los hermanos (mismos padres) se centran como grupo bajo el centro del matrimonio
    // - Las parejas "mixtas" (cada uno con suegros distintos) se colocan entre ambos lados
    const gens = [...new Set(nodeItems.map(n => n.gen))].sort((a, b) => a - b);

    const resolveOverlaps = (items: { id: string; width: number; desiredLeft: number }[]) => {
      // Orden estable por posición deseada
      items.sort((a, b) => a.desiredLeft - b.desiredLeft);
      const lefts = items.map(i => i.desiredLeft);

      // forward
      for (let i = 1; i < items.length; i++) {
        const minLeft = lefts[i - 1] + items[i - 1].width + HORIZONTAL_GAP;
        if (lefts[i] < minLeft) lefts[i] = minLeft;
      }
      // backward
      for (let i = items.length - 2; i >= 0; i--) {
        const maxLeft = lefts[i + 1] - items[i].width - HORIZONTAL_GAP;
        if (lefts[i] > maxLeft) lefts[i] = maxLeft;
      }
      // forward de nuevo (por seguridad)
      for (let i = 1; i < items.length; i++) {
        const minLeft = lefts[i - 1] + items[i - 1].width + HORIZONTAL_GAP;
        if (lefts[i] < minLeft) lefts[i] = minLeft;
      }

      return items.map((it, idx) => ({ ...it, left: lefts[idx] }));
    };

    gens.forEach((gen, genIdx) => {
      const row = nodeItems.filter(n => n.gen === gen);
      if (row.length === 0) return;

      // Antes de calcular posiciones, ordena parejas según dónde caen sus padres
      // (así la familia de Raquel queda a la izquierda si está a la izquierda)
      row.forEach(it => ensureCoupleOrderByParents(it));

      // 1) Preparar grupos por padres (solo cuando hay una pareja de padres clara)
      const groups = new Map<string, NodeItem[]>();
      const ungrouped: NodeItem[] = [];

      const getGroupKey = (item: NodeItem): string | null => {
        if (item.kind === 'person') {
          const key = parentPairKey(item.personParents);
          if (key) return key;
          // Si solo tiene un padre, buscar si ese padre tiene pareja y formar la clave con ambos
          if (item.personParents && item.personParents.length === 1) {
            const singleParentId = item.personParents[0];
            const singleParent = familyById.get(singleParentId);
            if (singleParent?.partners?.length > 0) {
              // Usar la primera pareja para formar el grupo
              const partnerId = singleParent.partners[0];
              const pairKey = [singleParentId, partnerId].sort().join('|');
              return pairKey;
            }
            return `single:${singleParentId}`;
          }
          return null;
        }

        // pareja
        const k1 = parentPairKey(item.p1Parents);
        const k2 = parentPairKey(item.p2Parents);
        if (k1 && k2 && k1 !== k2) return `mixed:${k1}::${k2}`;
        return k1 || k2 || null;
      };

      row.forEach(item => {
        const key = getGroupKey(item);
        if (!key || key.startsWith('mixed:')) {
          ungrouped.push(item);
          return;
        }
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(item);
      });

      // 2) Calcular desiredLeft para cada item
      const desired: { id: string; width: number; desiredLeft: number }[] = [];

      // A) Grupos centrados bajo padres
      // Nuevo: Ordenar las claves de los grupos por la posición X de los padres
      const sortedGroupKeys = Array.from(groups.keys()).sort((keyA, keyB) => {
        let centerA = 0;
        let centerB = 0;

        if (keyA.startsWith('single:')) {
          const pid = keyA.replace('single:', '');
          const containerId = personToContainer.get(pid);
          if (containerId) centerA = getNodeCenter(containerId) || 0;
        } else {
          const [pa, pb] = keyA.split('|');
          centerA = getParentCoupleCenter([pa, pb]) || 0;
        }

        if (keyB.startsWith('single:')) {
          const pid = keyB.replace('single:', '');
          const containerId = personToContainer.get(pid);
          if (containerId) centerB = getNodeCenter(containerId) || 0;
        } else {
          const [pa, pb] = keyB.split('|');
          centerB = getParentCoupleCenter([pa, pb]) || 0;
        }

        return centerA - centerB;
      });

      sortedGroupKeys.forEach((key) => {
        const items = groups.get(key)!;
        // anchor center
        let anchorCenter: number | null = null;
        if (key.startsWith('single:')) {
          const pid = key.replace('single:', '');
          const containerId = personToContainer.get(pid);
          if (containerId) anchorCenter = getNodeCenter(containerId);
        } else {
          const [a, b] = key.split('|');
          anchorCenter = getParentCoupleCenter([a, b]);
        }
        if (anchorCenter == null) {
          anchorCenter = 0;
        }

        // Si solo hay un item, centrarlo exactamente bajo los padres
        if (items.length === 1) {
          const it = items[0];
          desired.push({ id: it.id, width: it.width, desiredLeft: anchorCenter - it.width / 2 });
          return;
        }

        const totalWidth = items.reduce((sum, it, i) => sum + it.width + (i > 0 ? HORIZONTAL_GAP : 0), 0);
        let x = anchorCenter - totalWidth / 2;
        // Ordenar por side para que los de la izquierda queden a la izquierda
        items
          .slice()
          .sort((a, b) => {
            const sideA = sideOfItem(a);
            const sideB = sideOfItem(b);
            if (sideA === 'left' && sideB !== 'left') return -1;
            if (sideA !== 'left' && sideB === 'left') return 1;
            if (sideA === 'right' && sideB !== 'right') return 1;
            if (sideA !== 'right' && sideB === 'right') return -1;

            // Si el side es igual, usar el bias (importante para hermanos/cuñados)
            const biasA = biasOfItem(a);
            const biasB = biasOfItem(b);
            if (biasA === 'left' && biasB !== 'left') return -1;
            if (biasA !== 'left' && biasB === 'left') return 1;
            if (biasA === 'right' && biasB !== 'right') return 1;
            if (biasA !== 'right' && biasB === 'right') return -1;

            return a.id > b.id ? 1 : -1;
          })
          .forEach(it => {
            desired.push({ id: it.id, width: it.width, desiredLeft: x });
            x += it.width + HORIZONTAL_GAP;
          });
      });

      // B) No agrupados (incluye parejas mixtas): usar reglas por nodo
      ungrouped
        .sort((a, b) => {
          // Ordenar no agrupados por el centro de sus padres para evitar cruces
          const c1 = a.kind === 'person' ? getParentCoupleCenter(a.personParents) : getParentCoupleCenter(a.p1Parents);
          const c2 = b.kind === 'person' ? getParentCoupleCenter(b.personParents) : getParentCoupleCenter(b.p1Parents);
          return (c1 || 0) - (c2 || 0);
        })
        .forEach(it => {
          let desiredLeft = 0;

          if (it.kind === 'person') {
            const c = getParentCoupleCenter(it.personParents);
            desiredLeft = c != null ? c - it.width / 2 : 0;
          } else {
            // pareja: intentar alinear cada lado con sus suegros
            const c1 = getParentCoupleCenter(it.p1Parents);
            const c2 = getParentCoupleCenter(it.p2Parents);

            const has1 = c1 != null && it.person1Id;
            const has2 = c2 != null && it.person2Id;

            if (has1 && has2 && parentPairKey(it.p1Parents) !== parentPairKey(it.p2Parents)) {
              // mixto: colocar entre ambos
              const left1 = (c1 as number) - COUPLE_WIDTH * 0.25;
              const left2 = (c2 as number) - COUPLE_WIDTH * 0.75;
              desiredLeft = (left1 + left2) / 2;
            } else if (has1) {
              desiredLeft = (c1 as number) - COUPLE_WIDTH * 0.25;
            } else if (has2) {
              desiredLeft = (c2 as number) - COUPLE_WIDTH * 0.75;
            } else {
              desiredLeft = 0;
            }
          }

          desired.push({ id: it.id, width: it.width, desiredLeft });
        });

      // Si estamos en la primera fila y todo es 0, distribuir y centrar
      if (genIdx === 0) {
        const allZero = desired.every(d => Math.abs(d.desiredLeft) < 1e-6);
        if (allZero) {
          const total = desired.reduce((sum, d, i) => sum + d.width + (i > 0 ? HORIZONTAL_GAP : 0), 0);
          let x = -total / 2;
          desired
            .sort((a, b) => {
              const ia = nodeById.get(a.id);
              const ib = nodeById.get(b.id);
              const sa = ia ? biasOfItem(ia) : 'center';
              const sb = ib ? biasOfItem(ib) : 'center';
              const order = (s: string) => (s === 'left' ? 0 : s === 'center' ? 1 : 2);
              const da = order(sa);
              const db = order(sb);
              if (da !== db) return da - db;
              return a.id > b.id ? 1 : -1;
            })
            .forEach(d => {
              d.desiredLeft = x;
              x += d.width + HORIZONTAL_GAP;
            });
        }
      }

      // 3) Resolver solapes y asignar posiciones - SEPARANDO POR FAMILIAS
      const FAMILY_GAP = 240;
      const desiredLeftSeg = desired.filter(d => {
        const it = nodeById.get(d.id);
        return it ? sideOfItem(it) === 'left' : false;
      });
      const desiredCenterSeg = desired.filter(d => {
        const it = nodeById.get(d.id);
        return it ? sideOfItem(it) === 'center' : true;
      });
      const desiredRightSeg = desired.filter(d => {
        const it = nodeById.get(d.id);
        return it ? sideOfItem(it) === 'right' : false;
      });

      const placedLeft = desiredLeftSeg.length ? resolveOverlaps(desiredLeftSeg) : [];
      const placedCenter = desiredCenterSeg.length ? resolveOverlaps(desiredCenterSeg) : [];
      const placedRight = desiredRightSeg.length ? resolveOverlaps(desiredRightSeg) : [];

      const extent = (arr: { left: number; width: number }[]) => {
        if (!arr.length) return { min: 0, max: 0, empty: true };
        const min = Math.min(...arr.map(a => a.left));
        const max = Math.max(...arr.map(a => a.left + a.width));
        return { min, max, empty: false };
      };

      const eCenter = extent(placedCenter);
      const centerMin = eCenter.empty ? 0 : eCenter.min;
      const centerMax = eCenter.empty ? 0 : eCenter.max;

      const eLeft = extent(placedLeft);
      if (!eLeft.empty) {
        const shiftLeft = (centerMin - FAMILY_GAP) - eLeft.max;
        placedLeft.forEach(p => (p.left += shiftLeft));
      }

      const eRight = extent(placedRight);
      if (!eRight.empty) {
        const shiftRight = (centerMax + FAMILY_GAP) - eRight.min;
        placedRight.forEach(p => (p.left += shiftRight));
      }

      const placed = [...placedLeft, ...placedCenter, ...placedRight];

      placed.forEach(p => {
        const item = nodeById.get(p.id);
        if (!item) return;
        item.node.position.x = p.left;
        const y = item.gen * VERTICAL_SPACING;
        nodePositions.set(item.id, { x: p.left, y, width: item.width });
        item.members.forEach(pid => {
          nodePositions.set(pid, { x: p.left, y, width: item.width });
        });
      });
    });

    // Agregar todos los nodos
    nodeItems.forEach(item => flowNodes.push(item.node));

    // 4. Crear conexiones - evitar duplicados cuando ambos padres de un couple apuntan al mismo hijo
    const addedEdges = new Set<string>();

    // Procesar cada persona y sus hijos
    familyNodes.forEach(node => {
      node.children.forEach(childId => {
        // Encontrar el nodo hijo (puede ser individual o parte de una pareja)
        let childNodeId = childId;
        let childNode = flowNodes.find(n => n.id === childId);

        if (!childNode) {
          const coupleWithChild = flowNodes.find(n =>
            n.type === 'couple' &&
            (((n.data as any)?.person1?.id === childId) || ((n.data as any)?.person2?.id === childId))
          );
          if (coupleWithChild) {
            childNode = coupleWithChild;
            childNodeId = coupleWithChild.id;
          }
        }

        if (childNode) {
          // Buscar el nodo padre (puede ser individual o parte de una pareja)
          let parentNodeId = node.id;
          let parentNode = flowNodes.find(n => n.id === node.id);

          if (!parentNode) {
            const coupleWithParent = flowNodes.find(n =>
              n.type === 'couple' &&
              (((n.data as any)?.person1?.id === node.id) || ((n.data as any)?.person2?.id === node.id))
            );
            if (coupleWithParent) {
              parentNode = coupleWithParent;
              parentNodeId = coupleWithParent.id;
            }
          }

          if (parentNode) {
            // Usar parentNodeId + childNodeId para evitar duplicados (sin handle para evitar duplicados por variación)
            const edgeKey = `${parentNodeId}->${childNodeId}`;
            if (!addedEdges.has(edgeKey)) {
              addedEdges.add(edgeKey);

              // Fix: si el hijo es un couple, conectar al handle específico de esa persona (top-ID)
              // Si no, usar el default (null) que va al top del nodo
              let targetHandle: string | null = null;
              if (childNode.type === 'couple') {
                targetHandle = `top-${childId}`;
              }

              flowEdges.push({
                id: `edge-${edgeKey}`,
                source: parentNodeId,
                target: childNodeId,
                targetHandle: targetHandle || undefined,
                type: 'smoothstep',
                style: {
                  stroke: '#64748b',
                  strokeWidth: 2,
                },
              });
            }
          }
        }
      });
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [familyNodes, viewRootId, isMobile]);

  return (
    <div className="w-full h-screen relative bg-slate-950 touch-none">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        colorMode="dark"
        minZoom={0.2}
        maxZoom={2}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        panOnDrag={true}
        panOnScroll={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={true}
        preventScrolling={true}
        fitViewOptions={{ padding: 0.4, duration: 400 }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: '#64748b', strokeWidth: 2 },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <FlowContent nodes={nodes} edges={edges} focusId={focusId} />
        <Background color="#334155" gap={40} size={1} />
      </ReactFlow>

      {/* Floating View Controls */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2">
        <button
          onClick={() => fitView({ duration: 800, padding: 0.2 })}
          className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 p-3 rounded-xl text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 shadow-xl transition-all"
          title="Centrar árbol"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          </svg>
        </button>
        <button
          onClick={() => zoomIn({ duration: 300 })}
          className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 p-3 rounded-xl text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 shadow-xl transition-all"
          title="Aumentar zoom"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
        <button
          onClick={() => zoomOut({ duration: 300 })}
          className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 p-3 rounded-xl text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 shadow-xl transition-all"
          title="Reducir zoom"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
          </svg>
        </button>
      </div>
    </div>
  );
};
