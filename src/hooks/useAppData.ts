'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Package, PatientMonthData, MonthInfo } from '@/lib/types';

const DEFAULT_USD_TO_PKR_RATE = 280;

function getCurrentMonthDefault(): MonthInfo {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const id = `${year}-${String(month).padStart(2, '0')}`;
  return { id, year, month, label: '', daysInMonth: 30 };
}

interface AppDataCallbacks {
  flashStatus: (msg: string, color?: string) => void;
  clearSearch: () => void;
  resetTable: () => void;
}

export function useAppData({ flashStatus, clearSearch, resetTable }: AppDataCallbacks) {
  const [currentMonth, setCurrentMonth] = useState<MonthInfo>(getCurrentMonthDefault);
  const [availableMonths, setAvailableMonths] = useState<MonthInfo[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [patients, setPatients] = useState<PatientMonthData[]>([]);
  const [currency, setCurrency] = useState<'PKR' | 'USD'>('PKR');
  const [usdToPkrRate, setUsdToPkrRate] = useState(DEFAULT_USD_TO_PKR_RATE);
  const [loading, setLoading] = useState(true);

  // Keep callback references stable to prevent re-fetch loops
  const callbacksRef = useRef({ flashStatus, clearSearch, resetTable });
  useEffect(() => {
    callbacksRef.current = { flashStatus, clearSearch, resetTable };
  });

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
      callbacksRef.current.flashStatus(`✔ Synced to Supabase (${new Date().toLocaleTimeString()})`, '#ffffff');
    } catch (err: unknown) {
      console.error(err);
      callbacksRef.current.flashStatus('⚠ Error loading data', '#b71c1c');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Fetch live exchange rate
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
    return () => { cancelled = true; };
  }, []);

  // ── Month handlers ──────────────────────────────────────────────────────────

  const handleSelectMonth = (monthId: string) => loadData(monthId);

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
      callbacksRef.current.flashStatus(`✔ Created ${data.month.label}`, '#2e7d32');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Could not create month');
    }
  };

  // ── Patient handlers ────────────────────────────────────────────────────────

  const handleSavePatient = async (
    name: string,
    subscriber: string,
    packageId: number | null,
    patientId?: number,
  ) => {
    try {
      if (patientId) {
        const res = await fetch(`/api/patients/${patientId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ monthId: currentMonth.id, name, subscriber, packageId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update patient');
        setPatients((prev) =>
          prev.map((p) => (p.id === patientId ? { ...p, name, subscriber, packageId } : p)),
        );
        callbacksRef.current.flashStatus('✔ Patient updated', '#2e7d32');
        return;
      }

      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthId: currentMonth.id, name, subscriber, packageId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add patient');
      setPatients((prev) => [...prev, data.patient]);
      callbacksRef.current.clearSearch();
      callbacksRef.current.flashStatus('✔ Patient added', '#2e7d32');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Could not save patient');
    }
  };

  const handleDeletePatient = async (patientId: number) => {
    try {
      const res = await fetch(`/api/patients/${patientId}?monthId=${currentMonth.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete patient');
      setPatients((prev) => prev.filter((p) => p.id !== patientId));
      callbacksRef.current.flashStatus('✔ Patient deleted', '#2e7d32');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Could not delete patient');
    }
  };

  // ── Package handlers ────────────────────────────────────────────────────────

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
      callbacksRef.current.flashStatus('✔ Packages updated', '#2e7d32');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Could not save packages');
    }
  };

  // ── Data operations ─────────────────────────────────────────────────────────

  const handleReset = async () => {
    if (!window.confirm(`Reset all visit data and package selections for ${currentMonth.label}?`)) return;
    try {
      const res = await fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthId: currentMonth.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset');
      setPatients(data.patients);
      callbacksRef.current.resetTable();
      callbacksRef.current.flashStatus('✔ Reset completed', '#2e7d32');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Could not reset');
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
      callbacksRef.current.flashStatus('⬇ Exported', '#1A5276');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Could not export');
    }
  };

  const handleImport = async (file: File) => {
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
        callbacksRef.current.flashStatus('⬆ Imported successfully', '#2e7d32');
      } catch (err: unknown) {
        alert('Could not import file: ' + (err instanceof Error ? err.message : String(err)));
      }
    };
    reader.onerror = () => alert('Could not read file.');
    reader.readAsText(file);
  };

  return {
    currentMonth,
    availableMonths,
    packages,
    patients,
    currency,
    setCurrency,
    usdToPkrRate,
    loading,
    loadData,
    handleSelectMonth,
    handleCreateMonth,
    handleSavePatient,
    handleDeletePatient,
    handleSavePackages,
    handleReset,
    handleExport,
    handleImport,
  };
}
