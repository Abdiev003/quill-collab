'use client';

import type { VersionSummary } from '@quill-collab/shared';
import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { listVersions, restoreVersion } from '@/lib/api/versions';
import { useToast } from '@/lib/toast/ToastProvider';

export const versionKeys = {
  list: (documentId: string) => ['versions', documentId] as const,
};

export function useVersions(documentId: string): UseQueryResult<VersionSummary[]> {
  return useQuery({
    queryKey: versionKeys.list(documentId),
    queryFn: () => listVersions(documentId),
  });
}

/**
 * Before calling restore, the caller MUST disconnect the y-websocket
 * provider so that the auto-reconnect doesn't merge the old Y.Doc
 * back over the restored state.
 */
export function useRestoreVersion(
  documentId: string,
  /** Call this before the API request to tear down the WS connection */
  disconnectProvider?: () => void,
): UseMutationResult<void, Error, { versionId: string }> {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ versionId }) => {
      // 1. Disconnect y-websocket FIRST to prevent auto-reconnect
      //    from merging old state back over the restored version
      disconnectProvider?.();

      // 2. Now call the restore API — server will also resetRoom
      await restoreVersion(documentId, versionId);
    },
    onSuccess: () => {
      toast('Version restored — reloading…', 'success');
      // Hard navigation to force a completely fresh Y.Doc
      setTimeout(() => {
        window.location.href = window.location.href;
      }, 500);
    },
    onError: () => {
      toast('Failed to restore version', 'error');
      // Reconnect by reloading since we disconnected the provider
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },
  });
}

