import React from 'react';
import { EdgeProps } from '@xyflow/react';
import { useFamilyStore } from '../store/familyStore';

export const BranchEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
}) => {
  // Detectar tema visual
  const visualTheme = useFamilyStore(state => state.visualTheme);
  const isRustic = visualTheme === 'rustic';
  
  // Calcular el punto medio en Y para la rama horizontal
  const midY = sourceY + (targetY - sourceY) * 0.5;
  
  // Colores según el tema
  const strokeColor = 'var(--rustic-ink, #2c1810)';
  const strokeWidth = 0.8;

  // Separación entre las dos líneas dobles
  const gap = 2;
  
  // Determinar si es línea recta vertical
  const isStraight = Math.abs(targetX - sourceX) < 1;

  // Estrategia: dibujar 3 segmentos separados que se conecten
  // 1. Vertical desde el padre hacia abajo hasta midY
  // 2. Horizontal desde sourceX hasta targetX (en midY)
  // 3. Vertical desde midY hacia abajo hasta el hijo

  return (
    <g className="branch-edge-group">
      {isStraight ? (
        <>
          {/* Línea recta vertical - solo dos líneas paralelas */}
          <line
            x1={sourceX - gap} y1={sourceY}
            x2={sourceX - gap} y2={targetY}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
          <line
            x1={sourceX + gap} y1={sourceY}
            x2={sourceX + gap} y2={targetY}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        </>
      ) : (
        <>
          {/* Segmento 1: Vertical del padre hacia abajo (de sourceY a midY) */}
          <line
            x1={sourceX - gap} y1={sourceY}
            x2={sourceX - gap} y2={midY}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
          <line
            x1={sourceX + gap} y1={sourceY}
            x2={sourceX + gap} y2={midY}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
          
          {/* Segmento 2: Horizontal (una sola barra doble en midY) */}
          {/* Línea superior de la barra horizontal */}
          <line
            x1={Math.min(sourceX, targetX) - gap} y1={midY - gap}
            x2={Math.max(sourceX, targetX) + gap} y2={midY - gap}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
          {/* Línea inferior de la barra horizontal */}
          <line
            x1={Math.min(sourceX, targetX) - gap} y1={midY + gap}
            x2={Math.max(sourceX, targetX) + gap} y2={midY + gap}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
          
          {/* Segmento 3: Vertical del midY hacia el hijo */}
          <line
            x1={targetX - gap} y1={midY}
            x2={targetX - gap} y2={targetY}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
          <line
            x1={targetX + gap} y1={midY}
            x2={targetX + gap} y2={targetY}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
          
          {/* Tapas de las esquinas para cerrar los espacios */}
          {/* Esquina superior izquierda del source */}
          <line
            x1={sourceX - gap} y1={midY - gap}
            x2={sourceX - gap} y2={midY + gap}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
          <line
            x1={sourceX + gap} y1={midY - gap}
            x2={sourceX + gap} y2={midY + gap}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
          
          {/* Tapas verticales en el target */}
          <line
            x1={targetX - gap} y1={midY - gap}
            x2={targetX - gap} y2={midY + gap}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
          <line
            x1={targetX + gap} y1={midY - gap}
            x2={targetX + gap} y2={midY + gap}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        </>
      )}
      
      {/* Path invisible para interacción */}
      <path
        id={id}
        d={`M ${sourceX} ${sourceY} L ${sourceX} ${midY} L ${targetX} ${midY} L ${targetX} ${targetY}`}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        markerEnd={markerEnd}
      />
    </g>
  );
};

export default BranchEdge;
