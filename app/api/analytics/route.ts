import { handle } from "@/lib/server";
export const dynamic = "force-dynamic";
export const GET = (req: Request) => handle(req, () => ({ visits: 12840, conversion: 0.034, revenue: 48210 }), { baseMin: 60, baseMax: 250, route: "analytics" });
