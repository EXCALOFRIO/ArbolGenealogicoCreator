import React from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { FamilyTree } from './components/FamilyTree';
import { FamilyListView } from './components/FamilyListView';
import { Controls } from './components/Controls';
import { ActionMenu } from './components/ActionMenu';
import { Tutorial } from './components/Tutorial';
import { DebugControls } from './components/DebugControls';
import { useFamilyStore } from './store/familyStore';

const App: React.FC = () => {
  const viewMode = useFamilyStore(s => s.viewMode);

  return (
    <ReactFlowProvider>
      <div className="min-h-screen text-slate-200 font-sans selection:bg-blue-500 selection:text-white overflow-hidden relative">
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