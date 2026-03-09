import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { BugReportButton } from "@/components/BugReportButton";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Children from "./pages/Children";
import Servants from "./pages/Servants";
import ServantAttendance from "./pages/ServantAttendance";
import Attendance from "./pages/Attendance";
import Reports from "./pages/Reports";
import AbsentChildren from "./pages/AbsentChildren";
import PresentChildren from "./pages/PresentChildren";
import ChildReport from "./pages/ChildReport";
import ManageRoles from "./pages/ManageRoles";
import QRCodes from "./pages/QRCodes";
import QRScanner from "./pages/QRScanner";
import BulkQRCheckin from "./pages/BulkQRCheckin";
import TayoPoints from "./pages/TayoPoints";
import BugReportsAdmin from "./pages/BugReportsAdmin";
import ChildDashboard from "./pages/ChildDashboard";
import AuditLog from "./pages/AuditLog";
import ParentPortal from "./pages/ParentPortal";
import Messages from "./pages/Messages";
import AbsenceExcuses from "./pages/AbsenceExcuses";
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
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/children" element={<ProtectedRoute><Children /></ProtectedRoute>} />
          <Route path="/servants" element={<ProtectedRoute allowedRoles={["admin", "servant"]}><Servants /></ProtectedRoute>} />
          <Route path="/servant-attendance" element={<ProtectedRoute allowedRoles={["admin"]}><ServantAttendance /></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/absent-children" element={<ProtectedRoute allowedRoles={["admin", "servant"]}><AbsentChildren /></ProtectedRoute>} />
          <Route path="/present-children" element={<ProtectedRoute allowedRoles={["admin", "servant"]}><PresentChildren /></ProtectedRoute>} />
          <Route path="/child-report/:childId" element={<ProtectedRoute><ChildReport /></ProtectedRoute>} />
          <Route path="/manage-roles" element={<ProtectedRoute allowedRoles={["admin"]}><ManageRoles /></ProtectedRoute>} />
          <Route path="/qr-codes" element={<ProtectedRoute><QRCodes /></ProtectedRoute>} />
          <Route path="/qr-scanner" element={<ProtectedRoute allowedRoles={["admin", "servant"]}><QRScanner /></ProtectedRoute>} />
          <Route path="/bulk-qr-checkin" element={<ProtectedRoute allowedRoles={["admin", "servant"]}><BulkQRCheckin /></ProtectedRoute>} />
          <Route path="/tayo-points" element={<ProtectedRoute><TayoPoints /></ProtectedRoute>} />
          <Route path="/bug-reports" element={<ProtectedRoute allowedRoles={["admin"]}><BugReportsAdmin /></ProtectedRoute>} />
          <Route path="/child-dashboard" element={<ProtectedRoute><ChildDashboard /></ProtectedRoute>} />
          <Route path="/audit-log" element={<ProtectedRoute allowedRoles={["admin"]}><AuditLog /></ProtectedRoute>} />
          <Route path="/parent-portal" element={<ProtectedRoute allowedRoles={["parent"]}><ParentPortal /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute allowedRoles={["admin", "servant"]}><Messages /></ProtectedRoute>} />
          <Route path="/absence-excuses" element={<ProtectedRoute allowedRoles={["admin", "servant"]}><AbsenceExcuses /></ProtectedRoute>} />
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
