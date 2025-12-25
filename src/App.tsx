import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { OfflineSyncProvider } from "@/contexts/OfflineSyncContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ThemeProvider } from "@/components/ThemeProvider";

import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Files from "./pages/Files";
import Shared from "./pages/Shared";
import SharedLink from "./pages/SharedLink";
import Recent from "./pages/Recent";
import Favorites from "./pages/Favorites";
import RecycleBin from "./pages/RecycleBin";
import SearchResults from "./pages/SearchResults";
import Users from "./pages/admin/Users";
import Storage from "./pages/admin/Storage";
import Settings from "./pages/admin/Settings";
import AuditLogs from "./pages/admin/AuditLogs";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <OfflineSyncProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/files"
                element={
                  <ProtectedRoute>
                    <Files />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/shared"
                element={
                  <ProtectedRoute>
                    <Shared />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/shared/:shareToken"
                element={<SharedLink />}
              />
              <Route
                path="/recent"
                element={
                  <ProtectedRoute>
                    <Recent />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/favorites"
                element={
                  <ProtectedRoute>
                    <Favorites />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/trash"
                element={
                  <ProtectedRoute>
                    <RecycleBin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/search"
                element={
                  <ProtectedRoute>
                    <SearchResults />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute minRole="admin">
                    <Users />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/storage"
                element={
                  <ProtectedRoute minRole="admin">
                    <Storage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute minRole="admin">
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/audit"
                element={
                  <ProtectedRoute minRole="admin">
                    <AuditLogs />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
          </Routes>
          </OfflineSyncProvider>
        </AuthProvider>
      </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

