import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: { colors: { ink: "#0e1320", panel: "#161c2d", line: "#262e45", acme: "#2b4bff", ok: "#2fd18b", bad: "#ff5d6c", warn: "#ffb547" } } },
  plugins: [],
} satisfies Config;
