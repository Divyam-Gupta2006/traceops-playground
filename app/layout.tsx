import "./globals.css";
export const metadata = { title: "TraceOps Playground", description: "Acme Commerce + Telemetry Control Center" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body className="bg-ink text-slate-100 antialiased">{children}</body></html>);
}
