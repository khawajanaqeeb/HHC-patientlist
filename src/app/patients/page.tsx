'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  UserRound, Search, Filter, Eye, ArrowLeft, Calendar, Stethoscope,
  Edit3, UserX, UserCheck, Trash2, UserPlus,
} from 'lucide-react';
import { getInitials, getPatientAvatarColor } from '@/lib/staffConstants';
import { AddPatientModal } from '@/components/AddPatientModal';
import { Package } from '@/lib/types';

interface PatientRow {
  patient_id: number;
  month_id: string;
  name: string;
  subscriber: string;
  subscriber_email: string;
  father_husband_name: string;
  dob: string;
  gender: string;
  address: string;
  google_address_location: string;
  assigned_doctor: string;
  package_id: number | null;
  med_given: number;
  photo_path: string | null;
  is_active: boolean;
}

async function fetchBatchSignedUrls(paths: (string | null | undefined)[]): Promise<Record<string, string>> {
  try {
    const valid = paths.filter(Boolean);
    if (!valid.length) return {};
    const res = await fetch('/api/photos/signed-urls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket: 'patient-photos', paths: valid }),
    });
    if (!res.ok) return {};
    const { urls } = await res.json();
    return urls || {};
  } catch {
    return {};
  }
}

const genderBadgeStyle = (gender: string) => {
  if (gender === 'male') return { background: 'rgba(37, 99, 235, 0.12)', color: '#1d4ed8', border: '1px solid rgba(37, 99, 235, 0.3)' };
  if (gender === 'female') return { background: 'rgba(190, 24, 93, 0.1)', color: '#9d174d', border: '1px solid rgba(190, 24, 93, 0.3)' };
  return { background: 'rgba(71, 85, 105, 0.1)', color: '#334155', border: '1px solid rgba(71, 85, 105, 0.25)' };
};

const statusBadgeStyle = (active: boolean) =>
  active
    ? { background: 'rgba(21, 128, 61, 0.12)', color: '#15803d', border: '1px solid rgba(21, 128, 61, 0.3)' }
    : { background: 'rgba(100, 116, 139, 0.12)', color: '#475569', border: '1px solid rgba(100, 116, 139, 0.25)' };

const genderLabel = (g: string) => g === 'male' ? 'Male' : g === 'female' ? 'Female' : g || '—';

