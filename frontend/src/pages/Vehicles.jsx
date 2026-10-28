import React, { useState, useMemo } from 'react';
import { 
  Car, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  Calendar, 
  User, 
  Hash, 
  Layers, 
  Check, 
  AlertTriangle,
  Loader2,
  RefreshCw
} from 'lucide-react';

export default function Vehicles({ 
  vehicles, 
  selectedVehicleId, 
  onSelectVehicle, 
  onOpenAddVehicle, 
  onEditVehicle, 
  onDeleteVehicle,
  isLoading,
  onRefresh
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Filter vehicles by search term and type
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchesSearch = 
        v.registration_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.owner_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === 'All' || v.vehicle_type?.toLowerCase().includes(typeFilter.toLowerCase());

      return matchesSearch && matchesType;
    });
  }, [vehicles, searchTerm, typeFilter]);

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await onDeleteVehicle(id);
      setConfirmDeleteId(null);
    } catch {
      // error handled in parent
    } finally {
      setDeletingId(null);
    }
  };

  // Derive unique vehicle types from actual data, always include 'All'
  const vehicleTypes = useMemo(() => {
    const types = [...new Set(vehicles.map((v) => v.vehicle_type).filter(Boolean))].sort();
    return ['All', ...types];
  }, [vehicles]);
    return vehicles.find((v) => v.id === selectedVehicleId) || (vehicles.length > 0 ? vehicles[0] : null);
  }, [vehicles, selectedVehicleId]);

  return (
    <div className="content-area">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>My Vehicles</h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
            {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} stored securely in PostgreSQL database.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            className="btn-secondary"
            onClick={onRefresh}
            title="Refresh from PostgreSQL"
            disabled={isLoading}
          >
            <RefreshCw size={15} className={isLoading ? 'spin' : ''} />
            <span>Sync</span>
          </button>
          <button 
            id="btn-vehicles-add-vehicle"
            className="btn-primary" 
            onClick={onOpenAddVehicle}
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Add Vehicle</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div 
        className="glass-card" 
        style={{ 
          padding: '0.875rem 1.25rem', 
          marginBottom: '2rem', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, minWidth: '240px' }}>
          <Search size={18} color="#94a3b8" />
          <input 
            id="input-search-vehicles"
            type="text" 
            placeholder="Search by registration, model, manufacturer, or owner..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              border: 'none', 
              background: 'transparent', 
              outline: 'none', 
              fontFamily: 'inherit',
              width: '100%',
              fontSize: '0.9rem',
              color: '#0f172a'
            }}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              Clear
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {vehicleTypes.map((type) => (            <button
              key={type}
              className={`btn-secondary ${typeFilter === type ? 'filter-active' : ''}`}
              onClick={() => setTypeFilter(type)}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.8rem',
                background: typeFilter === type ? '#2563eb' : undefined,
                color: typeFilter === type ? '#ffffff' : undefined,
                borderColor: typeFilter === type ? '#2563eb' : undefined
              }}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <Loader2 size={36} className="spin" style={{ color: '#2563eb', margin: '0 auto 1rem' }} />
          <p style={{ color: '#64748b' }}>Loading vehicles from PostgreSQL...</p>
        </div>
      ) : vehicles.length === 0 ? (
        /* Empty State */
        <div className="empty-state-card" id="vehicles-empty-state">
          <div className="empty-state-icon-box">
            <Car size={38} strokeWidth={2.2} />
          </div>
          <h2 className="empty-state-title" style={{ fontSize: '1.5rem' }}>No Vehicles Registered Yet</h2>
          <p className="empty-state-description">
            Add your vehicle to start managing your documents and tracking expiration dates in PostgreSQL.
          </p>
          <button 
            id="btn-empty-state-add-vehicle"
            className="btn-primary" 
            onClick={onOpenAddVehicle}
            style={{ padding: '0.75rem 1.75rem' }}
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Add Vehicle</span>
          </button>
        </div>
      ) : filteredVehicles.length === 0 ? (
        /* Search has no results */
        <div className="glass-panel" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
          <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '1rem' }}>
            No vehicles match your search query &quot;{searchTerm}&quot;.
          </p>
          <button className="btn-secondary" onClick={() => { setSearchTerm(''); setTypeFilter('All'); }}>
            Reset Filters
          </button>
        </div>
      ) : (
        /* Vehicle List Grid */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {filteredVehicles.map((vehicle) => {
            const isSelected = vehicle.id === (selectedVehicle ? selectedVehicle.id : null);

            return (
              <div 
                key={vehicle.id}
                id={`vehicle-card-${vehicle.id}`}
                className="glass-card"
                onClick={() => onSelectVehicle(vehicle.id)}
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  cursor: 'pointer',
                  position: 'relative',
                  border: isSelected ? '2px solid #2563eb' : undefined,
                  boxShadow: isSelected ? '0 12px 30px -8px rgba(37, 99, 235, 0.25)' : undefined,
                  background: isSelected ? 'rgba(255, 255, 255, 0.95)' : undefined
                }}
              >
                {/* Selected Indicator Badge */}
                {isSelected && (
                  <div style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '16px',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 4px 10px rgba(37, 99, 235, 0.35)'
                  }}>
                    <Check size={12} strokeWidth={3} />
                    <span>Selected</span>
                  </div>
                )}

                {/* Top Header: Model + Type */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {vehicle.manufacturer}
                    </span>
                    <h3 style={{ fontSize: '1.25rem', marginTop: '2px', color: '#0f172a' }}>
                      {vehicle.model}
                    </h3>
                  </div>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.25rem 0.6rem',
                    borderRadius: '8px',
                    background: 'rgba(241, 245, 249, 0.9)',
                    color: '#475569',
                    border: '1px solid rgba(226, 232, 240, 0.8)'
                  }}>
                    {vehicle.vehicle_type}
                  </span>
                </div>

                {/* Registration Plate Box */}
                <div style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  border: '2px solid #0f172a',
                  borderRadius: '8px',
                  padding: '0.5rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)'
                }}>
                  <div style={{
                    background: '#1e3a8a',
                    color: '#ffffff',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.4rem',
                    borderRadius: '4px',
                    letterSpacing: '0.05em'
                  }}>
                    IND
                  </div>
                  <div style={{
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    fontSize: '1.15rem',
                    letterSpacing: '0.08em',
                    color: '#0f172a'
                  }}>
                    {vehicle.registration_number}
                  </div>
                </div>

                {/* Details Meta */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.825rem', color: '#64748b' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={15} color="#94a3b8" />
                    <span style={{ truncate: true }}>{vehicle.owner_name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={15} color="#94a3b8" />
                    <span>Year: {vehicle.manufacturing_year}</span>
                  </div>
                </div>

                {/* Confirmation state if delete clicked */}
                {confirmDeleteId === vehicle.id ? (
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      marginTop: 'auto',
                      padding: '0.75rem',
                      background: 'rgba(254, 242, 242, 0.9)',
                      border: '1px solid rgba(254, 202, 202, 1)',
                      borderRadius: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', color: '#b91c1c', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertTriangle size={15} />
                      <span>Delete {vehicle.registration_number}?</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button 
                        className="btn-secondary" 
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Cancel
                      </button>
                      <button 
                        className="btn-primary" 
                        id={`btn-confirm-delete-${vehicle.id}`}
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: '#dc2626' }}
                        onClick={() => handleDelete(vehicle.id)}
                        disabled={deletingId === vehicle.id}
                      >
                        {deletingId === vehicle.id ? 'Deleting...' : 'Confirm Delete'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Action Buttons */
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    style={{ 
                      marginTop: 'auto', 
                      paddingTop: '0.75rem', 
                      borderTop: '1px solid rgba(226, 232, 240, 0.7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <button
                      className="btn-secondary"
                      id={`btn-select-vehicle-${vehicle.id}`}
                      style={{ 
                        padding: '0.4rem 0.75rem', 
                        fontSize: '0.8rem',
                        background: isSelected ? 'rgba(37, 99, 235, 0.08)' : undefined,
                        color: isSelected ? '#2563eb' : undefined,
                        borderColor: isSelected ? 'rgba(37, 99, 235, 0.3)' : undefined,
                        fontWeight: 600
                      }}
                      onClick={() => onSelectVehicle(vehicle.id)}
                    >
                      <Check size={14} />
                      <span>{isSelected ? 'Active Vehicle' : 'Select'}</span>
                    </button>

                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button 
                        id={`btn-edit-vehicle-${vehicle.id}`}
                        className="btn-icon" 
                        style={{ width: '34px', height: '34px' }}
                        title="Edit vehicle"
                        onClick={() => onEditVehicle(vehicle)}
                      >
                        <Edit3 size={15} />
                      </button>

                      <button 
                        id={`btn-delete-vehicle-${vehicle.id}`}
                        className="btn-icon" 
                        style={{ width: '34px', height: '34px', color: '#ef4444' }}
                        title="Delete vehicle from PostgreSQL"
                        onClick={() => setConfirmDeleteId(vehicle.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
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
