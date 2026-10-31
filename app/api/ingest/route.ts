export const dynamic = "force-dynamic";
// Browser -> Playground server -> TraceOps (avoids CORS in the browser)
export async function POST(req: Request) {
  let target = req.headers.get("x-traceops-url") || "";
  const key = req.headers.get("x-traceops-key") || "";
  if (!target) return Response.json({ error: "No TraceOps URL configured" }, { status: 400 });
  if (target.startsWith("/")) target = new URL(target, req.url).toString();
  try {
    const r = await fetch(target, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, authorization: `Bearer ${key}` },
      body: await req.text(),
      signal: AbortSignal.timeout(8000),
    });
    const text = await r.text();
    return new Response(text || "{}", { status: r.status, headers: { "content-type": r.headers.get("content-type") || "application/json" } });
  } catch (e: any) {
    return Response.json({ error: `Backend unreachable: ${e?.message ?? e}` }, { status: 502 });
  }
}
