import { handle } from "@/lib/server";
import { PRODUCTS } from "@/lib/products";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.toLowerCase() ?? "";
  return handle(req, () => ({ products: PRODUCTS.filter((p) => p.name.toLowerCase().includes(q)) }), { route: "products" });
}
