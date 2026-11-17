/**
 * Hospital Platform — Hospital Presentation Data (Phase 3 Enriched)
 * Centralized, structured fictional demo data for public presentation and Department module.
 * Adheres strictly to the guidelines: no fake claims, no fake awards, no fake testimonials.
 */

export const DEMO_DEPARTMENTS = [
  {
    id: 'cardiovascular-sciences',
    slug: 'cardiovascular-sciences',
    dbId: 2,
    name: 'Department of Cardiovascular Sciences',
    specialty: 'Cardiology & Vascular Medicine',
    shortDescription: 'Comprehensive cardiovascular diagnostics, non-invasive imaging, heart failure management, and preventive vascular care.',
    fullDescription: 'The Department of Cardiovascular Sciences delivers adult clinical cardiology, diagnostic non-invasive cardiac evaluation, lipid management, and inpatient stabilization. Our physicians work alongside cardiac nurses and technicians to deliver patient-centered preventive and therapeutic plans for hypertension, arrhythmias, ischemic heart conditions, and chronic vascular disorders.',
    services: [
      '2D Transthoracic Echocardiography & Color Doppler',
      'Treadmill Stress Test (TMT) & Electrocardiography (12-Lead ECG)',
      '24-Hour Ambulatory Blood Pressure & Holter Arrhythmia Monitoring',
      'Heart Failure & Cardiomyopathy Management Clinic',
      'Preventive Cardiovascular Risk & Lipid Assessment',
    ],
    consultationTimings: [
      { day: 'Monday', timing: '09:00 AM - 01:00 PM', status: 'Active OPD' },
      { day: 'Tuesday', timing: '09:00 AM - 01:00 PM', status: 'Active OPD' },
      { day: 'Wednesday', timing: '09:00 AM - 01:00 PM', status: 'Active OPD' },
      { day: 'Thursday', timing: '09:00 AM - 01:00 PM', status: 'Active OPD' },
      { day: 'Friday', timing: '09:00 AM - 01:00 PM', status: 'Active OPD' },
      { day: 'Saturday', timing: '09:00 AM - 01:00 PM', status: 'Active OPD' },
      { day: 'Sunday', timing: 'Closed (Emergency Trauma Open 24/7)', status: 'Closed' },
    ],
    opdHours: 'Mon - Sat: 09:00 AM - 04:00 PM',
    location: 'Wing B, 1st Floor, OPD Suites 201-208',
    contact: {
      location: 'Wing B, 1st Floor, OPD Suites 201-208',
      phone: '+91 (0) 22 0000 2210',
      email: 'cardiology@eglesorahospital.org',
      extension: 'Ext. 201',
    },
    doctorIds: ['101', '103', '3', '4', 3, 4],
    faqs: [
      {
        id: 'cardio-faq-1',
        question: 'What medical records should I bring for a cardiology appointment?',
        answer: 'Please bring prior ECG tracings, recent lipid and blood test reports, medication prescriptions, and relevant hospital discharge summaries.',
      },
      {
        id: 'cardio-faq-2',
        question: 'Do I need special preparation before an Echocardiography scan?',
        answer: 'Standard transthoracic echocardiograms do not require fasting. Wear comfortable two-piece clothing for ease of chest sensor placement.',
      },
      {
        id: 'cardio-faq-3',
        question: 'How do I handle sudden chest tightness or acute distress?',
        answer: 'Acute chest pain requires immediate medical evaluation. Do not wait for OPD slots; proceed directly to the 24/7 Emergency & Triage Department.',
      },
    ],
  },
  {
    id: 'general-medicine-dept',
    slug: 'general-medicine-dept',
    dbId: 1,
    name: 'Department of General Medicine',
    specialty: 'General & Internal Medicine',
    shortDescription: 'Holistic adult healthcare, complex diagnostic evaluations, chronic disease management, and systemic illness care.',
    fullDescription: 'The Department of General Medicine is the foundational anchor for adult primary and multi-system care at EgleSora Hospital. Our internal medicine physicians evaluate undiagnosed illnesses, coordinate care for complex multimorbid patients, and manage chronic conditions such as diabetes mellitus, hypertension, thyroid abnormalities, and metabolic disorders.',
    services: [
      'Comprehensive Adult Health Checkup',
      'Diabetic & Hypertension Triage',
      'Fever of Unknown Origin & Systemic Infection Investigations',
      'Preventive Health Check-up Reviews & Executive Screenings',
      'Geriatric Health Maintenance & Medication Optimization',
    ],
    consultationTimings: [
      { day: 'Monday', timing: '08:30 AM - 01:00 PM', status: 'Active OPD' },
      { day: 'Tuesday', timing: '08:30 AM - 01:00 PM', status: 'Active OPD' },
      { day: 'Wednesday', timing: '08:30 AM - 01:00 PM', status: 'Active OPD' },
      { day: 'Thursday', timing: '08:30 AM - 01:00 PM', status: 'Active OPD' },
      { day: 'Friday', timing: '08:30 AM - 01:00 PM', status: 'Active OPD' },
      { day: 'Saturday', timing: '08:30 AM - 01:00 PM', status: 'Active OPD' },
      { day: 'Sunday', timing: 'Closed (Emergency Trauma Open 24/7)', status: 'Closed' },
    ],
    opdHours: 'Mon - Sat: 08:30 AM - 06:00 PM',
    location: 'Wing A, Ground Floor, OPD Suites 101-105',
    contact: {
      location: 'Wing A, Ground Floor, OPD Suites 101-105',
      phone: '+91 (0) 22 0000 2205',
      email: 'medicine@eglesorahospital.org',
      extension: 'Ext. 101',
    },
    doctorIds: ['104', '1', '2', 1, 2],
    faqs: [
      {
        id: 'med-faq-1',
        question: 'Is prior fasting required for a routine general consultation?',
        answer: 'Fasting blood glucose evaluations require an 8 to 10 hour overnight water-only fast. Routine consultations without labs do not require fasting.',
      },
      {
        id: 'med-faq-2',
        question: 'Can general medicine physicians refer patients to surgical departments?',
        answer: 'Yes. The internist conducts baseline assessments and coordinates expedited referrals to subspecialists when operative or advanced care is indicated.',
      },
    ],
  },
  {
    id: 'orthopaedics-dept',
    slug: 'orthopaedics-dept',
    dbId: 3,
    name: 'Department of Orthopaedics & Joint Care',
    specialty: 'Musculoskeletal Medicine & Joint Care',
    shortDescription: 'Trauma management, joint reconstruction, spine assessments, arthroscopy, and structured physical rehabilitation.',
    fullDescription: 'The Department of Orthopaedics & Joint Care delivers adult and geriatric musculoskeletal care, fracture management, spinal assessments, and joint preservation therapies. Working in concert with radiology and physical therapy units, our surgical and clinical team designs conservative as well as operative care protocols for degenerative joint disease and acute injuries.',
    services: [
      'Digital Musculoskeletal X-Ray Assessment',
      'Joint Injections & Plaster Care',
      'Degenerative Arthritis & Joint Preservation Management',
      'Acute Fracture Triage, Casting & Splint Application',
      'Spinal Posture, Disc Assessment & Low Back Care',
    ],
    consultationTimings: [
      { day: 'Monday', timing: '09:00 AM - 01:30 PM', status: 'Active OPD' },
      { day: 'Tuesday', timing: '09:00 AM - 01:30 PM', status: 'Active OPD' },
      { day: 'Wednesday', timing: '09:00 AM - 01:30 PM', status: 'Active OPD' },
      { day: 'Thursday', timing: '09:00 AM - 01:30 PM', status: 'Active OPD' },
      { day: 'Friday', timing: '09:00 AM - 01:30 PM', status: 'Active OPD' },
      { day: 'Saturday', timing: '09:00 AM - 01:00 PM', status: 'Active OPD' },
      { day: 'Sunday', timing: 'Closed (Emergency Trauma Open 24/7)', status: 'Closed' },
    ],
    opdHours: 'Mon - Sat: 09:00 AM - 02:00 PM',
    location: 'Wing C, 1st Floor, OPD Suites 301-306',
    contact: {
      location: 'Wing C, 1st Floor, OPD Suites 301-306',
      phone: '+91 (0) 22 0000 2214',
      email: 'orthopaedics@eglesorahospital.org',
      extension: 'Ext. 301',
    },
    doctorIds: ['103', '5', 5],
    faqs: [
      {
        id: 'ortho-faq-1',
        question: 'Are wheelchair facilities available at the OPD reception?',
        answer: 'Yes, wheelchair transport and assistance staff are stationed at all main campus entry portals and the central OPD reception.',
      },
      {
        id: 'ortho-faq-2',
        question: 'Are X-ray facilities available within the department area?',
        answer: 'Yes, digital X-ray suites are situated adjacent to the orthopaedic consultation rooms for rapid radiographic assessment during OPD visits.',
      },
    ],
  },
  {
    id: 'paediatrics-dept',
    slug: 'paediatrics-dept',
    dbId: 4,
    name: 'Department of Paediatrics & Child Health',
    specialty: 'Paediatrics & Neonatology',
    shortDescription: 'Well-child developmental screenings, childhood immunization programs, acute illness management, and adolescent healthcare.',
    fullDescription: 'The Department of Paediatrics & Child Health provides comprehensive medical care for infants, children, and young adolescents in a reassuring, child-sensitive clinical setting. Services span routine developmental milestones screening, national schedule vaccinations, pediatric nutrition counseling, and medical management of acute childhood conditions.',
    services: [
      'Child Immunisation Program',
      'Pediatric Growth & Developmental Screening',
      'Comprehensive Well-Child Pediatric Consultations',
      'Management of Acute Pediatric Infections & Childhood Fevers',
      'Childhood Asthma & Allergy Clinic',
    ],
    consultationTimings: [
      { day: 'Monday', timing: '10:00 AM - 02:30 PM', status: 'Active OPD' },
      { day: 'Tuesday', timing: '10:00 AM - 02:30 PM', status: 'Active OPD' },
      { day: 'Wednesday', timing: '10:00 AM - 02:30 PM', status: 'Active OPD' },
      { day: 'Thursday', timing: '10:00 AM - 02:30 PM', status: 'Active OPD' },
      { day: 'Friday', timing: '10:00 AM - 02:30 PM', status: 'Active OPD' },
      { day: 'Saturday', timing: '10:00 AM - 01:00 PM', status: 'Active OPD' },
      { day: 'Sunday', timing: 'Closed (Emergency Trauma Open 24/7)', status: 'Closed' },
    ],
    opdHours: 'Mon - Sat: 10:00 AM - 04:00 PM',
    location: 'Wing A, 2nd Floor, OPD Suites 210-216',
    contact: {
      location: 'Wing A, 2nd Floor, OPD Suites 210-216',
      phone: '+91 (0) 22 0000 2218',
      email: 'paediatrics@eglesorahospital.org',
      extension: 'Ext. 210',
    },
    doctorIds: ['6', '7', 6, 7],
    faqs: [
      {
        id: 'paed-faq-1',
        question: 'Should I bring the child\'s immunization booklet?',
        answer: 'Yes, please bring the physical immunization record to every consultation so the pediatrician can verify historical vaccinations and schedule upcoming doses.',
      },
    ],
  },
  {
    id: 'neurology-dept',
    slug: 'neurology-dept',
    dbId: 5,
    name: 'Department of Neurosciences & Stroke Care',
    specialty: 'Neurology & Cognitive Disorders',
    shortDescription: 'Specialized evaluation of cerebrovascular disorders, epilepsy, headache management, peripheral neuropathy, and neurological rehabilitation.',
    fullDescription: 'The Department of Neurosciences & Stroke Care focuses on comprehensive clinical evaluation and non-surgical management of central and peripheral nervous system disorders. Our faculty investigates complex headache syndromes, seizure conditions, neuro-degenerative diseases, cognitive concerns, and post-stroke recovery regimens.',
    services: [
      'Neurological Clinical Assessment',
      'Migraine & Headache Triage',
      'Clinical Evaluation of Epilepsy & Seizure Syndromes',
      'Peripheral Neuropathy & Neuromuscular Disease Workup',
      'Post-Stroke Follow-up & Cognitive Rehabilitation Guidance',
    ],
    consultationTimings: [
      { day: 'Monday', timing: '10:00 AM - 02:00 PM', status: 'Active OPD' },
      { day: 'Tuesday', timing: '10:00 AM - 02:00 PM', status: 'Active OPD' },
      { day: 'Wednesday', timing: '10:00 AM - 02:00 PM', status: 'Active OPD' },
      { day: 'Thursday', timing: '10:00 AM - 02:00 PM', status: 'Active OPD' },
      { day: 'Friday', timing: '10:00 AM - 02:00 PM', status: 'Active OPD' },
      { day: 'Saturday', timing: '10:00 AM - 01:00 PM', status: 'Active OPD' },
      { day: 'Sunday', timing: 'Closed (Emergency Trauma Open 24/7)', status: 'Closed' },
    ],
    opdHours: 'Mon - Fri: 10:00 AM - 05:00 PM',
    location: 'Wing B, 2nd Floor, OPD Suites 220-225',
    contact: {
      location: 'Wing B, 2nd Floor, OPD Suites 220-225',
      phone: '+91 (0) 22 0000 2212',
      email: 'neurology@eglesorahospital.org',
      extension: 'Ext. 220',
    },
    doctorIds: ['8', 8],
    faqs: [
      {
        id: 'neuro-faq-1',
        question: 'Can I consult for chronic dizziness or balance issues?',
        answer: 'Yes, our neurologists assess vestibular symptoms, balance disorders, and neuropathic gait instability in coordination with diagnostic audiometry and imaging.',
      },
    ],
  },
  {
    id: 'ent-head-neck',
    slug: 'ent-head-neck',
    dbId: 6,
    name: 'Department of ENT & Head-Neck Care',
    specialty: 'Otolaryngology & Audiology',
    shortDescription: 'Ear, nose, and throat evaluations, endoscopic diagnostics, audiometric hearing assessments, and sinus allergy management.',
    fullDescription: 'The Department of ENT & Head-Neck Care provides specialized diagnostics and clinical therapies for ear infections, hearing loss, chronic sinusitis, nasal obstruction, throat disorders, and voice pathologies. Equipped with video endoscopy and audiology suites, our specialists deliver precise outpatient diagnosis.',
    services: [
      'Diagnostic Video Otoscopy & Nasal Endoscopy',
      'Audiometric Hearing Screening',
      'Chronic Sinusitis & Allergic Rhinitis Management',
      'Tympanometry & Middle Ear Pressure Evaluation',
      'Voice & Swallowing Assessment Clinic',
    ],
    consultationTimings: [
      { day: 'Monday', timing: '09:00 AM - 01:00 PM', status: 'Active OPD' },
      { day: 'Tuesday', timing: '09:00 AM - 01:00 PM', status: 'Active OPD' },
      { day: 'Wednesday', timing: '09:00 AM - 01:00 PM', status: 'Active OPD' },
      { day: 'Thursday', timing: '09:00 AM - 01:00 PM', status: 'Active OPD' },
      { day: 'Friday', timing: '09:00 AM - 01:00 PM', status: 'Active OPD' },
      { day: 'Saturday', timing: '09:00 AM - 01:00 PM', status: 'Active OPD' },
      { day: 'Sunday', timing: 'Closed (Emergency Trauma Open 24/7)', status: 'Closed' },
    ],
    opdHours: 'Mon - Sat: 09:00 AM - 03:00 PM',
    location: 'Wing C, Ground Floor, OPD Suites 110-114',
    contact: {
      location: 'Wing C, Ground Floor, OPD Suites 110-114',
      phone: '+91 (0) 22 0000 2230',
      email: 'ent@eglesorahospital.org',
      extension: 'Ext. 110',
    },
    doctorIds: ['9', 9],
    faqs: [
      {
        id: 'ent-faq-1',
        question: 'Is ear wax removal performed during the OPD visit?',
        answer: 'Yes, safe microscopic suction clearance and gentle irrigation are routinely performed in the ENT minor procedure room during outpatient visits.',
      },
    ],
  },
  {
    id: 'dermatology-dept',
    slug: 'dermatology-dept',
    dbId: 7,
    name: 'Department of Dermatology & Skin Health',
    specialty: 'Clinical Dermatology & Skin Care',
    shortDescription: 'Clinical dermatological diagnostics for acute and chronic skin disorders, allergen evaluations, and nail/hair pathologies.',
    fullDescription: 'The Department of Dermatology & Skin Health provides rigorous clinical diagnostic and medical therapeutic services for a wide spectrum of cutaneous conditions. Our specialists treat eczema, psoriasis, acneiform disorders, fungal pathologies, autoimmune dermatoses, and hair/scalp diseases using evidence-based medical regimens.',
    services: [
      'Clinical Dermoscopy & Skin Lesion Check',
      'Allergy & Eczema Medical Management',
      'Diagnostic Skin Biopsies & Histopathology Correlation',
      'Management of Chronic Dermatoses (Psoriasis, Atopic Eczema)',
      'Scalp, Alopecia & Nail Pathology Clinics',
    ],
    consultationTimings: [
      { day: 'Monday', timing: '11:00 AM - 03:00 PM', status: 'Active OPD' },
      { day: 'Tuesday', timing: '11:00 AM - 03:00 PM', status: 'Active OPD' },
      { day: 'Wednesday', timing: '11:00 AM - 03:00 PM', status: 'Active OPD' },
      { day: 'Thursday', timing: '11:00 AM - 03:00 PM', status: 'Active OPD' },
      { day: 'Friday', timing: '11:00 AM - 03:00 PM', status: 'Active OPD' },
      { day: 'Saturday', timing: '11:00 AM - 02:00 PM', status: 'Active OPD' },
      { day: 'Sunday', timing: 'Closed', status: 'Closed' },
    ],
    opdHours: 'Mon - Sat: 11:00 AM - 03:00 PM',
    location: 'Wing A, 1st Floor, OPD Suites 120-124',
    contact: {
      location: 'Wing A, 1st Floor, OPD Suites 120-124',
      phone: '+91 (0) 22 0000 2225',
      email: 'dermatology@eglesorahospital.org',
      extension: 'Ext. 120',
    },
    doctorIds: ['10', 10],
    faqs: [
      {
        id: 'derm-faq-1',
        question: 'Should I wash off facial ointments before coming to the appointment?',
        answer: 'Yes, please refrain from applying thick medicated ointments, barrier creams, or cosmetic makeup on the morning of your visit so the dermatologist can examine the skin clearly under dermoscopy.',
      },
    ],
  },
];

