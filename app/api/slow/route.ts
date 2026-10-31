import { handle } from "@/lib/server";
export const dynamic = "force-dynamic";
export const GET = (req: Request) => handle(req, () => ({ ok: true }), { baseMin: 3000, baseMax: 5000 });