export default function PatientListPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);

  // Add Patient Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Load available months and packages
  useEffect(() => {
    fetch('/api/months')
      .then((r) => r.json())
      .then(({ months }) => {
        if (Array.isArray(months)) {
          setAvailableMonths(months.map((m: any) => m.id).sort().reverse());
        }
      })
      .catch(() => {});

    fetch('/api/packages')
      .then((r) => r.json())
      .then(({ packages: pkgs }) => {
        if (Array.isArray(pkgs)) {
          setPackages(pkgs);
        }
      })
      .catch(() => {});
  }, []);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (genderFilter) params.set('gender', genderFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (monthFilter) params.set('month', monthFilter);

      const res = await fetch(`/api/patients/all?${params}`);
      if (!res.ok) throw new Error('Failed to load patients');
      const { patients: rows } = await res.json();
      setPatients(rows || []);

      const paths = (rows || []).map((p: PatientRow) => p.photo_path);
      const urls = await fetchBatchSignedUrls(paths);
      setPhotoUrls(urls);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, genderFilter, statusFilter, monthFilter]);

  useEffect(() => {
    const timer = setTimeout(() => loadPatients(), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadPatients, search]);

  const handleToggleActive = async (patient: PatientRow) => {
    const nextStatus = !patient.is_active;
    const actionName = nextStatus ? 'activate' : 'deactivate';
    if (!confirm(`Are you sure you want to ${actionName} patient "${patient.name}"?`)) return;

    try {
      const res = await fetch(`/api/patients/${patient.patient_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextStatus }),
      });
      if (!res.ok) throw new Error(`Failed to ${actionName} patient`);
      loadPatients();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  const confirmAndDelete = async (patient: PatientRow) => {
    const confirmed = window.confirm(
      `⚠️ WARNING: Delete patient "${patient.name}" (P-${String(patient.patient_id).padStart(3, '0')})?\n\nThis will permanently remove all profile details and visit records for this patient across all months. This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/patients/${patient.patient_id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || 'Failed to delete patient');
      }
      loadPatients();
    } catch (err: any) {
      alert(err.message || 'Deletion failed');
    }
  };

  const handleAddPatient = async (
    name: string,
    subscriber: string,
    packageId: number | null,
    _patientId?: number,
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
    const targetMonthId = monthFilter || availableMonths[0] || new Date().toISOString().slice(0, 7);

    const res = await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        monthId: targetMonthId,
        name,
        subscriber,
        packageId,
        ...extra,
      }),
    });

    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error || 'Failed to add patient');
    }

    loadPatients();
  };

  const totalCount = patients.length;
  const activeCount = useMemo(() => patients.filter((p) => p.is_active !== false).length, [patients]);
  const maleCount = useMemo(() => patients.filter((p) => p.gender === 'male').length, [patients]);
  const femaleCount = useMemo(() => patients.filter((p) => p.gender === 'female').length, [patients]);

  const formatMonth = (id: string) => {
    if (!id) return '';
    const [y, m] = id.split('-');
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleString('en-PK', { month: 'long', year: 'numeric' });
  };

  const currentMonthLabel = availableMonths.length > 0 ? formatMonth(availableMonths[0]) : 'Current Month';
  const currentMonthId = availableMonths[0] || new Date().toISOString().slice(0, 7);

  return (
    <div className="staff-page">
      {/* Header */}
      <div className="staff-page-header">
        <div className="staff-page-title">
          <div className="staff-header-icon-box">
            <UserRound size={24} />
          </div>
          <div>
            <h1>Patient Directory</h1>
            <p>Complete directory of all registered HHC patients</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/" className="btn-staff-back-home" title="Return to Patient Visit Sheet">
            <ArrowLeft size={16} />
            Patient Visit Sheet
          </Link>
          <button
            className="btn-staff-add"
            onClick={() => setIsAddModalOpen(true)}
            title="Register a new patient"
          >
            <UserPlus size={16} />
            Add Patient
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="staff-stats-grid">
        <div className="staff-stat-card">
          <span className="staff-stat-label">Total Patients</span>
          <span className="staff-stat-val" style={{ color: '#60a5fa' }}>{totalCount}</span>
        </div>
        <div className="staff-stat-card">
          <span className="staff-stat-label">Active Patients</span>
          <span className="staff-stat-val" style={{ color: '#4ade80' }}>{activeCount}</span>
        </div>
        <div className="staff-stat-card">
          <span className="staff-stat-label">Male</span>
          <span className="staff-stat-val" style={{ color: '#38bdf8' }}>{maleCount}</span>
        </div>
        <div className="staff-stat-card">
          <span className="staff-stat-label">Female</span>
          <span className="staff-stat-val" style={{ color: '#f472b6' }}>{femaleCount}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="staff-filters-bar">
        <div className="staff-search-box">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search by name, subscriber, doctor, ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="staff-filters-row">
          <Filter size={14} style={{ color: '#60a5fa', flexShrink: 0 }} />
          <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className="staff-filter-select">
            <option value="">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="staff-filter-select">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="staff-filter-select">
            <option value="">All Months</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>{formatMonth(m)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="staff-loading">Loading patient directory…</div>
      ) : patients.length === 0 ? (
        <div className="staff-empty-state">
          <UserRound size={46} style={{ color: 'rgba(255,255,255,0.3)', marginBottom: 12 }} />
          <h3>No patients found</h3>
          <p>
            {search || genderFilter || statusFilter || monthFilter
              ? 'No records match your current filters.'
              : 'Patients appear here once they are registered in a visit month.'}
          </p>
          <button
            className="btn-staff-add"
            style={{ marginTop: 16, display: 'inline-flex' }}
            onClick={() => setIsAddModalOpen(true)}
          >
            <UserPlus size={14} /> Add Patient
          </button>
        </div>
      ) : (
        <div className="staff-table-wrapper">
          <table className="staff-table">
            <thead>
              <tr>
                <th style={{ width: 54 }}>Photo</th>
                <th>ID</th>
                <th>Full Name</th>
                <th>Subscriber</th>
                <th>Gender</th>
                <th>Date of Birth</th>
                <th><Stethoscope size={13} style={{ display: 'inline', marginRight: 4 }} />Doctor</th>
                <th>Status</th>
                <th><Calendar size={13} style={{ display: 'inline', marginRight: 4 }} />Last Month</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => {
                const colors = getPatientAvatarColor(patient.patient_id);
                const photoUrl = patient.photo_path ? photoUrls[patient.photo_path] : null;
                const isActive = patient.is_active !== false;

                return (
                  <tr key={patient.patient_id}>
                    <td>
                      <div
                        className="staff-table-avatar"
                        style={{
                          background: photoUrl ? 'transparent' : colors.bg,
                          color: colors.text,
                        }}
                      >
                        {photoUrl ? (
                          <img src={photoUrl} alt={patient.name} />
                        ) : (
                          getInitials(patient.name)
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="staff-id-badge">P-{String(patient.patient_id).padStart(3, '0')}</span>
                    </td>
                    <td>
                      <strong className="staff-name-text">{patient.name}</strong>
                    </td>
                    <td>
                      <span className="staff-desig-text">{patient.subscriber || '—'}</span>
                    </td>
                    <td>
                      {patient.gender ? (
                        <span className="staff-badge" style={genderBadgeStyle(patient.gender)}>
                          {genderLabel(patient.gender)}
                        </span>
                      ) : (
                        <span style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className="staff-desig-text">{patient.dob || '—'}</span>
                    </td>
                    <td>
                      <span className="staff-desig-text">{patient.assigned_doctor || '—'}</span>
                    </td>
                    <td>
                      <span className="staff-badge" style={statusBadgeStyle(isActive)}>
                        <span
                          style={{
                            display: 'inline-block',
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: isActive ? '#4ade80' : '#9ca3af',
                            marginRight: 5,
                          }}
                        />
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <span className="staff-desig-text">{formatMonth(patient.month_id)}</span>
                    </td>
                    <td>
                      <div className="staff-actions" style={{ justifyContent: 'center' }}>
                        <button
                          className="staff-action-btn view"
                          onClick={() => router.push(`/patients/${patient.patient_id}`)}
                          title="View complete profile"
                        >
                          <Eye size={13} /> View
                        </button>
                        <button
                          className="staff-action-btn edit"
                          onClick={() => router.push(`/patients/${patient.patient_id}/edit`)}
                          title="Edit patient details"
                        >
                          <Edit3 size={13} /> Edit
                        </button>
                        <button
                          className={`staff-action-btn ${isActive ? 'deactivate' : 'edit'}`}
                          onClick={() => handleToggleActive(patient)}
                          title={isActive ? 'Deactivate patient record' : 'Reactivate patient record'}
                        >
                          {isActive ? <UserX size={13} /> : <UserCheck size={13} />}
                          {isActive ? ' Deactivate' : ' Activate'}
                        </button>
                        <button
                          className="staff-action-btn deactivate"
                          style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                          onClick={() => confirmAndDelete(patient)}
                          title="Delete patient permanently"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Patient Modal */}
      <AddPatientModal
        isOpen={isAddModalOpen}
        currentMonth={{ id: currentMonthId, label: currentMonthLabel }}
        packages={packages}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddPatient}
      />
    </div>
  );
}