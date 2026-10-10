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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [isReadOnly, setIsReadOnly] = useState<boolean>(false);

  // Active abort controller for loadData requests to prevent race conditions
  const activeAbortControllerRef = useRef<AbortController | null>(null);

  // Keep callback references stable to prevent re-fetch loops
  const callbacksRef = useRef({ flashStatus, clearSearch, resetTable });
  useEffect(() => {
    callbacksRef.current = { flashStatus, clearSearch, resetTable };
  });

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/check');
      if (res.ok) {
        const info = await res.json().catch(() => null) as { role?: string } | null;
        setIsReadOnly(info?.role !== 'super_admin');
        setIsAuthenticated(true);
        return true;
      } else {
        setIsAuthenticated(false);
        setLoading(false);
        return false;
      }
    } catch {
      setIsAuthenticated(false);
      setLoading(false);
      return false;
    }
  }, []);

  const loadData = useCallback(async (monthId?: string) => {
    // Abort previous pending fetch request if any
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    activeAbortControllerRef.current = controller;

    try {
      setLoading(true);
      const url = monthId ? `/api/data?monthId=${monthId}` : '/api/data';
      const res = await fetch(url, { signal: controller.signal });
      
      if (res.status === 401) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
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
      setIsAuthenticated(true);

      if (typeof window !== 'undefined' && data.currentMonth?.id) {
        try {
          localStorage.setItem('hhc_selected_month', data.currentMonth.id);
          const url = new URL(window.location.href);
          if (url.searchParams.get('month') !== data.currentMonth.id) {
            url.searchParams.set('month', data.currentMonth.id);
            window.history.replaceState(null, '', url.toString());
          }
        } catch {
          // ignore storage or history errors
        }
      }

      callbacksRef.current.flashStatus(`✔ Synced to Supabase (${new Date().toLocaleTimeString()})`, '#ffffff');
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Ignore aborted requests
      }
      console.error(err);
      callbacksRef.current.flashStatus('⚠ Error loading data', '#b71c1c');
    } finally {
      if (activeAbortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  }, []);

  // Initial authentication check & data load (with URL / localStorage preference)
  useEffect(() => {
    checkAuth().then((authed) => {
      if (authed) {
        let initialMonthId: string | undefined;
        if (typeof window !== 'undefined') {
          try {
            const params = new URLSearchParams(window.location.search);
            const urlMonth = params.get('month') || params.get('monthId');
            if (urlMonth) {
              initialMonthId = urlMonth;
            } else {
              const saved = localStorage.getItem('hhc_selected_month');
              if (saved) initialMonthId = saved;
            }
          } catch {
            // fallback
          }
        }
        loadData(initialMonthId);
      }
    });
  }, [checkAuth, loadData]);

  // Support browser forward/back buttons
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const m = params.get('month') || params.get('monthId');
        if (m && m !== currentMonth.id) {
          loadData(m);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentMonth.id, loadData]);

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

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      setIsAuthenticated(false);
    }
  };

  const handleLoginSuccess = async () => {
    await checkAuth();
    setIsAuthenticated(true);
    let initialMonthId: string | undefined;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      initialMonthId = params.get('month') || params.get('monthId') || localStorage.getItem('hhc_selected_month') || undefined;
    }
    loadData(initialMonthId);
  };

  // ── Month handlers ──────────────────────────────────────────────────────────

  const handleSelectMonth = useCallback((monthId: string) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('hhc_selected_month', monthId);
        const url = new URL(window.location.href);
        url.searchParams.set('month', monthId);
        window.history.pushState(null, '', url.toString());
      } catch {
        // ignore
      }
    }
    loadData(monthId);
  }, [loadData]);

  const handleOpenInNewWindow = useCallback((monthId: string) => {
    if (typeof window !== 'undefined') {
      const url = `/?month=${encodeURIComponent(monthId)}`;
      window.open(url, `_blank_hhc_${monthId}`, 'width=1450,height=950,menubar=no,toolbar=no');
    }
  }, []);

  const handleCreateMonth = async (year: number, month: number, carryOverFrom?: string) => {
    try {
      const res = await fetch('/api/months', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month, carryOverFrom }),
      });
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create month');
      setAvailableMonths(data.months);
      handleSelectMonth(data.month.id);
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
    try {
      const payload = {
        monthId: currentMonth.id,
        name,
        subscriber,
        packageId,
        subscriberEmail: extra?.subscriberEmail || '',
        fatherHusbandName: extra?.fatherHusbandName || '',
        dob: extra?.dob || '',
        gender: extra?.gender || '',
        address: extra?.address || '',
        googleAddressLocation: extra?.googleAddressLocation || '',
        assignedDoctor: extra?.assignedDoctor || '',
      };

      if (patientId) {
        const res = await fetch(`/api/patients/${patientId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.status === 401) {
          setIsAuthenticated(false);
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update patient');
        setPatients((prev) =>
          prev.map((p) =>
            p.id === patientId
              ? {
                  ...p,
                  name,
                  subscriber,
                  packageId,
                  subscriberEmail: payload.subscriberEmail,
                  fatherHusbandName: payload.fatherHusbandName,
                  dob: payload.dob,
                  gender: payload.gender,
                  address: payload.address,
                  googleAddressLocation: payload.googleAddressLocation,
                  assignedDoctor: payload.assignedDoctor,
                }
              : p
          )
        );
        callbacksRef.current.flashStatus('✔ Patient updated', '#2e7d32');
        return;
      }

      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
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
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
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
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
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
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
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
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
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
        if (res.status === 401) {
          setIsAuthenticated(false);
          return;
        }
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
    isAuthenticated,
    isReadOnly,
    handleLoginSuccess,
    handleLogout,
    loadData,
    handleSelectMonth,
    handleCreateMonth,
    handleOpenInNewWindow,
    handleSavePatient,
    handleDeletePatient,
    handleSavePackages,
    handleReset,
    handleExport,
    handleImport,
  };
}
