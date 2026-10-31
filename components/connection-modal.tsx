"use client";
import { useState } from "react";
import { CheckCircle2, Eye, EyeOff, Globe, Key, RotateCcw, Server, X, XCircle } from "lucide-react";
import { BACKEND_PRESETS, traceops, useTraceOps } from "@/lib/traceops-client";

const input = "w-full rounded-md border border-line bg-ink px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-acme focus:outline-none mono";

export default function ConnectionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { config, stats } = useTraceOps();
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok?: boolean; message?: string } | null>(null);

  if (!open) return null;

  const activePreset =
    config.url === "/api/mock-ingest"
      ? "mock"
      : config.url === "http://localhost:8080/v1/ingest"
      ? "local"
      : "custom";

  const applyPreset = (preset: (typeof BACKEND_PRESETS)[number]) => {
    setTestResult(null);
    if (preset.id === "mock") {
      traceops.setConfig({ url: "/api/mock-ingest", apiKey: "demo-key" });
    } else if (preset.id === "local") {
      traceops.setConfig({ url: "http://localhost:8080/v1/ingest", apiKey: config.apiKey || "demo-key" });
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await traceops.test();
      if (res.ok) {
        setTestResult({ ok: true, message: "Connected successfully! TraceOps acknowledged the test event." });
      } else {
        setTestResult({
          ok: false,
          message: res.status === 401 || res.status === 403
            ? "Authentication failed: API key was rejected (HTTP 401/403)."
            : res.error || "Backend unreachable. Check URL and CORS.",
        });
      }
    } catch (e: any) {
      setTestResult({ ok: false, message: String(e?.message ?? e) });
    } finally {
      setTesting(false);
    }
  };

  const backendTxt =
    stats.backend === "up" ? ["Connected", "text-ok bg-ok/10 border-ok/30"] :
    stats.backend === "down" ? ["Unreachable", "text-bad bg-bad/10 border-bad/30"] :
    ["Not tested", "text-slate-400 bg-slate-800/40 border-line"];

  const keyTxt =
    stats.key === "valid" ? ["Accepted", "text-ok bg-ok/10 border-ok/30"] :
    stats.key === "invalid" ? ["Rejected", "text-bad bg-bad/10 border-bad/30"] :
    ["Unknown", "text-slate-400 bg-slate-800/40 border-line"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-xl border border-line bg-panel p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-acme" />
            <h3 className="text-base font-bold text-slate-100">Target Backend & Auth Token</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-ink hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <p className="text-xs text-slate-400">
            Configure the destination backend and secret credentials where telemetry is delivered. Values persist in browser storage.
          </p>

          {/* Quick Presets */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">Target backend preset:</label>
            <div className="grid grid-cols-3 gap-2">
              {BACKEND_PRESETS.map((p) => {
                const isSelected = activePreset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => applyPreset(p)}
                    className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                      isSelected
                        ? "border-acme bg-acme/15 text-white shadow-sm"
                        : "border-line bg-ink/40 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                    }`}
                  >
                    <div className="font-semibold text-slate-200">{p.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">{p.id === "mock" ? "Local mock" : p.id === "local" ? ":8080" : "Custom"}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* URL Input */}
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Globe className="h-3.5 w-3.5 text-acme" />
              Ingestion URL
            </label>
            <input
              className={input}
              value={config.url}
              onChange={(e) => traceops.setConfig({ url: e.target.value.trim() })}
              placeholder="https://api.yourdomain.com/v1/ingest or /api/mock-ingest"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              For local testing, use <span className="mono text-slate-400">/api/mock-ingest</span> or <span className="mono text-slate-400">http://localhost:8080/v1/ingest</span>.
            </p>
          </div>

          {/* Auth Token Input */}
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Key className="h-3.5 w-3.5 text-warn" />
              Auth Token / API Key
            </label>
            <div className="relative">
              <input
                className={`${input} pr-10`}
                type={showKey ? "text" : "password"}
                value={config.apiKey}
                onChange={(e) => traceops.setConfig({ apiKey: e.target.value })}
                placeholder="Enter auth token or API key"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                aria-label={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Sent via <span className="mono text-slate-400">Authorization: Bearer &lt;token&gt;</span> and <span className="mono text-slate-400">x-api-key: &lt;token&gt;</span> headers.
            </p>
          </div>

          {/* Diagnostics Status */}
          <div className="flex items-center justify-between rounded-lg border border-line bg-ink/60 px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Backend:</span>
              <span className={`rounded border px-2 py-0.5 font-medium ${backendTxt[1]}`}>{backendTxt[0]}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">API Key:</span>
              <span className={`rounded border px-2 py-0.5 font-medium ${keyTxt[1]}`}>{keyTxt[0]}</span>
            </div>
          </div>

          {/* Test feedback banner */}
          {testResult && (
            <div className={`flex items-start gap-2 rounded-lg border p-2.5 text-xs ${
              testResult.ok ? "border-ok/40 bg-ok/10 text-ok" : "border-bad/40 bg-bad/10 text-bad"
            }`}>
              {testResult.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 shrink-0 mt-0.5" />}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              disabled={testing}
              onClick={handleTest}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-acme py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {testing ? "Testing Connection…" : "Test Connection"}
            </button>
            <button
              onClick={() => {
                traceops.resetConfig();
                setTestResult(null);
              }}
              className="flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-xs text-slate-400 hover:border-slate-500 hover:text-slate-200 transition-colors"
              title="Reset URL and API key to defaults"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
            <button
              onClick={onClose}
              className="rounded-md border border-line bg-ink px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