export const DEMO_DOCTORS = [
  {
    id: '101',
    slug: 'dr-rajesh-k-varma',
    name: 'Dr. Rajesh K. Varma',
    initials: 'RV',
    photo: null,
    specialty: 'Cardiology',
    departmentId: 'cardiology',
    departmentName: 'Cardiology & Vascular Medicine',
    qualification: ['MBBS', 'MD (General Medicine)', 'DM (Cardiology)'],
    experience: 18,
    bio: 'Dr. Rajesh K. Varma is a Senior Consultant Cardiologist with 18 years of clinical hospital practice. His expertise covers non-invasive cardiac evaluations, adult echocardiography, ischemic heart disease stabilization, and preventive cardiovascular care. He serves on institutional multidisciplinary review panels and leads the outpatient heart failure follow-up clinic.',
    expertise: [
      'Clinical Cardiology',
      '2D Transthoracic Echocardiography & Color Doppler',
      'Preventive Cardiovascular Care & Lipid Disorders',
      'Chronic Heart Failure Management',
      'Ambulatory Blood Pressure & Holter Analysis',
    ],
    consultation: {
      type: 'In-person Consultation',
      duration: '30 minutes',
      location: 'Cardiology OPD, Wing B, 2nd Floor, Suite 204',
    },
    schedule: {
      workingDays: ['Monday', 'Wednesday', 'Friday'],
      workingHours: '09:00 AM - 01:00 PM',
      breaks: [
        {
          start: '11:00 AM',
          end: '11:30 AM',
        },
      ],
    },
    leave: [
      {
        date: '2026-11-15',
        reason: 'National Cardiology Conference',
      },
      {
        date: '2026-12-25',
        reason: 'Public Holiday',
      },
    ],
    status: 'active',
    // Backward compatibility aliases
    credentials: 'MBBS, MD, DM (Cardiology)',
    experienceYears: 18,
    department: 'Department of Cardiovascular Sciences',
    departmentSlug: 'cardiovascular-sciences',
  },
  {
    id: '102',
    slug: 'dr-ananya-sen',
    name: 'Dr. Ananya Sen',
    initials: 'AS',
    photo: null,
    specialty: 'Neurology',
    departmentId: 'neurology',
    departmentName: 'Neurology & Stroke Care',
    qualification: ['MBBS', 'MD (General Medicine)', 'DM (Neurology)'],
    experience: 14,
    bio: 'Dr. Ananya Sen is a Consultant Neurologist with 14 years of clinical experience in cerebrovascular care, intractable migraine syndromes, and clinical electrophysiology. She works closely with diagnostic neuro-radiologists and neuro-rehabilitation therapists to provide structured recovery programs for stroke survivors and chronic neuropathy patients.',
    expertise: [
      'Clinical Stroke Management & Post-Stroke Recovery',
      'Epilepsy & Seizure Syndrome Management',
      'Intractable Headache & Migraine Therapy',
      'Peripheral Neuropathy & Neuromuscular Disorders',
      'Movement Disorders & Parkinsonian Assessments',
    ],
    consultation: {
      type: 'In-person Consultation',
      duration: '30 minutes',
      location: 'Neurology OPD, Wing C, 3rd Floor, Suite 312',
    },
    schedule: {
      workingDays: ['Tuesday', 'Thursday', 'Saturday'],
      workingHours: '10:00 AM - 02:00 PM',
      breaks: [
        {
          start: '12:00 PM',
          end: '12:30 PM',
        },
      ],
    },
    leave: [
      {
        date: '2026-10-28',
        reason: 'Institutional Clinical Audit',
      },
    ],
    status: 'active',
    // Backward compatibility aliases
    credentials: 'MBBS, MD, DM (Neurology)',
    experienceYears: 14,
    department: 'Department of Neurosciences & Stroke Care',
    departmentSlug: 'neurology-dept',
  },
  {
    id: '103',
    slug: 'dr-vikramaditya-joshi',
    name: 'Dr. Vikramaditya Joshi',
    initials: 'VJ',
    photo: null,
    specialty: 'Orthopaedics',
    departmentId: 'orthopaedics',
    departmentName: 'Orthopaedics & Joint Surgery',
    qualification: ['MBBS', 'MS (Orthopaedics)', 'DNB (Orthopaedics)'],
    experience: 20,
    bio: 'Dr. Vikramaditya Joshi is a Senior Consultant Orthopaedic Surgeon with 20 years of clinical experience. Specializing in degenerative joint diseases, traumatic fractures, spine assessments, and joint arthroplasty pre-operative evaluations, he prioritizes structured conservative therapy alongside operative interventions.',
    expertise: [
      'Adult Joint Preservation & Arthritis Care',
      'Acute Fracture Triage & Casting Protocols',
      'Degenerative Spine & Lumbar Assessment',
      'Sports Ligament Strain & Soft Tissue Care',
      'Pre-Operative Joint Replacement Counseling',
    ],
    consultation: {
      type: 'In-person Consultation',
      duration: '30 minutes',
      location: 'Orthopaedics OPD, Wing A, 1st Floor, Suite 108',
    },
    schedule: {
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'],
      workingHours: '09:00 AM - 01:30 PM',
      breaks: [
        {
          start: '11:30 AM',
          end: '12:00 PM',
        },
      ],
    },
    leave: [
      {
        date: '2026-11-05',
        reason: 'Musculoskeletal Surgical Workshop',
      },
    ],
    status: 'active',
    // Backward compatibility aliases
    credentials: 'MBBS, MS (Ortho), DNB',
    experienceYears: 20,
    department: 'Department of Orthopaedics & Joint Care',
    departmentSlug: 'orthopaedics-dept',
  },
  {
    id: '104',
    slug: 'dr-meenakshi-sundaram',
    name: 'Dr. Meenakshi Sundaram',
    initials: 'MS',
    photo: null,
    specialty: 'General Internal Medicine',
    departmentId: 'general-medicine',
    departmentName: 'General Internal Medicine',
    qualification: ['MBBS', 'MD (General Medicine)'],
    experience: 16,
    bio: 'Dr. Meenakshi Sundaram is a Senior Physician and Internist with 16 years of hospital practice. She manages adult multi-morbidity, diabetes mellitus, resistant hypertension, systemic infections, and preventive adult health examinations. She works closely with subspecialists to provide coordinated chronic disease care.',
    expertise: [
      'Adult Diabetes Mellitus & Glycemic Control',
      'Hypertension & Cardiovascular Risk Modulation',
      'Fever of Unknown Origin & Systemic Infections',
      'Geriatric Healthcare Maintenance & Polypharmacy Review',
      'Preventive Executive Health Assessments',
    ],
    consultation: {
      type: 'In-person Consultation',
      duration: '20 minutes',
      location: 'Main Medical Wing, Ground Floor, Suite 015',
    },
    schedule: {
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      workingHours: '08:30 AM - 01:00 PM',
      breaks: [
        {
          start: '10:30 AM',
          end: '11:00 AM',
        },
      ],
    },
    leave: [],
    status: 'active',
    // Backward compatibility aliases
    credentials: 'MBBS, MD (General Medicine)',
    experienceYears: 16,
    department: 'Department of General Medicine',
    departmentSlug: 'general-medicine-dept',
  },
  {
    id: '105',
    slug: 'dr-preeti-deshmukh',
    name: 'Dr. Preeti Deshmukh',
    initials: 'PD',
    photo: null,
    specialty: 'Paediatrics',
    departmentId: 'paediatrics',
    departmentName: 'Paediatrics & Child Health',
    qualification: ['MBBS', 'DCH (Paediatrics)', 'DNB (Paediatrics)'],
    experience: 12,
    bio: 'Dr. Preeti Deshmukh is a Consultant Paediatrician with 12 years of clinical experience in infant care, developmental milestone monitoring, pediatric immunization protocols, and childhood respiratory diseases. She is dedicated to reassuring, family-centered medical care for infants, children, and adolescents.',
    expertise: [
      'Well-Child Developmental Milestone Screening',
      'Pediatric Immunization & Vaccine Administration',
      'Childhood Asthma & Allergic Rhinitis Care',
      'Pediatric Infectious Disease Management',
      'Growth & Nutritional Optimization',
    ],
    consultation: {
      type: 'In-person Consultation',
      duration: '30 minutes',
      location: 'Mother & Child Pavilion, 2nd Floor, Suite 220',
    },
    schedule: {
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      workingHours: '10:00 AM - 02:30 PM',
      breaks: [
        {
          start: '12:30 PM',
          end: '01:00 PM',
        },
      ],
    },
    leave: [
      {
        date: '2026-11-20',
        reason: 'Pediatric CME Seminar',
      },
    ],
    status: 'active',
    // Backward compatibility aliases
    credentials: 'MBBS, DCH, DNB (Paediatrics)',
    experienceYears: 12,
    department: 'Department of Paediatrics & Child Health',
    departmentSlug: 'paediatrics-dept',
  },
  {
    id: '106',
    slug: 'dr-farhan-al-mansoor',
    name: 'Dr. Farhan Al-Mansoor',
    initials: 'FA',
    photo: null,
    specialty: 'Dermatology',
    departmentId: 'dermatology',
    departmentName: 'Dermatology & Skin Biology',
    qualification: ['MBBS', 'MD (Dermatology, Venereology & Leprosy)'],
    experience: 11,
    bio: 'Dr. Farhan Al-Mansoor is a Clinical Dermatologist with 11 years of hospital practice specializing in chronic dermatoses, patch allergen testing, scalp conditions, and diagnostic dermoscopic evaluations. He delivers structured medical regimens for psoriasis, atopic eczema, and adult acneiform conditions.',
    expertise: [
      'Clinical Dermatology Consultations',
      'Psoriasis & Chronic Eczema Management',
      'Allergen Patch Testing & Contact Dermatitis',
      'Scalp & Hair Loss (Alopecia) Protocols',
      'Diagnostic Skin Biopsy Correlation',
    ],
    consultation: {
      type: 'In-person Consultation',
      duration: '20 minutes',
      location: 'Wing C, 1st Floor, Suite 104',
    },
    schedule: {
      workingDays: ['Tuesday', 'Thursday', 'Saturday'],
      workingHours: '11:00 AM - 03:00 PM',
      breaks: [
        {
          start: '01:00 PM',
          end: '01:30 PM',
        },
      ],
    },
    leave: [],
    status: 'active',
    // Backward compatibility aliases
    credentials: 'MBBS, MD (Dermatology)',
    experienceYears: 11,
    department: 'Department of Dermatology & Skin Health',
    departmentSlug: 'dermatology-dept',
  },
  {
    id: '107',
    slug: 'dr-siddharth-narayan',
    name: 'Dr. Siddharth Narayan',
    initials: 'SN',
    photo: null,
    specialty: 'Cardiology',
    departmentId: 'cardiology',
    departmentName: 'Cardiology & Vascular Medicine',
    qualification: ['MBBS', 'MD (General Medicine)', 'DM (Cardiology)'],
    experience: 9,
    bio: 'Dr. Siddharth Narayan is an Associate Consultant in Adult Cardiology. He is currently on academic leave for an advanced cardiovascular research fellowship and is temporarily unavailable for regular outpatient consultations.',
    expertise: [
      'Clinical Cardiology',
      'Cardiac Arrhythmia Follow-up',
      'Preventive Vascular Health',
    ],
    consultation: {
      type: 'In-person Consultation',
      duration: '30 minutes',
      location: 'Cardiology OPD, Wing B, 2nd Floor, Suite 206',
    },
    schedule: {
      workingDays: [],
      workingHours: 'Not Currently Consulting',
      breaks: [],
    },
    leave: [
      {
        date: '2026-10-01',
        reason: 'Academic Research Fellowship (Sabbatical)',
      },
    ],
    status: 'inactive',
    // Backward compatibility aliases
    credentials: 'MBBS, MD, DM (Cardiology)',
    experienceYears: 9,
    department: 'Department of Cardiovascular Sciences',
    departmentSlug: 'cardiovascular-sciences',
  },
  {
    id: '108',
    slug: 'dr-santosh-gaikwad',
    name: 'Dr. Santosh Gaikwad',
    initials: 'SG',
    photo: null,
    specialty: 'Otolaryngology & Audiology',
    departmentId: 'ent-head-neck',
    departmentName: 'Department of ENT & Head-Neck Care',
    qualification: ['MBBS', 'MS (ENT)', 'DNB (Otolaryngology)'],
    experience: 15,
    bio: 'Dr. Santosh Gaikwad is a Senior Consultant ENT Specialist with 15 years of clinical practice in diagnostic video endoscopy, audiometric hearing assessments, and sinus allergy care.',
    expertise: [
      'Diagnostic Video Otoscopy & Nasal Endoscopy',
      'Audiometric Hearing Evaluation',
      'Chronic Sinusitis & Rhinitis Management',
      'Middle Ear Pressure Assessments',
    ],
    consultation: {
      type: 'In-person Consultation',
      duration: '25 minutes',
      location: 'Wing C, Ground Floor, OPD Suites 110-114',
    },
    schedule: {
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      workingHours: '09:00 AM - 01:00 PM',
      breaks: [],
    },
    leave: [],
    status: 'active',
    credentials: 'MBBS, MS (ENT), DNB',
    experienceYears: 15,
    department: 'Department of ENT & Head-Neck Care',
    departmentSlug: 'ent-head-neck',
  },
];

