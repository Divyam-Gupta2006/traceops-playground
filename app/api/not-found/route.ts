import { handle } from "@/lib/server";
export const dynamic = "force-dynamic";
export const GET = (req: Request) => handle(req, () => ({}), { fail: 404, baseMin: 10, baseMax: 40 });
