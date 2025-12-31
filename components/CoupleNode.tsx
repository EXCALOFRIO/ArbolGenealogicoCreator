import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { RenderNode } from '../types';
import { getGroupColor } from '../utils/colors';
import { useFamilyStore } from '../store/familyStore';
import { useIsMobile } from '../hooks/useIsMobile';

interface CoupleNodeData {
  person1: RenderNode;
  person2: RenderNode;
  coupleId: string;
}

const PersonAvatar = ({ person, onClick, isFocus, compact = false }: { person: RenderNode; onClick: () => void; isFocus: boolean; compact?: boolean }) => {
  const colors = getGroupColor(person.surnames);
  const initials = person.name.substring(0, 2).toUpperCase();

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

  // Versión compacta para móvil
  if (compact) {
    return (
      <div
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        style={{
          background: isFocus ? 'var(--background-200)' : 'transparent'
        }}
        className={`
          flex flex-1 min-w-0 flex-col items-center p-1.5 rounded-lg cursor-pointer transition-all duration-200
          ${isFocus ? 'scale-105' : 'hover:opacity-80'}
        `}
      >
        {person.photo ? (
          <div
            style={{
              borderColor: isFocus ? 'var(--accent-highlight)' : 'var(--primary-400)',
              boxShadow: isFocus ? '0 0 10px rgba(104, 144, 156, 0.4)' : undefined
            }}
            className="w-8 h-8 rounded-full overflow-hidden shadow-md ring-2 transition-all duration-200"
          >
            <img src={person.photo} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md ${colors.bg} ${colors.text} ring-2 transition-all duration-200`}
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
          className="text-[8px] font-semibold tracking-wide mt-1"
        >
          {isFocus ? 'YO' : getRelationLabel(person.relationType, person.gender)}
        </span>
        <div className="flex flex-col items-center mt-0.5 w-full px-1">
          <h3 style={{ color: 'var(--app-text)' }} className="text-[10px] font-semibold leading-tight text-center break-words w-full">{person.name}</h3>
          <p style={{ color: 'var(--app-text-muted)' }} className="text-[8px] text-center leading-tight mt-0.5 break-words w-full">{person.surnames}</p>
        </div>
      </div>
    );
  }

  // Versión normal para desktop
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        background: isFocus ? 'var(--background-200)' : 'transparent'
      }}
      className={`
        flex flex-1 min-w-0 flex-col items-center p-3 rounded-2xl cursor-pointer transition-all duration-200
        ${isFocus ? 'scale-105' : 'hover:opacity-80'}
      `}
    >
      {person.photo ? (
        <div
          style={{
            borderColor: isFocus ? 'var(--accent-highlight)' : 'var(--primary-400)',
            boxShadow: isFocus ? '0 0 12px rgba(104, 144, 156, 0.4)' : undefined
          }}
          className="w-11 h-11 rounded-full overflow-hidden shadow-lg ring-[3px] transition-all duration-200"
        >
          <img src={person.photo} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center text-base font-bold shadow-lg ${colors.bg} ${colors.text} ring-[3px] transition-all duration-200`}
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
        className="text-[9px] font-semibold tracking-wider mt-2"
      >
        {isFocus ? 'YO' : getRelationLabel(person.relationType, person.gender)}
      </span>
      <div className="flex flex-col items-center mt-1 w-full px-1">
        <h3 style={{ color: 'var(--app-text)' }} className="text-[12px] font-bold leading-tight text-center break-words w-full">{person.name}</h3>
        <p style={{ color: 'var(--app-text-muted)' }} className="text-[10px] text-center leading-normal mt-0.5 break-words w-full">{person.surnames}</p>
      </div>
    </div>
  );
};

export const CoupleNode = memo(({ data }: { data: CoupleNodeData }) => {
  const setFocusId = useFamilyStore(state => state.setFocusId);
  const focusId = useFamilyStore(state => state.focusId);
  const isMobile = useIsMobile();

  const { person1, person2 } = data;
  const isFocus1 = person1.id === focusId;
  const isFocus2 = person2.id === focusId;
  const hasAnyFocus = isFocus1 || isFocus2;

  // Versión compacta para móvil
  if (isMobile) {
    return (
      <div
        style={{
          background: 'var(--card-bg)',
          borderColor: hasAnyFocus ? 'var(--accent-highlight)' : 'var(--card-border)',
          boxShadow: hasAnyFocus ? '0 0 20px rgba(104, 144, 156, 0.3)' : undefined
        }}
        className={`
          relative flex w-[200px] h-[130px] items-center gap-0 rounded-xl p-1 border
          transition-all duration-300 ease-out
          ${hasAnyFocus ? 'ring-2' : 'hover:shadow-md'}
          backdrop-blur-xl
        `}
      >
        <Handle
          type="target"
          position={Position.Top}
          id={`top-${person1.id}`}
          className="!bg-transparent !border-none"
          style={{ left: '25%' }}
        />
        <Handle
          type="target"
          position={Position.Top}
          id={`top-${person2.id}`}
          className="!bg-transparent !border-none"
          style={{ left: '75%' }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          className="!bg-transparent !border-none"
          style={{ left: '50%' }}
        />

        <PersonAvatar person={person1} onClick={() => setFocusId(person1.id)} isFocus={isFocus1} compact />

        <div className="flex items-center justify-center px-0 -mx-1 z-10">
          <div
            style={{ background: 'var(--heart-bg)' }}
            className="w-5 h-5 rounded-full flex items-center justify-center shadow-sm"
          >
            <svg style={{ color: 'var(--heart-color)' }} className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        <PersonAvatar person={person2} onClick={() => setFocusId(person2.id)} isFocus={isFocus2} compact />
      </div>
    );
  }

  // Versión normal para desktop
  return (
    <div
      style={{
        background: 'var(--card-bg)',
        borderColor: hasAnyFocus ? 'var(--accent-highlight)' : 'var(--card-border)',
        boxShadow: hasAnyFocus ? '0 0 25px rgba(104, 144, 156, 0.35)' : undefined
      }}
      className={`
        relative flex w-[260px] h-auto items-center gap-0 rounded-[20px] p-1.5 border
        transition-all duration-300 ease-out
        ${hasAnyFocus ? 'ring-2' : 'hover:shadow-lg'}
        backdrop-blur-xl
      `}
    >
      {/* Handles específicos para cada persona en la pareja */}
      <Handle
        type="target"
        position={Position.Top}
        id={`top-${person1.id}`}
        className="!bg-transparent !border-none"
        style={{ left: '25%' }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id={`top-${person2.id}`}
        className="!bg-transparent !border-none"
        style={{ left: '75%' }}
      />
      {/* Handle general para hijos (centro) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-transparent !border-none"
        style={{ left: '50%' }}
      />

      <PersonAvatar person={person1} onClick={() => setFocusId(person1.id)} isFocus={isFocus1} />

      {/* Heart connector */}
      <div className="flex flex-col items-center justify-center px-0 -mx-2 z-10">
        <div
          style={{ background: 'var(--heart-bg)' }}
          className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 shadow-md"
        >
          <svg style={{ color: 'var(--heart-color)' }} className="w-3.5 h-3.5 transition-colors" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      <PersonAvatar person={person2} onClick={() => setFocusId(person2.id)} isFocus={isFocus2} />
    </div>
  );
});

CoupleNode.displayName = 'CoupleNode';
