"use client";
import { useSyncExternalStore } from "react";
import type { Config, FeedItem, Stats, TelemetryEvent } from "@/types/telemetry";
import { injector } from "./failure-injector";

const rid = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n))).map((b) => b.toString(16).padStart(2, "0")).join("");
export const newTraceId = () => rid(16);
export const newSpanId = () => rid(8);

type Snap = { v: number; feed: FeedItem[]; stats: Stats; config: Config };
const DEFAULT: Config = { url: process.env.NEXT_PUBLIC_TRACEOPS_URL || "/api/mock-ingest", apiKey: process.env.NEXT_PUBLIC_TRACEOPS_API_KEY || "demo-key" };
let config: Config = DEFAULT;
let loaded = false;
let feed: FeedItem[] = [];
let stats: Stats = { sent: 0, acked: 0, failed: 0, lastSuccess: null, backend: "unknown", key: "unknown" };
let snap: Snap = { v: 0, feed, stats, config };
const subs = new Set<() => void>();
const emit = () => { snap = { v: snap.v + 1, feed, stats, config }; subs.forEach((f) => f()); };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const MAX_FEED = 300, MAX_RETRIES = 2;

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { const s = localStorage.getItem("traceops-config"); if (s) config = { ...DEFAULT, ...JSON.parse(s) }; } catch {}
  snap = { ...snap, config };
}

async function deliver(ev: TelemetryEvent): Promise<{ ok: boolean; status: number; error?: string }> {
  if (injector.get().telemetryDown) return { ok: false, status: 0, error: "Telemetry endpoint unavailable (injected)" };
  try {
    const r = await fetch("/api/ingest", {
      method: "POST",
      headers: { "content-type": "application/json", "x-traceops-url": config.url, "x-traceops-key": config.apiKey },
      body: JSON.stringify(ev),
    });
    if (r.ok) return { ok: true, status: r.status };
    let msg = `HTTP ${r.status}`;
    try { const j = await r.json(); if (j?.error) msg += `: ${j.error}`; } catch {}
    return { ok: false, status: r.status, error: msg };
  } catch (e: any) { return { ok: false, status: 0, error: String(e?.message ?? e) }; }
}

export const traceops = {
  subscribe(f: () => void) { load(); subs.add(f); return () => subs.delete(f); },
  getSnapshot: () => snap,
  setConfig(c: Partial<Config>) {
    config = { ...config, ...c };
    try { localStorage.setItem("traceops-config", JSON.stringify(config)); } catch {}
    stats = { ...stats, backend: "unknown", key: "unknown" };
    emit();
  },
  clear() { feed = []; stats = { ...stats, sent: 0, acked: 0, failed: 0 }; emit(); },

  /** Record an event: shows in the feed immediately, then delivers with retry. */
  async track(ev: Partial<TelemetryEvent> & { operationName: string; durationMs: number }, httpStatus = 0) {
    const full: TelemetryEvent = {
      serviceName: "acme-commerce", statusCode: 1, environment: "playground", serviceVersion: "1.0.0",
      traceId: newTraceId(), spanId: newSpanId(), startTime: new Date(Date.now() - ev.durationMs).toISOString(), endTime: new Date().toISOString(),
      ...ev,
    };
    const item: FeedItem = { id: full.spanId!, time: Date.now(), operation: full.operationName, durationMs: Math.round(full.durationMs), httpStatus, slow: full.durationMs >= 2000, delivery: "pending", attempts: 0 };
    feed = [item, ...feed].slice(0, MAX_FEED);
    stats = { ...stats, sent: stats.sent + 1 };
    emit();
    let res: { ok: boolean; status: number; error?: string } = { ok: false, status: 0 };
    for (let a = 0; a <= MAX_RETRIES; a++) {
      item.attempts = a + 1;
      res = await deliver(full);
      if (res.ok || res.status === 401 || res.status === 403 || res.status === 400) break;
      if (a < MAX_RETRIES) { feed = [...feed]; emit(); await sleep(400 * 2 ** a); }
    }
    feed = feed.map((f) => (f.id === item.id ? { ...item, delivery: res.ok ? "acked" : "failed", error: res.error } : f));
    if (res.ok) stats = { ...stats, acked: stats.acked + 1, lastSuccess: Date.now(), backend: "up", key: "valid" };
    else stats = { ...stats, failed: stats.failed + 1, backend: res.status === 401 || res.status === 403 || res.status === 400 ? "up" : "down", key: res.status === 401 || res.status === 403 ? "invalid" : stats.key };
    emit();
  },

  /** Non-HTTP events: pageview, cart.add, auth.failed, ... */
  event(name: string, attributes: Record<string, string | number | boolean> = {}, error?: string) {
    return this.track({ operationName: name, durationMs: 0, statusCode: error ? 2 : 1, errorMessage: error, attributes });
  },
  /** Connectivity check from the Control Center. */
  test() { return this.track({ operationName: "traceops.connection_test", durationMs: 1, attributes: { test: true } }); },
};

export const useTraceOps = () => useSyncExternalStore(traceops.subscribe, traceops.getSnapshot, traceops.getSnapshot);
