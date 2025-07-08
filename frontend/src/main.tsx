import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // --- OPTIMIZATIONS ---
      // 1. Disable refetching when the browser window is focused
      refetchOnWindowFocus: false,
      // 2. Consider fetched data "fresh" for 5 minutes, preventing immediate refetches.
      staleTime: 5 * 60 * 1000,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
