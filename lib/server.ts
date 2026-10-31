// Shared server-side behaviour for simulated API routes: latency, injected failures.
export async function handle(
  req: Request,
  data: () => unknown,
  o: { baseMin?: number; baseMax?: number; fail?: number; route?: string } = {}
) {
  let c: any = {};
  try { c = JSON.parse(req.headers.get("x-chaos") || "{}"); } catch {}
  const bMin = o.baseMin ?? 20, bMax = o.baseMax ?? 120;
  let ms = bMin + Math.random() * (bMax - bMin);
  if (c.latMax > 0) ms += c.latMin + Math.random() * Math.max(0, c.latMax - c.latMin);
  const degraded = o.route === "checkout" && c.checkoutDegraded;
  if (degraded) ms = 3500 + Math.random() * 1000;
  if (c.timeoutRate && Math.random() < c.timeoutRate) ms = 12000;
  await new Promise((r) => setTimeout(r, ms));
  if (o.fail) return Response.json({ error: `Simulated HTTP ${o.fail}` }, { status: o.fail });
  if (c.authFail && (o.route === "users" || o.route === "auth"))
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (Math.random() < (c.errorRate || 0) || (degraded && Math.random() < 0.4))
    return Response.json({ error: "Injected failure" }, { status: 500 });
  return Response.json(data());
}
