import React from 'react';
import { User, Calendar, FileText, CheckCircle } from 'lucide-react';

/**
 * Hospital Platform — Booking Step Indicator
 * Neumorphism numbered/icon steps for appointment booking.
 */
export function BookingStepIndicator({ currentStep = 1, onStepClick }) {
  const steps = [
    { number: 1, label: 'Doctor', icon: User },
    { number: 2, label: 'Date & Time', icon: Calendar },
    { number: 3, label: 'Patient Details', icon: FileText },
    { number: 4, label: 'Review', icon: CheckCircle },
  ];

  return (
    <nav className="neu-raised neu-surface p-3 rounded-4 mb-4" aria-label="Appointment Booking Progress">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
        {steps.map((step, index) => {
          const isCurrent = currentStep === step.number;
          const isCompleted = currentStep > step.number;
          const IconComponent = step.icon;

          return (
            <React.Fragment key={step.number}>
              <div
                className={`d-flex align-items-center gap-2 px-3 py-2 rounded-pill transition-all cursor-pointer ${
                  isCurrent
                    ? 'neu-inset fw-bold text-primary'
                    : isCompleted
                    ? 'neu-raised text-success fw-medium'
                    : 'text-muted'
                }`}
                onClick={() => onStepClick && onStepClick(step.number)}
                role="button"
                tabIndex={0}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <span
                  className={`rounded-circle d-flex align-items-center justify-content-center fw-bold small ${
                    isCurrent
                      ? 'bg-primary text-white'
                      : isCompleted
                      ? 'bg-success text-white'
                      : 'neu-inset text-muted'
                  }`}
                  style={{ width: '28px', height: '28px' }}
                  aria-hidden="true"
                >
                  {isCompleted ? '✓' : step.number}
                </span>
                <span className="small text-nowrap">{step.label}</span>
              </div>

              {index < steps.length - 1 && (
                <div
                  className="flex-grow-1 border-top border-2 mx-1 d-none d-md-block"
                  style={{
                    borderColor: isCompleted ? 'var(--neu-success)' : 'var(--neu-border)',
                    minWidth: '20px',
                  }}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
}

export default BookingStepIndicator;
