import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  FileWarning,
  RefreshCw,
  Car,
  FileText,
  CalendarClock,
  Eye,
  Download,
  Clock,
  Loader2,
  UploadCloud
} from 'lucide-react';
import { getDocumentDownloadUrl, getDocumentViewUrl } from '../services/api';

// Mirror backend logic: compute days + status from today's actual date
function computeExpiry(expiryDateStr) {
  if (!expiryDateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDateStr); exp.setHours(0, 0, 0, 0);
  const days = Math.round((exp - today) / (1000 * 60 * 60 * 24));
  return days;
}

function buildLabel(days) {
  if (days < 0) {
    const abs = Math.abs(days);
    if (abs === 1) return 'Expired yesterday';
    if (abs < 30) return `Expired ${abs} days ago`;
    const m = Math.floor(abs / 30);
    return `Expired ${m} month${m > 1 ? 's' : ''} ago`;
  }
  if (days === 0) return 'Expires today!';
  if (days === 1) return 'Expires tomorrow';
  if (days <= 30) return `Expires in ${days} days`;
  const m = Math.round(days / 30);
  return `Expires in ${m} month${m > 1 ? 's' : ''}`;
}

const URGENCY = [
  { key: 'expired', label: 'Expired', color: '#b91c1c', bg: 'rgba(239,68,68,0.09)', border: 'rgba(239,68,68,0.3)', Icon: FileWarning, test: (d) => d < 0 },
  { key: 'week', label: 'Within 7 Days', color: '#dc2626', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.2)', Icon: AlertTriangle, test: (d) => d >= 0 && d <= 7 },
  { key: 'fortnight', label: 'Within 15 Days', color: '#d97706', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', Icon: Clock, test: (d) => d > 7 && d <= 15 },
  { key: 'month', label: 'Within 30 Days', color: '#ca8a04', bg: 'rgba(250,204,21,0.07)', border: 'rgba(250,204,21,0.25)', Icon: Clock, test: (d) => d > 15 && d <= 30 },
];

export default function ExpiringSoon({ documents, stats, isLoading, onRefresh }) {
  const [windowFilter, setWindowFilter] = useState('all');

  // Build list of all docs with an expiry date + computed days
  const withDays = useMemo(() =>
    documents
      .filter((d) => d.expiry_date)
      .map((d) => ({ ...d, days: computeExpiry(d.expiry_date), label: buildLabel(computeExpiry(d.expiry_date)) }))
      .sort((a, b) => a.days - b.days),     // most urgent first
    [documents]);

  // Categorised counts
  const counts = useMemo(() => {
    const c = { expired: 0, week: 0, fortnight: 0, month: 0 };
    for (const d of withDays) {
      if (d.days < 0) c.expired++;
      else if (d.days <= 7) c.week++;
      else if (d.days <= 15) c.fortnight++;
      else if (d.days <= 30) c.month++;
    }
    return c;
  }, [withDays]);

  // Filter list based on selected window
  const displayList = useMemo(() => {
    if (windowFilter === 'all') return withDays.filter((d) => d.days <= 30);
    if (windowFilter === 'expired') return withDays.filter((d) => d.days < 0);
    if (windowFilter === 'week') return withDays.filter((d) => d.days >= 0 && d.days <= 7);
    if (windowFilter === 'fortnight') return withDays.filter((d) => d.days > 7 && d.days <= 15);
    if (windowFilter === 'month') return withDays.filter((d) => d.days > 15 && d.days <= 30);
    return withDays.filter((d) => d.days <= 30);
  }, [withDays, windowFilter]);

  const totalAlerts = counts.expired + counts.week + counts.fortnight + counts.month;

  const getUrgency = (days) => URGENCY.find((u) => u.test(days)) || URGENCY[URGENCY.length - 1];

  return (
    <div className="content-area">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Expiring Soon</h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
            Tracking {documents.filter((d) => d.expiry_date).length} document{documents.filter((d) => d.expiry_date).length !== 1 ? 's' : ''} with expiry dates.
            Status computed from today's actual date.
          </p>
        </div>
        <button className="btn-secondary" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw size={15} className={isLoading ? 'spin' : ''} /><span>Refresh</span>
        </button>
      </div>

      {/* Summary Cards — all computed from real dates */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {URGENCY.map((u) => {
          const Icon = u.Icon;
          const count = counts[u.key];
          return (
            <div key={u.key} className="glass-card"
              onClick={() => setWindowFilter(windowFilter === u.key ? 'all' : u.key)}
              style={{ padding: '1.1rem 1.25rem', border: `1px solid ${u.border}`, background: u.bg, cursor: 'pointer', transition: 'all 0.15s', outline: windowFilter === u.key ? `2px solid ${u.color}` : 'none', outlineOffset: '2px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: u.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{u.label}</div>
                <Icon size={15} color={u.color} />
              </div>
              {isLoading ? <Loader2 size={22} className="spin" color={u.color} /> : (
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{count}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Filter Tabs */}
      <div className="glass-card" style={{ padding: '0.75rem 1rem', marginBottom: '2rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: `All Expiring (${totalAlerts})` },
          { key: 'expired', label: `Expired (${counts.expired})` },
          { key: 'week', label: `≤7 Days (${counts.week})` },
          { key: 'fortnight', label: `≤15 Days (${counts.fortnight})` },
          { key: 'month', label: `≤30 Days (${counts.month})` },
        ].map((f) => (
          <button key={f.key} className="btn-secondary"
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', background: windowFilter === f.key ? '#2563eb' : undefined, color: windowFilter === f.key ? '#fff' : undefined, borderColor: windowFilter === f.key ? '#2563eb' : undefined }}
            onClick={() => setWindowFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Document List */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <Loader2 size={36} className="spin" style={{ color: '#2563eb', margin: '0 auto 1rem' }} />
          <p style={{ color: '#64748b' }}>Loading from PostgreSQL...</p>
        </div>
      ) : totalAlerts === 0 ? (
        <div className="empty-state-card">
          <div className="empty-state-icon-box" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', borderColor: 'rgba(16,185,129,0.25)' }}>
            <CheckCircle2 size={38} strokeWidth={2.2} />
          </div>
          <h2 className="empty-state-title" style={{ fontSize: '1.5rem' }}>All Clear!</h2>
          <p className="empty-state-description">
            {documents.length === 0
              ? 'No documents uploaded yet. Upload documents with expiry dates to track them here.'
              : 'No documents are expiring within the next 30 days. Your fleet is up to date!'}
          </p>
        </div>
      ) : displayList.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: '#64748b', marginBottom: '0.75rem' }}>No documents in this timeframe.</p>
          <button className="btn-secondary" onClick={() => setWindowFilter('all')}>Show All Expiring</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {displayList.map((doc) => {
            const u = getUrgency(doc.days);
            const Icon = u.Icon;
            return (
              <div key={doc.id} className="glass-panel"
                style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', border: `1px solid ${u.border}`, background: u.bg }}>

                <div style={{ width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0, background: 'rgba(255,255,255,0.7)', color: u.color, border: `1px solid ${u.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={22} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {doc.document_name}
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '6px', background: 'rgba(255,255,255,0.7)', color: u.color, border: `1px solid ${u.border}` }}>
                      {doc.label}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FileText size={13} />{doc.document_type}</span>
                    {doc.vehicle && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Car size={13} />{doc.vehicle.registration_number} — {doc.vehicle.model}
                      </span>
                    )}
                    {doc.expiry_date && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: u.color, fontWeight: 600 }}>
                        <CalendarClock size={13} />
                        Expiry: {new Date(doc.expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <a href={getDocumentViewUrl(doc.id)} target="_blank" rel="noopener noreferrer"
                    className="btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', textDecoration: 'none' }}>
                    <Eye size={14} /><span>View</span>
                  </a>
                  <a href={getDocumentDownloadUrl(doc.id)} download
                    className="btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', textDecoration: 'none' }}>
                    <Download size={14} /><span>Download</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
