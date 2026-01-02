import React from 'react';
import { EdgeProps } from '@xyflow/react';

/**
 * Edge que dibuja una conexión en forma de "L invertida":
 * - Baja verticalmente desde el padre hasta una altura intermedia (barY)
 * - Va horizontalmente hasta la posición X del hijo
 * - Baja verticalmente hasta el hijo
 * 
 * Usa la técnica de trazo grueso + trazo fino del color del fondo
 * para crear el efecto de doble línea con codos perfectos.
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

  // barY viene en data, o calculamos un punto intermedio
  const barY = (data?.barY as number) ?? (sourceY + targetY) / 2;

  // Path en forma de L invertida:
  // 1. Baja desde sourceY hasta barY
  // 2. Va horizontal desde sourceX hasta targetX
  // 3. Baja desde barY hasta targetY
  const path = `M ${sourceX} ${sourceY} L ${sourceX} ${barY} L ${targetX} ${barY} L ${targetX} ${targetY}`;

  return (
    <g className="branch-edge-group">
      {/* Trazo exterior (grueso) - color tinta */}
      <path
        d={path}
        fill="none"
        stroke={inkColor}
        strokeWidth={outerWidth}
        strokeLinecap="square"
        strokeLinejoin="miter"
        shapeRendering="geometricPrecision"
      />
      {/* Trazo interior (fino) - color papel = efecto doble línea */}
      <path
        d={path}
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
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={18}
      />
    </g>
  );
};

export default BranchLEdge;
