'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
