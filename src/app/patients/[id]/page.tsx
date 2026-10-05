'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  ChevronLeft, Edit3, Mail, MapPin, Calendar, ExternalLink, ArrowLeft,
  Stethoscope, Package2, Camera,
} from 'lucide-react';
import { getInitials, getPatientAvatarColor } from '@/lib/staffConstants';
import { validatePhotoFile } from '@/lib/photo';

interface PatientRecord {
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

async function uploadPatientPhoto(file: File, entityId: string): Promise<string | null> {
  const formData = new FormData();
  formData.append('bucket', 'patient-photos');
  formData.append('entityId', entityId);
  formData.append('file', file);
  const res = await fetch('/api/photos/upload', { method: 'POST', body: formData });
  if (!res.ok) return null;
  const { path } = await res.json();
  return path;
}

export default function PatientProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [months, setMonths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);

  const loadPatient = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/patients/${params.id}`);
      if (!res.ok) { router.replace('/patients'); return; }
      const { patient: p, months: m } = await res.json();
      setPatient(p);
      setMonths(m || []);

      if (p.photo_path) {
        try {
          const urlRes = await fetch('/api/photos/signed-urls', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bucket: 'patient-photos', paths: [p.photo_path] }),
          });
          const { urls } = await urlRes.json();
          setPhotoUrl(urls?.[p.photo_path] || null);
        } catch { /* fallback to initials */ }
      }
    } catch { router.replace('/patients'); }
    finally { setLoading(false); }
  }, [params.id, router]);

  useEffect(() => { loadPatient(); }, [loadPatient]);

  const handlePhotoClick = () => {
    setPhotoError('');
    photoInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !patient) return;
    const err = validatePhotoFile(file);
    if (err) { setPhotoError(err); e.target.value = ''; return; }

    setPhotoUploading(true);
    setPhotoError('');
    try {
      const entityId = `patient-${patient.patient_id}`;
      const path = await uploadPatientPhoto(file, entityId);
      if (!path) throw new Error('Upload failed');

      await fetch(`/api/patients/${patient.patient_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_path: path }),
      });

      const previewUrl = URL.createObjectURL(file);
      setPhotoUrl(previewUrl);
      setPatient((prev) => prev ? { ...prev, photo_path: path } : prev);
    } catch (err: any) {
      setPhotoError(err.message || 'Failed to upload photo');
    } finally {
      setPhotoUploading(false);
      e.target.value = '';
    }
  };

  if (loading) return <div className="staff-loading">Loading patient profile…</div>;
  if (!patient) return null;

  const colors = getPatientAvatarColor(patient.patient_id);
  const initials = getInitials(patient.name);
  const genderLabel = patient.gender === 'male' ? 'Male' : patient.gender === 'female' ? 'Female' : patient.gender || '—';
  const formatDate = (d: string) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-PK', { dateStyle: 'long' }); } catch { return d; }
  };
  const formatMonth = (id: string) => {
    if (!id) return id;
    const [y, m] = id.split('-');
    const dt = new Date(Number(y), Number(m) - 1, 1);
    return dt.toLocaleString('en-PK', { month: 'long', year: 'numeric' });
  };
  const patientIdLabel = `P-${String(patient.patient_id).padStart(3, '0')}`;

  return (
    <div className="staff-profile-page">
      <div className="staff-profile-topbar" style={{ gap: 10 }}>
        <Link href="/patients" className="staff-back-btn">
          <ChevronLeft size={16} /> All Patients
        </Link>
        <Link href="/" className="btn-staff-back-home" style={{ padding: '6px 12px', fontSize: '0.82rem' }}>
          <ArrowLeft size={16} /> Main Sheet
        </Link>
      </div>

      <div className="staff-profile-layout">
        {/* Left: Profile Card */}
        <aside className="staff-profile-card">
          {/* Photo with upload overlay */}
          <div className="staff-profile-avatar-wrap" style={{ position: 'relative', display: 'inline-block' }}>
            <div
              className="staff-profile-avatar"
              style={{ background: photoUrl ? 'transparent' : colors.bg, color: colors.text, cursor: 'pointer' }}
              onClick={handlePhotoClick}
              title="Click to change photo"
            >
              {photoUrl
                ? <img src={photoUrl} alt={patient.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials
              }
            </div>
            <button
              type="button"
              onClick={handlePhotoClick}
              disabled={photoUploading}
              title="Upload photo"
              style={{
                position: 'absolute', bottom: 4, right: 4,
                width: 30, height: 30, borderRadius: '50%',
                background: 'linear-gradient(135deg, #1a5276, #2980b9)',
                border: '2px solid rgba(255,255,255,0.85)',
                color: '#fff', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              <Camera size={14} />
            </button>
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handlePhotoChange}
          />
          {photoUploading && (
            <div style={{ fontSize: '0.72rem', color: '#60a5fa', marginTop: 6 }}>Uploading…</div>
          )}
          {photoError && (
            <div style={{ fontSize: '0.72rem', color: '#f87171', marginTop: 4 }}>{photoError}</div>
          )}

          <div className="staff-profile-id">{patientIdLabel}</div>
          <div className="staff-profile-name">{patient.name}</div>
          <div className="staff-profile-desig">{patient.subscriber ? `Subscriber: ${patient.subscriber}` : 'No subscriber'}</div>

          {patient.gender && (
            <span
              className="staff-badge"
              style={patient.gender === 'male'
                ? { background: '#dbeafe', color: '#1e40af', margin: '8px auto 0', display: 'flex', width: 'fit-content', gap: 4 }
                : { background: '#fce7f3', color: '#9d174d', margin: '8px auto 0', display: 'flex', width: 'fit-content', gap: 4 }
              }
            >
              {genderLabel}
            </span>
          )}

          <div className="staff-profile-card-actions">
            <Link
              href={`/patients/${patient.patient_id}/edit`}
              className="btn-staff-edit"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Edit3 size={14} /> Edit Patient Profile
            </Link>
          </div>
        </aside>

        {/* Right: Detail Sections */}
        <div className="staff-profile-detail">
          {/* Personal Information */}
          <section className="staff-detail-section">
            <div className="staff-detail-section-header">Personal Information</div>
            <div className="staff-detail-grid">
              {patient.father_husband_name && (
                <div className="staff-detail-row">
                  <span>Father / Husband Name</span>
                  <strong>{patient.father_husband_name}</strong>
                </div>
              )}
              <div className="staff-detail-row">
                <span>Gender</span>
                <strong>{genderLabel}</strong>
              </div>
              {patient.dob && (
                <div className="staff-detail-row">
                  <span><Calendar size={13} /> Date of Birth</span>
                  <strong>{patient.dob}</strong>
                </div>
              )}
            </div>
          </section>

          {/* Healthcare */}
          <section className="staff-detail-section">
            <div className="staff-detail-section-header">Healthcare</div>
            <div className="staff-detail-grid">
              {patient.assigned_doctor && (
                <div className="staff-detail-row">
                  <span><Stethoscope size={13} /> Assigned Doctor</span>
                  <strong>{patient.assigned_doctor}</strong>
                </div>
              )}
              {patient.subscriber && (
                <div className="staff-detail-row">
                  <span>Subscriber</span>
                  <strong>{patient.subscriber}</strong>
                </div>
              )}
              {patient.subscriber_email && (
                <div className="staff-detail-row">
                  <span><Mail size={13} /> Subscriber Email</span>
                  <strong><a href={`mailto:${patient.subscriber_email}`} className="staff-phone-link">{patient.subscriber_email}</a></strong>
                </div>
              )}
              {patient.package_id && (
                <div className="staff-detail-row">
                  <span><Package2 size={13} /> Package ID</span>
                  <strong>#{patient.package_id}</strong>
                </div>
              )}
            </div>
          </section>

          {/* Address */}
          {(patient.address || patient.google_address_location) && (
            <section className="staff-detail-section">
              <div className="staff-detail-section-header">Location</div>
              <div className="staff-detail-grid">
                {patient.address && (
                  <div className="staff-detail-row">
                    <span><MapPin size={13} /> Address</span>
                    <strong style={{ whiteSpace: 'pre-line' }}>{patient.address}</strong>
                  </div>
                )}
                {patient.google_address_location && (
                  <div className="staff-detail-row">
                    <span>Maps Link</span>
                    <strong>
                      <a href={patient.google_address_location} target="_blank" rel="noopener noreferrer" className="staff-phone-link">
                        <ExternalLink size={12} /> View on Google Maps
                      </a>
                    </strong>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Visit History */}
          <section className="staff-detail-section">
            <div className="staff-detail-section-header">Visit History</div>
            <div className="staff-detail-grid">
              <div className="staff-detail-row">
                <span>Patient ID</span>
                <strong><span className="staff-id-badge">{patientIdLabel}</span></strong>
              </div>
              <div className="staff-detail-row">
                <span>Months Enrolled</span>
                <strong>{months.length}</strong>
              </div>
              {months.length > 0 && (
                <div className="staff-detail-row">
                  <span>Latest Month</span>
                  <strong>{formatMonth(months[0])}</strong>
                </div>
              )}
              {months.length > 1 && (
                <div className="staff-detail-row">
                  <span>All Months</span>
                  <strong style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {months.map((m) => (
                      <span key={m} className="staff-id-badge" style={{ fontSize: '0.72rem' }}>{m}</span>
                    ))}
                  </strong>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}