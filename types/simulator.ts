export type Chaos = {
  errorRate: number; latMin: number; latMax: number; timeoutRate: number;
  checkoutDegraded: boolean; authFail: boolean; telemetryDown: boolean;
};
export type TrafficConfig = { total: number; rps: number; errorProb: number; latMin: number; latMax: number; endpoint: string; burst: boolean };
export type Progress = { done: number; total: number; running: boolean };
export type ContinuousTrafficState = {
  running: boolean;
  targetRps: number;
  requestsSent: number;
  startedAt: number | null;
  lastAction: string | null;
  currentRps: number;
};
