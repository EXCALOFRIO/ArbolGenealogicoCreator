import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFamilyStore } from '../store/familyStore';
import { useTutorial } from '../hooks/useTutorial';
import { RelationContext } from '../types';

type ActionType = 'add' | 'edit' | 'delete' | 'export' | 'import';

interface ActionItem {
  id: string;
  label: string;
  context?: RelationContext;
  type: ActionType;
  color: string;
  icon: React.ReactNode;
}

const PlusIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

const HeartIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
  </svg>
);

const ChildIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l4-4m-4 4l-4-4M4 17v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
  </svg>
);

const UploadIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21V9m0 0l4 4m-4-4l-4 4M4 7V4a1 1 0 011-1h14a1 1 0 011 1v3" />
  </svg>
);

const TreeIcon = () => (
  <svg className="w-10 h-10 sm:w-12 sm:h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const SparkleIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);

export const ActionMenu: React.FC = () => {
  const { focusId, people, getPerson, openAddModal, openEditModal, deletePerson, exportRelationships, importRelationships } = useFamilyStore();
  const { startTutorial, hasCompletedOnce } = useTutorial();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const person = getPerson(focusId);

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      importRelationships(parsed);
    } catch {
      window.alert('JSON inválido o no compatible');
    }
  };

  // Si no hay personas, mostrar pantalla de inicio mejorada
  if (people.length === 0) {
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={onImportFile}
        />
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4">
          <motion.div 
            initial={{ y: 30, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative bg-gradient-to-b from-slate-800/95 to-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/50 pointer-events-auto text-center w-full max-w-sm sm:max-w-md overflow-hidden"
          >
            {/* Decorative gradient line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500" />
            
            {/* Logo/Icon */}
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 flex items-center justify-center mx-auto mb-4 sm:mb-6 text-cyan-400 border border-cyan-500/20"
            >
              <TreeIcon />
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white via-cyan-200 to-white bg-clip-text text-transparent mb-2"
            >
              Árbol Genealogico Creator
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-slate-400 text-sm sm:text-base mb-6 sm:mb-8"
            >
              Construye tu árbol genealógico de forma visual e intuitiva
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col gap-3"
            >
              {/* Main actions */}
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: '0 20px 40px -15px rgba(6, 182, 212, 0.4)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    openAddModal('None');
                    // Iniciar tutorial solo la primera vez
                    if (!hasCompletedOnce) {
                      startTutorial();
                    }
                  }}
                  className="flex-1 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <PlusIcon className="w-4 h-4" />
                  Nuevo Árbol
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-3.5 sm:py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-all flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-600 text-sm sm:text-base"
                >
                  <UploadIcon />
                  Importar
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </>
    );
  }

  if (!person) return null;

  const addActions: ActionItem[] = [
    { id: 'parent', label: 'Padre', context: 'Parent', type: 'add', color: 'from-blue-500 to-blue-600', icon: <PlusIcon /> },
    { id: 'partner', label: 'Pareja', context: 'Partner', type: 'add', color: 'from-pink-500 to-rose-500', icon: <HeartIcon /> },
    { id: 'sibling', label: 'Hermano', context: 'Sibling', type: 'add', color: 'from-cyan-500 to-teal-500', icon: <UsersIcon /> },
    { id: 'child', label: 'Hijo', context: 'Child', type: 'add', color: 'from-violet-500 to-purple-600', icon: <ChildIcon /> },
  ];

  const manageActions: ActionItem[] = [
    { id: 'edit', label: 'Editar', type: 'edit', color: 'from-amber-500 to-orange-500', icon: <EditIcon /> },
    { id: 'delete', label: 'Eliminar', type: 'delete', color: 'from-red-500 to-red-600', icon: <TrashIcon /> },
    { id: 'export', label: 'Exportar', type: 'export', color: 'from-emerald-500 to-green-600', icon: <DownloadIcon /> },
    { id: 'import', label: 'Importar', type: 'import', color: 'from-sky-500 to-cyan-600', icon: <UploadIcon /> },
  ];

  const handleAction = (action: ActionItem) => {
    if (action.type === 'add' && action.context) {
      openAddModal(action.context);
    } else if (action.type === 'edit') {
      openEditModal(person);
    } else if (action.type === 'delete') {
      setShowDeleteConfirm(true);
    } else if (action.type === 'export') {
      try {
        const payload = exportRelationships();
        const json = JSON.stringify(payload, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'family-relationships.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch {
        window.alert('No se pudo exportar el JSON');
      }
    } else if (action.type === 'import') {
      fileInputRef.current?.click();
    }
    setIsExpanded(false);
  };

  const confirmDelete = () => {
    deletePerson(focusId);
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={onImportFile}
      />
      
      {/* Mobile: Floating Action Button */}
      <div className="sm:hidden fixed bottom-4 right-4 z-50">
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="absolute bottom-16 right-0 bg-slate-900/95 backdrop-blur-xl rounded-2xl p-3 shadow-2xl border border-slate-700/50 min-w-[220px]"
            >
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2 px-2">
                {person.name}
              </div>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {addActions.map(action => (
                  <button
                    key={action.id}
                    onClick={() => handleAction(action)}                    data-tutorial={action.id === 'parent' ? 'padre' : undefined}                    className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-slate-800 transition-colors active:scale-95"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-white shadow-lg`}>
                      {action.icon}
                    </div>
                    <span className="text-[9px] text-slate-400">{action.label}</span>
                  </button>
                ))}
              </div>
              <div className="border-t border-slate-700/50 pt-2 grid grid-cols-4 gap-2">
                {manageActions.map(action => (
                  <button
                    key={action.id}
                    onClick={() => handleAction(action)}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-slate-800 transition-colors active:scale-95"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-white shadow-lg`}>
                      {action.icon}
                    </div>
                    <span className="text-[9px] text-slate-400">{action.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 flex items-center justify-center transition-transform duration-200 ${isExpanded ? 'rotate-45' : ''}`}
        >
          <PlusIcon className="w-6 h-6" />
        </motion.button>
      </div>

      {/* Desktop: Bottom Bar */}
      <div className="hidden sm:block fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-50">
        <motion.div 
            initial={{ y: 30, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl px-3 md:px-5 py-3 md:py-4 shadow-2xl shadow-black/50"
        >
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2 md:mb-3 text-center">
                <span className="text-white font-bold">{person.name}</span>
            </div>
            
            <div className="flex items-center gap-1 md:gap-2">
                {/* Add Actions */}
                <div className="flex gap-1 md:gap-1.5">
                  {addActions.map((action) => (
                      <motion.button
                          key={action.id}
                          whileHover={{ scale: 1.08, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleAction(action)}
                          data-tutorial={action.id === 'parent' ? 'padre' : undefined}
                          className="flex flex-col items-center gap-1 group"
                      >
                          <div className={`
                            w-9 h-9 md:w-11 md:h-11 rounded-xl bg-gradient-to-br ${action.color}
                            flex items-center justify-center text-white
                            shadow-md group-hover:shadow-lg transition-all
                            ring-1 ring-white/10 group-hover:ring-white/30
                          `}>
                              {action.icon}
                          </div>
                          <span className="text-[7px] md:text-[9px] font-medium text-slate-500 group-hover:text-white uppercase transition-colors tracking-wide">
                              {action.label}
                          </span>
                      </motion.button>
                  ))}
                </div>

                {/* Divider */}
                <div className="w-px h-10 md:h-12 bg-slate-700/50 mx-1 md:mx-2" />

                {/* Manage Actions */}
                <div className="flex gap-1 md:gap-1.5">
                  {manageActions.map((action) => (
                      <motion.button
                          key={action.id}
                          whileHover={{ scale: 1.08, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleAction(action)}
                          className="flex flex-col items-center gap-1 group"
                      >
                          <div className={`
                            w-9 h-9 md:w-11 md:h-11 rounded-xl bg-gradient-to-br ${action.color}
                            flex items-center justify-center text-white
                            shadow-md group-hover:shadow-lg transition-all
                            ring-1 ring-white/10 group-hover:ring-white/30
                          `}>
                              {action.icon}
                          </div>
                          <span className="text-[7px] md:text-[9px] font-medium text-slate-500 group-hover:text-white uppercase transition-colors tracking-wide">
                              {action.label}
                          </span>
                      </motion.button>
                  ))}
                </div>
            </div>
        </motion.div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4 text-red-400">
                <TrashIcon />
              </div>
              <h3 className="text-lg font-bold text-white text-center mb-2">¿Eliminar a {person.name}?</h3>
              <p className="text-sm text-slate-400 text-center mb-6">
                Esta acción eliminará a esta persona y todas sus conexiones familiares.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-medium text-sm transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};