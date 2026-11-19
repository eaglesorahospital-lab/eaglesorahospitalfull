/**
 * Hospital Platform — Navigation Data (Phase 1)
 * Clean, structured navigation definitions for public and admin navigation.
 */

export const PUBLIC_NAV_LINKS = [
  { label: 'Home', path: '/' },
  { label: 'About', path: '/about' },
  { label: 'Departments', path: '/departments' },
  { label: 'Doctors', path: '/doctors' },
  { label: 'Appointments', path: '/appointments/book' },
  { label: 'Patient Portal', path: '/my-appointments' },
  { label: 'Contact', path: '/contact' },
];

export const ADMIN_NAV_LINKS = [
  { label: 'Overview', path: '/admin' },
  { label: 'Doctors', path: '/admin/doctors' },
  { label: 'Departments', path: '/admin/departments' },
  { label: 'Schedules', path: '/admin/schedules' },
  { label: 'Appointments', path: '/admin/appointments' },
  { label: 'Patients', path: '/admin/patients' },
  { label: 'Feedback', path: '/admin/feedback' },
  { label: 'Content', path: '/admin/content' },
  { label: 'Notifications', path: '/admin/notifications' },
  { label: 'Administrators', path: '/admin/administrators' },
  { label: 'Audit Log', path: '/admin/audit' },
];

export const HOSPITAL_METADATA = {
  name: 'EgleSora Hospital',
  legalName: 'EgleSora Memorial Hospital & Research Institute',
  tagline: 'Multi-Specialty Care & Patient Services',
  emergencyPhone: '+91 7232 245108',
  emergencyDeskNote: '24/7 Acute Trauma & Emergency Helpline',
  generalPhone: '+91 7232 245100',
  email: 'eaglesora.hospital@gmail.com',
  visitingHours: 'Monday - Saturday: 08:30 AM - 07:30 PM',
  address: 'Civil Lines Road, Near GMC Campus, Yavatmal, Maharashtra 445001',
};
