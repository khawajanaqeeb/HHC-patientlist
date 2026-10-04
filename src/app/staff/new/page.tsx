'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Save, X, MapPin, ArrowLeft } from 'lucide-react';
import { PhotoUpload } from '@/components/PhotoUpload';
import { getInitials, getAvatarColor, DESIGNATION_OPTIONS, extractLatLng } from '@/lib/staffConstants';

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

export default function AddStaffPage() {
  const router = useRouter();
  const [nextId, setNextId] = useState('HHC-STF-…');

  // Photo state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [fatherHusbandName, setFatherHusbandName] = useState('');
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

  // Submission state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    fetch('/api/staff/next-id')
      .then((r) => r.json())
      .then(({ nextId: id }) => id && setNextId(id))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (sameAsContact) setWhatsapp(contactNumber);
  }, [sameAsContact, contactNumber]);

  useEffect(() => {
    if (designationType !== 'other') setDesignationCustom('');
  }, [designationType]);

  const handleMapsUrlChange = (val: string) => {
    setGoogleMapsUrl(val);
    if (val.trim()) {
      const coords = extractLatLng(val.trim());
      setLatLng(coords);
    } else {
      setLatLng(null);
    }
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

    setSaving(true);
    setSaveError('');

    try {
      // Get a fresh confirmed ID right before insert
      const idRes = await fetch('/api/staff/next-id');
      const { nextId: confirmedId } = await idRes.json();

      // Upload photo if selected
      let photoPath: string | null = null;
      if (photoFile) {
        photoPath = await uploadPhotoToServer(photoFile, confirmedId);
      }

      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          father_husband_name: fatherHusbandName.trim(),
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
          photo_path: photoPath,
        }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        setSaveError(error || 'Failed to save staff member.');
        setSaving(false);
        return;
      }

      const { staff } = await res.json();
      router.push(`/staff/${staff.id}?success=added&name=${encodeURIComponent(staff.name)}&staffId=${staff.staff_id}`);
    } catch (err: any) {
      setSaveError(err.message || 'An unexpected error occurred.');
      setSaving(false);
    }
  };

  const colors = name.trim() ? getAvatarColor(nextId) : { bg: '#2c3e50', text: 'rgba(255,255,255,0.4)' };

  return (
    <div className="staff-form-page">
      <div className="staff-form-topbar">
        <Link href="/staff" className="staff-back-btn">
          <ChevronLeft size={16} /> All Staff
        </Link>
        <Link href="/" className="btn-staff-back-home" style={{ padding: '6px 12px', fontSize: '0.82rem' }}>
          <ArrowLeft size={16} /> Main Sheet
        </Link>
        <h1>Add Staff Member</h1>
      </div>

      <form className="staff-form-card" onSubmit={handleSubmit} noValidate>
        {/* Photo upload */}
        <div className="staff-form-photo-center">
          <PhotoUpload
            photoUrl={photoPreviewUrl}
            initials={getInitials(name)}
            avatarBg={colors.bg}
            avatarTextColor={colors.text}
            allowRemove={!!photoPreviewUrl}
            onFileSelected={(file, preview) => { setPhotoFile(file); setPhotoPreviewUrl(preview); }}
            onRemove={() => { setPhotoFile(null); setPhotoPreviewUrl(null); }}
            size={108}
          />
        </div>

        {/* ── Section 1: Identity ── */}
        <div className="staff-form-section">
          <div className="staff-form-section-header">Identity</div>
          <div className="staff-form-grid">
            <div className="staff-form-field full-col">
              <label>Staff ID</label>
              <div className="staff-id-preview-badge">{nextId}</div>
              <span className="staff-field-hint">This ID will be assigned automatically.</span>
            </div>
            <div className="staff-form-field">
              <label>Full Name <span className="req">*</span></label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dr. Sarah Ahmed"
              />
              {errors.name && <span className="staff-field-error">{errors.name}</span>}
            </div>
            <div className="staff-form-field">
              <label>Father's / Husband's Name <span className="req">*</span></label>
              <input
                value={fatherHusbandName}
                onChange={(e) => setFatherHusbandName(e.target.value)}
                placeholder="e.g. Mohammad Ahmed"
              />
              {errors.fatherHusbandName && <span className="staff-field-error">{errors.fatherHusbandName}</span>}
            </div>
            <div className="staff-form-field full-col">
              <label>Gender <span className="req">*</span></label>
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
                <input
                  value={designationCustom}
                  onChange={(e) => setDesignationCustom(e.target.value)}
                  placeholder="Specify designation"
                  autoFocus
                />
                {errors.designationCustom && <span className="staff-field-error">{errors.designationCustom}</span>}
              </div>
            )}
            <div className="staff-form-field full-col">
              <label>Qualification</label>
              <textarea
                rows={2}
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                placeholder="e.g. MBBS, FCPS (Psychiatry)"
              />
            </div>
          </div>
        </div>

        {/* ── Section 3: Contact ── */}
        <div className="staff-form-section">
          <div className="staff-form-section-header">Contact</div>
          <div className="staff-form-grid">
            <div className="staff-form-field">
              <label>Contact Number <span className="req">*</span></label>
              <input
                type="tel"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="e.g. 0300-1234567"
              />
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
                <input
                  type="checkbox"
                  checked={sameAsContact}
                  onChange={(e) => setSameAsContact(e.target.checked)}
                />
                <span>Same as contact number</span>
              </label>
            </div>
            <div className="staff-form-field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
        </div>

        {/* ── Section 4: Location ── */}
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
              <label>Google Maps URL</label>
              <input
                type="url"
                value={googleMapsUrl}
                onChange={(e) => handleMapsUrlChange(e.target.value)}
                placeholder="Paste Google Maps share link"
              />
              <span className="staff-field-hint">
                Open Google Maps → tap Share → tap Copy link → paste it here.
              </span>
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
          <Link href="/staff" className="btn-staff-cancel">
            <X size={14} /> Cancel
          </Link>
          <button type="submit" className="btn-staff-save" disabled={saving}>
            <Save size={14} /> {saving ? 'Saving…' : 'Save Staff Member'}
          </button>
        </div>
      </form>
    </div>
  );
}
