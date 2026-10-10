import React from 'react';

/**
 * Hospital Platform — Booking Step Indicator (Phase 6)
 * Accessible, semantic numbered steps for the patient booking flow.
 * Strictly avoids icons, checkmarks, animations, and non-standard symbols.
 */
export function BookingStepIndicator({ currentStep = 1, onStepClick }) {
  const steps = [
    { number: 1, label: 'Doctor' },
    { number: 2, label: 'Date & Time' },
    { number: 3, label: 'Patient Details' },
    { number: 4, label: 'Review' },
  ];

  return (
    <nav className="booking-stepper" aria-label="Appointment Booking Progress">
      {steps.map((step, index) => {
        const isCurrent = currentStep === step.number;
        const isCompleted = currentStep > step.number;
        let itemClass = 'booking-step-item';
        if (isCurrent) itemClass += ' active';
        else if (isCompleted) itemClass += ' completed';

        return (
          <React.Fragment key={step.number}>
            <div
              className={itemClass}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <span className="booking-step-num" aria-hidden="true">
                {step.number}
              </span>
              <span className="booking-step-label">{step.label}</span>
            </div>

            {index < steps.length - 1 && (
              <div className="booking-step-divider" aria-hidden="true" />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export default BookingStepIndicator;
