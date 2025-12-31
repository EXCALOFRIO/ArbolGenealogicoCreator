import React, { useMemo } from 'react';

interface BranchOptions {
  width?: number;           // Ancho total de la rama
  height?: number;          // Alto del SVG
  seed?: number;            // Semilla para reproducibilidad
  branchCount?: number;     // Número de ramitas secundarias (0-4)
  textureCount?: number;    // Número de líneas de textura (0-6)
  strokeColor?: string;     // Color del trazo
  strokeWidth?: number;     // Grosor del trazo principal
}

// Generador de números pseudo-aleatorios con semilla
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

// Genera el path SVG de una rama orgánica horizontal
export const generateBranchPath = (options: BranchOptions = {}) => {
  const {
    width = 100,
    height = 12,
    seed = 42,
    branchCount = 2,
    textureCount = 3,
  } = options;

  const midY = height / 2;
  const random = (i: number) => seededRandom(seed + i);

  // Puntos de control para la curva principal
  // La rama va de izquierda a derecha con ligera ondulación
  const startX = 2;
  const endX = width - 2;
  
  // Ondulación sutil en Y
  const ctrl1X = width * 0.25;
  const ctrl1Y = midY + (random(1) - 0.5) * 4;
  const ctrl2X = width * 0.75;
  const ctrl2Y = midY + (random(2) - 0.5) * 4;

  // Path principal con curva cúbica bezier
  const mainPath = `M ${startX} ${midY} C ${ctrl1X} ${ctrl1Y}, ${ctrl2X} ${ctrl2Y}, ${endX} ${midY}`;

  // Generar ramitas secundarias
  let branches = '';
  for (let i = 0; i < branchCount; i++) {
    const t = 0.2 + (random(10 + i) * 0.6); // Posición a lo largo de la rama (20%-80%)
    const bx = startX + (endX - startX) * t;
    
    // Interpolación para encontrar Y en la curva (aproximación)
    const by = midY + (random(20 + i) - 0.5) * 2;
    
    // Dirección de la ramita (arriba o abajo)
    const direction = random(30 + i) > 0.5 ? -1 : 1;
    const branchLength = 3 + random(40 + i) * 4;
    const branchEndX = bx + (random(50 + i) - 0.3) * 6;
    const branchEndY = by + direction * branchLength;
    
    // Punto de control para curva suave
    const ctrlBX = bx + (branchEndX - bx) * 0.5;
    const ctrlBY = by + (branchEndY - by) * 0.3;
    
    branches += ` M ${bx} ${by} Q ${ctrlBX} ${ctrlBY} ${branchEndX} ${branchEndY}`;
  }

  // Generar textura (pequeñas líneas de sombreado)
  let texture = '';
  for (let i = 0; i < textureCount; i++) {
    const t = 0.15 + (random(60 + i) * 0.7);
    const tx = startX + (endX - startX) * t;
    const ty = midY + (random(70 + i) - 0.5) * 1.5;
    
    // Líneas cortas perpendiculares o diagonales
    const angle = random(80 + i) * Math.PI * 0.3;
    const len = 1.5 + random(90 + i) * 2;
    const tx2 = tx + Math.cos(angle) * len;
    const ty2 = ty + Math.sin(angle) * len;
    
    texture += ` M ${tx} ${ty} L ${tx2} ${ty2}`;
  }

  return { mainPath, branches, texture };
};

// Componente React que renderiza una rama como divisor
interface RusticBranchDividerProps {
  width?: number;
  className?: string;
  seed?: number;
}

export const RusticBranchDivider: React.FC<RusticBranchDividerProps> = ({
  width = 100,
  className = '',
  seed,
}) => {
  // Usar un seed basado en el ancho si no se proporciona
  const actualSeed = seed ?? width * 17 + 31;
  
  const { mainPath, branches, texture } = useMemo(
    () => generateBranchPath({ 
      width, 
      height: 10, 
      seed: actualSeed,
      branchCount: Math.floor(width / 40), // Más ramitas en ramas más largas
      textureCount: Math.floor(width / 30),
    }),
    [width, actualSeed]
  );

  return (
    <svg 
      viewBox={`0 0 ${width} 10`} 
      className={`rustic-branch-divider ${className}`}
      style={{ 
        width: '100%', 
        height: '8px',
        overflow: 'visible',
      }}
      preserveAspectRatio="none"
    >
      {/* Sombra suave para dar profundidad */}
      <path 
        d={mainPath} 
        stroke="var(--rustic-wood-medium, #5c4033)" 
        strokeWidth="3" 
        fill="none" 
        strokeLinecap="round"
        opacity="0.2"
      />
      
      {/* Rama principal */}
      <path 
        d={mainPath} 
        stroke="var(--rustic-ink, #2c1810)" 
        strokeWidth="1.5" 
        fill="none" 
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Ramitas secundarias */}
      <path 
        d={branches} 
        stroke="var(--rustic-ink, #2c1810)" 
        strokeWidth="0.8" 
        fill="none" 
        strokeLinecap="round"
      />
      
      {/* Textura/hatching */}
      <path 
        d={texture} 
        stroke="var(--rustic-ink-faded, #6d4c41)" 
        strokeWidth="0.5" 
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
};

