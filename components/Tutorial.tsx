import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTutorial, TutorialStep } from '../hooks/useTutorial';
import { useFamilyStore } from '../store/familyStore';
import { useIsMobile } from '../hooks/useIsMobile';

const STEP_CONFIG: Record<TutorialStep, {
  title: string;
  description: string;
  tip?: string;
  highlight?: 'nombre' | 'apellidos' | 'confirmar' | 'padre' | 'card' | 'none';
}> = {
  welcome: {
    title: '¡Bienvenido! ✨',
    description: 'Te guiaremos para crear tu árbol genealógico.',
    highlight: 'none',
  },
  'create-self': {
    title: 'Paso 1: Tu nombre ✏️',
    description: 'Escribe tu nombre en el campo.',
    highlight: 'nombre',
  },
  'enter-surname': {
    title: 'Ahora los apellidos ✏️',
    description: 'Escribe los apellidos.',
    highlight: 'apellidos',
  },
  'confirm-person': {
    title: '¡Confirma! ✅',
    description: 'Pulsa el botón Confirmar.',
    highlight: 'confirmar',
  },
  'explain-card': {
    title: '¡Genial! 🎉',
    description: 'Esta es tu tarjeta en el árbol.',
    highlight: 'card',
  },
  'add-father': {
    title: 'Añade a tu padre 👨',
    description: 'Pulsa el botón PADRE en el menú.',
    highlight: 'padre',
  },
  'add-mother': {
    title: 'Añade a tu madre 👩',
    description: 'Pulsa PADRE de nuevo para añadirla.',
    highlight: 'padre',
  },
  explore: {
    title: '¡Listo! 🌟',
    description: 'Arrastra para moverte, pellizca para zoom.',
    highlight: 'none',
  },
  completed: {
    title: '',
    description: '',
    highlight: 'none',
  },
};

// Pasos que mantienen highlight durante el formulario de padres
const FORM_STEPS: TutorialStep[] = ['enter-surname', 'confirm-person'];

