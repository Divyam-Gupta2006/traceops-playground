"use client";
import type { Chaos } from "@/types/simulator";
import { injector } from "./failure-injector";
import { traceops, newTraceId, newSpanId } from "./traceops-client";

export type CallResult = { status: number; durationMs: number; error?: string; data?: any };

/** Instrumented fetch: performs a real HTTP request to a simulated route and reports it to TraceOps. */
export async function call(method: string, path: string, o: { body?: unknown; chaos?: Partial<Chaos>; timeoutMs?: number } = {}): Promise<CallResult> {
  const route = path.split("?")[0];
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), o.timeoutMs ?? 6000);
  const t0 = performance.now();
  let status = 0, error: string | undefined, data: any;
  try {
    const r = await fetch(path, {
      method, signal: ctrl.signal,
      headers: { "content-type": "application/json", "x-chaos": JSON.stringify({ ...injector.get(), ...o.chaos }) },
      body: o.body ? JSON.stringify(o.body) : undefined,
    });
    status = r.status;
    try { data = await r.json(); } catch {}
    if (!r.ok) error = data?.error || `HTTP ${r.status}`;
  } catch (e: any) { error = e?.name === "AbortError" ? "Request timeout" : String(e?.message ?? e); }
  clearTimeout(timer);
  const durationMs = Math.round(performance.now() - t0);
  traceops.track({
    operationName: `${method} ${route}`, durationMs, statusCode: error ? 2 : 1, errorMessage: error,
    httpMethod: method, httpRoute: route, httpStatusCode: status, traceId: newTraceId(), spanId: newSpanId(),
  }, status);
  return { status, durationMs, error, data };
}
