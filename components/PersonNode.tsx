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
        className={`
          relative flex flex-col items-center p-2 rounded-xl cursor-pointer 
          transition-all duration-300 ease-out w-[100px]
          ${isFocus 
            ? 'bg-gradient-to-br from-slate-800 to-slate-900 ring-2 ring-cyan-500/40 shadow-lg shadow-cyan-500/20' 
            : 'bg-gradient-to-br from-slate-800/90 to-slate-900/95 border border-slate-700/40'}
          backdrop-blur-xl
        `}
      >
        <Handle type="target" position={Position.Top} className="!bg-transparent !border-none !w-full !h-3 !top-0" />
        <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-none !w-full !h-3 !bottom-0" />
        <Handle type="source" position={Position.Left} id="left" className="!bg-transparent !border-none" />
        <Handle type="source" position={Position.Right} id="right" className="!bg-transparent !border-none" />

        {data.photo ? (
          <div className={`
            w-9 h-9 rounded-full overflow-hidden shadow-md
            ring-2 ${isFocus ? 'ring-cyan-400/60' : 'ring-black/30'}
            transition-all duration-200
          `}>
            <img src={data.photo} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className={`
            w-9 h-9 rounded-full flex items-center justify-center 
            text-xs font-bold shadow-md ${colors.bg} ${colors.text}
            ring-2 ${isFocus ? 'ring-cyan-400/60' : 'ring-black/30'}
            transition-all duration-200
          `}>
            {initials}
          </div>
        )}

        <span className={`text-[7px] font-semibold tracking-wide mt-1 ${isFocus ? 'text-cyan-400' : 'text-slate-500'}`}>
          {label}
        </span>
        <h3 className="text-[9px] font-semibold text-white leading-tight text-center mt-0.5 line-clamp-1">{data.name}</h3>
        <p className="text-[8px] text-slate-500 text-center leading-tight line-clamp-1">{data.surnames}</p>
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
      className={`
        relative flex flex-col items-center p-4 rounded-[28px] cursor-pointer 
        transition-all duration-300 ease-out w-[160px]
        ${isFocus 
          ? 'bg-gradient-to-br from-slate-800 to-slate-900 ring-2 ring-cyan-500/30 shadow-[0_0_30px_rgba(34,211,238,0.15)]' 
          : 'bg-gradient-to-br from-slate-800/90 to-slate-900/95 hover:from-slate-750 border border-slate-700/40'}
        backdrop-blur-xl
      `}
    >
        <Handle type="target" position={Position.Top} className="!bg-transparent !border-none !w-full !h-4 !top-0" />
        <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-none !w-full !h-4 !bottom-0" />
        <Handle type="source" position={Position.Left} id="left" className="!bg-transparent !border-none" />
        <Handle type="source" position={Position.Right} id="right" className="!bg-transparent !border-none" />

        {data.photo ? (
          <div className={`
            w-12 h-12 rounded-full overflow-hidden shadow-lg
            ring-[3px] ${isFocus ? 'ring-cyan-400/60 shadow-cyan-500/30 shadow-lg' : 'ring-black/40'}
            transition-all duration-200 mb-2
          `}>
            <img src={data.photo} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className={`
              w-12 h-12 rounded-full flex items-center justify-center 
              text-base font-bold shadow-lg ${colors.bg} ${colors.text}
              ring-[3px] ${isFocus ? 'ring-cyan-400/60 shadow-cyan-500/30 shadow-lg' : 'ring-black/40'}
              transition-all duration-200 mb-2
          `}>
              {initials}
          </div>
        )}

        <span className={`text-[8px] font-semibold tracking-wider ${isFocus ? 'text-cyan-400' : 'text-slate-500'}`}>
            {label}
        </span>
        <h3 className="text-[11px] font-semibold text-white leading-tight text-center mt-0.5">{data.name}</h3>
        <p className="text-[9px] text-slate-500 text-center leading-tight">{data.surnames}</p>
    </div>
  );
});

PersonNode.displayName = 'PersonNode';