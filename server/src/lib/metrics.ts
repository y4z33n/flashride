/**
 * In-memory metrics counters.
 * Simple, zero-dependency, suitable for single-instance beta.
 * Replace with Prometheus/DataDog in a multi-instance production setup.
 *
 * Exposed at GET /metrics (admin-only in production).
 */

interface Metrics {
  requests: {
    total: number;
    byStatus: Record<string, number>;
    byMethod: Record<string, number>;
  };
  errors: {
    total: number;
    by5xx: number;
    by4xx: number;
  };
  auth: {
    successes: number;
    failures: number;
  };
  startedAt: string;
  uptimeSeconds: () => number;
}

const startedAt = new Date();

export const metrics: Metrics = {
  requests: {
    total: 0,
    byStatus: {},
    byMethod: {},
  },
  errors: {
    total: 0,
    by5xx: 0,
    by4xx: 0,
  },
  auth: {
    successes: 0,
    failures: 0,
  },
  startedAt: startedAt.toISOString(),
  uptimeSeconds: () => Math.floor((Date.now() - startedAt.getTime()) / 1000),
};

export function recordRequest(method: string, statusCode: number): void {
  metrics.requests.total++;
  metrics.requests.byMethod[method] = (metrics.requests.byMethod[method] ?? 0) + 1;
  const key = String(statusCode);
  metrics.requests.byStatus[key] = (metrics.requests.byStatus[key] ?? 0) + 1;

  if (statusCode >= 500) {
    metrics.errors.total++;
    metrics.errors.by5xx++;
  } else if (statusCode >= 400) {
    metrics.errors.total++;
    metrics.errors.by4xx++;
  }
}

export function recordAuthSuccess(): void {
  metrics.auth.successes++;
}

export function recordAuthFailure(): void {
  metrics.auth.failures++;
}

export function getMetricsSnapshot() {
  return {
    startedAt: metrics.startedAt,
    uptimeSeconds: metrics.uptimeSeconds(),
    requests: { ...metrics.requests },
    errors: { ...metrics.errors },
    auth: { ...metrics.auth },
  };
}
