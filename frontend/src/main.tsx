import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.tsx";
import AppErrorBoundary from "./components/AppErrorBoundary.tsx";
import { RoleProvider } from "./context/RoleContext.tsx";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <RoleProvider>
          <AppErrorBoundary>
            <App />
          </AppErrorBoundary>
        </RoleProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);
