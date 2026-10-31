import { handle } from "@/lib/server";
export const dynamic = "force-dynamic";
export const GET = (req: Request) => handle(req, () => ({ users: [{ id: 1, name: "Ada Lovelace", plan: "pro" }, { id: 2, name: "Alan Turing", plan: "free" }] }), { route: "users" });
