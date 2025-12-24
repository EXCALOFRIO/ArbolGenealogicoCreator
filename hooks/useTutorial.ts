import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TutorialStep = 
  | 'welcome'
  | 'create-self'
  | 'enter-surname'
  | 'confirm-person'
  | 'explain-card'
  | 'add-father'
  | 'add-mother'
  | 'explore'
  | 'completed';

interface TutorialState {
  isActive: boolean;
  currentStep: TutorialStep;
  hasCompletedOnce: boolean;
  
  startTutorial: () => void;
  skipTutorial: () => void;
  nextStep: () => void;
  goToStep: (step: TutorialStep) => void;
  resetTutorial: () => void;
}

const STEP_ORDER: TutorialStep[] = [
  'welcome',
  'create-self',
  'enter-surname',
  'confirm-person',
  'explain-card',
  'add-father',
  'add-mother',
  'explore',
  'completed'
];

export const useTutorial = create<TutorialState>()(
  persist(
    (set, get) => ({
      isActive: false,
      currentStep: 'welcome',
      hasCompletedOnce: false,

      startTutorial: () => set({ isActive: true, currentStep: 'create-self' }),
      
      skipTutorial: () => set({ isActive: false, hasCompletedOnce: true }),
      
      nextStep: () => {
        const { currentStep } = get();
        const currentIndex = STEP_ORDER.indexOf(currentStep);
        if (currentIndex < STEP_ORDER.length - 1) {
          const nextStep = STEP_ORDER[currentIndex + 1];
          set({ currentStep: nextStep });
          if (nextStep === 'completed') {
            set({ hasCompletedOnce: true });
          }
        }
      },
      
      goToStep: (step) => set({ currentStep: step }),
      
      resetTutorial: () => set({ 
        isActive: false, 
        currentStep: 'welcome',
        hasCompletedOnce: false 
      }),
    }),
    {
      name: 'arbol-genealogico-tutorial',
      partialize: (state) => ({ hasCompletedOnce: state.hasCompletedOnce }),
    }
  )
);
