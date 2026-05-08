'use client';

import type { DocumentDetail } from '@quill-collab/shared';
import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { getDocument, updateDocumentContent } from '@/lib/api/documents';

export const documentKeys = {
  detail: (id: string) => ['documents', 'detail', id] as const,
};

export function useDocument(id: string): UseQueryResult<DocumentDetail> {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: () => getDocument(id),
  });
}

export function useUpdateContent(
  id: string,
): UseMutationResult<DocumentDetail, Error, Record<string, unknown>> {
  return useMutation({
    mutationFn: (content: Record<string, unknown>) =>
      updateDocumentContent(id, { content }),
  });
}
