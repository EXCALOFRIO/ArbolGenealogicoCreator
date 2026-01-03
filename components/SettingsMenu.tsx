import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFamilyStore } from '../store/familyStore';

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

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

const CameraIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// Icono para tema moderno
const ModernIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
  </svg>
);

// Icono para tema rústico (árbol)
const RusticIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-6m0 0l-3 3m3-3l3 3M12 15V9m-4.5 2.5L12 7l4.5 4.5M8 4.5C8 3.12 9.12 2 10.5 2h3C14.88 2 16 3.12 16 4.5S14.88 7 13.5 7h-3C9.12 7 8 5.88 8 4.5z" />
    <circle cx="12" cy="5" r="3" />
  </svg>
);

// Icono para mayúsculas
const TextCaseIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
  </svg>
);

// Icono para modo compacto
const CompactIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

// Icono para modo expandido
const ExpandedIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M3 8h18M3 12h18M3 16h18M3 20h18" />
  </svg>
);

export const SettingsMenu: React.FC = () => {
  const { theme, toggleTheme, visualTheme, setVisualTheme, textCase, setTextCase, people, exportRelationships, importRelationships, setIsExporting } = useFamilyStore();
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      importRelationships(parsed);
      setIsOpen(false);
    } catch {
      window.alert('JSON inválido o no compatible');
    }
  };

  const handleExport = () => {
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
      setIsOpen(false);
    } catch {
      window.alert('No se pudo exportar el JSON');
    }
  };

  const handlePhoto = () => {
    setIsExporting(true);
    setIsOpen(false);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const hasPeople = people.length > 0;

  const menuItems = [
    {
      id: 'theme',
      label: theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro',
      icon: theme === 'dark' ? <SunIcon /> : <MoonIcon />,
      onClick: toggleTheme,
      color: 'from-amber-500 to-orange-500',
      show: true,
    },
    {
      id: 'visualTheme',
      label: visualTheme === 'modern' ? 'Estilo Rústico' : 'Estilo Moderno',
      icon: visualTheme === 'modern' ? <RusticIcon /> : <ModernIcon />,
      onClick: () => setVisualTheme(visualTheme === 'modern' ? 'rustic' : 'modern'),
      color: visualTheme === 'modern' ? 'from-amber-700 to-yellow-900' : 'from-blue-500 to-indigo-600',
      show: true,
    },
    {
      id: 'textCase',
      label: textCase === 'uppercase' ? 'Primera Mayúscula' : 'Todo Mayúsculas',
      icon: <TextCaseIcon />,
      onClick: () => setTextCase(textCase === 'uppercase' ? 'capitalize' : 'uppercase'),
      color: 'from-purple-500 to-violet-600',
      show: true,
    },
    {
      id: 'photo',
      label: 'Capturar Foto',
      icon: <CameraIcon />,
      onClick: handlePhoto,
      color: 'from-pink-500 to-rose-600',
      show: hasPeople,
    },
    {
      id: 'export',
      label: 'Exportar JSON',
      icon: <DownloadIcon />,
      onClick: handleExport,
      color: 'from-emerald-500 to-green-600',
      show: hasPeople,
    },
    {
      id: 'import',
      label: 'Importar JSON',
      icon: <UploadIcon />,
      onClick: handleImport,
      color: 'from-sky-500 to-cyan-600',
      show: true,
    },
  ];

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={onImportFile}
      />

      {/* Settings Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        type="button"
        title="Ajustes"
        onClick={() => setIsOpen(!isOpen)}
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
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <CloseIcon />
            </motion.div>
          ) : (
            <motion.div
              key="settings"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <SettingsIcon />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[55]"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{
                background: 'var(--menu-bg)',
                borderColor: 'var(--menu-border)',
              }}
              className="fixed top-16 right-4 z-[60] backdrop-blur-xl rounded-2xl p-3 shadow-2xl border min-w-[200px]"
            >
              <div style={{ color: 'var(--app-text-muted)' }} className="text-[10px] uppercase tracking-widest font-semibold mb-2 px-2">
                Ajustes
              </div>
              
              <div className="flex flex-col gap-1">
                {menuItems.filter(item => item.show).map((item) => (
                  <motion.button
                    key={item.id}
                    whileHover={{ scale: 1.02, x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={item.onClick}
                    style={{ color: 'var(--app-text)' }}
                    className="flex items-center gap-3 p-2 rounded-xl transition-colors hover:bg-white/10 w-full text-left"
                  >
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center text-white shadow-md`}>
                      {item.icon}
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
