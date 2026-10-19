import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Layouts
import PublicLayout from '../layouts/PublicLayout';
import AdminLayout from '../layouts/AdminLayout';
import DoctorLayout from '../layouts/DoctorLayout';

// Route Guards
import ProtectedRoute from './ProtectedRoute';

// Public Pages
import HomePage from '../pages/public/HomePage';
import AboutPage from '../pages/public/AboutPage';
import ContactPage from '../pages/public/ContactPage';
import DepartmentsPage from '../pages/public/DepartmentsPage';
import DepartmentDetailPage from '../pages/public/DepartmentDetailPage';
import NotFoundPage from '../pages/public/NotFoundPage';
import PrivacyPolicyPage from '../pages/public/PrivacyPolicyPage';
import TermsConditionsPage from '../pages/public/TermsConditionsPage';

// Doctor Pages
import DoctorsPage from '../pages/doctors/DoctorsPage';
import DoctorDetailPage from '../pages/doctors/DoctorDetailPage';
import DoctorAvailabilityPage from '../pages/doctors/DoctorAvailabilityPage';

// Appointment Pages
import BookAppointmentPage from '../pages/appointments/BookAppointmentPage';
import AppointmentResultPage from '../pages/appointments/AppointmentResultPage';

// Patient Portal Pages
import MyAppointmentsPage from '../pages/patient/MyAppointmentsPage';
import AppointmentDetailPage from '../pages/patient/AppointmentDetailPage';
import PatientProfilePage from '../pages/patient/PatientProfilePage';
import PatientLoginPage from '../pages/patient/PatientLoginPage';

// Staff & Administration Authentication
import StaffLoginPage from '../pages/staff/StaffLoginPage';
import StaffSetPasswordPage from '../pages/staff/StaffSetPasswordPage';

// Admin Pages
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import AdminDoctorsPage from '../pages/admin/AdminDoctorsPage';
import AdminDepartmentsPage from '../pages/admin/AdminDepartmentsPage';
import AdminSchedulesPage from '../pages/admin/AdminSchedulesPage';
import AdminAppointmentsPage from '../pages/admin/AdminAppointmentsPage';
import AdminPatientsPage from '../pages/admin/AdminPatientsPage';
import AdminContentPage from '../pages/admin/AdminContentPage';
import AdminNotificationsPage from '../pages/admin/AdminNotificationsPage';
import AdminAdministratorsPage from '../pages/admin/AdminAdministratorsPage';
import AdminAuditPage from '../pages/admin/AdminAuditPage';

// Doctor Portal Pages
import DoctorDashboardPage from '../pages/doctor/DoctorDashboardPage';
import DoctorSchedulePage from '../pages/doctor/DoctorSchedulePage';
import DoctorAppointmentsPage from '../pages/doctor/DoctorAppointmentsPage';
import DoctorPatientsPage from '../pages/doctor/DoctorPatientsPage';
import DoctorProfilePage from '../pages/doctor/DoctorProfilePage';
import DoctorHistoryPage from '../pages/doctor/DoctorHistoryPage';
import DoctorNotificationsPage from '../pages/doctor/DoctorNotificationsPage';

/**
 * Hospital Platform — Application Route Tree
 * - Public & patient-facing healthcare routes (English, Hindi, Marathi)
 * - Dedicated staff portal route (/staff/login) unlinked from public navigation
 * - Dedicated doctor portal routes (/doctor/*)
 * - Role-protected administration routes with SimpleJWT session guards
 */
export function AppRoutes() {
  return (
    <Routes>
      {/* Public & Patient-facing Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/departments" element={<DepartmentsPage />} />
        <Route path="/departments/:slug" element={<DepartmentDetailPage />} />
        <Route path="/doctors" element={<DoctorsPage />} />
        <Route path="/doctors/:slug" element={<DoctorDetailPage />} />
        <Route path="/doctors/:slug/availability" element={<DoctorAvailabilityPage />} />
        <Route path="/appointments/book" element={<BookAppointmentPage />} />
        <Route path="/appointments/result" element={<AppointmentResultPage />} />

        {/* Role-Protected Patient Outpatient Routes */}
        <Route element={<ProtectedRoute allowedRoles={['PATIENT']} />}>
          <Route path="/my-appointments" element={<MyAppointmentsPage />} />
          <Route path="/my-appointments/:reference" element={<AppointmentDetailPage />} />
          <Route path="/profile" element={<PatientProfilePage />} />
        </Route>

        <Route path="/patient/login" element={<PatientLoginPage />} />
        <Route path="/login" element={<PatientLoginPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsConditionsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Dedicated Unlinked Staff & Doctor Portal Gateway */}
      <Route path="/staff/login" element={<StaffLoginPage />} />
      <Route path="/staff/set-password" element={<StaffSetPasswordPage />} />
      <Route path="/doctor/set-password" element={<StaffSetPasswordPage />} />

      {/* Role-Protected Dedicated Doctor Portal */}
      <Route element={<ProtectedRoute allowedRoles={['DOCTOR_STAFF', 'SUPER_ADMIN', 'HOSPITAL_ADMIN']} />}>
        <Route path="/doctor" element={<DoctorLayout />}>
          <Route index element={<DoctorDashboardPage />} />
          <Route path="appointments" element={<DoctorAppointmentsPage />} />
          <Route path="history" element={<DoctorHistoryPage />} />
          <Route path="patients" element={<DoctorPatientsPage />} />
          <Route path="schedule" element={<DoctorSchedulePage />} />
          <Route path="notifications" element={<DoctorNotificationsPage />} />
          <Route path="profile" element={<DoctorProfilePage />} />
        </Route>
      </Route>

      {/* Role-Protected Hospital Staff & Administration Workspace (Admin Only) */}
      <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'HOSPITAL_ADMIN']} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="doctors" element={<AdminDoctorsPage />} />
          <Route path="departments" element={<AdminDepartmentsPage />} />
          <Route path="schedules" element={<AdminSchedulesPage />} />
          <Route path="appointments" element={<AdminAppointmentsPage />} />
          <Route path="patients" element={<AdminPatientsPage />} />
          <Route path="content" element={<AdminContentPage />} />
          <Route path="notifications" element={<AdminNotificationsPage />} />
          <Route path="administrators" element={<AdminAdministratorsPage />} />
          <Route path="audit" element={<AdminAuditPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default AppRoutes;
