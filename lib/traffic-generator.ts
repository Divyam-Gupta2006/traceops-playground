"use client";
import { useSyncExternalStore } from "react";
import type { Chaos, ContinuousTrafficState, Progress, TrafficConfig } from "@/types/simulator";
import { call } from "./api-client";
import { injector, SCENARIOS } from "./failure-injector";

export const ENDPOINTS: { path: string; method: string }[] = [
  { path: "/api/products", method: "GET" }, { path: "/api/users", method: "GET" }, { path: "/api/cart", method: "POST" },
  { path: "/api/checkout", method: "POST" }, { path: "/api/analytics", method: "GET" }, { path: "/api/slow", method: "GET" },
  { path: "/api/error", method: "GET" }, { path: "/api/not-found", method: "GET" },
];
const MIXED = ENDPOINTS.slice(0, 5);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type SimulatedAction = {
  label: string;
  method: string;
  path: string;
  body?: unknown;
};

const SEARCH_TERMS = ["shoes", "jacket", "running", "backpack", "watch", "shirt", "pants", "hat"];

export function getRandomRealisticAction(): SimulatedAction {
  const roll = Math.random();
  // 40% Product catalog browsing or search
  if (roll < 0.40) {
    if (Math.random() < 0.35) {
      const q = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
      return { label: `Search "${q}"`, method: "GET", path: `/api/products?q=${q}` };
    }
    return { label: "Browse products", method: "GET", path: "/api/products" };
  }
  // 25% Add to cart
  if (roll < 0.65) {
    const productId = 1 + Math.floor(Math.random() * 8);
    const qty = 1 + Math.floor(Math.random() * 3);
    return {
      label: `Add item #${productId} to cart`,
      method: "POST",
      path: "/api/cart",
      body: { productId, qty },
    };
  }
  // 15% User session / profile check
  if (roll < 0.80) {
    return { label: "Check user profile", method: "GET", path: "/api/users" };
  }
  // 12% Checkout order
  if (roll < 0.92) {
    const orderNum = Math.floor(100000 + Math.random() * 900000);
    return {
      label: `Checkout order #${orderNum}`,
      method: "POST",
      path: "/api/checkout",
      body: {
        orderId: `ORD-${orderNum}`,
        items: [{ id: 1 + Math.floor(Math.random() * 8), qty: 1 }],
      },
    };
  }
  // 6% Analytics beacon
  if (roll < 0.98) {
    return { label: "Analytics beacon", method: "GET", path: "/api/analytics" };
  }
  // 2% Crawler / 404
  return { label: "Page not found (crawler)", method: "GET", path: "/api/not-found" };
}

let continuousAbortCtrl: AbortController | null = null;
const recentTimestamps: number[] = [];

let continuousState: ContinuousTrafficState = {
  running: false,
  targetRps: 5,
  requestsSent: 0,
  startedAt: null,
  lastAction: null,
  currentRps: 0,
};

const continuousSubs = new Set<() => void>();
const emitContinuous = () => continuousSubs.forEach((cb) => cb());

export function startContinuousTraffic(initialRps: number = continuousState.targetRps || 5) {
  if (continuousState.running) return;

  continuousAbortCtrl = new AbortController();
  const signal = continuousAbortCtrl.signal;
  recentTimestamps.length = 0;

  continuousState = {
    running: true,
    targetRps: Math.max(1, Math.min(100, initialRps)),
    requestsSent: 0,
    startedAt: Date.now(),
    lastAction: "Starting live simulation…",
    currentRps: 0,
  };
  emitContinuous();

  (async () => {
    while (!signal.aborted) {
      const action = getRandomRealisticAction();
      const tNow = performance.now();
      recentTimestamps.push(tNow);
      while (recentTimestamps.length > 0 && recentTimestamps[0] < tNow - 3000) {
        recentTimestamps.shift();
      }
      const durationSec = Math.max(0.5, (tNow - (recentTimestamps[0] || tNow)) / 1000);
      const measuredRps = Math.round((recentTimestamps.length / durationSec) * 10) / 10;

      continuousState = {
        ...continuousState,
        requestsSent: continuousState.requestsSent + 1,
        lastAction: `${action.method} ${action.path.split("?")[0]}`,
        currentRps: measuredRps,
      };
      emitContinuous();

      // Launch request non-blocking so downstream server delay doesn't bottleneck client arrival rate
      call(action.method, action.path, { body: action.body }).catch(() => {});

      // Calculate realistic pacing delay with natural Poisson-like jitter (60% to 140% of target interval)
      const targetRps = continuousState.targetRps;
      const baseDelay = 1000 / targetRps;
      const jitter = 0.6 + Math.random() * 0.8;
      const delayMs = Math.max(15, Math.round(baseDelay * jitter));

      await new Promise((resolve) => {
        const timer = setTimeout(resolve, delayMs);
        signal.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            resolve(null);
          },
          { once: true }
        );
      });
    }

    continuousState = {
      ...continuousState,
      running: false,
      currentRps: 0,
    };
    emitContinuous();
  })();
}

