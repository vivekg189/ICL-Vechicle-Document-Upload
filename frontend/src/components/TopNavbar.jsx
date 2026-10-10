import React, { useState } from 'react';
import { 
  Menu, 
  Plus, 
  Bell, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  User, 
  Database 
} from 'lucide-react';

export default function TopNavbar({ 
  activePage, 
  onOpenSidebar, 
  backendHealth, 
  onRefreshHealth, 
  onOpenAddVehicle,
  vehiclesCount = 0 
}) {
  const [showNotifications, setShowNotifications] = useState(false);

  const pageTitles = {
    dashboard: 'Dashboard',
    vehicles: 'My Vehicles',
    documents: 'Documents',
    expiring: 'Expiring Soon',
    settings: 'Settings',
  };

  return (
    <header className="top-navbar">
      <div className="navbar-left">
        <button 
          className="menu-toggle-btn" 
          onClick={onOpenSidebar}
          aria-label="Open navigation menu"
          id="btn-menu-toggle"
        >
          <Menu size={20} />
        </button>

        <div className="page-breadcrumb-title">
          <span style={{ color: '#94a3b8', fontWeight: 500, fontSize: '0.95rem' }}>VehicleVault</span>
          <span style={{ color: '#cbd5e1' }}>/</span>
          <span>{pageTitles[activePage] || 'Overview'}</span>
        </div>
      </div>

      <div className="navbar-right">
        {/* Backend & DB Connectivity Status Pill */}
        <div 
          className={`status-pill ${
            backendHealth.loading 
              ? 'loading' 
              : backendHealth.connected 
                ? 'connected' 
                : 'disconnected'
          }`}
          title={`Endpoint: ${backendHealth.endpoint || '/api/health'} (DB: ${backendHealth.database || 'active'})`}
        >
          <span className="pulse-dot" />
          <span>
            {backendHealth.loading 
              ? 'Checking API...' 
              : backendHealth.connected 
                ? '● Connected' 
                : '● Disconnected'}
          </span>
          <button 
            onClick={onRefreshHealth}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '2px',
              color: 'inherit',
              opacity: 0.8,
            }}
            title="Refresh backend status"
          >
            <RefreshCw size={13} className={backendHealth.loading ? 'spin' : ''} />
          </button>
        </div>

        {/* Action Button: Add Vehicle */}
        <button 
          id="btn-nav-add-vehicle"
          className="btn-primary" 
          onClick={onOpenAddVehicle}
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Add Vehicle</span>
        </button>

        {/* Notifications Icon with Glass Dropdown */}
        <div style={{ position: 'relative' }}>
          <button 
            id="btn-nav-notifications"
            className="btn-icon" 
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
          >
            <Bell size={18} />
          </button>

          {showNotifications && (
            <div 
              className="glass-card"
              style={{
                position: 'absolute',
                top: '50px',
                right: 0,
                width: '300px',
                padding: '1.25rem',
                zIndex: 40,
                boxShadow: '0 20px 30px rgba(15, 23, 42, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.95)',
                background: 'rgba(255, 255, 255, 0.96)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Notifications</span>
                <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>Stage 2</span>
              </div>
              <div style={{ fontSize: '0.825rem', color: '#64748b', lineHeight: 1.5 }}>
                {backendHealth.connected 
                  ? `PostgreSQL is connected with ${vehiclesCount} vehicle${vehiclesCount !== 1 ? 's' : ''} stored in table 'vehicles'.`
                  : 'Backend is offline. Ensure Python Flask is running on port 5000.'}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <div 
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
            border: '1px solid rgba(255, 255, 255, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#3730a3',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.85rem'
          }}
          title="VehicleVault Administrator"
        >
          <User size={18} />
        </div>
      </div>
    </header>
  );
}
