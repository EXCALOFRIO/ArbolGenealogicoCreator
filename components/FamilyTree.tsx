import React, { useMemo, useEffect, useRef, useState } from 'react';
import { ReactFlow, Background, Edge, Node, useReactFlow } from '@xyflow/react';
import { toPng } from 'html-to-image';
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
  const { focusId, viewRootId, theme, isExporting, setIsExporting } = useFamilyStore();
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

  // Efecto para manejar la exportación a imagen
  useEffect(() => {
    if (isExporting) {
      const performExport = async () => {
        // 1. Centrar el árbol
        fitView({ duration: 400, padding: 0.1 });

        // 2. Esperar a que el UI se oculte y la animación termine
        await new Promise(resolve => setTimeout(resolve, 600));

        const element = document.querySelector('.react-flow') as HTMLElement;
        if (element) {
          try {
            // 3. Generar la imagen con alta calidad
            const dataUrl = await toPng(element, {
              backgroundColor: theme === 'dark' ? '#0e100a' : '#f4f5ef',
              pixelRatio: 3, // Muy alta calidad
              filter: (node) => {
                // Ocultar elementos innecesarios en la foto
                const exclusionClasses = [
                  'react-flow__controls',
                  'react-flow__attribution',
                  'react-flow__minimize'
                ];
                return !exclusionClasses.some(cls => node.classList?.contains(cls));
              }
            });

            // 4. Descargar
            const link = document.createElement('a');
            link.download = `mi-arbol-genealogico-${new Date().getTime()}.png`;
            link.href = dataUrl;
            link.click();
          } catch (err) {
            console.error('Error al exportar imagen:', err);
            alert('Error al generar la imagen. Inténtalo de nuevo.');
          }
        }

        // 5. Restaurar el UI
        setIsExporting(false);
      };

      performExport();
    }
  }, [isExporting, fitView, theme, setIsExporting]);

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
    let leftRootPersonId: string | null = null;
    let rightRootPersonId: string | null = null;

    // Caso A: El foco tiene pareja -> El foco siempre a la DERECHA
    if (focusContainerItem && focusContainerItem.kind === 'couple') {
      const d: any = focusContainerItem.node.data;
      if (d.person1?.id === layoutRootId) {
        rightRootPersonId = d.person1.id;
        leftRootPersonId = d.person2?.id || null;
      } else {
        rightRootPersonId = d.person2?.id || null;
        leftRootPersonId = d.person1?.id || null;
      }
    }
    // Caso B: El foco es soltero pero tiene padres -> Madre a la DERECHA, Padre a la IZQUIERDA
    else if (focusPersonData?.parents?.length >= 1) {
      const parentIds = focusPersonData.parents;
      if (parentIds.length === 2) {
        const p0 = familyById.get(parentIds[0]);
        const p1 = familyById.get(parentIds[1]);
        if (p0?.gender === 'Female') {
          rightRootPersonId = parentIds[0];
          leftRootPersonId = parentIds[1];
        } else if (p1?.gender === 'Female') {
          rightRootPersonId = parentIds[1];
          leftRootPersonId = parentIds[0];
        } else {
          // Fallback estable
          const sorted = [...parentIds].sort();
          leftRootPersonId = sorted[0];
          rightRootPersonId = sorted[1];
        }
      } else {
        rightRootPersonId = parentIds[0];
      }
    }


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
          if (!out.has(parentId) && parentId !== layoutRootId && parentId !== otherRootId) {
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

    // Recursive lineage detection (parents, grandparents, etc.)
    const getFullLineage = (rootId: string | null): Set<string> => {
      const lineage = new Set<string>();
      if (!rootId) return lineage;
      const q = [rootId];
      while (q.length > 0) {
        const id = q.shift()!;
        if (lineage.has(id)) continue;
        lineage.add(id);
        const p = familyById.get(id);
        if (p?.parents) q.push(...p.parents);
      }
      return lineage;
    };

    const leftLineage = getFullLineage(leftRootPersonId);
    const rightLineage = getFullLineage(rightRootPersonId);

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

      // --- CRITICAL FIX: FORZAR LINAJE PRINCIPAL AL SEGMENTO CENTER ---
      // Si alguno de los miembros del item pertenece al linaje recursivo izquierdo o derecho,
      // DEBE estar en el carril central para mantener la alineación vertical.
      const belongsToPrimaryLineage = item.members.some(m => leftLineage.has(m) || rightLineage.has(m));
      if (belongsToPrimaryLineage) {
        side = 'center';
      }

      // Mantener hermanos/cuñados cerca del foco (en el centro), no en ramas separadas.
      const relOf = (it: NodeItem): string | null => {
        const d: any = it.node.data;
        if (it.kind === 'person') return d?.relationType || null;
        const r1 = d?.person1?.relationType;
        const r2 = d?.person2?.relationType;
        return r1 || r2 || null;
      };
      const rel = relOf(item);
      if (item.gen === 0 && (rel === 'Sibling' || rel === 'PartnerSibling')) {
        side = 'center';
      }

      if (item.kind === 'person') {
        const parentContainerId = getParentContainerId(item.personParents);
        if (parentContainerId && parentContainerId !== item.id) {
          const parentContainer = nodeById.get(parentContainerId);
          if (parentContainer) {
            // Si el padre está en el centro (linaie principal), el hijo también
            const pSide = sideOfItemBase(parentContainer);
            if (pSide === 'center') side = 'center';
          }
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

      // --- SESGO POR LINAJE RECURSIVO ---
      // Si el item pertenece al linaje izquierdo (familia del padre), bias left.
      // Si al derecho (familia de la madre), bias right.
      const isLeftLineage = item.members.some(m => leftLineage.has(m));
      const isRightLineage = item.members.some(m => rightLineage.has(m));

      if (isLeftLineage && !isRightLineage) return 'left';
      if (isRightLineage && !isLeftLineage) return 'right';

      // El matrimonio principal (Padres) de la generación -1 siempre al centro para ser el eje local
      if (item.gen === -1) {
        if (d?.relationType === 'Parent' || d?.person1?.relationType === 'Parent' || d?.person2?.relationType === 'Parent') return 'center';

        const pLeftSibs = siblingsById.get(leftRootPersonId || '') || [];
        const pRightSibs = siblingsById.get(rightRootPersonId || '') || [];

        // Identificar quién es el pariente de sangre en este nodo para tíos
        const bloodId = item.kind === 'person' ? item.id :
          (pLeftSibs.includes(item.person1Id!) || pRightSibs.includes(item.person1Id!)) ? item.person1Id : item.person2Id;

        if (bloodId && pLeftSibs.includes(bloodId)) return 'left';
        if (bloodId && pRightSibs.includes(bloodId)) return 'right';
      }

      if (item.gen === 0 && (item.id === layoutRootId || item.members.includes(layoutRootId))) return 'right';

      // Bias dinámico basado en las familias de hermanos/primos
      const myId = item.kind === 'person' ? item.id : item.person1Id;
      const partnerId = item.kind === 'couple' ? item.person2Id : null;

      if (leftFamily.has(myId!) || (partnerId && leftFamily.has(partnerId))) return 'left';
      if (rightFamily.has(myId!) || (partnerId && rightFamily.has(partnerId))) return 'right';

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
        // --- ACTUALIZACIÓN: CLUSTER CENTRAL UNIVERSAL ---
        // Esto agrupa a la pareja principal y sus hermanos en una sola fila compacta
        // en CUALQUIER generación, no solo en la -1.
        if (sideOfItem(item) === 'center') {
          return `GEN_${gen}_CENTER_CLUSTER`;
        }
        // ------------------------------------------

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

      // A) Grupos
      const sortedGroupKeys = Array.from(groups.keys()).sort((keyA, keyB) => {
        // El cluster central siempre tiene prioridad o se trata neutro
        if (keyA.includes('_CENTER_CLUSTER')) return 0;
        if (keyB.includes('_CENTER_CLUSTER')) return 0;

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
        let anchorCenter: number | null = null;

        // --- ACTUALIZACIÓN: LÓGICA ESPECIAL PARA EL CLUSTER CENTRAL ---
        if (key.includes('_CENTER_CLUSTER')) {
          // CALCULAR ANCHOR DINÁMICO (Promedio de la posición de los padres)
          const parentCenters: number[] = [];
          items.forEach(it => {
            const parents = it.kind === 'person' ? it.personParents : it.p1Parents;
            if (parents && parents.length > 0) {
              const cpKey = parentPairKey(parents);
              if (cpKey) {
                const cX = getParentCoupleCenter(cpKey.split('|'));
                if (cX != null) parentCenters.push(cX);
              } else {
                const pId = parents[0];
                const cId = personToContainer.get(pId);
                if (cId) {
                  const cX = getNodeCenter(cId);
                  if (cX != null) parentCenters.push(cX);
                }
              }
            }
          });

          if (parentCenters.length > 0) {
            anchorCenter = parentCenters.reduce((a, b) => a + b, 0) / parentCenters.length;
          } else {
            // --- NUEVO: Centrar sobre los hijos si no hay padres biológicos conocidos en el árbol ---
            // Esto arregla la posición de los bisabuelos y abuelos de ramas laterales
            const childCenters: number[] = [];
            items.forEach(it => {
              it.members.forEach(mId => {
                const children = childrenById.get(mId) || [];
                children.forEach(cId => {
                  const cContainerId = personToContainer.get(cId);
                  if (cContainerId) {
                    const cPos = getNodeCenter(cContainerId);
                    if (cPos != null) childCenters.push(cPos);
                  }
                });
              });
            });

            if (childCenters.length > 0) {
              const uniqueChildCenters = Array.from(new Set(childCenters));
              anchorCenter = uniqueChildCenters.reduce((a, b) => a + b, 0) / uniqueChildCenters.length;
            } else {
              anchorCenter = 0; // Fallback extremo
            }
          }
        }
        // -----------------------------------------------------
        else if (key.startsWith('single:')) {
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
        if (items.length === 1 && !key.includes('_CENTER_CLUSTER')) {
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

            // Esto asegura que el matrimonio (bias center) quede en medio de los hermanos (bias left/right)
            const score = (bias: string) => bias === 'left' ? 0 : bias === 'center' ? 1 : 2;
            const sA = score(biasA);
            const sB = score(biasB);

            if (sA !== sB) return sA - sB;

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
    <div style={{ background: 'var(--app-bg)' }} className="w-full h-screen relative touch-none">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        colorMode={theme === 'dark' ? 'dark' : 'light'}
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
        <Background color="var(--dot-color)" gap={40} size={1} />
      </ReactFlow>

      {/* Botones de zoom/centrar */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-10">
        <button
          onClick={() => zoomIn()}
          style={{
            background: 'var(--card-bg)',
            borderColor: 'var(--card-border)',
            color: 'var(--app-text)'
          }}
          className="p-2.5 rounded-xl backdrop-blur-md border shadow-lg transition-all hover:opacity-80"
          title="Acercar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
          </svg>
        </button>
        <button
          onClick={() => zoomOut()}
          style={{
            background: 'var(--card-bg)',
            borderColor: 'var(--card-border)',
            color: 'var(--app-text)'
          }}
          className="p-2.5 rounded-xl backdrop-blur-md border shadow-lg transition-all hover:opacity-80"
          title="Alejar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" />
          </svg>
        </button>
        <button
          onClick={() => fitView({ padding: 0.4, duration: 400 })}
          style={{
            background: 'var(--card-bg)',
            borderColor: 'var(--card-border)',
            color: 'var(--app-text)'
          }}
          className="p-2.5 rounded-xl backdrop-blur-md border shadow-lg transition-all hover:opacity-80"
          title="Centrar todo"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
          </svg>
        </button>
      </div>
    </div>
  );
};
