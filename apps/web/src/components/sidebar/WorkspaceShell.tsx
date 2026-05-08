'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <main className="flex-1 overflow-y-auto" style={{ background: 'var(--background)' }}>
        {children}
      </main>
    </div>
  );
}
