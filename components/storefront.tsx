"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, ShoppingBag, User, X } from "lucide-react";
import { call } from "@/lib/api-client";
import { traceops } from "@/lib/traceops-client";
import { useChaos } from "@/lib/failure-injector";
import { PRODUCTS, type Product } from "@/lib/products";

export default function Storefront() {
  const chaos = useChaos();
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Product | null>(null);
  const [cart, setCart] = useState<Product[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [user, setUser] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [toast, setToast] = useState<{ msg: string; bad?: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const say = (msg: string, bad = false) => { setToast({ msg, bad }); setTimeout(() => setToast(null), 2500); };

  useEffect(() => {
    traceops.event("pageview", { path: "/", title: "Acme Commerce" });
    call("GET", "/api/products").then((r) => r.data?.products && setProducts(r.data.products));
  }, []);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    traceops.event("product.search", { query: q });
    setLoading(true);
    const r = await call("GET", `/api/products?q=${encodeURIComponent(q)}`);
    setLoading(false);
    if (r.error) return say(`Search failed: ${r.error}`, true);
    setProducts(r.data.products);
  }
  function view(p: Product) { setOpen(p); traceops.event("product.view", { productId: p.id, name: p.name }); }
  async function add(p: Product) {
    const r = await call("POST", "/api/cart", { body: { productId: p.id } });
    if (r.error) return say(`Couldn't add to cart: ${r.error}`, true);
    setCart((c) => [...c, p]); traceops.event("cart.add", { productId: p.id, price: p.price }); say(`${p.name} added`); setOpen(null);
  }
  async function checkout() {
    traceops.event("checkout.initiated", { items: cart.length, total: cart.reduce((s, p) => s + p.price, 0) });
    setLoading(true);
    const r = await call("POST", "/api/checkout", { body: { items: cart.map((p) => p.id) }, timeoutMs: 8000 });
    setLoading(false);
    if (r.error) return say(`Checkout failed: ${r.error}`, true);
    say(`Order ${r.data.orderId} placed`); setCart([]); setShowCart(false);
  }
  function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email")), pw = String(f.get("pw"));
    if (chaos.authFail || pw !== "acme123") {
      traceops.event("auth.failed", { email }, "Invalid credentials");
      return say("Wrong email or password. Demo password: acme123", true);
    }
    setUser(email); setShowLogin(false); traceops.event("auth.success", { email }); say(`Signed in as ${email}`);
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-50 text-slate-900">
      <header className="sticky top-14 z-10 flex items-center gap-4 border-b border-slate-200 bg-white px-5 py-3">
        <h1 className="text-lg font-black tracking-tight text-acme">Acme Commerce</h1>
        <form onSubmit={search} className="relative mx-auto flex w-full max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" aria-label="Search products" className="w-full rounded-full border border-slate-300 py-2 pl-9 pr-4 text-sm" />
        </form>
        <button onClick={() => (user ? setUser(null) : setShowLogin(true))} className="flex items-center gap-1.5 text-sm font-medium"><User className="h-4 w-4" />{user ?? "Sign in"}</button>
        <button onClick={() => setShowCart(true)} className="relative flex items-center gap-1.5 rounded-full bg-acme px-4 py-2 text-sm font-semibold text-white"><ShoppingBag className="h-4 w-4" />Cart ({cart.length})</button>
      </header>

      <main className="mx-auto max-w-5xl p-6">
        <p className="mb-5 text-sm text-slate-500">{loading ? "Loading…" : `${products.length} products`}. Every click here sends telemetry to TraceOps.</p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {products.map((p) => (
            <button key={p.id} onClick={() => view(p)} className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-acme">
              <div className="mb-3 grid h-24 place-items-center rounded-lg bg-slate-100 text-5xl">{p.emoji}</div>
              <div className="text-sm font-semibold">{p.name}</div>
              <div className="text-xs text-slate-500">{p.cat}</div>
              <div className="mt-1 font-bold">${p.price}</div>
            </button>
          ))}
          {!products.length && <p className="col-span-full py-10 text-center text-slate-500">No products match “{q}”. Try “lamp” or clear the search.</p>}
        </div>
      </main>

      <AnimatePresence>
        {(open || showCart || showLogin) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-30 grid place-items-center bg-black/50 p-4" onClick={() => { setOpen(null); setShowCart(false); setShowLogin(false); }}>
            <motion.div initial={{ y: 16, scale: 0.98 }} animate={{ y: 0, scale: 1 }} className="relative w-full max-w-sm rounded-2xl bg-white p-6 text-slate-900" onClick={(e) => e.stopPropagation()}>
              <button aria-label="Close" className="absolute right-3 top-3" onClick={() => { setOpen(null); setShowCart(false); setShowLogin(false); }}><X className="h-5 w-5" /></button>
              {open && (<>
                <div className="mb-4 grid h-32 place-items-center rounded-xl bg-slate-100 text-7xl">{open.emoji}</div>
                <h2 className="text-xl font-bold">{open.name}</h2><p className="mb-4 text-slate-500">${open.price} · {open.cat}</p>
                <button onClick={() => add(open)} className="w-full rounded-full bg-acme py-2.5 font-semibold text-white">Add to cart</button>
              </>)}
              {showCart && (<>
                <h2 className="mb-3 text-xl font-bold">Your cart</h2>
                {cart.length ? <ul className="mb-4 space-y-1 text-sm">{cart.map((p, i) => <li key={i} className="flex justify-between"><span>{p.emoji} {p.name}</span><span>${p.price}</span></li>)}</ul> : <p className="mb-4 text-sm text-slate-500">Your cart is empty. Add a product to try checkout.</p>}
                <button disabled={!cart.length || loading} onClick={checkout} className="w-full rounded-full bg-acme py-2.5 font-semibold text-white disabled:opacity-40">{loading ? "Processing…" : `Check out · $${cart.reduce((s, p) => s + p.price, 0)}`}</button>
              </>)}
              {showLogin && (<form onSubmit={login} className="space-y-3">
                <h2 className="text-xl font-bold">Sign in</h2>
                <input name="email" type="email" required defaultValue="ada@acme.test" aria-label="Email" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
                <input name="pw" type="password" required placeholder="Password (acme123)" aria-label="Password" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
                <button className="w-full rounded-full bg-acme py-2.5 font-semibold text-white">Sign in</button>
              </form>)}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {toast && <div role="status" className={`fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-full px-5 py-2 text-sm font-medium text-white ${toast.bad ? "bg-bad" : "bg-slate-900"}`}>{toast.msg}</div>}
    </div>
  );
}
