import { Route, Routes, Navigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import LandingPage from "../pages/LandingPage";

import NGOLogin from "../pages/NGOLogin";
import VolunteerLogin from "../pages/VolunteerLogin";
import FieldLogin from "../pages/FieldLogin";
import NGORegister from "../pages/NGORegister";
import VolunteerRegister from "../pages/VolunteerRegister";
import FieldWorkerRegister from "../pages/FieldWorkerRegister";
import DashboardOverview from "../pages/DashboardOverview";
import TriageDashboard from "../pages/TriageDashboard";
import MissionPlanning from "../pages/MissionPlanning";
import VolunteerManagement from "../pages/VolunteerManagement";
import VolunteerDashboard from "../pages/VolunteerDashboard";
import SurveyUpload from "../pages/SurveyUpload";
import AdminLogin from "../pages/AdminLogin";
import AdminConsole from "../pages/AdminConsole";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />

      <Route path="/ngo/login" element={<NGOLogin />} />
      <Route path="/volunteer/login" element={<VolunteerLogin />} />
      <Route path="/field/login" element={<FieldLogin />} />
      <Route path="/ngo/register" element={<NGORegister />} />
      <Route path="/volunteer/register" element={<VolunteerRegister />} />
      <Route path="/field/register" element={<FieldWorkerRegister />} />
      <Route path="/admin/login" element={<AdminLogin />} />
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