/**
 * Helper to look up a doctor by either numeric ID or URL slug.
 */
export function getDoctorByIdOrSlug(param) {
  if (!param) return null;
  const normalized = String(param).trim().toLowerCase();
  return (
    DEMO_DOCTORS.find(
      (doc) =>
        doc.id === param ||
        doc.slug.toLowerCase() === normalized ||
        doc.id.toLowerCase() === normalized
    ) || null
  );
}

/**
 * Helper to look up a department by its ID or slug.
 */
export function getDepartmentByIdOrSlug(param) {
  if (!param) return null;
  const normalized = String(param).trim().toLowerCase();
  return (
    DEMO_DEPARTMENTS.find(
      (dept) =>
        dept.id === param ||
        dept.slug.toLowerCase() === normalized ||
        dept.id.toLowerCase() === normalized
    ) || null
  );
}


export const DEMO_SERVICES = [
  {
    code: 'EMERGENCY',
    title: '24/7 Emergency & Triage Care',
    badge: 'Round the Clock',
    description: 'Immediate medical stabilization, multi-bed acute resuscitation bay, and specialized trauma response teams ready around the clock.',
  },
  {
    code: 'DIAGNOSTICS',
    title: 'Diagnostic Imaging & Radiology',
    badge: 'On-Site Diagnostics',
    description: 'Direct digital radiography, ultrasonography, multi-slice computed tomography, and diagnostic echocardiography on premise.',
  },
  {
    code: 'ICU',
    title: 'Intensive & Critical Care Units',
    badge: 'Monitored 24/7',
    description: 'Equipped with invasive hemodynamic monitoring, mechanical ventilators, and high nurse-to-patient staffing ratios.',
  },
  {
    code: 'PHARMACY',
    title: 'In-House Hospital Pharmacy',
    badge: 'On-Campus',
    description: 'Complete dispensing of verified medications, surgical items, cold-chain injectables, and hospital-grade intravenous fluids.',
  },
  {
    code: 'LABORATORY',
    title: 'Automated Pathology Laboratory',
    badge: 'Rapid Turnaround',
    description: 'Internal testing facilities for routine hematology, clinical biochemistry, serology, microbiology, and urinalysis.',
  },
  {
    code: 'THEATRE',
    title: 'Modular Operation Theatres',
    badge: 'Surgical Suites',
    description: 'Controlled positive-pressure surgical suites with laminar airflow, specialized anesthesia stations, and recovery bays.',
  },
];

