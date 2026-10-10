'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  ClipboardList,
  ExternalLink,
  Mail,
  MapPin,
  Plus,
  Stethoscope,
  User,
  UserCheck,
  UserRound,
  X,
} from 'lucide-react';
import { MonthInfo, Package, PatientMonthData } from '@/lib/types';

interface AddPatientModalProps {
  isOpen: boolean;
  initialMode?: string;
  currentMonth?: MonthInfo | { id: string; label: string };
  packages: Package[];
  patients?: PatientMonthData[];
  patient?: PatientMonthData | null;
  onClose: () => void;
  onAdd: (
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
  ) => void;
  onDelete?: (patientId: number) => void;
}

export const AddPatientModal: React.FC<AddPatientModalProps> = ({
  isOpen,
  currentMonth,
  packages,
  patient = null,
  onClose,
  onAdd,
}) => {
  // Form Fields
  const [name, setName] = useState('');
  const [fatherHusbandName, setFatherHusbandName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [subscriber, setSubscriber] = useState('');
  const [subscriberEmail, setSubscriberEmail] = useState('');
  const [assignedDoctor, setAssignedDoctor] = useState('');
  const [address, setAddress] = useState('');
  const [googleAddressLocation, setGoogleAddressLocation] = useState('');
  const [packageId, setPackageId] = useState<number | null>(null);

  // Doctors list from staff management
  const [doctors, setDoctors] = useState<{ id: string; name: string; staff_id: string }[]>([]);
  const [customDoctor, setCustomDoctor] = useState(false);

  // Search & Feedback States
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCustomDoctor(false);
    setError('');
    setSuccessMsg('');

    // Fetch active doctors from Staff database
    fetch('/api/staff?designation=doctor&status=active')
      .then((res) => res.json())
      .then((data) => {
        if (data?.staff) {
          setDoctors(data.staff);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    setName(patient?.name ?? '');
    setFatherHusbandName(patient?.fatherHusbandName ?? '');
    setDob(patient?.dob ?? '');
    setGender(patient?.gender ?? '');
    setSubscriber(patient?.subscriber ?? '');
    setSubscriberEmail(patient?.subscriberEmail ?? '');
    setAssignedDoctor(patient?.assignedDoctor ?? '');
    setAddress(patient?.address ?? '');
    setGoogleAddressLocation(patient?.googleAddressLocation ?? '');
    setPackageId(patient?.packageId ?? null);
  }, [patient]);

  if (!isOpen) return null;

  const monthLabel = currentMonth?.label || 'Current Month';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Please enter a patient name.');
      nameInputRef.current?.focus();
      return;
    }
    if (subscriberEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(subscriberEmail.trim())) {
      setError('Please enter a valid email address for subscriber email.');
      return;
    }

    const savedName = name.trim();

    await onAdd(savedName, subscriber.trim(), packageId, undefined, {
      subscriberEmail: subscriberEmail.trim(),
      fatherHusbandName: fatherHusbandName.trim(),
      dob: dob.trim(),
      gender: gender.trim(),
      address: address.trim(),
      googleAddressLocation: googleAddressLocation.trim(),
      assignedDoctor: assignedDoctor.trim(),
    });

    setError('');
    setName('');
    setFatherHusbandName('');
    setDob('');
    setGender('');
    setSubscriber('');
    setSubscriberEmail('');
    setAssignedDoctor('');
    setAddress('');
    setGoogleAddressLocation('');
    setPackageId(null);
    setSuccessMsg(`✓ Patient "${savedName}" registered successfully.`);
    nameInputRef.current?.focus();
  };

  const formatMapUrl = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return '#';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`;
  };

  return (
    <div className="mbg" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal patient-manager-modal">
        <aside className="patient-manager-sidebar">
          <div className="patient-manager-brand">
            <UserRound size={21} />
            <span>Patient Registration</span>
          </div>
          {currentMonth?.label && <p className="patient-manager-month">{monthLabel}</p>}
          <div className="patient-manager-help" style={{ marginTop: 16 }}>
            <ClipboardList size={15} /> Enter patient details below to register a new record in HHC patient list.
          </div>
        </aside>

        <section className="patient-manager-content">
          <header className="patient-manager-heading">
            <div>
              <span className="patient-manager-eyebrow">{monthLabel}</span>
              <h2>Add New Patient</h2>
            </div>
            <button className="icon-btn" onClick={onClose} aria-label="Close patient modal">
              <X size={19} />
            </button>
          </header>

          {successMsg && (
            <div className="patient-manager-alert success">
              <span>{successMsg}</span>
              <button onClick={() => setSuccessMsg('')} aria-label="Dismiss message"><X size={14} /></button>
            </div>
          )}

          <form className="patient-manager-form modern-form" onSubmit={handleSubmit}>
            {/* Group 1: Personal Info */}
            <div className="form-section">
              <div className="form-section-header">
                <User size={16} />
                <span>Patient Personal Details</span>
              </div>
              <div className="patient-manager-form-grid">
                <label>
                  <span className="label-text-wrap">Patient Name <span className="req">*</span></span>
                  <input
                    ref={nameInputRef}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Ahmed Khan"
                    required
                  />
                </label>
                <label>
                  <span className="label-text-wrap">Father / Husband Name</span>
                  <input
                    value={fatherHusbandName}
                    onChange={(event) => setFatherHusbandName(event.target.value)}
                    placeholder="e.g. Mohammad Ali Khan"
                  />
                </label>
                <label>
                  <span className="label-text-wrap">Date of Birth</span>
                  <input
                    type="date"
                    value={dob}
                    onChange={(event) => setDob(event.target.value)}
                  />
                </label>
                <label>
                  <span className="label-text-wrap">Gender</span>
                  <select value={gender} onChange={(event) => setGender(event.target.value)}>
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
              </div>
            </div>

            {/* Group 2: Subscriber & Care Team */}
            <div className="form-section">
              <div className="form-section-header">
                <UserCheck size={16} />
                <span>Subscriber &amp; Care Details</span>
              </div>
              <div className="patient-manager-form-grid">
                <label>
                  <span className="label-text-wrap">Subscriber Name</span>
                  <input
                    value={subscriber}
                    onChange={(event) => setSubscriber(event.target.value)}
                    placeholder="Family member or sponsor name"
                  />
                </label>
                <label className="sub-email-label">
                  <span className="label-text-wrap"><Mail size={13} /> Subscriber Email</span>
                  <input
                    type="email"
                    value={subscriberEmail}
                    onChange={(event) => setSubscriberEmail(event.target.value)}
                    placeholder="subscriber@example.com"
                  />
                </label>
                <label>
                  <span className="label-text-wrap"><Stethoscope size={13} /> Assigned Doctor</span>
                  {doctors.length > 0 ? (
                    <select
                      value={customDoctor ? '__OTHER__' : assignedDoctor}
                      onChange={(event) => {
                        const val = event.target.value;
                        if (val === '__OTHER__') {
                          setCustomDoctor(true);
                          setAssignedDoctor('');
                        } else {
                          setCustomDoctor(false);
                          setAssignedDoctor(val);
                        }
                      }}
                    >
                      <option value="">-- Select Doctor --</option>
                      {doctors.map((d) => {
                        const docName = d.name.startsWith('Dr.') ? d.name : `Dr. ${d.name}`;
                        return (
                          <option key={d.id} value={docName}>
                            {docName} ({d.staff_id})
                          </option>
                        );
                      })}
                      {assignedDoctor && !doctors.some((d) => d.name === assignedDoctor || `Dr. ${d.name}` === assignedDoctor) && !customDoctor && (
                        <option value={assignedDoctor}>{assignedDoctor}</option>
                      )}
                      <option value="__OTHER__">+ Enter Custom Doctor Name</option>
                    </select>
                  ) : (
                    <input
                      value={assignedDoctor}
                      onChange={(event) => setAssignedDoctor(event.target.value)}
                      placeholder="e.g. Dr. Sarah Ahmed"
                    />
                  )}
                  {customDoctor && (
                    <input
                      style={{ marginTop: 6 }}
                      value={assignedDoctor}
                      onChange={(event) => setAssignedDoctor(event.target.value)}
                      placeholder="Enter doctor's full name"
                      autoFocus
                    />
                  )}
                </label>
                <label>
                  <span className="label-text-wrap">Assigned Plan</span>
                  <select
                    value={packageId ?? ''}
                    onChange={(event) => setPackageId(event.target.value ? Number(event.target.value) : null)}
                  >
                    <option value="">No plan</option>
                    {packages.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {/* Group 3: Address & Maps Location */}
            <div className="form-section">
              <div className="form-section-header">
                <MapPin size={16} />
                <span>Address &amp; Location Pin</span>
              </div>
              <div className="patient-manager-form-grid full-width-grid">
                <label className="full-col">
                  <span className="label-text-wrap">Patient Address</span>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    placeholder="House/Street address, Area, City"
                  />
                </label>
                <label className="full-col">
                  <span className="label-text-wrap">Patient Google Address Location / Maps Link</span>
                  <div className="input-with-action">
                    <input
                      type="text"
                      value={googleAddressLocation}
                      onChange={(event) => setGoogleAddressLocation(event.target.value)}
                      placeholder="Paste Google Maps URL or Plus Code / Coordinates"
                    />
                    {googleAddressLocation.trim() && (
                      <a
                        href={formatMapUrl(googleAddressLocation)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-map-preview"
                        title="Open location on Google Maps"
                      >
                        <ExternalLink size={13} /> Open Map
                      </a>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {error && <div className="patient-manager-error">{error}</div>}

            <div className="mfoot">
              <button type="button" className="btn sec" onClick={onClose}>
                <X size={14} /> Close
              </button>
              <button type="submit" className="btn btn-save">
                <Check size={14} /> Add patient
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};