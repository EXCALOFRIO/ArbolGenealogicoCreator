import React, { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { FamilyTree } from './components/FamilyTree';
import { FamilyListView } from './components/FamilyListView';
import { Controls } from './components/Controls';
import { ActionMenu } from './components/ActionMenu';
import { HomeButton } from './components/HomeButton';
import { Tutorial } from './components/Tutorial';
import { DebugControls } from './components/DebugControls';
import { ThemeToggle } from './components/ThemeToggle';
import { useFamilyStore } from './store/familyStore';

const App: React.FC = () => {
  const viewMode = useFamilyStore(s => s.viewMode);
  const theme = useFamilyStore(s => s.theme);
  const isExporting = useFamilyStore(s => s.isExporting);

  useEffect(() => {
    try {
      document.documentElement.dataset.theme = theme;
      // También añadir clase dark para Tailwind en el documentElement para propagación total
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch {
      // ignore
    }
  }, [theme]);

  return (
    <ReactFlowProvider>
      <div style={{ color: 'var(--app-text)' }} className="min-h-screen font-sans overflow-hidden relative">
        {!isExporting && <HomeButton />}
        {!isExporting && <ThemeToggle />}
        {!isExporting && <Controls />}
        {viewMode === 'list' ? <FamilyListView /> : <FamilyTree />}
        {!isExporting && <ActionMenu />}
        {!isExporting && <Tutorial />}
        {!isExporting && <DebugControls />}
      </div>
    </ReactFlowProvider>
  );
};

export default App;