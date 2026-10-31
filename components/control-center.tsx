"use client";
import { useEffect, useState } from "react";
import { Activity, CheckCircle2, Eye, EyeOff, Flame, Play, RotateCcw, Server, Square, Zap, XCircle } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BACKEND_PRESETS, traceops, useTraceOps } from "@/lib/traceops-client";
import { injector, SCENARIOS, useChaos } from "@/lib/failure-injector";
import { ENDPOINTS, PRESETS, runIncident, runTraffic, stopTraffic, useContinuousTraffic, continuousTraffic } from "@/lib/traffic-generator";
import type { Progress, TrafficConfig } from "@/types/simulator";

const card = "rounded-xl border border-line bg-panel p-4";
const input = "w-full rounded-md border border-line bg-ink px-2.5 py-1.5 text-sm";
const Dot = ({ c }: { c: string }) => <span className={`inline-block h-2 w-2 rounded-full ${c}`} />;
const ago = (t: number | null) => (t ? `${Math.max(0, Math.round((Date.now() - t) / 1000))}s ago` : "never");

export default function ControlCenter() {
  const { feed, stats, config } = useTraceOps();
  const chaos = useChaos();
  const sim = useContinuousTraffic();
  const [trafficTab, setTrafficTab] = useState<"live" | "batch">("live");
  const [showKey, setShowKey] = useState(false);
  const [testingConn, setTestingConn] = useState(false);
  const [cfg, setCfg] = useState<TrafficConfig>(PRESETS.normal.cfg);
  const [prog, setProg] = useState<Progress>({ done: 0, total: 0, running: false });
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(t); }, []);

  const start = (c: TrafficConfig) => { if (!prog.running) runTraffic(c, setProg); };
  const num = (k: keyof TrafficConfig) => (e: React.ChangeEvent<HTMLInputElement>) => setCfg({ ...cfg, [k]: Number(e.target.value) });

  const series = [...feed].reverse().slice(-60).map((f, i) => ({ i, ms: f.durationMs }));
  const recent = feed.slice(0, 50);
  const errRate = recent.length ? Math.round((recent.filter((f) => f.httpStatus >= 400 || f.httpStatus === 0 && f.operation.includes(" /")).length / recent.length) * 100) : 0;
  const p95 = recent.length ? [...recent].map((f) => f.durationMs).sort((a, b) => a - b)[Math.floor(recent.length * 0.95) - (recent.length * 0.95 === Math.floor(recent.length * 0.95) ? 1 : 0)] ?? 0 : 0;
  const backendTxt = stats.backend === "up" ? ["Connected", "bg-ok"] : stats.backend === "down" ? ["Unreachable", "bg-bad"] : ["Not tested", "bg-slate-500"];
  const keyTxt = stats.key === "valid" ? ["Accepted", "bg-ok"] : stats.key === "invalid" ? ["Rejected", "bg-bad"] : ["Unknown", "bg-slate-500"];

  return (
    <div className="mx-auto grid max-w-7xl gap-4 p-4 lg:grid-cols-3">
      {/* Connection */}
      <section className={`${card} lg:col-span-1`}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold"><Activity className="h-4 w-4 text-acme" />TraceOps connection</h2>
          <button
            onClick={() => traceops.resetConfig()}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
            title="Reset to default mock settings"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>

        {/* Target Backend Presets */}
        <div className="mb-3">
          <label className="mb-1 block text-xs text-slate-400">Target backend preset:</label>
          <div className="grid grid-cols-3 gap-1.5">
            {BACKEND_PRESETS.map((p) => {
              const active =
                p.id === "mock" ? config.url === "/api/mock-ingest" :
                p.id === "local" ? config.url === "http://localhost:8080/v1/ingest" :
                config.url !== "/api/mock-ingest" && config.url !== "http://localhost:8080/v1/ingest";
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    if (p.id === "mock") traceops.setConfig({ url: "/api/mock-ingest", apiKey: "demo-key" });
                    else if (p.id === "local") traceops.setConfig({ url: "http://localhost:8080/v1/ingest", apiKey: config.apiKey || "demo-key" });
                  }}
                  className={`rounded border px-2 py-1.5 text-left text-xs transition-colors ${
                    active
                      ? "border-acme bg-acme/15 font-semibold text-white"
                      : "border-line bg-ink/40 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                  }`}
                >
                  <div className="truncate">{p.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* URL Input */}
        <label className="text-xs text-slate-400">Ingestion URL</label>
        <input
          className={`${input} mb-2 mono`}
          value={config.url}
          onChange={(e) => traceops.setConfig({ url: e.target.value.trim() })}
          placeholder="http://localhost:8080/v1/ingest or https://your-backend/v1/ingest"
        />

        {/* API Key / Auth Token */}
        <label className="text-xs text-slate-400">Auth Token / API Key</label>
        <div className="relative mb-3">
          <input
            className={`${input} pr-8 mono`}
            type={showKey ? "text" : "password"}
            value={config.apiKey}
            onChange={(e) => traceops.setConfig({ apiKey: e.target.value })}
            placeholder="Enter auth token or API key"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-2 text-slate-400 hover:text-slate-200"
            aria-label={showKey ? "Hide key" : "Show key"}
          >
            {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>

        <button
          disabled={testingConn}
          onClick={async () => {
            setTestingConn(true);
            try { await traceops.test(); } finally { setTestingConn(false); }
          }}
          className="mb-3 w-full rounded-md bg-acme py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {testingConn ? "Testing connection…" : "Send test event"}
        </button>

        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between"><dt>Backend</dt><dd><Dot c={backendTxt[1]} /> {backendTxt[0]}</dd></div>
          <div className="flex justify-between"><dt>API key</dt><dd><Dot c={keyTxt[1]} /> {keyTxt[0]}</dd></div>
          <div className="flex justify-between"><dt>Last ingestion</dt><dd>{ago(stats.lastSuccess)}</dd></div>
          <div className="flex justify-between"><dt>Events sent</dt><dd className="mono">{stats.sent}</dd></div>
          <div className="flex justify-between"><dt>Acknowledged</dt><dd className="mono text-ok">{stats.acked}</dd></div>
          <div className="flex justify-between"><dt>Failed deliveries</dt><dd className="mono text-bad">{stats.failed}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-slate-500">
          Defaults to built-in mock. Point to your live backend by entering its URL and secret token above. Changes save automatically.
        </p>
      </section>

      {/* Traffic generator */}
      <section className={`${card} lg:col-span-1`}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold"><Zap className="h-4 w-4 text-warn" />Traffic generator</h2>
          <div className="flex rounded-lg bg-ink p-0.5 text-xs">
            <button
              onClick={() => setTrafficTab("live")}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${trafficTab === "live" ? "bg-panel text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
            >
              Live Simulation {sim.running && <span className="inline-block h-1.5 w-1.5 rounded-full bg-ok animate-pulse ml-1" />}
            </button>
            <button
              onClick={() => setTrafficTab("batch")}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${trafficTab === "batch" ? "bg-panel text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
            >
              Batch Traffic
            </button>
          </div>
        </div>

        {trafficTab === "live" ? (
          <div className="space-y-3">
            {sim.running ? (
              <div className="rounded-lg border border-ok/40 bg-ok/5 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-2 text-xs font-semibold text-ok">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ok opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-ok"></span>
                    </span>
                    LIVE SIMULATION ACTIVE
                  </span>
                  <span className="text-xs text-slate-400 mono">
                    {sim.startedAt ? `${Math.floor((Date.now() - sim.startedAt) / 1000)}s active` : ""}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-1 text-center">
                  <div className="rounded bg-ink/60 p-2">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">Sent</div>
                    <div className="mono text-base font-bold text-slate-100">{sim.requestsSent}</div>
                  </div>
                  <div className="rounded bg-ink/60 p-2">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">Live Rate</div>
                    <div className="mono text-base font-bold text-ok">{sim.currentRps || sim.targetRps}/s</div>
                  </div>
                  <div className="rounded bg-ink/60 p-2">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">Target</div>
                    <div className="mono text-base font-bold text-slate-200">{sim.targetRps} rps</div>
                  </div>
                </div>

                <div className="mt-2 text-xs text-slate-400 truncate">
                  <span className="text-slate-500">Activity:</span> <span className="mono text-slate-300">{sim.lastAction || "streaming…"}</span>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-line bg-ink/30 p-3">
                <p className="text-xs text-slate-300 leading-relaxed mb-2">
                  Simulates a continuous, realistic visitor journey (browsing products, search queries, cart additions, checkout, analytics). Stays running in the background until turned off.
                </p>
                <div className="flex items-center gap-1.5 text-xs text-ok font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Toggle or inject failures dynamically in real time
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-slate-400">Traffic speed (requests/sec):</label>
                <span className="mono text-xs font-semibold text-slate-200">{sim.targetRps} req/s</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: "Quiet", rps: 2 },
                  { label: "Normal", rps: 5 },
                  { label: "Peak", rps: 12 },
                  { label: "Rush", rps: 25 },
                ].map((p) => (
                  <button
                    key={p.rps}
                    onClick={() => continuousTraffic.setRps(p.rps)}
                    className={`rounded py-1 text-xs font-medium border transition-colors ${
                      sim.targetRps === p.rps
                        ? "border-acme bg-acme/20 text-white"
                        : "border-line bg-ink/40 text-slate-400 hover:text-slate-200 hover:border-slate-600"
                    }`}
                  >
                    {p.rps}/s <span className="text-[10px] block opacity-70">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {sim.running ? (
              <button
                onClick={() => continuousTraffic.stop()}
                className="w-full flex items-center justify-center gap-2 rounded-md bg-bad/20 border border-bad py-2 text-sm font-semibold text-bad hover:bg-bad/30 transition-colors"
              >
                <Square className="h-4 w-4" /> Stop Live Simulation
              </button>
            ) : (
              <button
                disabled={prog.running}
                onClick={() => continuousTraffic.start()}
                className="w-full flex items-center justify-center gap-2 rounded-md bg-ok py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 shadow-md shadow-ok/10 disabled:opacity-40 transition-colors"
              >
                <Play className="h-4 w-4 fill-slate-950" /> Start Live Website Simulation
              </button>
            )}

            <p className="text-[11px] text-slate-500">
              {sim.running
                ? "Simulation is live. You can switch to the Storefront tab or flip failure switches on the right to see immediate observability impact."
                : "Continuous traffic acts like real users browsing and shopping. Failures introduced while active take effect immediately."}
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-3 grid grid-cols-2 gap-2">
              {Object.entries(PRESETS).map(([k, p]) => (
                <button key={k} disabled={prog.running || sim.running} onClick={() => { setCfg(p.cfg); start(p.cfg); }} className="rounded-md border border-line px-3 py-2 text-left hover:border-acme disabled:opacity-40">
                  <div className="text-sm font-semibold">{p.label}</div><div className="text-xs text-slate-400">{p.hint}</div>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
              <label>Requests<input className={input} type="number" min={1} max={1000} value={cfg.total} onChange={num("total")} /></label>
              <label>Per second<input className={input} type="number" min={1} max={100} value={cfg.rps} disabled={cfg.burst} onChange={num("rps")} /></label>
              <label>Error probability %<input className={input} type="number" min={0} max={100} value={Math.round(cfg.errorProb * 100)} onChange={(e) => setCfg({ ...cfg, errorProb: Number(e.target.value) / 100 })} /></label>
              <label>Added latency (ms)<div className="flex gap-1"><input className={input} type="number" min={0} value={cfg.latMin} onChange={num("latMin")} /><input className={input} type="number" min={0} value={cfg.latMax} onChange={num("latMax")} /></div></label>
              <label className="col-span-2">Endpoint
                <select className={input} value={cfg.endpoint} onChange={(e) => setCfg({ ...cfg, endpoint: e.target.value })}>
                  <option value="mixed">Mixed (realistic)</option>
                  {ENDPOINTS.map((e) => <option key={e.path} value={e.path}>{e.method} {e.path}</option>)}
                </select>
              </label>
              <label className="col-span-2 flex items-center gap-2 text-sm text-slate-200"><input type="checkbox" checked={cfg.burst} onChange={(e) => setCfg({ ...cfg, burst: e.target.checked })} />Send all at once (burst)</label>
            </div>
            <div className="mt-3 flex gap-2">
              <button disabled={prog.running || sim.running} onClick={() => start(cfg)} className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-acme py-2 text-sm font-semibold disabled:opacity-40"><Play className="h-4 w-4" />Run batch traffic</button>
              <button disabled={!prog.running} onClick={stopTraffic} className="rounded-md border border-line px-3 disabled:opacity-40" aria-label="Stop"><Square className="h-4 w-4" /></button>
            </div>
            {prog.total > 0 && <div className="mt-3"><div className="h-1.5 overflow-hidden rounded bg-ink"><div className="h-full bg-ok transition-all" style={{ width: `${(prog.done / prog.total) * 100}%` }} /></div><p className="mt-1 text-xs text-slate-400">{prog.done}/{prog.total} {prog.running ? "completed…" : "done"}</p></div>}
          </div>
        )}
      </section>

      {/* Failure injection */}
      <section className={`${card} lg:col-span-1`}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold"><Flame className="h-4 w-4 text-bad" />Failure injection</h2>
          {sim.running && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-ok">
              <span className="h-1.5 w-1.5 rounded-full bg-ok animate-pulse" /> Live traffic active
            </span>
          )}
        </div>
        {sim.running && (
          <div className="mb-3 flex items-center gap-2 rounded-md bg-ok/10 border border-ok/30 px-2.5 py-1.5 text-xs text-ok">
            <span>⚡</span>
            <span>Live simulation running. Toggle any failure below to see immediate impact!</span>
          </div>
        )}
        <ul className="mb-3 space-y-1.5">
          {SCENARIOS.map((s) => {
            const on = Object.entries(s.patch).every(([k, v]) => (chaos as any)[k] === v);
            return (
              <li key={s.id}>
                <button onClick={() => injector.set(on ? Object.fromEntries(Object.keys(s.patch).map((k) => [k, typeof (s.patch as any)[k] === "boolean" ? false : 0])) : s.patch)} className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm ${on ? "border-bad bg-bad/10" : "border-line"}`}>
                  <span><span className="font-medium">{s.label}</span><span className="block text-xs text-slate-400">{s.tests}</span></span>
                  <span className={`text-xs font-semibold ${on ? "text-bad" : "text-slate-500"}`}>{on ? "ON" : "OFF"}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <button disabled={prog.running} onClick={() => runIncident(setProg)} className="mb-2 w-full rounded-md border border-bad py-2 text-sm font-semibold text-bad disabled:opacity-40">
          {(() => {
            const activeScenarios = SCENARIOS.filter((s) =>
              Object.entries(s.patch).every(([k, v]) => (chaos as any)[k] === v)
            );
            if (activeScenarios.length === 0) return "Run incident: All failures (50 requests)";
            if (activeScenarios.length === 1) return `Run incident: ${activeScenarios[0].label} (50 requests)`;
            return `Run incident: ${activeScenarios.length} selected failures (50 requests)`;
          })()}
        </button>
        <button onClick={() => injector.reset()} className="w-full rounded-md border border-line py-2 text-sm">Reset all failures</button>
        <p className="mt-2 text-xs text-slate-500">Failures apply to live simulation, storefront, and batch traffic in real time.</p>
      </section>

      {/* Chart + KPIs */}
      <section className={`${card} lg:col-span-3`}>
        <div className="mb-2 flex flex-wrap items-center gap-6 text-sm">
          <h2 className="font-semibold">Latency, last 60 events</h2>
          <span className="text-slate-400">p95 <b className="mono text-slate-100">{p95} ms</b></span>
          <span className="text-slate-400">Error rate (last 50) <b className={`mono ${errRate > 10 ? "text-bad" : "text-ok"}`}>{errRate}%</b></span>
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}><CartesianGrid stroke="#262e45" vertical={false} /><XAxis dataKey="i" hide /><YAxis width={48} stroke="#7a86a8" fontSize={11} unit="ms" />
              <Tooltip contentStyle={{ background: "#0e1320", border: "1px solid #262e45" }} formatter={(v: number) => [`${v} ms`, "Duration"]} labelFormatter={() => ""} />
              <Area dataKey="ms" stroke="#2b4bff" fill="#2b4bff33" isAnimationActive={false} /></AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Feed */}
      <section className={`${card} lg:col-span-3`}>
        <div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">Live request feed</h2><button onClick={() => traceops.clear()} className="text-xs text-slate-400 hover:text-slate-100">Clear</button></div>
        <p className="mb-2 text-xs text-slate-400">What the Playground generated (left) versus what TraceOps acknowledged (Delivery).</p>
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-panel text-left text-xs text-slate-400"><tr><th className="py-1">Time</th><th>Operation</th><th>Duration</th><th>Status</th><th>Delivery</th></tr></thead>
            <tbody>
              {feed.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-500">No events yet. Browse the storefront or run a traffic preset.</td></tr>}
              {feed.slice(0, 100).map((f) => (
                <tr key={f.id} className="border-t border-line">
                  <td className="mono py-1 text-slate-400">{new Date(f.time).toLocaleTimeString([], { hour12: false })}</td>
                  <td className="mono">{f.operation}</td>
                  <td className="mono">{f.durationMs >= 1000 ? (f.durationMs / 1000).toFixed(1) + " s" : f.durationMs + " ms"}</td>
                  <td className={f.httpStatus >= 400 || f.httpStatus === 0 && f.operation.includes(" /") ? "text-bad" : f.slow ? "text-warn" : "text-ok"}>{f.httpStatus ? f.httpStatus : "—"}{f.slow && " Slow"}</td>
                  <td>{f.delivery === "acked" ? <span className="inline-flex items-center gap-1 text-ok"><CheckCircle2 className="h-3.5 w-3.5" />Acked</span> : f.delivery === "failed" ? <span title={f.error} className="inline-flex items-center gap-1 text-bad"><XCircle className="h-3.5 w-3.5" />Failed{f.attempts > 1 && ` (${f.attempts} tries)`}</span> : <span className="text-slate-400">Sending{f.attempts > 1 && ` (try ${f.attempts})`}…</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