export function stopContinuousTraffic() {
  if (continuousAbortCtrl) {
    continuousAbortCtrl.abort();
    continuousAbortCtrl = null;
  }
  continuousState = {
    ...continuousState,
    running: false,
    currentRps: 0,
  };
  emitContinuous();
}

export function setContinuousRps(rps: number) {
  continuousState = {
    ...continuousState,
    targetRps: Math.max(1, Math.min(100, rps)),
  };
  emitContinuous();
}

export const continuousTraffic = {
  getState: () => continuousState,
  subscribe: (cb: () => void) => {
    continuousSubs.add(cb);
    return () => continuousSubs.delete(cb);
  },
  start: startContinuousTraffic,
  stop: stopContinuousTraffic,
  setRps: setContinuousRps,
};

export const useContinuousTraffic = () =>
  useSyncExternalStore(continuousTraffic.subscribe, continuousTraffic.getState, continuousTraffic.getState);

export const PRESETS: Record<string, { label: string; hint: string; cfg: TrafficConfig }> = {
  normal: { label: "Normal traffic", hint: "Successful requests", cfg: { total: 30, rps: 5, errorProb: 0, latMin: 0, latMax: 0, endpoint: "mixed", burst: false } },
  error: { label: "Error traffic", hint: "Failed requests", cfg: { total: 30, rps: 5, errorProb: 0.6, latMin: 0, latMax: 0, endpoint: "mixed", burst: false } },
  slow: { label: "Slow requests", hint: "High latency", cfg: { total: 10, rps: 2, errorProb: 0, latMin: 2000, latMax: 4000, endpoint: "mixed", burst: false } },
  burst: { label: "Burst traffic", hint: "Concurrent requests", cfg: { total: 80, rps: 0, errorProb: 0.1, latMin: 0, latMax: 0, endpoint: "mixed", burst: true } },
};

let cancelled = false;
export const stopTraffic = () => {
  cancelled = true;
  stopContinuousTraffic();
};

export async function runTraffic(cfg: TrafficConfig, onProgress: (p: Progress) => void) {
  cancelled = false;
  let done = 0;
  onProgress({ done, total: cfg.total, running: true });
  const jobs: Promise<unknown>[] = [];
  for (let i = 0; i < cfg.total && !cancelled; i++) {
    const ep = cfg.endpoint === "mixed" ? MIXED[Math.floor(Math.random() * MIXED.length)] : ENDPOINTS.find((e) => e.path === cfg.endpoint)!;
    const err = Math.random() < cfg.errorProb;
    const chaosOverride: Partial<Chaos> = {};
    if (cfg.errorProb > 0) chaosOverride.errorRate = err ? 1 : 0;
    if (cfg.latMax > 0) {
      chaosOverride.latMin = cfg.latMin;
      chaosOverride.latMax = cfg.latMax;
    }
    jobs.push(
      call(ep.method, ep.path, {
        body: ep.method === "POST" ? { productId: 1 + (i % 8), qty: 1 } : undefined,
        chaos: Object.keys(chaosOverride).length > 0 ? chaosOverride : undefined,
      }).finally(() => onProgress({ done: ++done, total: cfg.total, running: true }))
    );
    if (!cfg.burst && cfg.rps > 0) await sleep(1000 / cfg.rps);
  }
  await Promise.all(jobs);
  onProgress({ done, total: cfg.total, running: false });
}

export type RunIncidentOptions = Partial<Chaos> | { failures?: Partial<Chaos>; endpoint?: string; total?: number };

/** Run an incident injecting all selected failures (or all available failure scenarios if none are currently selected) */
export async function runIncident(
  onProgress: (p: Progress) => void,
  options?: RunIncidentOptions
) {
  let failures: Partial<Chaos> | undefined;
  let customEndpoint: string | undefined;
  let total = 50;

  if (options) {
    if ("failures" in options || "endpoint" in options || "total" in options) {
      failures = options.failures;
      customEndpoint = options.endpoint;
      if (options.total) total = options.total;
    } else {
      failures = options as Partial<Chaos>;
    }
  }

  if (failures) {
    injector.set(failures);
  } else {
    const cur = injector.get();
    const hasSelected =
      (cur.errorRate ?? 0) > 0 ||
      (cur.latMax ?? 0) > 0 ||
      (cur.timeoutRate ?? 0) > 0 ||
      Boolean(cur.checkoutDegraded) ||
      Boolean(cur.authFail) ||
      Boolean(cur.telemetryDown);

    if (!hasSelected) {
      // If no failures are selected, activate all scenarios
      const allFailures: Partial<Chaos> = Object.assign({}, ...SCENARIOS.map((s) => s.patch));
      injector.set(allFailures);
    }
  }

  const active = injector.get();
  const onlyCheckout =
    Boolean(active.checkoutDegraded) &&
    !(active.latMax > 0) &&
    !(active.errorRate > 0) &&
    !(active.timeoutRate > 0) &&
    !active.authFail &&
    !active.telemetryDown;

  const endpoint = customEndpoint ?? (onlyCheckout ? "/api/checkout" : "mixed");
  await runTraffic(
    { total, rps: 10, errorProb: 0, latMin: 0, latMax: 0, endpoint, burst: false },
    onProgress
  );
}
