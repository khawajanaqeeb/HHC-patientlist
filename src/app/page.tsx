'use client';

import React from 'react';
import TitleBar from '@/components/TitleBar';
import Sidebar from '@/components/Sidebar';
import { MonthTabs } from '@/components/MonthTabs';
import { VisitTable } from '@/components/VisitTable';
import { PackageModal } from '@/components/PackageModal';
import { AddPatientModal } from '@/components/AddPatientModal';
import { AddMonthModal } from '@/components/AddMonthModal';
import { EnterVisitModal } from '@/components/EnterVisitModal';
import { LoginModal } from '@/components/LoginModal';
import { Search } from 'lucide-react';

import { useStatus } from '@/hooks/useStatus';
import { useTableState } from '@/hooks/useTableState';
import { useModals } from '@/hooks/useModals';
import { useAppData } from '@/hooks/useAppData';

export default function PatientVisitSheetPage() {
  const { saveStatus, saveStatusColor, flashStatus } = useStatus();
  const { searchQuery, setSearchQuery, sortColumn, sortDirection, handleSort, resetTable } = useTableState();
  const {
    isPackageModalOpen, setIsPackageModalOpen,
    isAddPatientModalOpen,
    patientWindowMode,
    isAddMonthModalOpen, setIsAddMonthModalOpen,
    isEnterVisitModalOpen, setIsEnterVisitModalOpen,
    editingPatient, setEditingPatient,
    openAddPatient, closeAddPatient,
  } = useModals();

  const clearSearch = React.useCallback(() => setSearchQuery(''), [setSearchQuery]);

  const {
    currentMonth, availableMonths, packages, patients,
    currency, setCurrency, usdToPkrRate, loading,
    isAuthenticated, isReadOnly, handleLoginSuccess, handleLogout,
    loadData,
    handleSelectMonth, handleCreateMonth, handleOpenInNewWindow,
    handleSavePatient, handleDeletePatient,
    handleSavePackages, handleReset,
    handleExport, handleImport,
  } = useAppData({ flashStatus, clearSearch, resetTable });

  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const onSavePatient = async (
    name: string,
    subscriber: string,
    packageId: number | null,
    patientId?: number,
    extra?: {
      subscriberEmail?: string;
      fatherHusbandName?: string;
      dob?: string;
      gender?: string;
      address?: string;
      googleAddressLocation?: string;
      assignedDoctor?: string;
    }
  ) => {
    await handleSavePatient(name, subscriber, packageId, patientId, extra);
    if (patientId) setEditingPatient(null);
  };

  const onDeletePatient = async (patientId: number) => {
    await handleDeletePatient(patientId);
  };

  return (
    <main>
      <TitleBar
        currentMonth={currentMonth}
        availableMonths={availableMonths}
        patientCount={patients.length}
        onSelectMonth={handleSelectMonth}
        onOpenAddMonth={() => setIsAddMonthModalOpen(true)}
        onOpenInNewWindow={handleOpenInNewWindow}
        onLogout={handleLogout}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      {/* ── Body: sidebar + content ── */}
      <div className="app-body">
        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen((v) => !v)}
          onOpenAddPatient={openAddPatient}
          onOpenEnterVisit={() => setIsEnterVisitModalOpen(true)}
          onPrint={() => window.print()}
          onOpenPackages={() => setIsPackageModalOpen(true)}
          onExport={handleExport}
          onImport={handleImport}
          onReset={handleReset}
        />

        {/* Main content */}
        <div className="app-content">
          {/* Month sheet navigation tabs */}
          <MonthTabs
            currentMonth={currentMonth}
            availableMonths={availableMonths}
            patientCount={patients.length}
            onSelectMonth={handleSelectMonth}
            onOpenAddMonth={() => setIsAddMonthModalOpen(true)}
            onOpenInNewWindow={handleOpenInNewWindow}
          />

          {/* Search + status strip */}
          <div className="content-topbar">
            <div className="search-box">
              <Search size={13} />
              <input
                type="text"
                placeholder="Search patient…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {isReadOnly && (
              <span className="save-status" style={{ color: '#b71c1c', fontWeight: 600 }}>
                🔒 Read-only account — log in as Super Admin to add, edit or delete
              </span>
            )}
            {saveStatus && (
              <span className="save-status" style={{ color: saveStatusColor }}>
                {saveStatus}
              </span>
            )}
            {/* Legend */}
            <div className="legend">
              <span className="leg"><span className="leg-sq" style={{ background: '#c8e6c9' }} />Doctor</span>
              <span className="leg"><span className="leg-sq" style={{ background: '#bbdefb' }} />Nurse+Physio</span>
              <span className="leg"><span className="leg-sq" style={{ background: '#e1bee7' }} />Psychiatrist</span>
              <span className="leg"><span className="leg-sq" style={{ background: '#ffcdd2' }} />Cancelled</span>
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              Loading Patient Visit Sheet…
            </div>
          ) : (
            <VisitTable
              currentMonth={currentMonth}
              packages={packages}
              patients={patients}
              currency={currency}
              usdToPkrRate={usdToPkrRate}
              searchQuery={searchQuery}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              onCurrencyChange={setCurrency}
            />
          )}
        </div>
      </div>

      {/* ── Auth Modal ── */}
      <LoginModal
        isOpen={!isAuthenticated}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* ── Modals ── */}
      <PackageModal
        isOpen={isPackageModalOpen}
        packages={packages}
        patients={patients}
        currency={currency}
        usdToPkrRate={usdToPkrRate}
        onCurrencyChange={setCurrency}
        onClose={() => setIsPackageModalOpen(false)}
        onSave={handleSavePackages}
      />

      <AddPatientModal
        isOpen={isAddPatientModalOpen}
        initialMode={editingPatient ? 'edit' : patientWindowMode}
        currentMonth={currentMonth}
        packages={packages}
        patients={patients}
        patient={editingPatient}
        onClose={closeAddPatient}
        onAdd={onSavePatient}
        onDelete={onDeletePatient}
      />

      <AddMonthModal
        isOpen={isAddMonthModalOpen}
        currentMonth={currentMonth}
        availableMonths={availableMonths}
        onClose={() => setIsAddMonthModalOpen(false)}
        onCreateMonth={handleCreateMonth}
        onSelectMonth={handleSelectMonth}
        onOpenInNewWindow={handleOpenInNewWindow}
      />

      <EnterVisitModal
        isOpen={isEnterVisitModalOpen}
        patients={patients}
        packages={packages}
        currentMonth={currentMonth}
        onClose={() => setIsEnterVisitModalOpen(false)}
        onRefresh={() => loadData(currentMonth.id)}
      />
    </main>
  );
}