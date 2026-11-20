/**
 * ============================================================================
 * SRC/UTILS/IDEMPOTENCY.TS — Idempotency Key Generator for Double-Submit Guard
 * ============================================================================
 */

export function generateIdempotencyKey(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${Date.now()}_${rand}`;
}
