/**
 * VehicleVault API Service — Stage 3
 * Handles vehicles (Stage 2) + document upload / CRUD (Stage 3)
 */

// Primary API URL provided via environment configuration (defaults to relative '/api' for reverse proxy)
const ENV_API_URL = import.meta.env.VITE_API_URL;
const API_BASE_URL = (ENV_API_URL || '/api').replace(/\/+$/, '');

// Optional fallback URL if explicitly provided in environment
const FALLBACK_URL = import.meta.env.VITE_API_FALLBACK_URL
  ? import.meta.env.VITE_API_FALLBACK_URL.replace(/\/+$/, '')
  : null;

async function fetchWithFallback(endpoint, options = {}) {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, options);
    return res;
  } catch (err) {
    if (FALLBACK_URL && FALLBACK_URL !== API_BASE_URL) {
      return await fetch(`${FALLBACK_URL}${path}`, options);
    }
    throw err;
  }
}

// ==========================================
// Health
// ==========================================
export async function checkBackendHealth() {
  const startTime = performance.now();
  const endpoint = `${API_BASE_URL}/health`;
  try {
    const response = await fetchWithFallback('/health', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (response.ok) {
      const data = await response.json();
      return {
        connected: true,
        status: data.status || 'success',
        message: data.message || 'VehicleVault backend is running',
        database: data.database || 'connected',
        endpoint: endpoint,
        latency: Math.round(performance.now() - startTime),
        timestamp: new Date().toLocaleTimeString(),
      };
    }
  } catch { /* fall through */ }
  return {
    connected: false,
    status: 'disconnected',
    message: `Unable to reach backend at ${endpoint}`,
    database: 'disconnected',
    endpoint: endpoint,
    latency: null,
    timestamp: new Date().toLocaleTimeString(),
  };
}

/**
 * GET /api/stats — real document expiry counts + alerts from PostgreSQL
 */
export async function getStats() {
  const res = await fetchWithFallback('/stats', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch stats');
  return data;
}

/**
 * GET /api/dashboard — unified dashboard payload (vehicles, stats, recent docs, alerts)
 */
export async function getDashboard(vehicleId = null) {
  const query = vehicleId ? `?vehicle_id=${vehicleId}` : '';
  const res = await fetchWithFallback(`/dashboard${query}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch dashboard data');
  return data;
}

// ==========================================
// Vehicles (Stage 2)
// ==========================================
export async function getVehicles() {
  const res = await fetchWithFallback('/vehicles', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch vehicles');
  return data.vehicles || [];
}

export async function getVehicleById(id) {
  const res = await fetchWithFallback(`/vehicles/${id}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Failed to fetch vehicle ${id}`);
  return data.vehicle;
}

export async function createVehicle(payload) {
  const res = await fetchWithFallback('/vehicles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.errors ? data.errors.join(' ') : (data.message || 'Failed to create vehicle'));
  }
  return data.vehicle;
}

export async function updateVehicle(id, payload) {
  const res = await fetchWithFallback(`/vehicles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.errors ? data.errors.join(' ') : (data.message || 'Failed to update vehicle'));
  }
  return data.vehicle;
}

export async function deleteVehicle(id) {
  const res = await fetchWithFallback(`/vehicles/${id}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to delete vehicle');
  return data;
}

// ==========================================
// Documents (Stage 3)
// ==========================================

/**
 * Get all documents (optionally filtered by vehicle_id)
 */
export async function getDocuments(vehicleId = null) {
  const qs = vehicleId ? `?vehicle_id=${vehicleId}` : '';
  const res = await fetchWithFallback(`/documents${qs}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch documents');
  return data.documents || [];
}

/**
 * Get a single document by ID
 */
export async function getDocumentById(id) {
  const res = await fetchWithFallback(`/documents/${id}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Failed to fetch document ${id}`);
  return data.document;
}

/**
 * Upload a document (multipart/form-data)
 * @param {Object} formData - { vehicle_id, document_name, document_type, issue_date, expiry_date, notes }
 * @param {File} file - The PDF file object
 * @param {Function} onProgress - optional progress callback (not supported by fetch, kept for future XHR)
 */
export async function uploadDocument(formData, file, onProgress = null) {
  const fd = new FormData();
  fd.append('vehicle_id', formData.vehicle_id);
  fd.append('document_name', formData.document_name);
  fd.append('document_type', formData.document_type);
  if (formData.issue_date) fd.append('issue_date', formData.issue_date);
  if (formData.expiry_date) fd.append('expiry_date', formData.expiry_date);
  if (formData.notes) fd.append('notes', formData.notes);
  fd.append('file', file);

  // Use XHR so we can track progress
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Try primary API URL configured via environment
    const url = `${API_BASE_URL}/documents`;
    xhr.open('POST', url);

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
    }

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data.document);
        } else {
          const errMsg = data.errors ? data.errors.join(' ') : (data.message || 'Upload failed');
          reject(new Error(errMsg));
        }
      } catch {
        reject(new Error('Invalid response from server'));
      }
    };

    xhr.onerror = () => {
      if (FALLBACK_URL && url !== `${FALLBACK_URL}/documents`) {
        const xhr2 = new XMLHttpRequest();
        xhr2.open('POST', `${FALLBACK_URL}/documents`);
        if (onProgress) {
          xhr2.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
          });
        }
        xhr2.onload = () => {
          try {
            const data = JSON.parse(xhr2.responseText);
            if (xhr2.status >= 200 && xhr2.status < 300) {
              resolve(data.document);
            } else {
              reject(new Error(data.errors ? data.errors.join(' ') : data.message || 'Upload failed'));
            }
          } catch {
            reject(new Error('Invalid response from server'));
          }
        };
        xhr2.onerror = () => reject(new Error('Network error — cannot reach backend.'));
        xhr2.send(fd);
      } else {
        reject(new Error('Network error — cannot reach backend.'));
      }
    };

    xhr.send(fd);
  });
}

/**
 * Delete a document
 */
export async function deleteDocument(id) {
  const res = await fetchWithFallback(`/documents/${id}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to delete document');
  return data;
}

/**
 * Get the download URL for a document (direct link)
 */
export function getDocumentDownloadUrl(id) {
  return `${API_BASE_URL}/documents/${id}/download`;
}

/**
 * Get the inline view URL for a document
 */
export function getDocumentViewUrl(id) {
  return `${API_BASE_URL}/documents/${id}/view`;
}
