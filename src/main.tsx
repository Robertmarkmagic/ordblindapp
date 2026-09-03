import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

// CRITICAL: Initialize fetch interceptor FIRST (before any fetch calls)
// This captures 401, 404, and network errors for AI debugging
import "./lib/fetch-interceptor";

// Initialize analytics tracking (page views, sessions, errors, Core Web Vitals)
// Sends data to /__analytics endpoint -> Cloudflare Analytics Engine
import "./lib/analytics";

// Console logging for AI debugging is now handled by the OverSkill Platform SDK
// loaded from CDN in index.html (https://sdk.overskill.com/v1/platform.js)
// This enables hot-updates to logging without rebuilding apps

// Initialize preview auth for iframe OAuth testing (development only)
import "./lib/preview-auth";

// Initialize theme preview listener for OverSkill editor integration
import "./lib/theme-preview";
import { applyAppPreferences, loadAppPreferences } from "./lib/app-preferences";

applyAppPreferences(loadAppPreferences());

// PWA post-deploy update flow (FM-2, Jul 2026). Registers the Workbox service
// worker (vite.config.ts sets injectRegister: false — registration is owned
// here) and makes new deploys reach open tabs: one guarded auto-reload when a
// new service worker takes control right after page load, plus a small
// "New version available — Reload" banner for long-lived sessions.
// DO NOT remove this import — without it the service worker never registers
// and users keep seeing the previous deploy's cached bundle.
import "./lib/pwa-update";

// Window-level safety net for non-React errors (event handlers, async callbacks).
// React render errors are caught by <ErrorBoundary> below — they do NOT fire
// window.onerror and would otherwise crash the tree silently.
window.addEventListener('error', (event) => {
  console.error('Application Error:', event.message, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

// NOTE: App.tsx already includes BrowserRouter with routing
// Auth routes are pre-configured: /login, /callback, /logged-out, /access-denied
// Don't add another BrowserRouter here - causes double routing and React crashes

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
