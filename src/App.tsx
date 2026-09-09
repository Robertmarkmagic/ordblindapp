import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LanguageProvider } from "@/lib/i18n";
import { RileyAssistant } from "@/components/RileyAssistant";
import Index from "@/pages/Index";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/NotFound";
import "@/App.css";

const LoginPage = lazy(() => import("@/routes/login"));
const CallbackPage = lazy(() => import("@/routes/callback"));
const LoggedOutPage = lazy(() => import("@/routes/logged-out"));
const SettingsPage = lazy(() => import("@/routes/settings"));
const NewSession = lazy(() => import("@/pages/NewSession"));
const WritingStudio = lazy(() => import("@/pages/WritingStudio"));
const Reader = lazy(() => import("@/pages/Reader"));
const PublicRead = lazy(() => import("@/pages/PublicRead"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Terms = lazy(() => import("@/pages/Terms"));
const TrialSignup = lazy(() => import("@/pages/TrialSignup"));
const Notes = lazy(() => import("@/pages/Notes"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function LoadingScreen({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
        <p className="mt-4 text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function Protected({ children, text }: { children: React.ReactNode; text?: string }) {
  return (
    <ProtectedRoute>
      <Suspense fallback={<LoadingScreen text={text} />}>{children}</Suspense>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Suspense fallback={<LoadingScreen />}><LoginPage /></Suspense>} />
              <Route path="/callback" element={<Suspense fallback={<LoadingScreen />}><CallbackPage /></Suspense>} />
              <Route path="/logged-out" element={<Suspense fallback={<LoadingScreen />}><LoggedOutPage /></Suspense>} />
              <Route path="/trial" element={<Suspense fallback={<LoadingScreen text="Opening free trial signup..." />}><TrialSignup /></Suspense>} />
              <Route path="/pricing" element={<Suspense fallback={<LoadingScreen />}><Pricing /></Suspense>} />
              <Route path="/privacy" element={<Suspense fallback={<LoadingScreen />}><Privacy /></Suspense>} />
              <Route path="/terms" element={<Suspense fallback={<LoadingScreen />}><Terms /></Suspense>} />
              <Route path="/r/:slug" element={<Suspense fallback={<LoadingScreen text="Opening the reading..." />}><PublicRead /></Suspense>} />

              <Route path="/dashboard" element={<Protected text="Opening your reading space..."><Dashboard /></Protected>} />
              <Route path="/new" element={<Protected text="Opening your workspace..."><NewSession /></Protected>} />
              <Route path="/write" element={<Protected text="Opening your writing studio..."><WritingStudio /></Protected>} />
              <Route path="/notes" element={<Protected text="Opening your notes..."><Notes /></Protected>} />
              <Route path="/read/:id" element={<Protected text="Opening your reading..."><Reader /></Protected>} />
              <Route path="/settings" element={<Protected text="Loading settings..."><SettingsPage /></Protected>} />
              <Route path="/profile" element={<Protected text="Loading your profile..."><SettingsPage /></Protected>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
            <RileyAssistant />
            <Toaster />
            <Sonner />
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </LanguageProvider>
  );
}
