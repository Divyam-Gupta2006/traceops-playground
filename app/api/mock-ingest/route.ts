export const dynamic = "force-dynamic";
const g = globalThis as any;
g.__events ||= [] as any[];
export async function POST(req: Request) {
  const key = req.headers.get("x-api-key") || req.headers.get("authorization");
  if (!key) return Response.json({ error: "Missing API key" }, { status: 401 });
  const e = await req.json();
  if (!e?.serviceName || !e?.operationName || typeof e.durationMs !== "number")
    return Response.json({ error: "Invalid event" }, { status: 400 });
  g.__events.push(e);
  if (g.__events.length > 5000) g.__events.shift();
  return Response.json({ accepted: 1 }, { status: 202 });
}
export async function GET() {
  return Response.json({ count: g.__events.length, recent: g.__events.slice(-20).reverse() });
}
