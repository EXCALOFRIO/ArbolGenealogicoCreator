import React from 'react';
import { FamilyTree } from './components/FamilyTree';
import { Controls } from './components/Controls';
import { ActionMenu } from './components/ActionMenu';
import { Tutorial } from './components/Tutorial';

const App: React.FC = () => {
  return (
    <div className="min-h-screen text-slate-200 font-sans selection:bg-blue-500 selection:text-white overflow-hidden relative">
      <Controls />
      <FamilyTree />
      <ActionMenu />
      <Tutorial />
    </div>
  );
};

export default App;