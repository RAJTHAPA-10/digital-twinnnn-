/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        page: v("page"),
        card: v("card"),
        raised: v("raised"),
        line: v("line"),
        divider: v("divider"),
        fg: v("fg"),
        muted: v("muted"),
        faint: v("faint"),
        accent: { DEFAULT: v("accent"), soft: v("accent-soft"), ink: v("accent-ink"), on: v("accent-on") },
        indigo: { DEFAULT: v("indigo"), soft: v("indigo-soft"), ink: v("indigo-ink") },
        safe: { DEFAULT: v("safe"), soft: v("safe-soft") },
        danger: { DEFAULT: v("danger"), soft: v("danger-soft") },
        sev: { low: v("sev-low"), medium: v("sev-medium"), high: v("sev-high"), critical: v("sev-critical") },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: { card: "16px" },
      fontWeight: { normal: "400", medium: "500", semibold: "500", bold: "500" },
    },
  },
  plugins: [],
};
