/**
 * Hospital Platform — Centralized Scheduling Data (Phase 5)
 * Centralized, structured mock scheduling data for all attending doctors.
 * Strictly decoupled from database persistence; serves as the single source
 * of truth for both Admin Schedule Management and Patient Availability views.
 */

export const DEMO_SCHEDULING = [
  {
    doctorId: '101', // Dr. Rajesh K. Varma (Cardiology)
    timezone: 'Asia/Kolkata',
    slotDuration: 30, // in minutes
    capacity: 1, // patients per slot
    weeklySchedule: {
      Monday: {
        enabled: true,
        start: '09:00 AM',
        end: '01:00 PM',
        breaks: [
          {
            start: '11:00 AM',
            end: '11:30 AM',
            label: 'Clinical Documentation & Case Review',
          },
        ],
      },
      Tuesday: {
        enabled: false,
        start: null,
        end: null,
        breaks: [],
      },
      Wednesday: {
        enabled: true,
        start: '09:00 AM',
        end: '01:00 PM',
        breaks: [
          {
            start: '11:00 AM',
            end: '11:30 AM',
            label: 'Clinical Documentation & Case Review',
          },
        ],
      },
      Thursday: {
        enabled: false,
        start: null,
        end: null,
        breaks: [],
      },
      Friday: {
        enabled: true,
        start: '09:00 AM',
        end: '01:00 PM',
        breaks: [
          {
            start: '11:00 AM',
            end: '11:30 AM',
            label: 'Clinical Documentation & Case Review',
          },
        ],
      },
      Saturday: {
        enabled: false,
        start: null,
        end: null,
        breaks: [],
      },
      Sunday: {
        enabled: false,
        start: null,
        end: null,
        breaks: [],
      },
    },
    leaves: [
      {
        date: '2026-11-15',
        reason: 'National Cardiology Conference',
        status: 'Approved Leave',
      },
      {
        date: '2026-12-25',
        reason: 'Hospital Public Holiday',
        status: 'Public Holiday',
      },
    ],
    overrides: [
      {
        date: '2026-11-20',
        enabled: true,
        start: '10:00 AM',
        end: '02:00 PM',
        reason: 'Special Preventive Cardiovascular Clinic',
        type: 'Special OPD',
      },
    ],
  },
  {
    doctorId: '102', // Dr. Ananya Sen (Neurology)
    timezone: 'Asia/Kolkata',
    slotDuration: 30,
    capacity: 1,
    weeklySchedule: {
      Monday: {
        enabled: false,
        start: null,
        end: null,
        breaks: [],
      },
      Tuesday: {
        enabled: true,
        start: '10:00 AM',
        end: '02:00 PM',
        breaks: [
          {
            start: '12:00 PM',
            end: '12:30 PM',
            label: 'Neuro-Rehab Consultation Intermission',
          },
        ],
      },
      Wednesday: {
        enabled: false,
        start: null,
        end: null,
        breaks: [],
      },
      Thursday: {
        enabled: true,
        start: '10:00 AM',
        end: '02:00 PM',
        breaks: [
          {
            start: '12:00 PM',
            end: '12:30 PM',
            label: 'Neuro-Rehab Consultation Intermission',
          },
        ],
      },
      Friday: {
        enabled: false,
        start: null,
        end: null,
        breaks: [],
      },
      Saturday: {
        enabled: true,
        start: '10:00 AM',
        end: '02:00 PM',
        breaks: [
          {
            start: '12:00 PM',
            end: '12:30 PM',
            label: 'Neuro-Rehab Consultation Intermission',
          },
        ],
      },
      Sunday: {
        enabled: false,
        start: null,
        end: null,
        breaks: [],
      },
    },
    leaves: [
      {
        date: '2026-10-28',
        reason: 'Institutional Clinical Audit',
        status: 'Administrative Leave',
      },
    ],
    overrides: [
      {
        date: '2026-11-12',
        enabled: true,
        start: '09:00 AM',
        end: '03:00 PM',
        reason: 'Extended Post-Stroke Evaluation Clinic',
        type: 'Extended Hours',
      },
    ],
  },
  {
    doctorId: '103', // Dr. Vikramaditya Joshi (Orthopaedics)
    timezone: 'Asia/Kolkata',
    slotDuration: 30,
    capacity: 1,
    weeklySchedule: {
      Monday: {
        enabled: true,
        start: '09:00 AM',
        end: '01:30 PM',
        breaks: [
          {
            start: '11:30 AM',
            end: '12:00 PM',
            label: 'Orthopaedic Plaster & Radiograph Review',
          },
        ],
      },
      Tuesday: {
        enabled: true,
        start: '09:00 AM',
        end: '01:30 PM',
        breaks: [
          {
            start: '11:30 AM',
            end: '12:00 PM',
            label: 'Orthopaedic Plaster & Radiograph Review',
          },
        ],
      },
      Wednesday: {
        enabled: true,
        start: '09:00 AM',
        end: '01:30 PM',
        breaks: [
          {
            start: '11:30 AM',
            end: '12:00 PM',
            label: 'Orthopaedic Plaster & Radiograph Review',
          },
        ],
      },
      Thursday: {
        enabled: true,
        start: '09:00 AM',
        end: '01:30 PM',
        breaks: [
          {
            start: '11:30 AM',
            end: '12:00 PM',
            label: 'Orthopaedic Plaster & Radiograph Review',
          },
        ],
      },
      Friday: {
        enabled: false,
        start: null,
        end: null,
        breaks: [],
      },
      Saturday: {
        enabled: false,
        start: null,
        end: null,
        breaks: [],
      },
      Sunday: {
        enabled: false,
        start: null,
        end: null,
        breaks: [],
      },
    },
    leaves: [
      {
        date: '2026-11-05',
        reason: 'Musculoskeletal Surgical Workshop',
        status: 'Professional Training',
      },
    ],
    overrides: [
      {
        date: '2026-11-14',
        enabled: true,
        start: '09:00 AM',
        end: '12:00 PM',
        reason: 'Emergency Fracture Triage Follow-up',
        type: 'Reduced Hours',
      },
    ],
  },
  {
    doctorId: '104', // Dr. Meenakshi Sundaram (General Internal Medicine)
    timezone: 'Asia/Kolkata',
    slotDuration: 20,
    capacity: 1,
    weeklySchedule: {
      Monday: {
        enabled: true,
        start: '08:30 AM',
        end: '01:00 PM',
        breaks: [
          {
            start: '10:30 AM',
            end: '11:00 AM',
            label: 'Mid-Morning Clinical Documentation',
          },
        ],
      },
      Tuesday: {
        enabled: true,
        start: '08:30 AM',
        end: '01:00 PM',
        breaks: [
          {
            start: '10:30 AM',
            end: '11:00 AM',
            label: 'Mid-Morning Clinical Documentation',
          },
        ],
      },
      Wednesday: {
        enabled: true,
        start: '08:30 AM',
        end: '01:00 PM',
        breaks: [
          {
            start: '10:30 AM',
            end: '11:00 AM',
            label: 'Mid-Morning Clinical Documentation',
          },
        ],
      },
      Thursday: {
        enabled: true,
        start: '08:30 AM',
        end: '01:00 PM',
        breaks: [
          {
            start: '10:30 AM',
            end: '11:00 AM',
            label: 'Mid-Morning Clinical Documentation',
          },
        ],
      },
      Friday: {
        enabled: true,
        start: '08:30 AM',
        end: '01:00 PM',
        breaks: [
          {
            start: '10:30 AM',
            end: '11:00 AM',
            label: 'Mid-Morning Clinical Documentation',
          },
        ],
      },
      Saturday: {
        enabled: true,
        start: '08:30 AM',
        end: '01:00 PM',
        breaks: [
          {
            start: '10:30 AM',
            end: '11:00 AM',
            label: 'Mid-Morning Clinical Documentation',
          },
        ],
      },
      Sunday: {
        enabled: false,
        start: null,
        end: null,
        breaks: [],
      },
    },
    leaves: [],
    overrides: [
      {
        date: '2026-11-18',
        enabled: true,
        start: '08:00 AM',
        end: '01:00 PM',
        reason: 'Executive Fasting Metabolic Health Clinic',
        type: 'Extended Hours',
      },
    ],
  },
  {
    doctorId: '105', // Dr. Preeti Deshmukh (Paediatrics)
    timezone: 'Asia/Kolkata',
    slotDuration: 30,
    capacity: 1,
    weeklySchedule: {
      Monday: {
        enabled: true,
        start: '10:00 AM',
        end: '02:30 PM',
        breaks: [
          {
            start: '12:30 PM',
            end: '01:00 PM',
            label: 'Immunization Record Verification',
          },
        ],
      },
      Tuesday: {
        enabled: true,
        start: '10:00 AM',
        end: '02:30 PM',
        breaks: [
          {
            start: '12:30 PM',
            end: '01:00 PM',
            label: 'Immunization Record Verification',
          },
        ],
      },
      Wednesday: {
        enabled: true,
        start: '10:00 AM',
        end: '02:30 PM',
        breaks: [
          {
            start: '12:30 PM',
            end: '01:00 PM',
            label: 'Immunization Record Verification',
          },
        ],
      },
      Thursday: {
        enabled: true,
        start: '10:00 AM',
        end: '02:30 PM',
        breaks: [
          {
            start: '12:30 PM',
            end: '01:00 PM',
            label: 'Immunization Record Verification',
          },
        ],
      },
      Friday: {
        enabled: true,
        start: '10:00 AM',
        end: '02:30 PM',
        breaks: [
          {
            start: '12:30 PM',
            end: '01:00 PM',
            label: 'Immunization Record Verification',
          },
        ],
      },
      Saturday: {
        enabled: false,
        start: null,
        end: null,
        breaks: [],
      },
      Sunday: {
        enabled: false,
        start: null,
        end: null,
        breaks: [],
      },
    },
    leaves: [
      {
        date: '2026-11-20',
        reason: 'Pediatric CME Seminar',
        status: 'Academic Leave',
      },
    ],
    overrides: [
      {
        date: '2026-11-07',
        enabled: true,
        start: '09:30 AM',
        end: '01:30 PM',
        reason: 'Special Weekend Well-Child Immunization Camp',
        type: 'Special OPD',
      },
    ],
  },
  {
    doctorId: '106', // Dr. Farhan Al-Mansoor (Dermatology)
    timezone: 'Asia/Kolkata',
    slotDuration: 20,
    capacity: 1,
    weeklySchedule: {
      Monday: {
        enabled: false,
        start: null,
        end: null,
        breaks: [],
      },
      Tuesday: {
        enabled: true,
        start: '11:00 AM',
        end: '03:00 PM',
        breaks: [
          {
            start: '01:00 PM',
            end: '01:30 PM',
            label: 'Dermoscopic Analysis & Biopsy Processing',
          },
        ],
      },
      Wednesday: {
        enabled: false,
        start: null,
        end: null,
        breaks: [],
      },
      Thursday: {
        enabled: true,
        start: '11:00 AM',
        end: '03:00 PM',
        breaks: [
          {
            start: '01:00 PM',
            end: '01:30 PM',
            label: 'Dermoscopic Analysis & Biopsy Processing',
          },
        ],
      },
      Friday: {
        enabled: false,
        start: null,
        end: null,
        breaks: [],
      },
      Saturday: {
        enabled: true,
        start: '11:00 AM',
        end: '03:00 PM',
        breaks: [
          {
            start: '01:00 PM',
            end: '01:30 PM',
            label: 'Dermoscopic Analysis & Biopsy Processing',
          },
        ],
      },
      Sunday: {
        enabled: false,
        start: null,
        end: null,
        breaks: [],
      },
    },
    leaves: [],
    overrides: [
      {
        date: '2026-11-25',
        enabled: true,
        start: '10:00 AM',
        end: '02:00 PM',
        reason: 'Comprehensive Patch Allergen Screening Clinic',
        type: 'Special OPD',
      },
    ],
  },
  {
    doctorId: '107', // Dr. Siddharth Narayan (Cardiology - Inactive)
    timezone: 'Asia/Kolkata',
    slotDuration: 30,
    capacity: 1,
    weeklySchedule: {
      Monday: { enabled: false, start: null, end: null, breaks: [] },
      Tuesday: { enabled: false, start: null, end: null, breaks: [] },
      Wednesday: { enabled: false, start: null, end: null, breaks: [] },
      Thursday: { enabled: false, start: null, end: null, breaks: [] },
      Friday: { enabled: false, start: null, end: null, breaks: [] },
      Saturday: { enabled: false, start: null, end: null, breaks: [] },
      Sunday: { enabled: false, start: null, end: null, breaks: [] },
    },
    leaves: [
      {
        date: '2026-10-01',
        reason: 'Academic Research Fellowship (Sabbatical)',
        status: 'Extended Sabbatical',
      },
    ],
    overrides: [],
  },
];