// Versión mejorada con grosor variable y más detalle
export const RusticTwigDivider: React.FC<RusticBranchDividerProps> = ({
  width = 80,
  className = '',
  seed,
}) => {
  const actualSeed = seed ?? width * 13 + 7;
  
  const paths = useMemo(() => {
    const height = 12;
    const midY = height / 2;
    const random = (i: number) => seededRandom(actualSeed + i);
    
    const startX = 2;
    const endX = width - 2;
    
    // Generar puntos a lo largo de la rama con ondulación
    const numPoints = 12;
    const points: {x: number, y: number}[] = [];
    for (let i = 0; i < numPoints; i++) {
      const t = i / (numPoints - 1);
      const x = startX + (endX - startX) * t;
      const y = midY + (random(i * 10) - 0.5) * 2;
      points.push({ x, y });
    }
    
    // Calcular normales para el grosor variable
    const getNormal = (idx: number) => {
      const prev = points[Math.max(0, idx - 1)];
      const next = points[Math.min(points.length - 1, idx + 1)];
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      return { x: -dy / len, y: dx / len };
    };
    
    // Crear contorno con grosor variable (más grueso en el centro)
    const leftSide: {x: number, y: number}[] = [];
    const rightSide: {x: number, y: number}[] = [];
    
    for (let i = 0; i < points.length; i++) {
      const t = i / (points.length - 1);
      // Grosor: más delgado en los extremos, más grueso en el centro
      const baseWidth = 1.5 + Math.sin(t * Math.PI) * 2;
      const widthVar = baseWidth * (1 + (random(100 + i) - 0.5) * 0.3);
      
      const normal = getNormal(i);
      leftSide.push({
        x: points[i].x + normal.x * widthVar,
        y: points[i].y + normal.y * widthVar,
      });
      rightSide.push({
        x: points[i].x - normal.x * widthVar,
        y: points[i].y - normal.y * widthVar,
      });
    }
    
    // Construir path del contorno
    let outline = `M ${leftSide[0].x} ${leftSide[0].y}`;
    for (let i = 1; i < leftSide.length; i++) {
      outline += ` L ${leftSide[i].x} ${leftSide[i].y}`;
    }
    for (let i = rightSide.length - 1; i >= 0; i--) {
      outline += ` L ${rightSide[i].x} ${rightSide[i].y}`;
    }
    outline += ' Z';
    
    // Generar ramitas que salen de la rama principal
    let twigs = '';
    const twigCount = 3;
    for (let i = 0; i < twigCount; i++) {
      const t = 0.2 + random(200 + i) * 0.6;
      const idx = Math.floor(t * (points.length - 1));
      const point = points[idx];
      
      const normal = getNormal(idx);
      const side = random(300 + i) > 0.5 ? 1 : -1;
      const angle = Math.atan2(normal.y, normal.x) * side;
      const length = 3 + random(400 + i) * 4;
      
      // Punto de control para curva
      const ctrlAngle = angle + (random(500 + i) - 0.5) * 0.5;
      const ctrl = {
        x: point.x + Math.cos(ctrlAngle) * length * 0.5,
        y: point.y + Math.sin(ctrlAngle) * length * 0.5 + side * 1,
      };
      const end = {
        x: point.x + Math.cos(angle) * length,
        y: point.y + Math.sin(angle) * length + side * 2,
      };
      
      twigs += ` M ${point.x} ${point.y} Q ${ctrl.x} ${ctrl.y} ${end.x} ${end.y}`;
    }
    
    // Hatching (líneas de textura)
    let hatching = '';
    const hatchCount = 4;
    for (let i = 0; i < hatchCount; i++) {
      const t = 0.15 + random(600 + i) * 0.7;
      const idx = Math.floor(t * (points.length - 1));
      const point = points[idx];
      const normal = getNormal(idx);
      
      const hatchAngle = Math.atan2(normal.y, normal.x) + (random(700 + i) - 0.5) * 0.4;
      const len = 1.5 + random(800 + i) * 1.5;
      
      hatching += ` M ${point.x} ${point.y} l ${Math.cos(hatchAngle) * len} ${Math.sin(hatchAngle) * len}`;
    }
    
    return { outline, twigs, hatching };
  }, [width, actualSeed]);

  return (
    <svg 
      viewBox={`0 0 ${width} 12`} 
      className={`rustic-twig-divider ${className}`}
      style={{ 
        width: '100%', 
        height: '10px',
        overflow: 'visible',
      }}
      preserveAspectRatio="none"
    >
      {/* Sombra */}
      <path 
        d={paths.outline} 
        fill="rgba(74, 55, 40, 0.15)"
        stroke="none"
        transform="translate(0.5, 0.5)"
      />
      
      {/* Cuerpo de la rama (relleno) */}
      <path 
        d={paths.outline} 
        fill="var(--rustic-parchment-dark, #e8d4a8)"
        stroke="var(--rustic-ink, #2c1810)"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Hatching */}
      <path 
        d={paths.hatching} 
        stroke="var(--rustic-ink, #2c1810)"
        strokeWidth="0.4"
        fill="none"
        opacity="0.4"
        strokeLinecap="round"
      />
      
      {/* Ramitas */}
      <path 
        d={paths.twigs} 
        stroke="var(--rustic-ink, #2c1810)" 
        strokeWidth="0.8" 
        fill="none" 
        strokeLinecap="round"
      />
    </svg>
  );
};

export default RusticBranchDivider;
