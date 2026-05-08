'use client';

import type { DocumentSummary } from '@quill-collab/shared';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  createDocument,
  listDocuments,
  listTrashedDocuments,
  permanentlyDeleteDocument,
  renameDocument,
  restoreDocument,
  softDeleteDocument,
} from '@/lib/api/documents';
import { useToast } from '@/lib/toast/ToastProvider';

export const documentsKeys = {
  active: ['documents', 'active'] as const,
  trash: ['documents', 'trash'] as const,
};

export function useActiveDocuments(): UseQueryResult<DocumentSummary[]> {
  return useQuery({
    queryKey: documentsKeys.active,
    queryFn: listDocuments,
  });
}

export function useTrashedDocuments(): UseQueryResult<DocumentSummary[]> {
  return useQuery({
    queryKey: documentsKeys.trash,
    queryFn: listTrashedDocuments,
  });
}

export function useCreateDocument(): UseMutationResult<
  DocumentSummary,
  Error,
  { title?: string }
> {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (input: { title?: string }) => createDocument(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: documentsKeys.active });
      const previous = qc.getQueryData<DocumentSummary[]>(documentsKeys.active);
      const now = new Date().toISOString();
      const optimistic: DocumentSummary = {
        id: `optimistic-${crypto.randomUUID()}`,
        title: input.title?.trim() || 'Untitled',
        ownerId: 'me',
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      qc.setQueryData<DocumentSummary[]>(documentsKeys.active, (prev) => [
        optimistic,
        ...(prev ?? []),
      ]);
      return { previous, optimisticId: optimistic.id };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(documentsKeys.active, ctx.previous);
      toast('Failed to create document', 'error');
    },
    onSuccess: (created, _vars, ctx) => {
      qc.setQueryData<DocumentSummary[]>(documentsKeys.active, (prev) => {
        const without = (prev ?? []).filter((d) => d.id !== ctx?.optimisticId);
        return [created, ...without];
      });
      toast('Document created', 'success');
    },
  });
}

export function useRenameDocument(): UseMutationResult<
  DocumentSummary,
  Error,
  { id: string; title: string }
> {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, title }) => renameDocument(id, { title }),
    onMutate: async ({ id, title }) => {
      await qc.cancelQueries({ queryKey: documentsKeys.active });
      const previous = qc.getQueryData<DocumentSummary[]>(documentsKeys.active);
      qc.setQueryData<DocumentSummary[]>(documentsKeys.active, (prev) =>
        (prev ?? []).map((d) => (d.id === id ? { ...d, title } : d)),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(documentsKeys.active, ctx.previous);
      toast('Failed to rename document', 'error');
    },
    onSuccess: (updated) => {
      qc.setQueryData<DocumentSummary[]>(documentsKeys.active, (prev) =>
        (prev ?? []).map((d) => (d.id === updated.id ? updated : d)),
      );
      toast('Renamed', 'success');
    },
  });
}

export function useSoftDeleteDocument(): UseMutationResult<
  void,
  Error,
  { id: string }
> {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id }) => softDeleteDocument(id),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: documentsKeys.active });
      const previous = qc.getQueryData<DocumentSummary[]>(documentsKeys.active);
      qc.setQueryData<DocumentSummary[]>(documentsKeys.active, (prev) =>
        (prev ?? []).filter((d) => d.id !== id),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(documentsKeys.active, ctx.previous);
      toast('Failed to delete document', 'error');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: documentsKeys.trash });
      toast('Moved to trash', 'success');
    },
  });
}

export function useRestoreDocument(): UseMutationResult<
  DocumentSummary,
  Error,
  { id: string }
> {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id }) => restoreDocument(id),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: documentsKeys.trash });
      const previous = qc.getQueryData<DocumentSummary[]>(documentsKeys.trash);
      qc.setQueryData<DocumentSummary[]>(documentsKeys.trash, (prev) =>
        (prev ?? []).filter((d) => d.id !== id),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(documentsKeys.trash, ctx.previous);
      toast('Failed to restore document', 'error');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: documentsKeys.active });
      toast('Restored', 'success');
    },
  });
}

export function usePermanentlyDeleteDocument(): UseMutationResult<
  void,
  Error,
  { id: string }
> {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id }) => permanentlyDeleteDocument(id),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: documentsKeys.trash });
      const previous = qc.getQueryData<DocumentSummary[]>(documentsKeys.trash);
      qc.setQueryData<DocumentSummary[]>(documentsKeys.trash, (prev) =>
        (prev ?? []).filter((d) => d.id !== id),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(documentsKeys.trash, ctx.previous);
      toast('Failed to delete permanently', 'error');
    },
    onSuccess: () => {
      toast('Deleted permanently', 'success');
    },
  });
}
