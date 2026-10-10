import React, { useState, useEffect, useCallback } from 'react';
import {
  Car,
  Plus,
  Server,
  CheckCircle2,
  RefreshCw,
  FileText,
  AlertTriangle,
  FileWarning,
  ArrowRight,
  BellRing,
  ShieldCheck,
  Clock,
  UploadCloud,
  Loader2,
  CalendarClock,
  Download,
  Eye,
  ChevronRight,
  ShieldAlert,
  FolderOpen,
  Calendar,
  Layers,
  User,
  Hash,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { getDashboard, getDocumentDownloadUrl, getDocumentViewUrl } from '../services/api';
import { toast } from '../components/ToastContainer';

// Status badge styling config
const STATUS_CONFIG = {
  VALID: {
    bg: 'rgba(16, 185, 129, 0.1)',
    color: '#047857',
    border: 'rgba(16, 185, 129, 0.25)',
    badgeBg: '#ecfdf5',
    label: 'VALID',
    dot: '#10b981',
  },
  EXPIRING_SOON: {
    bg: 'rgba(245, 158, 11, 0.1)',
    color: '#b45309',
    border: 'rgba(245, 158, 11, 0.3)',
    badgeBg: '#fffbeb',
    label: 'EXPIRING SOON',
    dot: '#f59e0b',
  },
  EXPIRED: {
    bg: 'rgba(239, 68, 68, 0.1)',
    color: '#b91c1c',
    border: 'rgba(239, 68, 68, 0.3)',
    badgeBg: '#fef2f2',
    label: 'EXPIRED',
    dot: '#ef4444',
  },
  NO_EXPIRY: {
    bg: 'rgba(100, 116, 139, 0.08)',
    color: '#64748b',
    border: 'rgba(100, 116, 139, 0.2)',
    badgeBg: '#f8fafc',
    label: 'NO EXPIRY',
    dot: '#94a3b8',
  },
};

export default function Dashboard({
  backendHealth,
  onRefreshHealth,
  onOpenAddVehicle,
  onNavigate,
  vehicles = [],
  selectedVehicleId,
  onSelectVehicle,
}) {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeVehicleId, setActiveVehicleId] = useState(selectedVehicleId || null);

  // Fetch unified dashboard data from GET /api/dashboard
  const fetchDashboard = useCallback(async (vId = null, isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await getDashboard(vId);
      setDashboardData(data);
      if (data.vehicle_overview && !activeVehicleId) {
        setActiveVehicleId(data.vehicle_overview.id);
      }
      if (isManual) {
        toast('Dashboard data refreshed from PostgreSQL', 'info');
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(err.message || 'Failed to connect to backend dashboard endpoint');
      if (isManual) {
        toast('Failed to load dashboard data: ' + err.message, 'error');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeVehicleId]);

  useEffect(() => {
    fetchDashboard(activeVehicleId);
  }, [activeVehicleId, fetchDashboard]);

  // Keep activeVehicleId in sync if parent selection changes
  useEffect(() => {
    if (selectedVehicleId && selectedVehicleId !== activeVehicleId) {
      setActiveVehicleId(selectedVehicleId);
    }
  }, [selectedVehicleId]);

  const handleSelectVehicle = (id) => {
    setActiveVehicleId(id);
    if (onSelectVehicle) onSelectVehicle(id);
  };

  const handleDownload = (docId, fileName) => {
    try {
      const url = getDocumentDownloadUrl(docId);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast(`Downloading ${fileName || 'document'}...`, 'info');
    } catch (err) {
      toast(`Download failed: ${err.message}`, 'error');
    }
  };

  // Safe extractions from dynamic API data
  const vehicleOverview = dashboardData?.vehicle_overview || null;
  const allVehicles = dashboardData?.vehicles || vehicles || [];
  const stats = dashboardData?.statistics || {
    total_vehicles: 0,
    total_documents: 0,
    valid: 0,
    expiring_soon: 0,
    expired: 0,
    no_expiry: 0,
  };
  const recentDocuments = dashboardData?.recent_documents || [];
  const expiryAlerts = dashboardData?.expiry_alerts || [];

  return (
    <div className="content-area" style={{ maxWidth: '1440px', margin: '0 auto' }}>
      {/* ── TOP HEADER / BACKEND STATUS BAR ── */}
      <section className="backend-card" id="backend-status-section" style={{ marginBottom: '1.75rem' }}>
        <div className="backend-info">
          <div className={`backend-icon-badge ${backendHealth.connected ? 'connected' : 'disconnected'}`}>
            <Server size={22} />
          </div>
          <div>
            <div className="backend-title">Backend & Database Status</div>
            <div className="backend-status-display">
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  display: 'inline-block',
                  background: backendHealth.connected ? '#10b981' : '#ef4444',
                  boxShadow: backendHealth.connected ? '0 0 10px rgba(16,185,129,0.6)' : 'none',
                }}
              />
              <span style={{ color: backendHealth.connected ? '#047857' : '#b91c1c', fontWeight: 600 }}>
                {backendHealth.loading ? 'Verifying...' : backendHealth.connected ? 'PostgreSQL Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="backend-details-text">
              {backendHealth.connected ? (
                <>
                  <span style={{ fontWeight: 600 }}>Response:</span> &quot;{backendHealth.message}&quot;
                  <span style={{ marginLeft: '8px', color: '#059669', fontWeight: 600 }}>
                    • Engine: PostgreSQL (Live Query SELECT 1)
                  </span>
                  {backendHealth.latency !== null && (
                    <span style={{ marginLeft: '8px', color: '#64748b' }}>
                      ({backendHealth.latency}ms • {backendHealth.endpoint})
                    </span>
                  )}
                </>
              ) : (
                <span style={{ color: '#b91c1c' }}>{backendHealth.message}</span>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            id="btn-recheck-backend"
            className="btn-secondary"
            onClick={onRefreshHealth}
            disabled={backendHealth.loading}
            style={{ fontSize: '0.825rem', padding: '0.5rem 0.9rem' }}
          >
            <RefreshCw size={14} className={backendHealth.loading ? 'spin' : ''} />
            <span>Health Check</span>
          </button>
          <button
            id="btn-refresh-dashboard"
            className="btn-secondary"
            onClick={() => fetchDashboard(activeVehicleId, true)}
            disabled={refreshing || loading}
            style={{ fontSize: '0.825rem', padding: '0.5rem 0.9rem' }}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>
        </div>
      </section>

      {/* ── ERROR STATE ── */}
      {error && !loading && (
        <section
          className="glass-panel"
          style={{
            padding: '1.75rem',
            marginBottom: '1.75rem',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            background: 'rgba(254, 242, 242, 0.85)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertCircle size={28} color="#dc2626" />
              <div>
                <h3 style={{ color: '#991b1b', fontSize: '1.05rem', margin: 0 }}>Error Loading Dashboard Data</h3>
                <p style={{ color: '#b91c1c', fontSize: '0.85rem', margin: '4px 0 0 0' }}>{error}</p>
              </div>
            </div>
            <button
              className="btn-primary"
              onClick={() => fetchDashboard(activeVehicleId, true)}
              style={{ background: '#dc2626', borderColor: '#b91c1c', padding: '0.6rem 1.25rem' }}
            >
              <RefreshCw size={15} />
              <span>Retry</span>
            </button>
          </div>
        </section>
      )}

      {/* ── SECTION 5: QUICK ACTIONS (Prominent Top Glass Bar) ── */}
      <section
        className="glass-panel"
        id="dashboard-quick-actions-bar"
        style={{
          padding: '1.25rem 1.75rem',
          marginBottom: '2rem',
          background: 'rgba(255, 255, 255, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            }}
          >
            <Sparkles size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.05rem', margin: 0, color: '#0f172a' }}>Quick Actions</h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Instant management shortcuts for fleet & documents</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Action 1: Add Vehicle */}
          <button
            id="btn-quick-add-vehicle"
            className="btn-primary"
            onClick={onOpenAddVehicle}
            style={{ padding: '0.7rem 1.25rem', fontSize: '0.875rem', borderRadius: '12px' }}
          >
            <Plus size={17} strokeWidth={2.5} />
            <span>Add Vehicle</span>
          </button>

          {/* Action 2: Upload Document */}
          <button
            id="btn-quick-upload-doc"
            className="btn-secondary"
            onClick={() => onNavigate('upload')}
            style={{
              padding: '0.7rem 1.25rem',
              fontSize: '0.875rem',
              borderRadius: '12px',
              background: 'rgba(37, 99, 235, 0.08)',
              color: '#2563eb',
              borderColor: 'rgba(37, 99, 235, 0.3)',
            }}
          >
            <UploadCloud size={17} />
            <span>Upload Document</span>
          </button>

          {/* Action 3: View Documents */}
          <button
            id="btn-quick-view-docs"
            className="btn-secondary"
            onClick={() => onNavigate('documents')}
            style={{ padding: '0.7rem 1.25rem', fontSize: '0.875rem', borderRadius: '12px' }}
          >
            <FileText size={17} />
            <span>View Documents</span>
          </button>
        </div>
      </section>

      {/* ── SECTION 2: DYNAMIC STATISTICS ── */}
      <section style={{ marginBottom: '2rem' }} id="dashboard-statistics-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', color: '#0f172a', margin: 0 }}>Document Expiry Statistics</h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>Live counts calculated from PostgreSQL and today&apos;s date</p>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#059669', background: 'rgba(16, 185, 129, 0.1)', padding: '0.25rem 0.65rem', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
            ● Dynamic PostgreSQL Sync
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          {/* Card 1: Total Documents */}
          <div
            className="glass-card"
            id="stat-total-documents"
            onClick={() => onNavigate('documents')}
            style={{
              padding: '1.5rem',
              cursor: 'pointer',
              border: '1px solid rgba(37, 99, 235, 0.2)',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(239, 246, 255, 0.75))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, color: '#2563eb', letterSpacing: '0.05em' }}>
                Total Documents
              </span>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(37, 99, 235, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                <FileText size={18} />
              </div>
            </div>
            {loading ? (
              <Loader2 size={24} className="spin" color="#2563eb" />
            ) : (
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{stats.total_documents}</div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Across all registered vehicles</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2563eb', display: 'flex', alignItems: 'center', gap: '2px' }}>
                View all <ArrowRight size={12} />
              </span>
            </div>
          </div>

          {/* Card 2: Valid Documents */}
          <div
            className="glass-card"
            id="stat-valid-documents"
            onClick={() => onNavigate('documents')}
            style={{
              padding: '1.5rem',
              cursor: 'pointer',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(236, 253, 245, 0.75))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, color: '#059669', letterSpacing: '0.05em' }}>
                Valid
              </span>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                <CheckCircle2 size={18} />
              </div>
            </div>
            {loading ? (
              <Loader2 size={24} className="spin" color="#059669" />
            ) : (
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{stats.valid}</div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>&gt; 30 days remaining</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#059669', display: 'flex', alignItems: 'center', gap: '2px' }}>
                Compliant <ShieldCheck size={12} />
              </span>
            </div>
          </div>

          {/* Card 3: Expiring Soon */}
          <div
            className="glass-card"
            id="stat-expiring-soon"
            onClick={() => onNavigate('expiring')}
            style={{
              padding: '1.5rem',
              cursor: 'pointer',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(254, 252, 232, 0.75))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, color: '#d97706', letterSpacing: '0.05em' }}>
                Expiring Soon
              </span>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                <Clock size={18} />
              </div>
            </div>
            {loading ? (
              <Loader2 size={24} className="spin" color="#d97706" />
            ) : (
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{stats.expiring_soon}</div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Expires within 30 days</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#d97706', display: 'flex', alignItems: 'center', gap: '2px' }}>
                Review now <ArrowRight size={12} />
              </span>
            </div>
          </div>

          {/* Card 4: Expired */}
          <div
            className="glass-card"
            id="stat-expired-documents"
            onClick={() => onNavigate('expiring')}
            style={{
              padding: '1.5rem',
              cursor: 'pointer',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(254, 242, 242, 0.75))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, color: '#dc2626', letterSpacing: '0.05em' }}>
                Expired
              </span>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                <FileWarning size={18} />
              </div>
            </div>
            {loading ? (
              <Loader2 size={24} className="spin" color="#dc2626" />
            ) : (
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{stats.expired}</div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Action required immediately</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '2px' }}>
                Needs renewal <AlertTriangle size={12} />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: EXPIRY ALERTS ── */}
      <section style={{ marginBottom: '2rem' }} id="dashboard-expiry-alerts-section">
        {expiryAlerts.length > 0 ? (
          <div
            className="glass-panel"
            style={{
              padding: '1.75rem',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(254, 243, 199, 0.55))',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                  <BellRing size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', color: '#92400e', fontWeight: 700, margin: 0 }}>
                    Expiry Alerts ({expiryAlerts.length})
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#b45309', margin: '2px 0 0 0' }}>
                    Critical documents requiring renewal attention
                  </p>
                </div>
              </div>
              <button
                className="btn-secondary"
                onClick={() => onNavigate('expiring')}
                style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
              >
                <span>View All Expiring & Expired</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {expiryAlerts.map((alert, idx) => {
                const isExpired = alert.expiry_status?.status === 'EXPIRED';
                const style = isExpired ? STATUS_CONFIG.EXPIRED : STATUS_CONFIG.EXPIRING_SOON;

                return (
                  <div
                    key={alert.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                      padding: '1rem 1.25rem',
                      borderRadius: '14px',
                      background: 'rgba(255, 255, 255, 0.85)',
                      border: `1px solid ${style.border}`,
                      boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          background: style.bg,
                          color: style.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {isExpired ? <FileWarning size={18} /> : <AlertTriangle size={18} />}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                            {alert.document_name}
                          </span>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.5rem',
                              borderRadius: '6px',
                              background: style.badgeBg,
                              color: style.color,
                              border: `1px solid ${style.border}`,
                            }}
                          >
                            {alert.expiry_status?.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                          {alert.document_type}
                          {alert.vehicle?.registration_number && (
                            <span style={{ marginLeft: '6px', fontWeight: 600, color: '#1e293b' }}>
                              • Vehicle: {alert.vehicle.registration_number} ({alert.vehicle.manufacturer} {alert.vehicle.model})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: style.color, display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                          <CalendarClock size={14} />
                          <span>{alert.expiry_status?.label || 'Alert'}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Expiry: {alert.expiry_date}
                        </div>
                      </div>

                      <button
                        className="btn-secondary"
                        onClick={() => handleDownload(alert.id, alert.file_name)}
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
                        title="Download Document"
                      >
                        <Download size={13} />
                        <span>View</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div
            className="glass-panel"
            style={{
              padding: '1.25rem 1.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(236, 253, 245, 0.7)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 style={{ margin: 0, color: '#065f46', fontSize: '0.95rem' }}>All Documents Up To Date</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#047857' }}>
                  No expired documents or documents expiring within the next 30 days.
                </p>
              </div>
            </div>
            <button
              className="btn-secondary"
              onClick={() => onNavigate('documents')}
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
            >
              <span>View Documents</span>
            </button>
          </div>
        )}
      </section>

      {/* ── SECTION 1: VEHICLE OVERVIEW ── */}
      <section style={{ marginBottom: '2rem' }} id="dashboard-vehicle-overview-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', color: '#0f172a', margin: 0 }}>Vehicle Overview</h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>Detailed profile of your registered vehicle from PostgreSQL</p>
          </div>

          {/* Vehicle switcher tabs if multiple vehicles exist */}
          {allVehicles.length > 1 && (
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {allVehicles.map((v) => {
                const isSelected = (vehicleOverview?.id === v.id) || (activeVehicleId === v.id);
                return (
                  <button
                    key={v.id}
                    onClick={() => handleSelectVehicle(v.id)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: isSelected ? '1px solid #2563eb' : '1px solid #cbd5e1',
                      background: isSelected ? '#2563eb' : '#fff',
                      color: isSelected ? '#fff' : '#475569',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {v.registration_number}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {loading && !vehicleOverview ? (
          <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
            <Loader2 size={32} className="spin" color="#2563eb" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Loading vehicle details from database...</p>
          </div>
        ) : !vehicleOverview ? (
          /* Empty State if no vehicle exists */
          <div className="empty-state-card" id="vehicle-overview-empty-state">
            <div className="empty-state-icon-box">
              <Car size={38} strokeWidth={2.2} />
            </div>
            <h2 className="empty-state-title">No Vehicles Registered</h2>
            <p className="empty-state-description">
              Get started by adding your vehicle to securely track documents, PUC, insurance, and expiry dates.
            </p>
            <button
              id="btn-empty-add-vehicle"
              className="btn-primary"
              onClick={onOpenAddVehicle}
              style={{ padding: '0.85rem 2rem', fontSize: '1rem', borderRadius: '14px' }}
            >
              <Plus size={20} strokeWidth={2.5} />
              <span>Add Vehicle</span>
            </button>
          </div>
        ) : (
          /* Vehicle Overview Card */
          <div
            className="glass-panel"
            style={{
              padding: '2rem',
              background: 'rgba(255, 255, 255, 0.88)',
              border: '1px solid rgba(226, 232, 240, 0.9)',
            }}
          >
            {/* Header row with Title and Fleet Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                    border: '1px solid rgba(37, 99, 235, 0.2)',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.1)',
                  }}
                >
                  <Car size={28} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Primary Vehicle Overview
                    </span>
                    <span style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#475569', padding: '0.1rem 0.5rem', borderRadius: '6px', fontWeight: 600 }}>
                      ID #{vehicleOverview.id}
                    </span>
                  </div>
                  <h2 style={{ fontSize: '1.75rem', margin: '2px 0 0 0', color: '#0f172a' }}>
                    {vehicleOverview.manufacturer} {vehicleOverview.model}
                  </h2>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  className="btn-secondary"
                  onClick={() => onNavigate('vehicles')}
                  style={{ fontSize: '0.85rem', padding: '0.55rem 1rem' }}
                >
                  <span>Manage Fleet ({allVehicles.length})</span>
                  <ArrowRight size={14} />
                </button>
                <button
                  className="btn-primary"
                  onClick={() => onNavigate('upload')}
                  style={{ fontSize: '0.85rem', padding: '0.55rem 1rem' }}
                >
                  <UploadCloud size={15} />
                  <span>Upload Doc</span>
                </button>
              </div>
            </div>

            {/* 5 Explicit Fields Grid: Owner, Registration Number, Manufacturer, Model, Vehicle Type */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
              }}
            >
              {/* Field 1: Owner */}
              <div
                style={{
                  background: '#ffffff',
                  padding: '1.15rem 1.25rem',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
                  <User size={13} />
                  <span>Owner</span>
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>
                  {vehicleOverview.owner_name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '3px' }}>Registered Custodian</div>
              </div>

              {/* Field 2: Registration Number */}
              <div
                style={{
                  background: '#ffffff',
                  padding: '1.15rem 1.25rem',
                  borderRadius: '14px',
                  border: '1px solid #bfdbfe',
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#2563eb', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
                  <Hash size={13} />
                  <span>Registration Number</span>
                </div>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: '#1e40af',
                    fontFamily: 'monospace',
                    letterSpacing: '0.04em',
                    marginTop: '5px',
                  }}
                >
                  {vehicleOverview.registration_number}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '3px', fontWeight: 600 }}>Active Plate</div>
              </div>

              {/* Field 3: Manufacturer */}
              <div
                style={{
                  background: '#ffffff',
                  padding: '1.15rem 1.25rem',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
                  <Layers size={13} />
                  <span>Manufacturer</span>
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>
                  {vehicleOverview.manufacturer}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '3px' }}>Automaker Brand</div>
              </div>

              {/* Field 4: Model */}
              <div
                style={{
                  background: '#ffffff',
                  padding: '1.15rem 1.25rem',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
                  <Car size={13} />
                  <span>Model</span>
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>
                  {vehicleOverview.model}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '3px' }}>
                  Year: {vehicleOverview.manufacturing_year || 'N/A'}
                </div>
              </div>

              {/* Field 5: Vehicle Type */}
              <div
                style={{
                  background: '#ffffff',
                  padding: '1.15rem 1.25rem',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
                  <FolderOpen size={13} />
                  <span>Vehicle Type</span>
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>
                  {vehicleOverview.vehicle_type}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '3px' }}>Class Classification</div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── SECTION 3: RECENT DOCUMENTS ── */}
      <section style={{ marginBottom: '2rem' }} id="dashboard-recent-documents-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', color: '#0f172a', margin: 0 }}>Recent Documents</h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>Latest uploads with calculated validity and countdowns</p>
          </div>
          <button
            className="btn-secondary"
            onClick={() => onNavigate('documents')}
            style={{ fontSize: '0.85rem', padding: '0.45rem 1rem' }}
          >
            <span>View All Documents</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {loading && recentDocuments.length === 0 ? (
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
            <Loader2 size={28} className="spin" color="#2563eb" style={{ margin: '0 auto 10px' }} />
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Loading recent documents...</p>
          </div>
        ) : recentDocuments.length === 0 ? (
          <div
            className="glass-panel"
            style={{
              padding: '2.5rem',
              textAlign: 'center',
              background: 'rgba(255, 255, 255, 0.85)',
            }}
          >
            <FileText size={40} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.1rem', color: '#1e293b', marginBottom: '6px' }}>No Documents Uploaded Yet</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
              Upload vehicle documents like RC, Insurance, PUC, or Fitness certificates to start automatic expiry tracking.
            </p>
            <button
              className="btn-primary"
              onClick={() => onNavigate('upload')}
              style={{ padding: '0.7rem 1.5rem', fontSize: '0.875rem' }}
            >
              <UploadCloud size={16} />
              <span>Upload Document</span>
            </button>
          </div>
        ) : (
          <div
            className="glass-panel"
            style={{
              padding: 0,
              overflow: 'hidden',
              background: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(226, 232, 240, 0.8)',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                      Document Name
                    </th>
                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                      Category
                    </th>
                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                      Vehicle Plate
                    </th>
                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                      Expiry Date & Status
                    </th>
                    <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentDocuments.map((doc, idx) => {
                    const statusKey = doc.expiry_status?.status || 'NO_EXPIRY';
                    const cfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.NO_EXPIRY;

                    return (
                      <tr
                        key={doc.id || idx}
                        style={{
                          borderBottom: idx === recentDocuments.length - 1 ? 'none' : '1px solid #f1f5f9',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* Doc Name */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: '#eff6ff',
                                color: '#2563eb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <FileText size={18} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                                {doc.document_name}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                {doc.file_name}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span
                            style={{
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              background: '#f1f5f9',
                              color: '#334155',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '6px',
                            }}
                          >
                            {doc.document_type}
                          </span>
                        </td>

                        {/* Vehicle */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                color: '#1e293b',
                                background: '#f8fafc',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0',
                              }}
                            >
                              {doc.vehicle?.registration_number || '—'}
                            </span>
                          </div>
                        </td>

                        {/* Expiry & Status */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '6px',
                                  background: cfg.badgeBg,
                                  color: cfg.color,
                                  border: `1px solid ${cfg.border}`,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.dot }} />
                                {statusKey}
                              </span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: cfg.color }}>
                                {doc.expiry_status?.label}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {doc.expiry_date ? `Expires: ${doc.expiry_date}` : 'No expiry set'}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <button
                            className="btn-secondary"
                            onClick={() => handleDownload(doc.id, doc.file_name)}
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
                            title="Download Document"
                          >
                            <Download size={13} />
                            <span>Download</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
