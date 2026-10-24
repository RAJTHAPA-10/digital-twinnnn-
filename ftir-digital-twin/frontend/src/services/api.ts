import type { Api } from "../types/api";
import { useApp } from "../store/app";
import { liveApi } from "./live";
import { mockApi } from "./mock";

export { explainFTIR } from "../lib/explain";

/** The single API the UI uses. It routes to the live backend or the demo backend. */
export const api: Api = new Proxy({} as Api, {
  get(_target, prop: keyof Api) {
    const impl = useApp.getState().mode === "live" ? liveApi : mockApi;
    return Reflect.get(impl, prop);
  },
});

export async function detectMode(): Promise<"live" | "mock"> {
  if (import.meta.env.VITE_USE_MOCK === "true") return "mock";
  return (await liveApi.health()) ? "live" : "mock";
}
