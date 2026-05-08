import { WorkspaceShell } from '@/components/sidebar/WorkspaceShell';
import { RequireAuth } from '@/components/RequireAuth';

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <WorkspaceShell>{children}</WorkspaceShell>
    </RequireAuth>
  );
}
