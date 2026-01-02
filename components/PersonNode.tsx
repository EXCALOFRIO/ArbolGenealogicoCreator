import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { RenderNode } from '../types';
import { getGroupColor } from '../utils/colors';
import { useFamilyStore } from '../store/familyStore';
import { useIsMobile } from '../hooks/useIsMobile';
// RusticTwigDivider ya no se usa aquí

export const PersonNode = memo(({ data }: { data: RenderNode }) => {
  const setFocusId = useFamilyStore(state => state.setFocusId);
  const focusId = useFamilyStore(state => state.focusId);
  const visualTheme = useFamilyStore(state => state.visualTheme);
  const textCase = useFamilyStore(state => state.textCase);
  const people = useFamilyStore(state => state.people);
  const isMobile = useIsMobile();
  const colors = getGroupColor(data.surnames);
  const isFocus = data.id === focusId;
  const isRustic = visualTheme === 'rustic';

  const initials = data.name.substring(0, 2).toUpperCase();

  const getRelationLabel = (type: string, gender: string) => {
    const ancestorMatch = /^Ancestor(\d+)$/.exec(type);
    if (ancestorMatch) {
      const depth = parseInt(ancestorMatch[1], 10);
      if (depth === 3) return gender === 'Male' ? 'BISABUELO' : 'BISABUELA';
      if (depth === 4) return gender === 'Male' ? 'TATARABUELO' : 'TATARABUELA';
      if (depth >= 5) {
        const x = depth - 3;
        return `${gender === 'Male' ? 'TATARABUELO' : 'TATARABUELA'} x${x}`;
      }
    }
    const descendantMatch = /^Descendant(\d+)$/.exec(type);
    if (descendantMatch) {
      const depth = parseInt(descendantMatch[1], 10);
      if (depth === 3) return gender === 'Male' ? 'BISNIETO' : 'BISNIETA';
      if (depth === 4) return gender === 'Male' ? 'TATARANIETO' : 'TATARANIETA';
      if (depth >= 5) {
        const x = depth - 3;
        return `${gender === 'Male' ? 'TATARANIETO' : 'TATARANIETA'} x${x}`;
      }
    }
    switch (type) {
      case 'Focus': return '';
      case 'Parent': return gender === 'Male' ? 'PADRE' : 'MADRE';
      case 'Partner': return 'PAREJA';
      case 'ChildPartner': return gender === 'Male' ? 'YERNO' : 'NUERA';
      case 'CoInLaw': return gender === 'Male' ? 'CONSUEGRO' : 'CONSUEGRA';
      case 'ChildPartnerSibling': return gender === 'Male' ? 'CUÑADO' : 'CUÑADA';
      case 'ChildPartnerSiblingPartner': return gender === 'Male' ? 'CUÑADO' : 'CUÑADA';
      case 'ChildPartnerSiblingChild': return gender === 'Male' ? 'SOBRINO POL.' : 'SOBRINA POL.';
      case 'Child': return gender === 'Male' ? 'HIJO' : 'HIJA';
      case 'Sibling': return gender === 'Male' ? 'HERMANO' : 'HERMANA';
      case 'SiblingPartner': return gender === 'Male' ? 'CUÑADO' : 'CUÑADA';
      case 'PartnerSibling': return gender === 'Male' ? 'CUÑADO' : 'CUÑADA';
      case 'Uncle/Aunt': return gender === 'Male' ? 'TÍO' : 'TÍA';
      case 'UnclePartner': return gender === 'Male' ? 'TÍO POL.' : 'TÍA POL.';
      case 'Grandparent': return gender === 'Male' ? 'ABUELO' : 'ABUELA';
      case 'Grandchild': return gender === 'Male' ? 'NIETO' : 'NIETA';
      case 'Cousin': return gender === 'Male' ? 'PRIMO' : 'PRIMA';
      case 'CousinPartner': return gender === 'Male' ? 'PRIMO POL.' : 'PRIMA POL.';
      case 'Nephew/Niece': return gender === 'Male' ? 'SOBRINO' : 'SOBRINA';
      case 'InLaw': return gender === 'Male' ? 'SUEGRO' : 'SUEGRA';
      case 'InLawPartner': return gender === 'Male' ? 'SUEGRO' : 'SUEGRA';
      case 'CousinChild': return gender === 'Male' ? 'SOB. 2º' : 'SOB. 2ª';
      default: return type;
    }
  };

  const label = isFocus ? 'YO' : getRelationLabel(data.relationType, data.gender);

  // Función para formatear texto según textCase
  const formatText = (text: string) => {
    if (textCase === 'uppercase') {
      return text.toUpperCase();
    }
    // capitalize: primera letra de cada palabra en mayúscula
    // Usar split/map para manejar correctamente caracteres españoles (ñ, acentos)
    return text
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Calcular tamaño de fuente dinámico basado en el texto más largo
  const getRusticFontSizes = () => {
    // Encontrar el nombre y apellido más largo
    let maxNameLen = 0;
    let maxSurnamesLen = 0;
    for (const p of people) {
      const formattedName = formatText(p.name);
      const formattedSurnames = formatText(p.surnames);
      if (formattedName.length > maxNameLen) maxNameLen = formattedName.length;
      if (formattedSurnames.length > maxSurnamesLen) maxSurnamesLen = formattedSurnames.length;
    }
    
    // Ancho fijo de la caja (sin padding) - compacto
    const boxWidth = 90; // px
    
    // Calcular tamaño de fuente para que quepa el texto más largo
    const charWidthRatioName = 0.6;
    const charWidthRatioSurnames = 0.5;
    
    const nameFontSize = Math.min(11, Math.max(7, Math.floor(boxWidth / (maxNameLen * charWidthRatioName))));
    const surnamesFontSize = Math.min(9, Math.max(6, Math.floor(boxWidth / (maxSurnamesLen * charWidthRatioSurnames))));
    
    return { nameFontSize, surnamesFontSize };
  };

  // ============ TEMA RÚSTICO ============
  if (isRustic) {
    const { nameFontSize, surnamesFontSize } = getRusticFontSizes();
    
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          setFocusId(data.id);
        }}
        className="rustic-node relative flex flex-col items-center justify-center cursor-pointer py-1.5 px-2 w-[100px]"
      >
        <Handle type="target" position={Position.Top} className="bg-transparent! border-none! w-full! h-3! top-0!" />
        <Handle type="source" position={Position.Bottom} className="bg-transparent! border-none! w-full! h-3! bottom-0!" />
        <Handle type="source" position={Position.Left} id="left" className="bg-transparent! border-none!" />
        <Handle type="source" position={Position.Right} id="right" className="bg-transparent! border-none!" />

        {/* Nombre */}
        <h3 
          className="node-name text-center whitespace-nowrap"
          style={{ fontSize: `${nameFontSize}px` }}
        >
          {formatText(data.name)}
        </h3>
        
        {/* Línea divisoria simple */}
        <div className="rustic-divider w-full h-px my-1" />
        
        {/* Apellidos - cada uno en su línea */}
        <div className="flex flex-col items-center">
          {data.surnames.split(' ').map((surname, idx) => (
            <p 
              key={idx}
              className="node-surnames text-center whitespace-nowrap leading-tight"
              style={{ fontSize: `${surnamesFontSize}px` }}
            >
              {formatText(surname)}
            </p>
          ))}
        </div>
      </div>
    );
  }

  // ============ TEMA MODERNO (ORIGINAL) ============
  // Móvil: tarjeta compacta vertical (más estrecha y alta)
  if (isMobile) {
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          setFocusId(data.id);
        }}
        style={{
          background: 'var(--card-bg)',
          borderColor: isFocus ? 'var(--accent-highlight)' : 'var(--card-border)',
          boxShadow: isFocus ? '0 0 20px rgba(104, 144, 156, 0.3)' : undefined
        }}
        className={`
          relative flex flex-col items-center p-1.5 rounded-xl cursor-pointer 
          transition-all duration-300 ease-out w-[80px] border
          ${isFocus ? 'ring-2' : 'hover:shadow-md'}
          backdrop-blur-xl
        `}
      >
        <Handle type="target" position={Position.Top} className="bg-transparent! border-none! w-full! h-3! top-0!" />
        <Handle type="source" position={Position.Bottom} className="bg-transparent! border-none! w-full! h-3! bottom-0!" />
        <Handle type="source" position={Position.Left} id="left" className="bg-transparent! border-none!" />
        <Handle type="source" position={Position.Right} id="right" className="bg-transparent! border-none!" />

        {data.photo ? (
          <div
            style={{
              borderColor: isFocus ? 'var(--accent-highlight)' : 'var(--primary-400)',
              boxShadow: isFocus ? '0 0 10px rgba(104, 144, 156, 0.4)' : undefined
            }}
            className="w-8 h-8 rounded-full overflow-hidden shadow-sm ring-1 transition-all duration-200"
          >
            <img src={data.photo} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-[8px] font-bold shadow-sm ${colors.bg} ${colors.text} ring-1 transition-all duration-200`}
            style={{
              borderColor: isFocus ? 'var(--accent-highlight)' : 'var(--primary-400)',
              boxShadow: isFocus ? '0 0 10px rgba(104, 144, 156, 0.4)' : undefined
            }}
          >
            {initials}
          </div>
        )}

        <span
          style={{ color: isFocus ? 'var(--accent-highlight)' : 'var(--app-text-subtle)' }}
          className="text-[7px] font-semibold tracking-wide mt-0.5"
        >
          {label}
        </span>
        <div className="flex flex-col items-center mt-0.5 w-full px-0.5">
          <h3 
            style={{ color: 'var(--app-text)' }} 
            className="text-[9px] font-semibold leading-tight text-center wrap-break-word w-full"
          >
            {formatText(data.name)}
          </h3>
          <p 
            style={{ color: 'var(--app-text-muted)' }} 
            className="text-[8px] text-center leading-tight mt-0.5 wrap-break-word w-full"
          >
            {formatText(data.surnames)}
          </p>
        </div>
      </div>
    );
  }

  // Desktop: tarjeta normal
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setFocusId(data.id);
      }}
      style={{
        background: 'var(--card-bg)',
        borderColor: isFocus ? 'var(--accent-highlight)' : 'var(--card-border)',
        boxShadow: isFocus ? '0 0 25px rgba(104, 144, 156, 0.35)' : undefined
      }}
      className={`
        relative flex flex-col items-center p-2 rounded-[16px] cursor-pointer 
        transition-all duration-300 ease-out w-[100px] h-auto border
        ${isFocus ? 'ring-2' : 'hover:shadow-lg'}
        backdrop-blur-xl
      `}
    >
      <Handle type="target" position={Position.Top} className="bg-transparent! border-none! w-full! h-4! top-0!" />
      <Handle type="source" position={Position.Bottom} className="bg-transparent! border-none! w-full! h-4! bottom-0!" />
      <Handle type="source" position={Position.Left} id="left" className="bg-transparent! border-none!" />
      <Handle type="source" position={Position.Right} id="right" className="bg-transparent! border-none!" />

      {data.photo ? (
        <div
          style={{
            borderColor: isFocus ? 'var(--accent-highlight)' : 'var(--primary-400)',
            boxShadow: isFocus ? '0 0 12px rgba(104, 144, 156, 0.4)' : undefined
          }}
          className="w-9 h-9 rounded-full overflow-hidden shadow-md ring-2 transition-all duration-200 mb-1"
        >
          <img src={data.photo} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-md ${colors.bg} ${colors.text} ring-2 transition-all duration-200 mb-1`}
          style={{
            borderColor: isFocus ? 'var(--accent-highlight)' : 'var(--primary-400)',
            boxShadow: isFocus ? '0 0 12px rgba(104, 144, 156, 0.4)' : undefined
          }}
        >
          {initials}
        </div>
      )}

      <span
        style={{ color: isFocus ? 'var(--accent-highlight)' : 'var(--app-text-subtle)' }}
        className="text-[8px] font-semibold tracking-wider"
      >
        {label}
      </span>
      <div className="flex flex-col items-center mt-0.5 w-full px-0.5">
        <h3 
          style={{ color: 'var(--app-text)' }} 
          className="text-[10px] font-bold leading-tight text-center wrap-break-word w-full"
        >
          {formatText(data.name)}
        </h3>
        <p 
          style={{ color: 'var(--app-text-muted)' }} 
          className="text-[9px] text-center leading-normal mt-0.5 wrap-break-word w-full"
        >
          {formatText(data.surnames)}
        </p>
      </div>
    </div>
  );
});

PersonNode.displayName = 'PersonNode';