import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CompleteProfile from "./pages/CompleteProfile";
import Events from "./pages/Events";
import Admin from "./pages/Admin";
import AdminCarousel from "./pages/AdminCarousel";
import AdminInvites from "./pages/AdminInvites";
import AdminEventConfig from "./pages/AdminEventConfig";
import AdminRules from "./pages/AdminRules";
import AdminPrizes from "./pages/AdminPrizes";
import Teams from "./pages/Teams";
import TeamDetails from "./pages/TeamDetails";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import EventTeams from "./pages/EventTeams";
import OAuthConsent from "./pages/OAuthConsent";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { JoinRequestsModal } from "@/components/teams/JoinRequestsModal";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/complete-profile" element={<CompleteProfile />} />
            <Route path="/events" element={<Events />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/team-details" element={<TeamDetails />} />
            <Route path="/team-details/:teamId" element={<TeamDetails />} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
            <Route path="/admin/carousel" element={<ProtectedRoute requireAdmin><AdminCarousel /></ProtectedRoute>} />
            <Route path="/admin/invites" element={<ProtectedRoute requireAdmin><AdminInvites /></ProtectedRoute>} />
            <Route path="/admin/config" element={<ProtectedRoute requireAdmin><AdminEventConfig /></ProtectedRoute>} />
            <Route path="/admin/rules" element={<ProtectedRoute requireAdmin><AdminRules /></ProtectedRoute>} />
            <Route path="/admin/prizes" element={<ProtectedRoute requireAdmin><AdminPrizes /></ProtectedRoute>} />

            <Route path="/event/:eventId" element={<EventTeams />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
