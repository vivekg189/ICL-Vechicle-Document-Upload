import React from 'react';
import {
  LayoutDashboard,
  Car,
  FileText,
  ClockAlert,
  ShieldCheck,
  X,
  UploadCloud
} from 'lucide-react';

export default function Sidebar({
  activePage,
  setActivePage,
  isOpen,
  onClose,
  backendHealth,
  vehiclesCount = 0,
  documentsCount = 0,
}) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'vehicles', label: 'My Vehicles', icon: Car, badge: vehiclesCount },
    { id: 'documents', label: 'Documents', icon: FileText, badge: documentsCount },
    { id: 'upload', label: 'Upload Document', icon: UploadCloud },
    { id: 'expiring', label: 'Expiring Soon', icon: ClockAlert },
  ];

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 28 }}
        />
      )}

      <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-icon-wrapper">
            <ShieldCheck size={26} strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="brand-title">VehicleVault</div>

          </div>
          {isOpen && (
            <button className="btn-icon" onClick={onClose} style={{ width: '32px', height: '32px', marginLeft: 'auto' }} title="Close menu">
              <X size={18} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                className={`nav-link ${isActive ? 'active' : ''}`}
                onClick={() => { setActivePage(item.id); if (isOpen) onClose(); }}
              >
                <Icon size={20} className="nav-icon" />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span style={{
                    marginLeft: 'auto',
                    background: isActive ? '#2563eb' : '#e2e8f0',
                    color: isActive ? '#ffffff' : '#475569',
                    fontSize: '0.75rem', fontWeight: 700,
                    padding: '0.15rem 0.55rem', borderRadius: '999px'
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
        </div>
      </aside>
    </>
  );
}
