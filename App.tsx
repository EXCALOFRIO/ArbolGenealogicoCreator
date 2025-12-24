import React from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { FamilyTree } from './components/FamilyTree';
import { Controls } from './components/Controls';
import { ActionMenu } from './components/ActionMenu';
import { Tutorial } from './components/Tutorial';
import { DebugControls } from './components/DebugControls';

const App: React.FC = () => {
  return (
    <ReactFlowProvider>
      <div className="min-h-screen text-slate-200 font-sans selection:bg-blue-500 selection:text-white overflow-hidden relative">
        <Controls />
        <FamilyTree />
        <ActionMenu />
        <Tutorial />
        <DebugControls />
      </div>
    </ReactFlowProvider>
  );
};

export default App;