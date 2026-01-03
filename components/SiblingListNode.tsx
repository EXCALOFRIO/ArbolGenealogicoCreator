import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { useFamilyStore } from '../store/familyStore';
import { getGroupColor } from '../utils/colors';

interface SiblingListNodeProps {
  data: {
    siblings: Array<{ id: string; name: string; gender: 'Male' | 'Female'; surnames?: string }>;
    groupId?: string;
    width?: number;
  };
}

export const SiblingListNode: React.FC<SiblingListNodeProps> = ({ data }) => {
  const { focusId, setFocusId, visualTheme, textCase } = useFamilyStore();
  const { siblings, width } = data;
  
  const isRustic = visualTheme === 'rustic';
  
  // Usar el ancho del padre o un valor por defecto
  const nodeWidth = width || 200;

  const formatText = (text: string) => {
    if (textCase === 'uppercase') return text.toUpperCase();
    return text
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (!siblings || siblings.length === 0) return null;

  // Obtener colores del primer hermano para el tema moderno
  const colors = getGroupColor(siblings[0]?.surnames || 'default');

  return (
    <div
      className={`
        relative flex flex-col
        ${isRustic 
          ? 'rustic-node' 
          : 'backdrop-blur-xl border shadow-lg rounded-xl'
        }
        overflow-hidden
      `}
      style={{
        width: nodeWidth,
        minWidth: nodeWidth,
        maxWidth: nodeWidth,
        ...(!isRustic && {
          background: 'var(--card-bg)',
          borderColor: 'var(--card-border)',
        }),
      }}
    >
      {/* Handle superior para conexión - centrado */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ 
          background: 'transparent',
          width: '50%',
          height: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          border: 'none',
          borderRadius: 0,
        }}
      />

      {/* Lista de nombres - estilo compacto */}
      <div 
        className="flex flex-col items-center"
        style={{ padding: isRustic ? '2px 1px' : '4px' }}
      >
        {siblings.map((sib, index) => {
          const isFocused = sib.id === focusId;
          
          return (
            <React.Fragment key={sib.id}>
              <button
                onClick={() => setFocusId(sib.id)}
                className={`
                  w-full text-center transition-all
                  ${isFocused 
                    ? isRustic ? 'opacity-100' : 'bg-blue-500/20'
                    : isRustic
                      ? 'hover:opacity-70'
                      : 'hover:bg-black/5 dark:hover:bg-white/10'
                  }
                `}
                style={{
                  padding: '0px 1px',
                }}
              >
                <span
                  className="node-name whitespace-nowrap"
                  style={{
                    fontSize: '9px',
                    fontWeight: isFocused ? 700 : 600,
                    letterSpacing: isRustic ? '0.3px' : undefined,
                    color: isRustic ? undefined : 'var(--app-text)',
                  }}
                >
                  {formatText(sib.name)}
                </span>
              </button>
              {/* Línea divisoria fina entre nombres (excepto el último) */}
              {index < siblings.length - 1 && isRustic && (
                <div 
                  className="w-3/5 my-0.5" 
                  style={{ 
                    height: '0.5px', 
                    backgroundColor: 'var(--rustic-ink, #2c1810)' 
                  }} 
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
