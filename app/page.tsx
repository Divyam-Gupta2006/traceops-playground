"use client";
import { useEffect, useState } from "react";
import Storefront from "@/components/storefront";
import ControlCenter from "@/components/control-center";
import { traceops } from "@/lib/traceops-client";
import { useContinuousTraffic, continuousTraffic } from "@/lib/traffic-generator";

export default function Page() {
  const [tab, setTab] = useState<"control" | "store">("control");
  const sim = useContinuousTraffic();

  // Browser error capture
  useEffect(() => {
    const onErr = (e: ErrorEvent) => traceops.event("browser.error", { source: e.filename ?? "" }, e.message);
    const onRej = (e: PromiseRejectionEvent) => traceops.event("browser.unhandledrejection", {}, String(e.reason));
    window.addEventListener("error", onErr); window.addEventListener("unhandledrejection", onRej);
    return () => { window.removeEventListener("error", onErr); window.removeEventListener("unhandledrejection", onRej); };
  }, []);

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

        {sim.running && (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-ok/10 border border-ok/30 px-2.5 py-1 text-xs text-ok font-medium">
              <span className="h-2 w-2 rounded-full bg-ok animate-pulse" />
              Live Traffic: <b className="mono font-bold">{sim.currentRps || sim.targetRps} req/s</b> ({sim.requestsSent} sent)
            </span>
            <button
              onClick={() => continuousTraffic.stop()}
              className="rounded border border-bad/50 bg-bad/15 px-2.5 py-1 text-xs font-semibold text-bad hover:bg-bad/25 transition-colors"
            >
              Stop
            </button>
          </div>
        )}
      </nav>
      {/* Keep both mounted so the storefront's state survives tab switches */}
      <div hidden={tab !== "control"}><ControlCenter /></div>
      <div hidden={tab !== "store"}><Storefront /></div>
    </>
  );
}
