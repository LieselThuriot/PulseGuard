/** Number of overview buckets shown in the compact health bar */
export const HEALTH_BAR_OVERVIEW_BUCKETS = 10;

/** Number of detail buckets shown in the full health bar */
export const HEALTH_BAR_DETAIL_BUCKETS = 144;

/** Hours covered by the overview health bar */
export const HEALTH_BAR_OVERVIEW_HOURS = 12;

/** 12-hour window in milliseconds, used for uptime calculations */
export const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

/** Maximum number of live pulse data points to retain */
export const LIVE_PULSE_MAX_POINTS = 100;

/** Default log page size */
export const LOG_PAGE_SIZE = 50;

/** Default decimation value (minutes) */
export const DEFAULT_DECIMATION = 15;

/** Default percentile */
export const DEFAULT_PERCENTILE = 99;

/** Maximum events held in the SSE buffer */
export const MAX_EVENT_BUFFER = 1000;