export const DEMO_FACILITIES = [
  {
    name: 'Emergency & Triage Wing',
    detail: 'Dedicated ambulance entrance with direct access to resuscitation bays, portable imaging, and priority emergency elevators.',
  },
  {
    name: 'Outpatient Specialty Suites',
    detail: 'Spacious consultation rooms designed for patient privacy, equipped with examination amenities and comfortable waiting lounges.',
  },
  {
    name: 'Inpatient Accommodations',
    detail: 'Hygienic general wards, semi-private rooms, and private single rooms configured for patient comfort, sanitation, and clinical monitoring.',
  },
  {
    name: 'Day-Care Surgical Unit',
    detail: 'Specialized recovery observation beds for minor surgical and endoscopic procedures that require short daytime monitoring.',
  },
];

export const HOSPITAL_VALUES = [
  {
    title: 'Clinical Integrity',
    description: 'We practice evidence-based medicine, recommending diagnostic evaluations and medical treatments grounded strictly in patient clinical necessity.',
  },
  {
    title: 'Patient Safety & Hygiene',
    description: 'Strict disinfection protocols, sanitized environments, and disciplined hospital hygiene procedures across all patient corridors and wards.',
  },
  {
    title: 'Transparent Care',
    description: 'Open communication regarding medical conditions, expected recovery pathways, prescription rationales, and institutional procedures.',
  },
  {
    title: 'Collaborative Governance',
    description: 'Doctors, nurse practitioners, pharmacists, and support technicians work as unified teams to oversee patient treatment continuity.',
  },
];

