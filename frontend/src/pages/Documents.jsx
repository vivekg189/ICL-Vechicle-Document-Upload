import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Eye,
  Trash2,
  RefreshCw,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileWarning,
  Car,
  Loader2,
  UploadCloud,
  CalendarClock,
  MinusCircle
} from 'lucide-react';
import { deleteDocument, getDocumentDownloadUrl, getDocumentViewUrl } from '../services/api';

const DOC_TYPE_COLORS = {
  RC: { bg: 'rgba(37,99,235,0.1)', color: '#1d4ed8', border: 'rgba(37,99,235,0.2)' },
  Insurance: { bg: 'rgba(16,185,129,0.1)', color: '#047857', border: 'rgba(16,185,129,0.25)' },
  PUC: { bg: 'rgba(245,158,11,0.1)', color: '#b45309', border: 'rgba(245,158,11,0.25)' },
  'Driving License': { bg: 'rgba(139,92,246,0.1)', color: '#6d28d9', border: 'rgba(139,92,246,0.25)' },
  'Service Record': { bg: 'rgba(20,184,166,0.1)', color: '#0f766e', border: 'rgba(20,184,166,0.25)' },
  'Pollution Certificate': { bg: 'rgba(234,179,8,0.1)', color: '#a16207', border: 'rgba(234,179,8,0.25)' },
  Other: { bg: 'rgba(100,116,139,0.1)', color: '#475569', border: 'rgba(100,116,139,0.25)' },
};

