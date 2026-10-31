import { handle } from "@/lib/server";
export const dynamic = "force-dynamic";
export const POST = (req: Request) => handle(req, () => ({ ok: true }), { baseMin: 30, baseMax: 110, route: "cart" });
