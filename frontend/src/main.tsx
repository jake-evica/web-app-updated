import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import React, { StrictMode, useEffect } from "react"
import ReactDOM from "react-dom/client"
import { routeTree } from "./routeTree.gen"
import * as Sentry from "@sentry/react"

import { ApiError, OpenAPI } from "./client"
import { CustomProvider } from "./components/ui/provider"
import { testApiConnectivity, testCorsConfiguration } from "./utils"

// Initialize Sentry
Sentry.init({
  dsn: "https://4a3d9d44c3c543d5dfcc43c9e707b9de@o4509034710237184.ingest.us.sentry.io/4509036078301185",
  integrations: [],
  // Performance monitoring
  tracesSampleRate: 1.0, // Capture 100% of transactions in production
  // Session replay
  replaysSessionSampleRate: 0.1, // Sample rate for all sessions (10%)
  replaysOnErrorSampleRate: 1.0, // Sample rate for sessions with errors (100%)
  environment: import.meta.env.MODE || "production",
});

// Add logging to debug API URL issues
console.log("Environment:", import.meta.env.MODE);
console.log("API URL from env:", import.meta.env.VITE_API_URL);

// Test API connectivity on startup
testApiConnectivity().then(result => {
  console.log("API connectivity test completed:", result);
});

// Test CORS configuration
testCorsConfiguration().then(result => {
  console.log("CORS configuration test completed:", result);
});

OpenAPI.BASE = import.meta.env.VITE_API_URL
console.log("OpenAPI BASE configured as:", OpenAPI.BASE);

OpenAPI.TOKEN = async () => {
  const token = localStorage.getItem("access_token") || "";
  console.log("Token available:", !!token);
  return token;
}

// Add a request interceptor to log request details
OpenAPI.interceptors.request.use((config) => {
  console.log("API Request:", {
    method: config.method,
    url: config.url,
    headers: config.headers,
  });
  
  // Fix URL with duplicate /api/ paths
  if (config.url && config.url.includes('/api/api/')) {
    config.url = config.url.replace('/api/api/', '/api/');
    console.log("Fixed URL with duplicate /api/ paths:", config.url);
  }
  
  return config;
});

// Add a response interceptor to log response details
OpenAPI.interceptors.response.use((response) => {
  console.log("API Response:", {
    status: response.status,
    statusText: response.statusText,
    url: response.config?.url,
  });
  return response;
});

const handleApiError = (error: Error) => {
  console.error("API Error:", error);
  if (error instanceof ApiError && [401, 403].includes(error.status)) {
    localStorage.removeItem("access_token")
    window.location.href = "/login"
  }
}
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleApiError,
  }),
  mutationCache: new MutationCache({
    onError: handleApiError,
  }),
})

const router = createRouter({ routeTree })
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CustomProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </CustomProvider>
  </StrictMode>,
)
