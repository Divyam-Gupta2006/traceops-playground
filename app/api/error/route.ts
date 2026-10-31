import { handle } from "@/lib/server";
export const dynamic = "force-dynamic";
export const GET = (req: Request) => handle(req, () => ({}), { fail: 500, baseMin: 20, baseMax: 80 });
