import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  RotateCw,
  AlertCircle,
  Eye,
  CheckCircle2,
  X,
  Star,
  MessageSquare,
  ThumbsUp,
  Clock,
  User,
  Mail,
  Phone,
  Tag,
  ShieldCheck,
  Check,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import AdminFilterBar from '../../components/admin/AdminFilterBar';
import AdminStatCard from '../../components/admin/AdminStatCard';
import RoleRestrictedNotice from '../../components/admin/RoleRestrictedNotice';
import feedbackService, {
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUSES,
} from '../../services/feedbackService';

/**
 * Renders 1 to 5 golden star icons for feedback satisfaction score
 */
function RatingStars({ rating, size = 15 }) {
  const numericRating = Math.max(1, Math.min(5, Number(rating) || 0));
  return (
    <div className="d-inline-flex align-items-center gap-0.5" title={`${numericRating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={star <= numericRating ? 'text-warning fill-warning' : 'text-muted'}
          style={{
            fill: star <= numericRating ? '#F59E0B' : 'transparent',
            color: star <= numericRating ? '#F59E0B' : 'var(--hospital-border)',
          }}
        />
      ))}
      <span className="ms-1 small fw-bold text-body">{numericRating}.0</span>
    </div>
  );
}

/**
 * Hospital Platform — Admin Feedback Management Page
 * Allows authorized administrators to review, audit, and manage patient satisfaction ratings,
 * clinical service evaluations, and institutional inquiries.
 */
export function AdminFeedbackPage() {
  const { currentRole, setRole } = useOutletContext() || {};

  // Role restriction guard
  if (currentRole && currentRole.id === 'PATIENT') {
    return (
      <RoleRestrictedNotice
        currentRole={currentRole}
        moduleName="Patient Experience & Feedback"
        onSwitchRole={setRole}
      />
    );
  }

  const [feedbacksList, setFeedbacksList] = useState([]);
  const [summary, setSummary] = useState({ total: 0, new: 0, reviewed: 0, average_rating: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [ratingFilter, setRatingFilter] = useState('ALL');

  // Modal inspection state
  const [viewFeedback, setViewFeedback] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const breadcrumbs = [
    { label: 'Admin', to: '/admin' },
    { label: 'Feedback Registry' },
  ];

  // Fetch feedback records and summary metrics
  const fetchFeedbackData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resList, resSummary] = await Promise.all([
        feedbackService.getFeedbacks({
          search: searchTerm,
          category: categoryFilter,
          status: statusFilter,
          rating: ratingFilter,
        }),
        feedbackService.getFeedbackSummary(),
      ]);

      setFeedbacksList(resList.results || []);
      if (resSummary) {
        setSummary(resSummary);
      }
    } catch (err) {
      console.warn('Could not load feedback data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, categoryFilter, statusFilter, ratingFilter]);

  useEffect(() => {
    fetchFeedbackData();
  }, [fetchFeedbackData]);

  // Lock body scroll and dismiss on Escape for details modal
  useEffect(() => {
    if (viewFeedback) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          setViewFeedback(null);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [viewFeedback]);

  // Client-side defensive filtering
  const filteredFeedbacks = useMemo(() => {
    return feedbacksList.filter((fb) => {
      if (!fb) return false;
      const term = (searchTerm || '').trim().toLowerCase();
      const patient = String(fb.patient_name || '').toLowerCase();
      const email = String(fb.email || '').toLowerCase();
      const msg = String(fb.message || '').toLowerCase();

      const matchSearch =
        term === '' || patient.includes(term) || email.includes(term) || msg.includes(term);

      const matchCategory =
        categoryFilter === 'ALL' || fb.category === categoryFilter;

      const matchStatus =
        statusFilter === 'ALL' || fb.status === statusFilter;

      const matchRating =
        ratingFilter === 'ALL' || String(fb.rating) === String(ratingFilter);

      return matchSearch && matchCategory && matchStatus && matchRating;
    });
  }, [feedbacksList, searchTerm, categoryFilter, statusFilter, ratingFilter]);

  // Quick mark as reviewed
  const handleQuickMarkReviewed = async (fb) => {
    if (!fb || processingId === fb.id) return;
    setProcessingId(fb.id);
    try {
      const res = await feedbackService.markAsReviewed(fb.id, 'Reviewed via quick action.');
      setFeedbacksList((prev) =>
        prev.map((item) =>
          item.id === fb.id
            ? { ...item, status: 'REVIEWED', status_display: 'Reviewed', admin_notes: 'Reviewed via quick action.' }
            : item
        )
      );
      setSummary((prev) => ({
        ...prev,
        new: Math.max(0, prev.new - 1),
        reviewed: prev.reviewed + 1,
      }));
      setActionNotice(`Feedback #${fb.id} from ${fb.patient_name} marked as reviewed.`);
    } catch (err) {
      console.error('Mark reviewed failed:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // Submit modal review with custom notes
  const handleApplyModalReview = async (e) => {
    e.preventDefault();
    if (!viewFeedback || isSubmittingReview) return;
    setIsSubmittingReview(true);
    try {
      await feedbackService.markAsReviewed(viewFeedback.id, reviewNotes);
      setFeedbacksList((prev) =>
        prev.map((item) =>
          item.id === viewFeedback.id
            ? {
                ...item,
                status: 'REVIEWED',
                status_display: 'Reviewed',
                admin_notes: reviewNotes,
                reviewed_at: new Date().toISOString(),
                reviewed_by_name: 'Hospital Administrator',
              }
            : item
        )
      );
      setSummary((prev) => ({
        ...prev,
        new: Math.max(0, prev.new - 1),
        reviewed: prev.reviewed + 1,
      }));
      setActionNotice(`Feedback #${viewFeedback.id} marked as reviewed with administrative notes.`);
      setViewFeedback(null);
      setReviewNotes('');
    } catch (err) {
      console.error('Modal review failed:', err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleOpenDetails = (fb) => {
    setViewFeedback(fb);
    setReviewNotes(fb.admin_notes || '');
  };

  return (
    <div className="admin-feedback-view">
      <PageHeader
        title="Patient Experience & Feedback Registry"
        description="Outpatient satisfaction scores, clinical care evaluations, patient compliments, and service inquiries."
        breadcrumbs={breadcrumbs}
      >
        <button
          type="button"
          className="neu-btn neu-btn-outline neu-btn-sm d-inline-flex align-items-center gap-2"
          onClick={fetchFeedbackData}
          disabled={isLoading}
        >
          <RotateCw size={14} className={isLoading ? 'spin-anim' : ''} />
          Sync Registry
        </button>
      </PageHeader>

      {/* Action Toast Notice */}
      {actionNotice && (
        <div
          className="neu-card p-3 mb-4 d-flex justify-content-between align-items-center"
          style={{
            borderRadius: '14px',
            background: 'var(--hospital-surface)',
            borderLeft: '4px solid var(--neu-success)',
          }}
        >
          <div className="d-flex align-items-center gap-2 small">
            <CheckCircle2 size={16} color="var(--neu-success)" />
            <span style={{ color: 'var(--hospital-primary-navy)', fontWeight: 600 }}>{actionNotice}</span>
          </div>
          <button
            type="button"
            className="neu-btn-icon"
            style={{ width: '28px', height: '28px', padding: 0 }}
            onClick={() => setActionNotice(null)}
            aria-label="Dismiss message"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Metric Summary Cards */}
      <div className="row g-3 g-md-4 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <AdminStatCard
            label="Total Submissions"
            value={summary.total || feedbacksList.length}
            icon={MessageSquare}
            iconColor="var(--hospital-medical-blue)"
            subtext="All recorded patient evaluations"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <AdminStatCard
            label="Pending Review"
            value={summary.new || feedbacksList.filter((f) => f.status === 'NEW').length}
            icon={AlertCircle}
            iconColor="#D97706"
            subtext="Awaiting administrative audit"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <AdminStatCard
            label="Reviewed & Processed"
            value={summary.reviewed || feedbacksList.filter((f) => f.status === 'REVIEWED').length}
            icon={CheckCircle2}
            iconColor="#16845B"
            subtext="Clinical audit completed"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <AdminStatCard
            label="Average Satisfaction"
            value={`${summary.average_rating || '4.8'} ★`}
            icon={Star}
            iconColor="#F59E0B"
            subtext="Patient experience index (1-5)"
          />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <AdminFilterBar
        searchPlaceholder="Search patient name, email, feedback keyword..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        hasActiveFilters={
          searchTerm !== '' ||
          categoryFilter !== 'ALL' ||
          statusFilter !== 'ALL' ||
          ratingFilter !== 'ALL'
        }
        onClear={() => {
          setSearchTerm('');
          setCategoryFilter('ALL');
          setStatusFilter('ALL');
          setRatingFilter('ALL');
        }}
      >
        <div className="col-12 col-sm-6 col-md-3">
          <select
            className="neu-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by feedback category"
          >
            {FEEDBACK_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div className="col-12 col-sm-6 col-md-2">
          <select
            className="neu-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by review status"
          >
            {FEEDBACK_STATUSES.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>
        </div>

        <div className="col-12 col-sm-6 col-md-2">
          <select
            className="neu-select"
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            aria-label="Filter by score"
          >
            <option value="ALL">All Ratings</option>
            <option value="5">5 Stars (Excellent)</option>
            <option value="4">4 Stars (Good)</option>
            <option value="3">3 Stars (Average)</option>
            <option value="2">2 Stars (Fair)</option>
            <option value="1">1 Star (Poor)</option>
          </select>
        </div>
      </AdminFilterBar>

      {/* Feedback Registry Data Table (Desktop / Tablet >= 768px) */}
      <div className="neu-table-container d-none d-md-block">
        <table className="neu-table">
          <thead>
            <tr>
              <th className="col-feedback-date">Date & Time</th>
              <th className="col-feedback-patient">Patient Details</th>
              <th className="col-feedback-category">Category</th>
              <th className="col-feedback-rating">Rating</th>
              <th className="col-feedback-message">Feedback Message</th>
              <th className="col-feedback-status">Status</th>
              <th className="col-feedback-actions text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="7" className="text-center py-5 text-muted">
                  <RotateCw size={24} className="spin-anim mb-2 text-primary" />
                  <div>Loading patient experience records...</div>
                </td>
              </tr>
            ) : filteredFeedbacks.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-5 text-muted">
                  <AlertCircle size={28} className="mb-2 text-muted" />
                  <div className="fw-semibold">No feedback records match the selected filter criteria.</div>
                  <div className="small text-muted mt-1">Try resetting your filters or search keywords.</div>
                </td>
              </tr>
            ) : (
              filteredFeedbacks.map((fb) => (
                <tr
                  key={fb.id}
                  style={{
                    borderLeft:
                      fb.status === 'NEW'
                        ? '3px solid var(--neu-warning)'
                        : '3px solid var(--neu-success)',
                  }}
                >
                  <td className="col-feedback-date">
                    <span
                      className="px-2.5 py-1 rounded small fw-bold font-monospace d-inline-block mb-1"
                      style={{
                        background: 'var(--hospital-surface)',
                        boxShadow: 'var(--neu-inset)',
                        fontSize: '0.785rem',
                        color: 'var(--hospital-medical-blue)',
                      }}
                    >
                      #{fb.id}
                    </span>
                    <div className="small text-muted text-nowrap" style={{ fontSize: '0.75rem' }}>
                      {fb.created_at ? new Date(fb.created_at).toLocaleDateString() : 'Recent'}
                    </div>
                  </td>
                  <td className="col-feedback-patient">
                    <div className="fw-semibold text-break" style={{ minWidth: '150px' }}>
                      {fb.patient_name}
                    </div>
                    <div className="small text-muted d-block mt-0.5 text-nowrap">{fb.email}</div>
                  </td>
                  <td className="col-feedback-category">
                    <span className="neu-badge neu-badge-info small">
                      {fb.category_display || fb.category?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="col-feedback-rating">
                    <RatingStars rating={fb.rating} size={14} />
                  </td>
                  <td className="col-feedback-message">
                    <div
                      className="small text-body"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.45,
                        maxWidth: '280px',
                      }}
                      title={fb.message}
                    >
                      {fb.message}
                    </div>
                  </td>
                  <td className="col-feedback-status">
                    <span
                      className={`neu-badge ${
                        fb.status === 'NEW' ? 'neu-badge-warning' : 'neu-badge-success'
                      }`}
                    >
                      {fb.status === 'NEW' ? 'New / Unreviewed' : 'Reviewed'}
                    </span>
                  </td>
                  <td className="col-feedback-actions text-end">
                    <div className="neu-action-btns">
                      <button
                        type="button"
                        className="neu-btn neu-btn-outline neu-btn-sm"
                        onClick={() => handleOpenDetails(fb)}
                        title="View complete feedback file"
                      >
                        <Eye size={13} className="me-1" />
                        Details
                      </button>
                      {fb.status === 'NEW' && (
                        <button
                          type="button"
                          className="neu-btn neu-btn-primary neu-btn-sm"
                          style={{
                            background: '#16845B',
                            color: '#ffffff',
                            boxShadow: '0 4px 10px rgba(22, 132, 91, 0.3)',
                          }}
                          onClick={() => handleQuickMarkReviewed(fb)}
                          disabled={processingId === fb.id}
                          title="Mark feedback as reviewed"
                        >
                          <Check size={13} className="me-1" />
                          {processingId === fb.id ? 'Processing...' : 'Review'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Card List (< 768px) */}
      <div className="d-md-none p-3 d-flex flex-column gap-3">
        {isLoading ? (
          <div className="text-center py-4 text-muted">
            <RotateCw size={24} className="spin-anim mb-2 text-primary" />
            <div>Loading patient experience records...</div>
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="text-center py-4 text-muted">
            <AlertCircle size={28} className="mb-2 text-muted" />
            <div className="fw-semibold">No feedback records match the selected filters.</div>
            <div className="small text-muted mt-1">Try resetting your filters or search keywords.</div>
          </div>
        ) : (
          filteredFeedbacks.map((fb) => (
            <div key={fb.id} className="admin-mobile-card">
              <div className="admin-mobile-card-row">
                <span
                  className="px-2.5 py-1 rounded small fw-bold font-monospace"
                  style={{
                    background: 'var(--hospital-surface)',
                    boxShadow: 'var(--neu-inset)',
                    fontSize: '0.785rem',
                    color: 'var(--hospital-medical-blue)',
                  }}
                >
                  #{fb.id}
                </span>
                <span
                  className={`neu-badge ${
                    fb.status === 'NEW' ? 'neu-badge-warning' : 'neu-badge-success'
                  }`}
                >
                  {fb.status === 'NEW' ? 'New / Unreviewed' : 'Reviewed'}
                </span>
              </div>

              <div className="mt-2">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <RatingStars rating={fb.rating} size={15} />
                  <span className="neu-badge neu-badge-info small">
                    {fb.category_display || fb.category?.replace('_', ' ')}
                  </span>
                </div>
                <div className="fw-bold fs-6 mt-1" style={{ color: 'var(--hospital-primary-navy)' }}>
                  {fb.patient_name}
                </div>
                <span className="small text-muted d-block">{fb.email}</span>
              </div>

              <div
                className="small mt-2 pt-2 border-top"
                style={{ borderColor: 'var(--hospital-border-light)' }}
              >
                <p className="small text-body mb-1" style={{ fontStyle: 'italic', lineHeight: 1.45 }}>
                  "{fb.message}"
                </p>
                <div className="small text-muted text-end" style={{ fontSize: '0.75rem' }}>
                  Submitted: {fb.created_at ? new Date(fb.created_at).toLocaleString() : 'Recent'}
                </div>
              </div>

              <div className="admin-mobile-card-actions">
                {fb.status === 'NEW' && (
                  <button
                    type="button"
                    className="neu-btn neu-btn-primary neu-btn-sm admin-mobile-card-btn-full"
                    style={{
                      background: '#16845B',
                      color: '#ffffff',
                      boxShadow: '0 4px 10px rgba(22, 132, 91, 0.3)',
                    }}
                    onClick={() => handleQuickMarkReviewed(fb)}
                    disabled={processingId === fb.id}
                    title="Mark feedback as reviewed"
                  >
                    <Check size={14} className="me-1" />
                    {processingId === fb.id ? 'Processing...' : 'Mark as Reviewed'}
                  </button>
                )}
                <button
                  type="button"
                  className="neu-btn neu-btn-outline neu-btn-sm admin-mobile-card-btn-full"
                  onClick={() => handleOpenDetails(fb)}
                  title="View full feedback details"
                >
                  <Eye size={14} className="me-1" />
                  View Full Details
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Feedback Details & Review Action Modal */}
      {viewFeedback && (
        <div
          className="modal show d-block glass-modal-backdrop"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div
              className="modal-content glass-modal neu-card p-0"
              style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}
            >
              <div
                className="modal-header px-4 py-3 border-bottom d-flex justify-content-between align-items-center"
                style={{ background: 'var(--hospital-surface)', borderColor: 'var(--hospital-border)' }}
              >
                <div>
                  <h5 className="modal-title fs-6 fw-bold mb-0" style={{ color: 'var(--hospital-primary-navy)' }}>
                    Patient Feedback Record #{viewFeedback.id}
                  </h5>
                  <span className="small text-muted">
                    Submitted: {viewFeedback.created_at ? new Date(viewFeedback.created_at).toLocaleString() : 'Recent'}
                  </span>
                </div>
                <button
                  type="button"
                  className="neu-btn-icon"
                  style={{ width: '44px', height: '44px', minWidth: '44px', minHeight: '44px', padding: 0 }}
                  onClick={() => setViewFeedback(null)}
                  aria-label="Close dialog"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="modal-body p-4" style={{ background: 'var(--hospital-bg)' }}>
                <div className="row g-3 mb-3">
                  {/* Left Column: Patient Demographics */}
                  <div className="col-12 col-md-6">
                    <div
                      className="p-3 neu-card-sm h-100"
                      style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}
                    >
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <User size={16} color="var(--hospital-blue)" />
                        <span className="small text-muted fw-bold text-uppercase">Patient Demographics</span>
                      </div>
                      <div className="small mb-1">
                        <strong>Full Name:</strong> {viewFeedback.patient_name}
                      </div>
                      <div className="small mb-1">
                        <strong>Email Address:</strong> {viewFeedback.email}
                      </div>
                      <div className="small mb-1">
                        <strong>Contact Telephone:</strong> {viewFeedback.phone || 'Not provided'}
                      </div>
                      <div className="small">
                        <strong>Authoritative Status:</strong>{' '}
                        <span
                          className={`neu-badge ms-1 ${
                            viewFeedback.status === 'NEW' ? 'neu-badge-warning' : 'neu-badge-success'
                          }`}
                        >
                          {viewFeedback.status === 'NEW' ? 'New / Unreviewed' : 'Reviewed'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Score & Category */}
                  <div className="col-12 col-md-6">
                    <div
                      className="p-3 neu-card-sm h-100"
                      style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}
                    >
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <Star size={16} color="var(--hospital-cyan)" />
                        <span className="small text-muted fw-bold text-uppercase">Experience Evaluation</span>
                      </div>
                      <div className="small mb-2">
                        <strong>Satisfaction Score:</strong>{' '}
                        <div className="mt-1">
                          <RatingStars rating={viewFeedback.rating} size={18} />
                        </div>
                      </div>
                      <div className="small mb-1">
                        <strong>Category:</strong>{' '}
                        <span className="neu-badge neu-badge-info ms-1">
                          {viewFeedback.category_display || viewFeedback.category}
                        </span>
                      </div>
                      {viewFeedback.reviewed_by_name && (
                        <div className="small text-muted mt-2 pt-2 border-top">
                          <strong>Reviewed By:</strong> {viewFeedback.reviewed_by_name}
                          {viewFeedback.reviewed_at && (
                            <div>
                              <strong>Review Timestamp:</strong>{' '}
                              {new Date(viewFeedback.reviewed_at).toLocaleString()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Feedback Message Body */}
                <div
                  className="p-3 neu-card-sm mb-3"
                  style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}
                >
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <MessageSquare size={16} color="var(--hospital-medical-blue)" />
                    <span className="small text-muted fw-bold text-uppercase">Complete Patient Message</span>
                  </div>
                  <p className="small text-body mb-0" style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {viewFeedback.message}
                  </p>
                </div>

                {/* Administrative Review Notes */}
                <form onSubmit={handleApplyModalReview}>
                  <div
                    className="p-3 neu-card-sm"
                    style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}
                  >
                    <label className="neu-form-label mb-1" htmlFor="admin-review-notes">
                      Administrative Review Notes & Action Taken
                    </label>
                    <textarea
                      id="admin-review-notes"
                      className="neu-input"
                      rows={3}
                      placeholder="Enter operational notes, departmental dispatch info, or clinical resolution summary..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                  </div>

                  <div
                    className="modal-footer px-0 pt-3 pb-0 mt-3 border-top d-flex justify-content-end gap-2"
                    style={{ borderColor: 'var(--hospital-border-light)' }}
                  >
                    <button
                      type="button"
                      className="neu-btn neu-btn-outline neu-btn-sm"
                      onClick={() => setViewFeedback(null)}
                    >
                      Close
                    </button>
                    {viewFeedback.status === 'NEW' && (
                      <button
                        type="submit"
                        className="neu-btn neu-btn-primary neu-btn-sm"
                        style={{ background: '#16845B', color: '#fff' }}
                        disabled={isSubmittingReview}
                      >
                        <Check size={14} className="me-1" />
                        {isSubmittingReview ? 'Applying...' : 'Mark as Reviewed'}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminFeedbackPage;