export const DEMO_FAQS = [
  {
    id: 'faq-1',
    question: 'How do I book an outpatient appointment?',
    answer: 'You can schedule an appointment online by visiting the "Book Appointment" section, choosing the clinical department and physician, and selecting an open consultation slot. Alternatively, you may contact the outpatient desk by phone.',
  },
  {
    id: 'faq-2',
    question: 'How do I find an appropriate medical specialist?',
    answer: 'Browse our "Doctors" or "Departments" directory to view consultant qualifications, areas of specialty, and regular OPD consultation timings.',
  },
  {
    id: 'faq-3',
    question: 'What documents should I bring for my consultation?',
    answer: 'Please bring valid photo identification, previous medical files or discharge summaries, recent diagnostic reports, and a complete list of current medications.',
  },
  {
    id: 'faq-4',
    question: 'Can appointments be cancelled or rescheduled?',
    answer: 'Yes. You can manage or reschedule appointments through the Patient Appointments section using your reference confirmation number, or by contacting the reception desk at least 4 hours prior.',
  },
  {
    id: 'faq-5',
    question: 'What is the procedure during a medical emergency?',
    answer: 'For acute medical distress, visit the Emergency & Trauma Department directly. The emergency bay operates 24 hours a day, 7 days a week, and does not require prior appointment.',
  },
  {
    id: 'faq-6',
    question: 'What are the visiting hours for inpatient wards?',
    answer: 'General visiting hours are Monday through Saturday from 08:00 AM to 08:00 PM. To protect patient rest and hygiene, visitors are restricted to two persons per patient at any single time.',
  },
];
