import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import App from "./App";
import { useApp } from "./store/app";
import "./styles/theme.css";

// Apply the saved theme before first paint.
document.documentElement.classList.toggle("dark", useApp.getState().theme === "dark");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 30_000 },
  },
});

function ThemedToaster() {
  const theme = useApp((s) => s.theme);
  return (
    <Toaster
      theme={theme}
      position="bottom-right"
      toastOptions={{ className: "!rounded-2xl !border !border-line !bg-card !text-fg !text-[13px] !shadow-none" }}
    />
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
        <ThemedToaster />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
