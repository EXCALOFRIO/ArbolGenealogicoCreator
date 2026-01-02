import React from 'react';
import { EdgeProps } from '@xyflow/react';

export const BranchBarEdge: React.FC<EdgeProps> = ({ id, sourceX, sourceY, targetX, targetY }) => {
  const inkColor = 'var(--rustic-ink, #2c1810)';
  const paperColor = 'var(--rustic-parchment, #f4e4bc)';
  const outerWidth = 4;
  const innerWidth = 2;

  const x1 = Math.min(sourceX, targetX);
  const x2 = Math.max(sourceX, targetX);
  const y = (sourceY + targetY) / 2;

  const path = `M ${x1} ${y} L ${x2} ${y}`;

  return (
    <g className="branch-edge-group">
      {/* Trazo exterior (grueso) - color tinta */}
      <path
        d={path}
        fill="none"
        stroke={inkColor}
        strokeWidth={outerWidth}
        strokeLinecap="square"
        shapeRendering="geometricPrecision"
      />
      {/* Trazo interior (fino) - color papel = efecto doble línea */}
      <path
        d={path}
        fill="none"
        stroke={paperColor}
        strokeWidth={innerWidth}
        strokeLinecap="square"
        shapeRendering="geometricPrecision"
      />
      {/* Path invisible para interacción */}
      <path
        id={id}
        d={`M ${x1} ${y} L ${x2} ${y}`}
        fill="none"
        stroke="transparent"
        strokeWidth={18}
      />
    </g>
  );
};

export default BranchBarEdge;
