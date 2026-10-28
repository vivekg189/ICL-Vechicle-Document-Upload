import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import TopNavbar from './components/TopNavbar';
import AddVehicleModal from './components/AddVehicleModal';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Documents from './pages/Documents';
import UploadDocument from './pages/UploadDocument';
import ExpiringSoon from './pages/ExpiringSoon';

import ToastContainer, { toast } from './components/ToastContainer';
import {
  checkBackendHealth,
  getVehicles,
  deleteVehicle,
  getDocuments,
  getStats,
} from './services/api';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);

  // Vehicles
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);

  // Documents
  const [documents, setDocuments] = useState([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);

  // Stats (expiry tracking)
  const [stats, setStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Backend health
  const [backendHealth, setBackendHealth] = useState({
    loading: true,
    connected: false,
    status: 'checking',
    message: 'Checking Flask backend...',
    database: 'checking',
    endpoint: '/api/health',
    latency: null,
    timestamp: '',
  });

  const fetchHealth = useCallback(async () => {
    setBackendHealth((prev) => ({ ...prev, loading: true }));
    try {
      const result = await checkBackendHealth();
      setBackendHealth({ loading: false, ...result });
    } catch (err) {
      setBackendHealth({
        loading: false, connected: false, status: 'error',
        message: err.message || 'Error communicating with backend',
        database: 'disconnected', endpoint: '/api/health', latency: null,
        timestamp: new Date().toLocaleTimeString(),
      });
    }
  }, []);

  const fetchVehiclesList = useCallback(async () => {
    setIsLoadingVehicles(true);
    try {
      const data = await getVehicles();
      setVehicles(data);
      if (data.length > 0) {
        setSelectedVehicleId((prev) => {
          const exists = data.some((v) => v.id === prev);
          return exists ? prev : data[0].id;
        });
      } else {
        setSelectedVehicleId(null);
      }
    } catch (err) {
      console.error('Error fetching vehicles:', err);
    } finally {
      setIsLoadingVehicles(false);
    }
  }, []);

  const fetchDocumentsList = useCallback(async () => {
    setIsLoadingDocuments(true);
    try {
      const data = await getDocuments();
      setDocuments(data);
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setIsLoadingDocuments(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const data = await getStats();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    fetchVehiclesList();
    fetchDocumentsList();
    fetchStats();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth, fetchVehiclesList, fetchDocumentsList, fetchStats]);

  const handleOpenAdd = () => { setEditingVehicle(null); setModalOpen(true); };
  const handleOpenEdit = (vehicle) => { setEditingVehicle(vehicle); setModalOpen(true); };

  const handleVehicleSaved = (savedVehicle) => {
    toast(editingVehicle ? 'Vehicle updated successfully!' : 'New vehicle registered in PostgreSQL!', 'success');
    fetchVehiclesList();
    fetchStats();
    if (savedVehicle?.id) setSelectedVehicleId(savedVehicle.id);
  };

  const handleDeleteVehicle = async (id) => {
    try {
      await deleteVehicle(id);
      toast('Vehicle and associated records removed.', 'info');
      await fetchVehiclesList();
      await fetchDocumentsList();
      await fetchStats();
    } catch (err) {
      toast(err.message || 'Failed to delete vehicle', 'error');
    }
  };

  const handleDocumentUploaded = () => {
    toast('Document successfully stored in PostgreSQL!', 'success');
    fetchDocumentsList();
    fetchStats();
    setActivePage('documents');
  };

  const renderActivePage = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <Dashboard
            backendHealth={backendHealth}
            onRefreshHealth={fetchHealth}
            onOpenAddVehicle={handleOpenAdd}
            onNavigate={setActivePage}
            vehicles={vehicles}
            selectedVehicleId={selectedVehicleId}
            onSelectVehicle={setSelectedVehicleId}
            isLoadingVehicles={isLoadingVehicles}
            documents={documents}
            stats={stats}
            isLoadingStats={isLoadingStats}
            onRefreshStats={fetchStats}
          />
        );
      case 'vehicles':
        return (
          <Vehicles
            vehicles={vehicles}
            selectedVehicleId={selectedVehicleId}
            onSelectVehicle={setSelectedVehicleId}
            onOpenAddVehicle={handleOpenAdd}
            onEditVehicle={handleOpenEdit}
            onDeleteVehicle={handleDeleteVehicle}
            isLoading={isLoadingVehicles}
            onRefresh={fetchVehiclesList}
          />
        );
      case 'documents':
        return (
          <Documents
            documents={documents}
            isLoading={isLoadingDocuments}
            onRefresh={fetchDocumentsList}
            onNavigateUpload={() => setActivePage('upload')}
          />
        );
      case 'upload':
        return (
          <UploadDocument
            vehicles={vehicles}
            onDocumentUploaded={handleDocumentUploaded}
          />
        );
      case 'expiring':
        return (
          <ExpiringSoon
            documents={documents}
            stats={stats}
            isLoading={isLoadingDocuments || isLoadingStats}
            onRefresh={() => { fetchDocumentsList(); fetchStats(); }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        backendHealth={backendHealth}
        vehiclesCount={vehicles.length}
        documentsCount={documents.length}
      />

      <div className="app-main">
        <TopNavbar
          activePage={activePage}
          onOpenSidebar={() => setSidebarOpen(true)}
          backendHealth={backendHealth}
          onRefreshHealth={fetchHealth}
          onOpenAddVehicle={handleOpenAdd}
          vehiclesCount={vehicles.length}
        />
        <main id="main-content">
          {renderActivePage()}
        </main>
      </div>

      <AddVehicleModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onVehicleSaved={handleVehicleSaved}
        editingVehicle={editingVehicle}
      />

      <ToastContainer />
    </div>
  );
}
