import React from 'react';
import { EdgeProps } from '@xyflow/react';

export const BranchDropEdge: React.FC<EdgeProps> = ({ id, sourceX, sourceY, targetX, targetY, markerEnd }) => {
  const inkColor = 'var(--rustic-ink, #2c1810)';
  const paperColor = 'var(--rustic-parchment, #f4e4bc)';
  const outerWidth = 4;
  const innerWidth = 2;

  const x = (sourceX + targetX) / 2;
  const path = `M ${x} ${sourceY} L ${x} ${targetY}`;

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
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={18}
        markerEnd={markerEnd}
      />
    </g>
  );
};

export default BranchDropEdge;
