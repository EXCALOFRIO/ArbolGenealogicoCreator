import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { RenderNode } from '../types';
import { getGroupColor } from '../utils/colors';
import { useFamilyStore } from '../store/familyStore';
import { useIsMobile } from '../hooks/useIsMobile';

export const PersonNode = memo(({ data }: { data: RenderNode }) => {
  const setFocusId = useFamilyStore(state => state.setFocusId);
  const focusId = useFamilyStore(state => state.focusId);
  const isMobile = useIsMobile();
  const colors = getGroupColor(data.surnames);
  const isFocus = data.id === focusId;

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
          relative flex flex-col items-center p-2 rounded-xl cursor-pointer 
          transition-all duration-300 ease-out w-[100px] border
          ${isFocus ? 'ring-2' : 'hover:shadow-md'}
          backdrop-blur-xl
        `}
      >
        <Handle type="target" position={Position.Top} className="!bg-transparent !border-none !w-full !h-3 !top-0" />
        <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-none !w-full !h-3 !bottom-0" />
        <Handle type="source" position={Position.Left} id="left" className="!bg-transparent !border-none" />
        <Handle type="source" position={Position.Right} id="right" className="!bg-transparent !border-none" />

        {data.photo ? (
          <div
            style={{
              borderColor: isFocus ? 'var(--accent-highlight)' : 'var(--primary-400)',
              boxShadow: isFocus ? '0 0 12px rgba(104, 144, 156, 0.4)' : undefined
            }}
            className="w-10 h-10 rounded-full overflow-hidden shadow-md ring-2 transition-all duration-200"
          >
            <img src={data.photo} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md ${colors.bg} ${colors.text} ring-2 transition-all duration-200`}
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
          className="text-[8px] font-semibold tracking-wide mt-1"
        >
          {label}
        </span>
        <div className="flex flex-col items-center mt-0.5 w-full px-1">
          <h3 style={{ color: 'var(--app-text)' }} className="text-[11px] font-semibold leading-tight text-center break-words w-full">{data.name}</h3>
          <p style={{ color: 'var(--app-text-muted)' }} className="text-[9px] text-center leading-tight mt-0.5 break-words w-full">{data.surnames}</p>
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
        relative flex flex-col items-center p-3 rounded-[20px] cursor-pointer 
        transition-all duration-300 ease-out w-[130px] h-auto border
        ${isFocus ? 'ring-2' : 'hover:shadow-lg'}
        backdrop-blur-xl
      `}
    >
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-none !w-full !h-4 !top-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-none !w-full !h-4 !bottom-0" />
      <Handle type="source" position={Position.Left} id="left" className="!bg-transparent !border-none" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-transparent !border-none" />

      {data.photo ? (
        <div
          style={{
            borderColor: isFocus ? 'var(--accent-highlight)' : 'var(--primary-400)',
            boxShadow: isFocus ? '0 0 15px rgba(104, 144, 156, 0.4)' : undefined
          }}
          className="w-12 h-12 rounded-full overflow-hidden shadow-lg ring-[3px] transition-all duration-200 mb-2"
        >
          <img src={data.photo} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold shadow-lg ${colors.bg} ${colors.text} ring-[3px] transition-all duration-200 mb-2`}
          style={{
            borderColor: isFocus ? 'var(--accent-highlight)' : 'var(--primary-400)',
            boxShadow: isFocus ? '0 0 15px rgba(104, 144, 156, 0.4)' : undefined
          }}
        >
          {initials}
        </div>
      )}

      <span
        style={{ color: isFocus ? 'var(--accent-highlight)' : 'var(--app-text-subtle)' }}
        className="text-[9px] font-semibold tracking-wider"
      >
        {label}
      </span>
      <div className="flex flex-col items-center mt-1 w-full px-1">
        <h3 style={{ color: 'var(--app-text)' }} className="text-[13px] font-bold leading-tight text-center break-words w-full">{data.name}</h3>
        <p style={{ color: 'var(--app-text-muted)' }} className="text-[11px] text-center leading-normal mt-1 break-words w-full">{data.surnames}</p>
      </div>
    </div>
  );
});

PersonNode.displayName = 'PersonNode';