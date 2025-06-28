export const TIMEOUTS = {
  /** Locator visibility wait for very fast checks */
  visibilityFast: 200,

  /** Default visibility timeout for element presence (max 800ms) */
  visibilityDefault: 800,

  /** Per selector timeout when iterating through list (max 800ms) */
  perSelector: 800,

  /** Timeout per navigation attempt (strictly <=800ms) */
  pageLoad: 800,

  /** Additional constants to support incremental navigation polling */
  navRetryDelay: 200, // ms between retries when selector not yet visible
  navMaxAttempts: 10, // up to ~8s total cap with 800ms per attempt
}; 