export const Tutorial: React.FC = () => {
  const { isActive, currentStep, skipTutorial, nextStep, hasCompletedOnce, goToStep } = useTutorial();
  const { people, isModalOpen, modalContext } = useFamilyStore();
  const isMobile = useIsMobile();

  // No mostrar tutorial en móviles
  if (isMobile) return null;
  
  // Estado para posiciones de elementos
  const [positions, setPositions] = useState<{
    nombre: DOMRect | null;
    apellidos: DOMRect | null;
    confirmar: DOMRect | null;
    padre: DOMRect | null;
  }>({ nombre: null, apellidos: null, confirmar: null, padre: null });

  // Función para actualizar posiciones de elementos
  const updatePositions = useCallback(() => {
    const nombreEl = document.querySelector('[data-tutorial="nombre"]');
    const apellidosEl = document.querySelector('[data-tutorial="apellidos"]');
    const confirmarEl = document.querySelector('[data-tutorial="confirmar"]');
    const padreEl = document.querySelector('[data-tutorial="padre"]');
    
    setPositions({
      nombre: nombreEl?.getBoundingClientRect() || null,
      apellidos: apellidosEl?.getBoundingClientRect() || null,
      confirmar: confirmarEl?.getBoundingClientRect() || null,
      padre: padreEl?.getBoundingClientRect() || null,
    });
  }, []);

  // Actualizar posiciones cuando cambia el paso o se abre/cierra el modal
  useEffect(() => {
    if (!isActive) return;
    
    // Pequeño delay para esperar a que el DOM se actualice
    const timer = setTimeout(updatePositions, 100);
    
    // También escuchar resize
    window.addEventListener('resize', updatePositions);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePositions);
    };
  }, [isActive, currentStep, isModalOpen, updatePositions]);
  
  // Determinar si estamos en el flujo de añadir padre/madre
  const isAddingParent = isModalOpen && modalContext === 'Parent' && people.length >= 1;
  
  // Auto-advance based on people added
  React.useEffect(() => {
    if (!isActive) return;
    
    // Si ya hay 2 o más personas, el tutorial está completo - terminar inmediatamente
    if (people.length >= 2) {
      goToStep('explore');
      return;
    }
    
    // Cuando se añade la primera persona, avanzar al paso explain-card
    if ((currentStep === 'create-self' || currentStep === 'enter-surname' || currentStep === 'confirm-person') && people.length === 1 && !isAddingParent) {
      goToStep('explain-card');
    } else if (currentStep === 'explain-card' && people.length === 1) {
      const timer = setTimeout(() => nextStep(), 2500);
      return () => clearTimeout(timer);
    } else if (currentStep === 'add-father' && isAddingParent) {
      // Cuando se abre el modal de padre, cambiar a paso de nombre
      goToStep('create-self');
    } else if (currentStep === 'explore') {
      const timer = setTimeout(() => skipTutorial(), 2000);
      return () => clearTimeout(timer);
    }
  }, [isActive, currentStep, people.length, nextStep, skipTutorial, goToStep, isAddingParent]);

  const config = STEP_CONFIG[currentStep];
  
  if (!isActive || currentStep === 'completed' || !config) return null;

  // Solo contar pasos principales para la barra de progreso (sin add-mother)
  const mainSteps: TutorialStep[] = ['create-self', 'explain-card', 'add-father', 'explore'];
  // Mapear subpasos al paso principal
  const getMainStep = (step: TutorialStep): TutorialStep => {
    if (step === 'enter-surname' || step === 'confirm-person') return 'create-self';
    return step;
  };
  const mainStep = getMainStep(currentStep);
  const stepIndex = mainSteps.indexOf(mainStep);
  const totalSteps = mainSteps.length;

  // Tutorial con highlights interactivos - posiciones dinámicas basadas en elementos reales
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] pointer-events-none"
      >
        {/* Indicador flotante para NOMBRE - posición dinámica */}
        {config.highlight === 'nombre' && positions.nombre && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed z-[152] flex items-center"
            style={{ 
              top: positions.nombre.top + positions.nombre.height / 2 - 8,
              left: positions.nombre.left - 220,
            }}
          >
            <motion.div
              animate={{ x: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
              className="flex items-center"
            >
              <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-2 rounded-2xl text-sm font-bold shadow-xl shadow-cyan-500/40 whitespace-nowrap">
                ✏️ Escribe tu nombre aquí
              </div>
              <motion.svg 
                animate={{ x: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="w-6 h-6 text-cyan-400 ml-1" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </motion.svg>
            </motion.div>
          </motion.div>
        )}

        {/* Indicador flotante para APELLIDOS - posición dinámica */}
        {config.highlight === 'apellidos' && positions.apellidos && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed z-[152] flex items-center"
            style={{ 
              top: positions.apellidos.top + positions.apellidos.height / 2 - 8,
              left: positions.apellidos.left - 200,
            }}
          >
            <motion.div
              animate={{ x: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
              className="flex items-center"
            >
              <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-2 rounded-2xl text-sm font-bold shadow-xl shadow-cyan-500/40 whitespace-nowrap">
                {isAddingParent 
                  ? '✏️ Revisa los apellidos' 
                  : '✏️ Ahora los apellidos'}
              </div>
              <motion.svg 
                animate={{ x: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="w-6 h-6 text-cyan-400 ml-1" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </motion.svg>
            </motion.div>
          </motion.div>
        )}

        {/* Indicador para CONFIRMAR - posición dinámica */}
        {config.highlight === 'confirmar' && positions.confirmar && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed z-[152] flex flex-col items-center justify-start"
            style={{ 
              top: positions.confirmar.bottom + 10,
              left: positions.confirmar.left + positions.confirmar.width / 2 - 85,
            }}
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
              className="flex flex-col items-center"
            >
              <motion.svg 
                animate={{ y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="w-6 h-6 text-green-400 mb-2" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
              </motion.svg>
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-2xl text-sm font-bold shadow-xl shadow-green-500/40 whitespace-nowrap">
                ✅ ¡Pulsa Confirmar!
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Highlight para el botón PADRE - posición dinámica, ocultar cuando el modal está abierto */}
        {config.highlight === 'padre' && positions.padre && !isModalOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed z-[152] pointer-events-none"
            style={{ 
              top: positions.padre.top - 60,
              left: positions.padre.left + positions.padre.width / 2 - 80,
            }}
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
              className="flex flex-col items-center"
            >
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-2xl text-sm font-bold shadow-xl shadow-blue-500/40 whitespace-nowrap">
                👇 Pulsa PADRE aquí
              </div>
              <motion.svg 
                animate={{ y: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="w-6 h-6 text-blue-400 mt-2" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </motion.svg>
            </motion.div>
          </motion.div>
        )}

        {/* Highlight para la tarjeta central */}
        {config.highlight === 'card' && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 flex items-center justify-center pointer-events-none z-[151]"
            >
              <motion.div
                animate={{ 
                  boxShadow: [
                    '0 0 0 0 rgba(6, 182, 212, 0.7)',
                    '0 0 0 30px rgba(6, 182, 212, 0)',
                  ],
                }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-[180px] h-[150px] rounded-3xl border-2 border-cyan-400"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 mt-24 z-[152] pointer-events-none"
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
                className="bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg flex items-center gap-2"
              >
                👆 Esta eres tú
              </motion.div>
            </motion.div>
          </>
        )}
        
        {/* Tutorial card */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed bottom-24 sm:bottom-6 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-sm z-[153] pointer-events-auto"
        >
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 backdrop-blur-2xl rounded-2xl p-5 border border-cyan-500/40 shadow-2xl shadow-cyan-500/20">
            {/* Progress bar */}
            <div className="flex gap-1.5 mb-4">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div 
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    i < stepIndex 
                      ? 'bg-cyan-500' 
                      : i === stepIndex 
                        ? 'bg-gradient-to-r from-cyan-400 to-blue-500' 
                        : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
            
            {/* Content */}
            <h3 className="text-base sm:text-lg font-bold text-cyan-400 mb-2">{config.title}</h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">{config.description}</p>
            
            {config.tip && (
              <p className="text-xs text-slate-400 italic mb-3 flex items-start gap-1.5">
                <span>💡</span> {config.tip}
              </p>
            )}
            
            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-700/50">
              <button
                onClick={skipTutorial}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors py-1"
              >
                Saltar tutorial
              </button>
              
              {currentStep === 'explore' ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={skipTutorial}
                  className="px-4 py-2 text-sm bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-cyan-500/25"
                >
                  ¡Empezar! ✨
                </motion.button>
              ) : (
                <span className="text-xs text-slate-500 font-medium">
                  Paso {stepIndex + 1} de {totalSteps}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
