"use client";
import { useSyncExternalStore } from "react";
import type { Chaos } from "@/types/simulator";

export const NO_CHAOS: Chaos = { errorRate: 0, latMin: 0, latMax: 0, timeoutRate: 0, checkoutDegraded: false, authFail: false, telemetryDown: false };
let state: Chaos = { ...NO_CHAOS };
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export const injector = {
  get: () => state,
  set(p: Partial<Chaos>) { state = { ...state, ...p }; emit(); },
  reset() { state = { ...NO_CHAOS }; emit(); },
  subscribe(f: () => void) { subs.add(f); return () => subs.delete(f); },
};
export const useChaos = () => useSyncExternalStore(injector.subscribe, injector.get, injector.get);

// Scenario presets from the spec
export const SCENARIOS: { id: string; label: string; tests: string; patch: Partial<Chaos> }[] = [
  { id: "db", label: "Database timeout", tests: "Slow dependency detection", patch: { latMin: 2000, latMax: 4000 } },
  { id: "500", label: "Random HTTP 500", tests: "Error ingestion", patch: { errorRate: 0.3 } },
  { id: "timeout", label: "API timeout", tests: "Timeout detection", patch: { timeoutRate: 0.25 } },
  { id: "auth", label: "Authentication failure", tests: "Error tracking", patch: { authFail: true } },
  { id: "checkout", label: "Checkout degradation", tests: "Latency + error rate on one service", patch: { checkoutDegraded: true } },
  { id: "telemetry", label: "Telemetry endpoint down", tests: "Retry and failure handling", patch: { telemetryDown: true } },
];