/**
 * Returns the scheduling configuration for a doctor by ID.
 */
export function getDoctorSchedule(doctorId) {
  if (!doctorId) return null;
  const match = DEMO_SCHEDULING.find((s) => s.doctorId === String(doctorId));
  if (match) return match;

  // Fallback default structure
  return {
    doctorId: String(doctorId),
    timezone: 'Asia/Kolkata',
    slotDuration: 30,
    capacity: 1,
    weeklySchedule: {
      Monday: { enabled: false, start: null, end: null, breaks: [] },
      Tuesday: { enabled: false, start: null, end: null, breaks: [] },
      Wednesday: { enabled: false, start: null, end: null, breaks: [] },
      Thursday: { enabled: false, start: null, end: null, breaks: [] },
      Friday: { enabled: false, start: null, end: null, breaks: [] },
      Saturday: { enabled: false, start: null, end: null, breaks: [] },
      Sunday: { enabled: false, start: null, end: null, breaks: [] },
    },
    leaves: [],
    overrides: [],
  };
}

/**
 * Helper to check if a specific date is marked as on-leave for a doctor.
 */
export function getDoctorLeaveForDate(doctorId, dateString) {
  const schedule = getDoctorSchedule(doctorId);
  if (!schedule || !schedule.leaves) return null;
  return schedule.leaves.find((l) => l.date === dateString) || null;
}

