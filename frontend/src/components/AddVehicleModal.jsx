import React, { useState, useEffect } from 'react';
import { X, Car, AlertCircle, CheckCircle2, Loader2, Edit3, PlusCircle } from 'lucide-react';
import { createVehicle, updateVehicle } from '../services/api';

export default function AddVehicleModal({ 
  isOpen, 
  onClose, 
  onVehicleSaved, 
  editingVehicle = null 
}) {
  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState({
    owner_name: '',
    registration_number: '',
    manufacturer: '',
    model: '',
    vehicle_type: 'Car',
    manufacturing_year: currentYear.toString(),
  });

  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // Populate form if editing
  useEffect(() => {
    if (editingVehicle) {
      setFormData({
        owner_name: editingVehicle.owner_name || '',
        registration_number: editingVehicle.registration_number || '',
        manufacturer: editingVehicle.manufacturer || '',
        model: editingVehicle.model || '',
        vehicle_type: editingVehicle.vehicle_type || 'Car',
        manufacturing_year: (editingVehicle.manufacturing_year || currentYear).toString(),
      });
    } else {
      setFormData({
        owner_name: '',
        registration_number: '',
        manufacturer: '',
        model: '',
        vehicle_type: 'Car',
        manufacturing_year: currentYear.toString(),
      });
    }
    setErrors({});
    setApiError(null);
    setSuccessMessage(null);
  }, [editingVehicle, isOpen, currentYear]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors = {};

    if (!formData.owner_name.trim()) {
      newErrors.owner_name = 'Owner name is required.';
    } else if (formData.owner_name.trim().length < 2) {
      newErrors.owner_name = 'Owner name must be at least 2 characters.';
    }

    if (!formData.registration_number.trim()) {
      newErrors.registration_number = 'Registration number is required.';
    } else if (formData.registration_number.trim().length < 3) {
      newErrors.registration_number = 'Registration number must be at least 3 characters.';
    }

    if (!formData.manufacturer.trim()) {
      newErrors.manufacturer = 'Manufacturer is required.';
    }

    if (!formData.model.trim()) {
      newErrors.model = 'Model is required.';
    }

    if (!formData.vehicle_type.trim()) {
      newErrors.vehicle_type = 'Vehicle type is required.';
    }

    const yearNum = parseInt(formData.manufacturing_year, 10);
    if (!formData.manufacturing_year || isNaN(yearNum)) {
      newErrors.manufacturing_year = 'Please enter a valid year.';
    } else if (yearNum < 1900 || yearNum > currentYear + 2) {
      newErrors.manufacturing_year = `Year must be between 1900 and ${currentYear + 2}.`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        owner_name: formData.owner_name.trim(),
        registration_number: formData.registration_number.trim().toUpperCase(),
        manufacturer: formData.manufacturer.trim(),
        model: formData.model.trim(),
        vehicle_type: formData.vehicle_type.trim(),
        manufacturing_year: parseInt(formData.manufacturing_year, 10),
      };

      let saved;
      if (editingVehicle) {
        saved = await updateVehicle(editingVehicle.id, payload);
        setSuccessMessage('Vehicle updated successfully in PostgreSQL!');
      } else {
        saved = await createVehicle(payload);
        setSuccessMessage('Vehicle added to PostgreSQL database!');
      }

      setTimeout(() => {
        setIsSubmitting(false);
        if (onVehicleSaved) onVehicleSaved(saved);
        onClose();
      }, 700);

    } catch (err) {
      setIsSubmitting(false);
      setApiError(err.message || 'An error occurred while saving the vehicle.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div 
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: editingVehicle ? 'rgba(16, 185, 129, 0.1)' : 'rgba(37, 99, 235, 0.1)',
                color: editingVehicle ? '#10b981' : '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {editingVehicle ? <Edit3 size={20} /> : <Car size={22} />}
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', margin: 0 }}>
                {editingVehicle ? 'Edit Vehicle Details' : 'Add New Vehicle'}
              </h3>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {editingVehicle 
                  ? `Updating vehicle #${editingVehicle.id} in PostgreSQL` 
                  : 'Saves directly to PostgreSQL database table'}
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {apiError && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#b91c1c',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{apiError}</span>
          </div>
        )}

        {successMessage && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#065f46',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Owner Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="vehicle-owner-name">
              Owner Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input 
              id="vehicle-owner-name"
              type="text" 
              className={`form-input ${errors.owner_name ? 'input-error' : ''}`}
              placeholder="e.g. Alex Morgan, John Smith"
              value={formData.owner_name}
              onChange={(e) => {
                setFormData({ ...formData, owner_name: e.target.value });
                if (errors.owner_name) setErrors({ ...errors, owner_name: null });
              }}
            />
            {errors.owner_name && (
              <span className="error-text">{errors.owner_name}</span>
            )}
          </div>

          {/* Registration Number & Vehicle Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="vehicle-reg-number">
                Registration Number <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input 
                id="vehicle-reg-number"
                type="text" 
                className={`form-input ${errors.registration_number ? 'input-error' : ''}`}
                placeholder="e.g. KA-01-AB-1234"
                style={{ textTransform: 'uppercase' }}
                value={formData.registration_number}
                onChange={(e) => {
                  setFormData({ ...formData, registration_number: e.target.value.toUpperCase() });
                  if (errors.registration_number) setErrors({ ...errors, registration_number: null });
                }}
              />
              {errors.registration_number && (
                <span className="error-text">{errors.registration_number}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="vehicle-type">
                Vehicle Type <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select 
                id="vehicle-type"
                className="form-select"
                value={formData.vehicle_type}
                onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
              >
                <option value="Car">Car / Sedan</option>
                <option value="SUV">SUV / Crossover</option>
                <option value="Motorcycle">Motorcycle / Two-Wheeler</option>
                <option value="Electric (EV)">Electric Vehicle (EV)</option>
                <option value="Commercial">Commercial / Van</option>
                <option value="Truck">Truck / Heavy Vehicle</option>
              </select>
            </div>
          </div>

          {/* Manufacturer & Model */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="vehicle-manufacturer">
                Manufacturer <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input 
                id="vehicle-manufacturer"
                type="text" 
                className={`form-input ${errors.manufacturer ? 'input-error' : ''}`}
                placeholder="e.g. Toyota, Honda, Tesla"
                value={formData.manufacturer}
                onChange={(e) => {
                  setFormData({ ...formData, manufacturer: e.target.value });
                  if (errors.manufacturer) setErrors({ ...errors, manufacturer: null });
                }}
              />
              {errors.manufacturer && (
                <span className="error-text">{errors.manufacturer}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="vehicle-model">
                Model <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input 
                id="vehicle-model"
                type="text" 
                className={`form-input ${errors.model ? 'input-error' : ''}`}
                placeholder="e.g. Fortuner, Civic, Model 3"
                value={formData.model}
                onChange={(e) => {
                  setFormData({ ...formData, model: e.target.value });
                  if (errors.model) setErrors({ ...errors, model: null });
                }}
              />
              {errors.model && (
                <span className="error-text">{errors.model}</span>
              )}
            </div>
          </div>

          {/* Manufacturing Year */}
          <div className="form-group">
            <label className="form-label" htmlFor="vehicle-year">
              Manufacturing Year <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input 
              id="vehicle-year"
              type="number" 
              className={`form-input ${errors.manufacturing_year ? 'input-error' : ''}`}
              min="1900" 
              max={currentYear + 2}
              placeholder="e.g. 2023"
              value={formData.manufacturing_year}
              onChange={(e) => {
                setFormData({ ...formData, manufacturing_year: e.target.value });
                if (errors.manufacturing_year) setErrors({ ...errors, manufacturing_year: null });
              }}
            />
            {errors.manufacturing_year && (
              <span className="error-text">{errors.manufacturing_year}</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.75rem' }}>
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary" 
              id="btn-modal-save-vehicle"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Saving to PostgreSQL...</span>
                </>
              ) : (
                <>
                  {editingVehicle ? <Edit3 size={16} /> : <PlusCircle size={16} />}
                  <span>{editingVehicle ? 'Update Vehicle' : 'Save to PostgreSQL'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
