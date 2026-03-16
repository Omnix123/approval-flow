/**
 * App.tsx — Application Root Component
 * 
 * PURPOSE: This is the top-level component that wires everything together.
 * It sets up all the "providers" (shared services) and defines the URL routing.
 * 
 * PROVIDER HIERARCHY (outermost → innermost):
 * 1. QueryClientProvider — Enables React Query for data fetching/caching
 * 2. TooltipProvider — Enables tooltip components throughout the app
 * 3. Toaster/Sonner — Toast notification systems (success/error messages)
 * 4. BrowserRouter — Enables client-side URL routing (no page reloads)
 * 5. AuthProvider — Makes user authentication state available everywhere
 * 
 * ROUTING:
 * - Public routes: /login, /sign-mobile/:token
 * - Protected routes: Everything else (requires authentication)
 * - ProtectedRoute wrapper: Checks auth → shows loading spinner → redirects to /login if not authenticated
 * 
 * WHY THIS STRUCTURE:
 * React uses a "composition" pattern where providers wrap children to share state.
 * AuthProvider must be INSIDE BrowserRouter (it uses navigation hooks).
 * QueryClientProvider must be OUTSIDE everything (data hooks are used everywhere).
 */

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import RequestList from "./pages/RequestList";
import RequestDetail from "./pages/RequestDetail";
import CreateRequest from "./pages/CreateRequest";
import Approvals from "./pages/Approvals";
import AdminDashboard from "./pages/AdminDashboard";
import SignMobile from "./pages/SignMobile";
import NotFound from "./pages/NotFound";

/**
 * React Query client instance.
 * Manages all data fetching, caching, and background refetching.
 * Created once at module level so it persists across re-renders.
 */
const queryClient = new QueryClient();

/**
 * ProtectedRoute — Authentication Guard
 * 
 * Wraps any route that requires the user to be logged in.
 * - Shows a loading spinner while checking authentication status
 * - Redirects to /login if user is not authenticated
 * - Wraps children in AppLayout (header + navigation) if authenticated
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  // Still checking if user has an existing session
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Not logged in → redirect to login page
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Authenticated → render page inside the main layout (header + nav)
  return <AppLayout>{children}</AppLayout>;
}

/**
 * AppRoutes — URL → Component Mapping
 * 
 * Defines which page component renders for each URL path.
 * - /login redirects to / if already authenticated (prevents seeing login while logged in)
 * - /sign-mobile/:token is NOT protected (phone may not be logged in — by design)
 * - All other routes are wrapped in ProtectedRoute
 */
function AppRoutes() {
  const { isAuthenticated } = useAuth();
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/sign-mobile/:token" element={<SignMobile />} />

      {/* Protected routes — require authentication */}
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/requests" element={<ProtectedRoute><RequestList /></ProtectedRoute>} />
      <Route path="/requests/:id" element={<ProtectedRoute><RequestDetail /></ProtectedRoute>} />
      <Route path="/create" element={<ProtectedRoute><CreateRequest /></ProtectedRoute>} />
      <Route path="/approvals" element={<ProtectedRoute><Approvals /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />

      {/* 404 — catch-all for unknown URLs */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

/**
 * App — The root component rendered by main.tsx
 * 
 * Sets up the provider hierarchy and renders the router.
 * This is the entry point of the entire React component tree.
 */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      {/* Two toast systems: Toaster for custom toasts, Sonner for simple notifications */}
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
