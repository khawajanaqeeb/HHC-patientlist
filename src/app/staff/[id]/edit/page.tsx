'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Save, X } from 'lucide-react';
import { PhotoUpload } from '@/components/PhotoUpload';
import { StaffMember, getInitials, getAvatarColor, DESIGNATION_OPTIONS, extractLatLng } from '@/lib/staffConstants';

async function uploadPhotoToServer(file: File, entityId: string): Promise<string | null> {
  const formData = new FormData();
  formData.append('bucket', 'staff-photos');
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
    body: JSON.stringify({ bucket: 'staff-photos', path }),
  });
}

export default function EditStaffPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<StaffMember | null>(null);

  // Photo state
  const [existingPhotoPath, setExistingPhotoPath] = useState<string | null>(null);
  const [photoDisplayUrl, setPhotoDisplayUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [fatherHusbandName, setFatherHusbandName] = useState('');
  const [fatherHusbandNameType, setFatherHusbandNameType] = useState<'father' | 'husband'>('father');
  const [gender, setGender] = useState('');
  const [designationType, setDesignationType] = useState('');
  const [designationCustom, setDesignationCustom] = useState('');
  const [qualification, setQualification] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [sameAsContact, setSameAsContact] = useState(false);
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [latLng, setLatLng] = useState<{ lat: number; lng: number } | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/${params.id}`);
      if (!res.ok) { router.replace('/staff'); return; }
      const { staff } = await res.json();
      setMember(staff);
      setName(staff.name || '');
      setFatherHusbandName(staff.father_husband_name || '');
      setFatherHusbandNameType(staff.father_husband_name_type === 'husband' ? 'husband' : 'father');
      setGender(staff.gender || '');
      setDesignationType(staff.designation_type || '');
      setDesignationCustom(staff.designation_custom || '');
      setQualification(staff.qualification || '');
      setContactNumber(staff.contact_number || '');
      setWhatsapp(staff.whatsapp || '');
      setEmail(staff.email || '');
      setAddress(staff.address || '');
      setGoogleMapsUrl(staff.google_maps_url || '');
      if (staff.latitude && staff.longitude) setLatLng({ lat: staff.latitude, lng: staff.longitude });

      // Load existing photo URL
      if (staff.photo_path) {
        setExistingPhotoPath(staff.photo_path);
        try {
          const urlRes = await fetch('/api/photos/signed-urls', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bucket: 'staff-photos', paths: [staff.photo_path] }),
          });
          const { urls } = await urlRes.json();
          setPhotoDisplayUrl(urls?.[staff.photo_path] || null);
        } catch { /* silently use initials */ }
      }
    } catch { router.replace('/staff'); }
    finally { setLoading(false); }
  }, [params.id, router]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (designationType !== 'other') setDesignationCustom('');
  }, [designationType]);

  useEffect(() => {
    if (sameAsContact) setWhatsapp(contactNumber);
  }, [sameAsContact, contactNumber]);

  const handleMapsUrlChange = (val: string) => {
    setGoogleMapsUrl(val);
    setLatLng(val.trim() ? (extractLatLng(val.trim()) ?? null) : null);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoDisplayUrl(null);
    setPhotoRemoved(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required.';
    if (!fatherHusbandName.trim()) e.fatherHusbandName = "Father's / Husband's name is required.";
    if (!gender) e.gender = 'Gender is required.';
    if (!designationType) e.designationType = 'Designation is required.';
    if (designationType === 'other' && !designationCustom.trim()) e.designationCustom = 'Please specify the designation.';
    if (!contactNumber.trim()) e.contactNumber = 'Contact number is required.';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (!member) return;

    setSaving(true);
    setSaveError('');

    try {
      let photoPath: string | null | undefined = undefined; // undefined = no change

      if (photoRemoved && !photoFile) {
        // Delete from storage + set null
        if (existingPhotoPath) await deletePhotoFromServer(existingPhotoPath);
        photoPath = null;
      } else if (photoFile) {
        // Upload new (upsert replaces old path)
        photoPath = await uploadPhotoToServer(photoFile, member.staff_id);
      }

      const body: Record<string, unknown> = {
        name: name.trim(),
        father_husband_name: fatherHusbandName.trim(),
        father_husband_name_type: fatherHusbandNameType,
        gender,
        designation_type: designationType,
        designation_custom: designationType === 'other' ? designationCustom.trim() : null,
        qualification: qualification.trim() || null,
        contact_number: contactNumber.trim(),
        whatsapp: whatsapp.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        google_maps_url: googleMapsUrl.trim() || null,
        latitude: latLng?.lat ?? null,
        longitude: latLng?.lng ?? null,
      };

      if (photoPath !== undefined) body.photo_path = photoPath;

      const res = await fetch(`/api/staff/${member.id}`, {
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

      const { staff } = await res.json();
      router.push(`/staff/${staff.id}?success=updated&name=${encodeURIComponent(staff.name)}`);
    } catch (err: any) {
      setSaveError(err.message || 'An unexpected error occurred.');
      setSaving(false);
    }
  };

  if (loading) return <div className="staff-loading">Loading…</div>;
  if (!member) return null;

  const colors = getAvatarColor(member.staff_id);

  return (
    <div className="staff-form-page">
      <div className="staff-form-topbar">
        <Link href={`/staff/${member.id}`} className="staff-back-btn">
          <ChevronLeft size={16} /> Back to Profile
        </Link>
        <h1>Edit Staff Member</h1>
      </div>

      <form className="staff-form-card" onSubmit={handleSubmit} noValidate>
        {/* Photo upload */}
        <div className="staff-form-photo-center">
          <PhotoUpload
            photoUrl={photoDisplayUrl}
            initials={getInitials(name || member.name)}
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

        {/* ── Section 1: Identity ── */}
        <div className="staff-form-section">
          <div className="staff-form-section-header">Identity</div>
          <div className="staff-form-grid">
            <div className="staff-form-field full-col">
              <label>Staff ID</label>
              <div className="staff-id-preview-badge">{member.staff_id}</div>
              <span className="staff-field-hint">Staff ID cannot be changed.</span>
            </div>
            <div className="staff-form-field">
              <label>Full Name <span className="req">*</span></label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
              {errors.name && <span className="staff-field-error">{errors.name}</span>}
            </div>
            <div className="staff-form-field">
              <label>Father's / Husband's Name <span className="req">*</span></label>
              {/* Relationship type selector */}
              <div className="staff-radio-group" style={{ marginBottom: 8 }}>
                <label className="staff-radio-label">
                  <input
                    type="radio"
                    name="fatherHusbandNameType"
                    value="father"
                    checked={fatherHusbandNameType === 'father'}
                    onChange={() => setFatherHusbandNameType('father')}
                  />
                  <span>Father (S/O)</span>
                </label>
                <label className="staff-radio-label">
                  <input
                    type="radio"
                    name="fatherHusbandNameType"
                    value="husband"
                    checked={fatherHusbandNameType === 'husband'}
                    onChange={() => setFatherHusbandNameType('husband')}
                  />
                  <span>Husband (W/O)</span>
                </label>
              </div>
              <input
                value={fatherHusbandName}
                onChange={(e) => setFatherHusbandName(e.target.value)}
                placeholder={fatherHusbandNameType === 'father' ? "e.g. Mohammad Ahmed" : "e.g. Ali Hassan"}
              />
              {errors.fatherHusbandName && <span className="staff-field-error">{errors.fatherHusbandName}</span>}
            </div>
            <div className="staff-form-field full-col">
              <label>Gender <span className="req">*</span></label>
              <div className="staff-radio-group">
                {['male', 'female', 'other'].map((g) => (
                  <label key={g} className="staff-radio-label">
                    <input type="radio" name="gender" value={g} checked={gender === g} onChange={() => setGender(g)} />
                    <span>{g.charAt(0).toUpperCase() + g.slice(1)}</span>
                  </label>
                ))}
              </div>
              {errors.gender && <span className="staff-field-error">{errors.gender}</span>}
            </div>
          </div>
        </div>

        {/* ── Section 2: Professional ── */}
        <div className="staff-form-section">
          <div className="staff-form-section-header">Professional</div>
          <div className="staff-form-grid">
            <div className="staff-form-field">
              <label>Designation <span className="req">*</span></label>
              <select value={designationType} onChange={(e) => setDesignationType(e.target.value)}>
                <option value="" disabled>Select designation</option>
                {DESIGNATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {errors.designationType && <span className="staff-field-error">{errors.designationType}</span>}
            </div>
            {designationType === 'other' && (
              <div className="staff-form-field" style={{ animation: 'slideDown 0.18s ease' }}>
                <label>Custom Designation <span className="req">*</span></label>
                <input value={designationCustom} onChange={(e) => setDesignationCustom(e.target.value)} placeholder="Specify designation" />
                {errors.designationCustom && <span className="staff-field-error">{errors.designationCustom}</span>}
              </div>
            )}
            <div className="staff-form-field full-col">
              <label>Qualification</label>
              <textarea rows={2} value={qualification} onChange={(e) => setQualification(e.target.value)} placeholder="e.g. MBBS, FCPS" />
            </div>
          </div>
        </div>

        {/* ── Section 3: Contact ── */}
        <div className="staff-form-section">
          <div className="staff-form-section-header">Contact</div>
          <div className="staff-form-grid">
            <div className="staff-form-field">
              <label>Contact Number <span className="req">*</span></label>
              <input type="tel" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="e.g. 0300-1234567" />
              {errors.contactNumber && <span className="staff-field-error">{errors.contactNumber}</span>}
            </div>
            <div className="staff-form-field">
              <label>WhatsApp Number</label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => { setWhatsapp(e.target.value); setSameAsContact(false); }}
                placeholder="Optional"
                disabled={sameAsContact}
              />
              <label className="staff-checkbox-label" style={{ marginTop: 6 }}>
                <input type="checkbox" checked={sameAsContact} onChange={(e) => setSameAsContact(e.target.checked)} />
                <span>Same as contact number</span>
              </label>
            </div>
            <div className="staff-form-field">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Optional" />
            </div>
          </div>
        </div>

        {/* ── Section 4: Location ── */}
        <div className="staff-form-section">
          <div className="staff-form-section-header">Location</div>
          <div className="staff-form-grid">
            <div className="staff-form-field full-col">
              <label>Address</label>
              <textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House / Street, Area, City" />
            </div>
            <div className="staff-form-field full-col">
              <label>Google Maps URL</label>
              <input type="url" value={googleMapsUrl} onChange={(e) => handleMapsUrlChange(e.target.value)} placeholder="Paste Google Maps share link" />
              <span className="staff-field-hint">Open Google Maps → tap Share → tap Copy link → paste it here.</span>
              {latLng && googleMapsUrl && (
                <div className="staff-map-preview">
                  <iframe
                    title="Map preview"
                    width="100%"
                    height="200"
                    style={{ border: 0, borderRadius: 10 }}
                    loading="lazy"
                    src={`https://maps.google.com/maps?q=${latLng.lat},${latLng.lng}&z=15&output=embed`}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {saveError && <div className="staff-form-save-error">{saveError}</div>}

        <div className="staff-form-footer">
          <Link href={`/staff/${member.id}`} className="btn-staff-cancel">
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
