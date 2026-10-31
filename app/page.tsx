"use client";
import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import Storefront from "@/components/storefront";
import ControlCenter from "@/components/control-center";
import ConnectionModal from "@/components/connection-modal";
import { traceops, useTraceOps } from "@/lib/traceops-client";
import { useContinuousTraffic, continuousTraffic } from "@/lib/traffic-generator";

export default function Page() {
  const [tab, setTab] = useState<"control" | "store">("control");
  const [showConfigModal, setShowConfigModal] = useState(false);
  const { config, stats } = useTraceOps();
  const sim = useContinuousTraffic();

  // Browser error capture
  useEffect(() => {
    const onErr = (e: ErrorEvent) => traceops.event("browser.error", { source: e.filename ?? "" }, e.message);
    const onRej = (e: PromiseRejectionEvent) => traceops.event("browser.unhandledrejection", {}, String(e.reason));
    window.addEventListener("error", onErr); window.addEventListener("unhandledrejection", onRej);
    return () => { window.removeEventListener("error", onErr); window.removeEventListener("unhandledrejection", onRej); };
  }, []);

  const backendDot =
    stats.backend === "up" ? "bg-ok" :
    stats.backend === "down" ? "bg-bad" :
    "bg-slate-500";

  return (
    <>
      <nav className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-ink px-4">
        <div className="flex items-center gap-1">
          <span className="mr-4 font-bold">TraceOps Playground</span>
          {([["control", "Control Center"], ["store", "Acme Commerce storefront"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-md px-3 py-1.5 text-sm ${tab === k ? "bg-acme font-semibold" : "text-slate-400 hover:text-white"}`}>
              {l}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Target Backend Selector & Credentials Button */}
          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 py-1 text-xs text-slate-300 hover:border-slate-500 hover:text-white transition-colors"
            title="Configure target backend URL and auth token"
          >
            <span className={`h-2 w-2 rounded-full ${backendDot}`} />
            <span className="text-slate-400 hidden sm:inline">Backend:</span>
            <span className="mono font-semibold text-slate-200 truncate max-w-[130px]">
              {config.url === "/api/mock-ingest" ? "Mock Ingest" : config.url.replace(/^https?:\/\//, "")}
            </span>
            <Settings className="h-3.5 w-3.5 text-slate-400 ml-0.5" />
          </button>

          {/* Continuous Simulation Active Pill */}
          {sim.running && (
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1.5 rounded-full bg-ok/10 border border-ok/30 px-2.5 py-1 text-xs text-ok font-medium">
                <span className="h-2 w-2 rounded-full bg-ok animate-pulse" />
                Live: <b className="mono font-bold">{sim.currentRps || sim.targetRps} req/s</b>
              </span>
              <button
                onClick={() => continuousTraffic.stop()}
                className="rounded border border-bad/50 bg-bad/15 px-2 py-0.5 text-xs font-semibold text-bad hover:bg-bad/25 transition-colors"
              >
                Stop
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Target Backend & Token Modal */}
      <ConnectionModal open={showConfigModal} onClose={() => setShowConfigModal(false)} />

      {/* Keep both mounted so the storefront's state survives tab switches */}
      <div hidden={tab !== "control"}><ControlCenter /></div>
      <div hidden={tab !== "store"}><Storefront /></div>
    </>
  );
}
