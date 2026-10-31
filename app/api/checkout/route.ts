import { handle } from "@/lib/server";
export const dynamic = "force-dynamic";
export const POST = (req: Request) => handle(req, () => ({ ok: true, orderId: "ORD-" + Math.floor(Math.random() * 1e6) }), { baseMin: 100, baseMax: 200, route: "checkout" });
