import React, { useMemo, useEffect, useRef, useState } from 'react';
import { ReactFlow, Background, Edge, Node, useReactFlow, ConnectionLineType, MiniMap } from '@xyflow/react';
import { toPng } from 'html-to-image';
import { useFamilyLogic } from '../hooks/useFamilyLogic';
import { PersonNode } from './PersonNode';
import { CoupleNode } from './CoupleNode';
import { BranchEdge } from './BranchEdge';
import { BranchLEdge } from './BranchLEdge';
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

const edgeTypes = {
  branch: BranchEdge,
  branchL: BranchLEdge,
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
        const nodeWidth = focusNode.type === 'couple' ? 260 : 130;
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
  const { focusId, viewRootId, theme, visualTheme, isExporting, setIsExporting } = useFamilyStore();
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
            // Para tema rústico: crear un div temporal con la imagen de fondo
            let bgDiv: HTMLDivElement | null = null;
            if (visualTheme === 'rustic') {
              bgDiv = document.createElement('div');
              bgDiv.style.cssText = `
                position: absolute;
                inset: 0;
                background-image: url('/utils/themeImageBackground/background1.png');
                background-repeat: no-repeat;
                background-position: center center;
                background-size: cover;
                filter: blur(1.5px);
                opacity: 0.55;
                z-index: -1;
              `;
              element.insertBefore(bgDiv, element.firstChild);
              
              // Añadir overlay de pergamino
              const overlayDiv = document.createElement('div');
              overlayDiv.style.cssText = `
                position: absolute;
                inset: 0;
                background: radial-gradient(
                  ellipse at center,
                  rgba(244, 228, 188, 0.25) 0%,
                  rgba(244, 228, 188, 0.35) 40%,
                  rgba(232, 212, 168, 0.45) 100%
                );
                z-index: -1;
              `;
              overlayDiv.className = 'temp-overlay-export';
              element.insertBefore(overlayDiv, element.firstChild);
            }

            // 3. Generar la imagen con alta calidad
            const dataUrl = await toPng(element, {
              backgroundColor: visualTheme === 'rustic' 
                ? '#b8a67a' // Color base del pergamino
                : (theme === 'dark' ? '#0e100a' : '#f4f5ef'),
              pixelRatio: 4, // Ultra alta calidad
              filter: (node) => {
                // Ocultar elementos innecesarios en la foto
                const exclusionClasses = [
                  'react-flow__controls',
                  'react-flow__attribution',
                  'react-flow__minimap'
                ];
                return !exclusionClasses.some(cls => node.classList?.contains(cls));
              }
            });

            // Limpiar elementos temporales
            if (bgDiv) {
              bgDiv.remove();
              element.querySelector('.temp-overlay-export')?.remove();
            }

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
  }, [isExporting, fitView, theme, visualTheme, setIsExporting]);

  const { nodes, edges } = useMemo(() => {
    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    const isRusticVisual = visualTheme === 'rustic';
    // En rústico dibujamos ramas con edgeTypes propios (barra horizontal compartida)
    const edgeType = isRusticVisual ? 'branchDrop' : 'smoothstep';

    const familyById = new Map<string, any>();
    familyNodes.forEach(p => familyById.set(p.id, p));

    // Tamaños responsivos (más compactos y con aire)
    const COUPLE_WIDTH = isMobile ? 200 : 260;
    const SINGLE_WIDTH = isMobile ? 100 : 130;
    const SIBLING_GAP = isMobile ? 20 : 40;      // Espacio entre hermanos (más juntos)
    const COUSIN_GAP = isMobile ? 60 : 120;      // Espacio entre primos (más separados)
    const VERTICAL_SPACING = isMobile ? 200 : 280; // Más aire vertical

    // Límites de generaciones para evitar solapamiento
    const MAX_ANCESTOR_DEPTH = 3;    // Padres, abuelos, bisabuelos
    const MAX_DESCENDANT_DEPTH = 2;  // Hijos, nietos

    const focusPerson = familyById.get(focusId);
    if (!focusPerson) return { nodes: [], edges: [] };

    const focusPartnerId = focusPerson.partners?.[0] || null;
    const focusPartner = focusPartnerId ? familyById.get(focusPartnerId) : null;

    const visited = new Set<string>();
    const nodePositions = new Map<string, { x: number; y: number }>();

    const getNodeById = (nodeId: string) => flowNodes.find(n => n.id === nodeId);

    const getNodeWidth = (node: Node | undefined) => {
      if (!node) return SINGLE_WIDTH;
      return node.type === 'couple' ? COUPLE_WIDTH : SINGLE_WIDTH;
    };

    const getTargetHandleX = (targetNodeId: string, personId: string, targetHandle?: string) => {
      const node = getNodeById(targetNodeId);
      const pos = nodePositions.get(targetNodeId) || node?.position;
      if (!node || !pos) return 0;

      const width = getNodeWidth(node);

      if (node.type === 'couple' && targetHandle?.startsWith('top-')) {
        const data: any = node.data;
        const isLeft = data?.person1?.id === personId;
        const isRight = data?.person2?.id === personId;
        const ratio = isLeft ? 0.25 : isRight ? 0.75 : 0.5;
        return pos.x + width * ratio;
      }

      // PersonNode: handle top ocupa todo el ancho; el centro funciona bien
      return pos.x + width / 2;
    };

    const getTargetTopY = (targetNodeId: string) => {
      const pos = nodePositions.get(targetNodeId);
      return pos ? pos.y : 0;
    };

    const getSourceBottomY = (sourceNodeId: string) => {
      const pos = nodePositions.get(sourceNodeId);
      // En este árbol usamos una altura visual estable (~140) para colocar la barra.
      const NODE_HEIGHT = 140;
      return pos ? pos.y + NODE_HEIGHT : 0;
    };

    const getSourceCenterX = (sourceNodeId: string) => {
      const node = getNodeById(sourceNodeId);
      const pos = nodePositions.get(sourceNodeId) || node?.position;
      if (!node || !pos) return 0;
      const width = getNodeWidth(node);
      return pos.x + width / 2;
    };

    /**
     * Crea UN SOLO edge que dibuja todo el sistema de ramas:
     * tronco + barra + todos los drops a los hijos.
     * Así los codos se ven perfectos sin superposiciones.
     */
    const addRusticBranchGroup = (
      sourceNodeId: string,
      groupKey: string,
      connections: Array<{ personId: string; targetNodeId: string; targetHandle?: string }>
    ) => {
      if (connections.length === 0) return;

      const childTopY = Math.min(...connections.map(c => getTargetTopY(c.targetNodeId)));
      const parentBottomY = getSourceBottomY(sourceNodeId);
      const barY = (parentBottomY + childTopY) / 2;

      // Calcular el centro exacto del nodo padre (para el tronco)
      const parentCenterX = getSourceCenterX(sourceNodeId);

      // Calcular todas las posiciones de los drops
      const allDrops = connections.map(c => {
        const x = getTargetHandleX(c.targetNodeId, c.personId, c.targetHandle);
        const y = getTargetTopY(c.targetNodeId);
        return { x, y };
      });

      // Crear edges: el primero dibuja todo, los demás son invisibles (para mantener la conexión lógica)
      connections.forEach((c, index) => {
        flowEdges.push({
          id: `edge-branchL-${groupKey}-${c.personId}`,
          source: sourceNodeId,
          target: c.targetNodeId,
          targetHandle: c.targetHandle,
          type: 'branchL',
          data: { 
            barY, 
            allDrops,
            parentCenterX,
            isFirst: index === 0 
          },
        });
      });
    };

    // ===== FUNCIONES AUXILIARES =====

    const getSiblings = (personId: string): any[] => {
      const person = familyById.get(personId);
      if (!person) return [];
      const siblings = new Set<string>(person.siblings || []);
      if (person.parents?.length > 0) {
        familyNodes.forEach(other => {
          if (other.id !== personId && other.parents?.length > 0) {
            if (person.parents.some((p: string) => other.parents.includes(p))) {
              siblings.add(other.id);
            }
          }
        });
      }
      return Array.from(siblings).map(id => familyById.get(id)).filter(Boolean)
        .sort((a, b) => (a.birthDate || '').localeCompare(b.birthDate || '') || a.id.localeCompare(b.id));
    };

    // Calcular ancho de subárbol de descendientes (con límite de profundidad)
    const calcDescendantsWidth = (personIds: string[], visitedCalc: Set<string>, depth: number = 0): number => {
      // Limitar profundidad
      if (depth >= MAX_DESCENDANT_DEPTH) {
        return personIds.length === 2 ? COUPLE_WIDTH : SINGLE_WIDTH;
      }

      const childrenSet = new Set<string>();
      personIds.forEach(pId => {
        const p = familyById.get(pId);
        p?.children?.forEach((cId: string) => {
          if (!visitedCalc.has(cId)) childrenSet.add(cId);
        });
      });

      if (childrenSet.size === 0) {
        return personIds.length === 2 ? COUPLE_WIDTH : SINGLE_WIDTH;
      }

      const children = Array.from(childrenSet).map(id => familyById.get(id)).filter(Boolean);
      const processed = new Set<string>();
      let totalWidth = 0;
      let blockCount = 0;

      children.forEach(child => {
        if (processed.has(child.id)) return;
        processed.add(child.id);
        blockCount++;

        const partnerId = child.partners?.[0];
        // Considerar pareja si es otro hijo O si existe en familyById y no está visitada
        // Esto asegura que las parejas "externas" también se consideren para el ancho
        const partnerIsChild = partnerId && children.some(c => c.id === partnerId);
        const partner = partnerId && !visitedCalc.has(partnerId) ? familyById.get(partnerId) : null;

        if (partner) {
          if (partnerIsChild) {
            processed.add(partner.id);
            // No incrementar blockCount porque esta pareja ya es un hijo procesado
          }
          const newVisited = new Set([...visitedCalc, child.id, partner.id]);
          // El hijo con pareja ocupa al menos COUPLE_WIDTH
          const childWidth = Math.max(COUPLE_WIDTH, calcDescendantsWidth([child.id, partner.id], newVisited, depth + 1));
          totalWidth += childWidth;
        } else {
          const newVisited = new Set([...visitedCalc, child.id]);
          // Hijo soltero ocupa al menos SINGLE_WIDTH
          const childWidth = Math.max(SINGLE_WIDTH, calcDescendantsWidth([child.id], newVisited, depth + 1));
          totalWidth += childWidth;
        }
      });

      // Usar blockCount para el espaciado (no processed.size que puede incluir parejas duplicadas)
      totalWidth += Math.max(0, blockCount - 1) * SIBLING_GAP;
      const baseWidth = personIds.length === 2 ? COUPLE_WIDTH : SINGLE_WIDTH;
      return Math.max(baseWidth, totalWidth);
    };

    // Renderizar descendientes (con límite de profundidad)
    const renderDescendants = (parentIds: string[], centerX: number, baseY: number, depth: number = 0) => {
      // Limitar profundidad
      if (depth >= MAX_DESCENDANT_DEPTH) return;

      const childrenSet = new Set<string>();
      parentIds.forEach(pId => {
        const p = familyById.get(pId);
        p?.children?.forEach((cId: string) => {
          if (!visited.has(cId)) childrenSet.add(cId);
        });
      });

      const children = Array.from(childrenSet).map(id => familyById.get(id)).filter(Boolean)
        .sort((a, b) => (a.birthDate || '').localeCompare(b.birthDate || '') || a.id.localeCompare(b.id));

      if (children.length === 0) return;

      // Resolver nodo fuente 1 vez (para toda la camada de hermanos)
      const parentCoupleNode = flowNodes.find(n =>
        n.type === 'couple' && parentIds.some(pId =>
          (n.data as any).person1?.id === pId || (n.data as any).person2?.id === pId
        )
      );
      const parentSingleNode = flowNodes.find(n => parentIds.includes(n.id) && n.type === 'person');
      const sourceNode = parentCoupleNode || parentSingleNode;
      const pendingConnections: Array<{ personId: string; targetNodeId: string; targetHandle?: string }> = [];

      const childY = baseY + VERTICAL_SPACING;
      const blocks: { ids: string[], width: number, partnerIsChild: boolean }[] = [];
      const processed = new Set<string>();

      children.forEach(child => {
        if (processed.has(child.id)) return;
        processed.add(child.id);

        const partnerId = child.partners?.[0];
        // Buscar pareja en todo familyById, no solo entre children
        // Así se incluyen parejas de fuera de la familia (ej: marido de Julia)
        const partner = partnerId && !visited.has(partnerId) ? familyById.get(partnerId) : null;
        const partnerIsChild = partnerId && children.some(c => c.id === partnerId);

        if (partner) {
          processed.add(partner.id);
          // Si la pareja es también un hijo, calcular descendientes de ambos
          // Si la pareja es de fuera, también incluir ambos IDs porque pueden tener hijos juntos
          const idsForWidth = [child.id, partner.id];

          // NOTA: Para medir el ancho, el set de 'visited' no debe incluir a los hijos que estamos midiendo
          const estimationVisited = new Set(visited);
          idsForWidth.forEach(id => estimationVisited.delete(id));
          const descendantsWidth = calcDescendantsWidth(idsForWidth, estimationVisited);

          // Ancho mínimo es COUPLE_WIDTH para parejas
          const width = Math.max(COUPLE_WIDTH, descendantsWidth);
          blocks.push({ ids: [child.id, partner.id], width, partnerIsChild: partnerIsChild ?? false });
        } else {
          const estimationVisited = new Set(visited);
          estimationVisited.delete(child.id);
          const descendantsWidth = calcDescendantsWidth([child.id], estimationVisited);

          // Ancho mínimo es SINGLE_WIDTH para solteros
          const width = Math.max(SINGLE_WIDTH, descendantsWidth);
          blocks.push({ ids: [child.id], width, partnerIsChild: false });
        }
      });

      const totalWidth = blocks.reduce((sum, b) => sum + b.width, 0) + (blocks.length - 1) * SIBLING_GAP;
      let currentX = centerX - totalWidth / 2;

      blocks.forEach(block => {
        const blockCenterX = currentX + block.width / 2;

        if (block.ids.length === 2) {
          const [c1, c2] = block.ids.map(id => familyById.get(id));
          // En parejas de hijos, mantenemos el orden estándar o por género
          const [p1, p2] = c1.gender === 'Male' ? [c1, c2] : [c2, c1];
          const coupleId = `couple-${p1.id}-${p2.id}`;

          visited.add(p1.id);
          visited.add(p2.id);

          const nodeX = blockCenterX - COUPLE_WIDTH / 2;
          flowNodes.push({
            id: coupleId,
            type: 'couple',
            position: { x: nodeX, y: childY },
            data: { person1: p1, person2: p2 },
          });
          nodePositions.set(coupleId, { x: nodeX, y: childY });

          if (sourceNode) {
            if (parentIds.includes(p1.id) || p1.parents?.some((pid: string) => parentIds.includes(pid))) {
              pendingConnections.push({ personId: p1.id, targetNodeId: coupleId, targetHandle: `top-${p1.id}` });
            }
            if (parentIds.includes(p2.id) || p2.parents?.some((pid: string) => parentIds.includes(pid))) {
              pendingConnections.push({ personId: p2.id, targetNodeId: coupleId, targetHandle: `top-${p2.id}` });
            }
          }

          renderDescendants([p1.id, p2.id], blockCenterX, childY, depth + 1);
        } else {
          const child = familyById.get(block.ids[0]);
          visited.add(child.id);

          const nodeX = blockCenterX - SINGLE_WIDTH / 2;
          flowNodes.push({
            id: child.id,
            type: 'person',
            position: { x: nodeX, y: childY },
            data: child,
          });
          nodePositions.set(child.id, { x: nodeX, y: childY });

          if (sourceNode) {
            pendingConnections.push({ personId: child.id, targetNodeId: child.id });
          }

          renderDescendants([child.id], blockCenterX, childY, depth + 1);
        }

        currentX += block.width + SIBLING_GAP;
      });

      if (sourceNode) {
        const groupKey = `${sourceNode.id}-desc-${depth}-${Math.round(childY)}`;

        if (isRusticVisual) {
          addRusticBranchGroup(sourceNode.id, groupKey, pendingConnections);
        } else {
          pendingConnections.forEach(c => {
            flowEdges.push({
              id: `edge-${sourceNode.id}-to-${c.personId}`,
              source: sourceNode.id,
              target: c.targetNodeId,
              targetHandle: c.targetHandle,
              type: edgeType,
            });
          });
        }
      }
    };

    // Calcular ancho de rama ancestral (hacia arriba)
    // Calcular "holgura" necesaria a los lados de un bloque
    const calcAncestorBranchClearance = (personIds: string[], visitedCalc: Set<string>, depth: number = 0): { left: number; right: number } => {
      const parentsSet = new Set<string>();
      personIds.forEach(pId => {
        const p = familyById.get(pId);
        p?.parents?.forEach((pid: string) => {
          if (!visitedCalc.has(pid)) parentsSet.add(pid);
        });
      });

      if (parentsSet.size === 0) {
        return { left: 0, right: 0 };
      }

      const parents = Array.from(parentsSet).map(id => familyById.get(id)).filter(Boolean);
      let p1 = parents[0];
      let p2 = parents.length > 1 ? parents[1] : null;
      if (p2 && p1.gender === 'Female' && p2.gender === 'Male') [p1, p2] = [p2, p1];

      const newVisited = new Set([...visitedCalc, p1.id]);
      if (p2) newVisited.add(p2.id);

      // Si hay profundidad 0, estamos en el nivel de tíos/primos
      let leftSibsWidth = 0;
      let rightSibsWidth = 0;

      if (depth === 0) {
        const sibs1 = getSiblings(p1.id).filter(s => !visitedCalc.has(s.id) && !newVisited.has(s.id));
        sibs1.forEach(s => {
          const sibEstVisited = new Set(newVisited);
          sibEstVisited.delete(s.id);
          leftSibsWidth += Math.max(SINGLE_WIDTH, calcDescendantsWidth([s.id], sibEstVisited)) + COUSIN_GAP;
        });

        if (p2) {
          const sibs2 = getSiblings(p2.id).filter(s => !visitedCalc.has(s.id) && !newVisited.has(s.id));
          sibs2.forEach(s => {
            const sibEstVisited = new Set(newVisited);
            sibEstVisited.delete(s.id);
            rightSibsWidth += Math.max(SINGLE_WIDTH, calcDescendantsWidth([s.id], sibEstVisited)) + COUSIN_GAP;
          });
        }
      }

      const parentNodeWidth = p2 ? COUPLE_WIDTH : SINGLE_WIDTH;
      const c1 = calcAncestorBranchClearance([p1.id], newVisited, depth + 1);
      const c2 = p2 ? calcAncestorBranchClearance([p2.id], newVisited, depth + 1) : { left: 0, right: 0 };

      // Holgura necesaria a la izquierda y derecha del centro de estos padres
      return {
        left: Math.max(leftSibsWidth, c1.left + c1.right + COUSIN_GAP),
        right: Math.max(rightSibsWidth, c2.left + c2.right + COUSIN_GAP)
      };
    };

    // Renderizar ancestros simplificado (solo padres directos, sin hermanos laterales para evitar solapamiento)
    const renderAncestors = (
      childrenNodes: any[],
      groupCenterX: number,
      baseY: number,
      depth: number = 0
    ) => {
      if (depth >= MAX_ANCESTOR_DEPTH || childrenNodes.length === 0) return;

      const parentY = baseY - VERTICAL_SPACING;
      const parentsSet = new Set<string>();
      childrenNodes.forEach(child => child.parents?.forEach((pId: string) => parentsSet.add(pId)));
      const parents = Array.from(parentsSet).map(id => familyById.get(id)).filter(p => p && !visited.has(p.id));

      if (parents.length === 0) return;

      let p1 = parents[0];
      let p2 = parents.length > 1 ? parents[1] : null;
      if (p2 && p1.gender === 'Female' && p2.gender === 'Male') [p1, p2] = [p2, p1];

      visited.add(p1.id);
      if (p2) visited.add(p2.id);

      // --- ESTRATEGIA: PADRES SIEMPRE CENTRADOS ---
      const parentNodeWidth = p2 ? COUPLE_WIDTH : SINGLE_WIDTH;
      // Los padres se colocan EXACTAMENTE sobre el centro del grupo de hijos que los originó
      const parentsNodeX = groupCenterX - parentNodeWidth / 2;
      const parentsCenterX = groupCenterX;

      if (p2) {
        const coupleId = `couple-${p1.id}-${p2.id}`;
        flowNodes.push({
          id: coupleId,
          type: 'couple',
          position: { x: parentsNodeX, y: parentY },
          data: { person1: p1, person2: p2 },
        });
        nodePositions.set(coupleId, { x: parentsNodeX, y: parentY });

        // Conectar a todos los hijos
        {
          const pendingConnections: Array<{ personId: string; targetNodeId: string; targetHandle?: string }> = [];
          childrenNodes.forEach(child => {
            const childNode = flowNodes.find(n =>
              n.id === child.id ||
              (n.type === 'couple' && ((n.data as any).person1?.id === child.id || (n.data as any).person2?.id === child.id))
            );
            if (!childNode) return;
            const targetHandle = childNode.type === 'couple' ? `top-${child.id}` : undefined;
            pendingConnections.push({ personId: child.id, targetNodeId: childNode.id, targetHandle });
          });

          const groupKey = `${coupleId}-anc-${depth}-${Math.round(baseY)}`;
          if (isRusticVisual) {
            addRusticBranchGroup(coupleId, groupKey, pendingConnections);
          } else {
            pendingConnections.forEach(c => {
              flowEdges.push({
                id: `edge-${coupleId}-to-${c.personId}`,
                source: coupleId,
                target: c.targetNodeId,
                targetHandle: c.targetHandle,
                type: edgeType,
              });
            });
          }
        }

        // --- TÍOS (Hermanos de los padres) ---
        let p1Siblings: any[] = [];
        let p2Siblings: any[] = [];
        if (depth === 0) {
          p1Siblings = getSiblings(p1.id).filter(s => !visited.has(s.id));
          p2Siblings = getSiblings(p2.id).filter(s => !visited.has(s.id));
        }

        // Calcular ancho del grupo de descendientes centrales para saber cuánto espacio dejar
        // Necesitamos encontrar las posiciones reales de los nodos ya renderizados para calcular el ancho
        let centralLeftMost = parentsCenterX - COUPLE_WIDTH / 2;
        let centralRightMost = parentsCenterX + COUPLE_WIDTH / 2;
        
        // Buscar TODOS los nodos ya renderizados para encontrar los extremos
        // Esto incluye hijos, nietos y cualquier descendiente ya posicionado
        flowNodes.forEach(n => {
          const pos = nodePositions.get(n.id);
          if (pos) {
            const width = n.type === 'couple' ? COUPLE_WIDTH : SINGLE_WIDTH;
            centralLeftMost = Math.min(centralLeftMost, pos.x);
            centralRightMost = Math.max(centralRightMost, pos.x + width);
          }
        });
        
        // Añadir padding extra para primos
        const centralHalfWidth = Math.max(
          (centralRightMost - centralLeftMost) / 2 + COUSIN_GAP,
          COUPLE_WIDTH
        );

        // Posicionar tíos de p1 (izquierda)
        let p1GroupLeft = parentsNodeX;
        let p1GroupRight = parentsNodeX + (p2 ? COUPLE_WIDTH / 2 : SINGLE_WIDTH);

        // Cuando no hay hermanos (depth > 0), establecer límites separados para cada padre
        // para que los bisabuelos queden bien separados
        if (p1Siblings.length === 0 && depth > 0) {
          // p1 está en la mitad izquierda del couple, su grupo debe extenderse a la izquierda
          p1GroupLeft = parentsNodeX - COUSIN_GAP / 2;
          p1GroupRight = parentsNodeX + COUPLE_WIDTH / 4;
        }

        let leftBoundaryX = parentsCenterX - centralHalfWidth - COUSIN_GAP;
        p1Siblings.forEach(sib => {
          const sibEstVisited = new Set(visited);
          sibEstVisited.delete(sib.id);
          
          // Verificar si el tío tiene pareja
          const sibPartnerId = sib.partners?.[0];
          const sibPartner = sibPartnerId && !visited.has(sibPartnerId) ? familyById.get(sibPartnerId) : null;
          
          if (sibPartner) {
            // Tío con pareja política - renderizar como CoupleNode
            const sibDescWidth = Math.max(COUPLE_WIDTH, calcDescendantsWidth([sib.id, sibPartner.id], sibEstVisited));
            const sibWidth = Math.max(COUPLE_WIDTH, sibDescWidth);
            const sibCenterX = leftBoundaryX - sibWidth / 2;
            const nodeX = sibCenterX - COUPLE_WIDTH / 2;
            
            // Ordenar: hombre a la izquierda
            const [uncle1, uncle2] = sib.gender === 'Male' ? [sib, sibPartner] : [sibPartner, sib];
            const coupleId = `couple-${uncle1.id}-${uncle2.id}`;

            visited.add(sib.id);
            visited.add(sibPartner.id);
            flowNodes.push({
              id: coupleId,
              type: 'couple',
              position: { x: nodeX, y: parentY },
              data: { person1: uncle1, person2: uncle2 },
            });
            nodePositions.set(coupleId, { x: nodeX, y: parentY });
            renderDescendants([sib.id, sibPartner.id], sibCenterX, parentY, 1);

            p1GroupLeft = Math.min(p1GroupLeft, nodeX);
            leftBoundaryX -= sibWidth + COUSIN_GAP;
          } else {
            // Tío soltero - renderizar como nodo individual
            const sibDescWidth = Math.max(SINGLE_WIDTH, calcDescendantsWidth([sib.id], sibEstVisited));
            const sibWidth = Math.max(SINGLE_WIDTH, sibDescWidth);
            const sibCenterX = leftBoundaryX - sibWidth / 2;
            const nodeX = sibCenterX - SINGLE_WIDTH / 2;

            visited.add(sib.id);
            flowNodes.push({ id: sib.id, type: 'person', position: { x: nodeX, y: parentY }, data: sib });
            nodePositions.set(sib.id, { x: nodeX, y: parentY });
            renderDescendants([sib.id], sibCenterX, parentY, 1);

            p1GroupLeft = Math.min(p1GroupLeft, nodeX);
            leftBoundaryX -= sibWidth + COUSIN_GAP;
          }
        });
        const p1GroupCenterX = (p1GroupLeft + p1GroupRight) / 2;

        // Posicionar tíos de p2 (derecha)
        let p2GroupLeft = parentsNodeX + (p2 ? COUPLE_WIDTH / 2 : 0);
        let p2GroupRight = parentsNodeX + parentNodeWidth;

        // Cuando no hay hermanos (depth > 0), establecer límites separados para cada padre
        if (p2Siblings.length === 0 && depth > 0 && p2) {
          // p2 está en la mitad derecha del couple, su grupo debe extenderse a la derecha
          p2GroupLeft = parentsNodeX + 3 * COUPLE_WIDTH / 4;
          p2GroupRight = parentsNodeX + COUPLE_WIDTH + COUSIN_GAP / 2;
        }

        let rightBoundaryX = parentsCenterX + centralHalfWidth + COUSIN_GAP;
        p2Siblings.forEach(sib => {
          const sibEstVisited = new Set(visited);
          sibEstVisited.delete(sib.id);
          
          // Verificar si el tío tiene pareja
          const sibPartnerId = sib.partners?.[0];
          const sibPartner = sibPartnerId && !visited.has(sibPartnerId) ? familyById.get(sibPartnerId) : null;
          
          if (sibPartner) {
            // Tío con pareja política - renderizar como CoupleNode
            const sibDescWidth = Math.max(COUPLE_WIDTH, calcDescendantsWidth([sib.id, sibPartner.id], sibEstVisited));
            const sibWidth = Math.max(COUPLE_WIDTH, sibDescWidth);
            const sibCenterX = rightBoundaryX + sibWidth / 2;
            const nodeX = sibCenterX - COUPLE_WIDTH / 2;
            
            // Ordenar: hombre a la izquierda
            const [uncle1, uncle2] = sib.gender === 'Male' ? [sib, sibPartner] : [sibPartner, sib];
            const coupleId = `couple-${uncle1.id}-${uncle2.id}`;

            visited.add(sib.id);
            visited.add(sibPartner.id);
            flowNodes.push({
              id: coupleId,
              type: 'couple',
              position: { x: nodeX, y: parentY },
              data: { person1: uncle1, person2: uncle2 },
            });
            nodePositions.set(coupleId, { x: nodeX, y: parentY });
            renderDescendants([sib.id, sibPartner.id], sibCenterX, parentY, 1);

            p2GroupRight = Math.max(p2GroupRight, nodeX + COUPLE_WIDTH);
            rightBoundaryX += sibWidth + COUSIN_GAP;
          } else {
            // Tío soltero - renderizar como nodo individual
            const sibDescWidth = Math.max(SINGLE_WIDTH, calcDescendantsWidth([sib.id], sibEstVisited));
            const sibWidth = Math.max(SINGLE_WIDTH, sibDescWidth);
            const sibCenterX = rightBoundaryX + sibWidth / 2;
            const nodeX = sibCenterX - SINGLE_WIDTH / 2;

            visited.add(sib.id);
            flowNodes.push({ id: sib.id, type: 'person', position: { x: nodeX, y: parentY }, data: sib });
            nodePositions.set(sib.id, { x: nodeX, y: parentY });
            renderDescendants([sib.id], sibCenterX, parentY, 1);

            p2GroupRight = Math.max(p2GroupRight, nodeX + SINGLE_WIDTH);
            rightBoundaryX += sibWidth + COUSIN_GAP;
          }
        });
        const p2GroupCenterX = (p2GroupLeft + p2GroupRight) / 2;

        // --- RECURSIÓN: SUBIR A ABUELOS/BISABUELOS ---
        // Cuando no hay hermanos (depth > 0), necesitamos asegurar separación entre grupos
        // Calcular el offset necesario para que los grupos no se solapen
        const minSeparation = COUPLE_WIDTH + COUSIN_GAP;
        const currentSeparation = Math.abs(p2GroupCenterX - p1GroupCenterX);
        
        if (currentSeparation < minSeparation && depth > 0) {
          // Si los centros están muy juntos, separar los grupos
          const adjustment = (minSeparation - currentSeparation) / 2;
          renderAncestors([p1, ...p1Siblings], p1GroupCenterX - adjustment, parentY, depth + 1);
          renderAncestors([p2, ...p2Siblings], p2GroupCenterX + adjustment, parentY, depth + 1);
        } else {
          renderAncestors([p1, ...p1Siblings], p1GroupCenterX, parentY, depth + 1);
          renderAncestors([p2, ...p2Siblings], p2GroupCenterX, parentY, depth + 1);
        }

      } else {
        // Padre soltero
        flowNodes.push({ id: p1.id, type: 'person', position: { x: parentsNodeX, y: parentY }, data: p1 });
        nodePositions.set(p1.id, { x: parentsNodeX, y: parentY });

        if (isRusticVisual) {
          const pendingConnections: Array<{ personId: string; targetNodeId: string; targetHandle?: string }> = [];
          childrenNodes.forEach(child => {
            const childNode = flowNodes.find(n =>
              n.id === child.id ||
              (n.type === 'couple' && ((n.data as any).person1?.id === child.id || (n.data as any).person2?.id === child.id))
            );
            if (!childNode) return;
            const targetHandle = childNode.type === 'couple' ? `top-${child.id}` : undefined;
            pendingConnections.push({ personId: child.id, targetNodeId: childNode.id, targetHandle });
          });

          const groupKey = `${p1.id}-anc-${depth}-${Math.round(baseY)}`;
          addRusticBranchGroup(p1.id, groupKey, pendingConnections);
        } else {
          childrenNodes.forEach(child => {
            const childNode = flowNodes.find(n =>
              n.id === child.id ||
              (n.type === 'couple' && ((n.data as any).person1?.id === child.id || (n.data as any).person2?.id === child.id))
            );
            if (!childNode) return;
            const targetHandle = childNode.type === 'couple' ? `top-${child.id}` : undefined;
            flowEdges.push({
              id: `edge-${p1.id}-to-${child.id}`,
              source: p1.id,
              target: childNode.id,
              targetHandle,
              type: edgeType,
            });
          });
        }

        renderAncestors([p1], parentsCenterX, parentY, depth + 1);
      }
    };

    // ===== RENDERIZADO PRINCIPAL (MARIPOSA) =====
    const centerY = 0;

    if (focusPartner) {
      // El foco siempre va a la izquierda (p1), su pareja a la derecha (p2)
      // Solo mostramos la familia del foco, NO la familia extendida del cónyuge
      const [p1, p2] = [focusPerson, focusPartner];
      const focusCoupleId = `couple-${p1.id}-${p2.id}`;

      visited.add(p1.id);
      visited.add(p2.id);

      flowNodes.push({
        id: focusCoupleId,
        type: 'couple',
        position: { x: -COUPLE_WIDTH / 2, y: centerY },
        data: { person1: p1, person2: p2 },
      });
      nodePositions.set(focusCoupleId, { x: -COUPLE_WIDTH / 2, y: centerY });

      // Calcular ancho de los descendientes del foco ANTES de renderizar
      // NOTA: Para la estimación inicial, no pasamos nada en visited para que cuente todo el subárbol
      const focusDescendantsWidth = calcDescendantsWidth([p1.id, p2.id], new Set());
      const halfDescendantsWidth = Math.max(COUPLE_WIDTH / 2, focusDescendantsWidth / 2);

      // Descendientes (abajo, centrados)
      renderDescendants([p1.id, p2.id], 0, centerY);

      // Solo mostrar hermanos del foco, NO hermanos del cónyuge
      const focusSiblings = getSiblings(focusId).filter(s => !visited.has(s.id));

      // IZQUIERDA: Hermanos del foco + ancestros del foco
      // Posicionar después del ancho de los descendientes del foco
      const leftBaseX = -halfDescendantsWidth - SIBLING_GAP;
      let leftX = leftBaseX;
      
      // Rastrear el extremo izquierdo del grupo completo de hermanos
      let groupLeftMost = -halfDescendantsWidth;

      focusSiblings.forEach(sib => {
        visited.add(sib.id);

        // Verificar si el hermano tiene pareja
        const sibPartnerId = sib.partners?.[0];
        const sibPartner = sibPartnerId ? familyById.get(sibPartnerId) : null;

        if (sibPartner && !visited.has(sibPartner.id)) {
          // Renderizar como CoupleNode
          visited.add(sibPartner.id);

          const estimationVisited = new Set(visited);
          estimationVisited.delete(sib.id);
          estimationVisited.delete(sibPartner.id);
          const descendantsWidth = calcDescendantsWidth([sib.id, sibPartner.id], estimationVisited);
          // Usar el máximo entre el ancho del nodo y los descendientes para mantener espaciado uniforme
          const sibWidth = Math.max(COUPLE_WIDTH, descendantsWidth);

          const sibCenterX = leftX - sibWidth / 2;

          // Ordenar por género: hombre a la izquierda
          const [sp1, sp2] = sib.gender === 'Male' ? [sib, sibPartner] : [sibPartner, sib];
          const coupleId = `couple-${sp1.id}-${sp2.id}`;
          const nodeX = sibCenterX - COUPLE_WIDTH / 2;

          flowNodes.push({
            id: coupleId,
            type: 'couple',
            position: { x: nodeX, y: centerY },
            data: { person1: sp1, person2: sp2 },
          });
          nodePositions.set(coupleId, { x: nodeX, y: centerY });
          renderDescendants([sp1.id, sp2.id], sibCenterX, centerY);

          groupLeftMost = Math.min(groupLeftMost, sibCenterX - sibWidth / 2);
          leftX -= sibWidth + SIBLING_GAP;
        } else {
          const estimationVisited = new Set(visited);
          estimationVisited.delete(sib.id);
          const descendantsWidth = calcDescendantsWidth([sib.id], estimationVisited);
          // Usar el máximo entre el ancho del nodo y los descendientes para mantener espaciado uniforme
          const sibWidth = Math.max(SINGLE_WIDTH, descendantsWidth);

          const sibCenterX = leftX - sibWidth / 2;
          const nodeX = sibCenterX - SINGLE_WIDTH / 2;

          flowNodes.push({
            id: sib.id,
            type: 'person',
            position: { x: nodeX, y: centerY },
            data: sib,
          });
          nodePositions.set(sib.id, { x: nodeX, y: centerY });
          renderDescendants([sib.id], sibCenterX, centerY);

          groupLeftMost = Math.min(groupLeftMost, sibCenterX - sibWidth / 2);
          leftX -= sibWidth + SIBLING_GAP;
        }
      });

      // El Foco (pareja central) está en X=0. Sus hermanos están a la izquierda.
      // Calculamos el centro REAL de todo el grupo de hijos para que los padres (Marcelo/Julia) queden encima.
      const focusGroupLeft = groupLeftMost;
      const focusGroupRight = halfDescendantsWidth;
      const focusGroupCenterX = (focusGroupLeft + focusGroupRight) / 2;

      renderAncestors([focusPerson, ...focusSiblings], focusGroupCenterX, centerY);

      // NO renderizar hermanos ni ancestros del cónyuge - solo mostramos al cónyuge

    } else {
      // Foco sin pareja
      visited.add(focusId);
      flowNodes.push({
        id: focusId,
        type: 'person',
        position: { x: -SINGLE_WIDTH / 2, y: centerY },
        data: focusPerson,
      });
      nodePositions.set(focusId, { x: -SINGLE_WIDTH / 2, y: centerY });

      renderDescendants([focusId], 0, centerY);

      const siblings = getSiblings(focusId).filter(s => !visited.has(s.id));
      
      // Calcular ancho de descendientes del foco para saber el extremo derecho
      const focusDescWidth = calcDescendantsWidth([focusId], new Set());
      const focusHalfWidth = Math.max(SINGLE_WIDTH / 2, focusDescWidth / 2);
      
      let leftX = -focusHalfWidth - SIBLING_GAP;
      let groupLeftMost = -focusHalfWidth;

      siblings.forEach(sib => {
        visited.add(sib.id);

        // Verificar si el hermano tiene pareja
        const sibPartnerId = sib.partners?.[0];
        const sibPartner = sibPartnerId ? familyById.get(sibPartnerId) : null;

        if (sibPartner && !visited.has(sibPartner.id)) {
          // Renderizar como CoupleNode
          visited.add(sibPartner.id);

          const estimationVisited = new Set(visited);
          estimationVisited.delete(sib.id);
          estimationVisited.delete(sibPartner.id);
          const descendantsWidth = calcDescendantsWidth([sib.id, sibPartner.id], estimationVisited);
          const sibWidth = Math.max(COUPLE_WIDTH, descendantsWidth);

          const sibCenterX = leftX - sibWidth / 2;

          // Ordenar por género: hombre a la izquierda
          const [sp1, sp2] = sib.gender === 'Male' ? [sib, sibPartner] : [sibPartner, sib];
          const coupleId = `couple-${sp1.id}-${sp2.id}`;
          const nodeX = sibCenterX - COUPLE_WIDTH / 2;

          flowNodes.push({
            id: coupleId,
            type: 'couple',
            position: { x: nodeX, y: centerY },
            data: { person1: sp1, person2: sp2 },
          });
          nodePositions.set(coupleId, { x: nodeX, y: centerY });
          renderDescendants([sp1.id, sp2.id], sibCenterX, centerY);

          groupLeftMost = Math.min(groupLeftMost, sibCenterX - sibWidth / 2);
          leftX -= sibWidth + SIBLING_GAP;
        } else {
          const estimationVisited = new Set(visited);
          estimationVisited.delete(sib.id);
          const descendantsWidth = calcDescendantsWidth([sib.id], estimationVisited);
          const sibWidth = Math.max(SINGLE_WIDTH, descendantsWidth);

          const sibCenterX = leftX - sibWidth / 2;
          const nodeX = sibCenterX - SINGLE_WIDTH / 2;

          flowNodes.push({
            id: sib.id,
            type: 'person',
            position: { x: nodeX, y: centerY },
            data: sib,
          });
          nodePositions.set(sib.id, { x: nodeX, y: centerY });

          renderDescendants([sib.id], sibCenterX, centerY);
          groupLeftMost = Math.min(groupLeftMost, sibCenterX - sibWidth / 2);
          leftX -= sibWidth + SIBLING_GAP;
        }
      });

      // Calculamos el centro REAL del grupo
      const focusGroupLeft = groupLeftMost;
      const focusGroupRight = focusHalfWidth;
      const focusGroupCenterX = (focusGroupLeft + focusGroupRight) / 2;

      renderAncestors([focusPerson, ...siblings], focusGroupCenterX, centerY);
    }

    return { nodes: flowNodes, edges: flowEdges };
  }, [familyNodes, viewRootId, isMobile, focusId, visualTheme]);

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
        fitViewOptions={{ padding: 0.6, duration: 400 }}
        connectionLineType={ConnectionLineType.SmoothStep}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{
          type: visualTheme === 'rustic' ? 'branch' : 'smoothstep',
          pathOptions: { borderRadius: 20 },
          style: visualTheme === 'rustic' ? undefined : { stroke: '#64748b', strokeWidth: 4 },
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
