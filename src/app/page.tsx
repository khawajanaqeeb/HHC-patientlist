'use client';

import React from 'react';
import TitleBar from '@/components/TitleBar';
import ControlBar from '@/components/ControlBar';
import { VisitTable } from '@/components/VisitTable';
import { PackageModal } from '@/components/PackageModal';
import { AddPatientModal } from '@/components/AddPatientModal';
import { AddMonthModal } from '@/components/AddMonthModal';
import { EnterVisitModal } from '@/components/EnterVisitModal';

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

  const {
    currentMonth, availableMonths, packages, patients,
    currency, setCurrency, usdToPkrRate, loading,
    loadData,
    handleSelectMonth, handleCreateMonth,
    handleSavePatient, handleDeletePatient,
    handleSavePackages, handleReset,
    handleExport, handleImport,
  } = useAppData({ flashStatus, clearSearch: () => setSearchQuery(''), resetTable });

  const onSavePatient = async (name: string, subscriber: string, packageId: number | null, patientId?: number) => {
    await handleSavePatient(name, subscriber, packageId, patientId);
    if (patientId) setEditingPatient(null);
  };

  const onDeletePatient = async (patientId: number) => {
    await handleDeletePatient(patientId);
    closeAddPatient();
  };

  return (
    <main>
      <TitleBar
        currentMonth={currentMonth}
        availableMonths={availableMonths}
        patientCount={patients.length}
        onSelectMonth={handleSelectMonth}
        onOpenAddMonth={() => setIsAddMonthModalOpen(true)}
      />

      <ControlBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenAddPatient={openAddPatient}
        onOpenEnterVisit={() => setIsEnterVisitModalOpen(true)}
        onPrint={() => window.print()}
        onOpenPackages={() => setIsPackageModalOpen(true)}
        onExport={handleExport}
        onImport={handleImport}
        onReset={handleReset}
        saveStatus={saveStatus}
        saveStatusColor={saveStatusColor}
      />

      {loading ? (
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            background: '#fff',
            border: '1px solid var(--teal-lt)',
            borderTop: 'none',
            fontSize: '0.85rem',
            color: 'var(--teal)',
            fontWeight: 700,
          }}
        >
          Loading Patient Visit Sheet...
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