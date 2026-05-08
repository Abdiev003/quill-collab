/**
 * Placeholder types shared between the API and the web client.
 * Real DTOs land here as Phase 1+ progresses.
 */

export interface HealthResponse {
  status: 'ok';
  uptimeSeconds: number;
}
