import React from 'react';
import { 
  Server, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Database, 
  Lock, 
  FileUp, 
  Boxes 
} from 'lucide-react';

export default function Settings({ backendHealth, onRefreshHealth, vehiclesCount = 0, documentsCount = 0 }) {
  const roadmapStages = [
    { title: 'Stage 1: Core Setup & REST Communication', desc: 'React + Flask architecture with health check API & Glassmorphism UI', current: false, completed: true, icon: Server },
    { title: 'Stage 2: PostgreSQL Database & Vehicles CRUD', desc: 'PostgreSQL database vehiclevault with SQLAlchemy ORM and validation', current: false, completed: true, icon: Database },
    { title: 'Stage 3: PDF Document Upload & Management', desc: 'Real file upload to Flask, metadata in PostgreSQL documents table, View/Download/Delete', current: false, completed: true, icon: FileUp },
    { title: 'Stage 4: Authentication & User Accounts', desc: 'JWT / Session authentication with multi-user isolation', current: false, completed: false, icon: Lock },
    { title: 'Stage 5: Containerization & Docker Compose', desc: 'Production-ready multi-container orchestration with named volumes and Nginx reverse proxy', current: false, completed: true, icon: Boxes },
  ];

  return (
    <div className="content-area">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>System Settings</h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
          Backend REST configuration, PostgreSQL status, and project architecture roadmap.
        </p>
      </div>

      {/* Backend API & Database Configuration Section */}
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ 
              width: '42px', 
              height: '42px', 
              borderRadius: '12px', 
              background: 'rgba(37, 99, 235, 0.1)', 
              color: '#2563eb', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Database size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', margin: 0 }}>PostgreSQL & Flask REST Service</h3>
              <span style={{ fontSize: '0.825rem', color: '#64748b' }}>
                Database: <code>vehiclevault</code> • SQLAlchemy ORM Integration
              </span>
            </div>
          </div>

          <button 
            className="btn-primary" 
            onClick={onRefreshHealth}
            disabled={backendHealth.loading}
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            <RefreshCw size={15} className={backendHealth.loading ? 'spin' : ''} />
            <span>Ping /api/health</span>
          </button>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem',
          background: 'rgba(248, 250, 252, 0.7)',
          padding: '1.25rem',
          borderRadius: '14px',
          border: '1px solid rgba(226, 232, 240, 0.8)'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>
              API Status
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontWeight: 700, color: backendHealth.connected ? '#10b981' : '#ef4444' }}>
              {backendHealth.connected ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              <span>{backendHealth.connected ? 'Connected' : 'Offline'}</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>
              PostgreSQL Database
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontWeight: 700, color: backendHealth.database === 'connected' ? '#10b981' : '#f59e0b' }}>
              <Database size={16} />
              <span>{backendHealth.database || 'Active'}</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>
              Vehicles Table
            </div>
            <div style={{ marginTop: '4px', fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
              {vehiclesCount} records stored
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>
              Documents Table
            </div>
            <div style={{ marginTop: '4px', fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
              {documentsCount} PDF records stored
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>
              Response Latency
            </div>
            <div style={{ marginTop: '4px', fontWeight: 600, fontSize: '0.9rem' }}>
              {backendHealth.latency !== null ? `${backendHealth.latency} ms` : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Project Roadmap */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>VehicleVault Architecture Roadmap</h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
          Sequential stages planned for the complete production system.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {roadmapStages.map((stage, idx) => {
            const Icon = stage.icon;
            return (
              <div 
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem 1.25rem',
                  borderRadius: '12px',
                  background: stage.current ? 'rgba(37, 99, 235, 0.08)' : stage.completed ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.6)',
                  border: stage.current ? '1px solid rgba(37, 99, 235, 0.3)' : stage.completed ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(226, 232, 240, 0.7)',
                }}
              >
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: stage.current ? '#2563eb' : stage.completed ? '#10b981' : '#e2e8f0',
                  color: (stage.current || stage.completed) ? '#ffffff' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Icon size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.925rem', color: stage.current ? '#1d4ed8' : stage.completed ? '#065f46' : '#0f172a' }}>
                    {stage.title}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {stage.desc}
                  </div>
                </div>
                <div>
                  <span style={{
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '999px',
                    background: stage.current ? '#dbeafe' : stage.completed ? '#d1fae5' : '#f1f5f9',
                    color: stage.current ? '#1e40af' : stage.completed ? '#065f46' : '#94a3b8'
                  }}>
                    {stage.completed ? 'Completed' : stage.current ? 'Active Stage' : 'Upcoming'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
