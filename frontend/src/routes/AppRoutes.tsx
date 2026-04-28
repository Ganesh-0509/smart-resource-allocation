import { Route, Routes, Navigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import LandingPage from "../pages/LandingPage";

import UnifiedLogin from "../pages/UnifiedLogin";
import NGORegister from "../pages/NGORegister";
import VolunteerRegister from "../pages/VolunteerRegister";
import FieldWorkerRegister from "../pages/FieldWorkerRegister";
import DashboardOverview from "../pages/DashboardOverview";
import TriageDashboard from "../pages/TriageDashboard";
import MissionPlanning from "../pages/MissionPlanning";
import VolunteerManagement from "../pages/VolunteerManagement";
import VolunteerDashboard from "../pages/VolunteerDashboard";
import SurveyUpload from "../pages/SurveyUpload";
import AdminRegister from "../pages/AdminRegister";
import AdminConsole from "../pages/AdminConsole";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />

      {/* Unified Login & Signup */}
      <Route path="/login" element={<UnifiedLogin />} />
      <Route path="/admin/register" element={<AdminRegister />} />
      
      {/* Legacy/Specific Login Redirects */}
      <Route path="/ngo/login" element={<Navigate to="/login" replace />} />
      <Route path="/volunteer/login" element={<Navigate to="/login" replace />} />
      <Route path="/field/login" element={<Navigate to="/login" replace />} />
      <Route path="/admin/login" element={<Navigate to="/login" replace />} />
      
      <Route path="/ngo/register" element={<NGORegister />} />
      <Route path="/volunteer/register" element={<VolunteerRegister />} />
      <Route path="/field/register" element={<FieldWorkerRegister />} />
      <Route path="/admin/console" element={<AdminConsole />} />

      {/* Main App Routes with Sidebar */}
      <Route element={<MainLayout />}>
        {/* NGO Workflow: Overview -> Triage -> Tasks -> Volunteers */}
        <Route path="/ngo/dashboard" element={<DashboardOverview />} />
        <Route path="/ngo/triage" element={<TriageDashboard />} />
        <Route path="/ngo/tasks" element={<MissionPlanning />} />
        <Route path="/ngo/volunteers" element={<VolunteerManagement />} />
        
        {/* Volunteer Hub */}
        <Route path="/volunteer/dashboard" element={<VolunteerDashboard />} />
        
        {/* Field Intake */}
        <Route path="/field/report" element={<SurveyUpload />} />
      </Route>

      {/* Fallbacks */}
      <Route path="/ngo" element={<Navigate to="/ngo/dashboard" replace />} />
      <Route path="/volunteer" element={<Navigate to="/volunteer/dashboard" replace />} />
      <Route path="/field" element={<Navigate to="/field/report" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
