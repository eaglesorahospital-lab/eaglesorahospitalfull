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
  { label: 'Content', path: '/admin/content' },
  { label: 'Notifications', path: '/admin/notifications' },
  { label: 'Administrators', path: '/admin/administrators' },
  { label: 'Audit Log', path: '/admin/audit' },
];

export const HOSPITAL_METADATA = {
  name: 'EgleSora Hospital',
  legalName: 'EgleSora Memorial Hospital & Research Institute',
  tagline: 'Excellence in Clinical Care & Patient Safety',
  emergencyPhone: '+91 (0) 22 0000 1111',
  emergencyDeskNote: 'Sample Emergency Desk',
  generalPhone: '+91 (0) 22 0000 2222',
  email: 'desk@eglesorahospital.org',
  visitingHours: 'Monday - Saturday: 08:00 AM - 08:00 PM',
  address: '12 Medical District Avenue, City Center',
};
