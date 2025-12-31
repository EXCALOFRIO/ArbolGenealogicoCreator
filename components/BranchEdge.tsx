import React, { useMemo } from 'react';
import { EdgeProps, getSmoothStepPath } from '@xyflow/react';

// Generador de números pseudo-aleatorios con semilla
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

// Interpola un punto en una curva de Bezier cuadrática
const quadraticBezier = (t: number, p0: {x: number, y: number}, p1: {x: number, y: number}, p2: {x: number, y: number}) => ({
  x: (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x,
  y: (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y,
});

// Calcula la normal (perpendicular) en un punto
const getNormal = (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x: -dy / len, y: dx / len };
};

// Genera el contorno de una rama con grosor variable (más gruesa al inicio)
const generateBranchOutline = (
  points: { x: number; y: number }[],
  startWidth: number,
  endWidth: number,
  seed: number
): string => {
  if (points.length < 2) return '';
  
  const leftSide: { x: number; y: number }[] = [];
  const rightSide: { x: number; y: number }[] = [];
  
  for (let i = 0; i < points.length; i++) {
    const t = i / (points.length - 1);
    // Grosor que disminuye del inicio al final
    const width = startWidth * (1 - t) + endWidth * t;
    // Añadir variación orgánica al grosor
    const widthVariation = 1 + (seededRandom(seed + i * 17) - 0.5) * 0.3;
    const actualWidth = width * widthVariation;
    
    // Calcular normal
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const normal = getNormal(prev, next);
    
    // Añadir pequeña ondulación
    const wobble = (seededRandom(seed + i * 23) - 0.5) * 1.5;
    
    leftSide.push({
      x: points[i].x + normal.x * (actualWidth / 2) + wobble,
      y: points[i].y + normal.y * (actualWidth / 2) + wobble,
    });
    rightSide.push({
      x: points[i].x - normal.x * (actualWidth / 2) - wobble,
      y: points[i].y - normal.y * (actualWidth / 2) - wobble,
    });
  }
  
  // Construir el path del contorno
  let path = `M ${leftSide[0].x} ${leftSide[0].y}`;
  
  // Lado izquierdo con curvas
  for (let i = 1; i < leftSide.length; i++) {
    const prev = leftSide[i - 1];
    const curr = leftSide[i];
    const midX = (prev.x + curr.x) / 2 + (seededRandom(seed + i * 31) - 0.5) * 2;
    const midY = (prev.y + curr.y) / 2 + (seededRandom(seed + i * 37) - 0.5) * 2;
    path += ` Q ${midX} ${midY} ${curr.x} ${curr.y}`;
  }
  
  // Conectar al lado derecho (punta)
  const lastLeft = leftSide[leftSide.length - 1];
  const lastRight = rightSide[rightSide.length - 1];
  path += ` Q ${(lastLeft.x + lastRight.x) / 2} ${(lastLeft.y + lastRight.y) / 2 + 2} ${lastRight.x} ${lastRight.y}`;
  
  // Lado derecho en reversa
  for (let i = rightSide.length - 2; i >= 0; i--) {
    const prev = rightSide[i + 1];
    const curr = rightSide[i];
    const midX = (prev.x + curr.x) / 2 + (seededRandom(seed + i * 41) - 0.5) * 2;
    const midY = (prev.y + curr.y) / 2 + (seededRandom(seed + i * 43) - 0.5) * 2;
    path += ` Q ${midX} ${midY} ${curr.x} ${curr.y}`;
  }
  
  path += ' Z';
  return path;
};

// Genera ramitas secundarias más naturales
const generateTwigs = (
  points: { x: number; y: number }[],
  seed: number,
  count: number
): string => {
  let twigs = '';
  
  for (let i = 0; i < count; i++) {
    // Posición a lo largo de la rama (evitar los extremos)
    const t = 0.15 + seededRandom(seed + i * 100) * 0.7;
    const idx = Math.floor(t * (points.length - 1));
    const point = points[idx];
    if (!point) continue;
    
    // Dirección de la rama principal
    const prev = points[Math.max(0, idx - 1)];
    const next = points[Math.min(points.length - 1, idx + 1)];
    const branchAngle = Math.atan2(next.y - prev.y, next.x - prev.x);
    
    // Ángulo de la ramita (sale hacia arriba o abajo)
    const side = seededRandom(seed + i * 200) > 0.5 ? 1 : -1;
    const angleOffset = (Math.PI / 4) + seededRandom(seed + i * 210) * (Math.PI / 4); // 45-90 grados
    const twigAngle = branchAngle + side * angleOffset;
    
    // Longitud de la ramita
    const length = 8 + seededRandom(seed + i * 300) * 15;
    
    // Punto de control para la curva (da curvatura natural)
    const ctrlLen = length * 0.6;
    const ctrlAngle = twigAngle + (seededRandom(seed + i * 310) - 0.5) * 0.4;
    const ctrl = {
      x: point.x + Math.cos(ctrlAngle) * ctrlLen,
      y: point.y + Math.sin(ctrlAngle) * ctrlLen,
    };
    
    // Punto final
    const end = {
      x: point.x + Math.cos(twigAngle) * length,
      y: point.y + Math.sin(twigAngle) * length,
    };
    
    // Dibujar la ramita con curva
    twigs += ` M ${point.x} ${point.y} Q ${ctrl.x} ${ctrl.y} ${end.x} ${end.y}`;
    
    // Opcional: añadir una sub-ramita pequeña
    if (seededRandom(seed + i * 400) > 0.5) {
      const subT = 0.5 + seededRandom(seed + i * 410) * 0.3;
      const subPoint = quadraticBezier(subT, point, ctrl, end);
      const subAngle = twigAngle + side * (0.3 + seededRandom(seed + i * 420) * 0.4);
      const subLen = length * 0.4;
      const subEnd = {
        x: subPoint.x + Math.cos(subAngle) * subLen,
        y: subPoint.y + Math.sin(subAngle) * subLen,
      };
      twigs += ` M ${subPoint.x} ${subPoint.y} L ${subEnd.x} ${subEnd.y}`;
    }
  }
  
  return twigs;
};

// Genera líneas de hatching (textura de sombreado)
const generateHatching = (
  points: { x: number; y: number }[],
  seed: number,
  count: number
): string => {
  let hatching = '';
  
  for (let i = 0; i < count; i++) {
    const t = 0.1 + seededRandom(seed + i * 500) * 0.8;
    const idx = Math.floor(t * (points.length - 1));
    const point = points[idx];
    if (!point) continue;
    
    // Dirección perpendicular a la rama
    const prev = points[Math.max(0, idx - 1)];
    const next = points[Math.min(points.length - 1, idx + 1)];
    const normal = getNormal(prev, next);
    
    // Ángulo del hatching (ligeramente diagonal)
    const hatchAngle = Math.atan2(normal.y, normal.x) + (seededRandom(seed + i * 510) - 0.5) * 0.5;
    
    // Longitud del hatching
    const len = 3 + seededRandom(seed + i * 520) * 4;
    
    // Offset desde el centro
    const offset = (seededRandom(seed + i * 530) - 0.5) * 4;
    const startX = point.x + normal.x * offset;
    const startY = point.y + normal.y * offset;
    
    hatching += ` M ${startX} ${startY} l ${Math.cos(hatchAngle) * len} ${Math.sin(hatchAngle) * len}`;
  }
  
  return hatching;
};

// Extrae puntos del path y los interpola para mayor suavidad
const extractAndInterpolatePoints = (pathD: string, numPoints: number = 20): { x: number; y: number }[] => {
  const numRegex = /-?\d+\.?\d*/g;
  const numbers = pathD.match(numRegex)?.map(Number) || [];
  
  const rawPoints: { x: number; y: number }[] = [];
  for (let i = 0; i < numbers.length - 1; i += 2) {
    rawPoints.push({ x: numbers[i], y: numbers[i + 1] });
  }
  
  if (rawPoints.length < 2) return rawPoints;
  
  // Interpolar para tener más puntos
  const interpolated: { x: number; y: number }[] = [];
  for (let i = 0; i < numPoints; i++) {
    const t = i / (numPoints - 1);
    const idx = t * (rawPoints.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.min(lower + 1, rawPoints.length - 1);
    const frac = idx - lower;
    
    interpolated.push({
      x: rawPoints[lower].x * (1 - frac) + rawPoints[upper].x * frac,
      y: rawPoints[lower].y * (1 - frac) + rawPoints[upper].y * frac,
    });
  }
  
  return interpolated;
};

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
  // Calcular el punto medio en Y para la rama horizontal
  const midY = sourceY + (targetY - sourceY) * 0.5;
  
  // Crear los tres segmentos: vertical desde source, horizontal, vertical hacia target
  // Esto permite que las ramas compartan visualmente la parte horizontal
  
  const seed = useMemo(() => {
    return Math.abs(Math.round(sourceX * 7 + sourceY * 13 + targetX * 17 + targetY * 23));
  }, [sourceX, sourceY, targetX, targetY]);

  const { verticalPath1, horizontalPath, verticalPath2 } = useMemo(() => {
    // Segmento 1: Vertical desde source hasta midY
    const seg1Points: { x: number; y: number }[] = [];
    const numPoints1 = 12;
    for (let i = 0; i < numPoints1; i++) {
      const t = i / (numPoints1 - 1);
      seg1Points.push({
        x: sourceX,
        y: sourceY + t * (midY - sourceY),
      });
    }
    
    // Segmento 2: Horizontal desde sourceX hasta targetX en midY
    const seg2Points: { x: number; y: number }[] = [];
    const numPoints2 = Math.max(8, Math.abs(Math.round((targetX - sourceX) / 10)));
    for (let i = 0; i < numPoints2; i++) {
      const t = i / (numPoints2 - 1);
      seg2Points.push({
        x: sourceX + t * (targetX - sourceX),
        y: midY,
      });
    }
    
    // Segmento 3: Vertical desde midY hasta target
    const seg3Points: { x: number; y: number }[] = [];
    const numPoints3 = 12;
    for (let i = 0; i < numPoints3; i++) {
      const t = i / (numPoints3 - 1);
      seg3Points.push({
        x: targetX,
        y: midY + t * (targetY - midY),
      });
    }
    
    // Generar contornos para cada segmento
    const outline1 = generateBranchOutline(seg1Points, 7, 6, seed);
    const outline2 = generateBranchOutline(seg2Points, 6, 6, seed + 1000);
    const outline3 = generateBranchOutline(seg3Points, 6, 5, seed + 2000);
    
    return {
      verticalPath1: outline1,
      horizontalPath: outline2,
      verticalPath2: outline3,
    };
  }, [sourceX, sourceY, targetX, targetY, midY, seed]);

  return (
    <g className="branch-edge-group">
      {/* Sombras */}
      <path
        d={verticalPath1}
        fill="rgba(74, 55, 40, 0.15)"
        stroke="none"
        transform="translate(2, 2)"
        style={{ filter: 'blur(2px)' }}
      />
      <path
        d={horizontalPath}
        fill="rgba(74, 55, 40, 0.15)"
        stroke="none"
        transform="translate(2, 2)"
        style={{ filter: 'blur(2px)' }}
      />
      <path
        d={verticalPath2}
        fill="rgba(74, 55, 40, 0.15)"
        stroke="none"
        transform="translate(2, 2)"
        style={{ filter: 'blur(2px)' }}
      />
      
      {/* Segmento 1: Vertical desde source */}
      <path
        d={verticalPath1}
        fill="var(--rustic-parchment-dark, #e8d4a8)"
        stroke="var(--rustic-ink, #2c1810)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Segmento 2: Horizontal */}
      <path
        d={horizontalPath}
        fill="var(--rustic-parchment-dark, #e8d4a8)"
        stroke="var(--rustic-ink, #2c1810)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Segmento 3: Vertical hacia target */}
      <path
        d={verticalPath2}
        fill="var(--rustic-parchment-dark, #e8d4a8)"
        stroke="var(--rustic-ink, #2c1810)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Path invisible para interacción */}
      <path
        id={id}
        d={`M ${sourceX} ${sourceY} L ${sourceX} ${sourceY + (targetY - sourceY) * 0.5} L ${targetX} ${sourceY + (targetY - sourceY) * 0.5} L ${targetX} ${targetY}`}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        markerEnd={markerEnd}
      />
    </g>
  );
};

export default BranchEdge;
