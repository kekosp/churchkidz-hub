import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Children from "./pages/Children";
import Servants from "./pages/Servants";
import ServantAttendance from "./pages/ServantAttendance";
import Attendance from "./pages/Attendance";
import Reports from "./pages/Reports";
import AbsentChildren from "./pages/AbsentChildren";
import ChildReport from "./pages/ChildReport";
import ManageRoles from "./pages/ManageRoles";
import QRCodes from "./pages/QRCodes";
import QRScanner from "./pages/QRScanner";
import TayoPoints from "./pages/TayoPoints";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/children" element={<Children />} />
          <Route path="/servants" element={<Servants />} />
          <Route path="/servant-attendance" element={<ServantAttendance />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/absent-children" element={<AbsentChildren />} />
          <Route path="/child-report/:childId" element={<ChildReport />} />
          <Route path="/manage-roles" element={<ManageRoles />} />
          <Route path="/qr-codes" element={<QRCodes />} />
          <Route path="/qr-scanner" element={<QRScanner />} />
          <Route path="/tayo-points" element={<TayoPoints />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
