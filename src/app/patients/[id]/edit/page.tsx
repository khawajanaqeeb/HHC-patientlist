'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Save, X, Stethoscope, User, Calendar, MapPin, Mail, Package2 } from 'lucide-react';
import { PhotoUpload } from '@/components/PhotoUpload';
import { getInitials, getPatientAvatarColor } from '@/lib/staffConstants';

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
  is_active: boolean;
}

async function uploadPhotoToServer(file: File, entityId: string): Promise<string | null> {
  const formData = new FormData();
  formData.append('bucket', 'patient-photos');
  formData.append('entityId', entityId);
  formData.append('file', file);
  const res = await fetch('/api/photos/upload', { method: 'POST', body: formData });
  if (!res.ok) return null;
  const { path } = await res.json();
  return path;
}

async function deletePhotoFromServer(path: string): Promise<void> {
  await fetch('/api/photos/upload', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucket: 'patient-photos', path }),
  });
}

export default function EditPatientPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<PatientRecord | null>(null);

  // Photo state
  const [existingPhotoPath, setExistingPhotoPath] = useState<string | null>(null);
  const [photoDisplayUrl, setPhotoDisplayUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [subscriber, setSubscriber] = useState('');
  const [subscriberEmail, setSubscriberEmail] = useState('');
  const [fatherHusbandName, setFatherHusbandName] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [assignedDoctor, setAssignedDoctor] = useState('');
  const [address, setAddress] = useState('');
  const [googleAddressLocation, setGoogleAddressLocation] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/patients/${params.id}`);
      if (!res.ok) { router.replace('/patients'); return; }
      const { patient: p } = await res.json();
      setPatient(p);
      setName(p.name || '');
      setSubscriber(p.subscriber || '');
      setSubscriberEmail(p.subscriber_email || '');
      setFatherHusbandName(p.father_husband_name || '');
      setGender(p.gender || '');
      setDob(p.dob || '');
      setAssignedDoctor(p.assigned_doctor || '');
      setAddress(p.address || '');
      setGoogleAddressLocation(p.google_address_location || '');

      if (p.photo_path) {
        setExistingPhotoPath(p.photo_path);
        try {
          const urlRes = await fetch('/api/photos/signed-urls', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bucket: 'patient-photos', paths: [p.photo_path] }),
          });
          const { urls } = await urlRes.json();
          setPhotoDisplayUrl(urls?.[p.photo_path] || null);
        } catch { /* silently fallback to initials */ }
      }
    } catch { router.replace('/patients'); }
    finally { setLoading(false); }
  }, [params.id, router]);

  useEffect(() => { load(); }, [load]);

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoDisplayUrl(null);
    setPhotoRemoved(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Patient full name is required.';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (!patient) return;

    setSaving(true);
    setSaveError('');

    try {
      let photoPath: string | null | undefined = undefined;

      if (photoRemoved && !photoFile) {
        if (existingPhotoPath) await deletePhotoFromServer(existingPhotoPath);
        photoPath = null;
      } else if (photoFile) {
        const entityId = `patient-${patient.patient_id}`;
        photoPath = await uploadPhotoToServer(photoFile, entityId);
      }

      const body: Record<string, unknown> = {
        name: name.trim(),
        subscriber: subscriber.trim(),
        subscriber_email: subscriberEmail.trim(),
        father_husband_name: fatherHusbandName.trim(),
        gender,
        dob,
        assigned_doctor: assignedDoctor.trim(),
        address: address.trim(),
        google_address_location: googleAddressLocation.trim(),
      };

      if (photoPath !== undefined) body.photo_path = photoPath;

      const res = await fetch(`/api/patients/${patient.patient_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const { error } = await res.json();
        setSaveError(error || 'Failed to save changes.');
        setSaving(false);
        return;
      }

      router.push(`/patients/${patient.patient_id}`);
    } catch (err: any) {
      setSaveError(err.message || 'An unexpected error occurred.');
      setSaving(false);
    }
  };

  if (loading) return <div className="staff-loading">Loading patient record…</div>;
  if (!patient) return null;

  const colors = getPatientAvatarColor(patient.patient_id);
  const patientIdLabel = `P-${String(patient.patient_id).padStart(3, '0')}`;

  return (
    <div className="staff-form-page">
      <div className="staff-form-topbar">
        <Link href={`/patients/${patient.patient_id}`} className="staff-back-btn">
          <ChevronLeft size={16} /> Back to Patient Profile
        </Link>
        <h1>Edit Patient Profile</h1>
      </div>

      <form className="staff-form-card" onSubmit={handleSubmit} noValidate>
        {/* Photo upload */}
        <div className="staff-form-photo-center">
          <PhotoUpload
            photoUrl={photoDisplayUrl}
            initials={getInitials(name || patient.name)}
            avatarBg={colors.bg}
            avatarTextColor={colors.text}
            allowRemove={true}
            onFileSelected={(file, preview) => {
              setPhotoFile(file);
              setPhotoDisplayUrl(preview);
              setPhotoRemoved(false);
            }}
            onRemove={handleRemovePhoto}
            size={108}
          />
        </div>

        {/* ── Section 1: Patient Identity ── */}
        <div className="staff-form-section">
          <div className="staff-form-section-header">Patient Identity</div>
          <div className="staff-form-grid">
            <div className="staff-form-field full-col">
              <label>Patient ID</label>
              <div className="staff-id-preview-badge">{patientIdLabel}</div>
              <span className="staff-field-hint">Patient ID cannot be changed.</span>
            </div>

            <div className="staff-form-field">
              <label>Full Name <span className="req">*</span></label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full patient name"
              />
              {errors.name && <span className="staff-field-error">{errors.name}</span>}
            </div>

            <div className="staff-form-field">
              <label>Father / Husband Name</label>
              <input
                value={fatherHusbandName}
                onChange={(e) => setFatherHusbandName(e.target.value)}
                placeholder="Father or Husband name"
              />
            </div>

            <div className="staff-form-field">
              <label>Gender</label>
              <div className="staff-radio-group">
                {['male', 'female', 'other'].map((g) => (
                  <label key={g} className="staff-radio-label">
                    <input
                      type="radio"
                      name="gender"
                      value={g}
                      checked={gender === g}
                      onChange={() => setGender(g)}
                    />
                    <span>{g.charAt(0).toUpperCase() + g.slice(1)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="staff-form-field">
              <label>Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── Section 2: Subscription & Healthcare ── */}
        <div className="staff-form-section">
          <div className="staff-form-section-header">Subscription &amp; Healthcare</div>
          <div className="staff-form-grid">
            <div className="staff-form-field">
              <label>Subscriber Name</label>
              <input
                value={subscriber}
                onChange={(e) => setSubscriber(e.target.value)}
                placeholder="Subscriber name"
              />
            </div>

            <div className="staff-form-field">
              <label>Subscriber Email</label>
              <input
                type="email"
                value={subscriberEmail}
                onChange={(e) => setSubscriberEmail(e.target.value)}
                placeholder="subscriber@example.com"
              />
            </div>

            <div className="staff-form-field full-col">
              <label>Assigned Doctor</label>
              <input
                value={assignedDoctor}
                onChange={(e) => setAssignedDoctor(e.target.value)}
                placeholder="e.g. Dr. Ahmed Khan"
              />
            </div>
          </div>
        </div>

        {/* ── Section 3: Location ── */}
        <div className="staff-form-section">
          <div className="staff-form-section-header">Location</div>
          <div className="staff-form-grid">
            <div className="staff-form-field full-col">
              <label>Address</label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House / Street, Area, City"
              />
            </div>

            <div className="staff-form-field full-col">
              <label>Google Maps Location Link</label>
              <input
                type="url"
                value={googleAddressLocation}
                onChange={(e) => setGoogleAddressLocation(e.target.value)}
                placeholder="https://maps.google.com/..."
              />
              <span className="staff-field-hint">Open Google Maps → tap Share → tap Copy link → paste it here.</span>
            </div>
          </div>
        </div>

        {saveError && <div className="staff-form-save-error">{saveError}</div>}

        <div className="staff-form-footer">
          <Link href={`/patients/${patient.patient_id}`} className="btn-staff-cancel">
            <X size={14} /> Cancel
          </Link>
          <button type="submit" className="btn-staff-save" disabled={saving}>
            <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}