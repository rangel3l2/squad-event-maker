import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ServerAuthGuard from "@/components/ServerAuthGuard";
import ServerAuthorization from "./pages/ServerAuthorization";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CompleteProfile from "./pages/CompleteProfile";
import Events from "./pages/Events";
import Admin from "./pages/Admin";
import LogoEditor from "./pages/LogoEditor";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ServerAuthGuard>
            <Routes>
              <Route path="/server-auth" element={<ServerAuthorization />} />
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/complete-profile" element={<CompleteProfile />} />
              <Route path="/events" element={<Events />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/team-details" element={<TeamDetails />} />
              <Route path="/team-details/:teamId" element={<TeamDetails />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/carousel" element={<AdminCarousel />} />
              <Route path="/admin/invites" element={<AdminInvites />} />
              <Route path="/admin/config" element={<AdminEventConfig />} />
              <Route path="/admin/rules" element={<AdminRules />} />
              <Route path="/admin/prizes" element={<AdminPrizes />} />
              <Route path="/event/:eventId" element={<EventTeams />} />
              <Route path="/logo-editor/:teamId" element={<LogoEditor />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ServerAuthGuard>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
