import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Car,
  FileText,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  FilePlus,
  Info
} from 'lucide-react';
import { uploadDocument } from '../services/api';

const DOCUMENT_TYPES = [
  'RC',
  'Insurance',
  'PUC',
  'Driving License',
  'Service Record',
  'Pollution Certificate',
  'Other',
];

const MAX_SIZE_MB = 10;

export default function UploadDocument({ vehicles, onDocumentUploaded }) {
  const [form, setForm] = useState({
    vehicle_id: '',
    document_name: '',
    document_type: 'RC',
    issue_date: '',
    expiry_date: '',
    notes: '',
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState({});
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [successDoc, setSuccessDoc] = useState(null);
  const [apiError, setApiError] = useState(null);
  const fileInputRef = useRef(null);

  // Auto-select first vehicle
  useEffect(() => {
    if (vehicles.length > 0 && !form.vehicle_id) {
      setForm((f) => ({ ...f, vehicle_id: vehicles[0].id.toString() }));
    }
  }, [vehicles]);

  const validate = () => {
    const errs = {};
    if (!form.vehicle_id) errs.vehicle_id = 'Please select a vehicle.';
    if (!form.document_name.trim()) errs.document_name = 'Document name is required.';
    if (!form.document_type) errs.document_type = 'Document type is required.';
    if (!selectedFile) errs.file = 'Please select a PDF file to upload.';
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop().toLowerCase();
      if (ext !== 'pdf') errs.file = 'Only PDF files are accepted.';
      else if (selectedFile.size > MAX_SIZE_MB * 1024 * 1024)
        errs.file = `File size must be under ${MAX_SIZE_MB}MB. Selected: ${(selectedFile.size / 1024 / 1024).toFixed(1)}MB.`;
    }
    if (form.issue_date && form.expiry_date && form.issue_date > form.expiry_date) {
      errs.expiry_date = 'Expiry date must be after issue date.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    setSelectedFile(file);
    if (errors.file) setErrors((e) => ({ ...e, file: null }));
    // Auto-fill document name from filename if empty
    if (!form.document_name) {
      const baseName = file.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ');
      setForm((f) => ({ ...f, document_name: baseName }));
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);
    setSuccessDoc(null);
    if (!validate()) return;

    setUploading(true);
    setProgress(0);

    try {
      const doc = await uploadDocument(form, selectedFile, (pct) => setProgress(pct));
      setSuccessDoc(doc);
      setProgress(100);
      // Reset form
      setForm({
        vehicle_id: vehicles.length > 0 ? vehicles[0].id.toString() : '',
        document_name: '',
        document_type: 'RC',
        issue_date: '',
        expiry_date: '',
        notes: '',
      });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (onDocumentUploaded) onDocumentUploaded(doc);
    } catch (err) {
      setApiError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="content-area">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Upload Document</h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
          Upload PDF documents for your vehicles. Files are stored on the Flask server; metadata is saved to PostgreSQL.
        </p>
      </div>

      {vehicles.length === 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem', color: '#92400e'
        }}>
          <Info size={20} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
            You need at least one vehicle registered before uploading documents. Go to <strong>My Vehicles</strong> to add one.
          </span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: '2rem', alignItems: 'start' }}>
        {/* Upload Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            {/* Success Banner */}
            {successDoc && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.35)',
                borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem'
              }}>
                <CheckCircle2 size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <div style={{ fontWeight: 700, color: '#065f46', fontSize: '0.9rem' }}>
                    Document uploaded successfully!
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#047857', marginTop: '3px' }}>
                    <strong>{successDoc.document_name}</strong> ({successDoc.document_type}) saved to PostgreSQL — ID #{successDoc.id}
                  </div>
                </div>
                <button onClick={() => setSuccessDoc(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', marginLeft: 'auto', color: '#065f46' }}>
                  <X size={16} />
                </button>
              </div>
            )}

            {/* API Error Banner */}
            {apiError && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem'
              }}>
                <AlertCircle size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: '1px' }} />
                <div style={{ flex: 1, fontSize: '0.875rem', color: '#b91c1c' }}>{apiError}</div>
                <button onClick={() => setApiError(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#b91c1c' }}>
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Select Vehicle */}
            <div className="form-group">
              <label className="form-label" htmlFor="upload-vehicle-select">
                Select Vehicle <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                id="upload-vehicle-select"
                className={`form-select ${errors.vehicle_id ? 'input-error' : ''}`}
                value={form.vehicle_id}
                onChange={(e) => { setForm({ ...form, vehicle_id: e.target.value }); setErrors({ ...errors, vehicle_id: null }); }}
                disabled={vehicles.length === 0}
              >
                {vehicles.length === 0
                  ? <option value="">— No vehicles available —</option>
                  : vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registration_number} — {v.manufacturer} {v.model} ({v.owner_name})
                    </option>
                  ))
                }
              </select>
              {errors.vehicle_id && <span className="error-text">{errors.vehicle_id}</span>}
            </div>

            {/* Document Type & Name */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="upload-doc-type">
                  Document Type <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  id="upload-doc-type"
                  className="form-select"
                  value={form.document_type}
                  onChange={(e) => setForm({ ...form, document_type: e.target.value })}
                >
                  {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="upload-doc-name">
                  Document Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  id="upload-doc-name"
                  type="text"
                  className={`form-input ${errors.document_name ? 'input-error' : ''}`}
                  placeholder="e.g. Honda City Insurance 2024"
                  value={form.document_name}
                  onChange={(e) => { setForm({ ...form, document_name: e.target.value }); setErrors({ ...errors, document_name: null }); }}
                />
                {errors.document_name && <span className="error-text">{errors.document_name}</span>}
              </div>
            </div>

            {/* PDF File Dropzone */}
            <div className="form-group">
              <label className="form-label">
                PDF File <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div
                onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${errors.file ? '#ef4444' : dragActive ? '#2563eb' : selectedFile ? '#10b981' : 'rgba(148, 163, 184, 0.6)'}`,
                  borderRadius: '14px',
                  padding: '2rem 1.5rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: dragActive ? 'rgba(37, 99, 235, 0.04)' : selectedFile ? 'rgba(16, 185, 129, 0.04)' : 'rgba(255, 255, 255, 0.5)',
                  transition: 'all 0.2s ease',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                />
                {selectedFile ? (
                  <div>
                    <CheckCircle2 size={30} color="#10b981" style={{ margin: '0 auto 0.5rem' }} />
                    <div style={{ fontWeight: 700, color: '#065f46', fontSize: '0.9rem' }}>{selectedFile.name}</div>
                    <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '4px' }}>
                      {(selectedFile.size / 1024).toFixed(1)} KB — click to change
                    </div>
                  </div>
                ) : (
                  <div>
                    <Upload size={30} color="#94a3b8" style={{ margin: '0 auto 0.75rem' }} />
                    <div style={{ fontWeight: 600, color: '#475569' }}>
                      {dragActive ? 'Drop PDF here' : 'Drag & drop your PDF here'}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '4px' }}>
                      or click to browse — PDF only, max {MAX_SIZE_MB}MB
                    </div>
                  </div>
                )}
              </div>
              {errors.file && <span className="error-text">{errors.file}</span>}
            </div>

            {/* Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="upload-issue-date">Issue Date</label>
                <input
                  id="upload-issue-date"
                  type="date"
                  className="form-input"
                  value={form.issue_date}
                  onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="upload-expiry-date">Expiry Date</label>
                <input
                  id="upload-expiry-date"
                  type="date"
                  className={`form-input ${errors.expiry_date ? 'input-error' : ''}`}
                  value={form.expiry_date}
                  onChange={(e) => { setForm({ ...form, expiry_date: e.target.value }); setErrors({ ...errors, expiry_date: null }); }}
                />
                {errors.expiry_date && <span className="error-text">{errors.expiry_date}</span>}
              </div>
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label" htmlFor="upload-notes">Notes (optional)</label>
              <textarea
                id="upload-notes"
                className="form-input"
                rows={3}
                placeholder="Any additional information about this document..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                style={{ resize: 'vertical', minHeight: '80px' }}
              />
            </div>

            {/* Progress Bar */}
            {uploading && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8rem', color: '#64748b' }}>
                  <span>Uploading to Flask server...</span>
                  <span>{progress}%</span>
                </div>
                <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, #2563eb, #60a5fa)',
                    borderRadius: '999px',
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              id="btn-upload-document"
              className="btn-primary"
              disabled={uploading || vehicles.length === 0}
              style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', borderRadius: '14px', justifyContent: 'center' }}
            >
              {uploading ? (
                <><Loader2 size={20} className="spin" /><span>Uploading... {progress}%</span></>
              ) : (
                <><FilePlus size={20} /><span>Upload Document to Flask</span></>
              )}
            </button>
          </div>
        </form>

        {/* Info Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={18} color="#2563eb" /> Upload Guidelines
            </h3>
            <ul style={{ fontSize: '0.85rem', color: '#64748b', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <li>✅ PDF files only — other formats are rejected</li>
              <li>✅ Maximum file size: {MAX_SIZE_MB}MB</li>
              <li>✅ File content is validated (magic bytes)</li>
              <li>✅ Stored in <code style={{ background: '#f1f5f9', padding: '1px 4px', borderRadius: '4px' }}>backend/uploads/</code></li>
              <li>✅ Metadata saved to PostgreSQL <code style={{ background: '#f1f5f9', padding: '1px 4px', borderRadius: '4px' }}>documents</code> table</li>
            </ul>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Document Types</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {DOCUMENT_TYPES.map((t) => (
                <span key={t} style={{
                  fontSize: '0.75rem', fontWeight: 600,
                  padding: '0.3rem 0.65rem', borderRadius: '8px',
                  background: form.document_type === t ? 'rgba(37, 99, 235, 0.12)' : '#f1f5f9',
                  color: form.document_type === t ? '#2563eb' : '#475569',
                  border: form.document_type === t ? '1px solid rgba(37, 99, 235, 0.25)' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                }} onClick={() => setForm({ ...form, document_type: t })}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Available Vehicles</h3>
            {vehicles.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No vehicles registered yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {vehicles.map((v) => (
                  <div key={v.id} style={{ fontSize: '0.825rem', display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span style={{ fontWeight: 600 }}>{v.registration_number}</span>
                    <span>{v.manufacturer} {v.model}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
