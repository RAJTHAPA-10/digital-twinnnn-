import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { llmExplainPlugin } from "./server/llmExplain";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  
  const backendEnv = loadEnv(mode, path.resolve(process.cwd(), "../backend"), "");
  const target = env.VITE_API_BASE_URL || "http://localhost:5000";

  const models = [
    env.GEMINI_MODEL,
    backendEnv.GEMINI_MODEL_PRIMARY,
    backendEnv.GEMINI_MODEL_FALLBACK_1,
    backendEnv.GEMINI_MODEL_FALLBACK_2,
    "gemini-2.5-flash",
  ].filter((m): m is string => Boolean(m && m.trim()));

  return {
    plugins: [
      react(),
      llmExplainPlugin({
        apiKey: (env.GEMINI_API_KEY || backendEnv.GEMINI_API_KEY)?.trim() || undefined,
        models: [...new Set(models.map((m) => m.trim()))],
        apiBase: env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com",
      }),
    ],
    server: {
      port: 5173,
      
      proxy: { "/api": { target, changeOrigin: true } },
    },
  };
});