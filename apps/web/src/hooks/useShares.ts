'use client';

import type { CreateShareRequest, ShareSummary } from '@quill-collab/shared';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { createShare, listShares, revokeShare } from '@/lib/api/sharing';
import { useToast } from '@/lib/toast/ToastProvider';

export const shareKeys = {
  list: (documentId: string) => ['shares', documentId] as const,
};

export function useShares(documentId: string): UseQueryResult<ShareSummary[]> {
  return useQuery({
    queryKey: shareKeys.list(documentId),
    queryFn: () => listShares(documentId),
  });
}

export function useCreateShare(
  documentId: string,
): UseMutationResult<ShareSummary, Error, CreateShareRequest> {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: CreateShareRequest) => createShare(documentId, input),
    onSuccess: (created) => {
      qc.setQueryData<ShareSummary[]>(
        shareKeys.list(documentId),
        (prev) => [created, ...(prev ?? [])],
      );
      toast('Share link created', 'success');
    },
    onError: () => {
      toast('Failed to create share link', 'error');
    },
  });
}

export function useRevokeShare(
  documentId: string,
): UseMutationResult<void, Error, { shareId: string }> {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ shareId }) => revokeShare(shareId),
    onMutate: async ({ shareId }) => {
      await qc.cancelQueries({ queryKey: shareKeys.list(documentId) });
      const previous = qc.getQueryData<ShareSummary[]>(
        shareKeys.list(documentId),
      );
      qc.setQueryData<ShareSummary[]>(shareKeys.list(documentId), (prev) =>
        (prev ?? []).filter((s) => s.id !== shareId),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(shareKeys.list(documentId), ctx.previous);
      }
      toast('Failed to revoke share', 'error');
    },
    onSuccess: () => {
      toast('Share link revoked', 'success');
    },
  });
}
