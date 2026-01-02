import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

export const JunctionNode = memo(() => {
  return (
    <div style={{ width: 1, height: 1, pointerEvents: 'none' }}>
      <Handle
        id="t"
        type="target"
        position={Position.Top}
        className="w-px! h-px! top-0!"
        style={{ background: 'transparent', border: 'none' }}
      />
      <Handle
        id="s"
        type="source"
        // Mismo punto que el target para que barra/drops queden perfectamente alineados
        position={Position.Top}
        className="w-px! h-px! top-0!"
        style={{ background: 'transparent', border: 'none' }}
      />
    </div>
  );
});

JunctionNode.displayName = 'JunctionNode';
