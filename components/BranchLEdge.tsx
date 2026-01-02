import React from 'react';
import { EdgeProps } from '@xyflow/react';

/**
 * Edge que dibuja TODO el sistema de ramas para un grupo de hermanos:
 * - Un tronco vertical desde el padre hasta la barra
 * - Una barra horizontal que cubre todos los hijos
 * - Bajadas verticales a cada hijo
 * 
 * Todo en un solo path para que los codos se vean perfectos.
 */
export const BranchLEdge: React.FC<EdgeProps> = ({ 
  id, 
  sourceX, 
  sourceY, 
  targetX, 
  targetY,
  data
}) => {
  const inkColor = 'var(--rustic-ink, #2c1810)';
  const paperColor = 'var(--rustic-parchment, #f4e4bc)';
  const outerWidth = 4;
  const innerWidth = 2;

  // barY viene en data
  const barY = (data?.barY as number) ?? (sourceY + targetY) / 2;
  
  // allDrops contiene las X de todos los hermanos y sus targetY
  const allDrops = (data?.allDrops as Array<{x: number, y: number}>) ?? [{ x: targetX, y: targetY }];
  
  // isFirst indica si este edge es el que dibuja todo el sistema
  const isFirst = (data?.isFirst as boolean) ?? true;
  
  // Si no es el primero, no dibujamos nada (evita duplicados)
  if (!isFirst) {
    return null;
  }

  // Ordenar drops por X
  const sortedDrops = [...allDrops].sort((a, b) => a.x - b.x);
  const minX = sortedDrops[0].x;
  const maxX = sortedDrops[sortedDrops.length - 1].x;

  // Construir el path completo:
  // 1. Tronco: baja desde sourceY hasta barY
  // 2. Barra: va de minX a maxX (pasando por sourceX)
  // 3. Drops: sube/baja a cada hijo
  
  let pathD = '';
  
  // Empezamos en el centro (sourceX), bajamos al bar
  pathD += `M ${sourceX} ${sourceY} L ${sourceX} ${barY}`;
  
  // Vamos hacia la izquierda hasta minX
  pathD += ` L ${minX} ${barY}`;
  
  // Bajamos al primer hijo
  pathD += ` L ${minX} ${sortedDrops[0].y}`;
  
  // Subimos de vuelta a la barra
  pathD += ` L ${minX} ${barY}`;
  
  // Para cada drop intermedio, vamos horizontal y bajamos
  for (let i = 1; i < sortedDrops.length; i++) {
    const drop = sortedDrops[i];
    pathD += ` L ${drop.x} ${barY}`;
    pathD += ` L ${drop.x} ${drop.y}`;
    pathD += ` L ${drop.x} ${barY}`;
  }

  return (
    <g className="branch-edge-group">
      {/* Trazo exterior (grueso) - color tinta */}
      <path
        d={pathD}
        fill="none"
        stroke={inkColor}
        strokeWidth={outerWidth}
        strokeLinecap="square"
        strokeLinejoin="miter"
        shapeRendering="geometricPrecision"
      />
      {/* Trazo interior (fino) - color papel = efecto doble línea */}
      <path
        d={pathD}
        fill="none"
        stroke={paperColor}
        strokeWidth={innerWidth}
        strokeLinecap="square"
        strokeLinejoin="miter"
        shapeRendering="geometricPrecision"
      />
      {/* Path invisible para interacción */}
      <path
        id={id}
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={18}
      />
    </g>
  );
};

export default BranchLEdge;
