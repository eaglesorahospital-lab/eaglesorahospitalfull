import React from 'react';
import { Link } from 'react-router-dom';
import Container from '../../components/common/Container';
import PageHeader from '../../components/common/PageHeader';
import SEO from '../../components/common/SEO';
import { HOSPITAL_METADATA } from '../../data/navigation';
import { FileCheck, AlertTriangle, Stethoscope, Clock, ShieldAlert, PhoneCall, Mail } from 'lucide-react';

/**
 * Hospital Platform — Terms and Conditions Page
 * Outlines website usage, outpatient appointment booking terms, medical disclaimers,
 * and user account responsibilities.
 *
 * Marked clearly as requiring legal review.
 */
export function TermsConditionsPage() {
  const breadcrumbs = [
    { label: 'Home', to: '/' },
    { label: 'Terms & Conditions' },
  ];

  return (
    <>
      <SEO
        title="Terms & Conditions"
        description="Review the terms of service, appointment booking conditions, and medical disclaimers for the EgleSora Hospital Platform."
      />
      <PageHeader
        title="Terms & Conditions"
        subtitle="Platform Terms of Use, Outpatient Appointment Policies & Clinical Disclaimers"
        breadcrumbs={breadcrumbs}
      />
      <Container className="py-5">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-10">
            {/* Legal Notice Callout */}
            <div className="alert alert-warning border-0 rounded-4 p-4 mb-4 neu-raised d-flex align-items-start gap-3">
              <AlertTriangle size={24} className="text-warning flex-shrink-0 mt-1" />
              <div>
                <strong className="d-block mb-1 text-dark fs-6">Operational Legal Notice & Disclaimer</strong>
                <p className="small text-muted mb-0" style={{ lineHeight: '1.6' }}>
                  These Terms and Conditions constitute an operational framework governing access to the EgleSora Hospital Platform.
                  This text is an engineering draft reflecting actual appointment scheduling and portal behaviors. It must be reviewed
                  and approved by authorized healthcare legal counsel to ensure compliance with relevant medical laws and hospital governance
                  before being relied upon as binding institutional policy.
                </p>
              </div>
            </div>

            <div className="neu-card p-4 p-md-5 rounded-4 mb-4" style={{ background: 'var(--hospital-surface)' }}>
              {/* 1. Acceptance */}
              <div className="d-flex align-items-center gap-2 mb-4 pb-3 border-bottom">
                <FileCheck size={28} className="text-primary" />
                <h2 className="h4 fw-bold mb-0 text-body">1. Acceptance of Terms</h2>
              </div>
              <p className="text-muted" style={{ lineHeight: '1.7' }}>
                By accessing or utilizing the digital platform of {HOSPITAL_METADATA.legalName} ("{HOSPITAL_METADATA.name}"),
                located at <code>https://eglesorahospital.netlify.app</code>, you acknowledge that you have read, understood, and agree
                to be bound by these Terms and Conditions. If you do not agree, please discontinue use of this website.
              </p>

              {/* 2. Medical Emergency Disclaimer */}
              <div className="d-flex align-items-center gap-2 mt-5 mb-4 pb-3 border-bottom">
                <ShieldAlert size={28} className="text-danger" />
                <h2 className="h4 fw-bold mb-0 text-danger">2. Medical Emergency Disclaimer — Not for Acute Emergencies</h2>
              </div>
              <div className="p-3 rounded-4 bg-danger bg-opacity-10 border border-danger border-opacity-25 mb-3">
                <p className="text-danger small fw-semibold mb-0" style={{ lineHeight: '1.6' }}>
                  THIS WEBSITE AND ONLINE CONSULTATION SCHEDULER ARE INTENDED EXCLUSIVELY FOR NON-EMERGENCY OUTPATIENT CARE.
                  DO NOT USE THIS PLATFORM TO REPORT AN ACUTE MEDICAL CRISIS, TRAUMA, SEVERE CHEST PAIN, OR BREATHING DIFFICULTY.
                  IN THE EVENT OF A MEDICAL EMERGENCY, IMMEDIATELY CALL OUR 24/7 TRAUMA DESK AT{' '}
                  <a href={`tel:${HOSPITAL_METADATA.emergencyPhone.replace(/[^0-9+]/g, '')}`} className="fw-bold text-danger">
                    {HOSPITAL_METADATA.emergencyPhone}
                  </a>{' '}
                  OR REPORT DIRECTLY TO THE EMERGENCY ROOM.
                </p>
              </div>
              <p className="text-muted small" style={{ lineHeight: '1.6' }}>
                All content, health tips, specialty overviews, and department descriptions provided on this website are for general
                informational purposes only. They do not constitute formal medical diagnosis, clinical advice, or treatment plans.
              </p>

              {/* 3. Appointment Scheduling & Cancellations */}
              <div className="d-flex align-items-center gap-2 mt-5 mb-4 pb-3 border-bottom">
                <Clock size={28} className="text-primary" />
                <h2 className="h4 fw-bold mb-0 text-body">3. Outpatient Appointment Scheduling Policies</h2>
              </div>
              <ul className="text-muted small d-flex flex-column gap-2 ps-3" style={{ lineHeight: '1.6' }}>
                <li>
                  <strong className="text-body">Booking Slips & References:</strong> When you submit an appointment request, the system
                  issues an authoritative reference code. Please retain this reference code for check-in at the hospital OPD desk.
                </li>
                <li>
                  <strong className="text-body">Consultant Availability:</strong> Doctor schedules are subject to clinical demand,
                  emergency surgeries, and urgent inpatient duties. The hospital reserves the right to notify patients and reschedule
                  appointments if a consultant becomes unavailable due to an emergency.
                </li>
                <li>
                  <strong className="text-body">Arrival Time:</strong> Patients are requested to report to the designated OPD suite
                  at least 15 minutes prior to the scheduled consultation time to complete registration and vital sign checks.
                </li>
              </ul>

              {/* 4. User Accounts & Security */}
              <div className="d-flex align-items-center gap-2 mt-5 mb-4 pb-3 border-bottom">
                <Stethoscope size={28} className="text-primary" />
                <h2 className="h4 fw-bold mb-0 text-body">4. User Account & Portal Responsibilities</h2>
              </div>
              <p className="text-muted" style={{ lineHeight: '1.7' }}>
                Registered patients and healthcare staff must maintain the confidentiality of their login credentials. Any activity
                originating from your authenticated account remains your institutional responsibility. You must notify hospital IT
                immediately if you suspect unauthorized access or compromised credentials.
              </p>

              {/* 5. Contact Information */}
              <div className="mt-5 p-4 rounded-4 neu-surface border-start border-4 border-primary">
                <h3 className="h6 fw-bold mb-2 text-body">Hospital Administration & Governance Inquiries</h3>
                <p className="small text-muted mb-3">
                  If you have questions regarding these terms, appointment policies, or platform usage:
                </p>
                <div className="d-flex flex-column flex-sm-row gap-3 small">
                  <a href={`mailto:${HOSPITAL_METADATA.email}`} className="text-primary text-decoration-none d-inline-flex align-items-center gap-1">
                    <Mail size={16} />
                    <span>{HOSPITAL_METADATA.email}</span>
                  </a>
                  <a href={`tel:${HOSPITAL_METADATA.generalPhone.replace(/[^0-9+]/g, '')}`} className="text-body text-decoration-none d-inline-flex align-items-center gap-1">
                    <PhoneCall size={16} className="text-primary" />
                    <span>Reception: {HOSPITAL_METADATA.generalPhone}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </>
  );
}

export default TermsConditionsPage;
