import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { RenderNode } from '../types';
import { getGroupColor } from '../utils/colors';
import { useFamilyStore } from '../store/familyStore';

interface Props {
  node: RenderNode;
}

export const PersonCard = forwardRef<HTMLDivElement, Props>(({ node }, ref) => {
  const setFocusId = useFamilyStore(state => state.setFocusId);
  const colors = getGroupColor(node.surnames);
  const isFocus = node.relationType === 'Focus';
  
  // Iniciales para el avatar
  const initials = node.name.substring(0, 2).toUpperCase();

  // Traducción de relaciones
  const getRelationLabel = (type: string, gender: string) => {
    switch (type) {
        case 'Focus': return 'YO';
        case 'Parent': return gender === 'Male' ? 'PADRE' : 'MADRE';
        case 'Partner': return 'PAREJA';
        case 'ChildPartner': return gender === 'Male' ? 'YERNO' : 'NUERA';
        case 'Child': return gender === 'Male' ? 'HIJO' : 'HIJA';
        case 'Sibling': return gender === 'Male' ? 'HERMANO' : 'HERMANA';
        case 'Uncle/Aunt': return gender === 'Male' ? 'TÍO' : 'TÍA';
        case 'Grandparent': return gender === 'Male' ? 'ABUELO' : 'ABUELA';
        case 'Grandchild': return gender === 'Male' ? 'NIETO' : 'NIETA';
        case 'Cousin': return gender === 'Male' ? 'PRIMO' : 'PRIMA';
        default: return type;
    }
  };

  const label = getRelationLabel(node.relationType, node.gender);

  return (
    <motion.div
      ref={ref}
      layoutId={node.id}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={() => setFocusId(node.id)}
      className={`
        relative flex items-center pr-4 sm:pr-6 pl-1.5 sm:pl-2 py-1.5 sm:py-2 gap-2 sm:gap-4 rounded-full cursor-pointer 
        transition-all z-20 shadow-xl border backdrop-blur-sm
        ${isFocus 
          ? 'bg-gradient-to-r from-slate-800/95 to-slate-900/95 ring-2 ring-cyan-400/50 shadow-2xl shadow-cyan-500/20 border-cyan-500/30' 
          : 'bg-slate-900/90 hover:bg-slate-800/95 border-slate-700/50 hover:border-slate-600/50 hover:shadow-2xl'}
      `}
    >
        {/* Avatar Circular con Color de Rama */}
        <div className={`
            w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center 
            text-sm sm:text-lg font-bold shadow-inner ${colors.bg} ${colors.text}
            ring-2 ring-white/10
        `}>
            {node.photo ? (
              <img src={node.photo} className="w-full h-full rounded-full object-cover" alt={node.name} />
            ) : (
              initials
            )}
        </div>

        {/* Info Text */}
        <div className="flex flex-col min-w-0">
            <span className={`text-[8px] sm:text-[10px] font-bold tracking-widest mb-0.5 ${isFocus ? 'text-cyan-400' : 'text-slate-500'}`}>
                {label}
            </span>
            <h3 className="text-xs sm:text-sm font-bold text-white leading-none whitespace-nowrap truncate">{node.name}</h3>
            <p className="text-[8px] sm:text-[10px] font-medium text-slate-400 uppercase tracking-wide mt-0.5 truncate">{node.surnames}</p>
        </div>

        {/* Focus indicator */}
        {isFocus && (
          <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-cyan-400 rounded-full flex items-center justify-center shadow-lg shadow-cyan-400/50">
            <svg className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-slate-900" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
    </motion.div>
  );
});

PersonCard.displayName = 'PersonCard';