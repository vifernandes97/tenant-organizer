import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Setup from "./pages/Setup";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Schedule from "./pages/Schedule";
import Settings from "./pages/Settings";
import AcceptInvite from "./pages/AcceptInvite";
import Brainstorm from "./pages/Brainstorm";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Register />} />
            <Route path="/setup" element={<Setup />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/clientes"
              element={
                <ProtectedRoute requirePermission={{ feature: 'clients', action: 'view' }}>
                  <AppLayout>
                    <Clients />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/cronogramas"
              element={
                <ProtectedRoute requirePermission={{ feature: 'posts', action: 'view' }}>
                  <AppLayout>
                    <Schedule />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/configuracoes"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Settings />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/brainstorm"
              element={
                <ProtectedRoute requirePermission={{ feature: 'brainstorm', action: 'view' }}>
                  <AppLayout>
                    <Brainstorm />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/convite/:token" element={<AcceptInvite />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
