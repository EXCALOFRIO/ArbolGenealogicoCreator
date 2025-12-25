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
              pixelRatio: 4, // Ultra alta calidad
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

    // Índice rápido id -> datos de persona
    const familyById = new Map<string, any>();
    familyNodes.forEach(p => familyById.set(p.id, p));

    // Contenedor (person o couple) que contiene al foco
    const focusContainerId = personToContainer.get(focusId) || focusId;
    const parentsById = new Map<string, string[]>();
    const siblingsById = new Map<string, Set<string>>();
    
    // 1. Mapear padres
    familyNodes.forEach(p => {
      parentsById.set(p.id, p.parents || []);
    });

    // 2. Calcular hermanos (explícitos + por padres compartidos)
    familyNodes.forEach(p => {
      const sibs = new Set<string>(p.siblings || []);
      
      // Por padres compartidos
      if (p.parents && p.parents.length > 0) {
        const pKey = [...p.parents].sort().join('|');
        familyNodes.forEach(other => {
          if (other.id !== p.id && other.parents && other.parents.length > 0) {
            if ([...other.parents].sort().join('|') === pKey) {
              sibs.add(other.id);
            }
          }
        });
      }
      siblingsById.set(p.id, sibs);
    });

    // Sesgo de orden (Gravedad Relativa):
    // - En una pareja, por convención: Hombre a la izquierda (person1), Mujer a la derecha (person2).
    // - Hermanos del person1 se atraen a la izquierda; hermanos del person2 a la derecha.
    const biasOfItem = (item: NodeItem): number => {
      const memberIds = item.members;

      const sameParents = (a: string[], b: string[] | undefined): boolean => {
        if (!a || a.length === 0) return false;
        if (!b || b.length === 0) return false;
        if (a.length !== b.length) return false;
        const sa = [...a].sort();
        const sb = [...b].sort();
        return sa.every((x, i) => x === sb[i]);
      };

      let foundLeft = false;
      let foundRight = false;

      for (const memberId of memberIds) {
        const mySiblings = siblingsById.get(memberId) || new Set();
        const myParents = (parentsById.get(memberId) || []).filter(Boolean);

        for (const otherItem of nodeItems) {
          if (otherItem.id === item.id) continue;
          if (otherItem.kind !== 'couple') continue;
          
          // Mirar mi generación (hermanos) O la generación de mis hijos (padres)
          if (otherItem.gen !== item.gen && otherItem.gen !== item.gen + 1) continue;

          const leftId = otherItem.person1Id;
          const rightId = otherItem.person2Id;

          // ¿Soy hermano/padre del de la izquierda?
          const isRelatedToLeft = 
            (leftId ? mySiblings.has(leftId) : false) || 
            (myParents.length > 0 && sameParents(myParents, otherItem.p1Parents)) ||
            (item.kind === 'person' && (familyById.get(leftId)?.parents || []).includes(memberId)) ||
            (item.kind === 'couple' && (familyById.get(leftId)?.parents || []).some(p => memberIds.includes(p)));

          if (isRelatedToLeft) foundLeft = true;

          // ¿Soy hermano/padre del de la derecha?
          const isRelatedToRight = 
            (rightId ? mySiblings.has(rightId) : false) || 
            (myParents.length > 0 && sameParents(myParents, otherItem.p2Parents)) ||
            (item.kind === 'person' && (familyById.get(rightId)?.parents || []).includes(memberId)) ||
            (item.kind === 'couple' && (familyById.get(rightId)?.parents || []).some(p => memberIds.includes(p)));

          if (isRelatedToRight) foundRight = true;

          if (foundLeft && foundRight) break;
        }
        if (foundLeft && foundRight) break;
      }

      if (foundLeft && !foundRight) return -1000;
      if (foundRight && !foundLeft) return 1000;
      return 0;
    };

    const ensureCoupleOrderByParents = (item: NodeItem) => {
      if (item.kind !== 'couple') return;

      const p1Id = item.person1Id!;
      const p2Id = item.person2Id!;

      const p1Data = familyById.get(p1Id);
      const p2Data = familyById.get(p2Id);

      // Regla universal: [HOMBRE - MUJER].
      // Si tienen el mismo género o faltan datos, orden estable por ID.
      let shouldSwap = false;

      if (p2Data?.gender === 'Male' && p1Data?.gender === 'Female') {
        shouldSwap = true;
      } else if (p1Data?.gender === p2Data?.gender) {
        if (p1Id > p2Id) shouldSwap = true;
      }

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
    };

    // Aplicar el orden universal de parejas antes del layout.
    nodeItems.forEach(ensureCoupleOrderByParents);

    // 3. RECURSIVE LAYOUT LOGIC (Bottom-Up)
    const processedNodes = new Set<string>();

    // Precomputar si un subárbol contiene el foco para anclar el orden local.
    const subtreeHasFocusCache = new Map<string, boolean>();
    const subtreeHasFocusVisiting = new Set<string>();
    const subtreeHasFocus = (itemId: string): boolean => {
      if (itemId === focusContainerId) return true;
      const cached = subtreeHasFocusCache.get(itemId);
      if (cached !== undefined) return cached;
      if (subtreeHasFocusVisiting.has(itemId)) return false;

      subtreeHasFocusVisiting.add(itemId);
      const children = getChildrenOf(itemId);
      const has = children.some(ch => subtreeHasFocus(ch.id));
      subtreeHasFocusVisiting.delete(itemId);

      subtreeHasFocusCache.set(itemId, has);
      return has;
    };

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
      // Orden estable: izquierda (bias<0), luego rama del foco, luego neutros, luego derecha (bias>0)
      return roots.sort((a, b) => {
        const biasA = biasOfItem(a);
        const biasB = biasOfItem(b);
        const groupA = subtreeHasFocus(a.id) ? 1 : (biasA < 0 ? 0 : (biasA > 0 ? 3 : 2));
        const groupB = subtreeHasFocus(b.id) ? 1 : (biasB < 0 ? 0 : (biasB > 0 ? 3 : 2));

        if (groupA !== groupB) return groupA - groupB;
        if ((groupA === 0 || groupA === 3) && biasA !== biasB) return biasA - biasB;
        if (a.id < b.id) return -1;
        if (a.id > b.id) return 1;
        return 0;
      });
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
        const sortedChildren = [...children].sort((a, b) => {
          const biasA = biasOfItem(a);
          const biasB = biasOfItem(b);

          // Ancla: el hijo cuyo subárbol contiene al foco va en el centro local
          const groupA = subtreeHasFocus(a.id) ? 1 : (biasA < 0 ? 0 : (biasA > 0 ? 3 : 2));
          const groupB = subtreeHasFocus(b.id) ? 1 : (biasB < 0 ? 0 : (biasB > 0 ? 3 : 2));

          if (groupA !== groupB) return groupA - groupB;
          if ((groupA === 0 || groupA === 3) && biasA !== biasB) return biasA - biasB;
          if (a.id < b.id) return -1;
          if (a.id > b.id) return 1;
          return 0;
        });
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
