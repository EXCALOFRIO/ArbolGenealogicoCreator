import React from 'react';
import { motion } from 'framer-motion';
import { useFamilyStore } from '../store/familyStore';

const SunIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414M16.95 16.95l1.414 1.414M7.05 7.05 5.636 5.636" />
    <circle cx="12" cy="12" r="4" />
  </svg>
);

const MoonIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
  </svg>
);

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useFamilyStore();

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      type="button"
      title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      onClick={toggleTheme}
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--card-border)',
        color: 'var(--app-text)'
      }}
      className="fixed top-4 right-4 z-[60] p-3 rounded-xl 
        backdrop-blur-md border
        hover:opacity-90
        shadow-lg
        transition-all duration-200"
    >
      {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
    </motion.button>
  );
};
