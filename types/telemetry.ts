export type TelemetryEvent = {
  serviceName: string; operationName: string; durationMs: number;
  statusCode: 1 | 2; // 1 = OK, 2 = ERROR
  traceId?: string; spanId?: string; parentSpanId?: string;
  httpMethod?: string; httpRoute?: string; httpStatusCode?: number;
  startTime?: string; endTime?: string; errorMessage?: string;
  environment?: string; serviceVersion?: string;
  attributes?: Record<string, string | number | boolean>;
};
export type Delivery = "pending" | "acked" | "failed";
export type FeedItem = {
  id: string; time: number; operation: string; durationMs: number;
  httpStatus: number; slow: boolean; delivery: Delivery; error?: string; attempts: number;
};
export type Stats = { sent: number; acked: number; failed: number; lastSuccess: number | null; backend: "unknown" | "up" | "down"; key: "unknown" | "valid" | "invalid" };
export type Config = { url: string; apiKey: string };
