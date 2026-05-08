/**
 * Yjs WebSocket protocol message types.
 * These match the constants used by y-protocols/sync and y-protocols/awareness.
 */
export const CollabMessageType = {
  SYNC: 0,
  AWARENESS: 1,
  AUTH: 2,
} as const;

export type CollabMessageType =
  (typeof CollabMessageType)[keyof typeof CollabMessageType];

/** Awareness user state broadcast to all collaborators */
export interface AwarenessUserState {
  userId: string;
  displayName: string;
  color: string;
}
