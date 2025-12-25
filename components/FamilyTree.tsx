import React, { useMemo, useEffect, useRef, useState } from 'react';
import { ReactFlow, Background, Edge, Node, useReactFlow, ConnectionLineType, MiniMap } from '@xyflow/react';
import { toPng } from 'html-to-image';
import { useFamilyLogic } from '../hooks/useFamilyLogic';
import { PersonNode } from './PersonNode';
import { CoupleNode } from './CoupleNode';
import { useFamilyStore } from '../store/familyStore';

const BackgroundNode = React.memo(({ data }: any) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: data.color || 'rgba(0,0,0,0.05)',
        borderRadius: 24,
        border: `2px solid ${data.borderColor || 'transparent'}`,
      }}
    />
  );
});

const nodeTypes = {
  person: PersonNode,
  couple: CoupleNode,
  background: BackgroundNode,
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
    // const HORIZONTAL_GAP = isMobile ? 60 : 120; // REMOVED in favor of dynamic gaps
    const SIBLING_GAP = isMobile ? 10 : 20; // "Casi pegados"
    const FAMILY_GAP = isMobile ? 80 : 180; // "Mas separacion horizontal de otras familias"
    const VERTICAL_SPACING = isMobile ? 220 : 300; // Increased vertical separation

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

    // 2b. Asegurar el orden interno de las parejas basado en el linaje ANTES de posicionar
    nodeItems.forEach(item => {
      if (item.kind === 'couple') {
        const p1Id = item.person1Id!;
        const p2Id = item.person2Id!;

        const p1IsLeft = leftLineage.has(p1Id) || leftFamily.has(p1Id);
        const p2IsLeft = leftLineage.has(p2Id) || leftFamily.has(p2Id);
        const p1IsRight = rightLineage.has(p1Id) || rightFamily.has(p1Id);
        const p2IsRight = rightLineage.has(p2Id) || rightFamily.has(p2Id);

        let shouldSwap = false;
        // Si p2 es de la rama izquierda y p1 no, swap
        if (p2IsLeft && !p1IsLeft) shouldSwap = true;
        // Si p1 es de la rama derecha y p2 no, swap
        else if (p1IsRight && !p2IsRight) shouldSwap = true;

        if (shouldSwap) {
          item.person1Id = p2Id;
          item.person2Id = p1Id;
          const tmpParents = item.p1Parents;
          item.p1Parents = item.p2Parents;
          item.p2Parents = tmpParents;
          const d: any = item.node.data;
          const tmpPerson = d.person1;
          d.person1 = d.person2;
          d.person2 = tmpPerson;
        }
      }
    });

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
    const biasOfItem = (item: NodeItem): number => {
      // Devolvemos un número para sortear: negativo = izquierda, positivo = derecha
      const d: any = item.node.data;

      // Matrimonio principal siempre al centro (0)
      if (item.id === focusContainerId) return 0;

      // Si es de la familia izquierda pura
      const isLeft = item.members.some(m => leftLineage.has(m) || leftFamily.has(m));
      const isRight = item.members.some(m => rightLineage.has(m) || rightFamily.has(m));

      if (isLeft && !isRight) return -100;
      if (isRight && !isLeft) return 100;

      // Caso Hermanos/Sobrinos en gen 0
      if (item.gen === 0) {
        const rel = item.kind === 'person' ? d?.relationType : (d?.person1?.relationType || d?.person2?.relationType);
        if (rel === 'Sibling') return 50;
        if (rel === 'PartnerSibling') return -50;
      }

      return 0;
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

    // 3. RECURSIVE LAYOUT LOGIC (Bottom-Up)
    const processedNodes = new Set<string>();

    interface LayoutResult {
      width: number;
      center: number;
      nodes: Node[];
      itemIds: string[]; // IDs de las personas/parejas en esta rama
    }

    // Identificar qué nodos (NodeItems) son "raíces" (no tienen padres en el árbol visible)
    const getRoots = (): NodeItem[] => {
      const roots = nodeItems.filter(item => {
        const parents = item.kind === 'person' ? item.personParents : item.p1Parents;
        if (!parents || parents.length === 0) return true;
        return !parents.some(pId => personToContainer.has(pId));
      });
      // Importante: ordenar raíces para que la rama izquierda esté a la izquierda
      return roots.sort((a, b) => biasOfItem(a) - biasOfItem(b));
    };

    // Obtener los hijos directos de un NodeItem
    const getChildrenOf = (itemId: string): NodeItem[] => {
      const item = nodeById.get(itemId);
      if (!item) return [];
      const childrenIds = new Set<string>();
      item.members.forEach(mId => {
        const p = familyById.get(mId);
        if (p?.children) p.children.forEach((cId: string) => childrenIds.add(cId));
      });

      const childContainers = new Set<string>();
      childrenIds.forEach(cId => {
        const cIdContainer = personToContainer.get(cId);
        if (cIdContainer) childContainers.add(cIdContainer);
      });

      return Array.from(childContainers)
        .map(id => nodeById.get(id)!)
        .filter(Boolean);
    };

    // Función principal recursiva
    const layoutFamilyBlock = (itemId: string, gen: number): LayoutResult => {
      if (processedNodes.has(itemId)) {
        return { width: 0, center: 0, nodes: [], itemIds: [] };
      }
      processedNodes.add(itemId);

      const item = nodeById.get(itemId)!;
      const children = getChildrenOf(itemId);

      const itemIds: string[] = [itemId];

      // A. Layout de los hijos (Recursivo)
      let childrenBlock: LayoutResult | null = null;
      if (children.length > 0) {
        // Ordenar hijos por sesgo antes de posicionar
        const sortedChildren = [...children].sort((a, b) => biasOfItem(a) - biasOfItem(b));
        const childrenResults = sortedChildren.map(child => layoutFamilyBlock(child.id, gen + 1));

        let totalW = 0;
        const nodes: Node[] = [];
        const offsets: number[] = [];

        childrenResults.forEach((res, i) => {
          const gap = i > 0 ? SIBLING_GAP : 0;
          offsets.push(totalW + gap + res.center);
          res.nodes.forEach(n => {
            n.position.x += totalW + gap;
            nodes.push(n);
          });
          totalW += gap + res.width;
          itemIds.push(...res.itemIds);
        });

        childrenBlock = {
          width: totalW,
          center: (offsets[0] + offsets[offsets.length - 1]) / 2,
          nodes,
          itemIds
        };
      }

      // B. El item actual
      const selfWidth = item.width;
      const selfCenter = selfWidth / 2;
      const selfNode = { ...item.node, position: { x: 0, y: gen * VERTICAL_SPACING } };

      // C. Alineación
      let width = selfWidth;
      let center = selfCenter;
      const resultNodes: Node[] = [selfNode];

      if (childrenBlock) {
        const diff = selfCenter - childrenBlock.center;

        if (diff > 0) {
          childrenBlock.nodes.forEach(n => n.position.x += diff);
          width = Math.max(selfWidth, childrenBlock.width + diff);
        } else {
          selfNode.position.x += Math.abs(diff);
          width = Math.max(childrenBlock.width, selfWidth + Math.abs(diff));
          center = childrenBlock.center;
        }
        resultNodes.push(...childrenBlock.nodes);
      }

      return { width, center, nodes: resultNodes, itemIds };
    };

    // Como hay múltiples ramas (paterna/materna), procesamos cada raíz
    const roots = getRoots();
    let globalX = 0;

    // Almacenamos resultados para crear fondos después
    const branchResults: LayoutResult[] = [];

    roots.forEach((root, i) => {
      const res = layoutFamilyBlock(root.id, root.gen);
      const gap = i > 0 ? FAMILY_GAP : 0;
      res.nodes.forEach(n => {
        n.position.x += globalX + gap;
        flowNodes.push(n);
      });
      res.center += globalX + gap;
      globalX += gap + res.width;
      branchResults.push(res);
    });

    // --- REFINAMIENTO: Centrar todo el árbol respecto al origen ---
    if (flowNodes.length > 0) {
      const minX = Math.min(...flowNodes.map(n => n.position.x));
      const maxX = Math.max(...flowNodes.map(n => n.position.x + (n.type === 'couple' ? COUPLE_WIDTH : SINGLE_WIDTH)));
      const centerX = (minX + maxX) / 2;
      flowNodes.forEach(n => n.position.x -= centerX);
    }

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

    // --- REFINAMIENTO FINAL: Inyectar información de linaje en el data para el Minimapa ---
    flowNodes.forEach(n => {
      if (n.type === 'background') return;

      const item = nodeById.get(n.id);
      if (item) {
        const inLeft = item.members.some(m => leftLineage.has(m) || leftFamily.has(m));
        const inRight = item.members.some(m => rightLineage.has(m) || rightFamily.has(m));

        if (inLeft) n.data = { ...n.data, lineage: 'paternal' };
        else if (inRight) n.data = { ...n.data, lineage: 'maternal' };
      }
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
        connectionLineType={ConnectionLineType.SmoothStep}
        defaultEdgeOptions={{
          type: 'smoothstep',
          pathOptions: { borderRadius: 0 },
          style: { stroke: '#64748b', strokeWidth: 2 },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <FlowContent nodes={nodes} edges={edges} focusId={focusId} />
        <Background color="var(--dot-color)" gap={40} size={1} />
        <MiniMap
          position="bottom-right"
          maskColor="transparent"
          style={{
            background: 'var(--card-bg)',
            borderRadius: '16px',
            border: '1px solid var(--card-border)',
            overflow: 'hidden'
          }}
          nodeColor={(n: any) => {
            if (n.type === 'background') return 'transparent';
            if (n.id === focusId) return '#3b82f6';

            if (n.data?.lineage === 'paternal') return '#ff9800'; // Naranja/Amarillo
            if (n.data?.lineage === 'maternal') return '#4caf50'; // Verde

            return 'rgba(255, 255, 255, 0.2)';
          }}
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
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
