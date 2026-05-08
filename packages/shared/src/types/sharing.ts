export type SharePermission = 'READ' | 'WRITE';

export interface ShareSummary {
  id: string;
  documentId: string;
  token: string;
  permission: SharePermission;
  createdBy: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateShareRequest {
  permission: SharePermission;
}

export interface ResolvedShare {
  documentId: string;
  documentTitle: string;
  permission: SharePermission;
}