// Compute expiry info from a date string — mirrors backend logic exactly
function computeExpiryInfo(expiryDateStr) {
  if (!expiryDateStr) {
    return {
      status: 'NO_EXPIRY',
      days: null,
      label: 'No expiry date set',
      badgeLabel: 'NO EXPIRY',
      color: '#64748b',
      bg: 'rgba(100,116,139,0.08)',
      border: 'rgba(100,116,139,0.2)',
      Icon: MinusCircle,
    };
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDateStr); exp.setHours(0, 0, 0, 0);
  const days = Math.round((exp - today) / (1000 * 60 * 60 * 24));

  if (days < 0) {
    const abs = Math.abs(days);
    let label;
    if (abs === 1) label = 'Expired yesterday';
    else if (abs < 30) label = `Expired ${abs} days ago`;
    else if (abs < 365) { const m = Math.floor(abs / 30); label = `Expired ${m} month${m > 1 ? 's' : ''} ago`; }
    else { const y = Math.floor(abs / 365); label = `Expired ${y} year${y > 1 ? 's' : ''} ago`; }
    return { status: 'EXPIRED', days, label, badgeLabel: 'EXPIRED', color: '#b91c1c', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', Icon: FileWarning };
  }

  if (days <= 30) {
    let label;
    if (days === 0) label = 'Expires today!';
    else if (days === 1) label = 'Expires tomorrow';
    else label = `Expires in ${days} days`;
    return { status: 'EXPIRING_SOON', days, label, badgeLabel: 'EXPIRING SOON', color: '#b45309', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', Icon: Clock };
  }

  let label;
  if (days < 365) { const m = Math.round(days / 30); label = `Expires in ${m} month${m > 1 ? 's' : ''}`; }
  else { const y = Math.floor(days / 365); const rm = Math.floor((days % 365) / 30); label = rm ? `Expires in ${y}y ${rm}m` : `Expires in ${y} year${y > 1 ? 's' : ''}`; }
  return { status: 'VALID', days, label, badgeLabel: 'VALID', color: '#047857', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)', Icon: CheckCircle2 };
}

export default function Documents({ documents, isLoading, onRefresh, onNavigateUpload }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  // Enrich each document with computed expiry info
  const enriched = useMemo(() =>
    documents.map((d) => ({
      ...d,
      computed: computeExpiryInfo(d.expiry_date),
    })), [documents]);

  const filtered = useMemo(() => enriched.filter((d) => {
    const matchSearch =
      d.document_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.document_type?.toLowerCase().includes(search.toLowerCase()) ||
      d.vehicle?.registration_number?.toLowerCase().includes(search.toLowerCase()) ||
      d.vehicle?.model?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'All' || d.document_type === typeFilter;
    const matchStatus = statusFilter === 'All' || d.computed.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  }), [enriched, search, typeFilter, statusFilter]);

  const handleDelete = async (id) => {
    setDeletingId(id);
    setDeleteError(null);
    try {
      await deleteDocument(id);
      setConfirmDeleteId(null);
      await onRefresh();
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete document.');
    } finally {
      setDeletingId(null);
    }
  };

  const docTypes = ['All', ...new Set(documents.map((d) => d.document_type).filter(Boolean))];
  const statusOptions = ['All', 'VALID', 'EXPIRING_SOON', 'EXPIRED', 'NO_EXPIRY'];
  const STATUS_LABELS = { All: 'All', VALID: 'Valid', EXPIRING_SOON: 'Expiring Soon', EXPIRED: 'Expired', NO_EXPIRY: 'No Expiry' };

  return (
    <div className="content-area">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Vehicle Documents</h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
            {documents.length} document{documents.length !== 1 ? 's' : ''} in PostgreSQL — status calculated from today's date.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw size={15} className={isLoading ? 'spin' : ''} /><span>Refresh</span>
          </button>
          <button id="btn-docs-upload" className="btn-primary" onClick={onNavigateUpload}>
            <UploadCloud size={18} /><span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="glass-card" style={{ padding: '0.875rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
          <Search size={18} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search by name, type, or vehicle registration..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontFamily: 'inherit', width: '100%', fontSize: '0.9rem', color: '#0f172a' }}
          />
          {search && <button onClick={() => setSearch('')} style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem' }}>Clear</button>}
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {statusOptions.map((s) => {
            const active = statusFilter === s;
            const colors = { VALID: '#059669', EXPIRING_SOON: '#d97706', EXPIRED: '#dc2626', NO_EXPIRY: '#475569' };
            return (
              <button key={s} className="btn-secondary" onClick={() => setStatusFilter(s)}
                style={{ padding: '0.3rem 0.65rem', fontSize: '0.77rem', background: active ? (colors[s] || '#2563eb') : undefined, color: active ? '#fff' : undefined, borderColor: active ? (colors[s] || '#2563eb') : undefined }}>
                {STATUS_LABELS[s]}
              </button>
            );
          })}
          <div style={{ width: '1px', background: '#e2e8f0', margin: '0 0.25rem' }} />
          {docTypes.map((t) => (
            <button key={t} className="btn-secondary" onClick={() => setTypeFilter(t)}
              style={{ padding: '0.3rem 0.65rem', fontSize: '0.77rem', background: typeFilter === t ? '#2563eb' : undefined, color: typeFilter === t ? '#fff' : undefined, borderColor: typeFilter === t ? '#2563eb' : undefined }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {deleteError && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#b91c1c' }}>
          {deleteError}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <Loader2 size={36} className="spin" style={{ color: '#2563eb', margin: '0 auto 1rem' }} />
          <p style={{ color: '#64748b' }}>Loading documents from PostgreSQL...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="empty-state-card" id="documents-empty-state">
          <div className="empty-state-icon-box"><FileText size={38} strokeWidth={2} /></div>
          <h2 className="empty-state-title" style={{ fontSize: '1.5rem' }}>No Documents Uploaded Yet</h2>
          <p className="empty-state-description">
            Upload RC, Insurance, PUC and more. Status is automatically tracked from their expiry dates.
          </p>
          <button className="btn-primary" onClick={onNavigateUpload} style={{ padding: '0.75rem 1.75rem' }}>
            <UploadCloud size={18} /><span>Upload First Document</span>
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: '#64748b', marginBottom: '1rem' }}>No documents match your filters.</p>
          <button className="btn-secondary" onClick={() => { setSearch(''); setTypeFilter('All'); setStatusFilter('All'); }}>Reset Filters</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {filtered.map((doc) => {
            const typeStyle = DOC_TYPE_COLORS[doc.document_type] || DOC_TYPE_COLORS.Other;
            const exp = doc.computed;
            const StatusIcon = exp.Icon;
            const isConfirmingDelete = confirmDeleteId === doc.id;
            const isDeleting = deletingId === doc.id;

            return (
              <div key={doc.id} id={`doc-card-${doc.id}`} className="glass-panel"
                style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>

                {/* Document type icon */}
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: typeStyle.bg, color: typeStyle.color, border: `1px solid ${typeStyle.border}` }}>
                  <FileText size={22} />
                </div>

                {/* Main info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>{doc.document_name}</span>
                    {/* Document type badge */}
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.18rem 0.5rem', borderRadius: '6px', background: typeStyle.bg, color: typeStyle.color, border: `1px solid ${typeStyle.border}` }}>
                      {doc.document_type}
                    </span>
                    {/* Status badge */}
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.18rem 0.5rem', borderRadius: '6px', background: exp.bg, color: exp.color, border: `1px solid ${exp.border}`, display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <StatusIcon size={11} />
                      {exp.badgeLabel}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.82rem', color: '#64748b' }}>
                    {/* Vehicle */}
                    {doc.vehicle && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Car size={13} />
                        {doc.vehicle.registration_number} — {doc.vehicle.manufacturer} {doc.vehicle.model}
                      </span>
                    )}
                    {/* Days remaining / expiry label — the key feature */}
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: exp.color, fontWeight: 600 }}>
                      <CalendarClock size={13} />
                      {exp.label}
                    </span>
                    {/* Upload date */}
                    <span>Uploaded: {new Date(doc.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    {/* Notes */}
                    {doc.notes && (
                      <span style={{ fontStyle: 'italic', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.notes}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {isConfirmingDelete ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.78rem', color: '#b91c1c', fontWeight: 600 }}>Delete this document?</span>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                      <button id={`btn-confirm-delete-doc-${doc.id}`} className="btn-primary"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: '#dc2626' }}
                        onClick={() => handleDelete(doc.id)} disabled={isDeleting}>
                        {isDeleting ? <Loader2 size={12} className="spin" /> : <Trash2 size={12} />}
                        <span>{isDeleting ? 'Deleting...' : 'Confirm'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    <a id={`btn-view-doc-${doc.id}`} href={getDocumentViewUrl(doc.id)} target="_blank" rel="noopener noreferrer"
                      className="btn-secondary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', textDecoration: 'none' }} title="View PDF">
                      <Eye size={15} /><span>View</span>
                    </a>
                    <a id={`btn-download-doc-${doc.id}`} href={getDocumentDownloadUrl(doc.id)} download
                      className="btn-secondary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', textDecoration: 'none' }} title="Download PDF">
                      <Download size={15} /><span>Download</span>
                    </a>
                    <button id={`btn-delete-doc-${doc.id}`} className="btn-icon"
                      style={{ color: '#ef4444', width: '36px', height: '36px' }}
                      onClick={() => setConfirmDeleteId(doc.id)} title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
