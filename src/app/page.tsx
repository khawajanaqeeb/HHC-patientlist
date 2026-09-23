'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Package, PatientMonthData, MonthInfo } from '@/lib/types';
import TitleBar from '@/components/TitleBar';
import ControlBar from '@/components/ControlBar';
import { VisitTable } from '@/components/VisitTable';
import { PackageModal } from '@/components/PackageModal';
import { AddPatientModal } from '@/components/AddPatientModal';
import { AddMonthModal } from '@/components/AddMonthModal';
import { PatientSearchModal } from '@/components/PatientSearchModal';
import { EnterVisitModal } from '@/components/EnterVisitModal';

const DEFAULT_USD_TO_PKR_RATE = 280;

export default function PatientVisitSheetPage() {
  const [currentMonth, setCurrentMonth] = useState<MonthInfo>({
    id: '2026-09',
    year: 2026,
    month: 9,
    label: 'September 2026',
    daysInMonth: 30,
  });
  const [availableMonths, setAvailableMonths] = useState<MonthInfo[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [patients, setPatients] = useState<PatientMonthData[]>([]);
  const [currency, setCurrency] = useState<'PKR' | 'USD'>('PKR');
  const [usdToPkrRate, setUsdToPkrRate] = useState(DEFAULT_USD_TO_PKR_RATE);
  const [loading, setLoading] = useState<boolean>(true);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<'sno' | 'name' | 'subscriber' | 'pkg' | null>(null);
  const [sortDirection, setSortDirection] = useState<1 | -1>(1);

  const [saveStatus, setSaveStatus] = useState<string>('');
  const [saveStatusColor, setSaveStatusColor] = useState<string>('#ffffff');

  const [isPackageModalOpen, setIsPackageModalOpen] = useState<boolean>(false);
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState<boolean>(false);
  const [isAddMonthModalOpen, setIsAddMonthModalOpen] = useState<boolean>(false);
  const [isPatientSearchOpen, setIsPatientSearchOpen] = useState<boolean>(false);
  const [isEnterVisitModalOpen, setIsEnterVisitModalOpen] = useState<boolean>(false);

  const flashStatus = (msg: string, color: string = '#ffffff') => {
    setSaveStatus(msg);
    setSaveStatusColor(color);
  };

  const loadData = useCallback(async (monthId?: string) => {
    try {
      setLoading(true);
      const url = monthId ? `/api/data?monthId=${monthId}` : '/api/data';
      let res = await fetch(url);
      if (!res.ok) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        res = await fetch(url);
      }
      if (!res.ok) {
        const errorData = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(errorData?.error || `Failed to load data (${res.status})`);
      }
      const data = await res.json();

      setCurrentMonth(data.currentMonth);
      setAvailableMonths(data.availableMonths || []);
      setPackages(data.packages || []);
      setPatients(data.patients || []);
      flashStatus(`✔ Synced to Supabase (${new Date().toLocaleTimeString()})`, '#ffffff');
    } catch (err: any) {
      console.error(err);
      flashStatus('⚠ Error loading data', '#b71c1c');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/exchange-rate')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Rate unavailable'))))
      .then((data: { usdToPkr: number }) => {
        if (!cancelled && Number.isFinite(data.usdToPkr) && data.usdToPkr > 0) {
          setUsdToPkrRate(data.usdToPkr);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectMonth = (monthId: string) => {
    loadData(monthId);
  };

  const handleCreateMonth = async (year: number, month: number, carryOverFrom?: string) => {
    try {
      const res = await fetch('/api/months', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month, carryOverFrom }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create month');

      setAvailableMonths(data.months);
      await loadData(data.month.id);
      flashStatus(`✔ Created ${data.month.label}`, '#2e7d32');
    } catch (err: any) {
      alert(err.message || 'Could not create month');
    }
  };

  const handleSort = (col: 'sno' | 'name' | 'subscriber' | 'pkg') => {
    if (sortColumn === col) {
      setSortDirection((prev) => (prev === 1 ? -1 : 1));
    } else {
      setSortColumn(col);
      setSortDirection(1);
    }
  };

  const handleAddPatient = async (name: string, subscriber: string, packageId: number | null) => {
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthId: currentMonth.id, name, subscriber, packageId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add patient');

      setPatients((prev) => [...prev, data.patient]);
      setSearchQuery('');
      flashStatus('✔ Patient added', '#2e7d32');
    } catch (err: any) {
      alert(err.message || 'Could not add patient');
    }
  };

  const handleSavePackages = async (newPackages: Package[]) => {
    try {
      const res = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packages: newPackages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save packages');

      setPackages(data.packages);
      flashStatus('✔ Packages updated', '#2e7d32');
    } catch (err: any) {
      alert(err.message || 'Could not save packages');
    }
  };

  const handleReset = async () => {
    if (!window.confirm(`Reset all visit data and package selections for ${currentMonth.label}?`)) {
      return;
    }

    try {
      const res = await fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthId: currentMonth.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset');

      setPatients(data.patients);
      setSearchQuery('');
      setSortColumn(null);
      setSortDirection(1);
      flashStatus('✔ Reset completed', '#2e7d32');
    } catch (err: any) {
      alert(err.message || 'Could not reset');
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/export?monthId=${currentMonth.id}`);
      if (!res.ok) throw new Error('Failed to export data');
      const data = await res.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `patient-visit-data-${currentMonth.id}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      flashStatus('⬇ Exported', '#1A5276');
    } catch (err: any) {
      alert(err.message || 'Could not export');
    }
  };

  const handleImport = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const raw = e.target?.result as string;
          const parsed = JSON.parse(raw);

          const res = await fetch('/api/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ monthId: currentMonth.id, data: parsed }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to import');

          setPackages(data.packages);
          setPatients(data.patients);
          flashStatus('⬆ Imported successfully', '#2e7d32');
        } catch (err: any) {
          alert('Could not import file: ' + err.message);
        }
      };
      reader.readAsText(file);
    } catch (err: any) {
      alert('Could not read file: ' + err.message);
    }
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
        onOpenAddPatient={() => setIsAddPatientModalOpen(true)}
        onOpenPatientSearch={() => setIsPatientSearchOpen(true)}
        onOpenEnterVisit={() => setIsEnterVisitModalOpen(true)}
        onPrint={() => window.print()}
        onOpenPackages={() => setIsPackageModalOpen(true)}
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

      {/* Packages Modal */}
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

      {/* Add Patient Modal */}
      <AddPatientModal
        isOpen={isAddPatientModalOpen}
        packages={packages}
        onClose={() => setIsAddPatientModalOpen(false)}
        onAdd={handleAddPatient}
      />

      {/* Add Upcoming Month Modal */}
      <AddMonthModal
        isOpen={isAddMonthModalOpen}
        currentMonth={currentMonth}
        availableMonths={availableMonths}
        onClose={() => setIsAddMonthModalOpen(false)}
        onCreateMonth={handleCreateMonth}
      />

      <PatientSearchModal
        isOpen={isPatientSearchOpen}
        currentMonth={currentMonth}
        packages={packages}
        patients={patients}
        currency={currency}
        usdToPkrRate={usdToPkrRate}
        onClose={() => setIsPatientSearchOpen(false)}
      />

      {/* Enter Visit Data Modal */}
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
