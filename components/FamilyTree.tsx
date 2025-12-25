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

    const familyById = new Map<string, any>();
    familyNodes.forEach(p => familyById.set(p.id, p));

    // Tamaños responsivos (ajustados para evitar solapamientos)
    const COUPLE_WIDTH = isMobile ? 140 : 210;
    const SINGLE_WIDTH = isMobile ? 70 : 100;
    const HORIZONTAL_GAP = isMobile ? 40 : 100;
    const VERTICAL_SPACING = isMobile ? 160 : 220;

    const focusPerson = familyById.get(focusId);
    if (!focusPerson) return { nodes: [], edges: [] };

    const focusPartnerId = focusPerson.partners?.[0] || null;
    const focusPartner = focusPartnerId ? familyById.get(focusPartnerId) : null;

    const visited = new Set<string>();
    const nodePositions = new Map<string, { x: number; y: number }>();

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

    // Calcular ancho de subárbol de descendientes
    const calcDescendantsWidth = (personIds: string[], visitedCalc: Set<string>): number => {
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

      children.forEach(child => {
        if (processed.has(child.id)) return;
        processed.add(child.id);

        const partnerId = child.partners?.[0];
        const partner = partnerId && children.some(c => c.id === partnerId) ? familyById.get(partnerId) : null;

        if (partner) {
          processed.add(partner.id);
          const newVisited = new Set([...visitedCalc, child.id, partner.id]);
          totalWidth += calcDescendantsWidth([child.id, partner.id], newVisited);
        } else {
          const newVisited = new Set([...visitedCalc, child.id]);
          totalWidth += calcDescendantsWidth([child.id], newVisited);
        }
      });

      totalWidth += Math.max(0, processed.size - 1) * HORIZONTAL_GAP;
      const baseWidth = personIds.length === 2 ? COUPLE_WIDTH : SINGLE_WIDTH;
      return Math.max(baseWidth, totalWidth);
    };

    // Renderizar descendientes
    const renderDescendants = (parentIds: string[], centerX: number, baseY: number) => {
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

      const childY = baseY + VERTICAL_SPACING;
      const blocks: { ids: string[], width: number }[] = [];
      const processed = new Set<string>();

      children.forEach(child => {
        if (processed.has(child.id)) return;
        processed.add(child.id);

        const partnerId = child.partners?.[0];
        const partner = partnerId && children.some(c => c.id === partnerId) ? familyById.get(partnerId) : null;

        if (partner) {
          processed.add(partner.id);
          const width = calcDescendantsWidth([child.id, partner.id], new Set([...visited, child.id, partner.id]));
          blocks.push({ ids: [child.id, partner.id], width });
        } else {
          const width = calcDescendantsWidth([child.id], new Set([...visited, child.id]));
          blocks.push({ ids: [child.id], width });
        }
      });

      const totalWidth = blocks.reduce((sum, b) => sum + b.width, 0) + (blocks.length - 1) * HORIZONTAL_GAP;
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

          // Conexión desde padres
          const parentCoupleNode = flowNodes.find(n =>
            n.type === 'couple' && parentIds.some(pId =>
              (n.data as any).person1?.id === pId || (n.data as any).person2?.id === pId
            )
          );
          const parentSingleNode = flowNodes.find(n => parentIds.includes(n.id) && n.type === 'person');
          const sourceNode = parentCoupleNode || parentSingleNode;

          if (sourceNode) {
            if (parentIds.includes(p1.id) || p1.parents?.some((pid: string) => parentIds.includes(pid))) {
              flowEdges.push({
                id: `edge-${sourceNode.id}-to-${p1.id}`,
                source: sourceNode.id,
                target: coupleId,
                targetHandle: `top-${p1.id}`,
                type: 'smoothstep',
              });
            }
            if (parentIds.includes(p2.id) || p2.parents?.some((pid: string) => parentIds.includes(pid))) {
              flowEdges.push({
                id: `edge-${sourceNode.id}-to-${p2.id}`,
                source: sourceNode.id,
                target: coupleId,
                targetHandle: `top-${p2.id}`,
                type: 'smoothstep',
              });
            }
          }

          renderDescendants([p1.id, p2.id], blockCenterX, childY);
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

          const parentCoupleNode = flowNodes.find(n =>
            n.type === 'couple' && parentIds.some(pId =>
              (n.data as any).person1?.id === pId || (n.data as any).person2?.id === pId
            )
          );
          const parentSingleNode = flowNodes.find(n => parentIds.includes(n.id) && n.type === 'person');
          const sourceNode = parentCoupleNode || parentSingleNode;

          if (sourceNode) {
            flowEdges.push({
              id: `edge-${sourceNode.id}-to-${child.id}`,
              source: sourceNode.id,
              target: child.id,
              type: 'smoothstep',
            });
          }

          renderDescendants([child.id], blockCenterX, childY);
        }

        currentX += block.width + HORIZONTAL_GAP;
      });
    };

    // Calcular ancho de rama ancestral (hacia arriba)
    const calcAncestorBranchWidth = (personIds: string[], visitedCalc: Set<string>): number => {
      const parentsSet = new Set<string>();
      personIds.forEach(pId => {
        const p = familyById.get(pId);
        p?.parents?.forEach((pid: string) => {
          if (!visitedCalc.has(pid)) parentsSet.add(pid);
        });
      });

      if (parentsSet.size === 0) {
        return personIds.length === 2 ? COUPLE_WIDTH : SINGLE_WIDTH;
      }

      const parents = Array.from(parentsSet).map(id => familyById.get(id)).filter(Boolean);
      let parent1 = parents[0];
      let parent2 = parents.length > 1 ? parents[1] : null;

      if (parent2 && parent1.gender === 'Female' && parent2.gender === 'Male') {
        [parent1, parent2] = [parent2, parent1];
      }

      const newVisited = new Set([...visitedCalc, parent1.id]);
      if (parent2) newVisited.add(parent2.id);

      const parentWidth = parent2 ? COUPLE_WIDTH : SINGLE_WIDTH;
      const ancestorWidth = calcAncestorBranchWidth(parent2 ? [parent1.id, parent2.id] : [parent1.id], newVisited);

      // Añadir hermanos de los padres
      const siblings1 = getSiblings(parent1.id).filter(s => !visitedCalc.has(s.id) && !newVisited.has(s.id));
      const siblingsWidth = siblings1.length * (SINGLE_WIDTH + HORIZONTAL_GAP);

      return Math.max(parentWidth, ancestorWidth) + siblingsWidth;
    };

    // Renderizar ancestros centrando padres sobre hijos y colocando hermanos de cada padre en su lado
    const renderAncestors = (
      childrenGroup: any[], // Grupo de hijos sobre los que centrar a los padres
      groupCenterX: number,
      baseY: number
    ) => {
      if (childrenGroup.length === 0) return;

      // Obtener todos los padres del grupo de hijos
      const parentsSet = new Set<string>();
      childrenGroup.forEach(person => {
        person.parents?.forEach((pId: string) => parentsSet.add(pId));
      });

      const parents = Array.from(parentsSet)
        .map(id => familyById.get(id))
        .filter(p => p && !visited.has(p.id));

      if (parents.length === 0) return;

      const parentY = baseY - VERTICAL_SPACING;

      // Ordenar: Hombre a la izquierda, Mujer a la derecha (en el CoupleNode)
      let parent1 = parents[0]; // Izquierda
      let parent2 = parents.length > 1 ? parents[1] : null; // Derecha

      if (parent2 && parent1.gender === 'Female' && parent2.gender === 'Male') {
        [parent1, parent2] = [parent2, parent1];
      }

      visited.add(parent1.id);
      if (parent2) visited.add(parent2.id);

      // Obtener hermanos de cada padre
      const siblingsLeft = getSiblings(parent1.id).filter(s => !visited.has(s.id)); // Hermanos del padre izquierdo
      const siblingsRight = parent2 ? getSiblings(parent2.id).filter(s => !visited.has(s.id)) : []; // Hermanos del padre derecho

      // Calcular anchos de cada grupo de hermanos
      const calcGroupWidth = (siblings: any[]) => {
        return siblings.reduce((sum, s) => {
          const sw = calcDescendantsWidth([s.id], new Set([...visited, s.id]));
          return sum + sw + HORIZONTAL_GAP;
        }, 0);
      };

      const siblingsLeftWidth = calcGroupWidth(siblingsLeft);
      const siblingsRightWidth = calcGroupWidth(siblingsRight);
      const parentNodeWidth = parent2 ? COUPLE_WIDTH : SINGLE_WIDTH;

      // El grupo completo es: [hermanos izq] + [padres] + [hermanos der]
      const totalWidth = siblingsLeftWidth + parentNodeWidth + siblingsRightWidth;

      // Centrar el bloque completo sobre groupCenterX
      const blockStartX = groupCenterX - totalWidth / 2;

      // Posicionar hermanos de la izquierda (hermanos del padre que está en la izquierda del couple)
      let currentX = blockStartX;
      siblingsLeft.forEach(sib => {
        visited.add(sib.id);
        const sibWidth = calcDescendantsWidth([sib.id], new Set([...visited, sib.id]));
        const sibCenterX = currentX + sibWidth / 2;
        const nodeX = sibCenterX - SINGLE_WIDTH / 2;

        flowNodes.push({
          id: sib.id,
          type: 'person',
          position: { x: nodeX, y: parentY },
          data: sib,
        });
        nodePositions.set(sib.id, { x: nodeX, y: parentY });
        renderDescendants([sib.id], sibCenterX, parentY);

        currentX += sibWidth + HORIZONTAL_GAP;
      });

      // Posicionar pareja de padres en el centro
      const parentCenterX = currentX + parentNodeWidth / 2;
      if (parent2) {
        const coupleId = `couple-${parent1.id}-${parent2.id}`;
        const nodeX = currentX;

        flowNodes.push({
          id: coupleId,
          type: 'couple',
          position: { x: nodeX, y: parentY },
          data: { person1: parent1, person2: parent2 },
        });
        nodePositions.set(coupleId, { x: nodeX, y: parentY });

        // Conectar padres a hijos
        childrenGroup.forEach(child => {
          const childCoupleNode = flowNodes.find(n =>
            n.type === 'couple' &&
            ((n.data as any).person1?.id === child.id || (n.data as any).person2?.id === child.id)
          );
          const childNode = childCoupleNode || flowNodes.find(n => n.id === child.id);

          if (childNode) {
            const targetHandle = childCoupleNode ? `top-${child.id}` : undefined;
            flowEdges.push({
              id: `edge-${coupleId}-to-${child.id}`,
              source: coupleId,
              target: childNode.id,
              targetHandle,
              type: 'smoothstep',
            });
          }
        });

        currentX += parentNodeWidth;

      } else {
        const nodeX = currentX;
        flowNodes.push({
          id: parent1.id,
          type: 'person',
          position: { x: nodeX, y: parentY },
          data: parent1,
        });
        nodePositions.set(parent1.id, { x: nodeX, y: parentY });

        childrenGroup.forEach(child => {
          const childCoupleNode = flowNodes.find(n =>
            n.type === 'couple' &&
            ((n.data as any).person1?.id === child.id || (n.data as any).person2?.id === child.id)
          );
          const childNode = childCoupleNode || flowNodes.find(n => n.id === child.id);

          if (childNode) {
            const targetHandle = childCoupleNode ? `top-${child.id}` : undefined;
            flowEdges.push({
              id: `edge-${parent1.id}-to-${child.id}`,
              source: parent1.id,
              target: childNode.id,
              targetHandle,
              type: 'smoothstep',
            });
          }
        });

        currentX += parentNodeWidth;
      }

      // Posicionar hermanos de la derecha (hermanos de la madre que está en la derecha del couple)
      if (siblingsRight.length > 0) {
        currentX += HORIZONTAL_GAP;
      }
      siblingsRight.forEach(sib => {
        visited.add(sib.id);
        const sibWidth = calcDescendantsWidth([sib.id], new Set([...visited, sib.id]));
        const sibCenterX = currentX + sibWidth / 2;
        const nodeX = sibCenterX - SINGLE_WIDTH / 2;

        flowNodes.push({
          id: sib.id,
          type: 'person',
          position: { x: nodeX, y: parentY },
          data: sib,
        });
        nodePositions.set(sib.id, { x: nodeX, y: parentY });
        renderDescendants([sib.id], sibCenterX, parentY);

        currentX += sibWidth + HORIZONTAL_GAP;
      });

      // Recursión: Subir a los abuelos
      // Calcular el centro de la rama izquierda (parent1 + sus hermanos)
      const leftBranchWidth = siblingsLeftWidth + (parent2 ? COUPLE_WIDTH / 2 : SINGLE_WIDTH);
      const leftBranchCenterX = blockStartX + leftBranchWidth / 2;
      renderAncestors([parent1, ...siblingsLeft], leftBranchCenterX, parentY);

      // Si hay parent2, calcular el centro de la rama derecha (parent2 + sus hermanos)
      if (parent2) {
        const rightBranchStartX = blockStartX + siblingsLeftWidth + COUPLE_WIDTH / 2;
        const rightBranchWidth = COUPLE_WIDTH / 2 + siblingsRightWidth;
        const rightBranchCenterX = rightBranchStartX + rightBranchWidth / 2;
        renderAncestors([parent2, ...siblingsRight], rightBranchCenterX, parentY);
      }
    };

    // ===== RENDERIZADO PRINCIPAL (MARIPOSA) =====
    const centerY = 0;

    if (focusPartner) {
      const [p1, p2] = focusPerson.gender === 'Male' ? [focusPerson, focusPartner] : [focusPartner, focusPerson];
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
      const focusDescendantsWidth = calcDescendantsWidth([p1.id, p2.id], new Set([p1.id, p2.id]));
      const halfDescendantsWidth = Math.max(COUPLE_WIDTH / 2, focusDescendantsWidth / 2);

      // Descendientes (abajo, centrados)
      renderDescendants([p1.id, p2.id], 0, centerY);

      // Calcular anchos de las ramas laterales
      const focusSiblings = getSiblings(focusId).filter(s => !visited.has(s.id));
      const partnerSiblings = getSiblings(focusPartnerId).filter(s => !visited.has(s.id));

      // IZQUIERDA: Hermanos del foco + ancestros del foco
      // Posicionar después del ancho de los descendientes del foco
      const leftBaseX = -halfDescendantsWidth - HORIZONTAL_GAP;
      let leftX = leftBaseX;

      focusSiblings.forEach(sib => {
        const sibWidth = calcDescendantsWidth([sib.id], new Set([...visited, sib.id]));
        const sibCenterX = leftX - sibWidth / 2;
        const nodeX = sibCenterX - SINGLE_WIDTH / 2;

        visited.add(sib.id);
        flowNodes.push({
          id: sib.id,
          type: 'person',
          position: { x: nodeX, y: centerY },
          data: sib,
        });
        nodePositions.set(sib.id, { x: nodeX, y: centerY });

        renderDescendants([sib.id], sibCenterX, centerY);
        leftX -= sibWidth + HORIZONTAL_GAP;
      });

      // Ancestros del foco (izquierda)
      const leftAncestorX = focusSiblings.length > 0 ? (leftBaseX + leftX) / 2 : -COUPLE_WIDTH / 4;
      renderAncestors([focusPerson, ...focusSiblings], leftAncestorX, centerY);

      // DERECHA: Hermanos de la pareja + ancestros de la pareja
      // Posicionar después del ancho de los descendientes del foco
      const rightBaseX = halfDescendantsWidth + HORIZONTAL_GAP;
      let rightX = rightBaseX;

      partnerSiblings.forEach(sib => {
        const sibWidth = calcDescendantsWidth([sib.id], new Set([...visited, sib.id]));
        const sibCenterX = rightX + sibWidth / 2;
        const nodeX = sibCenterX - SINGLE_WIDTH / 2;

        visited.add(sib.id);
        flowNodes.push({
          id: sib.id,
          type: 'person',
          position: { x: nodeX, y: centerY },
          data: sib,
        });
        nodePositions.set(sib.id, { x: nodeX, y: centerY });

        renderDescendants([sib.id], sibCenterX, centerY);
        rightX += sibWidth + HORIZONTAL_GAP;
      });

      // Ancestros de la pareja (derecha)
      const rightAncestorX = partnerSiblings.length > 0 ? (rightBaseX + rightX) / 2 : COUPLE_WIDTH / 4;
      renderAncestors([focusPartner, ...partnerSiblings], rightAncestorX, centerY);

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
      let leftX = -SINGLE_WIDTH / 2 - HORIZONTAL_GAP;

      siblings.forEach(sib => {
        const sibWidth = calcDescendantsWidth([sib.id], new Set([...visited, sib.id]));
        const sibCenterX = leftX - sibWidth / 2;
        const nodeX = sibCenterX - SINGLE_WIDTH / 2;

        visited.add(sib.id);
        flowNodes.push({
          id: sib.id,
          type: 'person',
          position: { x: nodeX, y: centerY },
          data: sib,
        });
        nodePositions.set(sib.id, { x: nodeX, y: centerY });

        renderDescendants([sib.id], sibCenterX, centerY);
        leftX -= sibWidth + HORIZONTAL_GAP;
      });

      renderAncestors([focusPerson, ...siblings], 0, centerY);
    }

    return { nodes: flowNodes, edges: flowEdges };
  }, [familyNodes, viewRootId, isMobile, focusId]);

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
          pathOptions: { borderRadius: 20 },
          style: { stroke: '#64748b', strokeWidth: 4 },
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
