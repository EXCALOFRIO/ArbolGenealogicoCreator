import React, { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { FamilyTree } from './components/FamilyTree';
import { FamilyListView } from './components/FamilyListView';
import { Controls } from './components/Controls';
import { ActionMenu } from './components/ActionMenu';
import { Tutorial } from './components/Tutorial';
import { DebugControls } from './components/DebugControls';
import { ThemeToggle } from './components/ThemeToggle';
import { useFamilyStore } from './store/familyStore';

const App: React.FC = () => {
  const viewMode = useFamilyStore(s => s.viewMode);
  const theme = useFamilyStore(s => s.theme);

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
      <div className="min-h-screen text-slate-700 dark:text-slate-200 font-sans selection:bg-blue-500 selection:text-white overflow-hidden relative">
        <ThemeToggle />
        <Controls />
        {viewMode === 'list' ? <FamilyListView /> : <FamilyTree />}
        <ActionMenu />
        <Tutorial />
        <DebugControls />
      </div>
    </ReactFlowProvider>
  );
};

export default App;