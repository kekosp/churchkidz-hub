import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { BugReportButton } from "@/components/BugReportButton";
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
import BulkQRCheckin from "./pages/BulkQRCheckin";
import TayoPoints from "./pages/TayoPoints";
import BugReportsAdmin from "./pages/BugReportsAdmin";
import ChildDashboard from "./pages/ChildDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
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
          <Route path="/bulk-qr-checkin" element={<BulkQRCheckin />} />
          <Route path="/tayo-points" element={<TayoPoints />} />
          <Route path="/bug-reports" element={<BugReportsAdmin />} />
          <Route path="/child-dashboard" element={<ChildDashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <BugReportButton />
      </BrowserRouter>
    </TooltipProvider>
    </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