/**
 * Helper to check if a specific date has a schedule override.
 */
export function getDoctorOverrideForDate(doctorId, dateString) {
  const schedule = getDoctorSchedule(doctorId);
  if (!schedule || !schedule.overrides) return null;
  return schedule.overrides.find((o) => o.date === dateString) || null;
}

/**
 * Converts standard time string ("09:00 AM") to minutes from midnight.
 */
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [timePart, modifier] = timeStr.trim().split(' ');
  let [hours, minutes] = timePart.split(':').map(Number);
  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

/**
 * Converts minutes from midnight back to readable time string ("09:00 AM").
 */
function formatMinutesToTime(totalMinutes) {
  let hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const modifier = hours >= 12 ? 'PM' : 'AM';
  if (hours > 12) hours -= 12;
  if (hours === 0) hours = 12;
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
  const formattedHours = hours < 10 ? `0${hours}` : hours;
  return `${formattedHours}:${formattedMinutes} ${modifier}`;
}

/**
 * Generates frontend mock slots for a given doctor, date, and weekday name.
 * Takes into account working hours, slotDuration, daily breaks, leaves, and schedule overrides.
 */
export function generateMockSlotsForDate(doctorId, dateString, dayName) {
  const schedule = getDoctorSchedule(doctorId);
  if (!schedule) {
    return {
      status: 'Unavailable',
      slots: [],
      notice: 'Doctor schedule is not configured.',
      isOverride: false,
      overrideDetail: null,
    };
  }

  // 1. Check for planned leaves
  const leave = (schedule.leaves || []).find((l) => l.date === dateString);
  if (leave) {
    return {
      status: 'On Leave',
      slots: [],
      notice: `Physician is on scheduled leave: ${leave.reason} (${leave.status || 'On Leave'}).`,
      isOverride: false,
      overrideDetail: null,
    };
  }

  // 2. Check for schedule override
  const override = (schedule.overrides || []).find((o) => o.date === dateString);
  let isWorking = false;
  let startTime = null;
  let endTime = null;
  let breaks = [];
  let isOverride = false;
  let overrideDetail = null;

  if (override) {
    isOverride = true;
    overrideDetail = override;
    if (override.enabled && override.start && override.end) {
      isWorking = true;
      startTime = override.start;
      endTime = override.end;
      breaks = []; // Default overrides typically have continuous clinic
    } else {
      return {
        status: 'Unavailable',
        slots: [],
        notice: `Clinic suspended due to schedule override: ${override.reason}.`,
        isOverride: true,
        overrideDetail: override,
      };
    }
  } else {
    // 3. Fallback to weekly schedule
    const dayConfig = schedule.weeklySchedule?.[dayName];
    if (dayConfig && dayConfig.enabled && dayConfig.start && dayConfig.end) {
      isWorking = true;
      startTime = dayConfig.start;
      endTime = dayConfig.end;
      breaks = dayConfig.breaks || [];
    }
  }

  if (!isWorking) {
    return {
      status: 'Unavailable',
      slots: [],
      notice: `Doctor does not hold regular outpatient OPD sessions on ${dayName}s.`,
      isOverride: false,
      overrideDetail: null,
    };
  }

  // 4. Generate slots in increments of slotDuration
  const duration = schedule.slotDuration || 30;
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  const slots = [];

  // Parse breaks to minutes ranges
  const breakRanges = breaks.map((b) => ({
    start: parseTimeToMinutes(b.start),
    end: parseTimeToMinutes(b.end),
    label: b.label || 'Midday Clinical Break',
  }));

  for (let current = startMinutes; current + duration <= endMinutes; current += duration) {
    const timeStr = formatMinutesToTime(current);

    // Check if slot falls in break
    const activeBreak = breakRanges.find(
      (br) => current >= br.start && current < br.end
    );

    if (activeBreak) {
      slots.push({
        time: timeStr,
        status: 'Break',
        label: activeBreak.label,
      });
    } else {
      // Deterministic simulation: mock some slots as booked for prototype richness
      // (e.g. slots ending in :00 every 2 hours are simulated as booked)
      const isSimulatedBooked = current % 120 === 60;
      slots.push({
        time: timeStr,
        status: isSimulatedBooked ? 'Unavailable' : 'Available',
        label: isSimulatedBooked ? 'Slot Booked' : 'Open for Consultation',
      });
    }
  }

  return {
    status: isOverride ? `Active (${override.type})` : 'Available',
    slots,
    notice: isOverride
      ? `Schedule override in effect: ${override.reason} (${override.type}). Hours: ${startTime} - ${endTime}.`
      : null,
    isOverride,
    overrideDetail,
    workingHours: `${startTime} - ${endTime}`,
    slotDuration: duration,
    capacity: schedule.capacity || 1,
  };
}
