'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { ChevronLeft, Edit3, UserCheck, UserX, Phone, Mail, MapPin, Calendar, Info, ExternalLink, ArrowLeft } from 'lucide-react';
import {
  StaffMember, getDesignationLabel, getInitials, getAvatarColor, formatWhatsAppUrl,
} from '@/lib/staffConstants';

export default function StaffProfilePage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [member, setMember] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadMember = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/${params.id}`);
      if (!res.ok) { router.replace('/staff'); return; }
      const { staff } = await res.json();
      setMember(staff);

      // Load signed photo URL
      if (staff.photo_path) {
        try {
          const urlRes = await fetch('/api/photos/signed-urls', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bucket: 'staff-photos', paths: [staff.photo_path] }),
          });
          const { urls } = await urlRes.json();
          setPhotoUrl(urls?.[staff.photo_path] || null);
        } catch { /* fall back to initials */ }
      }
    } catch { router.replace('/staff'); }
    finally { setLoading(false); }
  }, [params.id, router]);

  useEffect(() => {
    loadMember();
    const success = searchParams.get('success');
    const name = searchParams.get('name');
    const staffId = searchParams.get('staffId');
    if (success === 'added' && name) {
      setSuccessMsg(`✓ ${name} (${staffId}) added successfully.`);
    } else if (success === 'updated' && name) {
      setSuccessMsg(`✓ ${name} updated successfully.`);
    }
  }, [loadMember, searchParams]);

  const handleToggleActive = async () => {
    if (!member) return;
    setActionLoading(true);
    await fetch(`/api/staff/${member.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !member.is_active }),
    });
    setShowDeactivateDialog(false);
    await loadMember();
    setActionLoading(false);
  };

  if (loading) return <div className="staff-loading">Loading profile…</div>;
  if (!member) return null;

  const colors = getAvatarColor(member.staff_id);
  const initials = getInitials(member.name);
  const genderLabel = member.gender === 'male' ? 'Male' : member.gender === 'female' ? 'Female' : 'Other';
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-PK', { dateStyle: 'long' });

  return (
    <div className="staff-profile-page">
      {successMsg && (
        <div className="staff-success-banner">
          {successMsg}
          <button onClick={() => setSuccessMsg('')}>✕</button>
        </div>
      )}

      <div className="staff-profile-topbar" style={{ gap: 10 }}>
        <Link href="/staff" className="staff-back-btn">
          <ChevronLeft size={16} /> All Staff
        </Link>
        <Link href="/" className="btn-staff-back-home" style={{ padding: '6px 12px', fontSize: '0.82rem' }}>
          <ArrowLeft size={16} /> Main Sheet
        </Link>
      </div>

      <div className="staff-profile-layout">
        {/* ── Left: Profile Card ── */}
        <aside className="staff-profile-card">
          <div className="staff-profile-avatar-wrap">
            <div
              className="staff-profile-avatar"
              style={{ background: photoUrl ? 'transparent' : colors.bg, color: colors.text }}
            >
              {photoUrl
                ? <img src={photoUrl} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials
              }
            </div>
          </div>
          <div className="staff-profile-id">{member.staff_id}</div>
          <div className="staff-profile-name">{member.name}</div>
          <div className="staff-profile-desig">
            {getDesignationLabel(member.designation_type, member.designation_custom)}
          </div>
          <span
            className="staff-badge"
            style={member.is_active
              ? { background: '#dcfce7', color: '#166534', margin: '8px auto 0', display: 'flex', width: 'fit-content', alignItems: 'center', gap: 4 }
              : { background: '#f3f4f6', color: '#6b7280', margin: '8px auto 0', display: 'flex', width: 'fit-content', alignItems: 'center', gap: 4 }
            }
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: member.is_active ? '#16a34a' : '#9ca3af', display: 'inline-block' }} />
            {member.is_active ? 'Active' : 'Inactive'}
          </span>

          <div className="staff-profile-card-actions">
            <button
              className="btn-staff-edit"
              onClick={() => router.push(`/staff/${member.id}/edit`)}
            >
              <Edit3 size={14} /> Edit Profile
            </button>
            {member.is_active ? (
              <button
                className="btn-staff-deactivate"
                onClick={() => setShowDeactivateDialog(true)}
              >
                <UserX size={14} /> Deactivate
              </button>
            ) : (
              <button
                className="btn-staff-reactivate"
                onClick={handleToggleActive}
                disabled={actionLoading}
              >
                <UserCheck size={14} /> Reactivate
              </button>
            )}
          </div>
        </aside>

        {/* ── Right: Detail Sections ── */}
        <div className="staff-profile-detail">
          {/* Personal Information */}
          <section className="staff-detail-section">
            <div className="staff-detail-section-header">Personal Information</div>
            <div className="staff-detail-grid">
              <div className="staff-detail-row">
                <span>Father / Husband Name</span>
                <strong>{member.father_husband_name}</strong>
              </div>
              <div className="staff-detail-row">
                <span>Gender</span>
                <strong>{genderLabel}</strong>
              </div>
              {member.qualification && (
                <div className="staff-detail-row">
                  <span>Qualification</span>
                  <strong>{member.qualification}</strong>
                </div>
              )}
            </div>
          </section>

          {/* Contact Information */}
          <section className="staff-detail-section">
            <div className="staff-detail-section-header">Contact Information</div>
            <div className="staff-detail-grid">
              <div className="staff-detail-row">
                <span><Phone size={13} /> Contact Number</span>
                <strong><a href={`tel:${member.contact_number}`} className="staff-phone-link">{member.contact_number}</a></strong>
              </div>
              {member.whatsapp && (
                <div className="staff-detail-row">
                  <span>WhatsApp</span>
                  <strong>
                    <a href={formatWhatsAppUrl(member.whatsapp)} target="_blank" rel="noopener noreferrer" className="staff-phone-link">
                      {member.whatsapp}
                    </a>
                  </strong>
                </div>
              )}
              {member.email && (
                <div className="staff-detail-row">
                  <span><Mail size={13} /> Email</span>
                  <strong><a href={`mailto:${member.email}`} className="staff-phone-link">{member.email}</a></strong>
                </div>
              )}
            </div>
          </section>

          {/* Location */}
          {(member.address || member.google_maps_url) && (
            <section className="staff-detail-section">
              <div className="staff-detail-section-header">Location</div>
              <div className="staff-detail-grid">
                {member.address && (
                  <div className="staff-detail-row">
                    <span><MapPin size={13} /> Address</span>
                    <strong style={{ whiteSpace: 'pre-line' }}>{member.address}</strong>
                  </div>
                )}
                {member.google_maps_url && (
                  <div className="staff-detail-row">
                    <span>Maps Link</span>
                    <strong>
                      <a href={member.google_maps_url} target="_blank" rel="noopener noreferrer" className="staff-phone-link">
                        <ExternalLink size={12} /> View on Google Maps
                      </a>
                    </strong>
                  </div>
                )}
              </div>
              {member.latitude && member.longitude && (
                <div className="staff-map-preview" style={{ marginTop: 12 }}>
                  <iframe
                    title="Location map"
                    width="100%"
                    height="200"
                    style={{ border: 0, borderRadius: 10 }}
                    loading="lazy"
                    src={`https://maps.google.com/maps?q=${member.latitude},${member.longitude}&z=15&output=embed`}
                  />
                </div>
              )}
            </section>
          )}

          {/* System Information */}
          <section className="staff-detail-section">
            <div className="staff-detail-section-header">System Information</div>
            <div className="staff-detail-grid">
              <div className="staff-detail-row">
                <span>Staff ID</span>
                <strong><span className="staff-id-badge">{member.staff_id}</span></strong>
              </div>
              <div className="staff-detail-row">
                <span><Calendar size={13} /> Added On</span>
                <strong>{formatDate(member.created_at)}</strong>
              </div>
              <div className="staff-detail-row">
                <span>Last Updated</span>
                <strong>{formatDate(member.updated_at)}</strong>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Deactivate Confirmation Dialog */}
      {showDeactivateDialog && (
        <div className="staff-dialog-backdrop" onClick={() => setShowDeactivateDialog(false)}>
          <div className="staff-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Deactivate {member.name}?</h3>
            <p>
              This will mark <strong>{member.name}</strong> ({member.staff_id}) as inactive.
              Their record will be preserved and can be reactivated at any time.
            </p>
            <div className="staff-dialog-actions">
              <button className="btn-staff-cancel" onClick={() => setShowDeactivateDialog(false)}>
                Cancel
              </button>
              <button className="btn-staff-deactivate" onClick={handleToggleActive} disabled={actionLoading}>
                <UserX size={14} /> {actionLoading ? 'Deactivating…' : 'Yes, Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
