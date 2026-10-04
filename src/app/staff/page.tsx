'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  UserPlus, Search, Filter, Phone, MessageCircle,
  Eye, Edit3, UserX, Users, ChevronDown, ArrowLeft,
} from 'lucide-react';
import {
  StaffMember, getDesignationLabel, getInitials, getAvatarColor,
  formatWhatsAppUrl, DESIGNATION_OPTIONS,
} from '@/lib/staffConstants';

async function fetchBatchSignedUrls(paths: (string | null | undefined)[]): Promise<Record<string, string>> {
  try {
    const res = await fetch('/api/photos/signed-urls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket: 'staff-photos', paths }),
    });
    if (!res.ok) return {};
    const { urls } = await res.json();
    return urls || {};
  } catch {
    return {};
  }
}

export default function StaffListPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  const [search, setSearch] = useState('');
  const [designationFilter, setDesignationFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (designationFilter) params.set('designation', designationFilter);
      if (genderFilter) params.set('gender', genderFilter);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/staff?${params}`);
      if (!res.ok) throw new Error('Failed to load staff');
      const { staff: rows } = await res.json();
      setStaff(rows || []);

      // Load all photos in one batch
      const paths = (rows || []).map((s: StaffMember) => s.photo_path);
      const urls = await fetchBatchSignedUrls(paths);
      setPhotoUrls(urls);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, designationFilter, genderFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => loadStaff(), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadStaff, search]);

  const handleDeactivate = async (member: StaffMember) => {
    if (!confirm(`Deactivate ${member.name}? They will be marked inactive but not deleted.`)) return;
    await fetch(`/api/staff/${member.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: false }),
    });
    loadStaff();
  };

  const genderBadgeStyle = (gender: string) => {
    if (gender === 'male') return { background: 'rgba(37, 99, 235, 0.12)', color: '#1d4ed8', border: '1px solid rgba(37, 99, 235, 0.3)' };
    if (gender === 'female') return { background: 'rgba(190, 24, 93, 0.1)', color: '#9d174d', border: '1px solid rgba(190, 24, 93, 0.3)' };
    return { background: 'rgba(71, 85, 105, 0.1)', color: '#334155', border: '1px solid rgba(71, 85, 105, 0.25)' };
  };

  const statusBadgeStyle = (active: boolean) =>
    active
      ? { background: 'rgba(21, 128, 61, 0.12)', color: '#15803d', border: '1px solid rgba(21, 128, 61, 0.3)' }
      : { background: 'rgba(100, 116, 139, 0.12)', color: '#475569', border: '1px solid rgba(100, 116, 139, 0.25)' };

  const genderLabel = (g: string) =>
    g === 'male' ? 'Male' : g === 'female' ? 'Female' : 'Other';

  // Summary counts
  const totalCount = staff.length;
  const activeCount = useMemo(() => staff.filter((s) => s.is_active).length, [staff]);
  const doctorCount = useMemo(() => staff.filter((s) => s.designation_type === 'doctor' && s.is_active).length, [staff]);
  const nursePhysioCount = useMemo(() => staff.filter((s) => (s.designation_type === 'nurse' || s.designation_type === 'physio') && s.is_active).length, [staff]);

  return (
    <div className="staff-page">
      {/* ── Header ── */}
      <div className="staff-page-header">
        <div className="staff-page-title">
          <div className="staff-header-icon-box">
            <Users size={24} />
          </div>
          <div>
            <h1>Staff Management</h1>
            <p>Comprehensive directory of Human Healthcare personnel &amp; specialists</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/" className="btn-staff-back-home" title="Return to main Patient Visit Sheet">
            <ArrowLeft size={16} />
            Patient Visit Sheet
          </Link>
          <Link href="/staff/new" className="btn-staff-add">
            <UserPlus size={16} />
            Add Staff Member
          </Link>
        </div>
      </div>

      {/* ── Summary Stat Cards ── */}
      <div className="staff-stats-grid">
        <div className="staff-stat-card">
          <span className="staff-stat-label">Total Personnel</span>
          <span className="staff-stat-val" style={{ color: '#60a5fa' }}>{totalCount}</span>
        </div>
        <div className="staff-stat-card">
          <span className="staff-stat-label">Active Staff</span>
          <span className="staff-stat-val" style={{ color: '#4ade80' }}>{activeCount}</span>
        </div>
        <div className="staff-stat-card">
          <span className="staff-stat-label">Active Doctors</span>
          <span className="staff-stat-val" style={{ color: '#a78bfa' }}>{doctorCount}</span>
        </div>
        <div className="staff-stat-card">
          <span className="staff-stat-label">Nurses &amp; Physios</span>
          <span className="staff-stat-val" style={{ color: '#f472b6' }}>{nursePhysioCount}</span>
        </div>
      </div>

      {/* ── Filters Bar ── */}
      <div className="staff-filters-bar">
        <div className="staff-search-box">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search by name, ID, phone number, designation…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="staff-filters-row">
          <Filter size={14} style={{ color: '#60a5fa', flexShrink: 0 }} />
          <select value={designationFilter} onChange={(e) => setDesignationFilter(e.target.value)} className="staff-filter-select">
            <option value="">All Designations</option>
            {DESIGNATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className="staff-filter-select">
            <option value="">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="staff-filter-select">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="staff-loading">Loading staff directory…</div>
      ) : staff.length === 0 ? (
        <div className="staff-empty-state">
          <Users size={46} style={{ color: 'rgba(255,255,255,0.3)', marginBottom: 12 }} />
          <h3>No staff members found</h3>
          <p>
            {search || designationFilter || genderFilter || statusFilter
              ? 'No records match your current search and filters.'
              : 'Start by registering your first staff member.'}
          </p>
          <Link href="/staff/new" className="btn-staff-add" style={{ marginTop: 16, display: 'inline-flex' }}>
            <UserPlus size={14} /> Add Staff Member
          </Link>
        </div>
      ) : (
        <div className="staff-table-wrapper">
          <table className="staff-table">
            <thead>
              <tr>
                <th style={{ width: 54 }}>Photo</th>
                <th>Staff ID</th>
                <th>Full Name &amp; S/O, W/O</th>
                <th>Designation</th>
                <th>Gender</th>
                <th>Contact</th>
                <th>WhatsApp</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => {
                const colors = getAvatarColor(member.staff_id);
                const photoUrl = member.photo_path ? photoUrls[member.photo_path] : null;
                return (
                  <tr key={member.id}>
                    <td>
                      <div
                        className="staff-table-avatar"
                        style={{
                          background: photoUrl ? 'transparent' : colors.bg,
                          color: colors.text,
                        }}
                      >
                        {photoUrl ? (
                          <img src={photoUrl} alt={member.name} />
                        ) : (
                          getInitials(member.name)
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="staff-id-badge">{member.staff_id}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong className="staff-name-text">{member.name}</strong>
                        <span className="staff-sub-text">S/O, W/O: {member.father_husband_name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="staff-desig-text">
                        {getDesignationLabel(member.designation_type, member.designation_custom)}
                      </span>
                    </td>
                    <td>
                      <span className="staff-badge" style={genderBadgeStyle(member.gender)}>
                        {genderLabel(member.gender)}
                      </span>
                    </td>
                    <td>
                      <a href={`tel:${member.contact_number}`} className="staff-phone-link">
                        <Phone size={12} style={{ display: 'inline', marginRight: 4 }} />
                        {member.contact_number}
                      </a>
                    </td>
                    <td>
                      {member.whatsapp ? (
                        <a
                          href={formatWhatsAppUrl(member.whatsapp)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="staff-wa-btn"
                          title="Open WhatsApp chat"
                        >
                          <MessageCircle size={15} />
                        </a>
                      ) : (
                        <span style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className="staff-badge" style={statusBadgeStyle(member.is_active)}>
                        <span
                          style={{
                            display: 'inline-block',
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: member.is_active ? '#4ade80' : '#9ca3af',
                            marginRight: 5,
                          }}
                        />
                        {member.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="staff-actions" style={{ justifyContent: 'center' }}>
                        <button
                          className="staff-action-btn view"
                          onClick={() => router.push(`/staff/${member.id}`)}
                          title="View complete profile"
                        >
                          <Eye size={13} /> View
                        </button>
                        <button
                          className="staff-action-btn edit"
                          onClick={() => router.push(`/staff/${member.id}/edit`)}
                          title="Edit staff details"
                        >
                          <Edit3 size={13} /> Edit
                        </button>
                        {member.is_active && (
                          <button
                            className="staff-action-btn deactivate"
                            onClick={() => handleDeactivate(member)}
                            title="Deactivate staff record"
                          >
                            <UserX size={13} /> Deactivate
                          </button>
                        )}
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
