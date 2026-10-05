'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  UserRound, Search, Filter, Eye, Users, ArrowLeft, Calendar, Stethoscope,
} from 'lucide-react';
import { getInitials, getPatientAvatarColor } from '@/lib/staffConstants';

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

const genderLabel = (g: string) => g === 'male' ? 'Male' : g === 'female' ? 'Female' : g || '—';

export default function PatientListPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  // Load available months for the filter dropdown
  useEffect(() => {
    fetch('/api/months')
      .then((r) => r.json())
      .then(({ months }) => {
        if (Array.isArray(months)) {
          setAvailableMonths(months.map((m: any) => m.id).sort().reverse());
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
  }, [search, genderFilter, monthFilter]);

  useEffect(() => {
    const timer = setTimeout(() => loadPatients(), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadPatients, search]);

  const totalCount = patients.length;
  const maleCount = useMemo(() => patients.filter((p) => p.gender === 'male').length, [patients]);
  const femaleCount = useMemo(() => patients.filter((p) => p.gender === 'female').length, [patients]);
  const withDoctorCount = useMemo(() => patients.filter((p) => p.assigned_doctor?.trim()).length, [patients]);

  const formatMonth = (id: string) => {
    if (!id) return '';
    const [y, m] = id.split('-');
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleString('en-PK', { month: 'long', year: 'numeric' });
  };

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
        </div>
      </div>

      {/* Summary Stats */}
      <div className="staff-stats-grid">
        <div className="staff-stat-card">
          <span className="staff-stat-label">Total Patients</span>
          <span className="staff-stat-val" style={{ color: '#60a5fa' }}>{totalCount}</span>
        </div>
        <div className="staff-stat-card">
          <span className="staff-stat-label">Male</span>
          <span className="staff-stat-val" style={{ color: '#38bdf8' }}>{maleCount}</span>
        </div>
        <div className="staff-stat-card">
          <span className="staff-stat-label">Female</span>
          <span className="staff-stat-val" style={{ color: '#f472b6' }}>{femaleCount}</span>
        </div>
        <div className="staff-stat-card">
          <span className="staff-stat-label">With Doctor</span>
          <span className="staff-stat-val" style={{ color: '#a78bfa' }}>{withDoctorCount}</span>
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
            {search || genderFilter || monthFilter
              ? 'No records match your current filters.'
              : 'Patients appear here once they are registered in a visit month.'}
          </p>
          <Link href="/" className="btn-staff-add" style={{ marginTop: 16, display: 'inline-flex' }}>
            <ArrowLeft size={14} /> Go to Visit Sheet
          </Link>
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
                <th><Calendar size={13} style={{ display: 'inline', marginRight: 4 }} />Last Month</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => {
                const colors = getPatientAvatarColor(patient.patient_id);
                const photoUrl = patient.photo_path ? photoUrls[patient.photo_path] : null;
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
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}